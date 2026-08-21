import { useEffect, useMemo, useState } from 'react'
import { Link } from 'react-router-dom'
import type {
  CoachFeedback,
  CoherenceLimit,
  Language,
  MoveInfo,
  QState,
  QuantumAction,
  RulesetId,
} from '../lib/types'
import type { ClassicCoachFeedback } from '../lib/coach'
import { requestClassicCoachFeedback, requestQuantumCoachFeedback } from '../lib/coach'
import { actionKey, rankQuantumActions } from '../lib/quantumAi'
import { QuantumChessEngine, hashQuantumState } from '../lib/quantumEngine'
import { describeQuantumAction, type NeutralQuantumReplayStep } from '../lib/gameReplay'

type AnalysisProps = {
  language: Language
  index: number
} & (
  | {
      variant: 'classic'
      previousFen?: string
      action?: MoveInfo
    }
  | {
      variant: 'quantum'
      previousState?: QState
      action?: NeutralQuantumReplayStep
      rulesetId: Exclude<RulesetId, 'classic'>
      maxCoherence?: CoherenceLimit
    }
)

const CLASSIFICATIONS: CoachFeedback['classification'][] = [
  'best', 'excellent', 'good', 'inaccuracy', 'mistake', 'blunder',
]

function classificationLabel(
  classification: CoachFeedback['classification'],
  language: Language,
): string {
  const labels: Record<CoachFeedback['classification'], { es: string; en: string }> = {
    best: { es: 'Mejor jugada', en: 'Best move' },
    excellent: { es: 'Excelente', en: 'Excellent' },
    good: { es: 'Buena', en: 'Good' },
    inaccuracy: { es: 'Imprecisión', en: 'Inaccuracy' },
    mistake: { es: 'Error', en: 'Mistake' },
    blunder: { es: 'Error grave', en: 'Blunder' },
  }
  return labels[classification][language]
}

function classificationTone(classification: CoachFeedback['classification']): string {
  if (classification === 'best' || classification === 'excellent') return 'text-success border-success/40 bg-success/10'
  if (classification === 'good') return 'text-classic border-classic/40 bg-classic/10'
  if (classification === 'inaccuracy') return 'text-warning border-warning/40 bg-warning/10'
  return 'text-danger border-danger/40 bg-danger/10'
}

function classicActionUci(action: MoveInfo): string {
  return `${action.from}${action.to}${action.promotion ?? ''}`
}

function quantumAnalysis(
  state: QState,
  actual: NeutralQuantumReplayStep,
  rulesetId: Exclude<RulesetId, 'classic'>,
  maxCoherence?: CoherenceLimit,
): CoachFeedback<QuantumAction> {
  const engine = new QuantumChessEngine(Math.random, { rulesetId, maxCoherence })
  engine.loadState(state)
  const ranked = rankQuantumActions(engine, 256)
  const actualIndex = ranked.findIndex((candidate) => actionKey(candidate.action) === actionKey(actual.action))
  const classification = actualIndex <= 0
    ? 'best'
    : actualIndex === 1
      ? 'excellent'
      : actualIndex === 2
        ? 'good'
        : actualIndex <= 5
          ? 'inaccuracy'
          : actualIndex <= 12
            ? 'mistake'
            : 'blunder'

  const top = ranked.slice(0, 3)
  const maxScore = top[0]?.score ?? 0
  const weights = top.map((candidate) => Math.exp((candidate.score - maxScore) / 120))
  const total = weights.reduce((sum, value) => sum + value, 0) || 1
  const concepts = [
    actual.action.kind === 'quantum' ? 'quantum.split' : `quantum.${actual.action.kind}`,
    'quantum.expected-material',
    ...(rulesetId === 'quantum-coherence' ? ['quantum.coherence'] : []),
  ]

  return {
    classification,
    concepts,
    candidates: top.map((candidate, candidateIndex) => ({
      action: candidate.action,
      score: Math.round(candidate.score),
      probability: weights[candidateIndex] / total,
    })),
    probabilities: weights.map((value) => value / total),
    explanationKey: `coach.quantum.${classification}`,
  }
}

export default function ReplayAnalysisCard(props: AnalysisProps) {
  const { language, index, variant } = props
  const es = language === 'es'
  const previousFen = variant === 'classic' ? props.previousFen : undefined
  const classicAction = variant === 'classic' ? props.action : undefined
  const previousQuantumState = variant === 'quantum' ? props.previousState : undefined
  const quantumAction = variant === 'quantum' ? props.action : undefined
  const quantumRuleset = variant === 'quantum' ? props.rulesetId : 'quantum-standard'
  const maxCoherence = variant === 'quantum' ? props.maxCoherence : undefined
  const [classicFeedback, setClassicFeedback] = useState<ClassicCoachFeedback | null>(null)
  const [classicError, setClassicError] = useState<string | null>(null)
  const [loading, setLoading] = useState(false)

  const localQuantumFeedback = useMemo(() => {
    if (variant !== 'quantum' || !previousQuantumState || !quantumAction || index === 0) return null
    try {
      return quantumAnalysis(
        previousQuantumState,
        quantumAction,
        quantumRuleset,
        maxCoherence,
      )
    } catch {
      return null
    }
  }, [index, maxCoherence, previousQuantumState, quantumAction, quantumRuleset, variant])

  useEffect(() => {
    setClassicFeedback(null)
    setClassicError(null)
    if (variant !== 'classic' || !previousFen || !classicAction || index === 0) return undefined

    const controller = new AbortController()
    setLoading(true)
    void requestClassicCoachFeedback(
      previousFen,
      classicActionUci(classicAction),
      controller.signal,
    )
      .then(setClassicFeedback)
      .catch((error: unknown) => {
        if (!controller.signal.aborted) {
          setClassicError(error instanceof Error ? error.message : String(error))
        }
      })
      .finally(() => {
        if (!controller.signal.aborted) setLoading(false)
      })
    return () => controller.abort()
  }, [classicAction, index, previousFen, variant])

  useEffect(() => {
    if (variant !== 'quantum' || !localQuantumFeedback || !previousQuantumState || index === 0) return undefined
    const controller = new AbortController()
    const seed = `${hashQuantumState(previousQuantumState)}:review:${index}`
    void requestQuantumCoachFeedback(
      quantumRuleset,
      localQuantumFeedback.candidates.map((candidate) => ({
        action: candidate.action,
        evaluation: candidate.score,
        probability: candidate.probability,
      })),
      seed,
      controller.signal,
    ).catch(() => {
      // The deterministic local review remains fully available offline.
    })
    return () => controller.abort()
  }, [index, localQuantumFeedback, previousQuantumState, quantumRuleset, variant])

  if (index === 0) {
    return (
      <section className="mt-5 border border-line bg-surface-1 p-3">
        <p className="text-xs font-semibold text-ink">{es ? 'Análisis del tutor' : 'Coach analysis'}</p>
        <p className="mt-2 text-xs leading-5 text-ink-secondary">
          {es ? 'Avanza una jugada para comparar la decisión con alternativas reproducibles.' : 'Advance one move to compare the decision with reproducible alternatives.'}
        </p>
      </section>
    )
  }

  const feedback: CoachFeedback<string | QuantumAction> | null = variant === 'classic'
    ? classicFeedback
    : localQuantumFeedback

  return (
    <section className="mt-5 border border-line bg-surface-1 p-3" aria-live="polite">
      <div className="flex items-start justify-between gap-3">
        <div>
          <p className="text-xs font-semibold text-ink">{es ? 'Análisis del tutor' : 'Coach analysis'}</p>
          <p className="mt-1 text-[11px] text-ink-muted">
            {variant === 'classic' ? 'Stockfish MultiPV' : (es ? 'Motor cuántico determinista' : 'Deterministic quantum engine')}
          </p>
        </div>
        {feedback && (
          <span className={`border px-2 py-1 text-[10px] font-semibold ${classificationTone(feedback.classification)}`}>
            {classificationLabel(feedback.classification, language)}
          </span>
        )}
      </div>

      {loading && <p className="mt-3 text-xs text-ink-secondary">{es ? 'Calculando alternativas…' : 'Calculating alternatives…'}</p>}
      {classicError && (
        <p className="mt-3 text-xs leading-5 text-warning">
          {es ? 'El motor no está disponible ahora. La repetición y el laboratorio siguen funcionando sin conexión.' : 'The engine is unavailable right now. Replay and lab still work offline.'}
        </p>
      )}

      {feedback && (
        <>
          {'centipawnLoss' in feedback && typeof feedback.centipawnLoss === 'number' && (
            <p className="mt-3 font-mono text-xs text-ink-secondary">
              {es ? 'Pérdida' : 'Loss'}: {Math.round(feedback.centipawnLoss)} cp
            </p>
          )}
          <ol className="mt-3 space-y-2">
            {feedback.candidates.slice(0, 3).map((candidate, candidateIndex) => {
              const label = typeof candidate.action === 'string'
                ? candidate.action
                : describeQuantumAction(candidate.action, language)
              return (
                <li key={`${candidateIndex}-${typeof candidate.action === 'string' ? candidate.action : actionKey(candidate.action)}`} className="flex items-center justify-between gap-2 text-[11px]">
                  <span className="truncate text-ink-secondary">{candidateIndex + 1}. {label}</span>
                  <span className="shrink-0 font-mono text-ink">
                    {candidate.probability !== undefined
                      ? `${Math.round(candidate.probability * 100)}%`
                      : `${candidate.score > 0 ? '+' : ''}${Math.round(candidate.score)}`}
                  </span>
                </li>
              )
            })}
          </ol>
          <Link
            to="/learn"
            className="mt-4 inline-flex min-h-11 items-center border border-quantum px-3 text-xs font-semibold text-quantum hover:bg-quantum/10"
          >
            {es ? 'Abrir repaso recomendado' : 'Open recommended review'}
          </Link>
        </>
      )}
    </section>
  )
}

export { CLASSIFICATIONS, classificationLabel, quantumAnalysis }
