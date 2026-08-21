import { expect, test } from '@playwright/test'

test('production PWA restores Academy and local fonts offline without caching API data', async ({ page, context }) => {
  await page.goto('/learn')
  await expect(page.getByTestId('academy-module').first()).toBeVisible()

  await page.evaluate(async () => {
    await navigator.serviceWorker.ready
  })
  await page.reload()
  await expect(page.getByTestId('academy-module').first()).toBeVisible()
  await expect.poll(() => page.evaluate(() => Boolean(navigator.serviceWorker.controller))).toBe(true)

  await context.setOffline(true)
  await page.reload({ waitUntil: 'domcontentloaded' })
  await expect(page.getByTestId('academy-module').first()).toBeVisible()

  const cachedFontStatus = await page.evaluate(async () => {
    const response = await fetch('/fonts/Geist-Variable.woff2')
    return response.status
  })
  expect(cachedFontStatus).toBe(200)
  await expect.poll(() => page.evaluate(() => document.fonts.check('16px "Geist Sans"'))).toBe(true)

  const privateApiWasCached = await page.evaluate(async () => {
    try {
      await fetch('/api/v1/profile/export')
      return true
    } catch {
      return false
    }
  })
  expect(privateApiWasCached).toBe(false)
})

test('settings and a local game autosave are mirrored to IndexedDB', async ({ page }) => {
  await page.goto('/')
  await page.getByTestId('start-opponent-local').click()
  await page.getByTestId('start-play').click()
  await page.locator('[data-square="e2"]').click()
  await page.locator('[data-square="e4"]').click()

  await expect.poll(() => page.evaluate(async () => {
    const database = await new Promise<IDBDatabase>((resolve, reject) => {
      const request = indexedDB.open('gambito-academy', 2)
      request.onsuccess = () => resolve(request.result)
      request.onerror = () => reject(request.error)
    })
    const transaction = database.transaction(['settings', 'localGames'], 'readonly')
    const read = (storeName: 'settings' | 'localGames', key: string) => new Promise<unknown>((resolve, reject) => {
      const request = transaction.objectStore(storeName).get(key)
      request.onsuccess = () => resolve(request.result)
      request.onerror = () => reject(request.error)
    })
    const [settings, autosave] = await Promise.all([
      read('settings', 'app'),
      read('localGames', 'autosave'),
    ])
    database.close()
    return {
      hasSettings: Boolean(settings),
      autosaveType: (autosave as { type?: string } | undefined)?.type,
    }
  })).toEqual({ hasSettings: true, autosaveType: 'quantum' })
})
