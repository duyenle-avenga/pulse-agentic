'use client'

import { useState } from 'react'
import { getDecisionStore, useDecisions, useIsClient } from '@/lib/decisions/use-decisions'
import type { PlannerDraft } from '@/lib/domain/planner'
import type { IsoDateTime } from '@/lib/domain/types'
import { applyDecisions } from '@/lib/progress/applyDecisions'
import { DescribeStep } from './describe-step'
import { LockedStep } from './locked-step'
import { QuestionsStep } from './questions-step'
import { ReviewStep } from './review-step'
import { Stepper } from './stepper'

const STEP_INDEX = { describe: 0, questions: 1, review: 2, locked: 3 } as const
type Step = keyof typeof STEP_INDEX

/** Click-through demo of the greenfield flow. Content comes from the draft; only decisions are stored. */
export function Wizard({ draft, now, draftingMs = 900 }: { draft: PlannerDraft; now: IsoDateTime; draftingMs?: number }) {
  const projectId = draft.brief.projectId
  const isClient = useIsClient()
  const decisions = useDecisions(projectId)
  const [step, setStep] = useState<Step>('describe')
  const [drafting, setDrafting] = useState(false)

  // Decisions live in the browser; render nothing until we can read them, to avoid flashing step 1.
  if (!isClient) return null

  const store = getDecisionStore()
  const data = applyDecisions(draft, decisions)
  const current: Step = data ? 'locked' : step
  const storyIds = draft.scope.features.flatMap((f) => f.stories.map((s) => s.id))

  // Pretend the planner (an LLM later) takes a moment.
  const draftThen = (next: Step) => {
    setDrafting(true)
    setTimeout(() => {
      setDrafting(false)
      setStep(next)
    }, draftingMs)
  }

  return (
    <div className="space-y-6">
      <Stepper current={STEP_INDEX[current]} />
      {current === 'describe' && <DescribeStep brief={draft.brief} drafting={drafting} onSubmit={() => draftThen('questions')} />}
      {current === 'questions' && <QuestionsStep questions={draft.questions} drafting={drafting} onSubmit={() => draftThen('review')} />}
      {current === 'review' && (
        <ReviewStep
          features={draft.scope.features}
          decisions={decisions}
          onDecide={(storyId, decision) => store.decideStory(projectId, storyId, decision)}
          onApproveAll={() => store.decideAll(projectId, storyIds, 'approved')}
          onLock={() => store.lock(projectId, now, draft.brief.approver)}
        />
      )}
      {current === 'locked' && data && (
        <LockedStep
          data={data}
          onReset={() => {
            store.reset(projectId)
            setStep('describe')
          }}
        />
      )}
    </div>
  )
}
