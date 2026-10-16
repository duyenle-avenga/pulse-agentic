import { notFound } from 'next/navigation'
import { DraftProjectLayout } from '@/components/project/draft-project-layout'
import { ProjectShell } from '@/components/project/project-shell'
import { getRepository } from '@/lib/data'

export default async function ProjectLayout({
  children,
  params,
}: {
  children: React.ReactNode
  params: Promise<{ projectId: string }>
}) {
  const { projectId } = await params
  const repo = getRepository()
  const header = await repo.getProjectHeader(projectId)
  if (header) return <ProjectShell header={header}>{children}</ProjectShell>

  const draft = await repo.getPlannerDraft(projectId)
  if (!draft) notFound()
  return <DraftProjectLayout draft={draft}>{children}</DraftProjectLayout>
}
