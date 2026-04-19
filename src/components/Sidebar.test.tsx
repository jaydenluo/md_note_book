import { fireEvent, screen } from '@testing-library/react'
import { beforeEach, describe, expect, it, vi } from 'vitest'
import { Sidebar } from './Sidebar'
import { renderWithProviders } from '../test/utils'
import { useCategories } from '@stores/categoryStore'
import { useNotes } from '@stores/noteStore'
import { useUiModeStore } from '@stores/uiModeStore'

vi.mock('@stores/categoryStore', () => ({
  useCategories: vi.fn(),
}))

vi.mock('@stores/noteStore', () => ({
  useNotes: vi.fn(),
}))

vi.mock('@utils/theme', () => ({
  useTheme: () => ({ isDark: false, toggleTheme: vi.fn() }),
}))

vi.mock('@/components/ui/alert-dialog', () => ({
  useAlertDialog: () => ({ showConfirm: vi.fn().mockResolvedValue(true) }),
}))

vi.mock('./SettingsDialog', () => ({
  SettingsDialog: () => null,
}))

vi.mock('./CloudSyncDialog', () => ({
  CloudSyncDialog: () => null,
}))

vi.mock('./GitSyncDialog', () => ({
  GitSyncDialog: () => null,
}))

const mockCategories = [
  { id: 'cat-1', name: 'Category 1', color: 'blue', createdAt: new Date(), updatedAt: new Date() },
  { id: 'cat-2', name: 'Category 2', color: 'green', createdAt: new Date(), updatedAt: new Date() },
]

const mockNotes = [
  { id: 'note-1', title: 'Doc 1', content: 'doc', type: 'doc', categoryId: 'cat-1', createdAt: new Date(), updatedAt: new Date() },
  { id: 'note-2', title: 'Reminder 1', content: 'rem', type: 'reminder-card', categoryId: 'cat-1', createdAt: new Date(), updatedAt: new Date() },
  { id: 'note-3', title: 'Reminder 2', content: 'rem', type: 'reminder-card', categoryId: 'cat-1', createdAt: new Date(), updatedAt: new Date() },
  { id: 'note-4', title: 'Category 2 Reminder', content: 'rem', type: 'reminder-card', categoryId: 'cat-2', createdAt: new Date(), updatedAt: new Date() },
]

describe('Sidebar', () => {
  const mockCreateCategory = vi.fn(() => 'cat-new')
  const mockDeleteCategory = vi.fn()
  const mockUpdateCategory = vi.fn()
  const mockOnSelectCategory = vi.fn()

  beforeEach(() => {
    vi.clearAllMocks()
    useUiModeStore.setState({ mode: 'document' })

    ;(useCategories as unknown as ReturnType<typeof vi.fn>).mockImplementation((selector: (state: unknown) => unknown) =>
      selector({
        categories: mockCategories,
        createCategory: mockCreateCategory,
        deleteCategory: mockDeleteCategory,
        updateCategory: mockUpdateCategory,
      }),
    )

    ;(useNotes as unknown as ReturnType<typeof vi.fn>).mockImplementation((selector: (state: unknown) => unknown) =>
      selector({
        notes: mockNotes,
      }),
    )
  })

  it('switches into reminder mode when the reminder segment is clicked', () => {
    renderWithProviders(
      <Sidebar selectedCategoryId={null} onSelectCategory={mockOnSelectCategory} />,
    )

    fireEvent.click(screen.getByRole('button', { name: '提醒' }))

    expect(useUiModeStore.getState().mode).toBe('reminder')
  })

  it('shows reminder-card counts when reminder mode is active', () => {
    useUiModeStore.setState({ mode: 'reminder' })

    renderWithProviders(
      <Sidebar selectedCategoryId="cat-1" onSelectCategory={mockOnSelectCategory} />,
    )

    expect(screen.getByText('2')).toBeInTheDocument()
    expect(screen.getByText('1')).toBeInTheDocument()
  })
})
