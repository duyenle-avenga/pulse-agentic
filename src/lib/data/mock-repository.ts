import type { PlannerDraft } from '@/lib/domain/planner'
import type { ProjectData } from '@/lib/domain/types'
import type { PulseRepository } from './repository'
import { toPortfolioRow, toProjectHeader, toProjectOverview } from './view-models'

export function createMockRepository(projects: ProjectData[], drafts: PlannerDraft[] = []): PulseRepository {
  const find = (id: string) => projects.find((d) => d.project.id === id)

  return {
    async getPortfolio() {
      return projects.map(toPortfolioRow)
    },

    async getProjectHeader(projectId) {
      const data = find(projectId)
      return data ? toProjectHeader(data) : null
    },

    async getProjectOverview(projectId) {
      const data = find(projectId)
      return data ? toProjectOverview(data) : null
    },

    async getProjectData(projectId) {
      return find(projectId) ?? null
    },

    async getAllProjectData() {
      return projects
    },

    async getPlannerDraft(projectId) {
      return drafts.find((d) => d.brief.projectId === projectId) ?? null
    },
  }
}
