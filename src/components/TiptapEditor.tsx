import React, { useState, useEffect } from 'react'
import { useEditor, EditorContent } from '@tiptap/react'
import StarterKit from '@tiptap/starter-kit'
import Link from '@tiptap/extension-link'
import Image from '@tiptap/extension-image'
import Placeholder from '@tiptap/extension-placeholder'
import Underline from '@tiptap/extension-underline'
import TextAlign from '@tiptap/extension-text-align'
import { 
  Bold, 
  Italic, 
  Underline as UnderlineIcon, 
  Strikethrough, 
  Code, 
  Heading1, 
  Heading2, 
  Heading3, 
  List, 
  ListOrdered, 
  Quote, 
  Code2, 
  Minus, 
  Link as LinkIcon, 
  Image as ImageIcon, 
  Undo, 
  Redo, 
  AlignLeft, 
  AlignCenter, 
  AlignRight, 
  AlignJustify
} from 'lucide-react'

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
      // 下划线扩展
      Underline,
      // 文本对齐扩展
      TextAlign.configure({
        types: ['heading', 'paragraph'],
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

  // 工具栏按钮组件
  const ToolbarButton = ({ 
    onClick, 
    isActive = false, 
    disabled = false, 
    title, 
    children, 
    className = '' 
  }: {
    onClick: () => void;
    isActive?: boolean;
    disabled?: boolean;
    title: string;
    children: React.ReactNode;
    className?: string;
  }) => (
    <button
      onClick={(e) => {
        // 阻止事件冒泡，防止干扰编辑器焦点
        e.preventDefault();
        e.stopPropagation();
        
        // 直接执行点击操作，不在这里处理焦点
        onClick();
      }}
      disabled={disabled}
      className={`
        p-2 rounded-md transition-all duration-200 flex items-center justify-center
        ${isActive 
          ? 'bg-blue-100 dark:bg-blue-900 text-blue-600 dark:text-blue-300 border border-blue-200 dark:border-blue-700' 
          : 'text-gray-600 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-700 border border-transparent'
        }
        ${disabled ? 'opacity-50 cursor-not-allowed' : 'cursor-pointer'}
        ${className}
      `}
      title={title}
    >
      {children}
    </button>
  );

  // 工具栏分隔符组件
  const ToolbarDivider = () => (
    <div className="w-px h-6 bg-gray-300 dark:bg-gray-600 mx-1" />
  );

  // 渲染编辑器工具栏
  const renderToolbar = () => {
    if (!editor) return null;
    
    // 创建工具栏按钮点击处理函数
    const handleToolbarClick = (command: () => void) => {
      return () => {
        // 确保编辑器存在且未销毁
        if (!editor || editor.isDestroyed) {
          console.warn('编辑器不存在或已销毁');
          return;
        }
        
        // 确保编辑器获得焦点
        editor.commands.focus();
        
        // 执行命令
        try {
          command();
        } catch (error) {
          console.error('工具栏命令执行失败:', error);
        }
      };
    };
    
    return (
      <div className="border-b border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800 p-2">
        <div className="flex items-center gap-1 flex-wrap">
          {/* 标题组 */}
          <div className="flex items-center gap-1">
            <ToolbarButton
              onClick={handleToolbarClick(() => editor.chain().focus().toggleHeading({ level: 1 }).run())}
              isActive={editor.isActive('heading', { level: 1 })}
              title="标题1 (Ctrl+Alt+1)"
            >
              {React.createElement(Heading1, { className: "w-4 h-4" })}
            </ToolbarButton>
            <ToolbarButton
              onClick={handleToolbarClick(() => editor.chain().focus().toggleHeading({ level: 2 }).run())}
              isActive={editor.isActive('heading', { level: 2 })}
              title="标题2 (Ctrl+Alt+2)"
            >
              {React.createElement(Heading2, { className: "w-4 h-4" })}
            </ToolbarButton>
            <ToolbarButton
              onClick={handleToolbarClick(() => editor.chain().focus().toggleHeading({ level: 3 }).run())}
              isActive={editor.isActive('heading', { level: 3 })}
              title="标题3 (Ctrl+Alt+3)"
            >
              {React.createElement(Heading3, { className: "w-4 h-4" })}
            </ToolbarButton>
          </div>
        
          <ToolbarDivider />
        
          {/* 文本格式组 */}
          <div className="flex items-center gap-1">
            <ToolbarButton
              onClick={handleToolbarClick(() => editor.chain().focus().toggleBold().run())}
              isActive={editor.isActive('bold')}
          title="粗体 (Ctrl+B)"
        >
              {React.createElement(Bold, { className: "w-4 h-4" })}
            </ToolbarButton>
            <ToolbarButton
              onClick={handleToolbarClick(() => editor.chain().focus().toggleItalic().run())}
              isActive={editor.isActive('italic')}
          title="斜体 (Ctrl+I)"
        >
              {React.createElement(Italic, { className: "w-4 h-4" })}
            </ToolbarButton>
            <ToolbarButton
              onClick={handleToolbarClick(() => editor.chain().focus().toggleUnderline().run())}
              isActive={editor.isActive('underline')}
              title="下划线 (Ctrl+U)"
            >
              {React.createElement(UnderlineIcon, { className: "w-4 h-4" })}
            </ToolbarButton>
            <ToolbarButton
              onClick={handleToolbarClick(() => editor.chain().focus().toggleStrike().run())}
              isActive={editor.isActive('strike')}
          title="删除线"
        >
              {React.createElement(Strikethrough, { className: "w-4 h-4" })}
            </ToolbarButton>
            <ToolbarButton
              onClick={handleToolbarClick(() => editor.chain().focus().toggleCode().run())}
              isActive={editor.isActive('code')}
              title="行内代码 (Ctrl+`)"
            >
              {React.createElement(Code, { className: "w-4 h-4" })}
            </ToolbarButton>
          </div>

          <ToolbarDivider />

          {/* 对齐方式组 */}
          <div className="flex items-center gap-1">
            <ToolbarButton
              onClick={handleToolbarClick(() => editor.chain().focus().setTextAlign('left').run())}
              isActive={editor.isActive({ textAlign: 'left' })}
              title="左对齐"
            >
              {React.createElement(AlignLeft, { className: "w-4 h-4" })}
            </ToolbarButton>
            <ToolbarButton
              onClick={handleToolbarClick(() => editor.chain().focus().setTextAlign('center').run())}
              isActive={editor.isActive({ textAlign: 'center' })}
              title="居中对齐"
            >
              {React.createElement(AlignCenter, { className: "w-4 h-4" })}
            </ToolbarButton>
            <ToolbarButton
              onClick={handleToolbarClick(() => editor.chain().focus().setTextAlign('right').run())}
              isActive={editor.isActive({ textAlign: 'right' })}
              title="右对齐"
        >
              {React.createElement(AlignRight, { className: "w-4 h-4" })}
            </ToolbarButton>
            <ToolbarButton
              onClick={handleToolbarClick(() => editor.chain().focus().setTextAlign('justify').run())}
              isActive={editor.isActive({ textAlign: 'justify' })}
              title="两端对齐"
            >
              {React.createElement(AlignJustify, { className: "w-4 h-4" })}
            </ToolbarButton>
          </div>

          <ToolbarDivider />

          {/* 列表组 */}
          <div className="flex items-center gap-1">
            <ToolbarButton
              onClick={handleToolbarClick(() => editor.chain().focus().toggleBulletList().run())}
              isActive={editor.isActive('bulletList')}
              title="无序列表 (Ctrl+Shift+8)"
            >
              {React.createElement(List, { className: "w-4 h-4" })}
            </ToolbarButton>
            <ToolbarButton
              onClick={handleToolbarClick(() => editor.chain().focus().toggleOrderedList().run())}
              isActive={editor.isActive('orderedList')}
              title="有序列表 (Ctrl+Shift+7)"
            >
              {React.createElement(ListOrdered, { className: "w-4 h-4" })}
            </ToolbarButton>
          </div>

          <ToolbarDivider />

          {/* 块级元素组 */}
          <div className="flex items-center gap-1">
            <ToolbarButton
              onClick={handleToolbarClick(() => editor.chain().focus().toggleBlockquote().run())}
              isActive={editor.isActive('blockquote')}
              title="引用块 (Ctrl+Shift+Q)"
            >
              {React.createElement(Quote, { className: "w-4 h-4" })}
            </ToolbarButton>
            <ToolbarButton
              onClick={handleToolbarClick(() => editor.chain().focus().toggleCodeBlock().run())}
              isActive={editor.isActive('codeBlock')}
              title="代码块 (Ctrl+Shift+C)"
            >
              {React.createElement(Code2, { className: "w-4 h-4" })}
            </ToolbarButton>
            <ToolbarButton
              onClick={handleToolbarClick(() => editor.chain().focus().setHorizontalRule().run())}
              title="水平分隔线"
            >
              {React.createElement(Minus, { className: "w-4 h-4" })}
            </ToolbarButton>
          </div>
        
          <ToolbarDivider />
        
          {/* 链接和媒体组 */}
          <div className="flex items-center gap-1">
            <ToolbarButton
              onClick={handleToolbarClick(() => {
            const url = window.prompt('输入链接URL:')
            if (url) {
              editor.chain().focus().setLink({ href: url }).run()
            }
              })}
              isActive={editor.isActive('link')}
              title="添加链接 (Ctrl+K)"
        >
              {React.createElement(LinkIcon, { className: "w-4 h-4" })}
            </ToolbarButton>
            <ToolbarButton
              onClick={handleToolbarClick(() => {
            const url = window.prompt('输入图片URL:')
            if (url) {
              editor.chain().focus().setImage({ src: url }).run()
            }
              })}
              title="插入图片"
            >
              {React.createElement(ImageIcon, { className: "w-4 h-4" })}
            </ToolbarButton>
          </div>

          {/* 右侧操作组 */}
          <div className="ml-auto flex items-center gap-1">
            <ToolbarButton
              onClick={handleToolbarClick(() => editor.chain().focus().undo().run())}
            disabled={!editor.can().undo()}
            title="撤销 (Ctrl+Z)"
          >
              {React.createElement(Undo, { className: "w-4 h-4" })}
            </ToolbarButton>
            <ToolbarButton
              onClick={handleToolbarClick(() => editor.chain().focus().redo().run())}
            disabled={!editor.can().redo()}
            title="重做 (Ctrl+Shift+Z)"
          >
              {React.createElement(Redo, { className: "w-4 h-4" })}
            </ToolbarButton>
          </div>
        </div>
      </div>
    );
  };

  return (
    <div className={`tiptap-editor flex flex-col h-full ${className}`}>
      {renderToolbar()}
      <div className="flex-1 overflow-auto bg-white dark:bg-gray-800">
        {editor && React.createElement(EditorContent, { editor, className: "h-full" })}
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