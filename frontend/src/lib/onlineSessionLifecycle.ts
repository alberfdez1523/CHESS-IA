import { abandonOnlineRoom } from './onlineRoom'
import { getSupabase, isSupabaseConfigured } from './supabase'

const STORAGE_KEY = 'gdd-active-room'

let activeRoomId: string | null = null
let unloadInstalled = false
let abandoning = false

function readStoredRoomId(): string | null {
  if (typeof window === 'undefined') return null
  try {
    return sessionStorage.getItem(STORAGE_KEY)
  } catch {
    return null
  }
}

function writeStoredRoomId(roomId: string | null): void {
  if (typeof window === 'undefined') return
  try {
    if (roomId) sessionStorage.setItem(STORAGE_KEY, roomId)
    else sessionStorage.removeItem(STORAGE_KEY)
  } catch {
    /* sessionStorage no disponible */
  }
}

export function getActiveOnlineRoomId(): string | null {
  return activeRoomId ?? readStoredRoomId()
}

export function registerOnlineSession(roomId: string | null): void {
  activeRoomId = roomId
  writeStoredRoomId(roomId)
}

export function clearOnlineSession(): void {
  activeRoomId = null
  writeStoredRoomId(null)
}

async function abandonViaKeepaliveRpc(roomId: string): Promise<void> {
  if (!isSupabaseConfigured()) return

  const supabase = getSupabase()
  const { data: sessionData } = await supabase.auth.getSession()
  const token = sessionData.session?.access_token
  if (!token) return

  const url = import.meta.env.VITE_SUPABASE_URL as string
  const anonKey = import.meta.env.VITE_SUPABASE_ANON_KEY as string

  await fetch(`${url}/rest/v1/rpc/abandon_room`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      apikey: anonKey,
      Authorization: `Bearer ${token}`,
      Prefer: 'return=minimal',
    },
    body: JSON.stringify({ p_room_id: roomId }),
    keepalive: true,
  }).catch(() => {
    /* best-effort en pagehide */
  })
}

/** Abandona la sala activa; usa keepalive si el documento se descarga. */
export async function abandonSessionBestEffort(roomId?: string | null): Promise<void> {
  const id = roomId ?? getActiveOnlineRoomId()
  if (!id || abandoning) return

  abandoning = true
  try {
    const unloading = typeof document !== 'undefined' && document.visibilityState === 'hidden'

    if (unloading) {
      void abandonViaKeepaliveRpc(id)
      return
    }

    await abandonOnlineRoom(id)
  } catch (e) {
    console.warn('[online] abandonSessionBestEffort failed:', e)
    const id2 = roomId ?? getActiveOnlineRoomId()
    if (id2) void abandonViaKeepaliveRpc(id2)
  } finally {
    clearOnlineSession()
    abandoning = false
  }
}

export function installOnlineUnloadHandlers(): void {
  if (typeof window === 'undefined' || unloadInstalled) return
  unloadInstalled = true

  const onPageHide = () => {
    const id = getActiveOnlineRoomId()
    if (!id || abandoning) return
    abandoning = true
    void abandonViaKeepaliveRpc(id)
    clearOnlineSession()
    abandoning = false
  }

  window.addEventListener('pagehide', onPageHide)
}
