import type { PlannerBrief, PlannerDraft, PlannerQuestion, PlannedTask } from '@/lib/domain/planner'
import type { BoardKind, Feature } from '@/lib/domain/types'
import brief from './intelligent-flow-v2/brief.json'
import questions from './intelligent-flow-v2/questions.json'
import scope from './intelligent-flow-v2/scope.json'
import tasks from './intelligent-flow-v2/tasks.json'

const BOARDS: readonly BoardKind[] = ['none', 'github', 'jira']

// JSON imports widen string unions to string, so check the one union field and then narrow.
function toBrief(raw: typeof brief): PlannerBrief {
  if (!BOARDS.includes(raw.board as BoardKind)) throw new Error(`Unknown board "${raw.board}" in brief.json`)
  return { ...raw, board: raw.board as BoardKind }
}

export const intelligentFlowV2: PlannerDraft = {
  brief: toBrief(brief),
  questions: questions satisfies PlannerQuestion[],
  scope: scope satisfies { features: Feature[] },
  tasks: tasks satisfies PlannedTask[],
}

export const ALL_DRAFTS: PlannerDraft[] = [intelligentFlowV2]
