import type { ProjectData } from '@/lib/domain/types'
import type { PulseRepository } from './repository'
import { toPortfolioRow, toProjectHeader, toProjectOverview } from './view-models'

export function createMockRepository(projects: ProjectData[]): PulseRepository {
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
  }
}
