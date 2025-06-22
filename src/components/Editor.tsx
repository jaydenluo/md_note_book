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
import MarkdownPreview from './MarkdownPreview'
import React from 'react'

// 定义热键回调接口
interface HotkeyCallback {
  combo: string;
  callback: () => void;
}

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
  id?: string;
  level: number;
  text: string;
  position: number;
  line?: number;
}

const Editor = ({ noteId }: EditorProps): JSX.Element => {
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
  const [localTitle, setLocalTitle] = useState('');
  const [localContent, setLocalContent] = useState('');
  const [isWysiwygMode, setIsWysiwygMode] = useState(false);

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

  // 创建更高效的防抖保存机制
  const debouncedSave = useRef(
    debounce(async (id: string, data: { title?: string; content?: string }) => {
      // 只在保存开始时设置一次isSaving状态，避免频繁状态更新
      let shouldSetSaving = true;
      
      try {
        // 仅在长内容或标题变更时才显示保存状态
        if (shouldSetSaving && (data.content?.length ?? 0) > 100 || data.title) {
          setIsSaving(true);
        }
        
        const result = await updateNote(id, data);
        
        // 如果更新了标题，同时更新标签页标题
        if (data.title && tab) {
          updateTabTitle(tab.id, data.title);
        }
        
        return result;
      } finally {
        // 使用setTimeout避免快速输入时的状态反复切换
        setTimeout(() => {
          if (shouldSetSaving) {
            setIsSaving(false);
          }
        }, 300);
      }
    // 增加防抖延迟，减少保存次数
    }, 800)
  ).current;

  // 提取大纲的防抖函数
  const debouncedExtractOutline = useRef(
    debounce((content: string) => {
      extractOutline(content)
    }, 500)
  ).current

  // 渲染Markdown的防抖函数
  const debouncedRender = useRef(
    debounce((content: string) => {
      setRenderedContent(md.render(content))
    }, 300)
  ).current

  // 当笔记变化时，直接初始化本地状态
  useEffect(() => {
    if (!note) return;
    
    // 直接加载原始数据
    setLocalTitle(note.title);
    setLocalContent(note.content);
    
    // 渲染内容
    const rendered = md.render(note.content);
    setRenderedContent(rendered);
    
    // 提取大纲
    const newOutline = extractOutline(note.content);
    setOutlineItems(newOutline);
    
  }, [note?.id]); // 只在笔记ID变更时执行，这样切换回已打开的笔记不会重新加载

  // 修改标题变更处理
  const handleTitleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (!note) return;
    
    const newTitle = e.target.value;
    setLocalTitle(newTitle);
    
    // 保存到服务器
    debouncedSave(note.id, { title: newTitle });
  };
  
  // 修改内容变更处理
  const handleContentChange = (e: React.ChangeEvent<HTMLTextAreaElement>) => {
    if (!note) return;
    
    const newContent = e.target.value;
    setLocalContent(newContent);
    
    // 更新渲染状态
    updateRenderedContent(newContent);
    
    // 保存到服务器
    debouncedSave(note.id, { content: newContent });
  };
  
  // 更新渲染内容的辅助函数
  const updateRenderedContent = (content: string) => {
    if (!note) return;
    
    // 仅在预览模式下更新渲染内容
    if (isPreview || isSplitView) {
      let rendered;
      
      if (content.length < 500) {
        // 使用轻量级渲染提高性能
        rendered = md.renderRealtime ? md.renderRealtime(content) : md.render(content);
      } else {
        // 长文档使用防抖渲染
        rendered = md.render(content);
      }
      
      setRenderedContent(rendered);
    }
    
    // 提取和更新大纲
    const newOutline = extractOutline(content);
    setOutlineItems(newOutline);
  };

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

  // 注册快捷键
  useHotkeys({
    'Ctrl+B': () => handleToolbarAction('bold'),
    'Ctrl+I': () => handleToolbarAction('italic'),
    'Ctrl+Shift+X': () => handleToolbarAction('strikethrough'),
    'Ctrl+1': () => handleToolbarAction('h1'),
    'Ctrl+2': () => handleToolbarAction('h2'),
    'Ctrl+3': () => handleToolbarAction('h3'),
    'Ctrl+L': () => handleToolbarAction('ul'),
    'Ctrl+Shift+L': () => handleToolbarAction('ol'),
    'Ctrl+Q': () => handleToolbarAction('quote'),
    'Ctrl+Shift+C': () => handleToolbarAction('code'),
    'Ctrl+K': () => handleToolbarAction('link'),
    'Ctrl+Shift+I': () => handleToolbarAction('image'),
    'Ctrl+T': () => handleToolbarAction('table'),
    'Ctrl+Shift+H': () => handleToolbarAction('hr')
  });

  // 如果笔记不存在，显示错误信息
  if (!note) {
    return (
      <div className="flex flex-col items-center justify-center h-full text-gray-500 dark:text-gray-400">
        <p className="text-center">笔记不存在或已被删除</p>
      </div>
    )
  }

  // 添加回extractOutline函数定义
  const extractOutline = (content: string): OutlineItem[] => {
    const items: OutlineItem[] = []
    
    // 使用正则表达式提取标题
    const lines = content.split('\n')
    
    lines.forEach((line, index) => {
      // 匹配 Markdown 标题格式
      const headingMatch = line.match(/^(#{1,6})\s+(.+)$/)
      if (headingMatch) {
        const level = headingMatch[1].length
        const text = headingMatch[2].trim()
        
        items.push({
          id: `heading-${items.length}`,
          level,
          text,
          line: index + 1,
          position: content.indexOf(line)
        })
      }
    })
    
    return items
  }

  // 添加导出函数
  const handleExport = () => {
    if (!note) return;
    
    const markdown = note.content;
    const filename = `${note.title || '笔记'}.md`;
    
    // 创建Blob对象
    const blob = new Blob([markdown], { type: 'text/markdown' });
    
    // 创建下载链接
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = filename;
    
    // 触发下载
    document.body.appendChild(a);
    a.click();
    
    // 清理
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  };

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
            {/* 所见即所得按钮 */}
            <button
              onClick={() => {
                setIsWysiwygMode(!isWysiwygMode);
                // 切换为所见即所得模式时需要关闭预览和分屏模式
                if (!isWysiwygMode) {
                  setIsPreview(false);
                  setIsSplitView(false);
                }
              }}
              className={`p-1.5 rounded hover:bg-gray-100 dark:hover:bg-gray-700 ${
                isWysiwygMode ? 'bg-blue-100 dark:bg-blue-900 text-blue-600 dark:text-blue-300' : 'text-gray-600 dark:text-gray-300'
              }`}
              title="所见即所得编辑"
            >
              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M4 5h16a1 1 0 0 1 1 1v12a1 1 0 0 1-1 1H4a1 1 0 0 1-1-1V6a1 1 0 0 1 1-1z" />
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M8 9h8M8 13h4" />
              </svg>
            </button>
            
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

      {/* 整体内容区 - 修改为左右两栏结构 */}
      <div className="flex flex-1 overflow-hidden">
        {/* 左侧笔记编辑区 */}
        <div className="flex flex-col flex-1 min-h-0">
          {/* 标题输入 - 固定高度 */}
          <div className="flex-none px-4 py-3 border-b dark:border-gray-700">
            <input
              ref={titleRef}
              type="text"
              value={localTitle}
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

          {/* 内容区域 - 使用flex-1和min-h-0确保正确计算高度 */}
          <div className="flex flex-1 min-h-0 overflow-hidden">
            {/* 编辑/预览区域 */}
            <div className={`flex flex-1 min-h-0 ${isSplitView ? 'space-x-4' : ''}`}>
              {/* 编辑区域 */}
              {!isPreview && (
                <div className={`${isSplitView ? 'w-1/2' : 'w-full'} min-h-0 flex-1 overflow-auto`}>
                  {isWysiwygMode ? (
                    <div className="h-full">
                      {note && React.createElement(WysiwygMarkdownEditor, {
                        content: localContent,
                        onChange: (newContent: string) => {
                          if (!note) return;
                          
                          setLocalContent(newContent);
                          
                          // 更新渲染状态
                          updateRenderedContent(newContent);
                          
                          // 保存到服务器
                          debouncedSave(note.id, { content: newContent });
                        }
                      })}
                    </div>
                  ) : (
                    <textarea
                      ref={contentRef}
                      value={localContent}
                      onChange={handleContentChange}
                      className="w-full h-full p-4 border-none resize-none focus:outline-none focus:ring-0 bg-white dark:bg-gray-800 dark:text-white font-mono"
                      placeholder="开始编写笔记..."
                      style={{ height: "100%" }}
                    />
                  )}
                </div>
              )}

              {/* 预览区域 */}
              {(isPreview || isSplitView) && (
                <div className={`${isSplitView ? 'w-1/2' : 'w-full'} min-h-0 flex-1 overflow-auto p-4 prose dark:prose-invert max-w-none`}>
                  {React.createElement(MarkdownPreview, {
                    content: renderedContent,
                    className: "h-full"
                  })}
                </div>
              )}
            </div>
          </div>

          {/* 底部状态栏 */}
          <div className="flex-none h-8 border-t border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-900 px-4 flex items-center justify-between text-xs text-gray-600 dark:text-gray-300">
            <div className="flex space-x-6">
              <span>创建于: {new Date(note.createdAt).toLocaleString()}</span>
              <span>更新于: {new Date(note.updatedAt).toLocaleString()}</span>
              <span>字数: {note.content.length}</span>
            </div>
            <div className="flex items-center space-x-4">
              <button 
                className="text-gray-600 dark:text-gray-300 hover:text-gray-900 dark:hover:text-white flex items-center"
                onClick={() => setIsSaving(true)}
                title="保存笔记"
              >
                <span className="mr-1">快捷键</span>
                <kbd className="px-1 py-0.5 bg-gray-200 dark:bg-gray-700 rounded text-xs border border-gray-300 dark:border-gray-600">Ctrl+S</kbd>
              </button>
              <button 
                className="text-gray-600 dark:text-gray-300 hover:text-gray-900 dark:hover:text-white flex items-center"
                onClick={() => setIsPreview(!isPreview)}
                title="切换预览"
              >
                <span className="mr-1">预览</span>
                <kbd className="px-1 py-0.5 bg-gray-200 dark:bg-gray-700 rounded text-xs border border-gray-300 dark:border-gray-600">Ctrl+P</kbd>
              </button>
              <button 
                className="text-gray-600 dark:text-gray-300 hover:text-gray-900 dark:hover:text-white"
                onClick={handleExport}
                title="导出笔记"
              >
                导出
              </button>
              <button 
                className="text-gray-600 dark:text-gray-300 hover:text-gray-900 dark:hover:text-white flex items-center"
                onClick={() => {
                  if (note) {
                    window.open(`print/${note.id}`, '_blank');
                  }
                }}
                title="打印笔记"
              >
                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M17 17h2a2 2 0 002-2v-4a2 2 0 00-2-2H5a2 2 0 00-2 2v4a2 2 0 002 2h2m2 4h6a2 2 0 002-2v-4a2 2 0 00-2-2H9a2 2 0 00-2 2v4a2 2 0 002 2zm8-12V5a2 2 0 00-2-2H9a2 2 0 00-2 2v4h10z" />
                </svg>
              </button>
            </div>
          </div>
        </div>

        {/* 右侧大纲区域 */}
        {showOutline && (
          <ResizablePanel
            id="editor-outline"
            defaultWidth={250}
            minWidth={180}
            maxWidth={400}
            direction="left"
            className="bg-white dark:bg-gray-800 border-l border-gray-200 dark:border-gray-700"
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

      {/* 标签选择器 */}
      <AnimatePresence>
        {isTagSelectorOpen && (
          <TagSelector 
            noteId={note.id} 
            onClose={() => setIsTagSelectorOpen(false)} 
          />
        )}
      </AnimatePresence>

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