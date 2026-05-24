import { QuantumChessEngine } from './quantumEngine'
import { requestQuantumEval, requestQuantumEvalBatch } from './api'
import type { Difficulty, PieceColor, PieceType, QMoveRecord, QState } from './types'

export type QAIAction =
  | {
      kind: 'classical'
      pieceId: string
      from: string
      to: string
      promotion?: PieceType
    }
  | {
      kind: 'quantum'
      pieceId: string
      from: string
      toA: string
      toB: string
    }
  | {
      kind: 'merge'
      pieceId: string
      from: string
      to: string
    }
  | {
      kind: 'quantumCastle'
      color: PieceColor
      side: 'k' | 'q'
    }

export interface ScoredQAIAction {
  action: QAIAction
  score: number
  reason: string
  heuristicEval: number
  stockfishEval?: number
}

const PIECE_VALUES: Record<PieceType, number> = {
  p: 100,
  n: 320,
  b: 330,
  r: 500,
  q: 900,
  k: 20000,
}

const CENTER_BONUS: Record<string, number> = {
  d4: 24, e4: 24, d5: 24, e5: 24,
  c3: 10, d3: 10, e3: 10, f3: 10,
  c4: 10, f4: 10, c5: 10, f5: 10,
  c6: 10, d6: 10, e6: 10, f6: 10,
}

const PROMO_TYPES: PieceType[] = ['q', 'r', 'b', 'n']

function actionKey(action: QAIAction): string {
  switch (action.kind) {
    case 'classical':
      return `c:${action.pieceId}:${action.from}:${action.to}:${action.promotion ?? ''}`
    case 'quantum':
      return `q:${action.pieceId}:${action.from}:${action.toA}:${action.toB}`
    case 'merge':
      return `m:${action.pieceId}:${action.from}:${action.to}`
    case 'quantumCastle':
      return `qc:${action.color}:${action.side}`
  }
}

function isPromotionSquare(color: PieceColor, square: string): boolean {
  const rank = square[1]
  return color === 'w' ? rank === '8' : rank === '1'
}

function dedupeActions(actions: QAIAction[]): QAIAction[] {
  const seen = new Set<string>()
  const out: QAIAction[] = []
  for (const a of actions) {
    const key = actionKey(a)
    if (seen.has(key)) continue
    seen.add(key)
    out.push(a)
  }
  return out
}

export function generateLegalQActions(engine: QuantumChessEngine): QAIAction[] {
  const actions: QAIAction[] = []
  const color = engine.state.turn

  for (const piece of Object.values(engine.state.pieces)) {
    if (!piece.alive || piece.color !== color) continue

    for (const from of Object.keys(piece.positions)) {
      const moves = engine.getLegalMoves(piece.id, from)

      for (const move of moves) {
        if (piece.type === 'p' && isPromotionSquare(piece.color, move.square)) {
          for (const promo of PROMO_TYPES) {
            actions.push({ kind: 'classical', pieceId: piece.id, from, to: move.square, promotion: promo })
          }
        } else {
          actions.push({ kind: 'classical', pieceId: piece.id, from, to: move.square })
        }
      }

      if (piece.type !== 'p') {
        const quantumTargets = moves.filter((m) => !m.isCapture).map((m) => m.square)
        for (let i = 0; i < quantumTargets.length; i++) {
          for (let j = i + 1; j < quantumTargets.length; j++) {
            actions.push({
              kind: 'quantum',
              pieceId: piece.id,
              from,
              toA: quantumTargets[i],
              toB: quantumTargets[j],
            })
          }
        }
      }

      for (const to of engine.getMergeTargets(piece.id, from)) {
        actions.push({ kind: 'merge', pieceId: piece.id, from, to })
      }
    }
  }

  for (const side of engine.canQuantumCastle(color)) {
    actions.push({ kind: 'quantumCastle', color, side })
  }

  return dedupeActions(actions)
}

export function isActionStillLegal(engine: QuantumChessEngine, action: QAIAction): boolean {
  switch (action.kind) {
    case 'classical': {
      const moves = engine.getLegalMoves(action.pieceId, action.from)
      const target = moves.find((m) => m.square === action.to)
      if (!target) return false
      const piece = engine.getPiece(action.pieceId)
      if (piece?.type === 'p' && isPromotionSquare(piece.color, action.to)) {
        return !!action.promotion
      }
      return true
    }
    case 'quantum': {
      const piece = engine.getPiece(action.pieceId)
      if (!piece || piece.type === 'p') return false
      const moves = engine.getLegalMoves(action.pieceId, action.from)
      const nonCapture = moves.filter((m) => !m.isCapture).map((m) => m.square)
      return nonCapture.includes(action.toA) && nonCapture.includes(action.toB)
    }
    case 'merge':
      return engine.getMergeTargets(action.pieceId, action.from).includes(action.to)
    case 'quantumCastle':
      return engine.canQuantumCastle(action.color).includes(action.side)
  }
}

export function applyQAIAction(
  engine: QuantumChessEngine,
  action: QAIAction,
): QMoveRecord {
  switch (action.kind) {
    case 'classical':
      return engine.doClassicalMove(action.pieceId, action.from, action.to, action.promotion)
    case 'quantum':
      return engine.doQuantumMove(action.pieceId, action.from, action.toA, action.toB)
    case 'merge':
      return engine.doMergeFrom(action.pieceId, action.from, action.to)
    case 'quantumCastle':
      return engine.doQuantumCastle(action.color, action.side)
  }
}

export function simulateQAction(
  engine: QuantumChessEngine,
  action: QAIAction,
): QState | null {
  const clone = new QuantumChessEngine()
  clone.loadState(engine.exportState())
  try {
    applyQAIAction(clone, action)
    return clone.exportState()
  } catch {
    return null
  }
}

function expectedMaterial(engine: QuantumChessEngine, color: PieceColor): number {
  let total = 0
  for (const piece of Object.values(engine.state.pieces)) {
    if (!piece.alive || piece.color !== color) continue
    const value = PIECE_VALUES[piece.type]
    const probability = Object.values(piece.positions).reduce((sum, p) => sum + p, 0)
    total += value * probability
  }
  return total
}

function centerBonus(square: string): number {
  return CENTER_BONUS[square] ?? 0
}

function positionCount(piece: { positions: Record<string, number> }): number {
  return Object.keys(piece.positions).length
}

function looksLikeCapture(engine: QuantumChessEngine, action: QAIAction): boolean {
  if (action.kind !== 'classical') return false
  const moves = engine.getLegalMoves(action.pieceId, action.from)
  return moves.some((m) => m.square === action.to && m.isCapture)
}

function captureBonus(engine: QuantumChessEngine, action: QAIAction, aiColor: PieceColor): number {
  if (action.kind !== 'classical') return 0
  const moves = engine.getLegalMoves(action.pieceId, action.from)
  const move = moves.find((m) => m.square === action.to && m.isCapture)
  if (!move) return 0

  const attacker = engine.getPiece(action.pieceId)
  if (!attacker) return 0
  const attackerProb = attacker.positions[action.from] ?? 0

  const board = engine.getBoard()
  const cells = board[action.to] ?? []
  const enemy = cells.find((c) => c.color !== aiColor)
  if (!enemy) return 0

  const defender = engine.getPiece(enemy.pieceId)
  if (!defender) return 0
  const defenderProb = defender.positions[action.to] ?? 0
  return attackerProb * defenderProb * PIECE_VALUES[defender.type]
}

function scoreActionHeuristic(
  engine: QuantumChessEngine,
  action: QAIAction,
  aiColor: PieceColor,
): { score: number; reason: string } {
  const sim = simulateQAction(engine, action)
  if (!sim) return { score: -99999, reason: 'invalid' }

  const simEngine = new QuantumChessEngine()
  simEngine.loadState(sim)

  const enemyColor: PieceColor = aiColor === 'w' ? 'b' : 'w'
  let score = expectedMaterial(simEngine, aiColor) - expectedMaterial(simEngine, enemyColor)
  let reason = 'material'

  score += captureBonus(engine, action, aiColor)
  if (looksLikeCapture(engine, action)) reason = 'capture'

  const moveNumber = simEngine.state.moveNumber

  switch (action.kind) {
    case 'classical': {
      score += centerBonus(action.to)
      const piece = engine.getPiece(action.pieceId)
      if (piece && moveNumber <= 12) {
        if (piece.type === 'n' || piece.type === 'b') {
          const startRank = piece.color === 'w' ? '1' : '8'
          if (action.from[1] === startRank) score += 35
        }
        if (piece.type === 'q') score -= 80
      }
      if (action.promotion === 'q') score += 40
      break
    }
    case 'quantum': {
      const piece = engine.getPiece(action.pieceId)
      if (!piece) break
      const fragments = positionCount(piece)
      if (moveNumber <= 12 && piece.type === 'q') score -= 100
      if (fragments >= 3) score -= 40 * (fragments - 2)
      if (piece.type === 'n' || piece.type === 'b' || piece.type === 'r') {
        score += centerBonus(action.toA) + centerBonus(action.toB) + 25
      }
      reason = 'split'
      break
    }
    case 'merge': {
      const piece = engine.getPiece(action.pieceId)
      if (piece && positionCount(piece) > 1) {
        score += PIECE_VALUES[piece.type] * 0.15
        reason = 'merge'
      }
      break
    }
    case 'quantumCastle':
      score += moveNumber <= 16 ? 60 : 25
      reason = 'castle'
      break
  }

  if (simEngine.isClassicalKingInCheck(aiColor)) score -= 500

  return { score, reason }
}

function pickActionForDifficulty(scored: ScoredQAIAction[], difficulty: Difficulty): QAIAction | null {
  if (scored.length === 0) return null

  const ordered = [...scored].sort((a, b) => b.score - a.score)
  const poolSize: Record<Difficulty, number> = {
    beginner: 12,
    easy: 8,
    medium: 5,
    hard: 3,
    master: 1,
  }
  const top = ordered.slice(0, Math.min(poolSize[difficulty], ordered.length))
  const r = Math.random()

  switch (difficulty) {
    case 'beginner':
      return top[Math.floor(Math.random() * top.length)].action
    case 'easy':
      if (r < 0.45) return top[0].action
      return top[Math.floor(Math.random() * top.length)].action
    case 'medium':
      if (r < 0.65) return top[0].action
      if (r < 0.85) return top[Math.min(1, top.length - 1)].action
      if (r < 0.95) return top[Math.min(2, top.length - 1)].action
      return top[Math.floor(Math.random() * top.length)].action
    case 'hard':
      if (r < 0.85) return top[0].action
      return top[Math.min(1, top.length - 1)].action
    case 'master':
      return top[0].action
  }
}

const STOCKFISH_BLEND: Record<Difficulty, { heuristic: number; engine: number; topN: number }> = {
  beginner: { heuristic: 0.75, engine: 0.25, topN: 6 },
  easy: { heuristic: 0.55, engine: 0.45, topN: 10 },
  medium: { heuristic: 0.35, engine: 0.65, topN: 14 },
  hard: { heuristic: 0.2, engine: 0.8, topN: 16 },
  master: { heuristic: 0.1, engine: 0.9, topN: 18 },
}

export function chooseFallbackLegalQAction(engine: QuantumChessEngine): QAIAction | null {
  const actions = generateLegalQActions(engine)
  if (actions.length === 0) return null

  const captures = actions.filter((action) => looksLikeCapture(engine, action))
  if (captures.length > 0) return captures[Math.floor(Math.random() * captures.length)]

  return actions[Math.floor(Math.random() * actions.length)]
}

export async function chooseQuantumAIMove(
  engine: QuantumChessEngine,
  difficulty: Difficulty = 'medium',
  options?: { useStockfish?: boolean },
): Promise<QAIAction | null> {
  const actions = generateLegalQActions(engine)
  if (actions.length === 0) return null

  const aiColor = engine.state.turn
  const sideMultiplier = aiColor === 'w' ? 1 : -1
  const blend = STOCKFISH_BLEND[difficulty]

  const scored: ScoredQAIAction[] = actions.map((action) => {
    const { score, reason } = scoreActionHeuristic(engine, action, aiColor)
    return { action, score, reason, heuristicEval: score }
  })

  scored.sort((a, b) => b.score - a.score)
  const candidates = scored.slice(0, Math.min(blend.topN, scored.length))

  if (options?.useStockfish) {
    try {
      const payloads: object[] = []
      const evalEntries: ScoredQAIAction[] = []
      for (const entry of candidates) {
        const sim = simulateQAction(engine, entry.action)
        if (!sim) continue
        const simEngine = new QuantumChessEngine()
        simEngine.loadState(sim)
        payloads.push(simEngine.toPayload())
        evalEntries.push(entry)
      }
      const evalResults = payloads.length > 1
        ? await requestQuantumEvalBatch(payloads)
        : payloads.length === 1
          ? [await requestQuantumEval(payloads[0])]
          : []
      for (let i = 0; i < evalEntries.length; i++) {
        const entry = evalEntries[i]
        const evalRes = evalResults[i]
        if (!evalRes) continue
        const stockfishForAI = evalRes.evaluation * sideMultiplier
        entry.stockfishEval = stockfishForAI
        entry.score = entry.heuristicEval * blend.heuristic + stockfishForAI * blend.engine
        if (evalRes.mate !== null) {
          entry.score += evalRes.mate > 0 ? 5000 : -5000
        }
      }
      candidates.sort((a, b) => b.score - a.score)
    } catch {
      // Solo heurística local si Stockfish falla
    }
  }

  return pickActionForDifficulty(candidates, difficulty)
}

/** @deprecated Usar chooseQuantumAIMove */
export async function chooseQuantumAIMoveMedium(
  engine: QuantumChessEngine,
  options?: { useStockfish?: boolean },
): Promise<QAIAction | null> {
  return chooseQuantumAIMove(engine, 'medium', options)
}
