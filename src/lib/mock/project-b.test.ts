import { describe, expect, it } from 'vitest'
import { acsOf } from '@/lib/domain/scope'
import { applyProposal } from '@/lib/progress/scopeChange'
import { deriveAcStates } from '@/lib/progress/deriveAcStates'
import { rollup } from '@/lib/progress/rollup'
import { customerPortal } from './project-b'

const statuses = deriveAcStates(customerPortal)
const r = rollup(statuses)

describe('Project B: Customer portal', () => {
  it('is brownfield on GitHub Issues', () => {
    expect(customerPortal.project.kind).toBe('brownfield')
    expect(customerPortal.project.board).toBe('github')
  })

  it('has a baseline v1 of 19 ACs and a v1.1 that adds 2', () => {
    const [v1, v11] = customerPortal.project.scopeVersions
    expect(v1.label).toBe('v1')
    expect(acsOf(v1)).toHaveLength(19)
    expect(v11.label).toBe('v1.1')
    expect(acsOf(v11)).toHaveLength(21)
  })

  it('has exactly one regressed AC', () => {
    expect(statuses.filter((s) => s.state === 'regressed').map((s) => s.acId)).toEqual(['AC-3.1.2'])
  })

  it('is 57% complete and 71% delivered, with one 👤 AC waiting', () => {
    expect(r.completionPct).toBe(57)
    expect(r.deliveryPct).toBe(71)
    expect(r.pendingUserTesting).toBe(1)
  })

  it('has red-main, regression and ticked-but-red warnings', () => {
    expect(customerPortal.warnings.map((s) => s.type).sort()).toEqual(['red_main', 'regression', 'ticked_but_red'])
    const regression = customerPortal.warnings.find((s) => s.type === 'regression')
    expect(regression?.links.acId).toBe('AC-3.1.2')
    expect(regression?.links.prNumber).toBe(106)
  })

  it('locks v1.1 when its scope change is approved, with the matching proposal', () => {
    const [v1, v11] = customerPortal.project.scopeVersions
    const scr1 = customerPortal.scrs.find((s) => s.id === 'SCR-1')
    if (!scr1?.proposal) throw new Error('SCR-1 needs a proposal')
    expect(scr1.decidedAt).toBe(v11.lockedAt)
    expect(scr1.decidedBy).toBe(v11.approvedBy)
    expect(v11.changedBy).toBe('SCR-1')
    expect(applyProposal(v1.features, scr1.proposal)).toEqual(v11.features)
  })

  it('has one approved, one pending and one rejected SCR', () => {
    expect(customerPortal.scrs.map((s) => [s.id, s.status, s.source])).toEqual([
      ['SCR-1', 'approved', 'agent_pr'],
      ['SCR-2', 'pending', 'pulse'],
      ['SCR-3', 'rejected', 'human'],
    ])
    expect(customerPortal.scrs[2].decisionReason).toBe('Not in this release: support answers by email only.')
  })
})
