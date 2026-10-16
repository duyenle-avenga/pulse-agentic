import type { ProjectHeaderData } from '@/lib/data/repository'
import { ProjectHeader } from './project-header'
import { ProjectSidebar } from './project-sidebar'

export function ProjectShell({ header, children }: { header: ProjectHeaderData; children: React.ReactNode }) {
  return (
    <div className="space-y-6">
      <ProjectHeader header={header} />
      <div className="grid gap-6 md:grid-cols-[12rem_1fr]">
        <ProjectSidebar projectId={header.id} />
        <div className="min-w-0">{children}</div>
      </div>
    </div>
  )
}
