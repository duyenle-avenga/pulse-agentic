import type { ProjectDecisions, StoryDecision } from '@/lib/domain/planner'
import type { IsoDateTime } from '@/lib/domain/types'

/** Where human decisions live. localStorage in the POC; a DB-backed version replaces it later. */
export interface DecisionStore {
  /** Empty decisions if none. Returns the same object until something changes. */
  get(projectId: string): ProjectDecisions
  decideStory(projectId: string, storyId: string, decision: StoryDecision): void
  /** Applies the decision only to stories that are still undecided. */
  decideAll(projectId: string, storyIds: string[], decision: StoryDecision): void
  lock(projectId: string, lockedAt: IsoDateTime, lockedBy: string): void
  reset(projectId: string): void
  subscribe(listener: () => void): () => void
}
