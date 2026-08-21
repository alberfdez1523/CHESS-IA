import { createClient, type SupabaseClient } from '@supabase/supabase-js'
import type { OnlineRoomRow } from './onlineTypes'
import { getSupabaseEnv, isSupabaseConfigured } from './onlineConfig'

let client: SupabaseClient | null = null

const LINKED_AUTH_STORAGE_KEY = 'gdd-supabase-auth:linked'

function getAuthStorageKey(): string {
  if (typeof window === 'undefined') return 'gdd-supabase-auth'

  if (!window.name.startsWith('gdd-tab-')) {
    const id =
      typeof crypto !== 'undefined' && 'randomUUID' in crypto
        ? crypto.randomUUID()
        : `${Date.now()}-${Math.random().toString(36).slice(2)}`
    window.name = `gdd-tab-${id}`
  }

  return `gdd-supabase-auth:${window.name}`
}

function valueHasLinkedAccount(value: string): boolean {
  try {
    const parsed = JSON.parse(value) as { user?: { is_anonymous?: boolean } }
    return Boolean(parsed.user && parsed.user.is_anonymous !== true)
  } catch {
    return false
  }
}

function getAuthStorage(tabKey: string) {
  if (typeof window === 'undefined') return undefined
  return {
    getItem(key: string) {
      if (key !== tabKey) return window.sessionStorage.getItem(key)
      return window.localStorage.getItem(LINKED_AUTH_STORAGE_KEY)
        ?? window.sessionStorage.getItem(key)
    },
    setItem(key: string, value: string) {
      if (key !== tabKey) {
        window.sessionStorage.setItem(key, value)
        return
      }
      if (valueHasLinkedAccount(value)) {
        window.localStorage.setItem(LINKED_AUTH_STORAGE_KEY, value)
        window.sessionStorage.removeItem(key)
      } else {
        window.sessionStorage.setItem(key, value)
      }
    },
    removeItem(key: string) {
      window.sessionStorage.removeItem(key)
      if (key === tabKey) window.localStorage.removeItem(LINKED_AUTH_STORAGE_KEY)
    },
  }
}

export function getSupabase(): SupabaseClient {
  if (!isSupabaseConfigured()) {
    throw new Error('SUPABASE_NOT_CONFIGURED')
  }
  const { url, anonKey } = getSupabaseEnv()
  if (!client) {
    const storageKey = getAuthStorageKey()
    client = createClient(url, anonKey, {
      auth: {
        persistSession: true,
        autoRefreshToken: true,
        storage: getAuthStorage(storageKey),
        storageKey,
      },
    })
  }
  return client
}

export { isSupabaseConfigured }
export type { OnlineRoomRow }
