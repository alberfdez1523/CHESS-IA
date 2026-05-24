import { expect, test, type Page } from '@playwright/test'

async function mockClassicEngine(page: Page) {
  await page.route('**/api/health', async (route) => {
    await route.fulfill({ json: { status: 'ok', engine: true, engine_path: 'mock-stockfish' } })
  })
  await page.route('**/api/eval', async (route) => {
    await route.fulfill({ json: { evaluation: 20, mate: null } })
  })
  await page.route('**/api/move', async (route) => {
    await route.fulfill({ json: { bestmove: 'e7e5', evaluation: 0, mate: null, ponder: null } })
  })
}

async function openClassicLocal(page: Page) {
  await page.goto('/')
  await page.getByRole('button', { name: '2 jugadores' }).click()
  await page.getByRole('button', { name: 'Iniciar partida' }).click()
  await expect(page.locator('.board-root')).toBeVisible()
}

async function openQuantumLocal(page: Page) {
  await page.goto('/')
  await page.getByRole('button', { name: 'Cuántico' }).click()
  await page.getByRole('button', { name: 'Mismo dispositivo' }).click()
  await expect(page.locator('.board-root')).toBeVisible()
}

async function expectBoardInsideViewport(page: Page) {
  const box = await page.locator('.board-root').boundingBox()
  const viewport = page.viewportSize()
  expect(box).not.toBeNull()
  expect(viewport).not.toBeNull()
  expect(box!.x).toBeGreaterThanOrEqual(0)
  expect(box!.y).toBeGreaterThanOrEqual(0)
  expect(box!.x + box!.width).toBeLessThanOrEqual(viewport!.width)
  expect(box!.y + box!.height).toBeLessThanOrEqual(viewport!.height)
}

test('classic local board is fully visible across key viewports', async ({ page }) => {
  for (const viewport of [
    { width: 390, height: 844 },
    { width: 768, height: 1024 },
    { width: 1280, height: 720 },
    { width: 1440, height: 900 },
  ]) {
    await page.setViewportSize(viewport)
    await openClassicLocal(page)
    await expectBoardInsideViewport(page)
  }
})

test('classic AI flow works with mocked Stockfish', async ({ page }) => {
  await mockClassicEngine(page)
  await page.goto('/')
  await expect(page.getByRole('button', { name: 'Iniciar partida' })).toBeEnabled()
  await page.getByRole('button', { name: 'Iniciar partida' }).click()
  await expect(page.locator('[data-square="e2"] .piece-white')).toBeVisible()
  await page.locator('[data-square="e2"]').click()
  await expect(page.locator('[data-square="e4"] .legal-dot')).toBeVisible()
  await page.locator('[data-square="e4"]').click()
  await expect(page.locator('[data-square="e4"] .piece-white')).toBeVisible()
  await expect(page.locator('[data-square="e5"] .piece-black')).toBeVisible()
})

test('quantum local board is fully visible and supports local undo', async ({ page }) => {
  for (const viewport of [
    { width: 390, height: 844 },
    { width: 1280, height: 720 },
  ]) {
    await page.setViewportSize(viewport)
    await openQuantumLocal(page)
    await expectBoardInsideViewport(page)
    const controls = page.locator('.game-quantum-controls')
    await expect(controls).toBeVisible()
    const controlsBox = await controls.boundingBox()
    expect(controlsBox).not.toBeNull()
    expect(controlsBox!.y + controlsBox!.height).toBeLessThanOrEqual(viewport.height)
  }

  await page.setViewportSize({ width: 1440, height: 900 })
  await page.getByTestId('quantum-mode-quantum').click()
  await page.locator('[data-square="b1"]').click()
  await page.locator('[data-square="a3"]').click()
  await page.locator('[data-square="c3"]').click()
  await expect(page.locator('[data-square="a3"] .quantum-prob-badge')).toBeVisible()

  await page.getByRole('button', { name: 'Deshacer' }).click()
  await expect(page.locator('[data-square="b1"] .chess-piece')).toBeVisible()
})

test('rules and settings remain reachable from the menu', async ({ page }) => {
  await page.goto('/')
  await page.getByRole('button', { name: 'Reglas del juego' }).click()
  await expect(page.getByRole('heading', { level: 1, name: 'Reglas del juego' })).toBeVisible()
  await page.getByRole('button', { name: /menú/i }).click()
  await page.getByRole('button', { name: 'Ajustes' }).click()
  await expect(page.getByRole('dialog', { name: 'Ajustes' })).toBeVisible()
})
