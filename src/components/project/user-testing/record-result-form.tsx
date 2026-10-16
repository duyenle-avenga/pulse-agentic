'use client'

import { useState, type FormEvent } from 'react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Textarea } from '@/components/ui/textarea'
import { getDecisionStore } from '@/lib/decisions/use-decisions'
import type { IsoDateTime } from '@/lib/domain/types'
import { formatDate } from '@/lib/format'

interface Props {
  projectId: string
  acId: string
  now: IsoDateTime
  defaultEnvironment: string
  onCancel: () => void
  onSaved: () => void
}

interface Invalid {
  result: boolean
  environment: boolean
  tester: boolean
}

const NOT_INVALID: Invalid = { result: false, environment: false, tester: false }

export function RecordResultForm({ projectId, acId, now, defaultEnvironment, onCancel, onSaved }: Props) {
  const [result, setResult] = useState<'pass' | 'fail' | null>(null)
  const [environment, setEnvironment] = useState(defaultEnvironment)
  const [tester, setTester] = useState('')
  const [notes, setNotes] = useState('')
  const [errors, setErrors] = useState<string[]>([])
  const [invalid, setInvalid] = useState<Invalid>(NOT_INVALID)
  const id = (field: string) => `${acId}-${field}`
  const errorsId = id('errors')

  function handleSubmit(e: FormEvent<HTMLFormElement>) {
    e.preventDefault()
    const nextInvalid: Invalid = { result: !result, environment: !environment.trim(), tester: !tester.trim() }
    const missing = [
      ...(nextInvalid.result ? ['Choose pass or fail.'] : []),
      ...(nextInvalid.environment ? ['Enter the environment.'] : []),
      ...(nextInvalid.tester ? ['Enter the tester’s name.'] : []),
    ]
    setInvalid(nextInvalid)
    setErrors(missing)
    if (!result || missing.length > 0) return
    getDecisionStore().recordHumanTest(projectId, {
      acId,
      result,
      environment: environment.trim(),
      tester: tester.trim(),
      testedAt: now,
      ...(notes.trim() ? { notes: notes.trim() } : {}),
    })
    onSaved()
  }

  return (
    <form aria-label={`Record result for ${acId}`} noValidate onSubmit={handleSubmit} className="space-y-3 rounded-lg border p-3">
      <fieldset
        role="radiogroup"
        className="space-y-1"
        aria-invalid={invalid.result || undefined}
        aria-describedby={invalid.result ? errorsId : undefined}
      >
        <legend className="text-sm font-medium">Result</legend>
        <div className="flex gap-4">
          {(['pass', 'fail'] as const).map((r) => (
            <label key={r} className="flex items-center gap-1.5 text-sm">
              <input type="radio" name={id('result')} value={r} checked={result === r} onChange={() => setResult(r)} />
              {r === 'pass' ? 'Pass' : 'Fail'}
            </label>
          ))}
        </div>
      </fieldset>
      <div className="grid gap-3 sm:grid-cols-2">
        <div className="space-y-1">
          <Label htmlFor={id('environment')}>Environment</Label>
          <Input
            id={id('environment')}
            value={environment}
            onChange={(e) => setEnvironment(e.target.value)}
            placeholder="e.g. a staging URL"
            aria-invalid={invalid.environment || undefined}
            aria-describedby={invalid.environment ? errorsId : undefined}
          />
        </div>
        <div className="space-y-1">
          <Label htmlFor={id('tester')}>Tester</Label>
          <Input
            id={id('tester')}
            value={tester}
            onChange={(e) => setTester(e.target.value)}
            aria-invalid={invalid.tester || undefined}
            aria-describedby={invalid.tester ? errorsId : undefined}
          />
        </div>
      </div>
      <p className="text-sm text-muted-foreground">{`Date: ${formatDate(now)}`}</p>
      <div className="space-y-1">
        <Label htmlFor={id('notes')}>Notes (optional)</Label>
        <Textarea id={id('notes')} value={notes} onChange={(e) => setNotes(e.target.value)} placeholder="Devices, screenshot link…" />
      </div>
      {errors.length > 0 && (
        <ul role="alert" id={errorsId} className="text-sm text-destructive">
          {errors.map((e) => (
            <li key={e}>{e}</li>
          ))}
        </ul>
      )}
      <div className="flex gap-2">
        <Button type="submit" size="sm">
          Save result
        </Button>
        <Button type="button" size="sm" variant="outline" onClick={onCancel}>
          Cancel
        </Button>
      </div>
    </form>
  )
}
