import { describe, expect, it } from 'vitest'
import { Chess } from 'chess.js'
import {
  createClassicFinishedReplay,
  createQuantumFinishedReplay,
  describeQuantumAction,
  neutralQuantumStepFromRecord,
  reconstructQuantumReplay,
} from './gameReplay'
import { QuantumChessEngine } from './quantumEngine'
import type { GameConfig, MoveInfo } from './types'

const config: GameConfig = {
  playerColor: 'w',
  difficulty: 'medium',
  opponentMode: 'local',
  useTimer: false,
  timerMinutes: 10,
  gameMode: 'classic',
  rulesetId: 'classic',
}

describe('language-neutral finished replays', () => {
  it('stores classic coordinates and result without translated descriptions', () => {
    const move: MoveInfo = {
      color: 'w',
      from: 'e2',
      to: 'e4',
      piece: 'p',
      san: 'e4',
      flags: 'b',
      description: 'El peón avanza dos casillas',
    }
    const replay = createClassicFinishedReplay(
      [move],
      config,
      { result: 'win', title: 'Victoria', message: 'Has ganado' },
    )
    const serialized = JSON.stringify(replay)

    expect(serialized).not.toContain('El peón')
    expect(serialized).not.toContain('Victoria')
    expect(serialized).not.toContain('Has ganado')
    expect(replay.result).toEqual({ outcome: 'win' })

    const chess = new Chess()
    if (replay.rulesetId !== 'classic') throw new Error('Expected classic replay')
    for (const action of replay.actions) {
      chess.move({ from: action.from, to: action.to, promotion: action.promotion ?? 'q' })
    }
    expect(chess.fen().split(' ')[0]).toContain('4P3')
  })

  it('reconstructs a quantum replay from neutral actions with the same final hash', () => {
    const engine = new QuantumChessEngine()
    const initial = engine.exportState()
    const action = {
      kind: 'classical' as const,
      pieceId: 'w_p_e',
      from: 'e2',
      to: 'e4',
    }
    const result = engine.applyAction(action)
    const step = neutralQuantumStepFromRecord(result.record)
    const replay = createQuantumFinishedReplay(
      initial,
      result.state,
      [{ ...step, action }],
      { ...config, gameMode: 'quantum', rulesetId: 'quantum-standard' },
      null,
    )
    const serialized = JSON.stringify(replay)
    expect(serialized).not.toContain(result.record.description)
    expect(describeQuantumAction(action, 'es')).not.toBe(describeQuantumAction(action, 'en'))

    if (replay.rulesetId === 'classic') throw new Error('Expected quantum replay')
    const reconstructed = reconstructQuantumReplay(replay)
    expect(reconstructed.pieces.w_p_e.positions).toEqual(result.state.pieces.w_p_e.positions)
  })
})
