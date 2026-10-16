import { describe, expect, it } from 'vitest'
import type { HumanTestResult, Project, PullRequest } from '@/lib/domain/types'
import { ac, at, failedItem, feature, pr, story, task, ticked, unticked } from '@/lib/mock/builders'
import { deriveAcStates } from './deriveAcStates'

const project: Project = {
  id: 'p',
  name: 'P',
  description: '',
  kind: 'greenfield',
  board: 'none',
  hasCi: true,
  scopeVersions: [
    {
      label: 'v1',
      lockedAt: at(10, 1),
      approvedBy: 'PO',
      features: [feature('F1', 'F', [story('US-1', 'S', [ac('AC-1', 'regular'), ac('AC-2', 'human', true)])])],
    },
  ],
}
const tasks = [task('p', { id: 'T-1', title: 't', storyId: 'US-1', acIds: ['AC-1', 'AC-2'] })]

const openPr = (n: number, extra: Partial<PullRequest> = {}) =>
  pr('p', { number: n, title: `T-1 #${n}`, taskIds: ['T-1'], state: 'open', openedAt: at(10, n), ci: 'pending', ...extra })
const mergedPr = (n: number, extra: Partial<PullRequest> = {}) =>
  pr('p', { number: n, title: `T-1 #${n}`, taskIds: ['T-1'], state: 'merged', openedAt: at(10, n), mergedAt: at(10, n, 17), ci: 'passing', ...extra })

const statusOf = (acId: string, prs: PullRequest[], humanTests: HumanTestResult[] = [], p: Project = project) => {
  const status = deriveAcStates({ project: p, tasks, prs, humanTests }).find((s) => s.acId === acId)
  if (!status) throw new Error(`no status for ${acId}`)
  return status
}
const humanTest = (result: 'pass' | 'fail', day: number): HumanTestResult => ({
  acId: 'AC-2', result, environment: 'staging', tester: 'Tess', testedAt: at(10, day, 12),
})

describe('deriveAcStates: regular ACs', () => {
  it('is not_started with no PRs', () => {
    expect(statusOf('AC-1', [])).toEqual({ acId: 'AC-1', humanTest: false, state: 'not_started', history: [] })
  })

  it('is in_progress while an open PR touches it via its task', () => {
    const s = statusOf('AC-1', [openPr(2)])
    expect(s.state).toBe('in_progress')
    expect(s.history).toEqual([{ state: 'in_progress', at: at(10, 2) }])
  })

  it('is verified when ticked in a merged PR with green CI', () => {
    const s = statusOf('AC-1', [mergedPr(2, { testPlan: [ticked('AC-1', 'unit')] })])
    expect(s.state).toBe('verified')
    expect(s.history).toEqual([
      { state: 'in_progress', at: at(10, 2) },
      { state: 'verified', at: at(10, 2, 17) },
    ])
  })

  it('treats ci "none" as green', () => {
    expect(statusOf('AC-1', [mergedPr(2, { ci: 'none', testPlan: [ticked('AC-1', 'unit')] })]).state).toBe('verified')
  })

  it('is failing when ticked but CI is red', () => {
    expect(statusOf('AC-1', [mergedPr(2, { ci: 'failing', testPlan: [ticked('AC-1', 'unit')] })]).state).toBe('failing')
  })

  it('is failing when the test plan marks it failed', () => {
    expect(statusOf('AC-1', [mergedPr(2, { testPlan: [failedItem('AC-1', 'e2e')] })]).state).toBe('failing')
  })

  it('is regressed when a later PR reports a verified AC failing', () => {
    const s = statusOf('AC-1', [
      mergedPr(2, { testPlan: [ticked('AC-1', 'unit')] }),
      mergedPr(4, { testPlan: [failedItem('AC-1', 'e2e')] }),
    ])
    expect(s.state).toBe('regressed')
    expect(s.history.at(-1)).toEqual({ state: 'regressed', at: at(10, 4, 17) })
  })

  it('is implemented when merged but unticked, or missing from the test plan', () => {
    expect(statusOf('AC-1', [mergedPr(2, { testPlan: [unticked('AC-1')] })]).state).toBe('implemented')
    expect(statusOf('AC-1', [mergedPr(2)]).state).toBe('implemented')
  })

  it('never moves a verified AC back down to implemented', () => {
    const s = statusOf('AC-1', [mergedPr(2, { testPlan: [ticked('AC-1', 'unit')] }), mergedPr(4)])
    expect(s.state).toBe('verified')
  })

  it('is only implemented when ticked but CI is still pending', () => {
    expect(statusOf('AC-1', [mergedPr(2, { ci: 'pending', testPlan: [ticked('AC-1', 'unit')] })]).state).toBe('implemented')
  })

  it('counts a PR that touches the AC only through its test plan', () => {
    expect(statusOf('AC-1', [mergedPr(2, { taskIds: [], testPlan: [ticked('AC-1', 'unit')] })]).state).toBe('verified')
  })

  it('ignores closed PRs', () => {
    expect(statusOf('AC-1', [mergedPr(2, { state: 'closed', mergedAt: undefined })]).state).toBe('not_started')
  })
})

describe('deriveAcStates: 👤 ACs', () => {
  it('is pending_user_testing once a touching PR is merged, even if the box is ticked', () => {
    const s = statusOf('AC-2', [mergedPr(2, { testPlan: [ticked('AC-2', 'manual')] })])
    expect(s.state).toBe('pending_user_testing')
    expect(s.humanTest).toBe(true)
  })

  it('is verified when a human records a pass', () => {
    expect(statusOf('AC-2', [mergedPr(2)], [humanTest('pass', 3)]).state).toBe('verified')
  })

  it('is failing when a later human test fails after a pass', () => {
    const s = statusOf('AC-2', [mergedPr(2)], [humanTest('fail', 5), humanTest('pass', 3)])
    expect(s.state).toBe('failing')
    expect(s.history.map((h) => h.state)).toEqual(['in_progress', 'pending_user_testing', 'verified', 'failing'])
  })
})

describe('deriveAcStates: scope versions', () => {
  it('only returns ACs in the current scope version', () => {
    const versioned: Project = {
      ...project,
      scopeVersions: [
        { label: 'v1', lockedAt: at(10, 1), approvedBy: 'PO', features: [feature('F1', 'F', [story('US-1', 'S', [ac('AC-1', 'a'), ac('AC-9', 'dropped')])])] },
        { label: 'v2', lockedAt: at(10, 3), approvedBy: 'PO', features: [feature('F1', 'F', [story('US-1', 'S', [ac('AC-1', 'a')])])] },
      ],
    }
    expect(deriveAcStates({ project: versioned, tasks, prs: [], humanTests: [] }).map((s) => s.acId)).toEqual(['AC-1'])
  })
})
