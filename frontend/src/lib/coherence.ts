import type { QuantumChessEngine } from './quantumEngine'
import type {
  CoherenceLimit,
  PieceColor,
  QState,
  QuantumAction,
  RulesetId,
} from './types'

export const DEFAULT_COHERENCE_LIMIT: CoherenceLimit = 4

export interface QuantumRulesConfig {
  rulesetId: Extract<RulesetId, 'quantum-standard' | 'quantum-coherence'>
  maxCoherence: CoherenceLimit
}

export interface CoherenceStatus {
  used: number
  available: number
  limit: CoherenceLimit
}

export function normalizeCoherenceLimit(value: number | undefined): CoherenceLimit {
  return value === 2 || value === 6 ? value : DEFAULT_COHERENCE_LIMIT
}

/** Coherence is derived from state, so merges and collapses release it automatically. */
export function calculateCoherenceUsage(state: QState, color: PieceColor): number {
  const branchUnits = Object.values(state.pieces).reduce((total, piece) => {
    if (!piece.alive || piece.color !== color) return total
    return total + Math.max(0, Object.keys(piece.positions).length - 1)
  }, 0)

  const tunnelUnits = state.entanglements.reduce((total, entanglement) => {
    if (entanglement.type !== 'tunnel') return total
    const tunneller = state.pieces[entanglement.data.tunnelerId]
    return total + (tunneller?.alive && tunneller.color === color ? 1 : 0)
  }, 0)

  return branchUnits + tunnelUnits
}

export function getCoherenceStatus(
  state: QState,
  color: PieceColor,
  limit: CoherenceLimit = DEFAULT_COHERENCE_LIMIT,
): CoherenceStatus {
  const used = calculateCoherenceUsage(state, color)
  return { used, available: Math.max(0, limit - used), limit }
}

/**
 * Returns the guaranteed additional capacity required before an action starts.
 * Captures may release capacity after measurement, but an action cannot rely on
 * a random collapse to fit under the limit.
 */
export function getActionCoherenceCost(engine: QuantumChessEngine, action: QuantumAction): number {
  if (action.kind === 'quantum') return 1
  if (action.kind === 'quantumCastle') return 2
  if (action.kind === 'merge') return 0

  const move = engine
    .getLegalMoves(action.pieceId, action.from)
    .find((candidate) => candidate.square === action.to)
  if (!move || move.tunnelThrough.length === 0) return 0

  const board = engine.getBoard()
  return move.tunnelThrough.reduce((total, square) => (
    total + (board[square] ?? []).filter((cell) => cell.probability < 1).length
  ), 0)
}

export function actionCoherenceColor(engine: QuantumChessEngine, action: QuantumAction): PieceColor {
  if (action.kind === 'quantumCastle') return action.color
  return engine.getPiece(action.pieceId)?.color ?? engine.state.turn
}

