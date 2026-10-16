import { notFound } from 'next/navigation'
import { DraftOverview } from '@/components/project/draft-overview'
import { OverviewContent } from '@/components/project/overview-content'
import { getNow, getRepository } from '@/lib/data'

export default async function ProjectOverviewPage({ params }: { params: Promise<{ projectId: string }> }) {
  const { projectId } = await params
  const repo = getRepository()
  const now = getNow()

  const overview = await repo.getProjectOverview(projectId)
  if (overview) return <OverviewContent overview={overview} now={now} />

  const draft = await repo.getPlannerDraft(projectId)
  if (!draft) notFound()
  return <DraftOverview draft={draft} now={now} />
}
