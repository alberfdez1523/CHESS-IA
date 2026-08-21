import { apiFetch, parseAPIError } from './api'
import type { CoachFeedback, QuantumAction, RulesetId } from './types'

const COACH_GUEST_KEY = 'gdd-coach-guest-id'

function coachGuestId(): string {
  if (typeof localStorage === 'undefined') return 'coach_server_render'
  const stored = localStorage.getItem(COACH_GUEST_KEY)
  if (stored) return stored
  const id = `coach_${typeof crypto !== 'undefined' && typeof crypto.randomUUID === 'function'
    ? crypto.randomUUID()
    : `${Date.now()}_${Math.random().toString(36).slice(2)}`}`
  localStorage.setItem(COACH_GUEST_KEY, id)
  return id
}

export interface ClassicCoachFeedback extends CoachFeedback<string> {
  centipawnLoss?: number
  engine: string
}

export async function requestClassicCoachFeedback(
  fen: string,
  action: string,
  signal?: AbortSignal,
): Promise<ClassicCoachFeedback> {
  const response = await apiFetch('/v1/coach/evaluate', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'X-Guest-Id': coachGuestId(),
    },
    body: JSON.stringify({ rulesetId: 'classic', fen, action, depth: 12 }),
    signal,
  })
  if (!response.ok) throw new Error(await parseAPIError(response))
  return response.json() as Promise<ClassicCoachFeedback>
}

export interface QuantumCoachRequestCandidate {
  action: QuantumAction
  evaluation: number
  probability?: number
}

export async function requestQuantumCoachFeedback(
  rulesetId: Exclude<RulesetId, 'classic'>,
  candidates: QuantumCoachRequestCandidate[],
  seed: string,
  signal?: AbortSignal,
): Promise<CoachFeedback<QuantumAction>> {
  const response = await apiFetch('/v1/coach/evaluate', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'X-Guest-Id': coachGuestId(),
    },
    body: JSON.stringify({ rulesetId, legalActions: candidates, seed }),
    signal,
  })
  if (!response.ok) throw new Error(await parseAPIError(response))
  return response.json() as Promise<CoachFeedback<QuantumAction>>
}

