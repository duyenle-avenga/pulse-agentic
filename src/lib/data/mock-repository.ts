import { currentScope } from '@/lib/domain/scope'
import type { IsoDateTime, ProjectData, Severity } from '@/lib/domain/types'
import { recentActivity } from '@/lib/progress/activity'
import { burnup } from '@/lib/progress/burnup'
import { deriveAcStates } from '@/lib/progress/deriveAcStates'
import { rollup } from '@/lib/progress/rollup'
import type { ProjectHeaderData, PulseRepository } from './repository'

const SEVERITY_RANK: Record<Severity, number> = { high: 0, medium: 1, low: 2 }

function headerOf({ project, scrs }: ProjectData): ProjectHeaderData {
  const scope = currentScope(project)
  return {
    id: project.id,
    name: project.name,
    description: project.description,
    kind: project.kind,
    board: project.board,
    boardKey: project.boardKey,
    repoUrl: project.repoUrl,
    scopeLabel: scope.label,
    lockedAt: scope.lockedAt,
    approvedBy: scope.approvedBy,
    pendingApprovals: scrs.filter((s) => s.status === 'pending').length,
  }
}

export function createMockRepository(projects: ProjectData[], now: IsoDateTime): PulseRepository {
  const find = (id: string) => projects.find((d) => d.project.id === id)

  return {
    async getPortfolio() {
      return projects.map((data) => {
        const header = headerOf(data)
        const r = rollup(deriveAcStates(data))
        return {
          id: header.id,
          name: header.name,
          kind: header.kind,
          board: header.board,
          boardKey: header.boardKey,
          scopeLabel: header.scopeLabel,
          completionPct: r.completionPct,
          deliveryPct: r.deliveryPct,
          verified: r.counts.verified,
          total: r.total,
          openSignals: data.signals.length,
          highSignals: data.signals.filter((s) => s.severity === 'high').length,
          pendingApprovals: header.pendingApprovals,
          pendingUserTesting: r.pendingUserTesting,
          lastActivityAt: recentActivity(data, 1)[0]?.at ?? null,
        }
      })
    },

    async getProjectHeader(projectId) {
      const data = find(projectId)
      return data ? headerOf(data) : null
    },

    async getProjectOverview(projectId) {
      const data = find(projectId)
      if (!data) return null
      const statuses = deriveAcStates(data)
      const topSignals = [...data.signals]
        .sort((a, b) => SEVERITY_RANK[a.severity] - SEVERITY_RANK[b.severity] || Date.parse(a.raisedAt) - Date.parse(b.raisedAt))
        .slice(0, 5)
      return {
        header: headerOf(data),
        rollup: rollup(statuses),
        burnup: burnup(data.project, statuses, now),
        topSignals,
        activity: recentActivity(data),
      }
    },
  }
}
