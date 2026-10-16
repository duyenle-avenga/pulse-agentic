'use client'

import { useLayoutEffect, useRef } from 'react'
import { currentScope } from '@/lib/domain/scope'
import { useProject } from '../project-data-provider'
import { ScreenHeading } from '../screen-heading'
import { ScrCard } from './scr-card'

export function ApprovalsView() {
  const { data, now } = useProject()
  const approver = currentScope(data.project).approvedBy
  const pending = data.scrs.filter((s) => s.status === 'pending').sort((a, b) => Date.parse(a.raisedAt) - Date.parse(b.raisedAt))
  const decided = data.scrs
    .filter((s) => s.status !== 'pending')
    .sort((a, b) => Date.parse(b.decidedAt ?? b.raisedAt) - Date.parse(a.decidedAt ?? a.raisedAt))

  const decidedHeading = useRef<HTMLHeadingElement>(null)
  const pendingFocus = useRef(false)

  // A decided SCR's card moves out of "Waiting for a decision" into "Decided", taking its form
  // (and the focused button) with it. Follow with focus to the Decided heading, as the User
  // testing screen does when a recorded result removes an AC from its queue. But a pending SCR
  // can also disappear for reasons that have nothing to do with this screen being used right now
  // (e.g. hydration applies a decision stored in an earlier visit), so only move focus when the
  // intent was recorded by an actual Approve/Reject click (see handleDecided below).
  useLayoutEffect(() => {
    if (!pendingFocus.current) return
    pendingFocus.current = false
    decidedHeading.current?.focus()
  })

  function handleDecided() {
    pendingFocus.current = true
  }

  return (
    <div className="space-y-6">
      <ScreenHeading title="Approvals" description="Scope change requests. Approving one creates the next scope version." />
      <section aria-labelledby="pending-heading" className="space-y-3">
        <h3 id="pending-heading" className="font-medium">{`Waiting for a decision (${pending.length})`}</h3>
        {pending.length === 0 && <p className="text-sm text-muted-foreground">Nothing waiting for approval.</p>}
        {pending.map((scr) => (
          <ScrCard key={scr.id} scr={scr} data={data} now={now} defaultApprover={approver} onDecided={handleDecided} />
        ))}
      </section>
      {decided.length > 0 && (
        <section aria-labelledby="decided-heading" className="space-y-3">
          <h3 id="decided-heading" ref={decidedHeading} tabIndex={-1} className="font-medium">{`Decided (${decided.length})`}</h3>
          {decided.map((scr) => (
            <ScrCard key={scr.id} scr={scr} data={data} now={now} defaultApprover={approver} />
          ))}
        </section>
      )}
    </div>
  )
}
