import Link from 'next/link'
import { ProjectBadges } from '@/components/project-badges'
import { Badge } from '@/components/ui/badge'
import type { ProjectHeaderData } from '@/lib/data'
import { formatDate } from '@/lib/format'

export function ProjectHeader({ header }: { header: ProjectHeaderData }) {
  const pending = header.pendingApprovals
  return (
    <div className="space-y-2 border-b pb-4">
      <Link href="/" className="text-sm text-muted-foreground hover:underline">
        ← Portfolio
      </Link>
      <div className="flex flex-wrap items-center gap-3">
        <h1 className="text-2xl font-semibold">{header.name}</h1>
        <ProjectBadges kind={header.kind} board={header.board} boardKey={header.boardKey} />
        {pending > 0 && <Badge>{`${pending} pending approval${pending === 1 ? '' : 's'}`}</Badge>}
      </div>
      <p className="text-sm text-muted-foreground">{header.description}</p>
      <p className="text-sm text-muted-foreground">
        {`Scope ${header.scopeLabel} · locked ${formatDate(header.lockedAt)} by ${header.approvedBy}`}
        {header.repoUrl && (
          <>
            {' · '}
            <a href={header.repoUrl} target="_blank" rel="noreferrer" className="underline">
              Repository
            </a>
          </>
        )}
      </p>
    </div>
  )
}
