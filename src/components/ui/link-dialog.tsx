import React, { useState, useEffect } from 'react'
import { Editor } from '@tiptap/core'
import { TextSelection } from '@tiptap/pm/state'
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from './dialog'
import { Button } from './button'
import { Input } from './input'

interface LinkDialogProps {
  editor: Editor
  isOpen: boolean
  onClose: () => void
}

export const LinkDialog: React.FC<LinkDialogProps> = ({ editor, isOpen, onClose }) => {
  const [url, setUrl] = useState('')
  const [text, setText] = useState('')
  const [urlError, setUrlError] = useState('')
  
  // 当对话框打开时，获取选中的文本
  useEffect(() => {
    if (isOpen) {
      const selectedText = editor.state.selection.empty 
        ? '' 
        : editor.state.doc.textBetween(
            editor.state.selection.from,
            editor.state.selection.to,
            ' '
          )
      setText(selectedText)
      setUrlError('')
      
      // 如果选中的是链接，获取链接地址
      if (editor.isActive('link')) {
        const attrs = editor.getAttributes('link')
        setUrl(attrs.href || '')
      } else {
        setUrl('')
      }
    }
  }, [isOpen, editor])

  // URL 验证函数
  const validateUrl = (url: string): boolean => {
    if (!url.trim()) {
      setUrlError('请输入链接地址')
      return false
    }

    if (!url.startsWith('http://') && !url.startsWith('https://')) {
      setUrlError('链接必须以 http:// 或 https:// 开头')
      return false
    }

    try {
      new URL(url)
      setUrlError('')
      return true
    } catch (error) {
      setUrlError('请输入有效的链接地址')
      return false
    }
  }

  // 处理 URL 输入变化
  const handleUrlChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const newUrl = e.target.value
    setUrl(newUrl)
    if (newUrl) {
      validateUrl(newUrl)
    } else {
      setUrlError('')
    }
  }

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault()
    
    // 如果没有文本，不允许添加链接
    if (!text.trim()) {
      return
    }

    // 验证 URL
    if (!validateUrl(url)) {
      return
    }

    try {
      const urlObj = new URL(url)
      const finalUrl = urlObj.toString()

      editor
        .chain()
        .focus()
        .command(({ tr, dispatch }) => {
          if (dispatch) {
            // 如果当前没有选中文本，先插入文本
            if (editor.state.selection.empty) {
              tr.insertText(text)
              const pos = tr.selection.from - text.length
              tr.setSelection(TextSelection.create(tr.doc, pos, tr.selection.from))
            } else {
              // 如果文本被修改，先更新文本
              const currentText = editor.state.doc.textBetween(
                editor.state.selection.from,
                editor.state.selection.to,
                ' '
              )
              if (currentText !== text) {
                tr.insertText(text, tr.selection.from, tr.selection.to)
              }
            }
            dispatch(tr)
          }
          return true
        })
        .setLink({ href: finalUrl })
        .run()

      setUrl('')
      setText('')
      setUrlError('')
      onClose()
    } catch (error) {
      setUrlError('链接格式无效')
    }
  }

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>添加链接</DialogTitle>
        </DialogHeader>
        <form onSubmit={handleSubmit}>
          <div className="grid gap-4 py-4">
            <div className="grid gap-2">
              <label htmlFor="text" className="text-sm font-medium">
                链接文本
              </label>
              <Input
                id="text"
                placeholder="请输入链接文本"
                value={text}
                onChange={(e) => setText(e.target.value)}
                autoFocus
                required
              />
            </div>
            <div className="grid gap-2">
              <label htmlFor="url" className="text-sm font-medium">
                链接地址
              </label>
              <Input
                id="url"
                placeholder="请输入链接地址 (例如: https://example.com)"
                value={url}
                onChange={handleUrlChange}
                required
                className={urlError ? 'border-red-500' : ''}
              />
              {urlError && (
                <p className="text-sm text-red-500 mt-1">{urlError}</p>
              )}
            </div>
          </div>
          <DialogFooter>
            <Button type="button" variant="outline" onClick={onClose}>
              取消
            </Button>
            <Button 
              type="submit" 
              disabled={!text.trim() || !url.trim() || Boolean(urlError)}
            >
              确定
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  )
} 