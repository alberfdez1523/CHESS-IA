import { expect, test, type Page } from '@playwright/test'
import type { QPiece, QState } from '../src/lib/types'

const AUTOSAVE_KEY = 'gdd-game-autosave'

function qPiece(
  id: string,
  type: QPiece['type'],
  color: QPiece['color'],
  positions: Record<string, number>,
): QPiece {
  return { id, type, color, positions, alive: true }
}

function quantumScenario(
  pieces: QState['pieces'],
  castling: QState['castling'] = { w: { k: false, q: false }, b: { k: false, q: false } },
): QState {
  return {
    pieces,
    turn: 'w',
    castling,
    history: [],
    moveNumber: 1,
    entanglements: [],
    nextEntId: 1,
    rngCounter: 0,
    gameOver: null,
  }
}

async function resumeQuantumScenario(page: Page, qstate: QState) {
  await page.goto('/')
  const savedAt = Date.now()
  await page.evaluate(({ key, state, timestamp }) => {
    localStorage.setItem(key, JSON.stringify({
      type: 'quantum',
      config: {
        gameMode: 'quantum',
        opponentMode: 'local',
        playerColor: 'w',
        difficulty: 'medium',
        useTimer: false,
        timerMinutes: 10,
      },
      qstate: state,
      lastMove: null,
      clocks: { whiteTime: 600, blackTime: 600 },
      version: 1,
      savedAt: timestamp,
      expiresAt: timestamp + 30 * 24 * 60 * 60 * 1000,
    }))
  }, { key: AUTOSAVE_KEY, state: qstate, timestamp: savedAt })
  await page.reload()
  await page.getByRole('button', { name: /^Continuar partida/ }).click()
  await expect(page.locator('.board-root')).toBeVisible()
}

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
  await page.getByTestId('start-mode-classic').click()
  await page.getByTestId('start-opponent-local').click()
  await page.getByTestId('start-play').click()
  await expect(page.locator('.board-root')).toBeVisible()
}

async function openQuantumLocal(page: Page) {
  await page.goto('/')
  await page.getByTestId('start-mode-quantum').click()
  await page.getByTestId('start-opponent-local').click()
  await page.getByTestId('start-play').click()
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
    { width: 320, height: 568 },
    { width: 390, height: 844 },
    { width: 768, height: 1024 },
    { width: 844, height: 390 },
    { width: 1280, height: 720 },
    { width: 1440, height: 900 },
  ]) {
    await page.setViewportSize(viewport)
    await openClassicLocal(page)
    await expectBoardInsideViewport(page)
  }

  await page.locator('[data-square="e2"]').click()
  await page.locator('[data-square="e4"]').click()
  await page.getByRole('button', { name: 'Deshacer' }).click()
  await expect(page.locator('[data-square="e2"] .piece-white')).toBeVisible()
})

test('classic AI flow works with mocked Stockfish', async ({ page }) => {
  await mockClassicEngine(page)
  await page.goto('/')
  await page.getByTestId('start-mode-classic').click()
  await expect(page.getByTestId('start-play')).toBeEnabled()
  await page.getByTestId('start-play').click()
  await expect(page.locator('[data-square="e2"] .piece-white')).toBeVisible()
  await page.locator('[data-square="e2"]').click()
  await expect(page.locator('[data-square="e4"] .legal-dot')).toBeVisible()
  await page.locator('[data-square="e4"]').click()
  await expect(page.locator('[data-square="e4"] .piece-white')).toBeVisible()
  await expect(page.locator('[data-square="e5"] .piece-black')).toBeVisible()
  await page.getByRole('button', { name: 'Deshacer' }).click()
  await expect(page.locator('[data-square="e2"] .piece-white')).toBeVisible()
  await expect(page.locator('[data-square="e7"] .piece-black')).toBeVisible()
})

test('quantum local board is fully visible and supports local undo', async ({ page }) => {
  for (const viewport of [
    { width: 320, height: 568 },
    { width: 390, height: 844 },
    { width: 768, height: 1024 },
    { width: 844, height: 390 },
    { width: 1280, height: 720 },
    { width: 1440, height: 900 },
  ]) {
    await page.setViewportSize(viewport)
    await openQuantumLocal(page)
    await expectBoardInsideViewport(page)
    const controls = page.locator('.game-quantum-controls').first()
    if (viewport.width < 1024) {
      await expect(controls).toBeVisible()
      const controlsBox = await controls.boundingBox()
      expect(controlsBox).not.toBeNull()
      expect(controlsBox!.y + controlsBox!.height).toBeLessThanOrEqual(viewport.height)
    } else {
      await expect(controls).toBeHidden()
    }
  }

  await page.setViewportSize({ width: 1440, height: 900 })
  await page.locator('[data-testid="quantum-mode-quantum"]').filter({ visible: true }).click()
  await page.locator('[data-square="b1"]').click()
  await page.locator('[data-square="a3"]').click()
  await page.locator('[data-square="c3"]').click()
  await expect(page.locator('[data-square="a3"] .quantum-prob-badge')).toBeVisible()

  await page.getByRole('button', { name: 'Deshacer' }).click()
  await expect(page.locator('[data-square="b1"] .chess-piece')).toBeVisible()
})

test('first-time quantum game starts in two decisions', async ({ page }) => {
  await page.goto('/')
  await expect(page.getByTestId('start-mode-quantum')).toHaveAttribute('aria-pressed', 'true')
  await page.getByTestId('start-opponent-local').click()
  await page.getByTestId('start-play').click()
  await expect(page.locator('.board-root')).toBeVisible()
})

test('local quantum game can be saved and resumed from the hub', async ({ page }) => {
  await page.goto('/')
  await page.getByTestId('start-opponent-local').click()
  await page.getByTestId('start-play').click()
  await page.locator('[data-square="e2"]').click()
  await page.locator('[data-square="e4"]').click()
  await page.waitForTimeout(350)

  await page.getByRole('button', { name: 'Menú' }).click()
  await page.getByRole('button', { name: /^Continuar partida/ }).click()

  await expect(page.locator('[data-square="e4"] .piece-white')).toBeVisible()
  await expect(page.locator('[data-square="e2"] .piece-white')).toHaveCount(0)
})

test('Academy opens from the menu and exposes the quantum learning route', async ({ page }) => {
  await page.goto('/')
  await page.getByTestId('start-quantum-tutorial').click()
  await expect(page).toHaveURL(/\/learn$/)
  await expect(page.getByRole('heading', { name: /Dos tableros/i })).toBeVisible()
  await page.getByRole('radio', { name: 'Ruta cuántica' }).click()
  await expect(page.locator('[data-lesson-id="quantum-model-lesson"]')).toBeVisible()
})

test('rules and settings remain reachable from the menu', async ({ page }) => {
  await page.goto('/')
  await page.getByTestId('start-rules').click()
  await expect(page.getByRole('heading', { level: 1, name: 'Reglas del juego' })).toBeVisible()
  await page.getByRole('button', { name: /menú/i }).click()
  await page.getByRole('button', { name: 'Ajustes' }).click()
  await expect(page.getByRole('dialog', { name: 'Ajustes' })).toBeVisible()
})

test('finished local game keeps replay, board access, and rematch available', async ({ page }) => {
  await page.setViewportSize({ width: 1280, height: 720 })
  await openClassicLocal(page)

  await page.locator('[data-square="e2"]').click()
  await page.locator('[data-square="e4"]').click()
  await page.locator('[data-square="e7"]').click()
  await page.locator('[data-square="e5"]').click()

  await page.getByRole('button', { name: 'Rendirse' }).click()
  const confirmation = page.getByRole('dialog', { name: '¿Rendirse?' })
  await expect(confirmation).toBeVisible()
  await confirmation.getByRole('button', { name: 'Sí, rendirme' }).click()

  await expect(page.getByText('Partida finalizada')).toBeVisible()
  await page.getByRole('button', { name: 'Repetición' }).click()
  const replay = page.getByRole('dialog', { name: 'Repetición de la partida' })
  await expect(replay).toBeVisible()
  await expect(replay.locator('.board-root')).toBeVisible()
  await replay.getByRole('button', { name: 'Siguiente' }).click()
  await replay.getByRole('button', { name: 'Explorar' }).click()
  await expect(replay.getByText('LABORATORIO', { exact: true })).toBeVisible()
  await replay.getByRole('button', { name: 'Salir' }).click()
  await replay.getByRole('button', { name: 'Cerrar repetición' }).click()

  await page.getByRole('button', { name: 'Ver tablero' }).click()
  await expect(page.getByRole('button', { name: 'Ver resultado de la partida' })).toBeVisible()
  await page.getByRole('button', { name: 'Ver resultado de la partida' }).click()
  await page.getByRole('button', { name: 'Revancha' }).click()

  await expect(page.locator('[data-square="e2"] .piece-white')).toBeVisible()
  await expect(page.locator('[data-square="e7"] .piece-black')).toBeVisible()
  await expect(page.getByText('Partida finalizada')).toHaveCount(0)
})

test('clock timeout resolves into a persistent result instead of blocking play', async ({ page }) => {
  await page.clock.install()
  await page.goto('/')
  await page.getByTestId('start-mode-classic').click()
  await page.getByTestId('start-opponent-local').click()
  await page.getByRole('button', { name: 'Personalizar' }).click()
  await page.getByRole('radio', { name: '3 min' }).click()
  await page.getByTestId('start-play').click()
  await expect(page.locator('.board-root')).toBeVisible()

  await page.clock.runFor(181_000)

  await expect(page.getByText('Partida finalizada')).toBeVisible()
  await expect(page.getByText(/tiempo/i).last()).toBeVisible()
  await expect(page.getByRole('button', { name: 'Volver al inicio' })).toBeEnabled()
})

test('resumed quantum scenarios expose merge, tunnel, castle, promotion, and double measurement', async ({ page }) => {
  test.slow()
  await page.setViewportSize({ width: 1440, height: 900 })
  await page.emulateMedia({ reducedMotion: 'reduce' })
  await page.addInitScript(() => {
    Math.random = () => 0.1
  })

  await resumeQuantumScenario(page, quantumScenario({
    w_k: qPiece('w_k', 'k', 'w', { e1: 1 }),
    b_k: qPiece('b_k', 'k', 'b', { e8: 1 }),
    w_n_b: qPiece('w_n_b', 'n', 'w', { a3: 0.5, c3: 0.5 }),
  }))
  await page.locator('[data-square="a3"]').click()
  await page.locator('[data-testid="quantum-mode-merge"]').filter({ visible: true }).click()
  await page.locator('[data-square="b1"]').click()
  await expect(page.locator('[data-square="b1"] .piece-white')).toBeVisible()
  await expect(page.locator('[data-square="a3"] .piece-white')).toHaveCount(0)
  await expect(page.locator('[data-square="c3"] .piece-white')).toHaveCount(0)

  await resumeQuantumScenario(page, quantumScenario({
    w_k: qPiece('w_k', 'k', 'w', { e1: 1 }),
    w_r_h: qPiece('w_r_h', 'r', 'w', { h1: 1 }),
    b_k: qPiece('b_k', 'k', 'b', { e8: 1 }),
  }, { w: { k: true, q: false }, b: { k: false, q: false } }))
  await page.getByRole('button', { name: 'Enroque corto cuántico' }).click()
  await expect(page.locator('[data-square="g1"] .quantum-prob-badge')).toHaveText('50%')
  await expect(page.locator('[data-square="f1"] .quantum-prob-badge')).toHaveText('50%')
  await expect(page.locator('.board-root svg line')).toHaveCount(2)

  await resumeQuantumScenario(page, quantumScenario({
    w_k: qPiece('w_k', 'k', 'w', { h1: 1 }),
    b_k: qPiece('b_k', 'k', 'b', { h8: 1 }),
    w_r_a: qPiece('w_r_a', 'r', 'w', { a1: 1 }),
    w_b_c: qPiece('w_b_c', 'b', 'w', { a3: 0.5, b3: 0.5 }),
  }))
  await page.locator('[data-square="a1"]').click()
  await page.locator('[data-square="a4"]').click()
  await expect(page.locator('[data-square="a4"] .piece-white')).toBeVisible()
  await expect(page.locator('.board-root svg line')).toHaveCount(1)

  await resumeQuantumScenario(page, quantumScenario({
    w_k: qPiece('w_k', 'k', 'w', { h1: 1 }),
    b_k: qPiece('b_k', 'k', 'b', { h8: 1 }),
    w_p_a: qPiece('w_p_a', 'p', 'w', { a7: 1 }),
  }))
  await page.locator('[data-square="a7"]').click()
  await page.locator('[data-square="a8"]').click()
  const promotion = page.getByRole('dialog', { name: 'Promoción' })
  await expect(promotion).toBeVisible()
  await promotion.getByRole('button', { name: 'Dama' }).click()
  await expect(page.locator('[data-square="a8"] .piece-white')).toBeVisible()

  await resumeQuantumScenario(page, quantumScenario({
    w_k: qPiece('w_k', 'k', 'w', { h1: 1 }),
    b_k: qPiece('b_k', 'k', 'b', { h8: 1 }),
    w_r_a: qPiece('w_r_a', 'r', 'w', { a1: 0.5, b1: 0.5 }),
    b_r_a: qPiece('b_r_a', 'r', 'b', { a4: 0.5, b4: 0.5 }),
  }))
  await page.locator('[data-square="a1"]').click()
  await page.locator('[data-square="a4"]').click()
  const outcomeTree = page.getByRole('dialog', { name: 'Árbol de resultados' })
  await expect(outcomeTree).toBeVisible()
  await outcomeTree.getByRole('button', { name: 'Confirmar y medir' }).click()
  const measurement = page.getByRole('dialog', { name: 'Captura cuántica vs cuántica' })
  await expect(measurement).toBeVisible()
  await expect(measurement.getByText('Paso 2/2')).toBeVisible()
  await expect(measurement.getByText('Antes: atacante viva.')).toBeVisible()
  await measurement.getByRole('button', { name: 'Girar ruleta' }).click()
  await expect(measurement.getByRole('button', { name: 'Cerrar' })).toBeEnabled()
  await measurement.getByRole('button', { name: 'Cerrar' }).click()
  await expect(page.locator('[data-square="a4"] .piece-white')).toBeVisible()
})
