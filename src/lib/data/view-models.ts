import { currentScope } from '@/lib/domain/scope'
import type { ProjectData, Severity } from '@/lib/domain/types'
import { recentActivity } from '@/lib/progress/activity'
import { deriveAcStates } from '@/lib/progress/deriveAcStates'
import { rollup } from '@/lib/progress/rollup'
import type { PortfolioRow, ProjectHeaderData, ProjectOverview } from './repository'

// Pure mappers from ProjectData to the view models. Used by the server repository and by client components.

const SEVERITY_RANK: Record<Severity, number> = { high: 0, medium: 1, low: 2 }

export function toProjectHeader({ project, scrs }: ProjectData): ProjectHeaderData {
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

export function toPortfolioRow(data: ProjectData): PortfolioRow {
  const header = toProjectHeader(data)
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
    openWarnings: data.warnings.length,
    highWarnings: data.warnings.filter((s) => s.severity === 'high').length,
    pendingApprovals: header.pendingApprovals,
    pendingUserTesting: r.pendingUserTesting,
    lastActivityAt: recentActivity(data, 1)[0]?.at ?? null,
  }
}

export function toProjectOverview(data: ProjectData): ProjectOverview {
  const topWarnings = [...data.warnings]
    .sort((a, b) => SEVERITY_RANK[a.severity] - SEVERITY_RANK[b.severity] || Date.parse(a.raisedAt) - Date.parse(b.raisedAt))
    .slice(0, 5)
  return {
    header: toProjectHeader(data),
    rollup: rollup(deriveAcStates(data)),
    topWarnings,
    activity: recentActivity(data),
  }
}
