const supabaseUrl = import.meta.env.VITE_SUPABASE_URL as string | undefined
const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY as string | undefined

export function isSupabaseConfigured(): boolean {
  return Boolean(
    supabaseUrl &&
      supabaseAnonKey &&
      supabaseUrl.length > 10 &&
      supabaseAnonKey.length > 10,
  )
}

export function getSupabaseEnv(): { url: string; anonKey: string } {
  if (!isSupabaseConfigured()) {
    throw new Error('SUPABASE_NOT_CONFIGURED')
  }
  return { url: supabaseUrl!, anonKey: supabaseAnonKey! }
}

export function getInviteUrl(code: string): string {
  const base = typeof window !== 'undefined' ? window.location.origin + window.location.pathname : ''
  return `${base}?room=${encodeURIComponent(code)}`
}

export function parseRoomCodeFromUrl(): string | null {
  if (typeof window === 'undefined') return null
  const params = new URLSearchParams(window.location.search)
  const room = params.get('room')
  return room ? room.trim().toUpperCase() : null
}
