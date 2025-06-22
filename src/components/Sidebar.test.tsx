import { describe, it, expect, vi } from 'vitest'
import { screen, fireEvent } from '@testing-library/react'
import { Sidebar } from './Sidebar'
import { renderWithProviders } from '@test/utils'
import { useCategories } from '@stores/categoryStore'

// Mock zustand store
vi.mock('@stores/categoryStore', () => ({
  useCategories: vi.fn()
}))

describe('Sidebar', () => {
  const mockCategories = [
    { id: '1', name: 'Category 1', createdAt: new Date(), updatedAt: new Date() },
    { id: '2', name: 'Category 2', createdAt: new Date(), updatedAt: new Date() }
  ]

  const mockAddCategory = vi.fn()
  const mockOnSelectCategory = vi.fn()

  beforeEach(() => {
    (useCategories as any).mockImplementation((selector) => 
      selector({ 
        categories: mockCategories,
        addCategory: mockAddCategory
      })
    )
  })

  it('renders correctly', () => {
    renderWithProviders(
      <Sidebar
        selectedCategory={null}
        onSelectCategory={mockOnSelectCategory}
      />
    )

    expect(screen.getByText('笔记本')).toBeInTheDocument()
    expect(screen.getByText('Category 1')).toBeInTheDocument()
    expect(screen.getByText('Category 2')).toBeInTheDocument()
  })

  it('calls addCategory when add button is clicked', () => {
    renderWithProviders(
      <Sidebar
        selectedCategory={null}
        onSelectCategory={mockOnSelectCategory}
      />
    )

    const addButton = screen.getByRole('button', { name: '' })
    fireEvent.click(addButton)

    expect(mockAddCategory).toHaveBeenCalled()
  })

  it('calls onSelectCategory when category is clicked', () => {
    renderWithProviders(
      <Sidebar
        selectedCategory={null}
        onSelectCategory={mockOnSelectCategory}
      />
    )

    const categoryButton = screen.getByText('Category 1')
    fireEvent.click(categoryButton)

    expect(mockOnSelectCategory).toHaveBeenCalledWith('1')
  })

  it('highlights selected category', () => {
    renderWithProviders(
      <Sidebar
        selectedCategory="1"
        onSelectCategory={mockOnSelectCategory}
      />
    )

    const selectedCategory = screen.getByText('Category 1').parentElement
    expect(selectedCategory).toHaveClass('bg-blue-100')
  })
}) 