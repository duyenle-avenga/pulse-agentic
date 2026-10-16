import { expect, test } from '@playwright/test'

test('portfolio lists the three demo projects and opens Intelligent Flow', async ({ page }) => {
  await page.goto('/')
  await expect(page.getByRole('heading', { level: 1, name: 'Portfolio' })).toBeVisible()
  await expect(page.getByText('3 projects')).toBeVisible()
  await expect(page.getByRole('link', { name: 'New project' })).toBeVisible()
  await expect(page.getByRole('row')).toHaveCount(4) // header + 3 projects
  await expect(page.getByText('Data as of 16 Oct 2026, 09:00')).toBeVisible()

  await page.getByRole('link', { name: 'Intelligent Flow' }).click()
  await expect(page).toHaveURL(/\/projects\/intelligent-flow$/)
  await expect(page.getByRole('heading', { level: 1, name: 'Intelligent Flow' })).toBeVisible()
})
