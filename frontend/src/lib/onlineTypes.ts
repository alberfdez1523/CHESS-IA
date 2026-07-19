import type { GameConfig, GameMode, GameOverInfo, GameResult, Language, PieceColor, QMeasurementEvent, QState } from './types'
import { hashQuantumState } from './quantumEngine'

export interface QPendingMeasurement {
  event: QMeasurementEvent
  /** Jugador que realizó el movimiento con medición (debe cerrar la ruleta en online). */
  initiator: PieceColor
  /** Tablero antes de aplicar el colapso; ambos jugadores lo ven hasta cerrar la ruleta. */
  preMoveState: QState
}

export type RoomStatus = 'waiting' | 'playing' | 'finished'
export type OnlineStatus = 'connecting' | 'waiting' | 'synced' | 'reconnecting' | 'conflict' | 'ended'

export interface OnlineClockState {
  whiteTime: number | null
  blackTime: number | null
  paused: boolean
}

export interface OnlineStateMeta {
  /** Revisión lógica duplicada dentro del payload para detectar filas/estado incoherentes. */
  revision?: number
  stateHash?: string
  rngCounter?: number
  clocks?: OnlineClockState
  result?: GameResult | null
  rematch?: { w: boolean; b: boolean } | null
}

export interface ClassicRoomState {
  type: 'classic'
  fen: string
  lastMove?: { from: string; to: string } | null
  /** PGN completo para reconstruir el historial de jugadas en ambos clientes */
  pgn?: string
  revision?: OnlineStateMeta['revision']
  stateHash?: OnlineStateMeta['stateHash']
  rngCounter?: OnlineStateMeta['rngCounter']
  clocks?: OnlineStateMeta['clocks']
  result?: OnlineStateMeta['result']
  rematch?: OnlineStateMeta['rematch']
}

export interface QuantumRoomState {
  type: 'quantum'
  qstate: QState
  /** Bloquea al rival hasta que el iniciador cierre la ruleta. */
  pendingMeasurement?: QPendingMeasurement | null
  revision?: OnlineStateMeta['revision']
  stateHash?: OnlineStateMeta['stateHash']
  rngCounter?: OnlineStateMeta['rngCounter']
  clocks?: OnlineStateMeta['clocks']
  result?: OnlineStateMeta['result']
  rematch?: OnlineStateMeta['rematch']
}

export type RoomGameState = ClassicRoomState | QuantumRoomState

/** Huella ligera para comparar estado cuántico sin JSON completo (evita falsos desajustes). */
export function quantumStateFingerprint(q: QState): string {
  return hashQuantumState(q)
}

export function hashClassicState(fen: string, pgn = ''): string {
  const source = `${fen.trim()}\n${pgn.trim()}`
  let hash = 0x811c9dc5
  for (let index = 0; index < source.length; index++) {
    hash ^= source.charCodeAt(index)
    hash = Math.imul(hash, 0x01000193)
  }
  return `fnv32:${(hash >>> 0).toString(16).padStart(8, '0')}`
}

export function onlineResultToGameOverInfo(
  result: GameResult,
  playerColor: PieceColor,
  language: Language,
): GameOverInfo {
  const es = language === 'es'
  const isDraw = result.winner === null
  const isWin = result.winner === playerColor
  const cause = {
    'king-captured': es ? 'Captura del rey' : 'King captured',
    checkmate: es ? 'Jaque mate' : 'Checkmate',
    draw: es ? 'Tablas' : 'Draw',
    'no-legal-actions': es ? 'Sin acciones legales' : 'No legal actions',
    timeout: es ? 'Tiempo agotado' : 'Time out',
    resignation: es ? 'Rendición' : 'Resignation',
    agreement: es ? 'Tablas por acuerdo' : 'Draw by agreement',
  }[result.cause]
  return {
    title: isDraw
      ? (es ? 'Tablas' : 'Draw')
      : isWin
        ? (es ? '¡Victoria!' : 'Victory!')
        : (es ? 'Derrota' : 'Defeat'),
    message: cause,
    result: isDraw ? 'draw' : isWin ? 'win' : 'lose',
  }
}

function pendingMeasurementFingerprint(pm: QPendingMeasurement | null | undefined): string {
  if (!pm) return '0'
  const e = pm.event
  return `${pm.initiator}:${e.step}:${e.target}:${e.result}:${Math.round(e.roll * 1000)}`
}

export function quantumRoomFingerprint(room: QuantumRoomState): string {
  return `${quantumStateFingerprint(room.qstate)}|${pendingMeasurementFingerprint(room.pendingMeasurement)}`
}

/** Tras un movimiento local con medición, empaqueta el evento para sincronizar la ruleta. */
export function pendingMeasurementFromLastMove(
  qstate: QState,
  initiatorColor: PieceColor,
  preMoveState: QState,
): QPendingMeasurement | null {
  const last = qstate.history[qstate.history.length - 1]
  if (!last?.measurement) return null
  const initiator = qstate.turn === 'w' ? 'b' : 'w'
  if (initiator !== initiatorColor) return null
  return { event: last.measurement, initiator, preMoveState }
}

export interface OnlineRoomRow {
  id: string
  code: string
  mode: GameMode
  status: RoomStatus
  host_color: PieceColor
  white_player_id: string | null
  black_player_id: string | null
  state: RoomGameState
  version: number
  turn: PieceColor
  config: Partial<GameConfig>
  measurement_seed: string | null
  created_at: string
  updated_at: string
  /** Color asignado por la accion local de crear/unirse; no viene de la BD. */
  client_color?: PieceColor
}
