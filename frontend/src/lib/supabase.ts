import { createClient, type SupabaseClient } from '@supabase/supabase-js'
import type { OnlineRoomRow } from './onlineTypes'

const url = import.meta.env.VITE_SUPABASE_URL as string | undefined
const anonKey = import.meta.env.VITE_SUPABASE_ANON_KEY as string | undefined

export function isSupabaseConfigured(): boolean {
  return Boolean(url && anonKey && url.length > 10 && anonKey.length > 10)
}

let client: SupabaseClient | null = null

function getAuthStorage(): Storage | undefined {
  if (typeof window === 'undefined') return undefined
  return window.sessionStorage
}

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

export function getSupabase(): SupabaseClient {
  if (!isSupabaseConfigured()) {
    throw new Error('SUPABASE_NOT_CONFIGURED')
  }
  if (!client) {
    client = createClient(url!, anonKey!, {
      auth: {
        persistSession: true,
        autoRefreshToken: true,
        storage: getAuthStorage(),
        storageKey: getAuthStorageKey(),
      },
    })
  }
  return client
}

export type { OnlineRoomRow }
