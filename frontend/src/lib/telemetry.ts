import { apiFetch } from './api'
import { loadSettings } from './settings'
import type { AttemptEvent, LessonDefinition } from './academyTypes'

const SESSION_KEY = 'gdd-telemetry-session'

function anonymousSessionId(): string | null {
  if (typeof sessionStorage === 'undefined') return null
  const existing = sessionStorage.getItem(SESSION_KEY)
  if (existing) return existing
  const id = typeof crypto !== 'undefined' && typeof crypto.randomUUID === 'function'
    ? crypto.randomUUID()
    : `session-${Date.now()}-${Math.random().toString(36).slice(2)}`
  sessionStorage.setItem(SESSION_KEY, id)
  return id
}

/**
 * Sends the strictly allow-listed learning event only after explicit opt-in.
 * Board states, answers, free text, guest ids, email and action sequences are
 * deliberately impossible to pass through this interface.
 */
export async function trackAcademyAttempt(
  attempt: AttemptEvent,
  lesson: LessonDefinition,
): Promise<void> {
  if (!loadSettings().telemetryConsent) return
  const sessionId = anonymousSessionId()
  if (!sessionId || (typeof navigator !== 'undefined' && !navigator.onLine)) return

  const durationMs = Math.max(
    0,
    new Date(attempt.completedAt).getTime() - new Date(attempt.startedAt).getTime(),
  )
  await apiFetch('/v1/analytics/events', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      id: typeof crypto !== 'undefined' && typeof crypto.randomUUID === 'function'
        ? crypto.randomUUID()
        : `${Date.now()}-${Math.random().toString(36).slice(2)}`,
      consent: true,
      anonymousSessionId: sessionId,
      route: lesson.course,
      lessonId: lesson.id,
      concept: lesson.skillIds[0] ?? lesson.moduleId,
      durationMs,
      score: attempt.score,
      hintLevel: attempt.hintsUsed,
    }),
    signal: AbortSignal.timeout(5000),
  })
}
