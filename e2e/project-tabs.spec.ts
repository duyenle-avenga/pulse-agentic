import { expect, test, type Page } from '@playwright/test'

const TABS = ['User testing', 'Scope', 'Tasks', 'Evidence', 'Approvals', 'Changelog', 'Metrics']

async function approveCsvExport(page: Page) {
  await page.goto('/projects/expense-tracker/approvals')
  await expect(page.getByRole('heading', { level: 2, name: 'Approvals' })).toBeVisible()
  await page.getByLabel('Reason').fill('Accountants need it for tax returns')
  await page.getByRole('button', { name: 'Approve SCR-1' }).click()
  await expect(page.getByText('Approved by Maya Patel on 16 Oct · created v1.1')).toBeVisible()
}

test('approving a scope change creates v1.1 everywhere', async ({ page }) => {
  await approveCsvExport(page)
  await expect(page.getByText(/Scope v1\.1 · locked 16 Oct by Maya Patel/)).toBeVisible()
  await expect(page.getByText('1 pending approval')).toHaveCount(0)

  await page.getByRole('link', { name: 'Compare v1 → v1.1' }).click()
  await expect(page).toHaveURL(/\/scope\?from=v1&to=v1\.1$/)
  await expect(page.getByRole('region', { name: 'Changes from v1 to v1.1' }).getByRole('listitem')).toHaveCount(5)

  await page.getByRole('navigation', { name: 'Project' }).getByRole('link', { name: 'Changelog' }).click()
  await expect(page.getByRole('heading', { name: 'v1 → v1.1' })).toBeVisible()
  await expect(page.getByText('+1 feature, +1 story, +3 ACs')).toBeVisible()

  await page.getByRole('navigation', { name: 'Project' }).getByRole('link', { name: 'Overview' }).click()
  await expect(page.getByText('6 of 20 ACs verified')).toBeVisible()

  await page.goto('/')
  const row = page.getByRole('row').filter({ hasText: 'Expense tracker' })
  await expect(row.getByRole('cell', { name: 'v1.1', exact: true })).toBeVisible()
  await expect(row.getByText('Completion 30% · Delivery 40%')).toBeVisible()
})

test('recording a human test updates the queue, warnings, evidence and portfolio', async ({ page }) => {
  await page.goto('/projects/intelligent-flow/user-testing')
  await expect(page.getByRole('heading', { name: 'Waiting for a tester (3)' })).toBeVisible()
  await page.getByRole('button', { name: 'Record result for AC-3.1.5' }).click()
  const form = page.getByRole('form', { name: 'Record result for AC-3.1.5' })
  await form.getByLabel('Pass').check()
  await form.getByLabel('Environment').fill('Staging')
  await form.getByLabel('Tester').fill('Demo tester')
  await form.getByRole('button', { name: 'Save result' }).click()
  await expect(page.getByRole('heading', { name: 'Waiting for a tester (2)' })).toBeVisible()
  await expect(page.getByRole('table').getByRole('cell', { name: 'AC-3.1.5' })).toBeVisible()

  await page.getByRole('navigation', { name: 'Project' }).getByRole('link', { name: 'Overview' }).click()
  await expect(page.getByText('2 👤 ACs are waiting for a tester, the oldest since 9 Oct')).toBeVisible()

  await page.getByRole('navigation', { name: 'Project' }).getByRole('link', { name: 'Evidence' }).click()
  const evidenceRow = page.getByRole('row').filter({ has: page.getByRole('cell', { name: /^AC-3\.1\.5/ }) })
  await expect(evidenceRow.getByText('Human test')).toBeVisible()
  await expect(evidenceRow.getByText('Pass')).toBeVisible()

  await page.goto('/')
  const row = page.getByRole('row').filter({ hasText: 'Intelligent Flow' }).filter({ hasNotText: 'v2' })
  await expect(row.getByText('5 / 28')).toBeVisible()
})

test('rejecting a scope change keeps the version and logs the decision', async ({ page }) => {
  await page.goto('/projects/customer-portal/approvals')
  await page.getByLabel('Reason').fill('Not in this release')
  await page.getByRole('button', { name: 'Reject SCR-2' }).click()
  await expect(page.getByText('Rejected by Lena Fischer on 16 Oct')).toBeVisible()
  await expect(page.getByText(/Scope v1\.1 · locked 6 Oct by Lena Fischer/)).toBeVisible()

  await page.getByRole('navigation', { name: 'Project' }).getByRole('link', { name: 'Changelog' }).click()
  await expect(page.getByRole('heading', { name: 'SCR-2 rejected, no version change' })).toBeVisible()
})

test('Reset demo decisions brings back the mock state', async ({ page }) => {
  await approveCsvExport(page)
  await page.getByRole('button', { name: 'Reset demo decisions' }).click()
  await expect(page.getByText(/Scope v1 · locked 6 Oct by Maya Patel/)).toBeVisible()
  await expect(page.getByText('1 pending approval')).toBeVisible()
  await expect(page.getByRole('heading', { name: 'Waiting for a decision (1)' })).toBeVisible()
})

for (const projectId of ['expense-tracker', 'customer-portal', 'intelligent-flow']) {
  test(`every tab of ${projectId} loads`, async ({ page }) => {
    for (const tab of TABS) {
      await page.goto(`/projects/${projectId}`)
      const nav = page.getByRole('navigation', { name: 'Project' })
      await nav.getByRole('link', { name: tab, exact: true }).click()
      await expect(page.getByRole('heading', { level: 2, name: tab })).toBeVisible()
      await expect(nav.getByRole('link', { name: tab, exact: true })).toHaveAttribute('aria-current', 'page')
    }
  })
}

test('every tab of Intelligent Flow v2 loads after the wizard locks v1', async ({ page }) => {
  await page.goto('/projects/new')
  await page.getByRole('button', { name: 'Submit to planner' }).click()
  await page.getByRole('button', { name: 'Submit answers' }).click()
  await page.getByRole('button', { name: 'Approve all' }).click()
  await page.getByRole('button', { name: 'Lock v1' }).click()
  await expect(page.getByText('Scope v1 · locked 16 Oct by Demo approver')).toBeVisible()

  for (const tab of TABS) {
    await page.goto('/projects/intelligent-flow-v2')
    await page.getByRole('navigation', { name: 'Project' }).getByRole('link', { name: tab, exact: true }).click()
    await expect(page.getByRole('heading', { level: 2, name: tab })).toBeVisible()
  }
  await expect(page.getByRole('button', { name: 'Reset demo decisions' })).toHaveCount(0)
})
