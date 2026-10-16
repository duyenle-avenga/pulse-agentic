import Link from 'next/link'
import { notFound } from 'next/navigation'
import { Wizard } from '@/components/wizard/wizard'
import { getNow, getRepository } from '@/lib/data'
import { WIZARD_PROJECT_ID } from '@/lib/domain/planner'

export default async function NewProjectPage() {
  const draft = await getRepository().getPlannerDraft(WIZARD_PROJECT_ID)
  if (!draft) notFound()

  return (
    <div className="space-y-6">
      <div className="space-y-1">
        <Link href="/" className="text-sm text-muted-foreground hover:underline">
          ← Portfolio
        </Link>
        <h1 className="text-2xl font-semibold">New project</h1>
        <p className="text-sm text-muted-foreground">Describe the project, answer the planner’s questions, then approve the generated scope.</p>
      </div>
      <Wizard draft={draft} now={getNow()} />
    </div>
  )
}
