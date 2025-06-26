import React, { useState, useRef, useEffect } from 'react'
import type { Editor } from '@tiptap/react'
import { 
  Bold, 
  Italic, 
  Underline, 
  Strikethrough, 
  Heading1, 
  Heading2, 
  Heading3,
  AlignLeft,
  AlignCenter,
  AlignRight,
  List,
  ListOrdered,
  Quote,
  Code,
  Undo,
  Redo
} from 'lucide-react'

// 工具栏属性接口
interface EditorToolbarProps {
  editor: Editor | null
}

// 自定义标题图标组件
// 使用更简洁的SVG设计，保持与Lucide图标风格一致
const Heading4 = () => (
  <svg
    xmlns="http://www.w3.org/2000/svg"
    width="16"
    height="16"
    viewBox="0 0 24 24"
    fill="none"
    stroke="currentColor"
    strokeWidth="2"
    strokeLinecap="round"
    strokeLinejoin="round"
  >
    <path d="M4 12h8" />
    <path d="M4 18V6" />
    <path d="M12 18V6" />
    <path d="M17 10v4h4" />
    <path d="M21 10v8" />
  </svg>
);

const Heading5 = () => (
  <svg
    xmlns="http://www.w3.org/2000/svg"
    width="16"
    height="16"
    viewBox="0 0 24 24"
    fill="none"
    stroke="currentColor"
    strokeWidth="2"
    strokeLinecap="round"
    strokeLinejoin="round"
  >
    <path d="M4 12h8" />
    <path d="M4 18V6" />
    <path d="M12 18V6" />
    <path d="M17 13a3 3 0 1 0 0 5h4" />
    <path d="M17 13h4" />
    <path d="M21 13v-3h-4" />
  </svg>
);

const Heading6 = () => (
  <svg
    xmlns="http://www.w3.org/2000/svg"
    width="16"
    height="16"
    viewBox="0 0 24 24"
    fill="none"
    stroke="currentColor"
    strokeWidth="2"
    strokeLinecap="round"
    strokeLinejoin="round"
  >
    <path d="M4 12h8" />
    <path d="M4 18V6" />
    <path d="M12 18V6" />
    <path d="M19 6h-3a2 2 0 0 0-2 2v8a2 2 0 0 0 2 2h3a2 2 0 0 0 2-2v-4a2 2 0 0 0-2-2h-3" />
  </svg>
);

// 支持的编程语言列表
const LANGUAGES = [
  { value: 'text', label: '纯文本' },
  { value: 'javascript', label: 'JavaScript' },
  { value: 'typescript', label: 'TypeScript' },
  { value: 'python', label: 'Python' },
  { value: 'css', label: 'CSS' },
  { value: 'html', label: 'HTML' },
  { value: 'json', label: 'JSON' },
  { value: 'markdown', label: 'Markdown' },
  { value: 'sql', label: 'SQL' },
  { value: 'bash', label: 'Bash' }
]

/**
 * 编辑器工具栏组件
 * 提供基础的文本格式功能，采用简洁朴素的设计
 */
const EditorToolbar = ({ editor }: EditorToolbarProps): React.ReactElement | null => {
  if (!editor) {
    return null
  }

  // 检查当前格式状态
  const isActive = (name: string, attributes?: Record<string, unknown>) => {
    return editor.isActive(name, attributes)
  }

  // 执行编辑器命令的通用函数
  const executeCommand = (command: () => void) => {
    // 先让编辑器失去焦点
    editor.commands.blur()
    
    // 使用requestAnimationFrame确保失去焦点的操作完成后再执行命令
    requestAnimationFrame(() => {
      // 执行命令
      command()
      // 命令执行完成后恢复焦点
      requestAnimationFrame(() => {
        editor.commands.focus()
      })
    })
  }

  // 工具栏按钮组件 - 简洁版本
  const ToolbarButton = ({ 
    onClick, 
    isActive = false, 
    icon: Icon, 
    title, 
    disabled = false 
  }: {
    onClick: () => void
    isActive?: boolean
    icon: React.ComponentType<{ size?: number }>
    title: string
    disabled?: boolean
  }): React.ReactElement => (
    <button
      onClick={(e) => {
        // 阻止事件冒泡
        e.preventDefault()
        e.stopPropagation()
        executeCommand(onClick)
      }}
      onMouseDown={(e) => {
        // 阻止mousedown事件，防止编辑器获得焦点
        e.preventDefault()
      }}
      disabled={disabled}
      title={title}
      className={`h-8 w-8 p-0 rounded flex items-center justify-center transition-colors ${isActive ? 'bg-gray-200 dark:bg-gray-700 text-gray-900 dark:text-gray-100' : 'text-gray-600 dark:text-gray-400 hover:bg-gray-100 dark:hover:bg-gray-800 hover:text-gray-900 dark:hover:text-gray-100'} ${disabled ? 'opacity-40 cursor-not-allowed' : ''}`}
    >
      {React.createElement(Icon, { size: 16 })}
    </button>
  )

  // 分隔线组件 - 简洁版本
  const ToolbarSeparator = (): React.ReactElement => (
    <div className="w-px h-6 bg-gray-300 dark:bg-gray-600 mx-2" />
  )

  // 代码块语言选择下拉菜单
  const CodeBlockLanguageSelect = ({ editor }: { editor: Editor }): React.ReactElement | null => {
    const [isOpen, setIsOpen] = useState(false)
    const dropdownRef = useRef<HTMLDivElement>(null)

    // 获取当前代码块的语言
    const currentLanguage = editor.isActive('codeBlock')
      ? (editor.getAttributes('codeBlock').language as string) || 'text'
      : 'text'

    // 点击外部关闭下拉菜单
    useEffect(() => {
      const handleClickOutside = (event: MouseEvent) => {
        if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
          setIsOpen(false)
        }
      }

      document.addEventListener('mousedown', handleClickOutside)
      return () => document.removeEventListener('mousedown', handleClickOutside)
    }, [])

    // 切换代码块语言
    const setLanguage = (language: string) => {
      editor
        .chain()
        .focus()
        .toggleCodeBlock({ language: language === 'text' ? '' : language })
        .run()
      setIsOpen(false)
    }

    if (!editor.isActive('codeBlock')) {
      return null
    }

    return (
      <div className="relative" ref={dropdownRef}>
        <button
          onClick={() => setIsOpen(!isOpen)}
          className="flex items-center gap-1 px-2 py-1 text-xs rounded hover:bg-gray-100 dark:hover:bg-gray-700"
        >
          <span>{LANGUAGES.find(lang => lang.value === currentLanguage)?.label || '选择语言'}</span>
          <svg
            xmlns="http://www.w3.org/2000/svg"
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            strokeWidth="2"
            strokeLinecap="round"
            strokeLinejoin="round"
            className="w-3 h-3"
          >
            <polyline points="6 9 12 15 18 9" />
          </svg>
        </button>
        
        {isOpen && (
          <div className="absolute z-50 mt-1 bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded shadow-lg py-1 min-w-[120px]">
            {LANGUAGES.map(({ value, label }) => (
              <button
                key={value}
                onClick={() => setLanguage(value)}
                className={`
                  w-full px-3 py-1 text-left text-sm
                  ${currentLanguage === value ? 'bg-gray-100 dark:bg-gray-700 text-blue-600 dark:text-blue-400' : 'hover:bg-gray-50 dark:hover:bg-gray-700'}
                `}
              >
                {label}
              </button>
            ))}
          </div>
        )}
      </div>
    )
  }

  return (
    <div 
      className="flex items-center gap-1 p-2 border-b border-gray-200 dark:border-gray-700 bg-gray-100 dark:bg-gray-800"
      onMouseDown={(e) => {
        // 阻止工具栏区域的mousedown事件影响编辑器焦点
        e.preventDefault()
      }}
    >
      {/* 撤销/重做组 */}
      <div className="flex items-center gap-1">
        <ToolbarButton
          onClick={() => editor.chain().undo().run()}
          icon={Undo}
          title="撤销"
          disabled={!editor.can().undo()}
        />
        <ToolbarButton
          onClick={() => editor.chain().redo().run()}
          icon={Redo}
          title="重做"
          disabled={!editor.can().redo()}
        />
      </div>
      
      <ToolbarSeparator />
      
      {/* 文本格式组 */}
      <div className="flex items-center gap-1">
        <ToolbarButton
          onClick={() => editor.chain().toggleBold().run()}
          isActive={isActive('bold')}
          icon={Bold}
          title="加粗"
        />
        <ToolbarButton
          onClick={() => editor.chain().toggleItalic().run()}
          isActive={isActive('italic')}
          icon={Italic}
          title="斜体"
        />
        <ToolbarButton
          onClick={() => editor.chain().toggleUnderline().run()}
          isActive={isActive('underline')}
          icon={Underline}
          title="下划线"
        />
        <ToolbarButton
          onClick={() => editor.chain().toggleStrike().run()}
          isActive={isActive('strike')}
          icon={Strikethrough}
          title="删除线"
        />
      </div>
      
      <ToolbarSeparator />
      
      {/* 标题级别组 */}
      <div className="flex items-center gap-1">
        <ToolbarButton
          onClick={() => editor.chain().toggleHeading({ level: 1 }).run()}
          isActive={isActive('heading', { level: 1 })}
          icon={Heading1}
          title="标题 1"
        />
        <ToolbarButton
          onClick={() => editor.chain().toggleHeading({ level: 2 }).run()}
          isActive={isActive('heading', { level: 2 })}
          icon={Heading2}
          title="标题 2"
        />
        <ToolbarButton
          onClick={() => editor.chain().toggleHeading({ level: 3 }).run()}
          isActive={isActive('heading', { level: 3 })}
          icon={Heading3}
          title="标题 3"
        />
        <ToolbarButton
          onClick={() => editor.chain().toggleHeading({ level: 4 }).run()}
          isActive={isActive('heading', { level: 4 })}
          icon={Heading4}
          title="标题 4"
        />
        <ToolbarButton
          onClick={() => editor.chain().toggleHeading({ level: 5 }).run()}
          isActive={isActive('heading', { level: 5 })}
          icon={Heading5}
          title="标题 5"
        />
        <ToolbarButton
          onClick={() => editor.chain().toggleHeading({ level: 6 }).run()}
          isActive={isActive('heading', { level: 6 })}
          icon={Heading6}
          title="标题 6"
        />
      </div>
      
      <ToolbarSeparator />
      
      {/* 对齐方式组 */}
      <div className="flex items-center gap-1">
        <ToolbarButton
          onClick={() => editor.chain().setTextAlign('left').run()}
          isActive={isActive('paragraph', { textAlign: 'left' })}
          icon={AlignLeft}
          title="左对齐"
        />
        <ToolbarButton
          onClick={() => editor.chain().setTextAlign('center').run()}
          isActive={isActive('paragraph', { textAlign: 'center' })}
          icon={AlignCenter}
          title="居中对齐"
        />
        <ToolbarButton
          onClick={() => editor.chain().setTextAlign('right').run()}
          isActive={isActive('paragraph', { textAlign: 'right' })}
          icon={AlignRight}
          title="右对齐"
        />
      </div>
      
      <ToolbarSeparator />
      
      {/* 列表组 */}
      <div className="flex items-center gap-1">
        <ToolbarButton
          onClick={() => editor.chain().toggleBulletList().run()}
          isActive={isActive('bulletList')}
          icon={List}
          title="无序列表"
        />
        <ToolbarButton
          onClick={() => editor.chain().toggleOrderedList().run()}
          isActive={isActive('orderedList')}
          icon={ListOrdered}
          title="有序列表"
        />
      </div>
      
      <ToolbarSeparator />
      
      {/* 块级元素组 */}
      <div className="flex items-center gap-1">
        <ToolbarButton
          onClick={() => editor.chain().toggleBlockquote().run()}
          isActive={isActive('blockquote')}
          icon={Quote}
          title="引用块"
        />
        <ToolbarButton
          onClick={() => editor.chain().toggleCodeBlock().run()}
          isActive={isActive('codeBlock')}
          icon={Code}
          title="代码块"
        />
        {/* 代码块语言选择 */}
        <CodeBlockLanguageSelect editor={editor} />
      </div>
    </div>
  )
}

export default EditorToolbar 