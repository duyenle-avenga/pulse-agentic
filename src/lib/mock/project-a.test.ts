import { describe, expect, it } from 'vitest'
import { acsOf, currentScope } from '@/lib/domain/scope'
import { deriveAcStates } from '@/lib/progress/deriveAcStates'
import { rollup } from '@/lib/progress/rollup'
import { expenseTracker } from './project-a'

const scope = currentScope(expenseTracker.project)
const r = rollup(deriveAcStates(expenseTracker))

describe('Project A: Expense tracker', () => {
  it('is greenfield with no board', () => {
    expect(expenseTracker.project.kind).toBe('greenfield')
    expect(expenseTracker.project.board).toBe('none')
  })

  it('has a fresh v1 with 4 features, 17 ACs and 4 👤 ACs', () => {
    expect(expenseTracker.project.scopeVersions.map((v) => v.label)).toEqual(['v1'])
    expect(scope.features).toHaveLength(4)
    expect(acsOf(scope)).toHaveLength(17)
    expect(acsOf(scope).filter((a) => a.humanTest)).toHaveLength(4)
  })

  it('is mid-way: about 45% delivered', () => {
    expect(r.completionPct).toBe(35)
    expect(r.deliveryPct).toBe(47)
    expect(r.counts.in_progress).toBe(7)
  })

  it('has one 👤 AC waiting for a tester', () => {
    expect(r.pendingUserTesting).toBe(1)
    expect(r.oldestPendingSince).toBe('2026-10-11T14:00:00+02:00')
  })

  it('has exactly one pending SCR, raised from an agent PR, proposing CSV export', () => {
    const pending = expenseTracker.scrs.filter((s) => s.status === 'pending')
    expect(pending).toHaveLength(1)
    expect(pending[0].source).toBe('agent_pr')
    expect(pending[0].proposal?.addStories.map((a) => [a.featureId, a.featureTitle, a.story.acs.length])).toEqual([['F5', 'Export', 3]])
    expect(pending[0].proposal?.tasks.map((t) => t.id)).toEqual(['T-08'])
  })

  it('has the planned mock warnings (pending ones are computed)', () => {
    expect(expenseTracker.warnings.map((s) => s.type).sort()).toEqual(['pr_format', 'stalled_task'])
  })
})
