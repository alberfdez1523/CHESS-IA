import { openDB, type DBSchema, type IDBPDatabase } from 'idb'
import type { FinishedReplay } from './gameReplay'

const DATABASE_NAME = 'gambito-finished-replays'
const DATABASE_VERSION = 1

interface ReplayDatabase extends DBSchema {
  replays: {
    key: string
    value: FinishedReplay
    indexes: { 'by-created-at': string }
  }
  syncQueue: {
    key: string
    value: FinishedReplay
    indexes: { 'by-created-at': string }
  }
}

let databasePromise: Promise<IDBPDatabase<ReplayDatabase> | null> | null = null

function database(): Promise<IDBPDatabase<ReplayDatabase> | null> {
  if (typeof indexedDB === 'undefined') return Promise.resolve(null)
  if (databasePromise) return databasePromise
  databasePromise = openDB<ReplayDatabase>(DATABASE_NAME, DATABASE_VERSION, {
    upgrade(db) {
      const replays = db.createObjectStore('replays', { keyPath: 'id' })
      replays.createIndex('by-created-at', 'createdAt')
      const queue = db.createObjectStore('syncQueue', { keyPath: 'id' })
      queue.createIndex('by-created-at', 'createdAt')
    },
    blocked() { databasePromise = null },
    terminated() { databasePromise = null },
  }).catch(() => null)
  return databasePromise
}

export async function saveFinishedReplay(replay: FinishedReplay): Promise<void> {
  const db = await database()
  if (!db) return
  const transaction = db.transaction(['replays', 'syncQueue'], 'readwrite')
  await Promise.all([
    transaction.objectStore('replays').put(replay),
    transaction.objectStore('syncQueue').put(replay),
    transaction.done,
  ])

  const all = await db.getAllFromIndex('replays', 'by-created-at')
  if (all.length > 50) {
    const stale = all.slice(0, all.length - 50)
    const trim = db.transaction('replays', 'readwrite')
    await Promise.all([...stale.map((item) => trim.store.delete(item.id)), trim.done])
  }

  if (typeof navigator === 'undefined' || navigator.onLine) {
    void import('./replaySync')
      .then(({ syncPendingFinishedReplays }) => syncPendingFinishedReplays())
      .catch(() => {
        // The append-only queue remains intact for the next online/account retry.
      })
  }
}

export async function listFinishedReplays(): Promise<FinishedReplay[]> {
  const db = await database()
  if (!db) return []
  const replays = await db.getAllFromIndex('replays', 'by-created-at')
  return replays.reverse()
}

export async function pendingFinishedReplays(): Promise<FinishedReplay[]> {
  const db = await database()
  return db ? db.getAllFromIndex('syncQueue', 'by-created-at') : []
}

export async function markFinishedReplaysSynced(ids: string[]): Promise<void> {
  const db = await database()
  if (!db || ids.length === 0) return
  const transaction = db.transaction('syncQueue', 'readwrite')
  await Promise.all([...ids.map((id) => transaction.store.delete(id)), transaction.done])
}

export async function clearFinishedReplays(): Promise<void> {
  const db = await database()
  if (!db) return
  const transaction = db.transaction(['replays', 'syncQueue'], 'readwrite')
  await Promise.all([
    transaction.objectStore('replays').clear(),
    transaction.objectStore('syncQueue').clear(),
    transaction.done,
  ])
}
