import Link from 'next/link'
import { PortfolioView } from '@/components/portfolio/portfolio-view'
import { buttonVariants } from '@/components/ui/button'
import { getNow, getRepository } from '@/lib/data'
import { WIZARD_PROJECT_ID } from '@/lib/domain/planner'

export default async function PortfolioPage() {
  const repo = getRepository()
  const [rows, draft] = await Promise.all([repo.getPortfolio(), repo.getPlannerDraft(WIZARD_PROJECT_ID)])
  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-start justify-between gap-4">
        <div>
          <h1 className="text-2xl font-semibold">Portfolio</h1>
          <p className="text-sm text-muted-foreground">Agentic projects, measured by verified acceptance criteria.</p>
        </div>
        <Link href="/projects/new" className={buttonVariants()}>
          New project
        </Link>
      </div>
      <PortfolioView rows={rows} draft={draft} now={getNow()} />
    </div>
  )
}
