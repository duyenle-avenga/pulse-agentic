import { WIZARD_PROJECT_ID } from '@/lib/domain/planner'
import type { AcState, BoardKind, CiStatus, Project, ProjectKind, ScopeChangeRequest, Severity, TestPlanMark } from '@/lib/domain/types'
import type { TaskStatus } from '@/lib/progress/taskStatus'

export const KIND_LABEL: Record<ProjectKind, string> = { greenfield: 'Greenfield', brownfield: 'Brownfield' }

export const BOARD_LABEL: Record<BoardKind, string> = { none: 'No board', github: 'GitHub Issues', jira: 'Jira' }

export const AC_STATE_LABEL: Record<AcState, string> = {
  verified: 'Verified',
  pending_user_testing: 'Pending user testing',
  implemented: 'Implemented',
  in_progress: 'In progress',
  failing: 'Failing',
  regressed: 'Regressed',
  not_started: 'Not started',
}

/** Tailwind background classes backed by the --ac-* tokens in globals.css (light and dark). */
export const AC_STATE_COLOR: Record<AcState, string> = {
  verified: 'bg-(--ac-verified)',
  pending_user_testing: 'bg-(--ac-pending-user-testing)',
  implemented: 'bg-(--ac-implemented)',
  in_progress: 'bg-(--ac-in-progress)',
  failing: 'bg-(--ac-failing)',
  regressed: 'bg-(--ac-regressed)',
  not_started: 'bg-muted-foreground/25',
}

export const SEVERITY_VARIANT: Record<Severity, 'destructive' | 'default' | 'secondary'> = {
  high: 'destructive',
  medium: 'default',
  low: 'secondary',
}

export const TASK_STATUS_LABEL: Record<TaskStatus, string> = {
  not_started: 'Not started',
  in_progress: 'In progress',
  in_review: 'In review',
  done: 'Done',
}

export const CI_LABEL: Record<CiStatus, string> = { passing: 'CI passing', failing: 'CI failing', pending: 'CI pending', none: 'No CI' }

export const MARK_LABEL: Record<TestPlanMark, string> = { ticked: 'Ticked', unticked: 'Unticked', failed: 'Reported failing' }

/** "Agent · PR #5", "Pulse", "Human" */
export function scrSourceLabel({ source, prNumber }: Pick<ScopeChangeRequest, 'source' | 'prNumber'>): string {
  if (source === 'agent_pr') return prNumber !== undefined ? `Agent · PR #${prNumber}` : 'Agent'
  return source === 'pulse' ? 'Pulse' : 'Human'
}

/** How a project's v1 came to be (README §3.6): imported for brownfield, the wizard for Intelligent Flow v2, otherwise greenfield's own initial scope. */
export function scopeOriginLabel({ id, kind }: Pick<Project, 'id' | 'kind'>): string {
  if (id === WIZARD_PROJECT_ID) return 'Scope from the wizard'
  return kind === 'brownfield' ? 'Baseline scope' : 'Initial scope'
}
