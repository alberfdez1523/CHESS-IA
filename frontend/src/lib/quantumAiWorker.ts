import type { QuantumRulesConfig } from './coherence'
import { QUANTUM_AI_TIME_BUDGET_MS, chooseQuantumAIMove } from './quantumAi'
import { createSeededQuantumRng, QuantumChessEngine } from './quantumEngine'
import type { Difficulty, QState, QuantumAction } from './types'

interface WorkerSearchOptions {
  signal?: AbortSignal
  useStockfish?: boolean
  onStage?: (stage: 'enumerating' | 'reply-search' | 'engine' | 'complete') => void
}

function requestId(): string {
  return typeof crypto !== 'undefined' && typeof crypto.randomUUID === 'function'
    ? crypto.randomUUID()
    : `qai-${Date.now()}-${Math.random().toString(36).slice(2)}`
}

/** Runs one bounded search in an isolated worker and terminates it on cancel/timeout. */
export async function chooseQuantumAIMoveInWorker(
  state: QState,
  rules: QuantumRulesConfig,
  difficulty: Difficulty,
  seed: string,
  options: WorkerSearchOptions = {},
): Promise<QuantumAction | null> {
  if (typeof Worker === 'undefined') {
    const engine = new QuantumChessEngine(createSeededQuantumRng(seed, state.rngCounter), rules)
    engine.loadState(state)
    return chooseQuantumAIMove(engine, difficulty, {
      ...options,
      seed,
      timeBudgetMs: QUANTUM_AI_TIME_BUDGET_MS[difficulty],
    })
  }

  const id = requestId()
  const worker = new Worker(new URL('../workers/quantumAi.worker.ts', import.meta.url), { type: 'module' })
  return new Promise<QuantumAction | null>((resolve, reject) => {
    let settled = false
    const cleanup = () => {
      worker.terminate()
      options.signal?.removeEventListener('abort', abort)
      window.clearTimeout(timeout)
    }
    const finish = (action: QuantumAction | null) => {
      if (settled) return
      settled = true
      cleanup()
      resolve(action)
    }
    const abort = () => {
      if (settled) return
      settled = true
      cleanup()
      reject(new DOMException('Quantum AI cancelled', 'AbortError'))
    }
    const timeout = window.setTimeout(
      () => finish(null),
      QUANTUM_AI_TIME_BUDGET_MS[difficulty] + 350,
    )

    options.signal?.addEventListener('abort', abort, { once: true })
    if (options.signal?.aborted) {
      abort()
      return
    }
    worker.onerror = () => finish(null)
    worker.onmessage = (event: MessageEvent<{
      id: string
      type: 'stage' | 'result' | 'error'
      stage?: 'enumerating' | 'reply-search' | 'engine' | 'complete'
      action?: QuantumAction | null
      message?: string
    }>) => {
      if (event.data.id !== id) return
      if (event.data.type === 'stage' && event.data.stage) {
        options.onStage?.(event.data.stage)
        return
      }
      if (event.data.type === 'error') {
        finish(null)
        return
      }
      finish(event.data.action ?? null)
    }
    worker.postMessage({
      id,
      state,
      rules,
      difficulty,
      seed,
      useStockfish: options.useStockfish ?? true,
    })
  })
}

