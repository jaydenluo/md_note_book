import { fireEvent, render, screen } from '@testing-library/react'
import { describe, expect, it, vi } from 'vitest'
import { ReminderCardDialog } from './ReminderCardDialog'
import type { Category } from '@stores/categoryStore'

const categories: Category[] = [
  { id: 'cat-1', name: 'Ops', color: 'blue', createdAt: new Date(), updatedAt: new Date() },
]

describe('ReminderCardDialog', () => {
  it('submits title, category, due date, reminderEnabled, and content', () => {
    const onSave = vi.fn()

    render(
      <ReminderCardDialog
        open
        categories={categories}
        onOpenChange={() => {}}
        onSave={onSave}
      />,
    )

    fireEvent.change(screen.getByLabelText('标题'), { target: { value: 'Server Renew' } })
    fireEvent.change(screen.getByLabelText('分类'), { target: { value: 'cat-1' } })
    fireEvent.change(screen.getByLabelText('到期日期'), { target: { value: '2026-04-25' } })
    fireEvent.change(screen.getByLabelText('备注'), { target: { value: 'renew with ops account' } })
    fireEvent.click(screen.getByLabelText('启用提醒'))
    fireEvent.click(screen.getByRole('button', { name: '保存' }))

    expect(onSave).toHaveBeenCalledWith({
      title: 'Server Renew',
      categoryId: 'cat-1',
      dueDate: '2026-04-25',
      content: 'renew with ops account',
      reminderEnabled: true,
    })
  })
})
