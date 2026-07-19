import { useState, useRef, useCallback, useMemo, useEffect } from 'react'
import { QuantumChessEngine } from '../lib/quantumEngine'
import {
  chooseQuantumAIMove,
  chooseFallbackLegalQAction,
  applyQAIAction,
  isActionStillLegal,
} from '../lib/quantumAi'
import { pendingMeasurementFromLastMove } from '../lib/onlineTypes'
import type { QPendingMeasurement } from '../lib/onlineTypes'
import { getColorName, translateGameOverInfo } from '../lib/i18n'
import type {
  GameConfig, Language, PieceColor, PieceType, Chances, QBoardCell,
  QMoveRecord, QMoveMode, QGameOver, GameOverInfo, QMeasurementEvent,
  QuantumUndoEntry, QuantumRng, QState,
} from '../lib/types'

export interface GameSounds {
  playMove: () => void
  playCapture: () => void
  playCheck: () => void
  playGameEnd: () => void
}

const Q_PIECE_VALUES: Record<PieceType, number> = {
  p: 1,
  n: 3,
  b: 3,
  r: 5,
  q: 9,
  k: 0,
}

function quantumEvalToChances(cp: number): Chances {
  const clamped = Math.max(-1200, Math.min(1200, cp))
  const expectedScoreWhite = 1 / (1 + Math.pow(10, -clamped / 280))
  const drawProb = Math.max(0.06, 0.44 * Math.exp(-Math.abs(clamped) / 240))
  const whiteRaw = Math.max(0, expectedScoreWhite - drawProb / 2)
  const blackRaw = Math.max(0, 1 - expectedScoreWhite - drawProb / 2)

  const total = whiteRaw + drawProb + blackRaw
  const white = Math.round((whiteRaw / total) * 100)
  const black = Math.round((blackRaw / total) * 100)
  const draw = 100 - white - black
  return { white, draw, black }
}

function qGameOverToClassic(qgo: QGameOver, playerColor: PieceColor, language: Language): GameOverInfo {
  if (qgo.winner === null) {
    return {
      title: language === 'es' ? 'Tablas' : 'Draw',
      message: language === 'es' ? qgo.reason : 'No legal actions remain',
      result: 'draw',
    }
  }
  const isWin = qgo.winner === playerColor
  const reason = language === 'es'
    ? qgo.reason
    : qgo.reason === 'Rey blanco capturado'
      ? 'White king captured'
      : qgo.reason === 'Rey negro capturado'
        ? 'Black king captured'
        : qgo.reason
  return isWin
    ? { title: language === 'es' ? '¡Victoria!' : 'Victory!', message: reason, result: 'win' }
    : { title: language === 'es' ? 'Derrota' : 'Defeat', message: reason, result: 'lose' }
}

function cloneQState<T>(value: T): T {
  if (typeof structuredClone === 'function') return structuredClone(value)
  return JSON.parse(JSON.stringify(value)) as T
}

export interface QuantumStateChangeMeta {
  pendingMeasurement: QPendingMeasurement | null
}

export interface UseQuantumChessOptions {
  onStateChange?: (engine: QuantumChessEngine, meta?: QuantumStateChangeMeta) => void
  canMove?: () => boolean
  getRng?: (counter: number) => QuantumRng
}

export function useQuantumChess(
  config: GameConfig,
  sounds: GameSounds,
  language: Language,
  options: UseQuantumChessOptions = {},
) {
  const engineRef = useRef(new QuantumChessEngine())
  const undoStackRef = useRef<QuantumUndoEntry[]>([])
  const replaySnapshotsRef = useRef<QState[]>([])

  const [boardVersion, setBoardVersion] = useState(0)
  const [undoDepth, setUndoDepth] = useState(0)
  const [selectedPiece, setSelectedPiece] = useState<{ id: string; square: string } | null>(null)
  const [moveMode, setMoveMode] = useState<QMoveMode>('classical')
  const [firstQuantumTarget, setFirstQuantumTarget] = useState<string | null>(null)
  const [gameOverInfo, setGameOverInfo] = useState<GameOverInfo | null>(null)
  const [lastMove, setLastMove] = useState<{ from: string; to: string } | null>(null)
  const [boardFlipped, setBoardFlipped] = useState(config.playerColor === 'b')
  const [measurementEvent, setMeasurementEvent] = useState<QMeasurementEvent | null>(null)
  const [measurementBoardState, setMeasurementBoardState] = useState<import('../lib/types').QState | null>(null)
  const [isMeasurementBlocking, setIsMeasurementBlocking] = useState(false)
  const syncMetaRef = useRef<QuantumStateChangeMeta | null>(null)
  const [promotionPending, setPromotionPending] = useState<{
    pieceId: string; from: string; to: string
  } | null>(null)

  const isOnline = config.opponentMode === 'online'
  const isAIMode = config.opponentMode === 'ai'
  const isThinkingRef = useRef(false)
  const lastAiHistoryLengthRef = useRef(-1)
  const [isThinking, setIsThinking] = useState(false)
  const [engineError, setEngineError] = useState<string | null>(null)
  const [aiRetryToken, setAiRetryToken] = useState(0)
  const canMoveRef = useRef(options.canMove)
  canMoveRef.current = options.canMove
  const getRngRef = useRef(options.getRng)
  getRngRef.current = options.getRng
  const engine = engineRef.current
  const state = engine.state
  if (replaySnapshotsRef.current.length === 0) {
    replaySnapshotsRef.current = [cloneQState(engine.exportState())]
  }

  const prepareRng = useCallback(() => {
    const next = getRngRef.current?.(engine.state.rngCounter)
    if (next) engine.setRng(next)
  }, [engine])

  const board: Record<string, QBoardCell[]> = useMemo(() => {
    void boardVersion
    if (measurementBoardState) {
      const preview = new QuantumChessEngine()
      preview.loadState(measurementBoardState)
      return preview.getBoard()
    }
    return engine.getBoard()
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [boardVersion, measurementBoardState])

  const turn = state.turn
  const gameOver = !!gameOverInfo || !!state.gameOver

  const checkSquare = useMemo(() => {
    void boardVersion
    return engine.getCheckSquareForTurn()
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [boardVersion])

  const playCheckIfNeeded = useCallback(() => {
    if (engine.isClassicalKingInCheck(engine.state.turn)) {
      setTimeout(() => sounds.playCheck(), 80)
    }
  }, [engine, sounds])

  const history: QMoveRecord[] = useMemo(() => {
    void boardVersion
    return [...state.history]
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [boardVersion])

  // Evaluacion global del tablero cuantico (material esperado por probabilidad).
  const chances: Chances = useMemo(() => {
    void boardVersion

    const whiteKing = state.pieces['w_k']
    const blackKing = state.pieces['b_k']
    if (!whiteKing?.alive) return { white: 0, draw: 0, black: 100 }
    if (!blackKing?.alive) return { white: 100, draw: 0, black: 0 }

    let whiteExpected = 0
    let blackExpected = 0

    for (const piece of Object.values(state.pieces)) {
      if (!piece.alive) continue
      const base = Q_PIECE_VALUES[piece.type]
      if (!base) continue

      const presenceProb = Object.values(piece.positions).reduce((sum, p) => sum + p, 0)
      const expected = base * presenceProb

      if (piece.color === 'w') whiteExpected += expected
      else blackExpected += expected
    }

    const cp = (whiteExpected - blackExpected) * 100
    return quantumEvalToChances(cp)
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [boardVersion])

  const legalTargets: Set<string> = useMemo(() => {
    if (!selectedPiece) return new Set()
    if (moveMode === 'merge') return new Set(engine.getMergeTargets(selectedPiece.id, selectedPiece.square))
    if (firstQuantumTarget) {
      return new Set(
        engine.getQuantumSplitTargets(selectedPiece.id, selectedPiece.square)
          .filter((square) => square !== firstQuantumTarget),
      )
    }
    const moves = engine.getLegalMoves(selectedPiece.id, selectedPiece.square)
    if (moveMode === 'quantum') {
      return new Set(engine.getQuantumSplitTargets(selectedPiece.id, selectedPiece.square))
    }
    return new Set(moves.map(m => m.square))
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [selectedPiece, moveMode, firstQuantumTarget, boardVersion])

  const mergeTargets: Set<string> = useMemo(() => {
    if (!selectedPiece) return new Set()
    return new Set(engine.getMergeTargets(selectedPiece.id, selectedPiece.square))
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [selectedPiece, boardVersion])

  const quantumCastleOptions = useMemo(() => {
    void boardVersion
    return engine.canQuantumCastle(turn)
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [boardVersion, turn])

  const classicalCastleOptions = useMemo(() => {
    void boardVersion
    const rank = turn === 'w' ? '1' : '8'
    const kingId = `${turn}_k`
    const moves = engine.getLegalMoves(kingId, `e${rank}`)
    const options: Array<'k' | 'q'> = []
    if (moves.some((move) => move.square === `g${rank}`)) options.push('k')
    if (moves.some((move) => move.square === `c${rank}`)) options.push('q')
    return options
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [boardVersion, turn])

  const availableMoveModes: QMoveMode[] = useMemo(() => {
    if (!selectedPiece) return ['classical', 'quantum']
    const piece = engine.getPiece(selectedPiece.id)
    if (!piece) return ['classical']

    const modes: QMoveMode[] = ['classical']
    if (piece.type !== 'p') modes.push('quantum')
    if (Object.keys(piece.positions).length > 1 && engine.getMergeTargets(piece.id, selectedPiece.square).length > 0) {
      modes.push('merge')
    }
    return modes
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [selectedPiece, boardVersion])

  const status = useMemo(() => {
    if (gameOverInfo) return { text: translateGameOverInfo(gameOverInfo, language).title, type: 'over' as const }
    if (isMeasurementBlocking) {
      return {
        text: language === 'es' ? 'Medición — gira la ruleta' : 'Measurement — spin the roulette',
        type: 'thinking' as const,
      }
    }
    if (isAIMode) {
      if (isThinking) return { text: language === 'es' ? 'IA pensando…' : 'AI thinking…', type: 'thinking' as const }
      if (turn === config.playerColor) return { text: language === 'es' ? 'Tu turno' : 'Your turn', type: 'player' as const }
      return { text: language === 'es' ? 'Turno de la IA' : "AI's turn", type: 'ai' as const }
    }
    if (isOnline) {
      if (turn === config.playerColor) {
        return { text: language === 'es' ? 'Tu turno' : 'Your turn', type: 'player' as const }
      }
      return { text: language === 'es' ? 'Turno del rival' : "Opponent's turn", type: 'ai' as const }
    }
    return { text: language === 'es' ? `Turno: ${getColorName(turn, language)}` : `${getColorName(turn, language)} to move`, type: 'player' as const }
  }, [gameOverInfo, turn, language, isOnline, isAIMode, isThinking, isMeasurementBlocking, config.playerColor])

  const refresh = useCallback(() => {
    const replayState = cloneQState(engine.exportState())
    const lastReplay = replaySnapshotsRef.current[replaySnapshotsRef.current.length - 1]
    if (!lastReplay || lastReplay.history.length < replayState.history.length) {
      replaySnapshotsRef.current.push(replayState)
    } else if (lastReplay.history.length === replayState.history.length) {
      replaySnapshotsRef.current[replaySnapshotsRef.current.length - 1] = replayState
    }
    setBoardVersion(v => v + 1)
    const qgo = engine.checkGameOverPublic()
    if (qgo && !gameOverInfo && !isMeasurementBlocking) {
      sounds.playGameEnd()
      setGameOverInfo(qGameOverToClassic(qgo, config.playerColor, language))
    }
    const meta = syncMetaRef.current
    syncMetaRef.current = null
    options.onStateChange?.(engine, meta ?? undefined)
  }, [engine, sounds, config.playerColor, gameOverInfo, language, options, isMeasurementBlocking])

  const beginMeasurementReveal = useCallback((
    preMoveState: import('../lib/types').QState,
    event: QMeasurementEvent,
    moverColor: PieceColor,
  ) => {
    setMeasurementBoardState(cloneQState(preMoveState))
    setMeasurementEvent(event)
    setIsMeasurementBlocking(true)
    setSelectedPiece(null)
    setFirstQuantumTarget(null)
    setMoveMode('classical')
    setLastMove(null)
    if (isOnline) {
      syncMetaRef.current = {
        pendingMeasurement: pendingMeasurementFromLastMove(
          engine.exportState(),
          moverColor,
          preMoveState,
        ),
      }
    }
  }, [engine, isOnline])

  const finalizeMeasurementReveal = useCallback(() => {
    setMeasurementBoardState(null)
    setMeasurementEvent(null)
    setIsMeasurementBlocking(false)
    const last = engine.state.history[engine.state.history.length - 1]
    if (last) setLastMove({ from: last.from, to: last.to })
    if (last?.captured) sounds.playCapture()
    else sounds.playMove()
    playCheckIfNeeded()
    setBoardVersion(v => v + 1)
    const qgo = engine.checkGameOverPublic()
    if (qgo && !gameOverInfo) {
      sounds.playGameEnd()
      setGameOverInfo(qGameOverToClassic(qgo, config.playerColor, language))
    }
  }, [engine, sounds, playCheckIfNeeded, gameOverInfo, config.playerColor, language])

  const applyClassicalMoveRecord = useCallback((
    record: QMoveRecord,
    preMoveState: import('../lib/types').QState,
    moverColor: PieceColor,
  ) => {
    if (record.measurement) {
      beginMeasurementReveal(preMoveState, record.measurement, moverColor)
      refresh()
      return
    }
    if (record.captured) sounds.playCapture()
    else sounds.playMove()
    playCheckIfNeeded()
    setLastMove({ from: record.from, to: record.to })
    refresh()
  }, [beginMeasurementReveal, refresh, sounds, playCheckIfNeeded])

  const pushUndoSnapshot = useCallback(() => {
    if (isOnline) return
    undoStackRef.current.push({
      state: cloneQState(engine.exportState()),
      lastMove,
      moveMode,
      gameOverInfo,
    })
    if (undoStackRef.current.length > 80) undoStackRef.current.shift()
    setUndoDepth(undoStackRef.current.length)
  }, [engine, gameOverInfo, isOnline, lastMove, moveMode])

  const syncRemotePendingMeasurement = useCallback((pending: QPendingMeasurement | null) => {
    if (pending) {
      setMeasurementBoardState(cloneQState(pending.preMoveState))
      setMeasurementEvent(pending.event)
      setIsMeasurementBlocking(true)
      setLastMove(null)
      setBoardVersion(v => v + 1)
      return
    }
    setMeasurementBoardState(null)
    setMeasurementEvent(null)
    setIsMeasurementBlocking(false)
    const last = engine.state.history[engine.state.history.length - 1]
    if (last) {
      setLastMove({ from: last.from, to: last.to })
      if (last.captured) sounds.playCapture()
      else sounds.playMove()
      playCheckIfNeeded()
    }
    setBoardVersion(v => v + 1)
    const qgo = engine.checkGameOverPublic()
    if (qgo && !gameOverInfo) {
      sounds.playGameEnd()
      setGameOverInfo(qGameOverToClassic(qgo, config.playerColor, language))
    }
  }, [engine, sounds, playCheckIfNeeded, gameOverInfo, config.playerColor, language])

  const loadQuantumState = useCallback((
    qstate: import('../lib/types').QState,
    restoredLastMove?: { from: string; to: string } | null,
  ) => {
    engine.loadState(qstate)
    const previousReplay = replaySnapshotsRef.current[replaySnapshotsRef.current.length - 1]
    replaySnapshotsRef.current = previousReplay && qstate.history.length === previousReplay.history.length + 1
      ? [...replaySnapshotsRef.current, cloneQState(qstate)]
      : [cloneQState(qstate)]
    undoStackRef.current = []
    setUndoDepth(0)
    setSelectedPiece(null)
    setFirstQuantumTarget(null)
    setMoveMode('classical')
    const latest = qstate.history[qstate.history.length - 1]
    setLastMove(
      restoredLastMove === undefined
        ? latest ? { from: latest.from, to: latest.to } : null
        : restoredLastMove,
    )
    setBoardVersion(v => v + 1)
    const qgo = engine.checkGameOverPublic()
    if (qgo) {
      setGameOverInfo(qGameOverToClassic(qgo, config.playerColor, language))
    } else {
      setGameOverInfo(null)
    }
  }, [engine, config.playerColor, language])

  useEffect(() => {
    if (!isAIMode) return
    if (gameOver) return
    if (isMeasurementBlocking) return
    if (isThinkingRef.current) return
    if (state.turn === config.playerColor) return

    const historyLen = state.history.length
    if (lastAiHistoryLengthRef.current === historyLen) return

    const timer = window.setTimeout(async () => {
      isThinkingRef.current = true
      setIsThinking(true)

      try {
        let action = await chooseQuantumAIMove(engine, config.difficulty, { useStockfish: true })

        if (!action || !isActionStillLegal(engine, action)) {
          action = chooseFallbackLegalQAction(engine)
        }

        if (!action || !isActionStillLegal(engine, action)) return

        const preMove = cloneQState(engine.exportState())
        const aiColor = preMove.turn
        prepareRng()
        const record = applyQAIAction(engine, action)
        lastAiHistoryLengthRef.current = engine.state.history.length
        setEngineError(null)
        applyClassicalMoveRecord(record, preMove, aiColor)
        setSelectedPiece(null)
        setFirstQuantumTarget(null)
        setMoveMode('classical')
      } catch (err) {
        console.error('Error IA cuántica:', err)
        setEngineError(
          language === 'es'
            ? 'La IA cuántica no pudo calcular una jugada.'
            : 'Quantum AI could not calculate a move.',
        )
      } finally {
        isThinkingRef.current = false
        setIsThinking(false)
      }
    }, 450)

    return () => window.clearTimeout(timer)
  }, [
    boardVersion,
    isAIMode,
    gameOver,
    config.playerColor,
    engine,
    refresh,
    sounds,
    playCheckIfNeeded,
    language,
    state.history.length,
    state.turn,
    isMeasurementBlocking,
    config.difficulty,
    applyClassicalMoveRecord,
    aiRetryToken,
  ])

  const retryAIMove = useCallback(() => {
    if (!isAIMode || gameOver || isThinkingRef.current) return
    lastAiHistoryLengthRef.current = -1
    setEngineError(null)
    setAiRetryToken((value) => value + 1)
  }, [gameOver, isAIMode])

  const undo = useCallback(() => {
    if (isMeasurementBlocking) return
    if (isThinkingRef.current) return
    if (isAIMode && state.turn !== config.playerColor) return
    if (isOnline || undoStackRef.current.length === 0) return
    const entry = undoStackRef.current.pop()
    if (!entry) return

    engine.loadState(cloneQState(entry.state))
    replaySnapshotsRef.current = replaySnapshotsRef.current.slice(0, engine.state.history.length + 1)
    setSelectedPiece(null)
    setFirstQuantumTarget(null)
    setMoveMode(entry.moveMode)
    setLastMove(entry.lastMove)
    setGameOverInfo(entry.gameOverInfo)
    setMeasurementEvent(null)
    setPromotionPending(null)
    setUndoDepth(undoStackRef.current.length)
    setBoardVersion(v => v + 1)
  }, [engine, isOnline])

  const handleSquareClick = useCallback((sq: string) => {
    if (gameOver) return
    if (isMeasurementBlocking) return
    if (isThinkingRef.current) return
    if (isAIMode && state.turn !== config.playerColor) return
    if (isOnline && (canMoveRef.current ? !canMoveRef.current() : state.turn !== config.playerColor)) return
    const allowedColor = state.turn

    const cellsOnSquare = board[sq] || []
    const myPiece = cellsOnSquare.find(c => c.color === allowedColor)

    if (firstQuantumTarget && selectedPiece) {
      if (legalTargets.has(sq)) {
        pushUndoSnapshot()
        prepareRng()
        engine.doQuantumMove(selectedPiece.id, selectedPiece.square, firstQuantumTarget, sq)
        sounds.playMove()
        setSelectedPiece(null)
        setFirstQuantumTarget(null)
        setMoveMode('classical')
        setLastMove({ from: selectedPiece.square, to: sq })
        refresh()
        return
      }
      setFirstQuantumTarget(null)
      setSelectedPiece(null)
      setMoveMode('classical')
      return
    }

    if (selectedPiece) {
      if (legalTargets.has(sq)) {
        if (moveMode === 'merge') {
          pushUndoSnapshot()
          prepareRng()
          engine.doMergeFrom(selectedPiece.id, selectedPiece.square, sq)
          sounds.playMove()
          setSelectedPiece(null)
          setMoveMode('classical')
          setLastMove({ from: selectedPiece.square, to: sq })
          refresh()
          return
        }

        if (moveMode === 'quantum') {
          setFirstQuantumTarget(sq)
          return
        }

        const piece = engine.getPiece(selectedPiece.id)
        if (piece?.type === 'p') {
          const destRank = sq[1]
          const isPromo = (piece.color === 'w' && destRank === '8') || (piece.color === 'b' && destRank === '1')
          if (isPromo) {
            setPromotionPending({ pieceId: selectedPiece.id, from: selectedPiece.square, to: sq })
            return
          }
        }

        pushUndoSnapshot()
        const preMove = cloneQState(engine.exportState())
        const mover = state.turn
        prepareRng()
        const record = engine.doClassicalMove(selectedPiece.id, selectedPiece.square, sq)
        setSelectedPiece(null)
        setMoveMode('classical')
        applyClassicalMoveRecord(record, preMove, mover)
        return
      }

      if (myPiece) {
        setSelectedPiece({ id: myPiece.pieceId, square: sq })
        setFirstQuantumTarget(null)
        return
      }

      setSelectedPiece(null)
      setFirstQuantumTarget(null)
      setMoveMode('classical')
      return
    }

    if (myPiece) {
      setSelectedPiece({ id: myPiece.pieceId, square: sq })
      const piece = engine.getPiece(myPiece.pieceId)
      if (piece?.type === 'p' && moveMode === 'quantum') setMoveMode('classical')
      setFirstQuantumTarget(null)
    }
  }, [
    board, engine, firstQuantumTarget, gameOver, playCheckIfNeeded,
    legalTargets, moveMode, pushUndoSnapshot, applyClassicalMoveRecord, selectedPiece, sounds, state.turn, isOnline, isAIMode, isMeasurementBlocking, config.playerColor,
  ])

  const handleDrop = useCallback((from: string, to: string) => {
    if (gameOver) return
    if (isMeasurementBlocking) return
    if (isThinkingRef.current) return
    if (isAIMode && state.turn !== config.playerColor) return
    if (isOnline && (canMoveRef.current ? !canMoveRef.current() : state.turn !== config.playerColor)) return
    if (moveMode !== 'classical') return
    const allowedColor = state.turn

    const cellsOnFrom = board[from] || []
    const myPiece = cellsOnFrom.find(c => c.color === allowedColor)
    if (!myPiece) return

    const moves = engine.getLegalMoves(myPiece.pieceId, from)
    if (!moves.some(m => m.square === to)) return

    const piece = engine.getPiece(myPiece.pieceId)
    if (piece?.type === 'p') {
      const destRank = to[1]
      const isPromo = (piece.color === 'w' && destRank === '8') || (piece.color === 'b' && destRank === '1')
      if (isPromo) {
        setSelectedPiece({ id: myPiece.pieceId, square: from })
        setPromotionPending({ pieceId: myPiece.pieceId, from, to })
        return
      }
    }

    pushUndoSnapshot()
    const preMove = cloneQState(engine.exportState())
    const mover = state.turn
    prepareRng()
    const record = engine.doClassicalMove(myPiece.pieceId, from, to)
    setSelectedPiece(null)
    applyClassicalMoveRecord(record, preMove, mover)
  }, [board, engine, gameOver, moveMode, pushUndoSnapshot, applyClassicalMoveRecord, state.turn, isOnline, isAIMode, isMeasurementBlocking, config.playerColor])

  const handlePromotion = useCallback((pieceType: string) => {
    if (!promotionPending) return
    if (isMeasurementBlocking) return
    if (isThinkingRef.current) return
    if (isAIMode && state.turn !== config.playerColor) return
    pushUndoSnapshot()
    const preMove = cloneQState(engine.exportState())
    const mover = state.turn
    prepareRng()
    const record = engine.doClassicalMove(
      promotionPending.pieceId, promotionPending.from, promotionPending.to,
      pieceType as PieceType
    )
    setPromotionPending(null)
    setSelectedPiece(null)
    applyClassicalMoveRecord(record, preMove, mover)
  }, [promotionPending, engine, applyClassicalMoveRecord, pushUndoSnapshot, isAIMode, isMeasurementBlocking, state.turn, config.playerColor])

  const doQuantumCastle = useCallback((side: 'k' | 'q') => {
    if (gameOver) return
    if (isMeasurementBlocking) return
    if (isThinkingRef.current) return
    if (isAIMode && state.turn !== config.playerColor) return
    if (isOnline && (canMoveRef.current ? !canMoveRef.current() : state.turn !== config.playerColor)) return
    const allowedColor = state.turn

    pushUndoSnapshot()
    prepareRng()
    engine.doQuantumCastle(allowedColor, side)
    sounds.playMove()
    setSelectedPiece(null)
    setLastMove(null)
    refresh()
  }, [engine, gameOver, pushUndoSnapshot, refresh, sounds, state.turn, isOnline, isAIMode, config.playerColor])

  const doClassicalCastle = useCallback((side: 'k' | 'q') => {
    if (gameOver) return
    if (isMeasurementBlocking) return
    if (isThinkingRef.current) return
    if (isAIMode && state.turn !== config.playerColor) return
    if (isOnline && (canMoveRef.current ? !canMoveRef.current() : state.turn !== config.playerColor)) return

    const allowedColor = state.turn
    const rank = allowedColor === 'w' ? '1' : '8'
    const kingId = `${allowedColor}_k`
    const from = `e${rank}`
    const to = side === 'k' ? `g${rank}` : `c${rank}`

    pushUndoSnapshot()
    const preMove = cloneQState(engine.exportState())
    const mover = allowedColor
    prepareRng()
    const record = engine.doClassicalMove(kingId, from, to)
    setSelectedPiece(null)
    setFirstQuantumTarget(null)
    setMoveMode('classical')
    applyClassicalMoveRecord(record, preMove, mover)
  }, [engine, gameOver, pushUndoSnapshot, applyClassicalMoveRecord, state.turn, isOnline, isAIMode, isMeasurementBlocking, config.playerColor])

  const chooseMoveMode = useCallback((mode: QMoveMode) => {
    if (!availableMoveModes.includes(mode)) return
    setMoveMode(mode)
    setFirstQuantumTarget(null)
  }, [availableMoveModes])

  const flip = useCallback(() => setBoardFlipped(p => !p), [])

  const resign = useCallback(() => {
    if (gameOverInfo) return
    sounds.playGameEnd()
    setGameOverInfo({
      title: language === 'es' ? 'Rendición' : 'Resignation',
      message: language === 'es' ? 'Partida terminada por rendición' : 'Game ended by resignation',
      result: 'lose',
    })
  }, [gameOverInfo, sounds, language])

  const handleTimedOut = useCallback((color: PieceColor) => {
    if (gameOverInfo) return
    sounds.playGameEnd()
    setGameOverInfo(
      color === 'w'
        ? { title: language === 'es' ? 'Tiempo agotado' : 'Time Out', message: language === 'es' ? 'Ganan negras por tiempo' : 'Black wins on time', result: 'lose' }
        : { title: language === 'es' ? 'Tiempo agotado' : 'Time Out', message: language === 'es' ? 'Ganan blancas por tiempo' : 'White wins on time', result: 'win' }
    )
  }, [gameOverInfo, sounds, language])

  const dismissGameOver = useCallback(() => setGameOverInfo(null), [])
  const dismissMeasurement = useCallback(() => {
    finalizeMeasurementReveal()
  }, [finalizeMeasurementReveal])

  return {
    board,
    selectedPiece,
    legalTargets,
    mergeTargets,
    moveMode,
    firstQuantumTarget,
    lastMove,
    boardFlipped,
    isThinking,
    engineError,
    retryAIMove,
    turn,
    gameOver,
    gameOverInfo,
    checkSquare,
    promotionPending: promotionPending ? { from: promotionPending.from, to: promotionPending.to } : null,
    chances,
    history,
    status,
    classicalCastleOptions,
    quantumCastleOptions,
    availableMoveModes,
    measurementEvent,
    isMeasurementBlocking,
    syncRemotePendingMeasurement,
    handleSquareClick,
    handleDrop,
    handlePromotion,
    chooseMoveMode,
    doClassicalCastle,
    doQuantumCastle,
    undo,
    canUndo: !isOnline && undoDepth > 0,
    flip,
    resign,
    handleTimedOut,
    dismissGameOver,
    exportState: () => engine.exportState(),
    dismissMeasurement,
    replaySnapshots: replaySnapshotsRef.current,
    playerColor: config.playerColor,
    controlColor: isOnline || isAIMode ? config.playerColor : turn,
    isAIMode,
    isOnline,
    loadQuantumState,
    difficulty: config.difficulty,
  }
}
