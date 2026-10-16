import { describe, expect, it } from 'vitest'
import { customerPortal } from '@/lib/mock/project-b'
import { intelligentFlow } from '@/lib/mock/project-c'
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
})
