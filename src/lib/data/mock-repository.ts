import type { PlannerDraft } from '@/lib/domain/planner'
import type { ProjectData } from '@/lib/domain/types'
import type { PulseRepository } from './repository'

export function createMockRepository(projects: ProjectData[], drafts: PlannerDraft[] = []): PulseRepository {
  return {
    async getProjectData(projectId) {
      return projects.find((d) => d.project.id === projectId) ?? null
    },

    async getAllProjectData() {
      return projects
    },

    async getPlannerDraft(projectId) {
      return drafts.find((d) => d.brief.projectId === projectId) ?? null
    },
  }
}
