'use client'

import { scopeOriginLabel, scrSourceLabel } from '@/components/labels'
import { Card, CardContent } from '@/components/ui/card'
import type { ScopeChangeRequest } from '@/lib/domain/types'
import { formatDate, formatDateTime } from '@/lib/format'
import { changelog, type ChangelogEntry } from '@/lib/progress/changelog'
import { diffSummary } from '@/lib/progress/diffScopes'
import { useProject } from '../project-data-provider'
import { ScopeDiffList } from '../scope-diff-list'
import { ScreenHeading } from '../screen-heading'

export function ChangelogView() {
  const { data } = useProject()
  const entries = changelog(data)
  const initialLabel = scopeOriginLabel(data.project)
  return (
    <div className="space-y-4">
      <ScreenHeading title="Changelog" description="Append-only record of scope versions and decisions." />
      <ol aria-label="Changelog entries" className="space-y-3">
        {entries.map((entry, i) => (
          <Entry key={`${entry.kind}-${entry.at}-${i}`} entry={entry} index={i} initialLabel={initialLabel} />
        ))}
      </ol>
    </div>
  )
}

function Entry({ entry, index, initialLabel }: { entry: ChangelogEntry; index: number; initialLabel: string }) {
  const headingId = `changelog-${index}`
  const title =
    entry.kind === 'initial' ? `${entry.version} locked` : entry.kind === 'version' ? `${entry.from} → ${entry.to}` : `${entry.scr.id} rejected, no version change`

  return (
    <li aria-labelledby={headingId}>
      <Card>
        <CardContent className="space-y-2 text-sm">
          <h3 id={headingId} className="text-base font-medium">
            {title}
          </h3>
          {entry.kind === 'initial' && (
            <>
              <p className="text-muted-foreground">{`${formatDateTime(entry.at)} · approved by ${entry.approvedBy}`}</p>
              <p>{initialLabel}</p>
            </>
          )}
          {entry.kind === 'version' && (
            <>
              <p className="font-medium">{diffSummary(entry.diff)}</p>
              <p className="text-muted-foreground">{`${formatDateTime(entry.at)} · approved by ${entry.approvedBy}`}</p>
              {entry.scr && <ScrLines scr={entry.scr} />}
              <details>
                <summary className="cursor-pointer text-muted-foreground">Show changes</summary>
                <div className="pt-2">
                  <ScopeDiffList entries={entry.diff} />
                </div>
              </details>
            </>
          )}
          {entry.kind === 'rejected' && (
            <>
              <p className="text-muted-foreground">{`${formatDateTime(entry.at)} · rejected by ${entry.scr.decidedBy ?? 'unknown'}`}</p>
              <ScrLines scr={entry.scr} />
            </>
          )}
        </CardContent>
      </Card>
    </li>
  )
}

function ScrLines({ scr }: { scr: ScopeChangeRequest }) {
  return (
    <>
      <p>{`${scr.id} ${scr.title} · ${scrSourceLabel(scr)} · raised ${formatDate(scr.raisedAt)}`}</p>
      {scr.rationale && <p className="text-muted-foreground">{scr.rationale}</p>}
      {scr.decisionReason && <p>{`Reason: ${scr.decisionReason}`}</p>}
    </>
  )
}
