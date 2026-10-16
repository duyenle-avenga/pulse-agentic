import { notFound } from 'next/navigation'
import { ProjectDataProvider } from '@/components/project/project-data-provider'
import { getNow, getRepository } from '@/lib/data'

export default async function ProjectLayout({
  children,
  params,
}: {
  children: React.ReactNode
  params: Promise<{ projectId: string }>
}) {
  const { projectId } = await params
  const repo = getRepository()
  const now = getNow()

  const data = await repo.getProjectData(projectId)
  if (data) {
    return (
      <ProjectDataProvider source={{ kind: 'project', data }} now={now}>
        {children}
      </ProjectDataProvider>
    )
  }

  const draft = await repo.getPlannerDraft(projectId)
  if (!draft) notFound()
  return (
    <ProjectDataProvider source={{ kind: 'draft', draft }} now={now}>
      {children}
    </ProjectDataProvider>
  )
}
