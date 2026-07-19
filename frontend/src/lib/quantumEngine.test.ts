import { describe, expect, it } from 'vitest'
import {
  QuantumActionError,
  QuantumChessEngine,
  applyAction,
  createSeededQuantumRng,
  hashQuantumState,
  validateQuantumState,
} from './quantumEngine'
import type { PieceType, QState, QuantumAction, QuantumRng } from './types'

function clearBoard(engine: QuantumChessEngine): void {
  for (const piece of Object.values(engine.state.pieces)) {
    piece.alive = false
    piece.positions = {}
  }
  engine.state.turn = 'w'
  engine.state.castling = { w: { k: false, q: false }, b: { k: false, q: false } }
  engine.state.history = []
  engine.state.moveNumber = 1
  engine.state.entanglements = []
  engine.state.nextEntId = 1
  engine.state.rngCounter = 0
  engine.state.gameOver = null
}

function place(
  engine: QuantumChessEngine,
  id: string,
  positions: Record<string, number>,
  type?: PieceType,
): void {
  const piece = engine.state.pieces[id]
  if (!piece) throw new Error(`Unknown fixture piece: ${id}`)
  piece.alive = true
  piece.positions = { ...positions }
  if (type) piece.type = type
}

function placeKings(engine: QuantumChessEngine, white = 'a1', black = 'h8'): void {
  place(engine, 'w_k', { [white]: 1 }, 'k')
  place(engine, 'b_k', { [black]: 1 }, 'k')
}

function sparseEngine(): QuantumChessEngine {
  const engine = new QuantumChessEngine()
  clearBoard(engine)
  placeKings(engine)
  return engine
}

function sequenceRng(values: number[]): QuantumRng {
  let index = 0
  return () => {
    if (index >= values.length) throw new Error('Fixture RNG exhausted')
    return values[index++]
  }
}

function expectAtomicRejection(engine: QuantumChessEngine, action: QuantumAction): void {
  const before = engine.exportState()
  expect(() => engine.applyAction(action)).toThrow(QuantumActionError)
  expect(engine.exportState()).toEqual(before)
}

describe('QuantumChessEngine', () => {
  it('starts with a valid classical board', () => {
    const engine = new QuantumChessEngine()
    const board = engine.getBoard()

    expect(board.e2?.some((cell) => cell.type === 'p' && cell.color === 'w')).toBe(true)
    expect(board.e7?.some((cell) => cell.type === 'p' && cell.color === 'b')).toBe(true)
    expect(() => validateQuantumState(engine.state)).not.toThrow()
  })

  it('applies a classical action without mutating the input state', () => {
    const engine = new QuantumChessEngine()
    const initial = engine.exportState()
    const initialHash = hashQuantumState(initial)

    const result = applyAction(initial, {
      kind: 'classical', pieceId: 'w_p_e', from: 'e2', to: 'e4',
    })

    expect(initial.pieces.w_p_e.positions).toEqual({ e2: 1 })
    expect(hashQuantumState(initial)).toBe(initialHash)
    expect(result.state.pieces.w_p_e.positions).toEqual({ e4: 1 })
    expect(result.state.turn).toBe('b')
    expect(result.record).toMatchObject({ pieceId: 'w_p_e', from: 'e2', to: 'e4' })
    expect(result.stateHash).toBe(hashQuantumState(result.state))
    expect(result.measurementTrace.events).toEqual([])
  })

  it('keeps legacy mutation methods compatible through applyAction', () => {
    const engine = new QuantumChessEngine()
    const record = engine.doClassicalMove('w_p_e', 'e2', 'e4')

    expect(record.to).toBe('e4')
    expect(engine.getPiece('w_p_e')?.positions).toEqual({ e4: 1 })
    expect(engine.state.history).toHaveLength(1)
  })

  it('splits a legal branch and conserves total probability', () => {
    const engine = new QuantumChessEngine()
    engine.doQuantumMove('w_n_b', 'b1', 'a3', 'c3')

    const positions = engine.getPiece('w_n_b')?.positions ?? {}
    expect(positions).toEqual({ a3: 0.5, c3: 0.5 })
    expect(Object.values(positions).reduce((sum, probability) => sum + probability, 0)).toBeCloseTo(1, 10)
    expect(engine.isQuantum('w_n_b')).toBe(true)
  })

  it('rejects illegal splits atomically', () => {
    const cases: QuantumAction[] = [
      { kind: 'quantum', pieceId: 'w_n_b', from: 'b1', toA: 'a3', toB: 'a3' },
      { kind: 'quantum', pieceId: 'w_p_e', from: 'e2', toA: 'e3', toB: 'e4' },
      { kind: 'quantum', pieceId: 'b_n_b', from: 'b8', toA: 'a6', toB: 'c6' },
      { kind: 'quantum', pieceId: 'w_n_b', from: 'b1', toA: 'a3', toB: 'b4' },
    ]

    for (const action of cases) expectAtomicRejection(new QuantumChessEngine(), action)

    const captureTarget = new QuantumChessEngine()
    captureTarget.state.pieces.b_p_a.positions = { a3: 1 }
    expectAtomicRejection(captureTarget, {
      kind: 'quantum', pieceId: 'w_n_b', from: 'b1', toA: 'a3', toB: 'c3',
    })
  })

  it('never permits distinct allied pieces on one square', () => {
    const engine = new QuantumChessEngine()
    engine.state.pieces.w_p_a.positions = { a3: 1 }

    expect(engine.getLegalMoves('w_n_b', 'b1').map((move) => move.square)).not.toContain('a3')

    engine.state.pieces.w_n_b.positions = { a3: 1 }
    expect(() => validateQuantumState(engine.state)).toThrow(/coexisten/)
  })

  it('merges every branch at a destination reachable from all of them', () => {
    const engine = sparseEngine()
    place(engine, 'w_n_b', { b3: 0.2, b5: 0.3, c2: 0.5 }, 'n')

    expect(engine.getMergeTargets('w_n_b', 'b3')).toContain('d4')
    engine.doMergeFrom('w_n_b', 'b3', 'd4')

    expect(engine.getPiece('w_n_b')?.positions).toEqual({ d4: 1 })
    expect(engine.state.history[engine.state.history.length - 1]?.moveType).toBe('merge')
  })

  it('rejects an invalid merge without changing insertion-order-sensitive state', () => {
    const engine = sparseEngine()
    place(engine, 'w_n_b', { b3: 0.5, b5: 0.5 }, 'n')

    expectAtomicRejection(engine, {
      kind: 'merge', pieceId: 'w_n_b', from: 'b3', to: 'a1',
    })
  })

  it('uses capture of the king, not check, as the terminal rule', () => {
    const engine = sparseEngine()
    place(engine, 'w_r_h', { e4: 1 }, 'r')
    place(engine, 'b_k', { e8: 1 }, 'k')
    place(engine, 'b_r_a', { a5: 1 }, 'r')

    expect(engine.isSquareAttackedByClassical('e5', 'w')).toBe(true)
    expect(engine.isClassicalKingInCheck('w')).toBe(false)
    expect(engine.getCheckSquareForTurn()).toBeNull()

    engine.doClassicalMove('w_r_h', 'e4', 'e8')

    expect(engine.state.gameOver).toMatchObject({ winner: 'w', cause: 'king-captured' })
    expect(engine.state.turn).toBe('w')
    expectAtomicRejection(engine, {
      kind: 'classical', pieceId: 'w_k', from: 'a1', to: 'a2',
    })
  })

  it('allows a king to enter a classically attacked square', () => {
    const engine = sparseEngine()
    place(engine, 'w_k', { e4: 1 }, 'k')
    place(engine, 'b_r_h', { e8: 1 }, 'r')

    expect(engine.getLegalMoves('w_k', 'e4').map((move) => move.square)).toContain('e5')
    engine.doClassicalMove('w_k', 'e4', 'e5')
    expect(engine.getPiece('w_k')?.positions).toEqual({ e5: 1 })
  })

  it('rejects blocked quantum castling and accepts it once the path is empty', () => {
    const blocked = new QuantumChessEngine()
    expectAtomicRejection(blocked, { kind: 'quantumCastle', color: 'w', side: 'k' })

    const engine = new QuantumChessEngine()
    engine.state.pieces.w_b_f.alive = false
    engine.state.pieces.w_b_f.positions = {}
    engine.state.pieces.w_n_g.alive = false
    engine.state.pieces.w_n_g.positions = {}
    engine.state.pieces.w_p_f.alive = false
    engine.state.pieces.w_p_f.positions = {}

    expectAtomicRejection(engine, {
      kind: 'quantum', pieceId: 'w_k', from: 'e1', toA: 'g1', toB: 'f2',
    })

    const result = engine.applyAction({ kind: 'quantumCastle', color: 'w', side: 'k' })

    expect(result.state.pieces.w_k.positions).toEqual({ e1: 0.5, g1: 0.5 })
    expect(result.state.pieces.w_r_h.positions).toEqual({ h1: 0.5, f1: 0.5 })
    expect(result.state.entanglements).toHaveLength(1)
    expect(result.state.castling.w.k).toBe(false)
  })

  it('collapses the rook to the matching branch when a castled king is captured', () => {
    const engine = sparseEngine()
    place(engine, 'w_k', { e1: 1 }, 'k')
    place(engine, 'w_r_h', { h1: 1 }, 'r')
    place(engine, 'b_k', { a8: 1 }, 'k')
    place(engine, 'b_r_h', { g8: 1 }, 'r')
    engine.state.castling.w.k = true

    engine.doQuantumCastle('w', 'k')
    const result = engine.applyAction(
      { kind: 'classical', pieceId: 'b_r_h', from: 'g8', to: 'g1' },
      sequenceRng([0.1]),
    )

    expect(result.gameResult).toMatchObject({ winner: 'b', cause: 'king-captured' })
    expect(result.state.pieces.w_r_h.positions).toEqual({ f1: 1 })
    expect(result.state.pieces.w_k.alive).toBe(false)
  })

  it('records the complete deterministic trace for a two-step measurement', () => {
    const engine = sparseEngine()
    place(engine, 'w_q', { e4: 0.5, d4: 0.5 }, 'q')
    place(engine, 'b_r_h', { e5: 0.25, h5: 0.75 }, 'r')

    const result = engine.applyAction(
      { kind: 'classical', pieceId: 'w_q', from: 'e4', to: 'e5' },
      sequenceRng([0.2, 0.1]),
    )

    expect(result.measurementTrace.events.map((event) => [event.target, event.result])).toEqual([
      ['attacker', 'alive'],
      ['defender', 'alive'],
    ])
    expect(result.measurementTrace).toMatchObject({ rngCounterStart: 0, rngCounterEnd: 2 })
    expect(result.record.measurement).toEqual(result.measurementTrace.events[1])
    expect(result.state.pieces.b_r_h.alive).toBe(false)
  })

  it('collapses an absent defender without consuming an unnecessary third roll', () => {
    const engine = sparseEngine()
    place(engine, 'w_q', { e4: 0.5, d4: 0.5 }, 'q')
    place(engine, 'b_r_h', { e5: 0.25, h5: 0.75 }, 'r')

    const result = engine.applyAction(
      { kind: 'classical', pieceId: 'w_q', from: 'e4', to: 'e5' },
      sequenceRng([0.2, 0.8]),
    )

    expect(result.measurementTrace.events.map((event) => event.result)).toEqual(['alive', 'dead'])
    expect(result.measurementTrace.rngCounterEnd).toBe(2)
    expect(result.state.pieces.b_r_h.positions).toEqual({ h5: 1 })
    expect(result.state.pieces.w_q.positions).toEqual({ e5: 1 })
  })

  it('stops a measurement sequence when the attacker is absent', () => {
    const engine = sparseEngine()
    place(engine, 'w_q', { e4: 0.25, d4: 0.75 }, 'q')
    place(engine, 'b_r_h', { e5: 0.5, h5: 0.5 }, 'r')

    const result = engine.applyAction(
      { kind: 'classical', pieceId: 'w_q', from: 'e4', to: 'e5' },
      sequenceRng([0.9]),
    )

    expect(result.measurementTrace.events).toHaveLength(1)
    expect(result.measurementTrace.events[0]).toMatchObject({
      target: 'attacker', result: 'dead', step: 1, totalSteps: 1,
    })
    expect(result.measurementTrace.rngCounterEnd).toBe(1)
    expect(result.state.pieces.w_q.positions).toEqual({ d4: 1 })
    expect(result.state.pieces.b_r_h.positions).toEqual({ e5: 0.5, h5: 0.5 })
  })

  it('restores state and RNG counter when an injected RNG is invalid', () => {
    const engine = sparseEngine()
    place(engine, 'w_q', { e4: 0.5, d4: 0.5 }, 'q')
    place(engine, 'b_r_h', { e5: 1 }, 'r')
    const before = engine.exportState()

    expect(() => engine.applyAction(
      { kind: 'classical', pieceId: 'w_q', from: 'e4', to: 'e5' },
      () => 1,
    )).toThrow(/RNG/)
    expect(engine.exportState()).toEqual(before)
  })

  it('replays the same measurement with the same seed and counter', () => {
    const engine = sparseEngine()
    place(engine, 'w_q', { e4: 0.5, d4: 0.5 }, 'q')
    place(engine, 'b_r_h', { e5: 0.5, h5: 0.5 }, 'r')
    const state = engine.exportState()
    const action: QuantumAction = { kind: 'classical', pieceId: 'w_q', from: 'e4', to: 'e5' }

    const first = applyAction(state, action, createSeededQuantumRng('room-seed', state.rngCounter))
    const second = applyAction(state, action, createSeededQuantumRng('room-seed', state.rngCounter))

    expect(second.measurementTrace).toEqual(first.measurementTrace)
    expect(second.state).toEqual(first.state)
    expect(second.stateHash).toBe(first.stateHash)
  })

  it('produces a canonical hash independent of record key order and UI descriptions', () => {
    const engine = new QuantumChessEngine()
    engine.doClassicalMove('w_p_e', 'e2', 'e4')
    const state = engine.exportState()
    const reordered = structuredClone(state)
    reordered.pieces = Object.fromEntries(Object.entries(reordered.pieces).reverse())
    reordered.history[0].description = 'White pawn to e4'

    expect(hashQuantumState(reordered)).toBe(hashQuantumState(state))

    reordered.pieces.w_p_e.positions = { e3: 1 }
    expect(hashQuantumState(reordered)).not.toBe(hashQuantumState(state))
  })

  it('normalizes legacy snapshots that have no RNG counter', () => {
    const state = new QuantumChessEngine().exportState() as unknown as
      Omit<QState, 'rngCounter'> & { rngCounter?: number }
    delete state.rngCounter
    const engine = new QuantumChessEngine()

    engine.loadState(state as QState)

    expect(engine.state.rngCounter).toBe(0)
    expect(hashQuantumState(engine.exportState())).toHaveLength(16)
  })

  it('rejects malformed probabilities and dead pieces with positions', () => {
    const probability = new QuantumChessEngine().exportState()
    probability.pieces.w_n_b.positions = { a3: 0.4, c3: 0.4 }
    expect(() => validateQuantumState(probability)).toThrow(/no suma 1/)

    const deadPosition = new QuantumChessEngine().exportState()
    deadPosition.pieces.w_n_b.alive = false
    expect(() => validateQuantumState(deadPosition)).toThrow(/capturada conserva posiciones/)
  })

  it('requires a valid promotion exactly on the last rank', () => {
    const engine = sparseEngine()
    place(engine, 'w_p_e', { e7: 1 }, 'p')

    expectAtomicRejection(engine, {
      kind: 'classical', pieceId: 'w_p_e', from: 'e7', to: 'e8',
    })
    expectAtomicRejection(engine, {
      kind: 'classical', pieceId: 'w_p_e', from: 'e7', to: 'e8', promotion: 'k',
    })

    engine.doClassicalMove('w_p_e', 'e7', 'e8', 'q')
    expect(engine.getPiece('w_p_e')?.type).toBe('q')
  })

  it('does not promote a pawn when a measured diagonal capture leaves it at origin', () => {
    const engine = sparseEngine()
    place(engine, 'w_p_e', { e7: 1 }, 'p')
    place(engine, 'b_r_a', { d8: 0.25, d6: 0.75 }, 'r')

    const result = engine.applyAction(
      { kind: 'classical', pieceId: 'w_p_e', from: 'e7', to: 'd8', promotion: 'q' },
      sequenceRng([0.9]),
    )

    expect(result.state.pieces.w_p_e.positions).toEqual({ e7: 1 })
    expect(result.state.pieces.w_p_e.type).toBe('p')
    expect(result.state.pieces.b_r_a.positions).toEqual({ d6: 1 })
  })

  it('creates tunnel entanglement while preserving occupancy invariants', () => {
    const engine = sparseEngine()
    place(engine, 'w_k', { h1: 1 }, 'k')
    place(engine, 'w_r_a', { a1: 1 }, 'r')
    place(engine, 'w_n_b', { c1: 0.5, h3: 0.5 }, 'n')

    engine.doClassicalMove('w_r_a', 'a1', 'e1')

    expect(engine.state.entanglements.some((entanglement) => entanglement.type === 'tunnel')).toBe(true)
    expect(engine.getPiece('w_r_a')?.positions).toEqual({ e1: 1 })
    expect(() => validateQuantumState(engine.state)).not.toThrow()
  })

  it('declares a draw after handing the turn to a side with no legal action', () => {
    const engine = new QuantumChessEngine()
    clearBoard(engine)
    place(engine, 'w_k', { h1: 1 }, 'k')
    place(engine, 'w_r_h', { h2: 1 }, 'r')
    place(engine, 'b_k', { a8: 1 }, 'k')

    const blockers = Object.keys(engine.state.pieces).filter((id) => id.startsWith('b_') && id !== 'b_k')
    const squares = [
      'a1', 'a2', 'a3', 'a4', 'a5', 'a6', 'a7',
      'b1', 'b2', 'b3', 'b4', 'b5', 'b6', 'b7', 'b8',
    ]
    blockers.forEach((id, index) => place(engine, id, { [squares[index]]: 1 }, 'p'))

    const result = engine.applyAction({
      kind: 'classical', pieceId: 'w_r_h', from: 'h2', to: 'h3',
    })

    expect(result.gameResult).toMatchObject({ winner: null, cause: 'no-legal-actions' })
    expect(result.state.turn).toBe('b')
    expect(result.state.gameOver?.reason).toMatch(/Tablas/)
  })
})
