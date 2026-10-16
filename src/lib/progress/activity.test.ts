import { describe, expect, it } from 'vitest'
import type { ProjectData } from '@/lib/domain/types'
import { ac, at, feature, pr, story } from '@/lib/mock/builders'
import { recentActivity } from './activity'

const data: ProjectData = {
  project: {
    id: 'p', name: 'P', description: '', kind: 'greenfield', board: 'none', hasCi: true,
    scopeVersions: [{ label: 'v1', lockedAt: at(10, 1), approvedBy: 'Maya', features: [feature('F1', 'F', [story('US-1', 'S', [ac('AC-1', 'a', true)])])] }],
  },
  tasks: [],
  prs: [
    pr('p', { number: 1, title: 'T-1 Login', state: 'merged', openedAt: at(10, 2), mergedAt: at(10, 3), ci: 'passing' }),
    pr('p', { number: 2, title: 'T-2 Report', state: 'open', openedAt: at(10, 6), ci: 'pending' }),
  ],
  humanTests: [{ acId: 'AC-1', result: 'pass', environment: 'staging', tester: 'Tom', testedAt: at(10, 4) }],
  scrs: [
    { id: 'SCR-1', projectId: 'p', title: 'CSV export', source: 'agent_pr', prNumber: 2, status: 'pending', raisedAt: at(10, 7) },
    { id: 'SCR-2', projectId: 'p', title: 'PDF', source: 'human', status: 'approved', raisedAt: at(10, 4, 12), decidedAt: at(10, 5), decidedBy: 'Maya' },
  ],
  warnings: [],
}

describe('recentActivity', () => {
  it('lists events newest first with readable labels', () => {
    expect(recentActivity(data).map((e) => [e.kind, e.label])).toEqual([
      ['scr_raised', 'SCR-1 raised: CSV export'],
      ['pr_opened', 'PR #2 opened: T-2 Report'],
      ['scr_decided', 'SCR-2 approved by Maya: PDF'],
      ['scr_raised', 'SCR-2 raised: PDF'],
      ['human_test', 'AC-1 human test passed (Tom, staging)'],
      ['pr_merged', 'PR #1 merged: T-1 Login'],
      ['pr_opened', 'PR #1 opened: T-1 Login'],
      ['scope_locked', 'Scope v1 locked by Maya'],
    ])
  })

  it('keeps only the newest events up to the limit', () => {
    expect(recentActivity(data, 2).map((e) => e.at)).toEqual([at(10, 7), at(10, 6)])
  })
})
