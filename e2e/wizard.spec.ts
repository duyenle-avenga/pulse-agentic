import { expect, test } from '@playwright/test'

test('the wizard creates Intelligent Flow v2 and the demo can be reset', async ({ page }) => {
  await page.goto('/')
  await expect(page.getByText('3 projects')).toBeVisible()

  await page.getByRole('link', { name: 'New project' }).click()
  await expect(page).toHaveURL(/\/projects\/new$/)
  await page.getByRole('button', { name: 'Submit to planner' }).click()
  await page.getByRole('button', { name: 'Submit answers' }).click()
  await expect(page.getByText('0 of 7 stories decided')).toBeVisible()
  await page.getByRole('button', { name: 'Approve all' }).click()
  await page.getByRole('button', { name: 'Lock v1' }).click()

  await expect(page.getByText('Scope v1 · locked 16 Oct by Demo approver')).toBeVisible()
  await expect(page.getByRole('heading', { name: 'Generated tasks (17)' })).toBeVisible()

  await page.getByRole('link', { name: 'Back to portfolio' }).click()
  await expect(page.getByText('4 projects')).toBeVisible()
  const row = page.getByRole('row').filter({ hasText: 'Intelligent Flow v2' })
  await expect(row.getByText('Completion 0% · Delivery 0%')).toBeVisible()

  await row.getByRole('link', { name: 'Intelligent Flow v2' }).click()
  await expect(page.getByRole('heading', { level: 1, name: 'Intelligent Flow v2' })).toBeVisible()
  await expect(page.getByText('0 of 28 ACs verified')).toBeVisible()
  await expect(page.getByText('Scope v1 locked by Demo approver')).toBeVisible()

  await page.goto('/projects/new')
  await page.getByRole('button', { name: 'Reset demo' }).click()
  await expect(page.getByRole('button', { name: 'Submit to planner' })).toBeVisible()
  await page.goto('/')
  await expect(page.getByText('3 projects')).toBeVisible()
})

test('Intelligent Flow v2 asks for the wizard before it is locked', async ({ page }) => {
  await page.goto('/projects/intelligent-flow-v2')
  await expect(page.getByText('Intelligent Flow v2’s scope isn’t locked yet.')).toBeVisible()
  await expect(page.getByRole('link', { name: 'Open the wizard' })).toBeVisible()
})
