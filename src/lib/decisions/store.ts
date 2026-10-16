import type { ProjectDecisions, ScrDecision, StoryDecision } from '@/lib/domain/planner'
import type { HumanTestResult, IsoDateTime } from '@/lib/domain/types'

/** Where human decisions live. localStorage in the POC; a DB-backed version replaces it later. */
export interface DecisionStore {
  /** Empty decisions if none. Returns the same object until something changes. */
  get(projectId: string): ProjectDecisions
  /** Every project's decisions, by project id. Returns the same object until something changes. */
  getAll(): Readonly<Record<string, ProjectDecisions>>
  decideStory(projectId: string, storyId: string, decision: StoryDecision): void
  /** Applies the decision only to stories that are still undecided. */
  decideAll(projectId: string, storyIds: string[], decision: StoryDecision): void
  /** Doesn't check the decisions; the caller enforces the lock rule (see lockHint). */
  lock(projectId: string, lockedAt: IsoDateTime, lockedBy: string): void
  /** Appends a human test result recorded on the User testing screen. */
  recordHumanTest(projectId: string, result: HumanTestResult): void
  /** Records an approval or rejection. Ignored if this SCR already has a decision. */
  decideScr(projectId: string, scrId: string, decision: ScrDecision): void
  reset(projectId: string): void
  subscribe(listener: () => void): () => void
}
