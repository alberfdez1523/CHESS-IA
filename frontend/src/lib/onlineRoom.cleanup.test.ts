import { beforeEach, describe, expect, it, vi } from 'vitest'

const rpcMock = vi.fn()
const isConfiguredMock = vi.fn(() => true)

vi.mock('./supabase', () => ({
  getSupabase: () => ({
    rpc: rpcMock,
  }),
  ensureOnlineAuth: vi.fn(),
}))

vi.mock('./onlineConfig', () => ({
  isSupabaseConfigured: () => isConfiguredMock(),
  getInviteUrl: (code: string) => `/?room=${code}`,
  parseRoomCodeFromUrl: () => null,
}))

import { cleanupStaleRooms } from './onlineRoom'

describe('cleanupStaleRooms', () => {
  beforeEach(() => {
    rpcMock.mockReset()
    isConfiguredMock.mockReturnValue(true)
  })

  it('returns deleted count when RPC succeeds', async () => {
    rpcMock.mockResolvedValue({ data: 3, error: null })

    const count = await cleanupStaleRooms(15)

    expect(count).toBe(3)
    expect(rpcMock).toHaveBeenCalledWith('cleanup_stale_rooms', {
      p_before: expect.any(String),
    })
    const pBefore = rpcMock.mock.calls[0][1].p_before as string
    const ageMs = Date.now() - new Date(pBefore).getTime()
    expect(ageMs).toBeGreaterThanOrEqual(14 * 60_000)
    expect(ageMs).toBeLessThanOrEqual(16 * 60_000)
  })

  it('returns 0 when Supabase is not configured', async () => {
    isConfiguredMock.mockReturnValue(false)

    const count = await cleanupStaleRooms()

    expect(count).toBe(0)
    expect(rpcMock).not.toHaveBeenCalled()
  })

  it('returns 0 when RPC is missing (PGRST202)', async () => {
    rpcMock.mockResolvedValue({
      data: null,
      error: { code: 'PGRST202', message: 'Could not find the function' },
    })

    const count = await cleanupStaleRooms()

    expect(count).toBe(0)
  })

  it('returns 0 on other RPC errors without throwing', async () => {
    rpcMock.mockResolvedValue({
      data: null,
      error: { code: '42501', message: 'permission denied' },
    })

    const count = await cleanupStaleRooms()

    expect(count).toBe(0)
  })
})
