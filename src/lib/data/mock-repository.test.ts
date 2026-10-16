import { describe, expect, it } from 'vitest'
import { ALL_PROJECTS } from '@/lib/mock'
import { ALL_DRAFTS } from '@/lib/mock/planner'
import { createMockRepository } from './mock-repository'

const repo = createMockRepository(ALL_PROJECTS, ALL_DRAFTS)

describe('MockRepository.getProjectData', () => {
  it('returns a project’s raw data, or null for drafts and unknown ids', async () => {
    expect((await repo.getProjectData('customer-portal'))?.project.name).toBe('Customer portal')
    expect(await repo.getProjectData('intelligent-flow-v2')).toBeNull()
    expect(await repo.getProjectData('nope')).toBeNull()
  })

  it('lists every project, without drafts', async () => {
    expect((await repo.getAllProjectData()).map((d) => d.project.id)).toEqual(['expense-tracker', 'customer-portal', 'intelligent-flow'])
  })
})

describe('MockRepository.getPlannerDraft', () => {
  it('returns the Intelligent Flow v2 draft, or null for any other id', async () => {
    const draft = await repo.getPlannerDraft('intelligent-flow-v2')
    expect(draft?.brief.name).toBe('Intelligent Flow v2')
    expect(await repo.getPlannerDraft('intelligent-flow')).toBeNull()
    expect(await repo.getPlannerDraft('nope')).toBeNull()
  })
})
