import React, { useState } from 'react'
import { Editor } from '@tiptap/core'
import { openLink } from '@utils/tauri'
import {
  ContextMenu,
  ContextMenuContent,
  ContextMenuItem,
  ContextMenuSeparator,
  ContextMenuTrigger,
} from './context-menu'
import { LinkDialog } from './link-dialog'

interface EditorContextMenuProps {
  editor: Editor
  children: React.ReactNode
}

interface LinkContext {
  href: string
  text: string
}

export const EditorContextMenu: React.FC<EditorContextMenuProps> = ({
  editor,
  children,
}) => {
  const [showLinkDialog, setShowLinkDialog] = useState(false)
  const [linkContext, setLinkContext] = useState<LinkContext | null>(null)

  const getLinkElement = (target: EventTarget | null): HTMLAnchorElement | null => {
    if (!(target instanceof HTMLElement)) return null
    return target.closest('a[href]')
  }

  const selectLinkRange = (linkElement: HTMLAnchorElement) => {
    const startNode = linkElement.firstChild ?? linkElement
    const endOffset =
      startNode.nodeType === Node.TEXT_NODE
        ? startNode.textContent?.length ?? 0
        : linkElement.childNodes.length

    const from = editor.view.posAtDOM(startNode, 0)
    const to = editor.view.posAtDOM(startNode, endOffset)

    editor
      .chain()
      .focus()
      .setTextSelection({ from, to })
      .extendMarkRange('link')
      .run()
  }

  const handleContextMenuCapture = (event: React.MouseEvent<HTMLDivElement>) => {
    const linkElement = getLinkElement(event.target)

    if (!linkElement) {
      setLinkContext(null)
      return
    }

    setLinkContext({
      href: linkElement.getAttribute('href') || linkElement.href,
      text: linkElement.textContent || '',
    })

    selectLinkRange(linkElement)
  }

  const handleClickCapture = async (event: React.MouseEvent<HTMLDivElement>) => {
    const linkElement = getLinkElement(event.target)
    if (!linkElement) return

    if (event.ctrlKey || event.metaKey) {
      event.preventDefault()
      event.stopPropagation()
      await openLink(linkElement.getAttribute('href') || linkElement.href)
    }
  }

  const handleCopy = async () => {
    if (!editor.state.selection.empty) {
      const text = editor.state.doc.textBetween(
        editor.state.selection.from,
        editor.state.selection.to,
        ' ',
      )
      await navigator.clipboard.writeText(text)
    }
  }

  const handlePaste = async () => {
    try {
      const text = await navigator.clipboard.readText()
      editor.chain().focus().insertContent(text).run()
    } catch (error) {
      console.error('粘贴失败:', error)
    }
  }

  const handlePasteAsText = async () => {
    try {
      const text = await navigator.clipboard.readText()
      const plainText = text
        .replace(/<[^>]*>/g, '')
        .replace(/\r\n/g, '\n')
        .replace(/\r/g, '\n')
        .split('\n')
        .filter((line) => line.trim() !== '')
        .join('\n')

      const finalText = plainText.endsWith('\n') ? plainText : `${plainText}\n`

      editor
        .chain()
        .focus()
        .insertContent(finalText, {
          parseOptions: {
            preserveWhitespace: true,
          },
        })
        .run()
    } catch (error) {
      console.error('粘贴失败:', error)
    }
  }

  const handleOpenCurrentLink = async () => {
    if (!linkContext?.href) return
    await openLink(linkContext.href)
  }

  const handleEditCurrentLink = () => {
    if (!linkContext) return
    setShowLinkDialog(true)
  }

  const handleCopyCurrentLink = async () => {
    if (!linkContext?.href) return
    await navigator.clipboard.writeText(linkContext.href)
  }

  const handleDeleteCurrentLink = () => {
    if (!linkContext) return
    editor.chain().focus().extendMarkRange('link').unsetLink().run()
    setLinkContext(null)
  }

  return (
    <>
      <ContextMenu>
        <ContextMenuTrigger asChild>
          <div onContextMenuCapture={handleContextMenuCapture} onClickCapture={handleClickCapture}>
            {children}
          </div>
        </ContextMenuTrigger>
        <ContextMenuContent className="w-48">
          {linkContext ? (
            <>
              <ContextMenuItem onClick={handleOpenCurrentLink}>打开链接</ContextMenuItem>
              <ContextMenuItem onClick={handleEditCurrentLink}>编辑链接</ContextMenuItem>
              <ContextMenuItem onClick={handleCopyCurrentLink}>复制链接</ContextMenuItem>
              <ContextMenuItem onClick={handleDeleteCurrentLink}>删除链接</ContextMenuItem>
              <ContextMenuSeparator />
            </>
          ) : null}
          <ContextMenuItem
            disabled={editor.state.selection.empty}
            onClick={handleCopy}
            className="flex items-center"
          >
            <span>复制</span>
            <span className="ml-auto text-xs text-muted-foreground">⌘C</span>
          </ContextMenuItem>
          <ContextMenuItem onClick={handlePaste} className="flex items-center">
            <span>粘贴</span>
            <span className="ml-auto text-xs text-muted-foreground">⌘V</span>
          </ContextMenuItem>
          <ContextMenuItem onClick={handlePasteAsText} className="flex items-center">
            <span>粘贴为纯文本</span>
            <span className="ml-auto text-xs text-muted-foreground">⇧⌘V</span>
          </ContextMenuItem>
        </ContextMenuContent>
      </ContextMenu>
      <LinkDialog
        editor={editor}
        isOpen={showLinkDialog}
        onClose={() => setShowLinkDialog(false)}
      />
    </>
  )
}
