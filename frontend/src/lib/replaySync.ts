import { apiFetch, parseAPIError } from './api'
import { isSupabaseConfigured } from './onlineConfig'
import { markFinishedReplaysSynced, pendingFinishedReplays } from './replayStore'

export type ReplaySyncResult = 'synced' | 'nothing-pending' | 'guest' | 'offline'

/** Syncs only finished, neutral action streams and only for a linked account. */
export async function syncPendingFinishedReplays(): Promise<ReplaySyncResult> {
  if (typeof navigator !== 'undefined' && !navigator.onLine) return 'offline'
  if (!isSupabaseConfigured()) return 'guest'

  const { getSupabase } = await import('./supabase')
  const { data } = await getSupabase().auth.getSession()
  const session = data.session
  if (!session || session.user.is_anonymous) return 'guest'

  const replays = await pendingFinishedReplays()
  if (replays.length === 0) return 'nothing-pending'

  const response = await apiFetch('/v1/replays/sync', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${session.access_token}`,
    },
    body: JSON.stringify({ replays }),
    signal: AbortSignal.timeout(10_000),
  })
  if (!response.ok) throw new Error(await parseAPIError(response))
  const result = await response.json() as {
    acceptedReplayIds: string[]
    duplicateReplayIds: string[]
  }
  await markFinishedReplaysSynced([
    ...result.acceptedReplayIds,
    ...result.duplicateReplayIds,
  ])
  return 'synced'
}
