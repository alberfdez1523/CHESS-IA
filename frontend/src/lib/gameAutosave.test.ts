import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import type { MoveInfo, QState } from './types'
import {
  GAME_AUTOSAVE_STORAGE_KEY,
  GAME_AUTOSAVE_TTL_MS,
  GAME_AUTOSAVE_VERSION,
  clear,
  getSummary,
  has,
  load,
  save,
  type AutosaveGameConfig,
  type ClassicAutosaveSnapshot,
  type GameAutosaveSnapshot,
  type QuantumAutosaveSnapshot,
} from './gameAutosave'

const NOW = 1_800_000_000_000
const INITIAL_FEN = 'rnbqkbnr/pppppppp/8/8/8/8/PPPPPPPP/RNBQKBNR w KQkq - 0 1'

class MemoryStorage {
  private readonly values = new Map<string, string>()

  getItem(key: string): string | null {
    return this.values.get(key) ?? null
  }

  setItem(key: string, value: string): void {
    this.values.set(key, value)
  }

  removeItem(key: string): void {
    this.values.delete(key)
  }
}

function classicConfig(): AutosaveGameConfig<'classic'> {
  return {
    gameMode: 'classic',
    opponentMode: 'ai',
    playerColor: 'w',
    difficulty: 'medium',
    useTimer: true,
    timerMinutes: 10,
  }
}

function moveHistory(): MoveInfo[] {
  return [{
    color: 'w',
    from: 'e2',
    to: 'e4',
    piece: 'p',
    san: 'e4',
    flags: 'b',
    description: 'Peon a e4',
  }]
}

function classicSnapshot(): ClassicAutosaveSnapshot {
  return {
    type: 'classic',
    config: classicConfig(),
    fen: 'rnbqkbnr/pppppppp/8/8/4P3/8/PPPP1PPP/RNBQKBNR b KQkq e3 0 1',
    pgn: '[Result "*"]\n\n1. e4 *',
    history: moveHistory(),
    lastMove: { from: 'e2', to: 'e4' },
    clocks: { whiteTime: 595, blackTime: 600 },
  }
}

function quantumState(): QState {
  return {
    pieces: {
      w_k: { id: 'w_k', type: 'k', color: 'w', positions: { e1: 1 }, alive: true },
      b_k: { id: 'b_k', type: 'k', color: 'b', positions: { e8: 1 }, alive: true },
    },
    turn: 'w',
    castling: { w: { k: true, q: true }, b: { k: true, q: true } },
    history: [],
    moveNumber: 1,
    entanglements: [],
    nextEntId: 1,
    rngCounter: 0,
    gameOver: null,
  }
}

function quantumSnapshot(): QuantumAutosaveSnapshot {
  return {
    type: 'quantum',
    config: {
      gameMode: 'quantum',
      opponentMode: 'local',
      playerColor: 'w',
      difficulty: 'medium',
      useTimer: false,
      timerMinutes: 10,
    },
    qstate: quantumState(),
    lastMove: null,
    clocks: { whiteTime: 600, blackTime: 600 },
  }
}

describe('gameAutosave', () => {
  let storage: MemoryStorage

  beforeEach(() => {
    storage = new MemoryStorage()
    vi.stubGlobal('localStorage', storage)
    vi.spyOn(Date, 'now').mockReturnValue(NOW)
  })

  afterEach(() => {
    vi.restoreAllMocks()
    vi.unstubAllGlobals()
  })

  it('round-trips a versioned classic AI snapshot', () => {
    const snapshot = classicSnapshot()

    expect(save(snapshot)).toBe(true)
    expect(load()).toEqual({
      ...snapshot,
      version: GAME_AUTOSAVE_VERSION,
      savedAt: NOW,
      expiresAt: NOW + GAME_AUTOSAVE_TTL_MS,
    })
    expect(JSON.parse(storage.getItem(GAME_AUTOSAVE_STORAGE_KEY) ?? '{}')).toMatchObject({
      type: 'classic',
      version: 1,
      savedAt: NOW,
    })
  })

  it('round-trips a quantum local snapshot without invoking the engine', () => {
    const snapshot = quantumSnapshot()

    expect(save(snapshot)).toBe(true)
    expect(load()).toEqual({
      ...snapshot,
      version: GAME_AUTOSAVE_VERSION,
      savedAt: NOW,
      expiresAt: NOW + GAME_AUTOSAVE_TTL_MS,
    })
  })

  it('rejects online games and does not persist their room metadata', () => {
    const onlineSnapshot = {
      ...classicSnapshot(),
      config: {
        ...classicConfig(),
        opponentMode: 'online',
        online: {
          roomId: 'secret-room-id',
          code: 'ABC123',
          myColor: 'w',
          isHost: true,
          userId: 'user-id',
        },
      },
    } as unknown as GameAutosaveSnapshot

    expect(save(onlineSnapshot)).toBe(false)
    expect(storage.getItem(GAME_AUTOSAVE_STORAGE_KEY)).toBeNull()
  })

  it('removes malformed, unsupported and invalid stored payloads', () => {
    storage.setItem(GAME_AUTOSAVE_STORAGE_KEY, '{not-json')
    expect(load()).toBeNull()
    expect(storage.getItem(GAME_AUTOSAVE_STORAGE_KEY)).toBeNull()

    storage.setItem(GAME_AUTOSAVE_STORAGE_KEY, JSON.stringify({
      ...classicSnapshot(),
      version: GAME_AUTOSAVE_VERSION + 1,
      savedAt: NOW,
      expiresAt: NOW + GAME_AUTOSAVE_TTL_MS,
    }))
    expect(load()).toBeNull()
    expect(storage.getItem(GAME_AUTOSAVE_STORAGE_KEY)).toBeNull()

    expect(save(quantumSnapshot())).toBe(true)
    const invalidQuantum = JSON.parse(storage.getItem(GAME_AUTOSAVE_STORAGE_KEY) ?? '{}')
    invalidQuantum.qstate.turn = 'invalid'
    storage.setItem(GAME_AUTOSAVE_STORAGE_KEY, JSON.stringify(invalidQuantum))
    expect(load()).toBeNull()
    expect(storage.getItem(GAME_AUTOSAVE_STORAGE_KEY)).toBeNull()
  })

  it('expires and clears a snapshot after the fixed TTL', () => {
    expect(save(classicSnapshot())).toBe(true)
    vi.mocked(Date.now).mockReturnValue(NOW + GAME_AUTOSAVE_TTL_MS)

    expect(load()).toBeNull()
    expect(has()).toBe(false)
    expect(storage.getItem(GAME_AUTOSAVE_STORAGE_KEY)).toBeNull()
  })

  it('provides a presentation-neutral summary for the continue action', () => {
    expect(has()).toBe(false)
    expect(getSummary()).toBeNull()
    expect(save(classicSnapshot())).toBe(true)

    expect(has()).toBe(true)
    expect(getSummary()).toEqual({
      type: 'classic',
      opponentMode: 'ai',
      playerColor: 'w',
      difficulty: 'medium',
      turn: 'b',
      moveCount: 1,
      savedAt: NOW,
      expiresAt: NOW + GAME_AUTOSAVE_TTL_MS,
      timerEnabled: true,
      timerMinutes: 10,
      clocks: { whiteTime: 595, blackTime: 600 },
    })
  })

  it('falls back to the FEN ply count when classic history is omitted', () => {
    const snapshot: ClassicAutosaveSnapshot = {
      ...classicSnapshot(),
      fen: 'rnbqkbnr/pppp1ppp/8/4p3/4P3/8/PPPP1PPP/RNBQKBNR w KQkq - 0 2',
      pgn: undefined,
      history: undefined,
    }
    expect(save(snapshot)).toBe(true)

    expect(getSummary()?.moveCount).toBe(2)
  })

  it('handles missing or failing localStorage and non-serializable data', () => {
    vi.stubGlobal('localStorage', undefined)
    expect(save(classicSnapshot())).toBe(false)
    expect(load()).toBeNull()
    expect(clear()).toBe(false)
    expect(has()).toBe(false)
    expect(getSummary()).toBeNull()

    vi.stubGlobal('localStorage', storage)
    const cyclic = classicSnapshot() as ClassicAutosaveSnapshot & { self?: unknown }
    cyclic.self = cyclic
    expect(save(cyclic)).toBe(false)

    vi.stubGlobal('localStorage', {
      getItem: () => { throw new Error('blocked') },
      setItem: () => { throw new Error('blocked') },
      removeItem: () => { throw new Error('blocked') },
    })
    expect(save(classicSnapshot())).toBe(false)
    expect(load()).toBeNull()
    expect(clear()).toBe(false)
  })

  it('clears a valid snapshot explicitly', () => {
    expect(save({
      ...classicSnapshot(),
      fen: INITIAL_FEN,
      pgn: '',
      history: [],
      lastMove: null,
    })).toBe(true)
    expect(clear()).toBe(true)
    expect(load()).toBeNull()
  })
})
