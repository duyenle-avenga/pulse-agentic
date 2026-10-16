'use client'

import { Fragment, useState } from 'react'
import { CI_LABEL, MARK_LABEL } from '@/components/labels'
import { HumanTestMark } from '@/components/human-test-mark'
import { Button } from '@/components/ui/button'
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table'
import { acsOf, currentScope } from '@/lib/domain/scope'
import type { AcState } from '@/lib/domain/types'
import { formatDate } from '@/lib/format'
import { evidenceByAc, type EvidenceItem } from '@/lib/progress/evidence'
import { AcStateBadge } from '../ac-state-badge'
import { useProject } from '../project-data-provider'
import { ScreenHeading } from '../screen-heading'

type Filter = 'all' | 'verified' | 'failing' | 'unverified' | 'none'

const FILTERS: { id: Filter; label: string }[] = [
  { id: 'all', label: 'All' },
  { id: 'verified', label: 'Verified' },
  { id: 'failing', label: 'Failing or regressed' },
  { id: 'unverified', label: 'Unverified' },
  { id: 'none', label: 'No evidence' },
]

function matches(filter: Filter, state: AcState, items: EvidenceItem[]): boolean {
  switch (filter) {
    case 'all':
      return true
    case 'verified':
      return state === 'verified'
    case 'failing':
      return state === 'failing' || state === 'regressed'
    case 'unverified':
      return state === 'implemented' || state === 'pending_user_testing'
    case 'none':
      return items.length === 0
  }
}

export function EvidenceView() {
  const { data, acStates } = useProject()
  const [filter, setFilter] = useState<Filter>('all')
  const [expanded, setExpanded] = useState<ReadonlySet<string>>(new Set())
  const evidence = evidenceByAc(data)
  const stateById = new Map(acStates.map((s) => [s.acId, s.state]))
  const rows = acsOf(currentScope(data.project))
    .map((ac) => ({ ac, state: stateById.get(ac.id) ?? 'not_started', items: evidence.get(ac.id) ?? [] }))
    .filter((r) => matches(filter, r.state, r.items))

  const toggle = (acId: string) =>
    setExpanded((prev) => {
      const next = new Set(prev)
      if (next.has(acId)) next.delete(acId)
      else next.add(acId)
      return next
    })

  return (
    <div className="space-y-4">
      <ScreenHeading title="Evidence" description="What proves each AC: PR test plans with their CI result, and human test results." />
      <div role="group" aria-label="Filter" className="flex flex-wrap gap-2">
        {FILTERS.map((f) => (
          <Button key={f.id} size="sm" variant={filter === f.id ? 'default' : 'outline'} aria-pressed={filter === f.id} onClick={() => setFilter(f.id)}>
            {f.label}
          </Button>
        ))}
      </div>
      <Table>
        <TableHeader>
          <TableRow>
            <TableHead>AC</TableHead>
            <TableHead>State</TableHead>
            <TableHead>Source</TableHead>
            <TableHead>Result</TableHead>
            <TableHead>How tested</TableHead>
            <TableHead>CI</TableHead>
            <TableHead>Commit</TableHead>
            <TableHead>When</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {rows.map(({ ac, state, items }) => {
            const [latest, ...earlier] = items
            const open = expanded.has(ac.id)
            return (
              <Fragment key={ac.id}>
                <TableRow>
                  <TableCell title={ac.text}>
                    {ac.id}
                    {ac.humanTest && (
                      <>
                        {' '}
                        <HumanTestMark />
                      </>
                    )}
                  </TableCell>
                  <TableCell>
                    <AcStateBadge state={state} />
                  </TableCell>
                  {latest ? (
                    <EvidenceCells item={latest} />
                  ) : (
                    <TableCell colSpan={6} className="text-muted-foreground">
                      No evidence yet
                    </TableCell>
                  )}
                </TableRow>
                {earlier.length > 0 && (
                  <TableRow>
                    <TableCell />
                    <TableCell colSpan={7}>
                      <button type="button" aria-expanded={open} onClick={() => toggle(ac.id)} className="text-xs text-muted-foreground hover:underline">
                        {open ? 'Hide earlier' : `+${earlier.length} earlier`}
                      </button>
                    </TableCell>
                  </TableRow>
                )}
                {open &&
                  earlier.map((item, i) => (
                    <TableRow key={`${ac.id}-earlier-${i}`} className="text-muted-foreground">
                      <TableCell />
                      <TableCell />
                      <EvidenceCells item={item} />
                    </TableRow>
                  ))}
              </Fragment>
            )
          })}
        </TableBody>
      </Table>
    </div>
  )
}

function EvidenceCells({ item }: { item: EvidenceItem }) {
  if (item.kind === 'human') {
    return (
      <>
        <TableCell>Human test</TableCell>
        <TableCell>{item.result === 'pass' ? 'Pass' : 'Fail'}</TableCell>
        <TableCell>{`${item.tester} · ${item.environment}`}</TableCell>
        <TableCell>—</TableCell>
        <TableCell>—</TableCell>
        <TableCell>{formatDate(item.at)}</TableCell>
      </>
    )
  }
  return (
    <>
      <TableCell>{`PR #${item.prNumber}`}</TableCell>
      <TableCell>{MARK_LABEL[item.mark]}</TableCell>
      <TableCell>{[item.testType, item.testFile].filter(Boolean).join(' · ') || '—'}</TableCell>
      <TableCell>{CI_LABEL[item.ci]}</TableCell>
      <TableCell className="font-mono text-xs">{item.sha}</TableCell>
      <TableCell>{formatDate(item.at)}</TableCell>
    </>
  )
}
