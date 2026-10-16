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

/** Tailwind background classes; the burn-up chart uses the same hues. */
export const AC_STATE_COLOR: Record<AcState, string> = {
  verified: 'bg-emerald-600',
  pending_user_testing: 'bg-violet-500',
  implemented: 'bg-sky-500',
  in_progress: 'bg-amber-400',
  failing: 'bg-red-500',
  regressed: 'bg-rose-800',
  not_started: 'bg-muted-foreground/25',
}

export const SEVERITY_VARIANT: Record<Severity, 'destructive' | 'default' | 'secondary'> = {
  high: 'destructive',
  medium: 'default',
  low: 'secondary',
}
