import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import { motion, useReducedMotion } from 'framer-motion'
import QuantumBoard from './QuantumBoard'
import BoardSkeleton from './BoardSkeleton'
import PlayerBar from './PlayerBar'
import MoveHistory from './MoveHistory'
import EvalBar from './EvalBar'
import ActionButtons from './ActionButtons'
import MusicPlayer from './MusicPlayer'
import PromotionModal from './PromotionModal'
import GameOverModal from './GameOverModal'
import OnlineSessionEndedModal from './OnlineSessionEndedModal'
import { OnlineBetaBadge } from './OnlineBetaNotice'
import QuantumMeasurementRoulette from './QuantumMeasurementRoulette'
import GameViewportShell from './GameViewportShell'
import GameMobileStatsSheet from './GameMobileStatsSheet'
import GameIcon from './GameIcon'
import { useQuantumChess } from '../hooks/useQuantumChess'
import { useOnlineGameSync } from '../hooks/useOnlineGameSync'
import { useSoundFX } from '../hooks/useSoundFX'
import { useAmbientMusic } from '../hooks/useAmbientMusic'
import { useTimer } from '../hooks/useTimer'
import { getPlayerLabel, ui } from '../lib/i18n'
import type { AppSettings } from '../lib/settings'
import {
  quantumRoomFingerprint,
  quantumStateFingerprint,
} from '../lib/onlineTypes'
import type { GameConfig, Language, PieceColor, QMoveMode, QState } from '../lib/types'

interface QuantumGameScreenProps {
  config: GameConfig
  onNewGame: () => void | Promise<void>
  language: Language
  settings: AppSettings
  onOpenSettings: () => void
  onSettingsChange: (partial: Partial<AppSettings>) => void
}

export default function QuantumGameScreen({
  config,
  onNewGame,
  language,
  settings,
  onOpenSettings,
  onSettingsChange,
}: QuantumGameScreenProps) {
  const sounds = useSoundFX(settings.sfxVolume)
  const music = useAmbientMusic(settings.musicVolume)
  const onlineSync = useOnlineGameSync({
    config,
    enabled: config.opponentMode === 'online',
  })
  const t = ui(language)

  const leavingRef = useRef(false)

  const handleLeaveToMenu = useCallback(async () => {
    if (leavingRef.current) return
    leavingRef.current = true
    try {
      await onNewGame()
    } finally {
      leavingRef.current = false
    }
  }, [onNewGame])

  const loadQuantumRef = useRef<(q: QState) => void>(() => {})
  const turnRef = useRef<PieceColor>('w')
  const exportQStateRef = useRef<() => QState>(() => ({} as QState))
  const measurementEventRef = useRef(false)
  const measurementBlockingRef = useRef(false)
  const hadPendingRef = useRef(false)
  const [measurementReleased, setMeasurementReleased] = useState(false)

  const onStateChange = useCallback(
    (engine: import('../lib/quantumEngine').QuantumChessEngine, meta?: import('../hooks/useQuantumChess').QuantumStateChangeMeta) => {
      if (config.opponentMode !== 'online') return
      const qstate = engine.exportState()
      const pending = meta?.pendingMeasurement ?? null
      void onlineSync.pushQuantumState(qstate, engine.state.turn, pending).then((ok) => {
        if (!ok && onlineSync.remoteState?.type === 'quantum') {
          loadQuantumRef.current(onlineSync.remoteState.qstate)
        }
      })
    },
    [config.opponentMode, onlineSync],
  )

  const game = useQuantumChess(config, sounds, language, {
    onStateChange,
    canMove: () => {
      if (measurementBlockingRef.current) return false
      if (config.opponentMode !== 'online') return true
      if (measurementEventRef.current) return false
      return onlineSync.canPlayQuantumMove(turnRef.current, exportQStateRef.current())
    },
  })
  loadQuantumRef.current = game.loadQuantumState
  turnRef.current = game.turn
  exportQStateRef.current = game.exportState
  measurementEventRef.current = !!game.measurementEvent || game.isMeasurementBlocking
  measurementBlockingRef.current = game.isMeasurementBlocking
  const isOnline = game.isOnline
  const isAIMode = config.opponentMode === 'ai'
  const reduceMotion = useReducedMotion()
  const [boardReady, setBoardReady] = useState(false)
  const [mobileStatsOpen, setMobileStatsOpen] = useState(false)

  const pending = onlineSync.pendingMeasurement
  const isInitiator = !pending || pending.initiator === config.playerColor
  const rouletteMeasurement = game.measurementEvent ?? pending?.event ?? null
  const showMeasurementRoulette = !!rouletteMeasurement && (game.isMeasurementBlocking || !!pending)

  const handleDismissMeasurement = useCallback(() => {
    if (isOnline && pending && pending.initiator !== config.playerColor) return
    game.dismissMeasurement()
    if (config.opponentMode !== 'online') return
    void onlineSync.pushQuantumState(game.exportState(), game.turn, null)
  }, [config.opponentMode, config.playerColor, game, onlineSync, isOnline, pending])

  useEffect(() => {
    if (!isOnline) return
    if (hadPendingRef.current && !pending) {
      setMeasurementReleased(true)
      const id = window.setTimeout(() => setMeasurementReleased(false), 4500)
      return () => window.clearTimeout(id)
    }
    hadPendingRef.current = !!pending
  }, [isOnline, pending])

  useEffect(() => {
    const timer = setTimeout(() => setBoardReady(true), 80)
    return () => clearTimeout(timer)
  }, [])

  useEffect(() => {
    if (music.volume !== settings.musicVolume) {
      music.setVolume(settings.musicVolume)
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [settings.musicVolume])

  const timer = useTimer({
    enabled: config.useTimer,
    minutes: config.timerMinutes,
    turn: game.turn,
    gameStarted: true,
    gameOver: game.gameOver,
  })

  useEffect(() => {
    if (timer.timedOut && !game.gameOverInfo) {
      game.handleTimedOut(timer.timedOut)
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [timer.timedOut])

  useEffect(() => {
    if (!onlineSync.shouldApplyRemote || !onlineSync.remoteState) return
    if (onlineSync.remoteState.type !== 'quantum') return

    const remoteRoom = onlineSync.remoteState
    const local = game.exportState()
    const localRoom = {
      type: 'quantum' as const,
      qstate: local,
      pendingMeasurement: onlineSync.pendingMeasurement,
    }
    if (quantumRoomFingerprint(localRoom) === quantumRoomFingerprint(remoteRoom)) {
      onlineSync.markRemoteApplied(onlineSync.remoteVersion)
      return
    }

    onlineSync.beginRemoteApply()
    game.loadQuantumState(remoteRoom.qstate)
    game.syncRemotePendingMeasurement(remoteRoom.pendingMeasurement ?? null)
    onlineSync.markRemoteApplied(onlineSync.remoteVersion)
    onlineSync.endRemoteApply()
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [onlineSync.remoteVersion])

  useEffect(() => {
    if (config.opponentMode !== 'online') return
    if (onlineSync.syncError !== 'CONFLICT' && onlineSync.syncError !== 'OUT_OF_SYNC') return
    const remote = onlineSync.remoteState
    if (remote?.type !== 'quantum') return
    const local = game.exportState()
    if (quantumRoomFingerprint({ type: 'quantum', qstate: local, pendingMeasurement: onlineSync.pendingMeasurement }) === quantumRoomFingerprint(remote)) return

    onlineSync.beginRemoteApply()
    game.loadQuantumState(remote.qstate)
    game.syncRemotePendingMeasurement(remote.pendingMeasurement ?? null)
    onlineSync.markRemoteApplied(onlineSync.remoteVersion)
    onlineSync.endRemoteApply()
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [onlineSync.syncError, onlineSync.remoteVersion])

  useEffect(() => {
    if (game.gameOverInfo && config.opponentMode === 'online') {
      void onlineSync.finishGame()
    }
  }, [game.gameOverInfo, config.opponentMode, onlineSync])

  const opponentColor: PieceColor = config.playerColor === 'w' ? 'b' : 'w'
  const topColor: PieceColor = game.boardFlipped ? config.playerColor : opponentColor
  const bottomColor: PieceColor = game.boardFlipped ? opponentColor : config.playerColor

  const labelForColor = (c: PieceColor) => {
    if (isOnline) return c === config.playerColor ? t.you : (language === 'es' ? 'Rival' : 'Opponent')
    if (isAIMode) return c === config.playerColor ? t.you : (language === 'es' ? 'IA cuántica' : 'Quantum AI')
    return getPlayerLabel(c, language)
  }

  const classicHistory = useMemo(() => {
    return game.history.map((m) => ({
      color: m.color,
      from: m.from,
      to: m.to,
      piece: m.pieceType,
      captured: m.captured?.type,
      promotion: undefined,
      san: `${m.to}`,
      flags: '',
      description: m.description,
    }))
  }, [game.history])

  const topBar = useMemo(() => ({
    label: labelForColor(topColor),
    elo: '',
    color: topColor,
    isActive: game.turn === topColor && !game.gameOver,
    turnLabel: game.turn === topColor && !game.gameOver ? (language === 'es' ? 'Mueve' : 'To move') : undefined,
    accent: 'quantum' as const,
    captures: [] as any[],
    materialDiff: 0,
    time: config.useTimer ? (topColor === 'w' ? timer.whiteTime : timer.blackTime) : null,
    isLow: config.useTimer ? (topColor === 'w' ? timer.whiteTime : timer.blackTime) < 60 : false,
  }), [topColor, config, game, timer, language])

  const bottomBar = useMemo(() => ({
    label: labelForColor(bottomColor),
    elo: '',
    color: bottomColor,
    isActive: game.turn === bottomColor && !game.gameOver,
    turnLabel: game.turn === bottomColor && !game.gameOver ? (language === 'es' ? 'Mueve' : 'To move') : undefined,
    accent: 'quantum' as const,
    captures: [] as any[],
    materialDiff: 0,
    time: config.useTimer ? (bottomColor === 'w' ? timer.whiteTime : timer.blackTime) : null,
    isLow: config.useTimer ? (bottomColor === 'w' ? timer.whiteTime : timer.blackTime) < 60 : false,
  }), [bottomColor, config, game, timer, language])

  const modeLabels: Record<QMoveMode, { icon: string; label: string; desc: string }> = {
    classical: { icon: '♟', label: t.modeClassical, desc: t.modeClassicalDesc },
    quantum: { icon: '⚛', label: t.modeQuantum, desc: t.modeQuantumDesc },
    merge: { icon: '⊕', label: t.modeMerge, desc: t.modeMergeDesc },
  }

  const modeButtons: QMoveMode[] = ['classical', 'quantum', 'merge']

  const modeColor = (mode: QMoveMode, active: boolean) => {
    if (!active) return 'border-surface-4 bg-surface-2 text-neutral-500 hover:bg-surface-3 hover:text-neutral-300'
    if (mode === 'quantum') return 'border-indigo-500/30 bg-indigo-500/10 text-indigo-300'
    if (mode === 'merge') return 'border-cyan-500/30 bg-cyan-500/10 text-cyan-300'
    return 'border-accent/30 bg-accent/10 text-accent'
  }

  const onlineStatusText = onlineSync.isPushing
    ? t.onlineSyncing
    : onlineSync.onlineStatus === 'connecting'
      ? t.onlineStatusConnecting
      : onlineSync.onlineStatus === 'waiting'
        ? t.onlineStatusWaiting
        : onlineSync.onlineStatus === 'reconnecting'
          ? t.onlineStatusReconnecting
          : onlineSync.onlineStatus === 'conflict'
            ? t.onlineStatusConflict
            : onlineSync.onlineStatus === 'ended'
              ? t.onlineStatusEnded
              : t.onlineStatusSynced

  const onlineStatusClass = onlineSync.isPushing
    ? 'border-amber-400/30 text-amber-300'
    : onlineSync.onlineStatus === 'synced'
      ? 'border-emerald-400/30 text-emerald-300'
      : onlineSync.onlineStatus === 'conflict' || onlineSync.onlineStatus === 'ended'
        ? 'border-red-400/30 text-red-300'
        : 'border-surface-4 text-neutral-500'

  const boardMotion = reduceMotion
    ? { initial: false, animate: { opacity: 1 }, transition: { duration: 0 } }
    : { initial: { opacity: 0, scale: 0.97 }, animate: { opacity: 1, scale: 1 }, transition: { duration: 0.4, delay: 0.1 } }

  const renderModeButton = (mode: QMoveMode, compact = false) => {
    const info = modeLabels[mode]
    const active = game.moveMode === mode
    const enabled = game.availableMoveModes.includes(mode)
    return (
      <button
        key={mode}
        type="button"
        data-testid={`quantum-mode-${mode}`}
        aria-pressed={active}
        aria-label={`${info.label}: ${info.desc}`}
        onClick={() => game.chooseMoveMode(mode)}
        disabled={!enabled || game.gameOver}
        className={`${compact ? 'min-h-[36px] min-w-0 flex-1 flex-row items-center justify-center gap-1 px-1.5 py-1.5' : 'w-full px-3.5 py-3 text-left'} rounded border text-ui-sm transition-colors
          ${active ? modeColor(mode, true) : enabled && !game.gameOver ? modeColor(mode, false) : 'cursor-not-allowed border-surface-4 bg-surface-1 text-neutral-700'}`}
      >
        <span className={compact ? 'text-sm leading-none' : 'mr-2 text-sm'}>{info.icon}</span>
        <span className={`font-semibold ${compact ? 'truncate text-[10px] leading-tight' : ''}`}>{info.label}</span>
        {!compact && <span className="mt-0.5 block text-ui-sm text-neutral-500">{info.desc}</span>}
      </button>
    )
  }

  const showMeasureBanner = showMeasurementRoulette
  const showReleasedBanner = measurementReleased && isOnline && onlineSync.isMyTurn && !pending
  const showAiErrorBanner = isAIMode && !!game.engineError
  const bannerCount = (
    (showMeasureBanner ? 1 : 0)
    + (showReleasedBanner ? 1 : 0)
    + (showAiErrorBanner ? 1 : 0)
  ) as 0 | 1 | 2 | 3
  const hasCastleButtons =
    (game.classicalCastleOptions.length > 0 || game.quantumCastleOptions.length > 0)
    && !game.gameOver && !game.isThinking && !game.isMeasurementBlocking

  const gameHeader = (
    <header className="flex items-center justify-between border-b border-surface-4 px-3 py-2 max-lg:py-2 lg:px-6 lg:py-3">
        <div className="flex items-center gap-3">
          <GameIcon name="atom" className="h-5 w-5 text-indigo-400" />
          <span className="hidden font-serif text-sm text-white sm:inline">GdD</span>
          <span className="flex flex-wrap items-center gap-2 text-ui-xs font-medium uppercase tracking-wider text-neutral-500">
            {isOnline
              ? `${t.onlineBadge}${config.online?.code ? ` · ${config.online.code}` : ''}`
              : isAIMode
                ? (language === 'es' ? `Cuántico vs IA · ${config.difficulty}` : `Quantum vs AI · ${config.difficulty}`)
                : t.quantumBadge}
            {isOnline && (
              <span
                className={`rounded-sm border px-1.5 py-0.5 ${onlineStatusClass}`}
              >
                {onlineStatusText}
              </span>
            )}
            {isOnline && <OnlineBetaBadge language={language} />}
          </span>
        </div>
        <div className="flex items-center gap-1">
          <button
            type="button"
            onClick={onOpenSettings}
            className="inline-flex min-h-[44px] items-center gap-1.5 rounded px-3 py-1.5 text-ui-sm font-medium text-neutral-500 transition-colors hover:bg-surface-2 hover:text-white"
            aria-label={t.settings}
          >
            <GameIcon name="settings" /> {t.settings}
          </button>
          <button
            type="button"
            onClick={handleLeaveToMenu}
            className="min-h-[44px] rounded px-3 py-1.5 text-ui-sm font-medium text-neutral-500 transition-colors hover:bg-surface-2 hover:text-white"
          >
            {t.menu}
          </button>
        </div>
      </header>
  )

  const gameBanners = (
    <>
      {showMeasureBanner && (
        <motion.div
          className="border-b border-indigo-500/25 bg-indigo-500/10 px-3 py-2 text-center text-ui-xs text-indigo-200 max-lg:truncate lg:px-4 lg:py-2.5 lg:text-ui-sm"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
        >
          {isInitiator
            ? (language === 'es' ? 'Medición en curso — gira la ruleta para revelar el movimiento.' : 'Measurement in progress — spin the roulette to reveal the move.')
            : (language === 'es' ? '¡Medición en curso! Gira la ruleta y vive el resultado con tu rival.' : 'Measurement in progress! Spin the roulette and share the moment with your opponent.')}
        </motion.div>
      )}
      {showReleasedBanner && (
        <motion.div
          className="border-b border-emerald-500/25 bg-emerald-500/10 px-3 py-2 text-center text-ui-xs text-emerald-200 max-lg:truncate lg:px-4 lg:py-2.5 lg:text-ui-sm"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
        >
          {t.measurementCanMove}
        </motion.div>
      )}
      {showAiErrorBanner && (
        <motion.div
          className="border-b border-amber-500/25 bg-amber-500/10 px-3 py-2 text-center text-ui-xs text-amber-200 max-lg:truncate lg:px-4 lg:py-2.5 lg:text-ui-sm"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
        >
          {language === 'es'
            ? 'La IA cuántica está usando modo seguro/heurístico.'
            : 'Quantum AI is using safe/heuristic fallback mode.'}
        </motion.div>
      )}
    </>
  )

  return (
    <GameViewportShell
      variant="quantum"
      bannerCount={bannerCount}
      hasCastleButtons={hasCastleButtons}
      header={gameHeader}
      banners={bannerCount > 0 ? gameBanners : undefined}
      footer={(
        <div
          className="flex items-center gap-2 border-t border-surface-4 px-3 py-2 max-lg:py-2"
          style={{ paddingBottom: 'max(0.5rem, env(safe-area-inset-bottom))' }}
        >
          <button
            type="button"
            onClick={() => setMobileStatsOpen(true)}
            className="flex h-11 w-11 shrink-0 items-center justify-center rounded border border-surface-4 text-ui-sm text-neutral-400 transition-colors hover:bg-surface-2 hover:text-white"
            aria-label={language === 'es' ? 'Evaluación e historial' : 'Eval and history'}
          >
            <GameIcon name="chart" />
          </button>
          <div className="flex min-w-0 flex-1">
            <ActionButtons
              onUndo={game.undo}
              onFlip={game.flip}
              onResign={game.resign}
              canUndo={game.canUndo}
              gameOver={game.gameOver}
              language={language}
              showUndo={!isOnline}
            />
          </div>
          <button
            type="button"
            onClick={music.toggle}
            className={`flex h-11 w-11 shrink-0 items-center justify-center rounded text-sm transition-colors
              ${music.playing ? 'bg-indigo-500/15 text-indigo-400' : 'text-neutral-600 hover:text-neutral-400'}`}
            aria-label={music.playing ? t.pause : t.play}
          >
            <GameIcon name={music.playing ? 'pause' : 'music'} />
          </button>
        </div>
      )}
    >
      <div className="flex min-h-0 w-full flex-1 overflow-hidden lg:items-start lg:justify-center">
        <motion.div
          className="hidden w-56 flex-col border-r border-surface-4 pr-4 lg:flex xl:w-64"
          initial={reduceMotion ? false : { opacity: 0, x: -16 }}
          animate={{ opacity: 1, x: 0 }}
          transition={reduceMotion ? { duration: 0 } : { duration: 0.4, delay: 0.15 }}
        >
          <p className="mb-3 text-ui-xs font-semibold uppercase tracking-[0.15em] text-neutral-500">
            {t.moveTypes}
          </p>
          <div className="space-y-2">
            {modeButtons.map((mode) => renderModeButton(mode))}
          </div>
          <div className="mt-4 flex items-center gap-2 text-ui-sm text-neutral-500" aria-live="polite">
            <div
              className={`h-1.5 w-1.5 rounded-full ${
                game.status.type === 'player' ? 'bg-indigo-400'
                  : game.status.type === 'over' ? 'bg-red-400'
                  : 'bg-neutral-600'
              }`}
            />
            <span>{game.status.text}</span>
          </div>
        </motion.div>

        <motion.div className="flex min-h-0 w-full max-w-full flex-1 flex-col items-center justify-start overflow-hidden max-lg:pt-0.5 lg:justify-center lg:w-auto lg:flex-none lg:px-6" {...boardMotion}>
          <PlayerBar {...topBar} />

          {!boardReady ? (
            <BoardSkeleton />
          ) : (
            <QuantumBoard
              board={game.board}
              selectedPiece={game.selectedPiece}
              legalTargets={game.legalTargets}
              mergeTargets={game.mergeTargets}
              moveMode={game.moveMode}
              firstQuantumTarget={game.firstQuantumTarget}
              lastMove={game.lastMove}
              boardFlipped={game.boardFlipped}
              isThinking={game.isThinking}
              playerColor={game.controlColor}
              turnColor={game.turn}
              onSquareClick={game.handleSquareClick}
              onDrop={game.handleDrop}
              language={language}
              statusText={game.status.text}
              checkSquare={game.checkSquare}
            />
          )}

          <PlayerBar {...bottomBar} />

          <div className="game-quantum-controls shrink-0 space-y-1.5 py-0.5 max-lg:w-full lg:hidden" style={{ width: 'var(--board-size)' }}>
            <div>
              <p className="mb-1 text-ui-xs font-semibold uppercase tracking-[0.15em] text-neutral-500">
                {t.moveTypes}
              </p>
              <div className="flex gap-1" role="radiogroup" aria-label={t.moveTypes}>
                {modeButtons.map((mode) => renderModeButton(mode, true))}
              </div>
            </div>
            <div className="game-status-row flex min-h-0 min-w-0 items-center gap-2 py-0" aria-live="polite">
              <div
                className={`h-1.5 w-1.5 shrink-0 rounded-full ${
                  game.status.type === 'player' ? 'bg-indigo-400'
                    : game.status.type === 'over' ? 'bg-red-400'
                    : 'bg-neutral-600'
                }`}
              />
              <span className="truncate text-ui-xs text-neutral-500">{game.status.text}</span>
            </div>
          </div>

          {hasCastleButtons && (
            <div className="flex shrink-0 flex-wrap gap-1.5" style={{ width: 'var(--board-size)' }}>
              {game.classicalCastleOptions.map((side) => (
                <button
                  key={`classic-${side}`}
                  type="button"
                  onClick={() => game.doClassicalCastle(side)}
                  className="min-h-[36px] min-w-0 flex-1 rounded border border-accent/25 bg-accent/5 px-2 py-1 text-ui-xs font-medium text-accent transition-colors hover:bg-accent/15"
                >
                  {t.castleShort(side)}
                </button>
              ))}
              {game.quantumCastleOptions.map((side) => (
                <button
                  key={`quantum-${side}`}
                  type="button"
                  onClick={() => game.doQuantumCastle(side)}
                  className="min-h-[36px] min-w-0 flex-1 rounded border border-indigo-500/25 bg-indigo-500/5 px-2 py-1 text-ui-xs font-medium text-indigo-400 transition-colors hover:bg-indigo-500/15"
                >
                  {t.quantumCastle(side)}
                </button>
              ))}
            </div>
          )}
        </motion.div>

        <motion.div
          className="hidden w-72 flex-col border-l border-surface-4 lg:flex xl:w-80"
          initial={reduceMotion ? false : { opacity: 0, x: 20 }}
          animate={{ opacity: 1, x: 0 }}
          transition={reduceMotion ? { duration: 0 } : { duration: 0.4, delay: 0.2 }}
        >
          <div className="p-4">
            <EvalBar
              chances={game.chances}
              playerColor={config.playerColor}
              language={language}
              variant="quantum-heuristic"
            />
          </div>
          <div className="rule" />
          <div className="flex-1 overflow-hidden p-4">
            <MoveHistory history={classicHistory} language={language} />
          </div>
          <div className="rule" />
          <div className="p-4">
            <ActionButtons
              onUndo={game.undo}
              onFlip={game.flip}
              onResign={game.resign}
              canUndo={game.canUndo}
              gameOver={game.gameOver}
              language={language}
              showUndo={!isOnline}
            />
            <p className="mt-2 text-ui-xs text-neutral-600">
              {isOnline ? t.quantumUndoOnlineDisabled : t.quantumUndoReady}
            </p>
          </div>
          <div className="rule" />
          <div className="p-4">
            <MusicPlayer
              playing={music.playing}
              volume={music.volume}
              onToggle={music.toggle}
              onVolumeChange={(v) => onSettingsChange({ musicVolume: v })}
              language={language}
            />
          </div>
        </motion.div>
      </div>

      <GameMobileStatsSheet
        open={mobileStatsOpen}
        onClose={() => setMobileStatsOpen(false)}
        language={language}
      >
        <EvalBar
          chances={game.chances}
          playerColor={config.playerColor}
          language={language}
          variant="quantum-heuristic"
        />
        <MoveHistory history={classicHistory} language={language} variant="sheet" />
      </GameMobileStatsSheet>

      <PromotionModal
        visible={!!game.promotionPending}
        color={config.playerColor}
        onSelect={game.handlePromotion}
        language={language}
      />
      <GameOverModal
        info={game.gameOverInfo}
        onNewGame={handleLeaveToMenu}
        onDismiss={game.dismissGameOver}
        language={language}
      />
      <OnlineSessionEndedModal
        visible={onlineSync.opponentLeft}
        onMenu={handleLeaveToMenu}
        language={language}
      />
      <QuantumMeasurementRoulette
        visible={showMeasurementRoulette}
        measurement={rouletteMeasurement}
        onClose={handleDismissMeasurement}
        canDismiss={!isOnline || isInitiator}
        language={language}
      />
    </GameViewportShell>
  )
}
