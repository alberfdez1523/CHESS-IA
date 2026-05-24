import { describe, it, expect } from 'vitest'
import { QuantumChessEngine } from './quantumEngine'
import {
  generateLegalQActions,
  applyQAIAction,
  isActionStillLegal,
  chooseQuantumAIMove,
  chooseQuantumAIMoveMedium,
} from './quantumAi'

describe('quantumAi', () => {
  it('generates legal actions from initial position', () => {
    const engine = new QuantumChessEngine()
    const actions = generateLegalQActions(engine)
    expect(actions.length).toBeGreaterThan(0)
  })

  it('all generated actions are executable from initial position', () => {
    const engine = new QuantumChessEngine()
    const actions = generateLegalQActions(engine)

    for (const action of actions) {
      const clone = new QuantumChessEngine()
      clone.loadState(engine.exportState())
      expect(() => applyQAIAction(clone, action)).not.toThrow()
    }
  })

  it('does not generate quantum moves for pawns', () => {
    const engine = new QuantumChessEngine()
    const actions = generateLegalQActions(engine)

    for (const action of actions) {
      if (action.kind !== 'quantum') continue
      const piece = engine.getPiece(action.pieceId)
      expect(piece?.type).not.toBe('p')
    }
  })

  it('medium AI returns an action when legal actions exist', async () => {
    const engine = new QuantumChessEngine()
    const action = await chooseQuantumAIMoveMedium(engine, { useStockfish: false })
    expect(action).not.toBeNull()
  })

  it('beginner and master difficulties return legal actions', async () => {
    const engine = new QuantumChessEngine()
    const beginner = await chooseQuantumAIMove(engine, 'beginner', { useStockfish: false })
    const master = await chooseQuantumAIMove(engine, 'master', { useStockfish: false })
    expect(beginner).not.toBeNull()
    expect(master).not.toBeNull()
  })

  it('AI can play multiple turns against itself without throwing', async () => {
    const engine = new QuantumChessEngine()

    for (let i = 0; i < 20; i++) {
      const action = await chooseQuantumAIMoveMedium(engine, { useStockfish: false })
      if (!action) break
      expect(isActionStillLegal(engine, action)).toBe(true)
      applyQAIAction(engine, action)
      if (engine.state.gameOver) break
    }
  })
})
