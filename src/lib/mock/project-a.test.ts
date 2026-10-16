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

  it('has a fresh v1 with 4 features, 16 ACs and 3 👤 ACs', () => {
    expect(expenseTracker.project.scopeVersions.map((v) => v.label)).toEqual(['v1'])
    expect(scope.features).toHaveLength(4)
    expect(acsOf(scope)).toHaveLength(16)
    expect(acsOf(scope).filter((a) => a.humanTest)).toHaveLength(3)
  })

  it('is mid-way: about 45% delivered', () => {
    expect(r.completionPct).toBe(38)
    expect(r.deliveryPct).toBe(44)
    expect(r.counts.in_progress).toBe(7)
  })

  it('has exactly one pending SCR, raised from an agent PR', () => {
    const pending = expenseTracker.scrs.filter((s) => s.status === 'pending')
    expect(pending).toHaveLength(1)
    expect(pending[0].source).toBe('agent_pr')
  })

  it('has the planned warnings', () => {
    expect(expenseTracker.warnings.map((s) => s.type).sort()).toEqual(['pending_decision', 'pr_format', 'stalled_task'])
  })
})
