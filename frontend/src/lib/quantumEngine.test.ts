import { describe, it, expect } from 'vitest'
import { QuantumChessEngine } from '../lib/quantumEngine'

describe('QuantumChessEngine', () => {
  it('starts with classical pieces on initial board', () => {
    const engine = new QuantumChessEngine()
    const board = engine.getBoard()
    expect(board['e2']?.some((c) => c.type === 'p' && c.color === 'w')).toBe(true)
    expect(board['e7']?.some((c) => c.type === 'p' && c.color === 'b')).toBe(true)
  })

  it('splits a knight into two squares with quantum move', () => {
    const engine = new QuantumChessEngine()
    engine.state.turn = 'w'
    engine.state.pieces['w_n_b'].positions = { b1: 1 }
    delete engine.state.pieces['w_n_b'].positions.g1

    engine.doQuantumMove('w_n_b', 'b1', 'a3', 'c3')

    const piece = engine.getPiece('w_n_b')
    expect(piece?.positions.a3).toBeCloseTo(0.5, 5)
    expect(piece?.positions.c3).toBeCloseTo(0.5, 5)
    expect(piece?.positions.b1).toBeUndefined()
  })

  it('detects quantum pieces after split', () => {
    const engine = new QuantumChessEngine()
    engine.state.turn = 'w'
    engine.state.pieces['w_n_b'].positions = { b1: 1 }

    engine.doQuantumMove('w_n_b', 'b1', 'a3', 'c3')

    expect(engine.isQuantum('w_n_b')).toBe(true)
    expect(Object.keys(engine.getPiece('w_n_b')?.positions ?? {}).length).toBe(2)
  })

  it('executes classical capture move', () => {
    const engine = new QuantumChessEngine()
    engine.state.turn = 'w'
    engine.state.pieces['w_p_e'].positions = { e4: 1 }
    engine.state.pieces['b_p_d'].positions = { d5: 1 }

    engine.doClassicalMove('w_p_e', 'e4', 'd5')

    expect(engine.getPiece('b_p_d')?.alive).toBe(false)
    expect(engine.getPiece('w_p_e')?.positions.d5).toBe(1)
  })

  it('blocks classical king from moving to square attacked by classical piece', () => {
    const engine = new QuantumChessEngine()
    for (const p of Object.values(engine.state.pieces)) p.alive = false

    engine.state.pieces['w_k'].alive = true
    engine.state.pieces['w_k'].positions = { e4: 1 }
    engine.state.pieces['b_r_h'].alive = true
    engine.state.pieces['b_r_h'].positions = { e8: 1 }
    engine.state.turn = 'w'

    const moves = engine.getLegalMoves('w_k', 'e4').map((m) => m.square)
    expect(moves).not.toContain('e5')
    expect(moves).toContain('d4')
  })

  it('allows classical king to move to square only threatened by quantum piece', () => {
    const engine = new QuantumChessEngine()
    for (const p of Object.values(engine.state.pieces)) p.alive = false

    engine.state.pieces['w_k'].alive = true
    engine.state.pieces['w_k'].positions = { e4: 1 }
    engine.state.pieces['b_n_g'].alive = true
    engine.state.pieces['b_n_g'].positions = { f6: 0.5, h4: 0.5 }
    engine.state.turn = 'w'

    const moves = engine.getLegalMoves('w_k', 'e4').map((m) => m.square)
    expect(moves).toContain('f5')
  })

  it('allows quantum king to move to classically attacked square', () => {
    const engine = new QuantumChessEngine()
    for (const p of Object.values(engine.state.pieces)) p.alive = false

    engine.state.pieces['w_k'].alive = true
    engine.state.pieces['w_k'].positions = { e1: 0.5, e2: 0.5 }
    engine.state.pieces['b_r_h'].alive = true
    engine.state.pieces['b_r_h'].positions = { e8: 1 }
    engine.state.turn = 'w'

    const moves = engine.getLegalMoves('w_k', 'e1').map((m) => m.square)
    expect(moves).toContain('e2')
  })

  it('detects classical king in check', () => {
    const engine = new QuantumChessEngine()
    for (const p of Object.values(engine.state.pieces)) p.alive = false

    engine.state.pieces['w_k'].alive = true
    engine.state.pieces['w_k'].positions = { e1: 1 }
    engine.state.pieces['b_r_h'].alive = true
    engine.state.pieces['b_r_h'].positions = { e8: 1 }
    engine.state.turn = 'w'

    expect(engine.isClassicalKingInCheck('w')).toBe(true)
    expect(engine.getCheckSquareForTurn()).toBe('e1')
  })

  it('ends game on king capture without advancing turn', () => {
    const engine = new QuantumChessEngine()
    for (const p of Object.values(engine.state.pieces)) p.alive = false

    engine.state.pieces['w_r_h'].alive = true
    engine.state.pieces['w_r_h'].positions = { e4: 1 }
    engine.state.pieces['b_k'].alive = true
    engine.state.pieces['b_k'].positions = { e8: 1 }
    engine.state.turn = 'w'

    engine.doClassicalMove('w_r_h', 'e4', 'e8')

    expect(engine.state.gameOver?.winner).toBe('w')
    expect(engine.state.turn).toBe('w')
    expect(engine.getLegalMoves('w_r_h', 'e8')).toEqual([])
  })

  it('rejects moves after game over', () => {
    const engine = new QuantumChessEngine()
    engine.state.gameOver = { winner: 'w', reason: 'Rey negro capturado' }

    expect(engine.getLegalMoves('w_k', 'e1')).toEqual([])
    expect(() => engine.doClassicalMove('w_k', 'e1', 'e2')).toThrow()
  })
})
