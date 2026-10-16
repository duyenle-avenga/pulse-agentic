import Link from 'next/link'
import { Button, buttonVariants } from '@/components/ui/button'
import { acsOf, currentScope } from '@/lib/domain/scope'
import type { AcceptanceCriterion, ProjectData } from '@/lib/domain/types'
import { formatDate } from '@/lib/format'
import { TaskTicket } from './task-ticket'

export function LockedStep({ data, onReset }: { data: ProjectData; onReset: () => void }) {
  const scope = currentScope(data.project)
  const acById = new Map(acsOf(scope).map((a) => [a.id, a]))
  const acsFor = (ids: string[]) => ids.map((id) => acById.get(id)).filter((a): a is AcceptanceCriterion => a !== undefined)

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h2 className="text-lg font-semibold">{`Scope ${scope.label} locked`}</h2>
          <p className="text-sm text-muted-foreground">{`Scope ${scope.label} · locked ${formatDate(scope.lockedAt)} by ${scope.approvedBy}`}</p>
        </div>
        <div className="flex gap-2">
          <Link href={`/projects/${data.project.id}`} className={buttonVariants()}>
            Open project overview
          </Link>
          <Link href="/" className={buttonVariants({ variant: 'outline' })}>
            Back to portfolio
          </Link>
          <Button variant="ghost" onClick={onReset}>
            Reset demo
          </Button>
        </div>
      </div>
      <section className="space-y-3">
        <h3 className="text-base font-medium">{`Generated tasks (${data.tasks.length})`}</h3>
        {data.tasks.map((t) => (
          <TaskTicket key={t.id} task={t} acs={acsFor(t.acIds)} />
        ))}
      </section>
    </div>
  )
}
