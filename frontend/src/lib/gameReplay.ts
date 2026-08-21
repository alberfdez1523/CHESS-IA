import type {
  GameConfig,
  GameOverInfo,
  MoveInfo,
  QMeasurementEvent,
  QMoveRecord,
  QState,
  QuantumAction,
  RulesetId,
  CoherenceLimit,
} from './types'
import { hashQuantumState, QuantumChessEngine } from './quantumEngine'

export const FINISHED_REPLAY_SCHEMA_VERSION = 1 as const

export interface NeutralClassicReplayAction {
  kind: 'classic'
  from: string
  to: string
  promotion?: string
  san?: string
}

export interface NeutralQuantumReplayStep {
  action: QuantumAction
  measurements: QMeasurementEvent[]
}

export interface NeutralReplayResult {
  outcome: GameOverInfo['result']
}

export type FinishedReplay =
  | {
      schemaVersion: typeof FINISHED_REPLAY_SCHEMA_VERSION
      id: string
      createdAt: string
      rulesetId: 'classic'
      opponentMode: GameConfig['opponentMode']
      result: NeutralReplayResult | null
      actions: NeutralClassicReplayAction[]
    }
  | {
      schemaVersion: typeof FINISHED_REPLAY_SCHEMA_VERSION
      id: string
      createdAt: string
      rulesetId: Exclude<RulesetId, 'classic'>
      opponentMode: GameConfig['opponentMode']
      result: NeutralReplayResult | null
      initialState: QState
      actions: NeutralQuantumReplayStep[]
      finalHash: string
      options: { maxCoherence?: CoherenceLimit }
    }

function replayId(): string {
  return typeof crypto !== 'undefined' && typeof crypto.randomUUID === 'function'
    ? crypto.randomUUID()
    : `replay-${Date.now()}-${Math.random().toString(36).slice(2)}`
}

function clone<T>(value: T): T {
  return typeof structuredClone === 'function'
    ? structuredClone(value)
    : JSON.parse(JSON.stringify(value)) as T
}

export function neutralClassicActions(history: MoveInfo[]): NeutralClassicReplayAction[] {
  return history.map((move) => ({
    kind: 'classic',
    from: move.from,
    to: move.to,
    ...(move.promotion ? { promotion: move.promotion } : {}),
    ...(move.san ? { san: move.san } : {}),
  }))
}

/** Converts legacy records without retaining their localized description. */
export function neutralQuantumStepFromRecord(record: QMoveRecord): NeutralQuantumReplayStep {
  let action: QuantumAction
  if (record.moveType === 'quantum' && record.secondTo) {
    action = {
      kind: 'quantum',
      pieceId: record.pieceId,
      from: record.from,
      toA: record.to,
      toB: record.secondTo,
    }
  } else if (record.moveType === 'merge') {
    action = { kind: 'merge', pieceId: record.pieceId, from: record.from, to: record.to }
  } else if (record.moveType === 'quantumCastle') {
    action = {
      kind: 'quantumCastle',
      color: record.color,
      side: record.to.startsWith('g') ? 'k' : 'q',
    }
  } else {
    const promoted = (record.from.endsWith('7') && record.to.endsWith('8'))
      || (record.from.endsWith('2') && record.to.endsWith('1'))
    action = {
      kind: 'classical',
      pieceId: record.pieceId,
      from: record.from,
      to: record.to,
      ...(promoted && ['q', 'r', 'b', 'n'].includes(record.pieceType)
        ? { promotion: record.pieceType as 'q' | 'r' | 'b' | 'n' }
        : {}),
    }
  }
  return {
    action,
    measurements: clone(record.measurements ?? (record.measurement ? [record.measurement] : [])),
  }
}

export function quantumReplayStep(
  action: QuantumAction,
  record: QMoveRecord,
): NeutralQuantumReplayStep {
  return {
    action: clone(action),
    measurements: clone(record.measurements ?? (record.measurement ? [record.measurement] : [])),
  }
}

export function createClassicFinishedReplay(
  history: MoveInfo[],
  config: GameConfig,
  result: GameOverInfo | null,
): FinishedReplay {
  return {
    schemaVersion: FINISHED_REPLAY_SCHEMA_VERSION,
    id: replayId(),
    createdAt: new Date().toISOString(),
    rulesetId: 'classic',
    opponentMode: config.opponentMode,
    result: result ? { outcome: result.result } : null,
    actions: neutralClassicActions(history),
  }
}

export function createQuantumFinishedReplay(
  initialState: QState,
  finalState: QState,
  actions: NeutralQuantumReplayStep[],
  config: GameConfig,
  result: GameOverInfo | null,
): FinishedReplay {
  const cleanInitial = clone(initialState)
  cleanInitial.history = []
  return {
    schemaVersion: FINISHED_REPLAY_SCHEMA_VERSION,
    id: replayId(),
    createdAt: new Date().toISOString(),
    rulesetId: config.rulesetId === 'quantum-coherence' ? 'quantum-coherence' : 'quantum-standard',
    opponentMode: config.opponentMode,
    result: result ? { outcome: result.result } : null,
    initialState: cleanInitial,
    actions: clone(actions),
    finalHash: hashQuantumState(finalState),
    options: config.options?.maxCoherence
      ? { maxCoherence: config.options.maxCoherence }
      : {},
  }
}

/** Replays recorded measurement rolls so post-game branches are reproducible. */
export function reconstructQuantumReplay(replay: Extract<FinishedReplay, { rulesetId: Exclude<RulesetId, 'classic'> }>): QState {
  const engine = new QuantumChessEngine(Math.random, {
    rulesetId: replay.rulesetId,
    maxCoherence: replay.options.maxCoherence,
  })
  engine.loadState(clone(replay.initialState))
  for (const step of replay.actions) {
    let cursor = 0
    const recordedRng = () => step.measurements[cursor++]?.roll ?? 0.5
    engine.applyAction(step.action, recordedRng)
  }
  return engine.exportState()
}

export function describeQuantumAction(action: QuantumAction, language: 'es' | 'en'): string {
  const es = language === 'es'
  switch (action.kind) {
    case 'classical':
      return `${es ? 'Movimiento' : 'Move'} ${action.from} → ${action.to}${action.promotion ? ` = ${action.promotion.toUpperCase()}` : ''}`
    case 'quantum':
      return `Split ${action.from} → ${action.toA} | ${action.toB}`
    case 'merge':
      return `${es ? 'Fusión' : 'Merge'} ${action.from} → ${action.to}`
    case 'quantumCastle':
      return `${es ? 'Enroque cuántico' : 'Quantum castle'} ${action.side === 'k' ? (es ? 'corto' : 'kingside') : (es ? 'largo' : 'queenside')}`
  }
}
