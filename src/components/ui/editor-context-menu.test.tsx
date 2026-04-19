import React from 'react'
import { fireEvent, render, screen } from '@testing-library/react'
import { beforeEach, describe, expect, it, vi } from 'vitest'
import { EditorContextMenu } from './editor-context-menu'

const openLinkMock = vi.fn()

vi.mock('@utils/tauri', () => ({
  openLink: (url: string) => openLinkMock(url),
}))

vi.mock('./link-dialog', () => ({
  LinkDialog: ({ isOpen }: { isOpen: boolean }) => (isOpen ? <div>编辑链接对话框</div> : null),
}))

describe('EditorContextMenu', () => {
  const editor = {
    state: {
      selection: {
        empty: false,
        from: 1,
        to: 5,
      },
      doc: {
        textBetween: vi.fn(() => '链接文本'),
      },
    },
    view: {
      posAtDOM: vi.fn(() => 1),
    },
    chain: vi.fn(() => ({
      focus: vi.fn().mockReturnThis(),
      setTextSelection: vi.fn().mockReturnThis(),
      extendMarkRange: vi.fn().mockReturnThis(),
      unsetLink: vi.fn().mockReturnThis(),
      insertContent: vi.fn().mockReturnThis(),
      run: vi.fn(),
    })),
    isActive: vi.fn(() => false),
    getAttributes: vi.fn(() => ({ href: 'https://example.com' })),
  } as any

  beforeEach(() => {
    vi.clearAllMocks()
    Object.assign(navigator, {
      clipboard: {
        writeText: vi.fn(),
        readText: vi.fn().mockResolvedValue('clipboard text'),
      },
    })
  })

  it('shows link-specific actions when right-clicking a hyperlink', async () => {
    render(
      <EditorContextMenu editor={editor}>
        <div>
          <a href="https://example.com">链接文本</a>
        </div>
      </EditorContextMenu>,
    )

    fireEvent.contextMenu(screen.getByText('链接文本'))

    expect(await screen.findByText('打开链接')).toBeInTheDocument()
    expect(screen.getByText('编辑链接')).toBeInTheDocument()
    expect(screen.getByText('复制链接')).toBeInTheDocument()
    expect(screen.getByText('删除链接')).toBeInTheDocument()
  })

  it('opens the link on ctrl-click', () => {
    render(
      <EditorContextMenu editor={editor}>
        <div>
          <a href="https://example.com">链接文本</a>
        </div>
      </EditorContextMenu>,
    )

    fireEvent.click(screen.getByText('链接文本'), { ctrlKey: true })

    expect(openLinkMock).toHaveBeenCalledWith('https://example.com')
  })
})
