import { fireEvent, render, screen } from '@testing-library/react'
import { describe, expect, it, vi } from 'vitest'
import { ReminderBoard } from './ReminderBoard'
import type { Category } from '@stores/categoryStore'
import type { Note } from '@stores/noteStore'

const now = new Date('2026-04-18T00:00:00.000Z')

const categories: Category[] = [
  { id: 'cat-1', name: 'Ops', color: 'blue', createdAt: now, updatedAt: now },
]

const notes: Note[] = [
  {
    id: '1',
    title: 'Server Renew',
    content: 'renew soon',
    type: 'reminder-card',
    categoryId: 'cat-1',
    dueDate: new Date('2026-04-22T00:00:00.000Z'),
    reminderEnabled: true,
    createdAt: now,
    updatedAt: now,
  },
  {
    id: '2',
    title: 'Far Future',
    content: 'later',
    type: 'reminder-card',
    categoryId: 'cat-1',
    dueDate: new Date('2026-06-01T00:00:00.000Z'),
    reminderEnabled: true,
    createdAt: now,
    updatedAt: now,
  },
]

describe('ReminderBoard', () => {
  it('renders reminder cards and filters them by reminder window', () => {
    const onCreateCard = vi.fn()
    const onEditCard = vi.fn()

    render(
      <ReminderBoard
        selectedCategoryId="cat-1"
        notes={notes}
        categories={categories}
        now={now}
        onCreateCard={onCreateCard}
        onEditCard={onEditCard}
      />,
    )

    expect(screen.getByText('Server Renew')).toBeInTheDocument()
    expect(screen.getByText('Far Future')).toBeInTheDocument()

    fireEvent.click(screen.getByRole('button', { name: '7天内' }))

    expect(screen.getByText('Server Renew')).toBeInTheDocument()
    expect(screen.queryByText('Far Future')).not.toBeInTheDocument()
  })
})
