import { render, screen } from '@testing-library/react'
import { describe, expect, it } from 'vitest'
import type { ProjectHeaderData } from '@/lib/data'
import { ProjectHeader } from './project-header'
import { ProjectSidebar } from './project-sidebar'

const header: ProjectHeaderData = {
  id: 'customer-portal', name: 'Customer portal', description: 'Self-service portal.', kind: 'brownfield', board: 'github',
  repoUrl: 'https://github.com/example-org/customer-portal', scopeLabel: 'v1.1', lockedAt: '2026-10-06T14:00:00+02:00',
  approvedBy: 'Lena Fischer', pendingApprovals: 0,
}

describe('ProjectHeader', () => {
  it('shows name, scope version, lock date and approver', () => {
    render(<ProjectHeader header={header} />)
    expect(screen.getByRole('heading', { level: 1, name: 'Customer portal' })).toBeInTheDocument()
    expect(screen.getByText(/Scope v1\.1 · locked 6 Oct by Lena Fischer/)).toBeInTheDocument()
    expect(screen.getByRole('link', { name: 'Repository' })).toHaveAttribute('href', header.repoUrl)
    expect(screen.queryByText(/pending approval/)).not.toBeInTheDocument()
  })

  it('shows a pending-approvals badge when there are any', () => {
    render(<ProjectHeader header={{ ...header, pendingApprovals: 1 }} />)
    expect(screen.getByText('1 pending approval')).toBeInTheDocument()
  })
})

describe('ProjectSidebar', () => {
  it('links Overview and lists the other screens as coming soon', () => {
    render(<ProjectSidebar projectId="customer-portal" />)
    expect(screen.getByRole('link', { name: 'Overview' })).toHaveAttribute('href', '/projects/customer-portal')
    expect(screen.getByText('Approvals')).toBeInTheDocument()
    expect(screen.getAllByText('soon')).toHaveLength(7)
  })
})
