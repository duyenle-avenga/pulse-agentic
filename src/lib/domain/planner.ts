import type { BoardKind, Feature, IsoDateTime, Task } from './types'

/** The project the demo wizard creates. */
export const WIZARD_PROJECT_ID = 'intelligent-flow-v2'

export interface PlannerBrief {
  projectId: string
  name: string
  goal: string
  users: string
  constraints: string
  tech: string
  nonGoals: string
  approver: string
  repoUrl: string
  board: BoardKind
  boardKey?: string
}

export interface PlannerQuestion {
  id: string
  question: string
  options: string[]
  answer: string
}

export type PlannedTask = Omit<Task, 'projectId'>

/** What the planner (an LLM later; JSON in the POC) proposes for a new project. */
export interface PlannerDraft {
  brief: PlannerBrief
  questions: PlannerQuestion[]
  scope: { features: Feature[] }
  tasks: PlannedTask[]
}

export type StoryDecision = 'approved' | 'rejected'

/** Human decisions about a draft. The only thing stored in localStorage. */
export interface ProjectDecisions {
  stories: Record<string, StoryDecision>
  lock: { lockedAt: IsoDateTime; lockedBy: string } | null
}

export const EMPTY_DECISIONS: ProjectDecisions = Object.freeze({ stories: Object.freeze({}), lock: null }) as ProjectDecisions
