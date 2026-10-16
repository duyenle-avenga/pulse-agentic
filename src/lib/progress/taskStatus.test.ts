import { describe, expect, it } from 'vitest'
import type { AcState } from '@/lib/domain/types'
import { at, pr, task } from '@/lib/mock/builders'
import { expenseTracker } from '@/lib/mock/project-a'
import { deriveAcStates } from './deriveAcStates'
import { acProgress, taskStatus } from './taskStatus'

const P = 'p'
const t = task(P, { id: 'T-1', title: 'Login', storyId: 'US-1', acIds: ['AC-1', 'AC-2'] })
const states = (a: AcState, b: AcState) => new Map<string, AcState>([['AC-1', a], ['AC-2', b]])
const openPr = pr(P, { number: 1, title: 'T-1 Login', taskIds: ['T-1'], state: 'open', openedAt: at(10, 1), ci: 'pending' })

describe('taskStatus', () => {
  it('is done when every AC is verified, even with an open PR', () => {
    expect(taskStatus(t, [openPr], states('verified', 'verified'))).toBe('done')
  })

  it('is in review when a linked PR is open', () => {
    expect(taskStatus(t, [openPr], states('implemented', 'not_started'))).toBe('in_review')
  })

  it('is in progress when any AC moved past not started, including failing', () => {
    expect(taskStatus(t, [], states('failing', 'not_started'))).toBe('in_progress')
    expect(taskStatus(t, [], states('pending_user_testing', 'verified'))).toBe('in_progress')
  })

  it('is not started otherwise, also for ACs outside the scope', () => {
    expect(taskStatus(t, [], states('not_started', 'not_started'))).toBe('not_started')
    expect(taskStatus(t, [], new Map())).toBe('not_started')
  })

  it('gives project A’s tasks the expected statuses', () => {
    const byAc = new Map(deriveAcStates(expenseTracker).map((s) => [s.acId, s.state]))
    expect(expenseTracker.tasks.map((x) => [x.id, taskStatus(x, expenseTracker.prs, byAc)])).toEqual([
      ['T-01', 'done'],
      ['T-02', 'done'],
      ['T-03', 'in_progress'],
      ['T-04', 'not_started'],
      ['T-05', 'in_review'],
      ['T-06', 'in_review'],
      ['T-07', 'not_started'],
    ])
  })
})

describe('acProgress', () => {
  it('counts verified ACs out of the task’s ACs', () => {
    expect(acProgress(t, states('verified', 'failing'))).toEqual({ verified: 1, total: 2 })
  })
})
