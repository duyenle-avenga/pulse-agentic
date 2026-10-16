import { render, screen } from '@testing-library/react'
import { describe, expect, it } from 'vitest'
import { ScopeDiffList } from './scope-diff-list'

describe('ScopeDiffList', () => {
  it('shows each change with its kind for screen readers', () => {
    render(
      <ScopeDiffList
        entries={[
          { kind: 'added', level: 'ac', id: 'AC-5.1.1', text: 'Exporting a month downloads a CSV' },
          { kind: 'changed', level: 'ac', id: 'AC-1.1.2', text: 'New text', before: 'Old text' },
          { kind: 'removed', level: 'story', id: 'US-4.2', text: 'Chat with support' },
        ]}
      />,
    )
    // The +/~/− sign is aria-hidden; the second span holds what a screen reader announces.
    const items = screen.getAllByRole('listitem').map((li) => li.lastElementChild?.textContent)
    expect(items).toEqual(['Added: AC AC-5.1.1 Exporting a month downloads a CSV', 'Changed: AC AC-1.1.2 Old text → New text', 'Removed: Story US-4.2 Chat with support'])
  })

  it('says when there are no changes', () => {
    render(<ScopeDiffList entries={[]} />)
    expect(screen.getByText('No changes.')).toBeInTheDocument()
  })
})
