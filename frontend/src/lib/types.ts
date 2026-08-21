// ─── Tipos principales del juego ───

export type PieceColor = 'w' | 'b'
export type PieceType = 'p' | 'n' | 'b' | 'r' | 'q' | 'k'
export type Difficulty = 'beginner' | 'easy' | 'medium' | 'hard' | 'master'
export type PlayerColorChoice = 'w' | 'b' | 'random'
export type GameMode = 'classic' | 'quantum'
export type RulesetId = 'classic' | 'quantum-standard' | 'quantum-coherence'
export type OpponentMode = 'ai' | 'local' | 'online'
export type Language = 'es' | 'en'
export type CoherenceLimit = 2 | 4 | 6

export interface TimeControl {
  initialSeconds: number
  incrementSeconds: number
}

export interface GameRulesetOptions {
  maxCoherence?: CoherenceLimit
}

export interface OnlineMeta {
  roomId: string
  code: string
  myColor: PieceColor
  isHost: boolean
  userId: string
}

export interface GameConfig {
  playerColor: PieceColor
  difficulty: Difficulty
  opponentMode: OpponentMode
  useTimer: boolean
  timerMinutes: number
  gameMode: GameMode
  /** Identificador v2. Si falta, se deriva de `gameMode` para autosaves antiguos. */
  rulesetId?: RulesetId
  timeControl?: TimeControl
  options?: GameRulesetOptions
  /** Presente cuando opponentMode === 'online' */
  online?: OnlineMeta
}

export interface GameConfigV2 extends GameConfig {
  rulesetId: RulesetId
  timeControl: TimeControl
  options: GameRulesetOptions
}

export interface StateEnvelope<T> {
  schemaVersion: number
  rulesetId: RulesetId
  revision: number
  hash: string
  state: T
}

export interface GameActionEnvelope<TAction = QuantumAction> {
  actionId: string
  expectedVersion: number
  action: TAction
  clientTimestamp: string
}

export interface CoachCandidate<TAction = QuantumAction> {
  action: TAction
  score: number
  probability?: number
}

export interface CoachFeedback<TAction = QuantumAction> {
  classification: 'best' | 'excellent' | 'good' | 'inaccuracy' | 'mistake' | 'blunder'
  concepts: string[]
  candidates: CoachCandidate<TAction>[]
  probabilities?: number[]
  explanationKey: string
}

export interface DailyChallenge {
  date: string
  seed: string
  rulesetId: RulesetId
  difficulty: Difficulty
  scoringPolicy: string
}

export interface DifficultyMeta {
  key: Difficulty
  label: string
  elo: string
  bars: number
}

export interface MoveInfo {
  color: PieceColor
  from: string
  to: string
  piece: string
  captured?: string
  promotion?: string
  san: string
  flags: string
  description: string
}

export interface CapturedPieces {
  player: PieceType[]
  ai: PieceType[]
}

export interface Chances {
  white: number
  draw: number
  black: number
}

export interface GameOverInfo {
  title: string
  message: string
  result: 'win' | 'lose' | 'draw'
}

export interface APIMoveResponse {
  bestmove: string
  evaluation: number
  mate: number | null
  ponder: string | null
}

// ─── Tipos del modo cuántico ───

/** Pieza cuántica: puede existir en múltiples casillas simultáneamente */
export interface QPiece {
  id: string
  type: PieceType
  color: PieceColor
  /** Mapa casilla → probabilidad. La suma de probabilidades = 1.0 */
  positions: Record<string, number>
  alive: boolean
}

/** Celda visible del tablero cuántico */
export interface QBoardCell {
  pieceId: string
  type: PieceType
  color: PieceColor
  probability: number
}

export type QMoveType = 'classical' | 'quantum' | 'merge' | 'quantumCastle'
export type QMoveMode = 'classical' | 'quantum' | 'merge'

export interface QMeasurementEvent {
  target: 'attacker' | 'defender'
  result: 'alive' | 'dead'
  probability: number
  roll: number
  attackerWasQuantum: boolean
  defenderWasQuantum: boolean
  step: number
  totalSteps: number
  priorStepResult?: {
    target: 'attacker' | 'defender'
    result: 'alive' | 'dead'
  }
}

/** Fuente de azar inyectable. Debe devolver valores en el intervalo [0, 1). */
export interface QuantumRng {
  (): number
  /** Permite que `applyAction` revierta también la fuente tras un error. */
  checkpoint?: () => unknown
  restore?: (checkpoint: unknown) => void
}

/**
 * Acciones admitidas por el motor cuántico. Los nombres conservan la API
 * histórica que ya utiliza la IA, pero todas se validan en `applyAction`.
 */
export type QuantumAction =
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

export interface MeasurementTrace {
  events: QMeasurementEvent[]
  rngCounterStart: number
  rngCounterEnd: number
}

export type GameResultCause =
  | 'king-captured'
  | 'checkmate'
  | 'draw'
  | 'no-legal-actions'
  | 'timeout'
  | 'resignation'
  | 'agreement'

export interface GameResult {
  /** `null` representa tablas. */
  winner: PieceColor | null
  cause: GameResultCause
}

export interface QMoveRecord {
  pieceId: string
  pieceType: PieceType
  color: PieceColor
  moveType: QMoveType
  from: string
  to: string
  secondTo?: string
  captured?: { id: string; type: PieceType }
  measurement?: QMeasurementEvent
  /** Secuencia completa; `measurement` se conserva para la UI/API anterior. */
  measurements?: QMeasurementEvent[]
  description: string
}

export interface QuantumUndoEntry {
  state: QState
  lastMove: { from: string; to: string } | null
  moveMode: QMoveMode
  gameOverInfo: GameOverInfo | null
}

export interface QGameOver extends GameResult {
  reason: string
}

export interface ActionResult {
  state: QState
  record: QMoveRecord
  measurementTrace: MeasurementTrace
  gameResult: QGameOver | null
  /** Huella canónica del nuevo estado (FNV-1a de 64 bits). */
  stateHash: string
}

export type QEntanglement =
  | { id: number; type: 'castle'; data: QCastleEntData }
  | { id: number; type: 'tunnel'; data: QTunnelEntData }

export interface QCastleEntData {
  kingId: string
  rookId: string
  castled: { king: string; rook: string }
  original: { king: string; rook: string }
}

export interface QTunnelEntData {
  tunnelerId: string
  tunnelerOriginal: string
  blockerId: string
  blockerSquare: string
}

export interface QState {
  pieces: Record<string, QPiece>
  turn: PieceColor
  castling: { w: { k: boolean; q: boolean }; b: { k: boolean; q: boolean } }
  history: QMoveRecord[]
  moveNumber: number
  entanglements: QEntanglement[]
  nextEntId: number
  /** Número total de valores aleatorios consumidos por esta partida. */
  rngCounter: number
  gameOver: QGameOver | null
}
