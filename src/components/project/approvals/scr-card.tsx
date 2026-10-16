'use client'

import Link from 'next/link'
import { scrSourceLabel } from '@/components/labels'
import { Card, CardContent } from '@/components/ui/card'
import type { IsoDateTime, ProjectData, ScopeChangeRequest } from '@/lib/domain/types'
import { formatDate, formatDuration } from '@/lib/format'
import { scrImpact } from '@/lib/progress/scrImpact'
import { ScopeDiffList } from '../scope-diff-list'
import { DecideScrForm } from './decide-scr-form'

export function ScrCard({ scr, data, now, defaultApprover }: { scr: ScopeChangeRequest; data: ProjectData; now: IsoDateTime; defaultApprover: string }) {
  const titleId = `${scr.id}-title`
  const meta = [scrSourceLabel(scr), `raised ${formatDate(scr.raisedAt)}`, ...(scr.status === 'pending' ? [`waiting ${formatDuration(scr.raisedAt, now)}`] : [])]

  return (
    <article aria-labelledby={titleId}>
      <Card>
        <CardContent className="space-y-3">
          <div className="space-y-1">
            <h4 id={titleId} className="font-medium">{`${scr.id} · ${scr.title}`}</h4>
            <p className="text-xs text-muted-foreground">{meta.join(' · ')}</p>
            {scr.rationale && <p className="text-sm">{scr.rationale}</p>}
          </div>
          {scr.status === 'pending' ? (
            <>
              <Impact data={data} scr={scr} />
              <DecideScrForm projectId={data.project.id} scrId={scr.id} defaultApprover={defaultApprover} now={now} />
            </>
          ) : (
            <Decision data={data} scr={scr} />
          )}
        </CardContent>
      </Card>
    </article>
  )
}

function Impact({ data, scr }: { data: ProjectData; scr: ScopeChangeRequest }) {
  const impact = scrImpact(data, scr)
  if (!impact) return <p className="text-sm text-muted-foreground">No proposed change attached.</p>
  return (
    <div className="space-y-2 rounded-lg bg-muted/50 p-3">
      <p className="text-sm font-medium">Impact</p>
      <p className="text-sm">{`Touches: ${impact.features.join(', ')}`}</p>
      <ScopeDiffList entries={impact.diff} />
      <p className="text-sm">{`New tasks: ${impact.tasks.length > 0 ? impact.tasks.map((t) => `${t.id} ${t.title}`).join(', ') : 'none'}`}</p>
      <p className="text-sm">{`Completion ${impact.completionBefore}% → ${impact.completionAfter}%`}</p>
    </div>
  )
}

function Decision({ data, scr }: { data: ProjectData; scr: ScopeChangeRequest }) {
  const versions = data.project.scopeVersions
  const index = versions.findIndex((v) => v.changedBy === scr.id)
  const created = index > 0 ? { from: versions[index - 1].label, to: versions[index].label } : null
  const verb = scr.status === 'approved' ? 'Approved' : 'Rejected'
  const when = scr.decidedAt ? ` on ${formatDate(scr.decidedAt)}` : ''

  return (
    <div className="space-y-1 border-t pt-3 text-sm">
      <p className="font-medium">{`${verb} by ${scr.decidedBy ?? 'unknown'}${when}${created ? ` · created ${created.to}` : ''}`}</p>
      {scr.decisionReason && <p>{`Reason: ${scr.decisionReason}`}</p>}
      {created && (
        <Link href={`/projects/${data.project.id}/scope?from=${created.from}&to=${created.to}`} className="underline">
          {`Compare ${created.from} → ${created.to}`}
        </Link>
      )}
    </div>
  )
}
