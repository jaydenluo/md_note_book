import React, { useEffect, useRef } from 'react'
import { useEditor, EditorContent } from '@tiptap/react'
import StarterKit from '@tiptap/starter-kit'
import Underline from '@tiptap/extension-underline'
import Link from '@tiptap/extension-link'
import Image from '@tiptap/extension-image'
import TextAlign from '@tiptap/extension-text-align'
import Placeholder from '@tiptap/extension-placeholder'
import EditorToolbar from './EditorToolbar'
import '../styles/editor.css'

// 编辑器属性接口
interface TiptapEditorProps {
  content: string
  onChange: (content: string) => void
  className?: string
  placeholder?: string
  showToolbar?: boolean // 是否显示工具栏
}

/**
 * Tiptap Markdown编辑器组件
 * 提供基础的Markdown编辑功能和格式工具栏，采用简洁朴素的设计
 */
const TiptapEditor = ({
  content,
  onChange,
  className = '',
  placeholder = '开始编写笔记...',
  showToolbar = true // 默认显示工具栏
}: TiptapEditorProps): React.ReactElement => {
  // 创建防抖的onChange函数
  const debouncedOnChange = useRef(
    (() => {
      let timer: number | null = null
      return (newContent: string) => {
        if (timer) clearTimeout(timer)
        timer = setTimeout(() => {
          onChange(newContent)
        }, 300)
      }
    })()
  ).current

  // 创建编辑器实例
  const editor = useEditor({
    extensions: [
      StarterKit.configure({
        heading: {
          HTMLAttributes: {
            class: 'relative', // 添加相对定位
          },
        },
      }),
      Underline,
      Link.configure({
        openOnClick: false,
        HTMLAttributes: {
          class: 'text-blue-600 dark:text-blue-400 underline'
        }
      }),
      Image.configure({
        HTMLAttributes: {
          class: 'max-w-full h-auto rounded'
        }
      }),
      TextAlign.configure({
        types: ['heading', 'paragraph']
      }),
      Placeholder.configure({
        placeholder
      })
    ],
    content,
    onUpdate: ({ editor }) => {
      const html = editor.getHTML()
      debouncedOnChange(html)
    },
    editorProps: {
      attributes: {
        class: 'tiptap-editor'
      }
    },
    // 确保编辑器在创建时就有焦点
    autofocus: false,
    // 启用所有编辑器功能
    enableCoreExtensions: true
  })

  // 当content prop变化时更新编辑器内容
  useEffect(() => {
    if (editor && editor.getHTML() !== content) {
      editor.commands.setContent(content)
    }
  }, [content, editor])

  // 确保编辑器在组件挂载后能够正确响应焦点
  useEffect(() => {
    if (editor) {
      // 设置编辑器为可编辑状态
      editor.setEditable(true)
    }
  }, [editor])

  return (
    <div className={`flex flex-col h-full bg-gray-100 dark:bg-gray-800 ${className}`}>
      {/* 工具栏 */}
      {showToolbar && editor && <EditorToolbar editor={editor} />}
      
      {/* 编辑器内容区域 */}
      <div className="flex-1 overflow-auto">
        {/* @ts-expect-error - EditorContent 的类型定义有问题，但组件实际工作正常 */}
        {editor && <EditorContent editor={editor} className="h-full" />}
      </div>
    </div>
  )
}

export default TiptapEditor 