import Link from 'next/link'

// README §5 screens that come in later rounds.
const COMING_SOON = ['User testing', 'Scope', 'Tasks', 'Evidence', 'Approvals', 'Changelog', 'Metrics']

export function ProjectSidebar({ projectId }: { projectId: string }) {
  return (
    <nav aria-label="Project" className="flex flex-col gap-1 text-sm">
      <Link href={`/projects/${projectId}`} aria-current="page" className="rounded-md bg-muted px-3 py-2 font-medium">
        Overview
      </Link>
      {COMING_SOON.map((screen) => (
        <span key={screen} className="flex items-center justify-between rounded-md px-3 py-2 text-muted-foreground">
          {screen}
          <span className="text-xs">soon</span>
        </span>
      ))}
    </nav>
  )
}
