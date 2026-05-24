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
  await page.getByRole('button', { name: 'Cuántico' }).click()
  await page.getByRole('button', { name: 'Vs IA' }).click()
  await page.getByRole('button', { name: color }).click()
  await page.getByRole('button', { name: /Cuántico vs IA/i }).click()
  await expect(page.locator('.board-root')).toBeVisible()
}

test('quantum vs AI starts and AI responds after human move', async ({ page }) => {
  await mockQuantumEngine(page)
  await startQuantumVsAI(page)

  await page.locator('[data-square="e2"]').click()
  await page.locator('[data-square="e4"]').click()

  await expect.poll(async () => {
    const historyItems = page.locator('.move-history-item, [class*="history"] li')
    return historyItems.count()
  }, { timeout: 15000 }).toBeGreaterThan(1)
})

test('quantum vs AI with black: AI moves first', async ({ page }) => {
  await mockQuantumEngine(page)
  await startQuantumVsAI(page, 'Negras')

  await expect.poll(async () => {
    const historyItems = page.locator('.move-history-item, [class*="history"] li')
    return historyItems.count()
  }, { timeout: 15000 }).toBeGreaterThan(0)
})

test('quantum AI difficulty selector is available', async ({ page }) => {
  await mockQuantumEngine(page)
  await page.goto('/')
  await page.getByRole('button', { name: 'Cuántico' }).click()
  await page.getByRole('button', { name: 'Vs IA' }).click()
  await expect(page.getByText(/heurística local/i)).toBeVisible()
  await page.getByRole('button', { name: 'Difícil' }).click()
  await page.getByRole('button', { name: /Cuántico vs IA/i }).click()
  await expect(page.locator('.board-root')).toBeVisible()
})
