/// <reference lib="webworker" />

import { chooseQuantumAIMove, QUANTUM_AI_TIME_BUDGET_MS } from '../lib/quantumAi'
import { createSeededQuantumRng, QuantumChessEngine } from '../lib/quantumEngine'
import type { QuantumRulesConfig } from '../lib/coherence'
import type { Difficulty, QState, QuantumAction } from '../lib/types'

interface SearchRequest {
  id: string
  state: QState
  rules: QuantumRulesConfig
  difficulty: Difficulty
  seed: string
  useStockfish: boolean
}

type WorkerResponse =
  | { id: string; type: 'stage'; stage: 'enumerating' | 'reply-search' | 'engine' | 'complete' }
  | { id: string; type: 'result'; action: QuantumAction | null }
  | { id: string; type: 'error'; message: string }

const workerScope = self as unknown as DedicatedWorkerGlobalScope

workerScope.onmessage = (event: MessageEvent<SearchRequest>) => {
  const request = event.data
  void (async () => {
    try {
      const engine = new QuantumChessEngine(
        createSeededQuantumRng(request.seed, request.state.rngCounter),
        request.rules,
      )
      engine.loadState(request.state)
      const action = await chooseQuantumAIMove(engine, request.difficulty, {
        useStockfish: request.useStockfish,
        seed: request.seed,
        timeBudgetMs: QUANTUM_AI_TIME_BUDGET_MS[request.difficulty],
        onStage: (stage) => workerScope.postMessage({
          id: request.id,
          type: 'stage',
          stage,
        } satisfies WorkerResponse),
      })
      workerScope.postMessage({ id: request.id, type: 'result', action } satisfies WorkerResponse)
    } catch (error) {
      workerScope.postMessage({
        id: request.id,
        type: 'error',
        message: error instanceof Error ? error.message : 'Quantum AI worker failed',
      } satisfies WorkerResponse)
    }
  })()
}

export {}

