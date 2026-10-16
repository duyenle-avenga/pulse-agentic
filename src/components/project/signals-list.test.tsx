import { render, screen } from '@testing-library/react'
import { describe, expect, it } from 'vitest'
import type { Signal } from '@/lib/domain/types'
import { SignalsList } from './signals-list'

const NOW = '2026-10-16T09:00:00+02:00'
const signal: Signal = {
  id: 'SIG-2', projectId: 'p', type: 'unchecked_acs_merged', severity: 'medium',
  message: 'PR #212 was merged without AC-5.1.4 in its test plan',
  suggestedAction: 'Open a follow-up task', raisedAt: '2026-10-16T06:00:00+02:00',
  links: { taskId: 'T-13', prNumber: 212, acId: 'AC-5.1.4' },
}

describe('SignalsList', () => {
  it('shows each signal with severity, age, action and links', () => {
    render(<SignalsList signals={[signal]} now={NOW} />)
    expect(screen.getByText('medium')).toBeInTheDocument()
    expect(screen.getByText('3 h ago')).toBeInTheDocument()
    expect(screen.getByText(signal.message)).toBeInTheDocument()
    expect(screen.getByText('→ Open a follow-up task')).toBeInTheDocument()
    expect(screen.getByText('T-13 · PR #212 · AC-5.1.4')).toBeInTheDocument()
  })

  it('shows an empty state', () => {
    render(<SignalsList signals={[]} now={NOW} />)
    expect(screen.getByText('No open signals.')).toBeInTheDocument()
  })
})
