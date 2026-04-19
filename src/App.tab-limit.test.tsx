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
    contextMenu: { visible: false, x: 0, y: 0, data: null, type: undefined },
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

describe('App tab limit behavior', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    useUiModeStore.setState({ mode: 'document' })

    const categoryState = {
      categories: [{ id: 'cat-1', name: 'Ops', color: 'blue', createdAt: new Date(), updatedAt: new Date() }],
      loadCategories: vi.fn().mockResolvedValue(undefined),
      createCategory: vi.fn().mockResolvedValue('cat-1'),
    }

    const noteState = {
      notes: Array.from({ length: 11 }, (_, index) => ({
        id: `note-${index + 1}`,
        title: `Note ${index + 1}`,
        content: `Content ${index + 1}`,
        type: 'doc',
        categoryId: 'cat-1',
        createdAt: new Date(),
        updatedAt: new Date(),
      })),
      loadNotes: vi.fn().mockResolvedValue(undefined),
      loadNoteContent: vi.fn().mockResolvedValue(null),
      createNote: vi.fn(),
      updateNote: vi.fn().mockResolvedValue(true),
      deleteNote: vi.fn().mockResolvedValue(undefined),
    }

    const tabsState = {
      tabs: Array.from({ length: 10 }, (_, index) => ({
        id: `tab-${index + 1}`,
        noteId: `note-${index + 1}`,
        title: `Note ${index + 1}`,
      })),
      activeTabId: 'tab-1',
      addTab: vi.fn(),
      closeTab: vi.fn(),
      closeAllTabs: vi.fn(),
      activateTab: vi.fn(),
      getTabByNoteId: vi.fn((noteId: string) =>
        noteId === 'note-11' ? undefined : tabsState.tabs.find((tab) => tab.noteId === noteId)
      ),
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

  it('requests a save for the oldest tab before opening the 11th tab', async () => {
    const dispatchEventSpy = vi.spyOn(window, 'dispatchEvent')

    render(<App />)

    await waitFor(() => {
      expect(storage.init).toHaveBeenCalled()
    })

    fireEvent.click(screen.getByText('Note 11'))

    expect(dispatchEventSpy).toHaveBeenCalled()
  })
})
