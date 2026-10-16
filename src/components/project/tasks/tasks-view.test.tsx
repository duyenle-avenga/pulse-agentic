import { fireEvent, getDefaultNormalizer, screen, within } from '@testing-library/react'
import { beforeEach, describe, expect, it } from 'vitest'
import { getDecisionStore } from '@/lib/decisions/use-decisions'
import { expenseTracker } from '@/lib/mock/project-a'
import { renderProject } from '../test-utils'
import { TasksView } from './tasks-view'

const rowOf = (taskId: string) => {
  const row = screen.getByRole('button', { name: new RegExp(`^${taskId} `) }).closest('tr')
  if (!row) throw new Error(`no row for ${taskId}`)
  return within(row)
}

describe('TasksView', () => {
  beforeEach(() => getDecisionStore().reset(expenseTracker.project.id))

  it('lists tasks with status, AC progress, PRs and agent', () => {
    renderProject(<TasksView view="list" />, expenseTracker)
    expect(screen.getByRole('heading', { level: 2, name: 'Tasks' })).toBeInTheDocument()
    expect(rowOf('T-01').getByText('Done')).toBeInTheDocument()
    expect(rowOf('T-03').getByText('In progress')).toBeInTheDocument()
    expect(rowOf('T-03').getByText('2/4 verified')).toBeInTheDocument()
    expect(rowOf('T-05').getByText('In review')).toBeInTheDocument()
    expect(rowOf('T-05').getByText('#4 · CI pending')).toBeInTheDocument()
    expect(rowOf('T-07').getByText('Not started')).toBeInTheDocument()
    expect(rowOf('T-06').getByText('Codex')).toBeInTheDocument()
  })

  it('opens a task’s ticket with Copy as Markdown', () => {
    renderProject(<TasksView view="list" />, expenseTracker)
    const toggle = screen.getByRole('button', { name: /^T-01 / })
    fireEvent.click(toggle)
    expect(toggle).toHaveAttribute('aria-expanded', 'true')
    const panelId = toggle.getAttribute('aria-controls')
    expect(panelId).toBeTruthy()
    expect(document.getElementById(panelId!)).toBeInTheDocument()
    expect(screen.getByRole('button', { name: 'Copy T-01 as Markdown' })).toBeInTheDocument()
    expect(
      screen.getByText(/AC-1\.1\.4 The sign-in page looks right on a phone {3}👤 human test/, {
        normalizer: getDefaultNormalizer({ collapseWhitespace: false }),
      }),
    ).toBeInTheDocument()
  })

  it('switches between list and board', () => {
    renderProject(<TasksView view="list" />, expenseTracker)
    expect(screen.getByRole('link', { name: 'List' })).toHaveAttribute('aria-current', 'page')
    expect(screen.getByRole('link', { name: 'Board' })).toHaveAttribute('href', '/projects/expense-tracker/tasks?view=board')
  })

  it('shows the board with one column per status', () => {
    renderProject(<TasksView view="board" />, expenseTracker)
    expect(screen.getAllByRole('heading', { level: 3 }).map((h) => h.textContent)).toEqual(['Not started (2)', 'In progress (1)', 'In review (2)', 'Done (2)'])
    expect(screen.getByRole('region', { name: 'Done (2)' })).toBeInTheDocument()
    fireEvent.click(screen.getByRole('button', { name: /^T-05 / }))
    expect(screen.getByRole('button', { name: 'Copy T-05 as Markdown' })).toBeInTheDocument()
  })
})
