import { notFound } from 'next/navigation'
import { ProjectHeader } from '@/components/project/project-header'
import { ProjectSidebar } from '@/components/project/project-sidebar'
import { getRepository } from '@/lib/data'

export default async function ProjectLayout({
  children,
  params,
}: {
  children: React.ReactNode
  params: Promise<{ projectId: string }>
}) {
  const { projectId } = await params
  const header = await getRepository().getProjectHeader(projectId)
  if (!header) notFound()

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
