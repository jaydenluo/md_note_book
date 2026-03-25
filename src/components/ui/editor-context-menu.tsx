import React from 'react'
import { Editor } from '@tiptap/core'
import {
  ContextMenu,
  ContextMenuContent,
  ContextMenuItem,
  ContextMenuTrigger,
} from './context-menu'

interface EditorContextMenuProps {
  editor: Editor
  children: React.ReactNode
}

export const EditorContextMenu: React.FC<EditorContextMenuProps> = ({
  editor,
  children,
}) => {
  // 处理复制
  const handleCopy = async () => {
    if (!editor.state.selection.empty) {
      const text = editor.state.doc.textBetween(
        editor.state.selection.from,
        editor.state.selection.to,
        ' '
      )
      await navigator.clipboard.writeText(text)
    }
  }

  // 处理粘贴
  const handlePaste = async () => {
    try {
      const text = await navigator.clipboard.readText()
      editor.chain().focus().insertContent(text).run()
    } catch (error) {
      console.error('粘贴失败:', error)
    }
  }

  // 处理粘贴为纯文本
  const handlePasteAsText = async () => {
    try {
      const text = await navigator.clipboard.readText()
      // 移除所有HTML标签，保留换行符，但清除空行
      const plainText = text
        .replace(/<[^>]*>/g, '') // 移除HTML标签
        .replace(/\r\n/g, '\n') // 统一换行符
        .replace(/\r/g, '\n') // 统一换行符
        .split('\n') // 分割成行
        .filter(line => line.trim() !== '') // 移除空行
        .join('\n') // 重新组合，保留换行符
      
      // 如果最后一个字符不是换行符，不添加额外的换行符
      const finalText = plainText.endsWith('\n') ? plainText : plainText + '\n'
      
      // 使用 insertContent 插入处理后的文本
      editor
        .chain()
        .focus()
        .insertContent(finalText, {
          parseOptions: {
            preserveWhitespace: true // 保留换行符
          }
        })
        .run()
    } catch (error) {
      console.error('粘贴失败:', error)
    }
  }

  return (
    <ContextMenu>
      <ContextMenuTrigger asChild>
        {children}
      </ContextMenuTrigger>
      <ContextMenuContent className="w-48">
        <ContextMenuItem
          disabled={editor.state.selection.empty}
          onClick={handleCopy}
          className="flex items-center"
        >
          <span>复制</span>
          <span className="ml-auto text-xs text-muted-foreground">⌘C</span>
        </ContextMenuItem>
        <ContextMenuItem
          onClick={handlePaste}
          className="flex items-center"
        >
          <span>粘贴</span>
          <span className="ml-auto text-xs text-muted-foreground">⌘V</span>
        </ContextMenuItem>
        <ContextMenuItem
          onClick={handlePasteAsText}
          className="flex items-center"
        >
          <span>粘贴为纯文本</span>
          <span className="ml-auto text-xs text-muted-foreground">⇧⌘V</span>
        </ContextMenuItem>
      </ContextMenuContent>
    </ContextMenu>
  )
} 