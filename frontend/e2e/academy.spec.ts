import { expect, test } from '@playwright/test'

test.beforeEach(async ({ page }) => {
  await page.addInitScript(() => {
    localStorage.clear()
    sessionStorage.clear()
  })
})

test('new users reach the bilingual 64-activity Academy from the primary CTA', async ({ page }) => {
  await page.goto('/')
  await expect(page.getByTestId('home-learn-primary')).toContainText('Empezar a aprender')
  await page.getByTestId('home-learn-primary').click()

  await expect(page).toHaveURL(/\/learn$/)
  await expect(page.getByRole('heading', { level: 1 })).toContainText('Dos tableros')
  await expect(page.getByTestId('academy-module')).toHaveCount(8)
  await expect(page.getByTestId('academy-activity')).toHaveCount(32)

  await page.getByRole('radio', { name: 'Ruta cuántica' }).click()
  await expect(page.getByTestId('academy-module')).toHaveCount(8)
  await expect(page.getByTestId('academy-activity')).toHaveCount(32)
  await expect(page.getByTestId('academy-activity').first()).toHaveAttribute('data-lesson-id', 'quantum-model-lesson')
})

test('assessment, hint ladder, deep lesson route, and local progress work together', async ({ page }) => {
  await page.goto('/learn')
  await page.getByRole('button', { name: 'Hacer diagnóstico' }).click()

  const assessment = page.getByRole('dialog', { name: 'Calibra tu punto de partida' })
  await expect(assessment).toBeVisible()
  for (const fieldset of await assessment.locator('fieldset').all()) {
    await fieldset.getByRole('radio').first().click()
  }
  await assessment.getByRole('button', { name: 'Calcular nivel inicial' }).click()
  await expect(page.getByText(/Diagnóstico guardado/)).toBeVisible()

  await page.locator('[data-lesson-id="classic-board-lesson"]').click()
  await expect(page).toHaveURL(/\/learn\/classic-board-lesson$/)
  await expect(page.locator('.academy-board')).toBeVisible()
  await page.getByRole('button', { name: /Pedir una pista/ }).click()
  await expect(page.getByRole('list', { name: 'Pistas' }).locator('li')).toHaveCount(1)
  await page.getByRole('radio').first().click()
  await page.getByRole('button', { name: 'Confirmar respuesta' }).click()
  await expect(page.getByText('Decisión correcta')).toBeVisible()
  await expect(page.getByText(/Resolución asistida/)).toBeVisible()

  await page.reload()
  await expect(page).toHaveURL(/\/learn\/classic-board-lesson$/)
  await expect(page.getByRole('heading', { level: 1 })).toContainText('Concepto: Coordenadas')
})

test('daily lab, three sprint lengths, profile, and mobile navigation are reachable', async ({ page }) => {
  await page.setViewportSize({ width: 390, height: 844 })
  await page.goto('/learn')

  await expect(page.getByRole('button', { name: '3 min' })).toBeVisible()
  await expect(page.getByRole('button', { name: '5 min' })).toBeVisible()
  await expect(page.getByRole('button', { name: '10 min' })).toBeVisible()
  await page.getByRole('button', { name: '3 min' }).click()
  await expect(page).toHaveURL(/\/learn\/sprint\/3$/)
  await expect(page.getByRole('heading', { name: 'Puzzle Sprint' })).toBeVisible()

  await page.goto('/profile')
  await expect(page.getByRole('heading', { level: 1 })).toContainText('Gambito-')
  await expect(page.getByRole('navigation', { name: 'Navegación principal' })).toBeVisible()
  await expect(page.getByRole('button', { name: 'Aprender' })).toHaveCSS('min-height', '52px')
})

test('limited coherence exposes capacity choices and accessible live meters', async ({ page }) => {
  await page.goto('/')
  await page.getByTestId('start-mode-quantum').click()
  await page.getByTestId('start-opponent-local').click()
  await page.getByRole('button', { name: 'Personalizar' }).click()
  await page.getByRole('radio', { name: /Coherencia limitada/ }).click()
  await page.getByRole('radio', { name: '6 unidades' }).click()
  await page.getByTestId('start-play').click()

  await expect(page.locator('[aria-label="Coherencia usada: 0 / 6"]')).toHaveCount(2)
  await page.locator('[data-testid="quantum-mode-quantum"]').filter({ visible: true }).click()
  await page.locator('[data-square="b1"]').click()
  await page.locator('[data-square="a3"]').click()
  await page.locator('[data-square="c3"]').click()
  await expect(page.locator('[aria-label="Coherencia usada: 1 / 6"]')).toHaveCount(1)
})
