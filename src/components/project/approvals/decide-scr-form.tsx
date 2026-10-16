'use client'

import { useState } from 'react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Textarea } from '@/components/ui/textarea'
import { getDecisionStore } from '@/lib/decisions/use-decisions'
import type { ScrDecision } from '@/lib/domain/planner'
import type { IsoDateTime } from '@/lib/domain/types'

interface Props {
  projectId: string
  scrId: string
  defaultApprover: string
  now: IsoDateTime
  /** Called right before the decision is stored, so a caller can record that focus should follow it. */
  onDecided?: () => void
}

interface Invalid {
  approver: boolean
  reason: boolean
}

const NOT_INVALID: Invalid = { approver: false, reason: false }

export function DecideScrForm({ projectId, scrId, defaultApprover, now, onDecided }: Props) {
  const [approver, setApprover] = useState(defaultApprover)
  const [reason, setReason] = useState('')
  const [errors, setErrors] = useState<string[]>([])
  const [invalid, setInvalid] = useState<Invalid>(NOT_INVALID)
  const id = (field: string) => `${scrId}-${field}`
  const errorsId = id('decision-errors')

  function decide(status: ScrDecision['status']) {
    const nextInvalid: Invalid = { approver: !approver.trim(), reason: !reason.trim() }
    const missing = [...(nextInvalid.approver ? ['Enter the approver’s name.'] : []), ...(nextInvalid.reason ? ['Enter a reason.'] : [])]
    setInvalid(nextInvalid)
    setErrors(missing)
    if (missing.length > 0) return
    onDecided?.()
    getDecisionStore().decideScr(projectId, scrId, { status, decidedAt: now, decidedBy: approver.trim(), reason: reason.trim() })
  }

  return (
    // Approve and Reject are equal, explicit choices (the spec §3.5): no submit button, so Enter
    // in a field can't silently approve. The form groups the fields for layout and labelling only.
    <form aria-label={`Decide ${scrId}`} noValidate onSubmit={(e) => e.preventDefault()} className="space-y-3 border-t pt-3">
      <div className="grid gap-3 sm:grid-cols-[14rem_1fr]">
        <div className="space-y-1">
          <Label htmlFor={id('approver')}>Approver</Label>
          <Input
            id={id('approver')}
            value={approver}
            onChange={(e) => setApprover(e.target.value)}
            aria-invalid={invalid.approver || undefined}
            aria-describedby={invalid.approver ? errorsId : undefined}
          />
        </div>
        <div className="space-y-1">
          <Label htmlFor={id('reason')}>Reason</Label>
          <Textarea
            id={id('reason')}
            value={reason}
            onChange={(e) => setReason(e.target.value)}
            aria-invalid={invalid.reason || undefined}
            aria-describedby={invalid.reason ? errorsId : undefined}
          />
        </div>
      </div>
      {errors.length > 0 && (
        <ul role="alert" id={errorsId} className="text-sm text-destructive">
          {errors.map((e) => (
            <li key={e}>{e}</li>
          ))}
        </ul>
      )}
      <div className="flex gap-2">
        <Button type="button" size="sm" aria-label={`Approve ${scrId}`} onClick={() => decide('approved')}>
          Approve
        </Button>
        <Button type="button" size="sm" variant="outline" aria-label={`Reject ${scrId}`} onClick={() => decide('rejected')}>
          Reject
        </Button>
      </div>
    </form>
  )
}
