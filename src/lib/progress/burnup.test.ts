import { describe, expect, it } from 'vitest'
import type { Project } from '@/lib/domain/types'
import { ac, at, feature, story } from '@/lib/mock/builders'
import type { AcStatus } from './deriveAcStates'
import { burnup, stateAt } from './burnup'

const project: Project = {
  id: 'p',
  name: 'P',
  description: '',
  kind: 'greenfield',
  board: 'none',
  hasCi: true,
  scopeVersions: [
    { label: 'v1', lockedAt: at(10, 1, 10), approvedBy: 'PO', features: [feature('F1', 'F', [story('US-1', 'S', [ac('AC-1', 'a'), ac('AC-2', 'b')])])] },
    {
      label: 'v1.1',
      lockedAt: at(10, 3, 14),
      approvedBy: 'PO',
      features: [feature('F1', 'F', [story('US-1', 'S', [ac('AC-1', 'a'), ac('AC-2', 'b'), ac('AC-3', 'c')])])],
    },
  ],
}

const statuses: AcStatus[] = [
  { acId: 'AC-1', humanTest: false, state: 'verified', history: [{ state: 'in_progress', at: at(10, 1, 12) }, { state: 'verified', at: at(10, 2, 12) }] },
  { acId: 'AC-2', humanTest: false, state: 'implemented', history: [{ state: 'implemented', at: at(10, 3, 10) }] },
  { acId: 'AC-3', humanTest: false, state: 'verified', history: [{ state: 'verified', at: at(10, 4, 12) }] },
]

describe('burnup', () => {
  const points = burnup(project, statuses, at(10, 4, 9))

  it('has one point per day from the first lock to now', () => {
    expect(points.map((p) => p.date)).toEqual(['2026-10-01', '2026-10-02', '2026-10-03', '2026-10-04'])
  })

  it('steps the scope up on the day a new version is locked', () => {
    expect(points.map((p) => p.scope)).toEqual([2, 2, 3, 3])
  })

  it('counts delivered and verified ACs as of the end of each day', () => {
    expect(points.map((p) => p.delivered)).toEqual([0, 1, 2, 2])
    expect(points.map((p) => p.verified)).toEqual([0, 1, 1, 1])
  })

  it('ignores changes later than now on the last day', () => {
    // AC-3 is verified at 12:00 on 4 Oct, but "now" is 09:00 that day.
    expect(points.at(-1)).toEqual({ date: '2026-10-04', scope: 3, delivered: 2, verified: 1 })
  })
})

describe('burnup Berlin day boundary', () => {
  const boundaryStatuses: AcStatus[] = [
    { acId: 'AC-1', humanTest: false, state: 'verified', history: [{ state: 'verified', at: at(10, 2, 23, 30) }] },
    { acId: 'AC-2', humanTest: false, state: 'verified', history: [{ state: 'verified', at: at(10, 3, 0, 30) }] },
  ]
  const points = burnup(project, boundaryStatuses, at(10, 3, 23, 0))
  const byDate = Object.fromEntries(points.map((p) => [p.date, p]))

  it('counts a status verified at 23:30 Berlin time on the earlier day', () => {
    expect(byDate['2026-10-02'].verified).toBe(1)
  })

  it('counts a status verified at 00:30 Berlin time on the later day, not the earlier one', () => {
    expect(byDate['2026-10-03'].verified).toBe(2)
  })
})

describe('stateAt', () => {
  it('returns not_started for empty history', () => {
    const status: AcStatus = { acId: 'AC-1', humanTest: false, state: 'not_started', history: [] }
    expect(stateAt(status, Date.parse(at(10, 5, 0, 0)))).toBe('not_started')
  })

  it('ignores a transition that happens after the cutoff', () => {
    const status: AcStatus = {
      acId: 'AC-1',
      humanTest: false,
      state: 'verified',
      history: [
        { state: 'in_progress', at: at(10, 1, 12) },
        { state: 'verified', at: at(10, 5, 12) },
      ],
    }
    expect(stateAt(status, Date.parse(at(10, 2, 0, 0)))).toBe('in_progress')
  })
})
