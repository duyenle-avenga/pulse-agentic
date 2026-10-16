'use client'

import { useLayoutEffect, useRef, useState } from 'react'
import { Button } from '@/components/ui/button'
import { Card, CardContent } from '@/components/ui/card'
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table'
import { formatDate, formatDuration } from '@/lib/format'
import { userTestingQueue } from '@/lib/progress/userTesting'
import { useProject } from '../project-data-provider'
import { ScreenHeading } from '../screen-heading'
import { RecordResultForm } from './record-result-form'

export function UserTestingView() {
  const { data, acStates, now } = useProject()
  const [open, setOpen] = useState<string | null>(null)
  const queue = userTestingQueue(data, acStates)
  const results = [...data.humanTests].sort((a, b) => Date.parse(b.testedAt) - Date.parse(a.testedAt))
  const lastEnvironment = results[0]?.environment ?? ''

  const container = useRef<HTMLDivElement>(null)
  const resultsHeading = useRef<HTMLHeadingElement>(null)
  const previouslyOpen = useRef<string | null>(null)
  const pendingFocus = useRef<'cancel' | 'saved' | null>(null)

  // When the inline form closes, follow it with focus: back to its trigger after Cancel (the AC is still in the
  // queue), or to the results heading after a save (the AC just left the queue, so its trigger button is gone).
  useLayoutEffect(() => {
    const previous = previouslyOpen.current
    previouslyOpen.current = open
    const action = pendingFocus.current
    pendingFocus.current = null
    if (open !== null || previous === null || !action) return
    if (action === 'saved') {
      resultsHeading.current?.focus()
    } else {
      container.current?.querySelector<HTMLButtonElement>(`[aria-label="Record result for ${previous}"]`)?.focus()
    }
  }, [open])

  function closeForm(action: 'cancel' | 'saved') {
    pendingFocus.current = action
    setOpen(null)
  }

  return (
    <div ref={container} className="space-y-6">
      <ScreenHeading title="User testing" description="👤 ACs whose code is merged and that wait for a human result." />

      <section aria-labelledby="queue-heading" className="space-y-3">
        <h3 id="queue-heading" className="font-medium">{`Waiting for a tester (${queue.length})`}</h3>
        {queue.length === 0 ? (
          <p className="text-sm text-muted-foreground">No ACs are waiting for a tester.</p>
        ) : (
          <ul className="space-y-3">
            {queue.map((item) => {
              const delivered = [item.taskId, item.prNumber !== undefined ? `PR #${item.prNumber} merged ${item.mergedAt ? formatDate(item.mergedAt) : ''}` : undefined]
                .filter(Boolean)
                .join(' · ')
              return (
                <li key={item.ac.id}>
                  <Card size="sm">
                    <CardContent className="space-y-2">
                      <p className="text-sm">
                        <span className="font-medium">{item.ac.id}</span> {item.ac.text}
                      </p>
                      <p className="text-xs text-muted-foreground">
                        {[`Story ${item.storyId}`, delivered, `waiting ${formatDuration(item.waitingSince, now)}`].filter(Boolean).join(' · ')}
                      </p>
                      {open === item.ac.id ? (
                        <RecordResultForm
                          projectId={data.project.id}
                          acId={item.ac.id}
                          now={now}
                          defaultEnvironment={lastEnvironment}
                          onCancel={() => closeForm('cancel')}
                          onSaved={() => closeForm('saved')}
                        />
                      ) : (
                        <Button size="sm" variant="outline" aria-label={`Record result for ${item.ac.id}`} onClick={() => setOpen(item.ac.id)}>
                          Record result
                        </Button>
                      )}
                    </CardContent>
                  </Card>
                </li>
              )
            })}
          </ul>
        )}
      </section>

      <section aria-labelledby="results-heading" className="space-y-3">
        <h3 id="results-heading" ref={resultsHeading} tabIndex={-1} className="font-medium">Recorded results</h3>
        {results.length === 0 ? (
          <p className="text-sm text-muted-foreground">No results recorded yet.</p>
        ) : (
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Date</TableHead>
                <TableHead>AC</TableHead>
                <TableHead>Result</TableHead>
                <TableHead>Environment</TableHead>
                <TableHead>Tester</TableHead>
                <TableHead>Notes</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {results.map((r, i) => (
                <TableRow key={`${r.acId}-${r.testedAt}-${i}`}>
                  <TableCell>{formatDate(r.testedAt)}</TableCell>
                  <TableCell>{r.acId}</TableCell>
                  <TableCell>{r.result === 'pass' ? 'Pass' : 'Fail'}</TableCell>
                  <TableCell>{r.environment}</TableCell>
                  <TableCell>{r.tester}</TableCell>
                  <TableCell className="text-muted-foreground">{r.notes ?? ''}</TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        )}
      </section>
    </div>
  )
}
