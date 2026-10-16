import { describe, expect, it } from 'vitest'
import { acsOf, currentScope } from '@/lib/domain/scope'
import { deriveAcStates } from '@/lib/progress/deriveAcStates'
import { rollup } from '@/lib/progress/rollup'
import { intelligentFlow } from './project-c'

const scope = currentScope(intelligentFlow.project)
const r = rollup(deriveAcStates(intelligentFlow))

describe('Project C: Intelligent Flow', () => {
  it('is brownfield on Jira CTOACT', () => {
    expect(intelligentFlow.project.kind).toBe('brownfield')
    expect(intelligentFlow.project.board).toBe('jira')
    expect(intelligentFlow.project.boardKey).toBe('CTOACT')
  })

  it('matches the scope doc: 7 features, 28 ACs, 3 👤 ACs, 17 tasks', () => {
    expect(scope.label).toBe('v1')
    expect(scope.features).toHaveLength(7)
    expect(acsOf(scope)).toHaveLength(28)
    expect(acsOf(scope).filter((a) => a.humanTest).map((a) => a.id)).toEqual(['AC-3.1.5', 'AC-5.1.5', 'AC-6.1.4'])
    expect(intelligentFlow.tasks).toHaveLength(17)
  })

  it('copies AC wording from the scope doc', () => {
    expect(acsOf(scope).find((a) => a.id === 'AC-3.1.3')?.text).toBe('The person who triggered or produced the work can’t approve their own gate')
  })

  it('shows a large gap between delivery and completion', () => {
    expect(r.completionPct).toBe(14)
    expect(r.deliveryPct).toBe(71)
    expect(r.pendingUserTesting).toBe(3)
  })

  it('never calls the product UI a console', () => {
    expect(JSON.stringify(intelligentFlow)).not.toMatch(/console/i)
  })

  it('has unplanned-work and unchecked-ACs mock warnings (pending user testing is computed)', () => {
    expect(intelligentFlow.warnings.map((s) => s.type).sort()).toEqual(['unchecked_acs_merged', 'unplanned_work'])
  })
})
