import { openDB, type DBSchema, type IDBPDatabase } from 'idb'
import type { AcademyProgress, AttemptEvent } from './academyTypes'
import { createAcademyProgress } from './academyProgress'

const DATABASE_NAME = 'gambito-academy'
const DATABASE_VERSION = 2
const PROGRESS_KEY = 'primary'
const SETTINGS_KEY = 'app'
const LOCAL_GAME_KEY = 'autosave'
const LOCAL_FALLBACK_KEY = 'gdd-academy-progress-v1'

interface AcademyDatabase extends DBSchema {
  progress: {
    key: string
    value: AcademyProgress
  }
  attemptQueue: {
    key: string
    value: AttemptEvent
    indexes: { 'by-completed-at': string }
  }
  content: {
    key: string
    value: { version: string; downloadedAt: string; payload: unknown }
  }
  settings: {
    key: string
    value: unknown
  }
  localGames: {
    key: string
    value: unknown
  }
}

let databasePromise: Promise<IDBPDatabase<AcademyDatabase> | null> | null = null

function hasIndexedDb(): boolean {
  return typeof window !== 'undefined' && 'indexedDB' in window
}

function getDatabase(): Promise<IDBPDatabase<AcademyDatabase> | null> {
  if (!hasIndexedDb()) return Promise.resolve(null)
  if (databasePromise) return databasePromise

  databasePromise = openDB<AcademyDatabase>(DATABASE_NAME, DATABASE_VERSION, {
    upgrade(database) {
      if (!database.objectStoreNames.contains('progress')) {
        database.createObjectStore('progress')
      }
      if (!database.objectStoreNames.contains('attemptQueue')) {
        const queue = database.createObjectStore('attemptQueue', { keyPath: 'id' })
        queue.createIndex('by-completed-at', 'completedAt')
      }
      if (!database.objectStoreNames.contains('content')) {
        database.createObjectStore('content', { keyPath: 'version' })
      }
      if (!database.objectStoreNames.contains('settings')) {
        database.createObjectStore('settings')
      }
      if (!database.objectStoreNames.contains('localGames')) {
        database.createObjectStore('localGames')
      }
    },
    blocked() {
      databasePromise = null
    },
    terminated() {
      databasePromise = null
    },
  }).catch(() => null)

  return databasePromise
}

function isProgress(value: unknown): value is AcademyProgress {
  if (!value || typeof value !== 'object') return false
  const candidate = value as Partial<AcademyProgress>
  return candidate.version === 1
    && typeof candidate.guestId === 'string'
    && Array.isArray(candidate.completedLessonIds)
    && Array.isArray(candidate.attempts)
    && Boolean(candidate.mastery && typeof candidate.mastery === 'object')
}

function readFallback(): AcademyProgress | null {
  if (typeof localStorage === 'undefined') return null
  try {
    const raw = localStorage.getItem(LOCAL_FALLBACK_KEY)
    if (!raw) return null
    const parsed: unknown = JSON.parse(raw)
    return isProgress(parsed) ? parsed : null
  } catch {
    return null
  }
}

function writeFallback(progress: AcademyProgress): void {
  if (typeof localStorage === 'undefined') return
  try {
    localStorage.setItem(LOCAL_FALLBACK_KEY, JSON.stringify(progress))
  } catch {
    // Storage can be denied or full. The in-memory React state remains usable.
  }
}

export async function loadAcademyProgress(): Promise<AcademyProgress> {
  const database = await getDatabase()
  const stored = database ? await database.get('progress', PROGRESS_KEY).catch(() => undefined) : undefined
  const progress = isProgress(stored) ? stored : readFallback()

  if (progress) return progress

  const created = createAcademyProgress()
  await saveAcademyProgress(created)
  return created
}

export async function saveAcademyProgress(progress: AcademyProgress): Promise<void> {
  writeFallback(progress)
  const database = await getDatabase()
  if (!database) return
  await database.put('progress', progress, PROGRESS_KEY).catch(() => undefined)
}

export async function enqueueAttempt(event: AttemptEvent): Promise<void> {
  const database = await getDatabase()
  if (!database) return
  await database.put('attemptQueue', event).catch(() => undefined)
}

export async function getPendingAttempts(): Promise<AttemptEvent[]> {
  const database = await getDatabase()
  if (!database) return []
  return database.getAllFromIndex('attemptQueue', 'by-completed-at').catch(() => [])
}

export async function markAttemptsSynced(eventIds: string[]): Promise<void> {
  if (eventIds.length === 0) return
  const database = await getDatabase()
  if (!database) return

  const transaction = database.transaction('attemptQueue', 'readwrite')
  await Promise.all([
    ...eventIds.map((eventId) => transaction.store.delete(eventId)),
    transaction.done,
  ])
}

export async function cacheAcademyContent(version: string, payload: unknown): Promise<void> {
  const database = await getDatabase()
  if (!database) return
  await database.put('content', {
    version,
    downloadedAt: new Date().toISOString(),
    payload,
  }).catch(() => undefined)
}

export async function saveSettingsSnapshot(settings: unknown): Promise<void> {
  const database = await getDatabase()
  if (!database) return
  await database.put('settings', settings, SETTINGS_KEY).catch(() => undefined)
}

export async function loadSettingsSnapshot(): Promise<unknown | null> {
  const database = await getDatabase()
  if (!database) return null
  return database.get('settings', SETTINGS_KEY).catch(() => null)
}

export async function saveLocalGameAutosave(autosave: unknown): Promise<void> {
  const database = await getDatabase()
  if (!database) return
  await database.put('localGames', autosave, LOCAL_GAME_KEY).catch(() => undefined)
}

export async function loadLocalGameAutosave(): Promise<unknown | null> {
  const database = await getDatabase()
  if (!database) return null
  return database.get('localGames', LOCAL_GAME_KEY).catch(() => null)
}

export async function clearLocalGameAutosave(): Promise<void> {
  const database = await getDatabase()
  if (!database) return
  await database.delete('localGames', LOCAL_GAME_KEY).catch(() => undefined)
}

export async function exportAcademyData(): Promise<string> {
  const progress = await loadAcademyProgress()
  const [pendingAttempts, settings] = await Promise.all([
    getPendingAttempts(),
    loadSettingsSnapshot(),
  ])
  return JSON.stringify({ exportedAt: new Date().toISOString(), progress, pendingAttempts, settings }, null, 2)
}

export async function clearAcademyData(): Promise<AcademyProgress> {
  await loadAcademyProgress()
  const database = await getDatabase()
  if (database) {
    const transaction = database.transaction(['progress', 'attemptQueue'], 'readwrite')
    await Promise.all([
      transaction.objectStore('progress').clear(),
      transaction.objectStore('attemptQueue').clear(),
      transaction.done,
    ])
  }

  if (typeof localStorage !== 'undefined') localStorage.removeItem(LOCAL_FALLBACK_KEY)
  const fresh = createAcademyProgress()
  await saveAcademyProgress(fresh)
  return fresh
}
