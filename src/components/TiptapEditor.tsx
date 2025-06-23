import React, { useState, useEffect } from 'react'
import { useEditor, EditorContent } from '@tiptap/react'
import StarterKit from '@tiptap/starter-kit'
import Link from '@tiptap/extension-link'
import Image from '@tiptap/extension-image'
import Placeholder from '@tiptap/extension-placeholder'

/**
 * Tiptap编辑器属性接口
 */
interface TiptapEditorProps {
  content: string;
  onChange: (content: string) => void;
  className?: string;
  placeholder?: string;
}

/**
 * Tiptap所见即所得Markdown编辑器
 * 基于ProseMirror的现代编辑器，支持各种格式
 */
const TiptapEditor = ({
  content,
  onChange,
  className = '',
  placeholder = '开始编写笔记...'
}: TiptapEditorProps): React.ReactElement => {
  // 本地内容状态，用于防止过多重渲染
  const [localContent, setLocalContent] = useState(content);

  // 初始化编辑器实例
  const editor = useEditor({
    extensions: [
      // 使用StarterKit包含大多数基础功能
      StarterKit.configure({
        heading: {
          levels: [1, 2, 3, 4, 5, 6],
        },
        bulletList: {
          keepMarks: true,
          keepAttributes: true,
        },
        orderedList: {
          keepMarks: true,
          keepAttributes: true,
        },
        codeBlock: {
          languageClassPrefix: 'language-',
        },
      }),
      // 链接扩展
      Link.configure({
        openOnClick: false,
        linkOnPaste: true,
        HTMLAttributes: {
          class: 'text-blue-500 hover:text-blue-700 underline',
        },
      }),
      // 图片扩展
      Image.configure({
        inline: true,
        allowBase64: true,
        HTMLAttributes: {
          class: 'max-w-full h-auto',
        },
      }),
      // 占位符扩展
      Placeholder.configure({
        placeholder,
        emptyEditorClass: 'is-editor-empty',
      }),
    ],
    content,
    editorProps: {
      attributes: {
        class: 'focus:outline-none prose dark:prose-invert max-w-none p-4',
      },
    },
    onUpdate: ({ editor }) => {
      // 获取HTML格式的内容
      const newContent = editor.getHTML();
      setLocalContent(newContent);
      onChange(newContent);
    },
  });

  // 监听外部content变化
  useEffect(() => {
    if (editor && content !== localContent) {
      editor.commands.setContent(content);
      setLocalContent(content);
    }
  }, [content, editor]);

  // 渲染编辑器工具栏
  const renderToolbar = () => {
    if (!editor) return null;
    
    return (
      <div className="border-b p-2 flex gap-2 flex-wrap bg-white dark:bg-gray-800">
        {/* 标题按钮 */}
        <button
          onClick={() => editor.chain().focus().toggleHeading({ level: 1 }).run()}
          className={`px-2 py-1 border rounded ${editor.isActive('heading', { level: 1 }) ? 'bg-blue-100 dark:bg-blue-900 text-blue-600 dark:text-blue-300' : 'bg-white dark:bg-gray-800'}`}
          title="标题1"
        >
          H1
        </button>
        <button
          onClick={() => editor.chain().focus().toggleHeading({ level: 2 }).run()}
          className={`px-2 py-1 border rounded ${editor.isActive('heading', { level: 2 }) ? 'bg-blue-100 dark:bg-blue-900 text-blue-600 dark:text-blue-300' : 'bg-white dark:bg-gray-800'}`}
          title="标题2"
        >
          H2
        </button>
        <button
          onClick={() => editor.chain().focus().toggleHeading({ level: 3 }).run()}
          className={`px-2 py-1 border rounded ${editor.isActive('heading', { level: 3 }) ? 'bg-blue-100 dark:bg-blue-900 text-blue-600 dark:text-blue-300' : 'bg-white dark:bg-gray-800'}`}
          title="标题3"
        >
          H3
        </button>
        
        {/* 分隔符 */}
        <span className="border-r h-6 mx-1"></span>
        
        {/* 文本格式按钮 */}
        <button
          onClick={() => editor.chain().focus().toggleBold().run()}
          className={`px-2 py-1 border rounded ${editor.isActive('bold') ? 'bg-blue-100 dark:bg-blue-900 text-blue-600 dark:text-blue-300' : 'bg-white dark:bg-gray-800'}`}
          title="粗体 (Ctrl+B)"
        >
          B
        </button>
        <button
          onClick={() => editor.chain().focus().toggleItalic().run()}
          className={`px-2 py-1 border rounded ${editor.isActive('italic') ? 'bg-blue-100 dark:bg-blue-900 text-blue-600 dark:text-blue-300' : 'bg-white dark:bg-gray-800'}`}
          title="斜体 (Ctrl+I)"
        >
          I
        </button>
        <button
          onClick={() => editor.chain().focus().toggleStrike().run()}
          className={`px-2 py-1 border rounded ${editor.isActive('strike') ? 'bg-blue-100 dark:bg-blue-900 text-blue-600 dark:text-blue-300' : 'bg-white dark:bg-gray-800'}`}
          title="删除线"
        >
          S
        </button>
        <button
          onClick={() => editor.chain().focus().toggleCode().run()}
          className={`px-2 py-1 border rounded ${editor.isActive('code') ? 'bg-blue-100 dark:bg-blue-900 text-blue-600 dark:text-blue-300' : 'bg-white dark:bg-gray-800'}`}
          title="行内代码"
        >
          {'</>'}
        </button>
        
        {/* 分隔符 */}
        <span className="border-r h-6 mx-1"></span>
        
        {/* 块级格式按钮 */}
        <button
          onClick={() => editor.chain().focus().toggleBulletList().run()}
          className={`px-2 py-1 border rounded ${editor.isActive('bulletList') ? 'bg-blue-100 dark:bg-blue-900 text-blue-600 dark:text-blue-300' : 'bg-white dark:bg-gray-800'}`}
          title="无序列表"
        >
          • 列表
        </button>
        <button
          onClick={() => editor.chain().focus().toggleOrderedList().run()}
          className={`px-2 py-1 border rounded ${editor.isActive('orderedList') ? 'bg-blue-100 dark:bg-blue-900 text-blue-600 dark:text-blue-300' : 'bg-white dark:bg-gray-800'}`}
          title="有序列表"
        >
          1. 列表
        </button>
        <button
          onClick={() => editor.chain().focus().toggleBlockquote().run()}
          className={`px-2 py-1 border rounded ${editor.isActive('blockquote') ? 'bg-blue-100 dark:bg-blue-900 text-blue-600 dark:text-blue-300' : 'bg-white dark:bg-gray-800'}`}
          title="引用"
        >
          引用
        </button>
        <button
          onClick={() => editor.chain().focus().toggleCodeBlock().run()}
          className={`px-2 py-1 border rounded ${editor.isActive('codeBlock') ? 'bg-blue-100 dark:bg-blue-900 text-blue-600 dark:text-blue-300' : 'bg-white dark:bg-gray-800'}`}
          title="代码块"
        >
          代码块
        </button>
        <button
          onClick={() => editor.chain().focus().setHorizontalRule().run()}
          className="px-2 py-1 border rounded bg-white dark:bg-gray-800"
          title="水平线"
        >
          —
        </button>
        
        {/* 分隔符 */}
        <span className="border-r h-6 mx-1"></span>
        
        {/* 链接和图片 */}
        <button
          onClick={() => {
            const url = window.prompt('输入链接URL:')
            if (url) {
              editor.chain().focus().setLink({ href: url }).run()
            }
          }}
          className={`px-2 py-1 border rounded ${editor.isActive('link') ? 'bg-blue-100 dark:bg-blue-900 text-blue-600 dark:text-blue-300' : 'bg-white dark:bg-gray-800'}`}
          title="添加链接"
        >
          链接
        </button>
        <button
          onClick={() => {
            const url = window.prompt('输入图片URL:')
            if (url) {
              editor.chain().focus().setImage({ src: url }).run()
            }
          }}
          className="px-2 py-1 border rounded bg-white dark:bg-gray-800"
          title="添加图片"
        >
          图片
        </button>
        
        {/* 撤销/重做 */}
        <div className="ml-auto flex gap-2">
          <button
            onClick={() => editor.chain().focus().undo().run()}
            disabled={!editor.can().undo()}
            className="px-2 py-1 border rounded bg-white dark:bg-gray-800 disabled:opacity-50"
            title="撤销 (Ctrl+Z)"
          >
            撤销
          </button>
          <button
            onClick={() => editor.chain().focus().redo().run()}
            disabled={!editor.can().redo()}
            className="px-2 py-1 border rounded bg-white dark:bg-gray-800 disabled:opacity-50"
            title="重做 (Ctrl+Shift+Z)"
          >
            重做
          </button>
        </div>
      </div>
    );
  };

  return (
    <div className={`tiptap-editor flex flex-col h-full ${className}`}>
      {renderToolbar()}
      <div className="flex-1 overflow-auto bg-white dark:bg-gray-800">
        {editor && <EditorContent editor={editor} className="h-full" />}
      </div>
      
      {/* 添加编辑器样式 */}
      <style dangerouslySetInnerHTML={{ __html: `
        .ProseMirror {
          min-height: 100%;
          outline: none;
        }
        
        .ProseMirror p.is-editor-empty:first-child::before {
          content: attr(data-placeholder);
          float: left;
          color: #adb5bd;
          pointer-events: none;
          height: 0;
        }
        
        .ProseMirror h1 {
          font-size: 1.75em;
          margin-top: 1em;
          margin-bottom: 0.5em;
        }
        
        .ProseMirror h2 {
          font-size: 1.5em;
          margin-top: 0.83em;
          margin-bottom: 0.5em;
        }
        
        .ProseMirror h3 {
          font-size: 1.25em;
          margin-top: 0.67em;
          margin-bottom: 0.5em;
        }
        
        .ProseMirror blockquote {
          border-left: 4px solid #ddd;
          padding-left: 1em;
          margin-left: 0;
          margin-right: 0;
        }
        
        .ProseMirror pre {
          background-color: #f5f5f5;
          border-radius: 3px;
          padding: 0.75em;
          overflow-x: auto;
        }
        
        .ProseMirror code {
          background-color: rgba(175, 184, 193, 0.2);
          border-radius: 3px;
          padding: 0.2em 0.4em;
          font-family: monospace;
        }
        
        .ProseMirror pre code {
          background-color: transparent;
          padding: 0;
        }
        
        .ProseMirror img {
          max-width: 100%;
          height: auto;
        }
        
        .ProseMirror hr {
          border: none;
          border-top: 2px solid #ddd;
          margin: 1em 0;
        }
        
        /* 暗黑模式样式 */
        .dark .ProseMirror pre {
          background-color: #2d3748;
        }
        
        .dark .ProseMirror code {
          background-color: rgba(55, 65, 81, 0.5);
        }
        
        .dark .ProseMirror blockquote {
          border-left-color: #4a5568;
        }
        
        .dark .ProseMirror hr {
          border-top-color: #4a5568;
        }
      `}} />
    </div>
  );
};

export default TiptapEditor; 