import { describe, expect, it } from 'vitest'
import { EMPTY_DECISIONS } from '@/lib/domain/planner'
import { DEMO_NOW } from '@/lib/mock/clock'
import { customerPortal } from '@/lib/mock/project-b'
import { expenseTracker } from '@/lib/mock/project-a'
import { applyProjectDecisions } from '@/lib/progress/applyProjectDecisions'
import { toPortfolioRow, toProjectHeader, toProjectOverview } from './view-models'

describe('view models', () => {
  it('builds a portfolio row on the data users actually see (merged with this browser’s decisions)', () => {
    // B's own mock warnings carry none of the computed types, but the merge adds a pending_decision
    // warning (SCR-2 has been waiting since before DEMO_NOW) and a pending_user_testing one, so the
    // real count users see (5) is higher than B's raw mock warnings array (3).
    const merged = applyProjectDecisions(customerPortal, EMPTY_DECISIONS, DEMO_NOW)
    expect(toPortfolioRow(merged)).toMatchObject({
      id: 'customer-portal', scopeLabel: 'v1.1', completionPct: 57, deliveryPct: 71, verified: 12, total: 21,
      openWarnings: 5, highWarnings: 2, pendingApprovals: 1, pendingUserTesting: 1,
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
    expect(o).not.toHaveProperty('header')
  })

  it('orders warnings by severity, then oldest first, and keeps five', () => {
    const base = customerPortal
    const warning = (id: string, severity: 'high' | 'medium' | 'low', raisedAt: string) => ({ ...base.warnings[0], id, severity, raisedAt })
    const custom = {
      ...base,
      warnings: [
        warning('S1', 'low', '2026-10-10T09:00:00+02:00'), warning('S2', 'medium', '2026-10-12T09:00:00+02:00'),
        warning('S3', 'medium', '2026-10-11T09:00:00+02:00'), warning('S4', 'high', '2026-10-13T09:00:00+02:00'),
        warning('S5', 'low', '2026-10-09T09:00:00+02:00'), warning('S6', 'low', '2026-10-08T09:00:00+02:00'),
      ],
    }
    expect(toProjectOverview(custom).topWarnings.map((s) => s.id)).toEqual(['S4', 'S3', 'S2', 'S6', 'S5'])
  })
})
