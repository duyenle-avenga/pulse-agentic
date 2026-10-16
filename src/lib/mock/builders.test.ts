import { describe, expect, it } from 'vitest'
import { at, failedItem, pr, task, ticked, unticked } from './builders'

describe('at', () => {
  it('builds a Europe/Berlin summer-time timestamp in 2026', () => {
    expect(at(10, 6, 14, 30)).toBe('2026-10-06T14:30:00+02:00')
    expect(at(9, 2)).toBe('2026-09-02T09:00:00+02:00')
  })
})

describe('test plan items', () => {
  it('builds ticked, unticked and failed items', () => {
    expect(ticked('AC-1', 'e2e', 'a.spec.ts')).toEqual({ acId: 'AC-1', text: 'AC-1', mark: 'ticked', testType: 'e2e', testFile: 'a.spec.ts' })
    expect(unticked('AC-2')).toEqual({ acId: 'AC-2', text: 'AC-2', mark: 'unticked' })
    expect(failedItem('AC-3', 'unit')).toEqual({ acId: 'AC-3', text: 'AC-3', mark: 'failed', testType: 'unit', testFile: undefined })
  })
})

describe('task', () => {
  it('fills in project id and defaults', () => {
    expect(task('p', { id: 'T-1', title: 't', storyId: 'US-1', acIds: ['AC-1'] })).toEqual({
      id: 'T-1', title: 't', storyId: 'US-1', acIds: ['AC-1'], intent: '', dependsOn: [], projectId: 'p',
    })
  })

  it('keeps explicit intent, dependsOn, agent and externalKey', () => {
    expect(task('p', { id: 'T-1', title: 't', storyId: 'US-1', acIds: ['AC-1'], intent: 'Build feature X', dependsOn: ['T-2', 'T-3'], agent: 'alice', externalKey: 'key123' })).toEqual({
      id: 'T-1', title: 't', storyId: 'US-1', acIds: ['AC-1'], intent: 'Build feature X', dependsOn: ['T-2', 'T-3'], agent: 'alice', externalKey: 'key123', projectId: 'p',
    })
  })
})

describe('pr', () => {
  it('derives sections from the test plan and notes, and fills defaults', () => {
    const p = pr('p', { number: 7, title: 'T-1 x', state: 'open', openedAt: at(10, 1), ci: 'pending' })
    expect(p.projectId).toBe('p')
    expect(p.taskIds).toEqual([])
    expect(p.headSha).toMatch(/^[0-9a-f]{7}$/)
    expect(p.sections).toEqual({ summary: true, migration: false, testPlan: false, notes: false })

    const q = pr('p', {
      number: 8, title: 'T-1 y', state: 'open', openedAt: at(10, 1), ci: 'pending',
      testPlan: [unticked('AC-1')], scopeChangeNotes: ['Scope change: z'], sections: { migration: true },
    })
    expect(q.sections).toEqual({ summary: true, migration: true, testPlan: true, notes: true })
  })

  it('keeps explicit taskIds, headSha and mergedAt', () => {
    const p = pr('p', { number: 7, title: 'T-1 x', state: 'merged', openedAt: at(10, 1), ci: 'pass', taskIds: ['T-1', 'T-2'], headSha: 'abc1234', mergedAt: at(10, 2, 15, 30) })
    expect(p.taskIds).toEqual(['T-1', 'T-2'])
    expect(p.headSha).toBe('abc1234')
    expect(p.mergedAt).toBe(at(10, 2, 15, 30))
  })
})
