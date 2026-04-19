import { fireEvent, render, screen, waitFor } from '@testing-library/react'
import { beforeEach, describe, expect, it, vi } from 'vitest'
import App from './App'
import { useUiModeStore } from '@stores/uiModeStore'
import { storage } from '@services/storage'
import { useCategories } from '@stores/categoryStore'
import { useNotes } from '@stores/noteStore'
import { useTags } from '@stores/tagStore'
import { useTabs } from '@stores/tabsStore'
import { useConfig } from '@stores/configStore'

const showContextMenuMock = vi.fn()

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
  ContextMenu: ({ items, visible }: { items: { label: string }[]; visible: boolean }) =>
    visible ? (
      <div data-testid="app-context-menu">
        {items.map((item) => (
          <span key={item.label}>{item.label}</span>
        ))}
      </div>
    ) : null,
  useContextMenu: () => ({
    contextMenu: { visible: false, x: 0, y: 0, data: null },
    showContextMenu: showContextMenuMock,
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

describe('App note-list context menu', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    useUiModeStore.setState({ mode: 'document' })

    const categoryState = {
      categories: [{ id: 'cat-1', name: 'Ops', color: 'blue', createdAt: new Date(), updatedAt: new Date() }],
      loadCategories: vi.fn().mockResolvedValue(undefined),
      createCategory: vi.fn().mockResolvedValue('cat-1'),
    }

    const noteState = {
      notes: [],
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

  it('opens the note-list context menu when right-clicking the empty area', async () => {
    render(<App />)

    await waitFor(() => {
      expect(storage.init).toHaveBeenCalled()
    })

    const emptyArea = screen.getByText(/16:9/).parentElement
    expect(emptyArea).toBeTruthy()

    fireEvent.contextMenu(emptyArea as HTMLElement)

    expect(showContextMenuMock).toHaveBeenCalled()
  })
})
