import { describe, expect, it } from 'vitest'
import { customerPortal } from '@/lib/mock/project-b'
import { expenseTracker } from '@/lib/mock/project-a'
import { toPortfolioRow, toProjectHeader, toProjectOverview } from './view-models'

describe('view models', () => {
  it('builds a portfolio row', () => {
    expect(toPortfolioRow(customerPortal)).toMatchObject({
      id: 'customer-portal', scopeLabel: 'v1.1', completionPct: 57, deliveryPct: 71, verified: 12, total: 21,
      openWarnings: 3, highWarnings: 2, pendingApprovals: 1, pendingUserTesting: 1,
      lastActivityAt: '2026-10-15T14:00:00+02:00',
    })
  })

  it('builds a header with pending approvals', () => {
    expect(toProjectHeader(expenseTracker)).toMatchObject({ id: 'expense-tracker', scopeLabel: 'v1', approvedBy: 'Maya Patel', pendingApprovals: 1 })
  })

  it('builds an overview with warnings sorted by severity and the last 10 events', () => {
    const o = toProjectOverview(customerPortal)
    expect(o.rollup.total).toBe(21)
    expect(o.topWarnings.map((s) => s.severity)).toEqual(['high', 'high', 'medium'])
    expect(o.activity).toHaveLength(10)
  })
})
