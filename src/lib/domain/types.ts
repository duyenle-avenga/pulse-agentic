export type IsoDateTime = string

export type ProjectKind = 'greenfield' | 'brownfield'
export type BoardKind = 'none' | 'github' | 'jira'

export interface AcceptanceCriterion {
  id: string
  text: string
  /** 👤 needs a human tester */
  humanTest: boolean
}

export interface UserStory {
  id: string
  text: string
  acs: AcceptanceCriterion[]
}

export interface Feature {
  id: string
  title: string
  stories: UserStory[]
}

export interface ScopeVersion {
  label: string
  lockedAt: IsoDateTime
  approvedBy: string
  features: Feature[]
}

export interface Project {
  id: string
  name: string
  description: string
  kind: ProjectKind
  board: BoardKind
  repoUrl?: string
  boardKey?: string
  hasCi: boolean
  /** Ordered oldest first; the last one is the current version. */
  scopeVersions: ScopeVersion[]
}

export interface Task {
  id: string
  projectId: string
  title: string
  intent: string
  storyId: string
  acIds: string[]
  dependsOn: string[]
  agent?: string
  externalKey?: string
}

export type PrState = 'open' | 'merged' | 'closed'
export type CiStatus = 'passing' | 'failing' | 'pending' | 'none'
export type TestPlanMark = 'ticked' | 'unticked' | 'failed'
export type TestType = 'unit' | 'integration' | 'e2e' | 'manual'

export interface TestPlanItem {
  /** Absent when the item names no AC (unplanned). */
  acId?: string
  text: string
  mark: TestPlanMark
  testType?: TestType
  testFile?: string
}

export interface PrSections {
  summary: boolean
  migration: boolean
  testPlan: boolean
  notes: boolean
}

/** A PR as the Traceability engine would store it after parsing the description. */
export interface PullRequest {
  number: number
  projectId: string
  title: string
  taskIds: string[]
  state: PrState
  openedAt: IsoDateTime
  mergedAt?: IsoDateTime
  headSha: string
  ci: CiStatus
  sections: PrSections
  testPlan: TestPlanItem[]
  scopeChangeNotes: string[]
}

export interface HumanTestResult {
  acId: string
  result: 'pass' | 'fail'
  environment: string
  tester: string
  testedAt: IsoDateTime
  notes?: string
}

export type ScrSource = 'agent_pr' | 'human' | 'pulse'
export type ScrStatus = 'pending' | 'approved' | 'rejected'

export interface ScopeChangeRequest {
  id: string
  projectId: string
  title: string
  source: ScrSource
  prNumber?: number
  status: ScrStatus
  raisedAt: IsoDateTime
  decidedAt?: IsoDateTime
  decidedBy?: string
  rationale?: string
}

export type WarningType =
  | 'stalled_task'
  | 'unchecked_acs_merged'
  | 'ticked_but_red'
  | 'red_main'
  | 'regression'
  | 'rework_loop'
  | 'pending_user_testing'
  | 'pr_format'
  | 'pending_decision'
  | 'unplanned_work'
  | 'dependency_block'

export type Severity = 'high' | 'medium' | 'low'

export interface Warning {
  id: string
  projectId: string
  type: WarningType
  severity: Severity
  message: string
  suggestedAction: string
  raisedAt: IsoDateTime
  links: { taskId?: string; prNumber?: number; acId?: string }
}

export type AcState =
  | 'not_started'
  | 'in_progress'
  | 'implemented'
  | 'verified'
  | 'failing'
  | 'regressed'
  | 'pending_user_testing'

/** Display order, best first. */
export const AC_STATES: readonly AcState[] = [
  'verified',
  'pending_user_testing',
  'implemented',
  'in_progress',
  'failing',
  'regressed',
  'not_started',
]

/** Everything the mock layer stores for one project. */
export interface ProjectData {
  project: Project
  tasks: Task[]
  prs: PullRequest[]
  humanTests: HumanTestResult[]
  scrs: ScopeChangeRequest[]
  warnings: Warning[]
}
