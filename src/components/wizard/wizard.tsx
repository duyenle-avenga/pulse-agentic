'use client'

import { useEffect, useLayoutEffect, useRef, useState } from 'react'
import { getDecisionStore, useDecisions, useIsClient } from '@/lib/decisions/use-decisions'
import type { PlannerDraft } from '@/lib/domain/planner'
import type { IsoDateTime } from '@/lib/domain/types'
import { applyDecisions } from '@/lib/progress/applyDecisions'
import { lockHint } from '@/lib/wizard/lock-rule'
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
  const timer = useRef<ReturnType<typeof setTimeout> | null>(null)
  const container = useRef<HTMLDivElement>(null)
  const shownStep = useRef<Step | null>(null)

  const data = applyDecisions(draft, decisions)
  const current: Step = data ? 'locked' : step

  // Don't let a pending "drafting" timer fire after the wizard is gone.
  useEffect(() => () => clearDraftTimer(timer), [])

  // When the step changes (not on first render), move focus to its heading so keyboard and screen reader users follow along.
  useLayoutEffect(() => {
    if (!isClient) return
    const previous = shownStep.current
    shownStep.current = current
    if (previous === null || previous === current) return
    const heading = container.current?.querySelector('h2')
    if (!heading) return
    heading.tabIndex = -1
    heading.focus()
  }, [isClient, current])

  // Decisions live in the browser; render nothing until we can read them, to avoid flashing step 1.
  if (!isClient) return null

  const store = getDecisionStore()
  const storyIds = draft.scope.features.flatMap((f) => f.stories.map((s) => s.id))

  // Pretend the planner (an LLM later) takes a moment.
  const draftThen = (next: Step) => {
    clearDraftTimer(timer)
    setDrafting(true)
    timer.current = setTimeout(() => {
      timer.current = null
      setDrafting(false)
      setStep(next)
    }, draftingMs)
  }

  return (
    <div ref={container} className="space-y-6">
      <p role="status" aria-live="polite" className="sr-only">
        {drafting ? 'Planner is drafting…' : ''}
      </p>
      <Stepper current={STEP_INDEX[current]} />
      {current === 'describe' && <DescribeStep brief={draft.brief} drafting={drafting} onSubmit={() => draftThen('questions')} />}
      {current === 'questions' && <QuestionsStep questions={draft.questions} drafting={drafting} onSubmit={() => draftThen('review')} />}
      {current === 'review' && (
        <ReviewStep
          features={draft.scope.features}
          decisions={decisions}
          onDecide={(storyId, decision) => store.decideStory(projectId, storyId, decision)}
          onApproveAll={() => store.decideAll(projectId, storyIds, 'approved')}
          onLock={() => {
            if (lockHint(storyIds, decisions) === null) store.lock(projectId, now, draft.brief.approver)
          }}
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

function clearDraftTimer(timer: { current: ReturnType<typeof setTimeout> | null }) {
  if (timer.current !== null) clearTimeout(timer.current)
  timer.current = null
}
