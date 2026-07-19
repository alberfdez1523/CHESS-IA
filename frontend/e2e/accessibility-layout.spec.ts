import { expect, test } from '@playwright/test'

const viewports = [
  { width: 320, height: 568 },
  { width: 390, height: 844 },
  { width: 768, height: 1024 },
  { width: 1280, height: 720 },
  { width: 1440, height: 900 },
]

test('home has no horizontal clipping in either theme', async ({ page }) => {
  for (const theme of ['dark', 'light'] as const) {
    await page.addInitScript((nextTheme) => {
      localStorage.setItem('gdd-settings', JSON.stringify({
        theme: nextTheme,
        language: 'es',
        sfxVolume: 0,
        musicVolume: 0,
        showHints: true,
        autoResolveMeasurements: false,
      }))
    }, theme)

    for (const viewport of viewports) {
      await page.setViewportSize(viewport)
      await page.goto('/')
      await expect(page.locator('html')).toHaveAttribute('data-theme', theme)
      const overflow = await page.evaluate(() => document.documentElement.scrollWidth - document.documentElement.clientWidth)
      expect(overflow).toBeLessThanOrEqual(1)
      await expect(page.getByRole('heading', { level: 1 })).toBeVisible()
    }
  }
})

test('language and reduced-motion preferences reach the document', async ({ page }) => {
  await page.emulateMedia({ reducedMotion: 'reduce' })
  await page.addInitScript(() => {
    localStorage.setItem('gdd-settings', JSON.stringify({
      theme: 'light',
      language: 'en',
      sfxVolume: 0,
      musicVolume: 0,
      showHints: true,
      autoResolveMeasurements: true,
    }))
  })
  await page.goto('/')

  await expect(page.locator('html')).toHaveAttribute('lang', 'en')
  await expect(page.locator('html')).toHaveAttribute('data-theme', 'light')
  await expect(page.getByRole('button', { name: 'Settings' })).toBeVisible()
})

test('keyboard quantum selection exposes an announced selected state', async ({ page }) => {
  await page.goto('/')
  await page.getByTestId('start-opponent-local').click()
  await page.getByTestId('start-play').click()

  const pawn = page.locator('[data-square="e2"]')
  await pawn.focus()
  await pawn.press('Enter')

  await expect(pawn).toHaveAttribute('aria-selected', 'true')
  await expect(page.locator('[aria-live="polite"]').filter({ hasText: /seleccionad/i }).first()).toContainText(/rama/i)
})
