import { describe, expect, it } from 'vitest'
import { customerPortal } from '@/lib/mock/project-b'
import { expenseTracker } from '@/lib/mock/project-a'
import { toPortfolioRow, toProjectHeader, toProjectOverview } from './view-models'

describe('view models', () => {
  it('builds a portfolio row', () => {
    expect(toPortfolioRow(customerPortal)).toMatchObject({
      id: 'customer-portal', scopeLabel: 'v1.1', completionPct: 60, deliveryPct: 70, verified: 12, total: 20,
      openSignals: 3, highSignals: 2, pendingApprovals: 0, pendingUserTesting: 0,
      lastActivityAt: '2026-10-15T14:00:00+02:00',
    })
  })

  it('builds a header with pending approvals', () => {
    expect(toProjectHeader(expenseTracker)).toMatchObject({ id: 'expense-tracker', scopeLabel: 'v1', approvedBy: 'Maya Patel', pendingApprovals: 1 })
  })

  it('builds an overview with signals sorted by severity and the last 10 events', () => {
    const o = toProjectOverview(customerPortal)
    expect(o.rollup.total).toBe(20)
    expect(o.topSignals.map((s) => s.severity)).toEqual(['high', 'high', 'medium'])
    expect(o.activity).toHaveLength(10)
  })
})
