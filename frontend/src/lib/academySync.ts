import { apiFetch, parseAPIError } from './api'
import { getPendingAttempts, markAttemptsSynced } from './academyStore'
import type { AcademyProgress, SkillMastery } from './academyTypes'
import { isSupabaseConfigured } from './onlineConfig'

export type AcademySyncState = 'idle' | 'syncing' | 'synced' | 'offline' | 'error'

interface ProgressSyncResponse {
  acceptedEventIds: string[]
  duplicateEventIds: string[]
  mastery: Record<string, SkillMastery>
  serverTime: string
}

async function getIdentityHeaders(progress: AcademyProgress): Promise<{
  headers: Record<string, string>
  linked: boolean
}> {
  if (isSupabaseConfigured()) {
    try {
      const { getSupabase } = await import('./supabase')
      const { data } = await getSupabase().auth.getSession()
      const session = data.session
      if (session && !session.user.is_anonymous) {
        return {
          headers: { Authorization: `Bearer ${session.access_token}` },
          linked: true,
        }
      }
    } catch {
      // Account configuration must never block local guest progress.
    }
  }

  return {
    headers: { 'X-Guest-Id': progress.guestId },
    linked: false,
  }
}

/**
 * Flushes append-only events and returns server-recalculated mastery. A failed
 * request leaves every event in IndexedDB so a later online retry is lossless.
 */
export async function syncAcademyProgress(
  progress: AcademyProgress,
): Promise<AcademyProgress | null> {
  if (typeof navigator !== 'undefined' && !navigator.onLine) return null

  const identity = await getIdentityHeaders(progress)
  const pending = await getPendingAttempts()
  // Linking an account migrates the compact local history as well as the current
  // queue, so events already synced as a guest are not lost or overwritten.
  const events = identity.linked
    ? Array.from(new Map([...progress.attempts, ...pending].map((event) => [event.id, event])).values())
    : pending

  if (events.length === 0 && !identity.linked) return progress

  const response = await apiFetch('/v1/progress/sync', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      ...identity.headers,
    },
    body: JSON.stringify({
      course: progress.selectedCourse,
      events,
      ...(identity.linked ? { sourceGuestId: progress.guestId } : {}),
    }),
    signal: AbortSignal.timeout(8000),
  })
  if (!response.ok) throw new Error(await parseAPIError(response))

  const result = await response.json() as ProgressSyncResponse
  await markAttemptsSynced([...result.acceptedEventIds, ...result.duplicateEventIds])
  return {
    ...progress,
    mastery: { ...progress.mastery, ...result.mastery },
    updatedAt: result.serverTime,
  }
}

