import type { AcState, BoardKind, ProjectKind, Severity } from '@/lib/domain/types'

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

/** Tailwind background classes backed by the --ac-* tokens in globals.css (light and dark); the burn-up chart uses the same tokens. */
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
