import { render, screen } from '@testing-library/react'
import { describe, expect, it } from 'vitest'
import { MetricsView } from './metrics-view'

describe('MetricsView', () => {
  it('explains where the Metabase dashboards will appear', () => {
    render(<MetricsView />)
    expect(screen.getByRole('heading', { level: 2, name: 'Metrics' })).toBeInTheDocument()
    expect(screen.getByText('Pulse KPI dashboards (flow time, cycle time, throughput) from Metabase appear here.')).toBeInTheDocument()
    expect(screen.getByText('Signed embedding is on the roadmap.')).toBeInTheDocument()
  })
})
