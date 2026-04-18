import { render, screen, waitFor } from '@testing-library/react'
import { beforeEach, describe, expect, it, vi } from 'vitest'
import App from './App'
import { useUiModeStore } from '@stores/uiModeStore'
import { storage } from '@services/storage'
import { useCategories } from '@stores/categoryStore'
import { useNotes } from '@stores/noteStore'
import { useTags } from '@stores/tagStore'
import { useTabs } from '@stores/tabsStore'
import { useConfig } from '@stores/configStore'

vi.mock('@services/storage', () => ({
  storage: {
    init: vi.fn().mockResolvedValue(undefined),
    saveSettings: vi.fn().mockResolvedValue(undefined),
    getSettings: vi.fn().mockResolvedValue({ selectedCategoryId: 'cat-1' }),
  },
}))

vi.mock('@stores/categoryStore', () => ({
  useCategories: vi.fn(),
}))

vi.mock('@stores/noteStore', () => ({
  useNotes: vi.fn(),
  triggerGitAutoSync: vi.fn().mockResolvedValue(undefined),
}))

vi.mock('@stores/tagStore', () => ({
  useTags: vi.fn(),
}))

vi.mock('@stores/tabsStore', () => ({
  useTabs: vi.fn(),
}))

vi.mock('@stores/configStore', () => ({
  useConfig: vi.fn(),
}))

vi.mock('@utils/theme', () => ({
  useTheme: () => ({ isDark: false }),
  useAutoCodeTheme: vi.fn(),
  switchCodeTheme: vi.fn(),
}))

vi.mock('@/components/QuickSearchDialog', () => ({
  useQuickSearch: () => ({ QuickSearchDialog: () => null }),
}))

vi.mock('@/components/ui/alert-dialog', () => ({
  useAlertDialog: () => ({ showConfirm: vi.fn().mockResolvedValue(true) }),
}))

vi.mock('./components/TabManager', () => ({
  TabManager: () => <div data-testid="tab-manager" />,
}))

vi.mock('./components/NoteTab', () => ({
  NoteTab: () => <div data-testid="note-tab" />,
}))

vi.mock('./components/ui/ResizablePanel', () => ({
  ResizablePanel: ({ children }: { children: React.ReactNode }) => <div>{children}</div>,
}))

vi.mock('./components/Sidebar', () => ({
  Sidebar: () => <div data-testid="sidebar-component" />,
}))

vi.mock('./components/ReminderBoard', () => ({
  ReminderBoard: () => <div data-testid="reminder-board" />,
}))

vi.mock('./components/ui/ContextMenu', () => ({
  ContextMenu: () => null,
  useContextMenu: () => ({
    contextMenu: { visible: false, x: 0, y: 0, data: null },
    showContextMenu: vi.fn(),
    hideContextMenu: vi.fn(),
  }),
}))

vi.mock('@utils/contextMenu', () => ({
  setupContextMenu: vi.fn(),
}))

vi.mock('./services/exportService', () => ({
  ExportService: {
    exportAsMarkdown: vi.fn(),
    exportAsPDF: vi.fn(),
  },
}))

describe('App reminder mode', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    useUiModeStore.setState({ mode: 'reminder' })

    const categoryState = {
      categories: [{ id: 'cat-1', name: 'Ops', color: 'blue', createdAt: new Date(), updatedAt: new Date() }],
      loadCategories: vi.fn().mockResolvedValue(undefined),
      createCategory: vi.fn().mockResolvedValue('cat-1'),
    }

    const noteState = {
      notes: [
        {
          id: 'rem-1',
          title: 'Server Renew',
          content: 'renew',
          type: 'reminder-card',
          categoryId: 'cat-1',
          dueDate: new Date('2026-04-25T00:00:00.000Z'),
          createdAt: new Date(),
          updatedAt: new Date(),
        },
      ],
      loadNotes: vi.fn().mockResolvedValue(undefined),
      loadNoteContent: vi.fn().mockResolvedValue(null),
      createNote: vi.fn(),
      updateNote: vi.fn().mockResolvedValue(true),
      deleteNote: vi.fn().mockResolvedValue(undefined),
    }

    const tabsState = {
      tabs: [],
      activeTabId: null,
      addTab: vi.fn(),
      closeTab: vi.fn(),
      closeAllTabs: vi.fn(),
      activateTab: vi.fn(),
      getTabByNoteId: vi.fn(),
    }

    ;(useCategories as unknown as ReturnType<typeof vi.fn>).mockImplementation((selector: (state: unknown) => unknown) =>
      selector(categoryState),
    )
    ;(useCategories as unknown as ReturnType<typeof vi.fn> & { getState?: () => unknown }).getState = () => categoryState

    ;(useNotes as unknown as ReturnType<typeof vi.fn>).mockImplementation((selector: (state: unknown) => unknown) =>
      selector(noteState),
    )
    ;(useNotes as unknown as ReturnType<typeof vi.fn> & { getState?: () => unknown }).getState = () => noteState

    ;(useTags as unknown as ReturnType<typeof vi.fn>).mockImplementation((selector: (state: unknown) => unknown) =>
      selector({
        loadTags: vi.fn().mockResolvedValue(undefined),
      }),
    )

    ;(useTabs as unknown as ReturnType<typeof vi.fn>).mockImplementation((selector: (state: unknown) => unknown) =>
      selector(tabsState),
    )
    ;(useTabs as unknown as ReturnType<typeof vi.fn> & { getState?: () => unknown }).getState = () => tabsState

    ;(useConfig as unknown as ReturnType<typeof vi.fn>).mockReturnValue({
      config: {
        autoSaveInterval: 0,
        codeTheme: { light: 'github', dark: 'atom-one-dark', noBackground: false },
      },
    })
  })

  it('renders the reminder board when reminder mode is active', async () => {
    render(<App />)

    await waitFor(() => {
      expect(storage.init).toHaveBeenCalled()
    })

    expect(screen.getByTestId('sidebar-component')).toBeInTheDocument()
    expect(screen.getByTestId('reminder-board')).toBeInTheDocument()
    expect(screen.queryByText('广告位（16:9占位）')).not.toBeInTheDocument()
  })
})
