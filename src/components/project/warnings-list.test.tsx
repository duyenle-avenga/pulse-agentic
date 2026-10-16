import { render, screen } from '@testing-library/react'
import { describe, expect, it } from 'vitest'
import type { Warning } from '@/lib/domain/types'
import { WarningsList } from './warnings-list'

const NOW = '2026-10-16T09:00:00+02:00'
const warning: Warning = {
  id: 'WRN-2', projectId: 'p', type: 'unchecked_acs_merged', severity: 'medium',
  message: 'PR #212 was merged without AC-5.1.4 in its test plan',
  suggestedAction: 'Open a follow-up task', raisedAt: '2026-10-16T06:00:00+02:00',
  links: { taskId: 'T-13', prNumber: 212, acId: 'AC-5.1.4' },
}

describe('WarningsList', () => {
  it('shows each warning with severity, age, action and links', () => {
    render(<WarningsList warnings={[warning]} now={NOW} />)
    expect(screen.getByRole('heading', { level: 2, name: 'Top warnings' })).toBeInTheDocument()
    expect(screen.getByText('medium')).toBeInTheDocument()
    expect(screen.getByText('3 h ago')).toBeInTheDocument()
    expect(screen.getByText(warning.message)).toBeInTheDocument()
    expect(screen.getByText('→ Open a follow-up task')).toBeInTheDocument()
    expect(screen.getByText('T-13 · PR #212 · AC-5.1.4')).toBeInTheDocument()
  })

  it('shows an empty state', () => {
    render(<WarningsList warnings={[]} now={NOW} />)
    expect(screen.getByText('No open warnings.')).toBeInTheDocument()
  })
})
