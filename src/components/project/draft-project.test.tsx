import { render, screen } from '@testing-library/react'
import { beforeEach, describe, expect, it } from 'vitest'
import { getDecisionStore } from '@/lib/decisions/use-decisions'
import { intelligentFlowV2 as draft } from '@/lib/mock/planner'
import { DraftOverview } from './draft-overview'
import { DraftProjectLayout } from './draft-project-layout'

const NOW = '2026-10-16T09:00:00+02:00'
const store = getDecisionStore()
const P = draft.brief.projectId

describe('Intelligent Flow v2 project pages', () => {
  beforeEach(() => store.reset(P))

  it('says the scope is not locked yet and links to the wizard', () => {
    render(<DraftProjectLayout draft={draft}><DraftOverview draft={draft} now={NOW} /></DraftProjectLayout>)
    expect(screen.getByText('Intelligent Flow v2’s scope isn’t locked yet.')).toBeInTheDocument()
    expect(screen.getByRole('link', { name: 'Open the wizard' })).toHaveAttribute('href', '/projects/new')
    expect(screen.getByRole('link', { name: '← Portfolio' })).toHaveAttribute('href', '/')
  })

  it('shows the header, sidebar and overview once v1 is locked', () => {
    store.decideAll(P, draft.scope.features.flatMap((f) => f.stories.map((s) => s.id)), 'approved')
    store.lock(P, NOW, 'Demo approver')
    render(<DraftProjectLayout draft={draft}><DraftOverview draft={draft} now={NOW} /></DraftProjectLayout>)
    expect(screen.getByRole('heading', { level: 1, name: 'Intelligent Flow v2' })).toBeInTheDocument()
    expect(screen.getByText(/Scope v1 · locked 16 Oct by Demo approver/)).toBeInTheDocument()
    expect(screen.getByRole('link', { name: 'Overview' })).toHaveAttribute('href', '/projects/intelligent-flow-v2')
    expect(screen.getByText('0 of 28 ACs verified')).toBeInTheDocument()
    expect(screen.getByText('Scope v1 locked by Demo approver')).toBeInTheDocument()
    expect(screen.getByText('No open warnings.')).toBeInTheDocument()
  })
})
