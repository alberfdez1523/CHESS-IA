import type {
  Difficulty,
  GameConfig,
  GameMode,
  MoveInfo,
  PieceColor,
  QMeasurementEvent,
  QMoveRecord,
  QState,
  QuantumAction,
} from './types'
import type { NeutralQuantumReplayStep } from './gameReplay'
import {
  clearLocalGameAutosave,
  loadLocalGameAutosave,
  saveLocalGameAutosave,
} from './academyStore'

export const GAME_AUTOSAVE_STORAGE_KEY = 'gdd-game-autosave'
export const GAME_AUTOSAVE_UPDATED_EVENT = 'gdd:autosave-updated'
export const GAME_AUTOSAVE_VERSION = 1 as const
export const GAME_AUTOSAVE_TTL_MS = 30 * 24 * 60 * 60 * 1000

const MAX_CLOCK_SKEW_MS = 5 * 60 * 1000
const MAX_TIMER_MINUTES = 24 * 60

export type AutosaveOpponentMode = Exclude<GameConfig['opponentMode'], 'online'>

export type AutosaveGameConfig<Mode extends GameMode = GameMode> = Omit<
  GameConfig,
  'gameMode' | 'opponentMode' | 'online'
> & {
  gameMode: Mode
  opponentMode: AutosaveOpponentMode
}

export interface AutosaveLastMove {
  from: string
  to: string
}

export interface AutosaveClockState {
  whiteTime: number
  blackTime: number
}

export interface ClassicAutosaveSnapshot {
  type: 'classic'
  config: AutosaveGameConfig<'classic'>
  fen: string
  /** PGN is preferred for reconstructing a chess.js game with full history. */
  pgn?: string
  /** Serializable presentation history; PGN remains the source of truth. */
  history?: MoveInfo[]
  lastMove: AutosaveLastMove | null
  clocks: AutosaveClockState
}

export interface QuantumAutosaveSnapshot {
  type: 'quantum'
  config: AutosaveGameConfig<'quantum'>
  qstate: QState
  /** Neutral, language-independent action log used to resume exact replays. */
  replayActions?: NeutralQuantumReplayStep[]
  /** In-progress visual checkpoints; final stored replays use initialState + actions. */
  replaySnapshots?: QState[]
  lastMove: AutosaveLastMove | null
  clocks: AutosaveClockState
}

export type GameAutosaveSnapshot = ClassicAutosaveSnapshot | QuantumAutosaveSnapshot

export interface GameAutosaveMetadata {
  version: typeof GAME_AUTOSAVE_VERSION
  savedAt: number
  expiresAt: number
}

export type GameAutosave = GameAutosaveSnapshot & GameAutosaveMetadata

export interface GameAutosaveSummary {
  type: GameMode
  opponentMode: AutosaveOpponentMode
  playerColor: PieceColor
  difficulty: Difficulty
  turn: PieceColor
  moveCount: number
  savedAt: number
  expiresAt: number
  timerEnabled: boolean
  timerMinutes: number
  clocks: AutosaveClockState
}

interface LocalStorageLike {
  getItem(key: string): string | null
  setItem(key: string, value: string): void
  removeItem(key: string): void
}

const COLORS = new Set(['w', 'b'])
const DIFFICULTIES = new Set(['beginner', 'easy', 'medium', 'hard', 'master'])
const PIECE_TYPES = new Set(['p', 'n', 'b', 'r', 'q', 'k'])
const Q_MOVE_TYPES = new Set(['classical', 'quantum', 'merge', 'quantumCastle'])
const GAME_RESULT_CAUSES = new Set([
  'king-captured',
  'checkmate',
  'draw',
  'no-legal-actions',
  'timeout',
  'resignation',
  'agreement',
])

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null && !Array.isArray(value)
}

function isFiniteInteger(value: unknown, minimum = 0): value is number {
  return typeof value === 'number' && Number.isFinite(value) && Number.isInteger(value) && value >= minimum
}

function isColor(value: unknown): value is PieceColor {
  return typeof value === 'string' && COLORS.has(value)
}

function isSquare(value: unknown): value is string {
  return typeof value === 'string' && /^[a-h][1-8]$/.test(value)
}

function isLastMove(value: unknown): value is AutosaveLastMove | null {
  return value === null || (isRecord(value) && isSquare(value.from) && isSquare(value.to))
}

function isClockState(value: unknown): value is AutosaveClockState {
  return isRecord(value)
    && isFiniteInteger(value.whiteTime)
    && isFiniteInteger(value.blackTime)
}

function isAutosaveConfig<Mode extends GameMode>(
  value: unknown,
  gameMode: Mode,
): value is AutosaveGameConfig<Mode> {
  if (!isRecord(value) || 'online' in value) return false
  return value.gameMode === gameMode
    && (value.opponentMode === 'ai' || value.opponentMode === 'local')
    && isColor(value.playerColor)
    && typeof value.difficulty === 'string'
    && DIFFICULTIES.has(value.difficulty)
    && typeof value.useTimer === 'boolean'
    && isFiniteInteger(value.timerMinutes, 1)
    && value.timerMinutes <= MAX_TIMER_MINUTES
    && (
      value.rulesetId === undefined
      || (gameMode === 'classic' && value.rulesetId === 'classic')
      || (gameMode === 'quantum' && (value.rulesetId === 'quantum-standard' || value.rulesetId === 'quantum-coherence'))
    )
    && (
      value.options === undefined
      || (
        isRecord(value.options)
        && (value.options.maxCoherence === undefined || value.options.maxCoherence === 2 || value.options.maxCoherence === 4 || value.options.maxCoherence === 6)
      )
    )
}

function isFen(value: unknown): value is string {
  if (typeof value !== 'string' || value.length === 0 || value.length > 1024) return false
  const fields = value.trim().split(/\s+/)
  if (fields.length !== 6) return false

  const [position, turn, castling, enPassant, halfmove, fullmove] = fields
  const ranks = position.split('/')
  if (ranks.length !== 8) return false
  if (!ranks.every((rank) => {
    if (!/^[prnbqkPRNBQK1-8]+$/.test(rank)) return false
    const squares = [...rank].reduce(
      (total, token) => total + (/\d/.test(token) ? Number(token) : 1),
      0,
    )
    return squares === 8
  })) return false

  return isColor(turn)
    && (castling === '-' || /^K?Q?k?q?$/.test(castling))
    && (enPassant === '-' || /^[a-h][36]$/.test(enPassant))
    && /^\d+$/.test(halfmove)
    && /^[1-9]\d*$/.test(fullmove)
}

function isMoveInfo(value: unknown): value is MoveInfo {
  if (!isRecord(value)) return false
  return isColor(value.color)
    && isSquare(value.from)
    && isSquare(value.to)
    && typeof value.piece === 'string'
    && (value.captured === undefined || typeof value.captured === 'string')
    && (value.promotion === undefined || typeof value.promotion === 'string')
    && typeof value.san === 'string'
    && typeof value.flags === 'string'
    && typeof value.description === 'string'
}

function isMeasurement(value: unknown): value is QMeasurementEvent {
  if (!isRecord(value)) return false
  const prior = value.priorStepResult
  return (value.target === 'attacker' || value.target === 'defender')
    && (value.result === 'alive' || value.result === 'dead')
    && typeof value.probability === 'number'
    && Number.isFinite(value.probability)
    && value.probability >= 0
    && value.probability <= 1
    && typeof value.roll === 'number'
    && Number.isFinite(value.roll)
    && value.roll >= 0
    && value.roll < 1
    && typeof value.attackerWasQuantum === 'boolean'
    && typeof value.defenderWasQuantum === 'boolean'
    && isFiniteInteger(value.step, 1)
    && isFiniteInteger(value.totalSteps, value.step)
    && (prior === undefined || (
      isRecord(prior)
      && (prior.target === 'attacker' || prior.target === 'defender')
      && (prior.result === 'alive' || prior.result === 'dead')
    ))
}

function isQuantumAction(value: unknown): value is QuantumAction {
  if (!isRecord(value) || typeof value.kind !== 'string') return false
  if (value.kind === 'quantumCastle') {
    return isColor(value.color) && (value.side === 'k' || value.side === 'q')
  }
  if (typeof value.pieceId !== 'string' || !isSquare(value.from)) return false
  if (value.kind === 'classical') {
    return isSquare(value.to)
      && (value.promotion === undefined || (
        typeof value.promotion === 'string' && PIECE_TYPES.has(value.promotion)
      ))
  }
  if (value.kind === 'quantum') return isSquare(value.toA) && isSquare(value.toB)
  if (value.kind === 'merge') return isSquare(value.to)
  return false
}

function isNeutralQuantumReplayStep(value: unknown): value is NeutralQuantumReplayStep {
  return isRecord(value)
    && isQuantumAction(value.action)
    && Array.isArray(value.measurements)
    && value.measurements.every(isMeasurement)
}

function isQMoveRecord(value: unknown): value is QMoveRecord {
  if (!isRecord(value)) return false
  const captured = value.captured
  return typeof value.pieceId === 'string'
    && typeof value.pieceType === 'string'
    && PIECE_TYPES.has(value.pieceType)
    && isColor(value.color)
    && typeof value.moveType === 'string'
    && Q_MOVE_TYPES.has(value.moveType)
    && isSquare(value.from)
    && isSquare(value.to)
    && (value.secondTo === undefined || isSquare(value.secondTo))
    && (captured === undefined || (
      isRecord(captured)
      && typeof captured.id === 'string'
      && typeof captured.type === 'string'
      && PIECE_TYPES.has(captured.type)
    ))
    && (value.measurement === undefined || isMeasurement(value.measurement))
    && (value.measurements === undefined || (
      Array.isArray(value.measurements) && value.measurements.every(isMeasurement)
    ))
    && typeof value.description === 'string'
}

function isQState(value: unknown): value is QState {
  if (!isRecord(value) || !isRecord(value.pieces) || !isColor(value.turn)) return false

  const piecesAreValid = Object.entries(value.pieces).every(([id, piece]) => {
    if (!isRecord(piece) || piece.id !== id || !isRecord(piece.positions)) return false
    const positionsAreValid = Object.entries(piece.positions).every(([square, probability]) => (
      isSquare(square)
      && typeof probability === 'number'
      && Number.isFinite(probability)
      && probability > 0
      && probability <= 1
    ))
    return typeof piece.type === 'string'
      && PIECE_TYPES.has(piece.type)
      && isColor(piece.color)
      && typeof piece.alive === 'boolean'
      && positionsAreValid
  })
  if (!piecesAreValid) return false

  const castling = value.castling
  if (!isRecord(castling) || !isRecord(castling.w) || !isRecord(castling.b)) return false
  if (
    typeof castling.w.k !== 'boolean'
    || typeof castling.w.q !== 'boolean'
    || typeof castling.b.k !== 'boolean'
    || typeof castling.b.q !== 'boolean'
  ) return false

  const entanglementsAreValid = Array.isArray(value.entanglements)
    && value.entanglements.every((entry) => (
      isRecord(entry)
      && isFiniteInteger(entry.id, 1)
      && (entry.type === 'castle' || entry.type === 'tunnel')
      && isRecord(entry.data)
    ))
  if (!entanglementsAreValid) return false

  const gameOver = value.gameOver
  const gameOverIsValid = gameOver === null || (
    isRecord(gameOver)
    && (gameOver.winner === null || isColor(gameOver.winner))
    && typeof gameOver.cause === 'string'
    && GAME_RESULT_CAUSES.has(gameOver.cause)
    && typeof gameOver.reason === 'string'
  )

  return Array.isArray(value.history)
    && value.history.every(isQMoveRecord)
    && isFiniteInteger(value.moveNumber, 1)
    && isFiniteInteger(value.nextEntId, 1)
    && isFiniteInteger(value.rngCounter)
    && gameOverIsValid
}

function isClassicSnapshot(value: unknown): value is ClassicAutosaveSnapshot {
  if (!isRecord(value)) return false
  return value.type === 'classic'
    && isAutosaveConfig(value.config, 'classic')
    && isFen(value.fen)
    && (value.pgn === undefined || typeof value.pgn === 'string')
    && (value.history === undefined || (
      Array.isArray(value.history) && value.history.every(isMoveInfo)
    ))
    && isLastMove(value.lastMove)
    && isClockState(value.clocks)
}

function isQuantumSnapshot(value: unknown): value is QuantumAutosaveSnapshot {
  if (!isRecord(value)) return false
  return value.type === 'quantum'
    && isAutosaveConfig(value.config, 'quantum')
    && isQState(value.qstate)
    && (value.replayActions === undefined || (
      Array.isArray(value.replayActions)
      && value.replayActions.every(isNeutralQuantumReplayStep)
      && value.replayActions.length === value.qstate.history.length
    ))
    && (value.replaySnapshots === undefined || (
      Array.isArray(value.replaySnapshots)
      && value.replaySnapshots.length === value.qstate.history.length + 1
      && value.replaySnapshots.every(isQState)
    ))
    && isLastMove(value.lastMove)
    && isClockState(value.clocks)
}

function isGameAutosave(value: unknown, now: number): value is GameAutosave {
  if (!isRecord(value)) return false
  if (value.version !== GAME_AUTOSAVE_VERSION) return false
  if (!isFiniteInteger(value.savedAt, 1) || !isFiniteInteger(value.expiresAt, 1)) return false
  if (value.savedAt > now + MAX_CLOCK_SKEW_MS) return false
  if (value.expiresAt <= now || value.expiresAt <= value.savedAt) return false
  if (value.expiresAt - value.savedAt > GAME_AUTOSAVE_TTL_MS) return false
  return isClassicSnapshot(value) || isQuantumSnapshot(value)
}

function getLocalStorage(): LocalStorageLike | null {
  try {
    const storage = (globalThis as typeof globalThis & { localStorage?: LocalStorageLike }).localStorage
    if (
      !storage
      || typeof storage.getItem !== 'function'
      || typeof storage.setItem !== 'function'
      || typeof storage.removeItem !== 'function'
    ) return null
    return storage
  } catch {
    return null
  }
}

function removeStoredValue(storage: LocalStorageLike): void {
  try {
    storage.removeItem(GAME_AUTOSAVE_STORAGE_KEY)
  } catch {
    // Storage can become unavailable between reads (private mode, policy, quota).
  }
}

function dispatchAutosaveUpdated(): void {
  if (typeof window !== 'undefined') window.dispatchEvent(new Event(GAME_AUTOSAVE_UPDATED_EVENT))
}

function mirrorAutosave(candidate: GameAutosave): void {
  void saveLocalGameAutosave(candidate).catch(() => undefined)
}

function clearMirroredAutosave(): void {
  void clearLocalGameAutosave().catch(() => undefined)
}

/** Saves only local and AI games. Returns false when storage or data is invalid. */
export function save(snapshot: GameAutosaveSnapshot): boolean {
  const storage = getLocalStorage()
  if (!storage) return false

  try {
    const savedAt = Date.now()
    const candidate = {
      ...snapshot,
      version: GAME_AUTOSAVE_VERSION,
      savedAt,
      expiresAt: savedAt + GAME_AUTOSAVE_TTL_MS,
    }
    const serialized = JSON.stringify(candidate)
    const parsed: unknown = JSON.parse(serialized)
    if (!isGameAutosave(parsed, savedAt)) return false
    storage.setItem(GAME_AUTOSAVE_STORAGE_KEY, serialized)
    mirrorAutosave(parsed)
    dispatchAutosaveUpdated()
    return true
  } catch {
    return false
  }
}

/** Loads a fresh parsed snapshot, removing corrupt, unsupported or expired data. */
export function load(): GameAutosave | null {
  const storage = getLocalStorage()
  if (!storage) return null

  try {
    const raw = storage.getItem(GAME_AUTOSAVE_STORAGE_KEY)
    if (raw === null) return null
    const parsed: unknown = JSON.parse(raw)
    if (!isGameAutosave(parsed, Date.now())) {
      removeStoredValue(storage)
      clearMirroredAutosave()
      return null
    }
    return parsed
  } catch {
    removeStoredValue(storage)
    return null
  }
}

export function clear(): boolean {
  clearMirroredAutosave()
  const storage = getLocalStorage()
  if (!storage) return false
  try {
    storage.removeItem(GAME_AUTOSAVE_STORAGE_KEY)
    dispatchAutosaveUpdated()
    return true
  } catch {
    return false
  }
}

/** Restores the synchronous compatibility copy from IndexedDB after startup. */
export async function hydrateFromIndexedDb(): Promise<GameAutosave | null> {
  const local = load()
  if (local) return local

  try {
    const candidate = await loadLocalGameAutosave()
    if (!isGameAutosave(candidate, Date.now())) {
      if (candidate !== null) await clearLocalGameAutosave()
      return null
    }

    const storage = getLocalStorage()
    if (storage) storage.setItem(GAME_AUTOSAVE_STORAGE_KEY, JSON.stringify(candidate))
    dispatchAutosaveUpdated()
    return candidate
  } catch {
    return null
  }
}

export function has(): boolean {
  return load() !== null
}

export function getSummary(): GameAutosaveSummary | null {
  const autosave = load()
  if (!autosave) return null

  const turn = autosave.type === 'quantum'
    ? autosave.qstate.turn
    : autosave.fen.trim().split(/\s+/)[1] as PieceColor
  const moveCount = autosave.type === 'quantum'
    ? autosave.qstate.history.length
    : autosave.history?.length ?? classicPlyCount(autosave.fen)

  return {
    type: autosave.type,
    opponentMode: autosave.config.opponentMode,
    playerColor: autosave.config.playerColor,
    difficulty: autosave.config.difficulty,
    turn,
    moveCount,
    savedAt: autosave.savedAt,
    expiresAt: autosave.expiresAt,
    timerEnabled: autosave.config.useTimer,
    timerMinutes: autosave.config.timerMinutes,
    clocks: { ...autosave.clocks },
  }
}

function classicPlyCount(fen: string): number {
  const [, turn, , , , fullmove] = fen.trim().split(/\s+/)
  return Math.max(0, (Number(fullmove) - 1) * 2 + (turn === 'b' ? 1 : 0))
}

export const gameAutosave = { load, save, clear, has, getSummary, hydrateFromIndexedDb }
