import type { BoardKind, IsoDateTime, ProjectKind, Signal } from '@/lib/domain/types'
import type { ActivityEvent } from '@/lib/progress/activity'
import type { BurnupPoint } from '@/lib/progress/burnup'
import type { Rollup } from '@/lib/progress/rollup'

export interface PortfolioRow {
  id: string
  name: string
  kind: ProjectKind
  board: BoardKind
  boardKey?: string
  scopeLabel: string
  completionPct: number
  deliveryPct: number
  verified: number
  total: number
  openSignals: number
  highSignals: number
  pendingApprovals: number
  pendingUserTesting: number
  lastActivityAt: IsoDateTime | null
}

export interface ProjectHeaderData {
  id: string
  name: string
  description: string
  kind: ProjectKind
  board: BoardKind
  boardKey?: string
  repoUrl?: string
  scopeLabel: string
  lockedAt: IsoDateTime
  approvedBy: string
  pendingApprovals: number
}

export interface ProjectOverview {
  header: ProjectHeaderData
  rollup: Rollup
  burnup: BurnupPoint[]
  topSignals: Signal[]
  activity: ActivityEvent[]
}

/** The only way the UI reads data. Swap the implementation for a real DB later. */
export interface PulseRepository {
  getPortfolio(): Promise<PortfolioRow[]>
  getProjectHeader(projectId: string): Promise<ProjectHeaderData | null>
  getProjectOverview(projectId: string): Promise<ProjectOverview | null>
}
