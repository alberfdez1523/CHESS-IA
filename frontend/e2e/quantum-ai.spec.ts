import { expect, test, type Page } from '@playwright/test'

async function mockQuantumEngine(page: Page) {
  await page.route('**/api/health', async (route) => {
    await route.fulfill({ json: { status: 'ok', engine: true, engine_path: 'mock-stockfish' } })
  })
  await page.route('**/api/quantum/eval', async (route) => {
    await route.fulfill({ json: { evaluation: 35, mate: null, universeCount: 4 } })
  })
  await page.route('**/api/quantum/eval-batch', async (route) => {
    const body = route.request().postDataJSON() as { quantum_states?: unknown[] }
    const count = body.quantum_states?.length ?? 1
    await route.fulfill({
      json: {
        results: Array.from({ length: count }, () => ({
          evaluation: 35,
          mate: null,
          universeCount: 4,
        })),
      },
    })
  })
}

async function startQuantumVsAI(page: Page, color: 'Blancas' | 'Negras' = 'Blancas') {
  await page.goto('/')
  await page.getByTestId('start-mode-quantum').click()
  await page.getByTestId('start-opponent-ai').click()
  await page.getByRole('button', { name: 'Personalizar' }).click()
  await page.getByRole('radio', { name: color }).click()
  await page.getByTestId('start-play').click()
  await expect(page.locator('.board-root')).toBeVisible()
}

test('quantum vs AI starts and AI responds after human move', async ({ page }) => {
  await mockQuantumEngine(page)
  await startQuantumVsAI(page)

  await page.locator('[data-square="e2"]').click()
  await page.locator('[data-square="e4"]').click()

  await expect.poll(async () => {
    const historyItems = page.getByTestId('move-history-item')
    return historyItems.count()
  }, { timeout: 15000 }).toBeGreaterThan(1)
})

test('quantum vs AI with black: AI moves first', async ({ page }) => {
  await mockQuantumEngine(page)
  await startQuantumVsAI(page, 'Negras')

  await expect.poll(async () => {
    const historyItems = page.getByTestId('move-history-item')
    return historyItems.count()
  }, { timeout: 15000 }).toBeGreaterThan(0)
})

test('quantum AI difficulty selector is available', async ({ page }) => {
  await mockQuantumEngine(page)
  await page.goto('/')
  await page.getByTestId('start-mode-quantum').click()
  await page.getByTestId('start-opponent-ai').click()
  await page.getByRole('button', { name: 'Personalizar' }).click()
  await expect(page.getByText('Dificultad')).toBeVisible()
  await page.getByTestId('start-difficulty-hard').click()
  await page.getByTestId('start-play').click()
  await expect(page.locator('.board-root')).toBeVisible()
})
