import { describe, expect, it } from 'vitest'
import { EMPTY_DECISIONS } from '@/lib/domain/planner'
import { DEMO_NOW } from '@/lib/mock/clock'
import { customerPortal } from '@/lib/mock/project-b'
import { intelligentFlow } from '@/lib/mock/project-c'
import { applyProjectDecisions } from './applyProjectDecisions'
import { evidenceByAc } from './evidence'

const byAc = evidenceByAc(customerPortal)

describe('evidenceByAc', () => {
  it('lists test plan items from merged PRs, newest first', () => {
    expect(byAc.get('AC-3.1.2')).toEqual([
      { kind: 'pr', at: '2026-10-15T14:00:00+02:00', prNumber: 106, mark: 'failed', testType: 'e2e', testFile: 'invoices-filter.spec.ts', ci: 'failing', sha: customerPortal.prs[5].headSha },
      { kind: 'pr', at: '2026-09-18T17:00:00+02:00', prNumber: 103, mark: 'ticked', testType: 'e2e', testFile: 'invoices-filter.spec.ts', ci: 'passing', sha: customerPortal.prs[2].headSha },
    ])
  })

  it('includes human test results', () => {
    expect(byAc.get('AC-2.1.4')?.map((e) => e.kind)).toEqual(['human', 'pr'])
    expect(byAc.get('AC-2.1.4')?.[0]).toMatchObject({ result: 'pass', tester: 'Jonas Weber', environment: 'staging.portal.example' })
  })

  it('ignores open PRs and PRs without a test plan', () => {
    expect(byAc.get('AC-3.1.5')).toBeUndefined()
    expect(evidenceByAc(intelligentFlow).get('AC-3.1.5')).toBeUndefined()
  })

  it('marks evidence from before an AC’s text changed', () => {
    expect([...byAc.values()].flat().some((e) => e.beforeChange)).toBe(false)
    const approved = applyProjectDecisions(
      customerPortal,
      { ...EMPTY_DECISIONS, scrs: { 'SCR-2': { status: 'approved', decidedAt: DEMO_NOW, decidedBy: 'Lena Fischer', reason: 'ok' } } },
      DEMO_NOW,
    )
    const after = evidenceByAc(approved)
    expect(after.get('AC-1.1.2')).toEqual([expect.objectContaining({ prNumber: 101, beforeChange: true })])
    expect(after.get('AC-1.1.1')?.[0].beforeChange).toBeUndefined()
  })
})
