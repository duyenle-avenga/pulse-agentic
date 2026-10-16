'use client'

import Link from 'next/link'
import { Fragment, useState } from 'react'
import { CI_LABEL, TASK_STATUS_LABEL } from '@/components/labels'
import { Card, CardContent } from '@/components/ui/card'
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table'
import { TaskTicket } from '@/components/wizard/task-ticket'
import { acsOf, currentScope } from '@/lib/domain/scope'
import type { AcState, ProjectData, PullRequest, Task } from '@/lib/domain/types'
import { cn } from '@/lib/utils'
import { acProgress, TASK_STATUSES, taskStatus, type TaskStatus } from '@/lib/progress/taskStatus'
import { useProject } from '../project-data-provider'
import { ScreenHeading } from '../screen-heading'

export type TasksViewMode = 'list' | 'board'

interface TaskRow {
  task: Task
  status: TaskStatus
  verified: number
  total: number
  prs: PullRequest[]
}

const prLabel = (p: PullRequest) => `#${p.number} · ${CI_LABEL[p.ci]}`
const ticketPanelId = (taskId: string) => `task-ticket-${taskId}`

export function TasksView({ view }: { view: TasksViewMode }) {
  const { data, acStates } = useProject()
  const [selected, setSelected] = useState<string | null>(null)
  const stateById = new Map<string, AcState>(acStates.map((s) => [s.acId, s.state]))
  const rows: TaskRow[] = data.tasks.map((task) => ({
    task,
    status: taskStatus(task, data.prs, stateById),
    ...acProgress(task, stateById),
    prs: data.prs.filter((p) => p.taskIds.includes(task.id)),
  }))
  const toggle = (id: string) => setSelected((s) => (s === id ? null : id))
  const base = `/projects/${data.project.id}/tasks`

  return (
    <div className="space-y-4">
      <ScreenHeading title="Tasks" description="Technical tasks for agents, with their ACs, PRs and status." />
      <nav aria-label="Task view" className="flex gap-1 text-sm">
        <ViewLink href={base} current={view === 'list'}>
          List
        </ViewLink>
        <ViewLink href={`${base}?view=board`} current={view === 'board'}>
          Board
        </ViewLink>
      </nav>
      {view === 'list' ? (
        <TaskList rows={rows} data={data} selected={selected} onToggle={toggle} />
      ) : (
        <TaskBoard rows={rows} data={data} selected={selected} onToggle={toggle} />
      )}
    </div>
  )
}

function ViewLink({ href, current, children }: { href: string; current: boolean; children: React.ReactNode }) {
  return (
    <Link href={href} aria-current={current ? 'page' : undefined} className={cn('rounded-md px-3 py-1', current ? 'bg-muted font-medium' : 'text-muted-foreground hover:bg-muted/50')}>
      {children}
    </Link>
  )
}

interface ViewProps {
  rows: TaskRow[]
  data: ProjectData
  selected: string | null
  onToggle: (id: string) => void
}

function TaskToggle({ row, selected, onToggle }: { row: TaskRow; selected: string | null; onToggle: (id: string) => void }) {
  const expanded = selected === row.task.id
  return (
    <button
      type="button"
      aria-expanded={expanded}
      aria-controls={expanded ? ticketPanelId(row.task.id) : undefined}
      onClick={() => onToggle(row.task.id)}
      className="text-left hover:underline"
    >
      <span className="font-medium">{row.task.id}</span> {row.task.title}
    </button>
  )
}

function TaskList({ rows, data, selected, onToggle }: ViewProps) {
  return (
    <Table>
      <TableHeader>
        <TableRow>
          <TableHead>Task</TableHead>
          <TableHead>Story</TableHead>
          <TableHead>ACs</TableHead>
          <TableHead>Status</TableHead>
          <TableHead>PRs</TableHead>
          <TableHead>Agent</TableHead>
          <TableHead>Depends on</TableHead>
        </TableRow>
      </TableHeader>
      <TableBody>
        {rows.map((row) => (
          <Fragment key={row.task.id}>
            <TableRow>
              <TableCell className="whitespace-normal">
                <TaskToggle row={row} selected={selected} onToggle={onToggle} />
              </TableCell>
              <TableCell>{row.task.storyId}</TableCell>
              <TableCell className="tabular-nums">{`${row.verified}/${row.total} verified`}</TableCell>
              <TableCell>{TASK_STATUS_LABEL[row.status]}</TableCell>
              <TableCell>
                {row.prs.length === 0 ? (
                  <span className="text-muted-foreground">None</span>
                ) : (
                  row.prs.map((p) => <div key={p.number}>{prLabel(p)}</div>)
                )}
              </TableCell>
              <TableCell>{row.task.agent ?? <span className="text-muted-foreground">Unassigned</span>}</TableCell>
              <TableCell>
                {row.task.dependsOn.length === 0 ? <span className="text-muted-foreground">None</span> : row.task.dependsOn.join(', ')}
              </TableCell>
            </TableRow>
            {selected === row.task.id && (
              <TableRow>
                <TableCell id={ticketPanelId(row.task.id)} colSpan={7} className="whitespace-normal">
                  <TicketPanel row={row} data={data} />
                </TableCell>
              </TableRow>
            )}
          </Fragment>
        ))}
      </TableBody>
    </Table>
  )
}

function TaskBoard({ rows, data, selected, onToggle }: ViewProps) {
  const open = rows.find((r) => r.task.id === selected)
  return (
    <div className="space-y-4">
      <div className="grid gap-4 md:grid-cols-4">
        {TASK_STATUSES.map((status) => {
          const column = rows.filter((r) => r.status === status)
          const headingId = `column-${status}-heading`
          return (
            <section key={status} aria-labelledby={headingId} className="space-y-2 rounded-lg bg-muted/40 p-3">
              <h3 id={headingId} className="text-sm font-medium">{`${TASK_STATUS_LABEL[status]} (${column.length})`}</h3>
              {column.map((row) => (
                <Card key={row.task.id} size="sm">
                  <CardContent className="space-y-1 text-sm">
                    <TaskToggle row={row} selected={selected} onToggle={onToggle} />
                    <p className="text-xs text-muted-foreground">{`${row.verified}/${row.total} verified${row.task.agent ? ` · ${row.task.agent}` : ''}`}</p>
                  </CardContent>
                </Card>
              ))}
            </section>
          )
        })}
      </div>
      {open && (
        <div id={ticketPanelId(open.task.id)}>
          <TicketPanel row={open} data={data} />
        </div>
      )}
    </div>
  )
}

function TicketPanel({ row, data }: { row: TaskRow; data: ProjectData }) {
  const acById = new Map(acsOf(currentScope(data.project)).map((a) => [a.id, a]))
  const acs = row.task.acIds.flatMap((id) => acById.get(id) ?? [])
  return (
    <div className="space-y-2">
      <TaskTicket task={row.task} acs={acs} />
      <p className="text-sm text-muted-foreground">
        {row.prs.length === 0 ? 'No PRs yet.' : `PRs: ${row.prs.map((p) => `${prLabel(p)} (${p.state})`).join(', ')}`}
      </p>
    </div>
  )
}
