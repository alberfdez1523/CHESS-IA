import { describe, expect, it } from 'vitest'
import { calculateCoherenceUsage } from './coherence'
import { QuantumActionError, QuantumChessEngine } from './quantumEngine'

describe('quantum coherence ruleset', () => {
  it('keeps quantum-standard state transitions unchanged', () => {
    const legacy = new QuantumChessEngine()
    const explicit = new QuantumChessEngine(Math.random, { rulesetId: 'quantum-standard' })
    const action = { kind: 'quantum', pieceId: 'w_n_b', from: 'b1', toA: 'a3', toB: 'c3' } as const

    legacy.applyAction(action)
    explicit.applyAction(action)

    expect(explicit.exportState()).toEqual(legacy.exportState())
  })

  it('derives usage from additional branches and active tunnels', () => {
    const engine = new QuantumChessEngine()
    engine.state.pieces.w_n_b.positions = { a3: 0.5, c3: 0.5 }
    engine.state.entanglements.push({
      id: engine.state.nextEntId++,
      type: 'tunnel',
      data: {
        tunnelerId: 'w_r_a',
        tunnelerOriginal: 'a1',
        blockerId: 'b_n_b',
        blockerSquare: 'b3',
      },
    })

    expect(calculateCoherenceUsage(engine.state, 'w')).toBe(2)
    expect(calculateCoherenceUsage(engine.state, 'b')).toBe(0)
  })

  it('rejects an extra branch atomically at the configured limit', () => {
    const engine = new QuantumChessEngine(Math.random, {
      rulesetId: 'quantum-coherence',
      maxCoherence: 2,
    })
    engine.doQuantumMove('w_n_b', 'b1', 'a3', 'c3')
    engine.state.turn = 'w'
    engine.doQuantumMove('w_n_g', 'g1', 'f3', 'h3')
    engine.state.turn = 'w'
    const before = engine.exportState()

    expect(() => engine.doQuantumMove('w_n_b', 'a3', 'b5', 'c4')).toThrow(QuantumActionError)
    expect(engine.exportState()).toEqual(before)
    expect(engine.getCoherence('w')).toEqual({ used: 2, available: 0, limit: 2 })
  })

  it('releases capacity immediately after a merge', () => {
    const engine = new QuantumChessEngine(Math.random, {
      rulesetId: 'quantum-coherence',
      maxCoherence: 2,
    })
    engine.doQuantumMove('w_n_b', 'b1', 'a3', 'c3')
    engine.state.turn = 'w'
    engine.doQuantumMove('w_n_g', 'g1', 'f3', 'h3')
    engine.state.turn = 'w'

    engine.doMergeFrom('w_n_b', 'a3', 'b5')

    expect(engine.getCoherence('w')).toEqual({ used: 1, available: 1, limit: 2 })
    engine.state.turn = 'w'
    const targets = engine.getQuantumSplitTargets('w_n_b', 'b5')
    expect(targets.length).toBeGreaterThanOrEqual(2)
    expect(() => engine.doQuantumMove('w_n_b', 'b5', targets[0], targets[1])).not.toThrow()
  })

  it('requires two free units for quantum castling', () => {
    const engine = new QuantumChessEngine(Math.random, {
      rulesetId: 'quantum-coherence',
      maxCoherence: 4,
    })
    engine.state.pieces.w_b_f.alive = false
    engine.state.pieces.w_b_f.positions = {}
    engine.state.pieces.w_n_g.alive = false
    engine.state.pieces.w_n_g.positions = {}
    engine.state.pieces.w_p_f.alive = false
    engine.state.pieces.w_p_f.positions = {}
    engine.state.pieces.w_n_b.positions = { a3: 0.25, c3: 0.25, b5: 0.25, d4: 0.25 }

    expect(engine.getCoherence('w').available).toBe(1)
    expect(engine.canQuantumCastle('w')).toEqual([])
    expect(() => engine.doQuantumCastle('w', 'k')).toThrow()
  })
})

