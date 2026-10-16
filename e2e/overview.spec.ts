import { expect, test } from '@playwright/test'

test('overview shows KPIs, state bar, warnings and activity', async ({ page }) => {
  await page.goto('/projects/customer-portal')
  await expect(page.getByText('57%', { exact: true })).toBeVisible()
  await expect(page.getByText('71%', { exact: true })).toBeVisible()
  await expect(page.getByText('Acceptance criteria by state')).toBeVisible()
  await expect(page.getByText('CI has been red on main for 19 h, since PR #106 was merged')).toBeVisible()
  await expect(page.getByText('PR #106 merged: T-03 Faster invoice filtering')).toBeVisible()
})

test('unknown project shows the not-found page', async ({ page }) => {
  const response = await page.goto('/projects/does-not-exist')
  expect(response?.status()).toBe(404)
  await expect(page.getByRole('heading', { name: 'Page not found' })).toBeVisible()
})
