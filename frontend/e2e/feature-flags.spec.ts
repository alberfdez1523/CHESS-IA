import { expect, test } from '@playwright/test'

test('release flags hide gated Academy, sync, and daily surfaces safely', async ({ page }) => {
  await page.goto('/learn/sprint/3')
  await expect(page).toHaveURL('/')
  await expect(page.getByTestId('home-learn-primary')).toHaveCount(0)
  await expect(page.getByTestId('start-quantum-tutorial')).toHaveCount(0)

  await page.goto('/profile')
  await expect(page.getByText(/Sincronización desactivada|Sync disabled/)).toBeVisible()
})
