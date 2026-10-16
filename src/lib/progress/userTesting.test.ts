import { describe, expect, it } from 'vitest'
import { intelligentFlow } from '@/lib/mock/project-c'
import { deriveAcStates } from './deriveAcStates'
import { userTestingQueue } from './userTesting'

describe('userTestingQueue', () => {
  const queue = userTestingQueue(intelligentFlow, deriveAcStates(intelligentFlow))

  it('lists 👤 ACs pending user testing, oldest first', () => {
    expect(queue.map((q) => q.ac.id)).toEqual(['AC-3.1.5', 'AC-5.1.5', 'AC-6.1.4'])
  })

  it('names the story, task and the PR that delivered each AC', () => {
    expect(queue[0]).toMatchObject({
      storyId: 'US-3.1', taskId: 'T-14', prNumber: 206, mergedAt: '2026-09-25T17:00:00+02:00', waitingSince: '2026-09-25T17:00:00+02:00',
    })
  })

  it('is empty when nothing is merged', () => {
    const noPrs = { ...intelligentFlow, prs: [] }
    expect(userTestingQueue(noPrs, deriveAcStates(noPrs))).toEqual([])
  })
})
