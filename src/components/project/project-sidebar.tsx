'use client'

import Link from 'next/link'
import { usePathname } from 'next/navigation'
import { getDecisionStore } from '@/lib/decisions/use-decisions'
import { WIZARD_PROJECT_ID } from '@/lib/domain/planner'
import { cn } from '@/lib/utils'

// README §5 project screens, in sidebar order.
const SCREENS = [
  { label: 'Overview', path: '' },
  { label: 'User testing', path: '/user-testing' },
  { label: 'Scope', path: '/scope' },
  { label: 'Tasks', path: '/tasks' },
  { label: 'Evidence', path: '/evidence' },
  { label: 'Approvals', path: '/approvals' },
  { label: 'Changelog', path: '/changelog' },
  { label: 'Metrics', path: '/metrics' },
] as const

export function ProjectSidebar({ projectId }: { projectId: string }) {
  const pathname = usePathname()
  const base = `/projects/${projectId}`

  return (
    <nav aria-label="Project" className="flex flex-col gap-1 text-sm">
      {SCREENS.map(({ label, path }) => {
        const href = `${base}${path}`
        const current = pathname === href
        return (
          <Link
            key={label}
            href={href}
            aria-current={current ? 'page' : undefined}
            className={cn('rounded-md px-3 py-2', current ? 'bg-muted font-medium' : 'text-muted-foreground hover:bg-muted/50 hover:text-foreground')}
          >
            {label}
          </Link>
        )
      })}
      {/* The wizard project's decisions are reset from the wizard, which also clears its v1 lock. */}
      {projectId !== WIZARD_PROJECT_ID && (
        <button
          type="button"
          onClick={() => getDecisionStore().reset(projectId)}
          className="mt-4 rounded-md px-3 py-2 text-left text-xs text-muted-foreground hover:underline"
        >
          Reset demo decisions
        </button>
      )}
    </nav>
  )
}
