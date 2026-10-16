import { describe, expect, it } from 'vitest'
import { DEMO_NOW } from '@/lib/mock/clock'
import { expenseTracker } from '@/lib/mock/project-a'
import { intelligentFlow } from '@/lib/mock/project-c'
import { deriveAcStates } from './deriveAcStates'
import { deriveWarnings } from './deriveWarnings'

const warningsOf = (data: typeof expenseTracker, now = DEMO_NOW) => deriveWarnings(data, deriveAcStates(data), now)

describe('deriveWarnings', () => {
  it('adds one pending-user-testing warning with the count and the oldest date', () => {
    const warnings = warningsOf(intelligentFlow)
    expect(warnings.map((w) => w.type).sort()).toEqual(['pending_user_testing', 'unchecked_acs_merged', 'unplanned_work'])
    expect(warnings.find((w) => w.type === 'pending_user_testing')).toMatchObject({
      severity: 'low',
      message: '3 👤 ACs are waiting for a tester, the oldest since 25 Sep',
      suggestedAction: 'Assign a tester and start with the oldest',
      raisedAt: '2026-09-25T17:00:00+02:00',
    })
  })

  it('uses the singular for one waiting AC', () => {
    expect(warningsOf(expenseTracker).find((w) => w.type === 'pending_user_testing')?.message).toBe('1 👤 AC is waiting for a tester, since 11 Oct')
  })

  it('adds no pending-user-testing warning when nothing is waiting', () => {
    const noPrs = { ...intelligentFlow, prs: [] }
    expect(warningsOf(noPrs).some((w) => w.type === 'pending_user_testing')).toBe(false)
  })

  it('flags a pending SCR older than 24 h and names the approver', () => {
    expect(warningsOf(expenseTracker).find((w) => w.type === 'pending_decision')).toMatchObject({
      severity: 'medium',
      message: 'SCR-1 (Add CSV export of expenses) has been waiting for approval for 2 days',
      suggestedAction: 'Ping the approver, Maya Patel',
      links: { prNumber: 5 },
    })
  })

  it('does not flag a pending SCR within its first 24 h, or a decided one', () => {
    expect(warningsOf(expenseTracker, '2026-10-14T16:00:00+02:00').some((w) => w.type === 'pending_decision')).toBe(false)
    const decided = { ...expenseTracker, scrs: expenseTracker.scrs.map((s) => ({ ...s, status: 'approved' as const })) }
    expect(warningsOf(decided).some((w) => w.type === 'pending_decision')).toBe(false)
  })

  it('replaces mock records of the computed types', () => {
    const stale = { ...intelligentFlow, prs: [], warnings: [...intelligentFlow.warnings, { ...intelligentFlow.warnings[0], id: 'OLD', type: 'pending_user_testing' as const }] }
    expect(warningsOf(stale).map((w) => w.id)).not.toContain('OLD')
  })
})
