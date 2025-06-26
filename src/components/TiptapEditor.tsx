import React, { useEffect, useRef } from 'react'
import { useEditor, EditorContent } from '@tiptap/react'
import StarterKit from '@tiptap/starter-kit'
import Underline from '@tiptap/extension-underline'
import Link from '@tiptap/extension-link'
import Image from '@tiptap/extension-image'
import TextAlign from '@tiptap/extension-text-align'
import Placeholder from '@tiptap/extension-placeholder'
import CodeBlockLowlight from '@tiptap/extension-code-block-lowlight'
import { common, createLowlight } from 'lowlight'
import EditorToolbar from './EditorToolbar'
import '../styles/editor.css'
import { genHeadingId } from './Editor' // 导入统一的ID生成函数

// 导入常用的编程语言高亮支持
import javascript from 'highlight.js/lib/languages/javascript'
import typescript from 'highlight.js/lib/languages/typescript'
import python from 'highlight.js/lib/languages/python'
import css from 'highlight.js/lib/languages/css'
import html from 'highlight.js/lib/languages/xml'
import json from 'highlight.js/lib/languages/json'
import markdown from 'highlight.js/lib/languages/markdown'
import sql from 'highlight.js/lib/languages/sql'
import bash from 'highlight.js/lib/languages/bash'

// 创建 lowlight 实例并注册语言支持
const lowlight = createLowlight(common)
lowlight.register('javascript', javascript)
lowlight.register('typescript', typescript)
lowlight.register('python', python)
lowlight.register('css', css)
lowlight.register('html', html)
lowlight.register('json', json)
lowlight.register('markdown', markdown)
lowlight.register('sql', sql)
lowlight.register('bash', bash)

// 编辑器属性接口
interface TiptapEditorProps {
  content: string
  onChange: (content: string) => void
  className?: string
  placeholder?: string
  showToolbar?: boolean // 是否显示工具栏
}

// 工具函数：为所有heading标签自动加唯一id，保证与大纲一致
function addHeadingIdsToHtml(html: string): string {
  const parser = new DOMParser();
  const doc = parser.parseFromString(html, 'text/html');
  const headings = doc.querySelectorAll('h1, h2, h3, h4, h5, h6');
  headings.forEach((heading) => {
    if (!heading.id) {
      const text = heading.textContent?.trim() || '';
      // 使用统一的ID生成函数，仅基于内容hash
      heading.id = genHeadingId(text);
    }
  });
  return doc.body.innerHTML;
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

  // 新增：首次渲染时不触发onChange
  const isFirstRender = useRef(true);

  // 创建编辑器实例
  const editor = useEditor({
    extensions: [
      StarterKit.configure({
        heading: {
          HTMLAttributes: {
            class: 'relative',
          },
        },
        // 禁用默认的代码块，使用我们的自定义版本
        codeBlock: false,
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
      }),
      // 添加支持语法高亮的代码块
      CodeBlockLowlight.configure({
        lowlight,
        HTMLAttributes: {
          class: 'code-block',
        },
        languageClassPrefix: 'language-',
      }),
    ],
    content: addHeadingIdsToHtml(content || ''),
    onUpdate: ({ editor }) => {
      if (isFirstRender.current) {
        isFirstRender.current = false;
        return; // 首次渲染不触发onChange
      }
      try {
        // 取出HTML并为heading加id
        const html = addHeadingIdsToHtml(editor.getHTML());
        debouncedOnChange(html);
      } catch (error) {
        console.error('编辑器更新处理失败:', error);
      }
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

  // 将editor实例挂载到window，供大纲跳转调用
  useEffect(() => {
    if (editor) {
      // @ts-expect-error: 临时将editor实例挂载到window供大纲跳转使用
      (window as any).tiptapEditorInstance = editor;
    }
    return () => {
      // @ts-expect-error: 清理window.tiptapEditorInstance全局变量
      if ((window as any).tiptapEditorInstance === editor) {
        (window as any).tiptapEditorInstance = null;
      }
    };
  }, [editor]);

  // 当content prop变化时更新编辑器内容
  useEffect(() => {
    if (editor) {
      const currentContent = editor.getHTML();
      // 只有当 content 非空且和当前内容不一致时才 setContent
      if (content && currentContent !== content) {
        editor.commands.setContent(addHeadingIdsToHtml(content), false);
      }
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