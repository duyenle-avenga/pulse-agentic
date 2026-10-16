import { PortfolioTotals } from '@/components/portfolio/portfolio-totals'
import { ProjectsTable } from '@/components/portfolio/projects-table'
import { getNow, getRepository } from '@/lib/data'

export default async function PortfolioPage() {
  const rows = await getRepository().getPortfolio()
  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-semibold">Portfolio</h1>
        <p className="text-sm text-muted-foreground">Agentic projects, measured by verified acceptance criteria.</p>
      </div>
      <PortfolioTotals rows={rows} />
      <ProjectsTable rows={rows} now={getNow()} />
    </div>
  )
}
