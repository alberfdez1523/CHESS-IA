import { describe, expect, it } from 'vitest'
import { Chess } from 'chess.js'
import { classicResultFromFen, initialClassicState, initialQuantumState } from './onlineRoom'
import { hashClassicState, onlineResultToGameOverInfo, quantumStateFingerprint } from './onlineTypes'
import { hashQuantumState } from './quantumEngine'

describe('online state contract', () => {
  it('initializes classic rooms with revision, hash, clocks and result', () => {
    const state = initialClassicState()

    expect(state.revision).toBe(0)
    expect(state.stateHash).toBe(hashClassicState(state.fen, state.pgn))
    expect(state.rngCounter).toBe(0)
    expect(state.clocks).toEqual({ whiteTime: null, blackTime: null, paused: false })
    expect(state.result).toBeNull()
  })

  it('initializes quantum rooms with a canonical hash and reproducible counter', () => {
    const state = initialQuantumState()

    expect(state.revision).toBe(0)
    expect(state.stateHash).toBe(hashQuantumState(state.qstate))
    expect(state.stateHash).toBe(quantumStateFingerprint(state.qstate))
    expect(state.rngCounter).toBe(state.qstate.rngCounter)
    expect(state.result).toBeNull()
  })

  it('derives checkmate and draw results from terminal classic positions', () => {
    const mate = new Chess()
    mate.move('f3')
    mate.move('e5')
    mate.move('g4')
    mate.move('Qh4#')

    expect(classicResultFromFen(mate.fen())).toEqual({ winner: 'b', cause: 'checkmate' })
    expect(classicResultFromFen('7k/5Q2/6K1/8/8/8/8/8 b - - 0 1')).toEqual({ winner: null, cause: 'draw' })
  })

  it('translates a synchronized terminal result from each player perspective', () => {
    expect(onlineResultToGameOverInfo({ winner: 'w', cause: 'timeout' }, 'w', 'es')).toMatchObject({
      result: 'win',
      message: 'Tiempo agotado',
    })
    expect(onlineResultToGameOverInfo({ winner: 'w', cause: 'timeout' }, 'b', 'en')).toMatchObject({
      result: 'lose',
      message: 'Time out',
    })
  })
})
