import { useEffect, useState, useRef, useCallback } from 'react'
import type { FC } from 'react'
import { useNotes } from '@stores/noteStore'
import { useTags } from '@stores/tagStore'
import { useCategories } from '@stores/categoryStore'
import { useTabs } from '@stores/tabsStore'
import { md } from '@utils/markdown'
import TagSelector from './TagSelector'
import WysiwygMarkdownEditor from './WysiwygMarkdownEditor'
import { debounce } from '@utils/debounce'
import { useHotkeys } from '@hooks/useHotkeys'
import { motion, AnimatePresence } from 'framer-motion'
import { cn } from '@utils/cn'
import { ResizablePanel } from './ui/ResizablePanel'

interface EditorProps {
  noteId: string | null
}

// Markdown工具栏按钮配置
const toolbarItems = [
  { 
    icon: () => <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M6 12h8a4 4 0 100-8H6v8zm0 0h8a4 4 0 110 8H6v-8z" />
    </svg>,
    action: 'bold', 
    title: '粗体 (Ctrl+B)', 
    shortcut: 'Ctrl+B' 
  },
  { 
    icon: () => <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M10 20l4-16m4 4l4 4-4 4M6 16l-4-4 4-4" />
    </svg>,
    action: 'italic', 
    title: '斜体 (Ctrl+I)', 
    shortcut: 'Ctrl+I' 
  },
  { 
    icon: () => <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M6 18L18 6M6 6l12 12" />
    </svg>,
    action: 'strikethrough', 
    title: '删除线 (Ctrl+Shift+X)', 
    shortcut: 'Ctrl+Shift+X' 
  },
  { 
    icon: () => <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M7 20l4-16m2 16l4-16M6 9h14M4 15h14" />
    </svg>,
    action: 'h1', 
    title: '一级标题', 
    shortcut: 'Ctrl+1' 
  },
  { 
    icon: () => <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M7 20l4-16m2 16l4-16M6 9h14M4 15h14" />
    </svg>,
    action: 'h2', 
    title: '二级标题', 
    shortcut: 'Ctrl+2' 
  },
  { 
    icon: () => <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M7 20l4-16m2 16l4-16M6 9h14M4 15h14" />
    </svg>,
    action: 'h3', 
    title: '三级标题', 
    shortcut: 'Ctrl+3' 
  },
  { 
    icon: () => <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M4 6h16M4 10h16M4 14h16M4 18h16" />
    </svg>,
    action: 'ul', 
    title: '无序列表 (Ctrl+L)', 
    shortcut: 'Ctrl+L' 
  },
  { 
    icon: () => <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M9 5H7a2 2 0 00-2 2v10a2 2 0 002 2h8a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2" />
    </svg>,
    action: 'ol', 
    title: '有序列表 (Ctrl+Shift+L)', 
    shortcut: 'Ctrl+Shift+L' 
  },
  { 
    icon: () => <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M8 12h.01M12 12h.01M16 12h.01M21 12c0 4.418-4.03 8-9 8a9.863 9.863 0 01-4.255-.949L3 20l1.395-3.72C3.512 15.042 3 13.574 3 12c0-4.418 4.03-8 9-8s9 3.582 9 8z" />
    </svg>,
    action: 'quote', 
    title: '引用 (Ctrl+Q)', 
    shortcut: 'Ctrl+Q' 
  },
  { 
    icon: () => <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M10 20l4-16m4 4l4 4-4 4M6 16l-4-4 4-4" />
    </svg>,
    action: 'code', 
    title: '代码块 (Ctrl+Shift+C)', 
    shortcut: 'Ctrl+Shift+C' 
  },
  { 
    icon: () => <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M13.828 10.172a4 4 0 00-5.656 0l-4 4a4 4 0 105.656 5.656l1.102-1.101m-.758-4.899a4 4 0 005.656 0l4-4a4 4 0 00-5.656-5.656l-1.1 1.1" />
    </svg>,
    action: 'link', 
    title: '链接 (Ctrl+K)', 
    shortcut: 'Ctrl+K' 
  },
  { 
    icon: () => <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z" />
    </svg>,
    action: 'image', 
    title: '图片 (Ctrl+Shift+I)', 
    shortcut: 'Ctrl+Shift+I' 
  },
  { 
    icon: () => <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M3 10h18M3 14h18m-9-4v8m-7 0h14a2 2 0 002-2V8a2 2 0 00-2-2H5a2 2 0 00-2 2v8a2 2 0 002 2z" />
    </svg>,
    action: 'table', 
    title: '表格', 
    shortcut: 'Ctrl+T' 
  },
  { 
    icon: () => <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M20 12H4" />
    </svg>,
    action: 'hr', 
    title: '分割线', 
    shortcut: 'Ctrl+Shift+H' 
  },
]

// 大纲项接口
interface OutlineItem {
  id: string
  level: number
  text: string
  position: number
}

const Editor = ({ noteId }: EditorProps) => {
  const [isPreview, setIsPreview] = useState(false)
  const [isSplitView, setIsSplitView] = useState(false)
  const [isSaving, setIsSaving] = useState(false)
  const [isTagSelectorOpen, setIsTagSelectorOpen] = useState(false)
  const [renderedContent, setRenderedContent] = useState('')
  const [showToolbar, setShowToolbar] = useState(true)
  const [cursorPosition, setCursorPosition] = useState({ start: 0, end: 0 })
  const [showOutline, setShowOutline] = useState(true)
  const [outlineItems, setOutlineItems] = useState<OutlineItem[]>([])
  const titleRef = useRef<HTMLInputElement>(null)
  const contentRef = useRef<HTMLTextAreaElement>(null)
  const fileInputRef = useRef<HTMLInputElement>(null)

  const note = useNotes(state => 
    noteId ? state.notes.find(n => n.id === noteId) : null
  )
  const updateNote = useNotes(state => state.updateNote)
  const deleteNote = useNotes(state => state.deleteNote)
  const getNoteTags = useTags(state => state.getNoteTags)
  const categories = useCategories(state => state.categories)
  
  // 获取标签页相关的状态和方法
  const updateTabTitle = useTabs(state => state.updateTabTitle)
  const getTabByNoteId = useTabs(state => state.getTabByNoteId)

  // 获取当前笔记对应的标签页
  const tab = noteId ? getTabByNoteId(noteId) : null

  // 获取当前笔记的分类
  const category = note 
    ? categories.find(c => c.id === note.categoryId) 
    : null

  // 保存笔记的防抖函数
  const debouncedSave = useRef(
    debounce(async (id: string, data: { title?: string; content?: string }) => {
      setIsSaving(true)
      await updateNote(id, data)
      
      // 如果更新了标题，同时更新标签页标题
      if (data.title && tab) {
        updateTabTitle(tab.id, data.title)
      }
      
      setTimeout(() => setIsSaving(false), 500)
    }, 500)
  ).current

  // 处理标题变更
  const handleTitleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (note) {
      const newTitle = e.target.value
      debouncedSave(note.id, { title: newTitle })
    }
  }

  // 处理内容变更
  const handleContentChange = (e: React.ChangeEvent<HTMLTextAreaElement>) => {
    if (note) {
      const newContent = e.target.value
      debouncedSave(note.id, { content: newContent })
      
      // 更新预览内容
      if (isPreview || isSplitView) {
        setRenderedContent(md.render(newContent))
      }
      
      // 更新大纲
      extractOutline(newContent)
    }
  }

  // 提取大纲
  const extractOutline = (content: string) => {
    const headingRegex = /^(#{1,6})\s+(.+)$/gm
    const items: OutlineItem[] = []
    let match
    
    while ((match = headingRegex.exec(content)) !== null) {
      items.push({
        id: `heading-${items.length}`,
        level: match[1].length,
        text: match[2],
        position: match.index
      })
    }
    
    setOutlineItems(items)
  }

  // 处理删除笔记
  const handleDeleteNote = () => {
    if (note && confirm('确定要删除这个笔记吗？')) {
      deleteNote(note.id)
    }
  }

  // 获取选中的文本
  const getSelectedText = () => {
    if (!contentRef.current) return ''
    
    const { selectionStart, selectionEnd, value } = contentRef.current
    return value.substring(selectionStart, selectionEnd)
  }

  // 替换选中的文本
  const replaceSelectedText = (replacement: string) => {
    if (!contentRef.current || !note) return
    
    const textarea = contentRef.current
    const { selectionStart, selectionEnd, value } = textarea
    
    const newContent = value.substring(0, selectionStart) + 
                       replacement + 
                       value.substring(selectionEnd)
    
    // 更新文本区域的值
    textarea.value = newContent
    
    // 触发内容变更事件
    const event = new Event('input', { bubbles: true })
    textarea.dispatchEvent(event)
    
    // 保存更改
    debouncedSave(note.id, { content: newContent })
    
    // 设置新的光标位置
    textarea.focus()
    textarea.setSelectionRange(
      selectionStart + replacement.length,
      selectionStart + replacement.length
    )
  }

  // 在光标位置插入文本
  const insertAtCursor = (text: string) => {
    if (!contentRef.current || !note) return
    
    const textarea = contentRef.current
    const { selectionStart, value } = textarea
    
    const newContent = value.substring(0, selectionStart) + 
                       text + 
                       value.substring(selectionStart)
    
    // 更新文本区域的值
    textarea.value = newContent
    
    // 触发内容变更事件
    const event = new Event('input', { bubbles: true })
    textarea.dispatchEvent(event)
    
    // 保存更改
    debouncedSave(note.id, { content: newContent })
    
    // 设置新的光标位置
    textarea.focus()
    textarea.setSelectionRange(
      selectionStart + text.length,
      selectionStart + text.length
    )
  }

  // 处理工具栏操作
  const handleToolbarAction = (action: string) => {
    if (!note || !contentRef.current) return
    
    const selectedText = getSelectedText()
    
    switch (action) {
      case 'bold':
        replaceSelectedText(`**${selectedText || '粗体文本'}**`)
        break
      case 'italic':
        replaceSelectedText(`*${selectedText || '斜体文本'}*`)
        break
      case 'strikethrough':
        replaceSelectedText(`~~${selectedText || '删除线文本'}~~`)
        break
      case 'h1':
        replaceSelectedText(`# ${selectedText || '一级标题'}`)
        break
      case 'h2':
        replaceSelectedText(`## ${selectedText || '二级标题'}`)
        break
      case 'h3':
        replaceSelectedText(`### ${selectedText || '三级标题'}`)
        break
      case 'ul':
        replaceSelectedText(`- ${selectedText || '列表项'}`)
        break
      case 'ol':
        replaceSelectedText(`1. ${selectedText || '列表项'}`)
        break
      case 'quote':
        replaceSelectedText(`> ${selectedText || '引用文本'}`)
        break
      case 'code':
        replaceSelectedText(`\`\`\`\n${selectedText || '代码块'}\n\`\`\``)
        break
      case 'link':
        replaceSelectedText(`[${selectedText || '链接文本'}](https://example.com)`)
        break
      case 'image':
        if (fileInputRef.current) {
          fileInputRef.current.click()
        }
        break
      case 'table':
        replaceSelectedText(`| 列1 | 列2 | 列3 |\n| --- | --- | --- |\n| 内容1 | 内容2 | 内容3 |`)
        break
      case 'hr':
        replaceSelectedText(`\n---\n`)
        break
    }
  }

  // 处理图片上传
  const handleImageUpload = (event: React.ChangeEvent<HTMLInputElement>) => {
    const files = event.target.files
    if (!files || files.length === 0 || !note) return
    
    const file = files[0]
    const reader = new FileReader()
    
    reader.onload = (e) => {
      if (e.target && typeof e.target.result === 'string') {
        const imageUrl = e.target.result
        insertAtCursor(`![${file.name}](${imageUrl})`)
      }
    }
    
    reader.readAsDataURL(file)
    
    // 清除文件输入，以便可以再次选择同一文件
    if (event.target) {
      event.target.value = ''
    }
  }

  // 处理大纲点击
  const handleOutlineClick = (position: number) => {
    if (!contentRef.current) return
    
    const textarea = contentRef.current
    textarea.focus()
    textarea.setSelectionRange(position, position)
    
    // 滚动到相应位置
    const lineHeight = 20 // 估计的行高
    const lines = textarea.value.substring(0, position).split('\n').length
    textarea.scrollTop = (lines - 1) * lineHeight
  }

  // 初始化
  useEffect(() => {
    if (note) {
      // 更新预览内容
      setRenderedContent(md.render(note.content))
      
      // 提取大纲
      extractOutline(note.content)
    }
  }, [note?.id])

  // 注册快捷键
  useHotkeys([
    { key: 'ctrl+b', callback: () => handleToolbarAction('bold') },
    { key: 'ctrl+i', callback: () => handleToolbarAction('italic') },
    { key: 'ctrl+shift+x', callback: () => handleToolbarAction('strikethrough') },
    { key: 'ctrl+1', callback: () => handleToolbarAction('h1') },
    { key: 'ctrl+2', callback: () => handleToolbarAction('h2') },
    { key: 'ctrl+3', callback: () => handleToolbarAction('h3') },
    { key: 'ctrl+l', callback: () => handleToolbarAction('ul') },
    { key: 'ctrl+shift+l', callback: () => handleToolbarAction('ol') },
    { key: 'ctrl+q', callback: () => handleToolbarAction('quote') },
    { key: 'ctrl+shift+c', callback: () => handleToolbarAction('code') },
    { key: 'ctrl+k', callback: () => handleToolbarAction('link') },
    { key: 'ctrl+shift+i', callback: () => handleToolbarAction('image') },
    { key: 'ctrl+t', callback: () => handleToolbarAction('table') },
    { key: 'ctrl+shift+h', callback: () => handleToolbarAction('hr') },
  ])

  // 如果笔记不存在，显示错误信息
  if (!note) {
    return (
      <div className="flex flex-col items-center justify-center h-full text-gray-500 dark:text-gray-400">
        <p className="text-center">笔记不存在或已被删除</p>
      </div>
    )
  }

  // 渲染编辑器
  return (
    <div className="flex flex-col h-full">
      {/* 工具栏 */}
      {showToolbar && (
        <div className="flex items-center px-4 py-2 border-b border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800">
          <div className="flex space-x-1 overflow-x-auto">
            {toolbarItems.map((item, index) => (
              <button
                key={index}
                onClick={() => handleToolbarAction(item.action)}
                className="p-1.5 rounded hover:bg-gray-100 dark:hover:bg-gray-700 text-gray-600 dark:text-gray-300"
                title={item.title}
              >
                {item.icon()}
              </button>
            ))}
        </div>
        
          <div className="ml-auto flex items-center space-x-2">
            {/* 标签按钮 */}
            <button
            onClick={() => setIsTagSelectorOpen(!isTagSelectorOpen)}
              className="p-1.5 rounded hover:bg-gray-100 dark:hover:bg-gray-700 text-gray-600 dark:text-gray-300"
              title="标签"
            >
              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M7 7h.01M7 3h5c.512 0 1.024.195 1.414.586l7 7a2 2 0 010 2.828l-7 7a2 2 0 01-2.828 0l-7-7A1.994 1.994 0 013 12V7a4 4 0 014-4z" />
              </svg>
            </button>
            
            {/* 预览按钮 */}
            <button
              onClick={() => {
                setIsPreview(!isPreview)
                setIsSplitView(false)
                if (!isPreview) {
                  setRenderedContent(md.render(note.content))
                }
              }}
              className={`p-1.5 rounded hover:bg-gray-100 dark:hover:bg-gray-700 ${
                isPreview ? 'bg-blue-100 dark:bg-blue-900 text-blue-600 dark:text-blue-300' : 'text-gray-600 dark:text-gray-300'
              }`}
              title="预览"
            >
              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z" />
              </svg>
            </button>
            
            {/* 分屏按钮 */}
            <button
              onClick={() => {
                setIsSplitView(!isSplitView)
                setIsPreview(false)
                if (!isSplitView) {
                  setRenderedContent(md.render(note.content))
                }
              }}
              className={`p-1.5 rounded hover:bg-gray-100 dark:hover:bg-gray-700 ${
                isSplitView ? 'bg-blue-100 dark:bg-blue-900 text-blue-600 dark:text-blue-300' : 'text-gray-600 dark:text-gray-300'
              }`}
              title="分屏"
            >
              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M9 3v18m8-18v18" />
              </svg>
            </button>
            
            {/* 大纲按钮 */}
            <button
              onClick={() => setShowOutline(!showOutline)}
              className={`p-1.5 rounded hover:bg-gray-100 dark:hover:bg-gray-700 ${
                showOutline ? 'bg-blue-100 dark:bg-blue-900 text-blue-600 dark:text-blue-300' : 'text-gray-600 dark:text-gray-300'
              }`}
              title="大纲"
            >
              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M4 6h16M4 10h16M4 14h16M4 18h16" />
              </svg>
            </button>
          </div>
        </div>
      )}

      {/* 标签选择器 */}
      {isTagSelectorOpen && (
        <div className="border-b border-gray-200 dark:border-gray-700 p-3 bg-white dark:bg-gray-800">
          <TagSelector noteId={note.id} onClose={() => setIsTagSelectorOpen(false)} />
        </div>
      )}

      {/* 标题输入 */}
      <div className="px-4 py-2 border-b border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800">
        <input
          ref={titleRef}
          type="text"
          value={note.title}
          onChange={handleTitleChange}
          placeholder="笔记标题"
          className="w-full text-xl font-semibold border-none focus:outline-none focus:ring-0 bg-transparent dark:text-white"
        />
        <div className="flex items-center text-xs text-gray-500 dark:text-gray-400">
          <span>
            {new Date(note.updatedAt).toLocaleString()} · {note.content.length} 字符
          </span>
          <span className="mx-2">·</span>
          <span>{category ? category.name : '未分类'}</span>
          {isSaving && (
            <span className="ml-2 flex items-center text-blue-500">
              <svg className="w-3 h-3 mr-1 animate-spin" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
              </svg>
              保存中...
            </span>
          )}
        </div>
      </div>
      
      {/* 内容区域 */}
      <div className="flex flex-1 overflow-hidden">
        {/* 编辑/预览区域 */}
        <div className={`flex flex-1 ${isSplitView ? 'space-x-4' : ''}`}>
          {/* 编辑区域 */}
          {!isPreview && (
            <div className={`${isSplitView ? 'w-1/2' : 'w-full'} h-full overflow-auto`}>
              <textarea
                ref={contentRef}
                value={note.content}
                onChange={handleContentChange}
                className="w-full h-full p-4 border-none resize-none focus:outline-none focus:ring-0 bg-white dark:bg-gray-800 dark:text-white font-mono"
                placeholder="开始编写笔记..."
              />
            </div>
          )}
          
          {/* 预览区域 */}
          {(isPreview || isSplitView) && (
            <div className={`${isSplitView ? 'w-1/2' : 'w-full'} h-full overflow-auto p-4 prose dark:prose-invert max-w-none`} 
                 dangerouslySetInnerHTML={{ __html: renderedContent }} />
          )}
        </div>
        
        {/* 大纲区域 */}
        {showOutline && (
          <ResizablePanel
            id="outline"
            defaultWidth={250}
            minWidth={180}
            maxWidth={400}
            direction="left"
            className="border-l border-gray-200 dark:border-gray-700 bg-gray-50 dark:bg-gray-800"
          >
            <div className="h-full overflow-auto">
              <div className="p-3 border-b border-gray-200 dark:border-gray-700">
                <h3 className="font-medium dark:text-white">文档大纲</h3>
              </div>
              
              {outlineItems.length > 0 ? (
                <div className="p-2">
                  {outlineItems.map((item) => (
                    <button
                      key={item.id}
                      onClick={() => handleOutlineClick(item.position)}
                      className="w-full text-left px-2 py-1 rounded hover:bg-gray-200 dark:hover:bg-gray-700 text-gray-700 dark:text-gray-300"
                      style={{ paddingLeft: `${item.level * 8 + 8}px` }}
                    >
                      <span className="text-sm truncate block">
                        {item.text}
                      </span>
                    </button>
                  ))}
                </div>
              ) : (
                <div className="p-4 text-center text-gray-500 dark:text-gray-400">
                  <p>没有找到标题</p>
                  <p className="text-xs mt-1">添加 # 标题 来创建大纲</p>
                </div>
              )}
            </div>
          </ResizablePanel>
        )}
      </div>
      
      {/* 隐藏的文件输入 */}
      <input
        ref={fileInputRef}
        type="file"
        accept="image/*"
        onChange={handleImageUpload}
        className="hidden"
      />
    </div>
  )
} 

export default Editor 