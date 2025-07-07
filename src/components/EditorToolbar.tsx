import React, { useRef } from 'react'
import type { Editor } from '@tiptap/react'
import { 
  Bold, 
  Italic, 
  Underline, 
  Strikethrough, 
  AlignLeft,
  AlignCenter,
  AlignRight,
  List,
  ListOrdered,
  Quote,
  Code,
  Code2,
  FileText,
  Undo,
  Redo,
  Image
} from 'lucide-react'
import type { LucideIcon } from 'lucide-react'
import { useConfig } from '../stores/configStore'
import { NormalWidthIcon, WideWidthIcon } from './icons'

// 工具栏属性接口
interface EditorToolbarProps {
  editor: Editor | null
}

// 工具栏按钮组件 - 简洁版本
interface ToolbarButtonProps {
  onClick: () => void
  isActive?: boolean
  icon: React.ComponentType<{ size?: number }> | string
  title: string
  disabled?: boolean
  isText?: boolean
}

const ToolbarButton = React.forwardRef<HTMLButtonElement, ToolbarButtonProps>(({ 
  onClick, 
  isActive = false, 
  icon: Icon, 
  title, 
  disabled = false,
  isText = false
}, ref) => {
  const handleClick = (e: React.MouseEvent) => {
    e.preventDefault()
    e.stopPropagation()
    onClick()
  }

  return (
    <button
      ref={ref}
      onClick={handleClick}
      disabled={disabled}
      title={title}
      className={`h-8 w-8 p-0 rounded flex items-center justify-center transition-colors ${
        isActive ? 'bg-gray-200 dark:bg-gray-700 text-gray-900 dark:text-gray-100' : 
        'text-gray-600 dark:text-gray-400 hover:bg-gray-100 dark:hover:bg-gray-800 hover:text-gray-900 dark:hover:text-gray-100'
      } ${disabled ? 'opacity-40 cursor-not-allowed' : ''}`}
    >
      {typeof Icon === 'string' ? (
        <span className="text-sm">{Icon}</span>
      ) : (
        <Icon size={16} />
      )}
    </button>
  )
})

ToolbarButton.displayName = 'ToolbarButton'

// 分隔线组件
const ToolbarSeparator = React.forwardRef<HTMLDivElement>((props, ref) => {
  return <div ref={ref} className="w-px h-6 bg-gray-300 dark:bg-gray-600 mx-2" />
})

ToolbarSeparator.displayName = 'ToolbarSeparator'

const EditorToolbar: React.FC<EditorToolbarProps> = ({ editor }) => {
  // 添加文件输入引用
  const fileInputRef = useRef<HTMLInputElement>(null);

  if (!editor) {
    return null
  }

  // 获取编辑器宽度模式配置
  const { config, updateConfigItem } = useConfig();
  const isWideMode = config.editorWidthMode === 'wide';

  // 切换编辑器宽度模式
  const toggleWidthMode = () => {
    const newMode = isWideMode ? 'normal' : 'wide';
    updateConfigItem('editorWidthMode', newMode);
  };

  // 检查当前格式状态
  const isActive = (name: string, attributes?: Record<string, unknown>) => {
    return editor.isActive(name, attributes)
  }

  // 切换代码块
  const toggleCodeBlock = () => {
    editor.chain().focus().setNode('codeBlock', { language: 'plaintext' }).run()
  }

  // 添加图片上传处理函数
  const handleImageUpload = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (file && editor) {
      const reader = new FileReader();
      reader.onload = (e) => {
        const result = e.target?.result as string;
        if (result) {
          try {
            // 使用setTimeout避免在渲染周期内调用flushSync
            setTimeout(() => {
              // 使用增强图片扩展
              editor.chain().focus().insertContent({
                type: 'enhancedImage',
                attrs: {
                  src: result,
                  alt: file.name,
                  size: 'medium',
                  alignment: 'center',
                  border: true,
                  shadow: true
                }
              }).run();
            }, 0);
          } catch (error) {
            console.error('插入图片失败:', error);
          }
        }
      };
      reader.onerror = (error) => {
        console.error('读取图片文件失败:', error);
      };
      reader.readAsDataURL(file);
    }
    // 清除文件输入，以便可以重复选择同一文件
    if (event.target) {
      event.target.value = '';
    }
  };

  return (
    <div className="flex items-center gap-1 p-2 border-b border-gray-200 dark:border-gray-700 bg-gray-100 dark:bg-gray-800">
      {/* 基本格式化工具 */}
      <ToolbarButton
        onClick={() => editor.chain().focus().toggleBold().run()}
        isActive={isActive('bold')}
        icon={Bold}
        title="加粗"
      />
      <ToolbarButton
        onClick={() => editor.chain().focus().toggleItalic().run()}
        isActive={isActive('italic')}
        icon={Italic}
        title="斜体"
      />
      <ToolbarButton
        onClick={() => editor.chain().focus().toggleUnderline().run()}
        isActive={isActive('underline')}
        icon={Underline}
        title="下划线"
      />
      <ToolbarButton
        onClick={() => editor.chain().focus().toggleStrike().run()}
        isActive={isActive('strike')}
        icon={Strikethrough}
        title="删除线"
      />

      <ToolbarSeparator />

      {/* 标题工具 */}
      <ToolbarButton
        onClick={() => editor.chain().focus().toggleHeading({ level: 1 }).run()}
        isActive={isActive('heading', { level: 1 })}
        icon="H1"
        title="标题1"
        isText
      />
      <ToolbarButton
        onClick={() => editor.chain().focus().toggleHeading({ level: 2 }).run()}
        isActive={isActive('heading', { level: 2 })}
        icon="H2"
        title="标题2"
        isText
      />
      <ToolbarButton
        onClick={() => editor.chain().focus().toggleHeading({ level: 3 }).run()}
        isActive={isActive('heading', { level: 3 })}
        icon="H3"
        title="标题3"
        isText
      />
      <ToolbarButton
        onClick={() => editor.chain().focus().toggleHeading({ level: 4 }).run()}
        isActive={isActive('heading', { level: 4 })}
        icon="H4"
        title="标题4"
        isText
      />
      <ToolbarButton
        onClick={() => editor.chain().focus().toggleHeading({ level: 5 }).run()}
        isActive={isActive('heading', { level: 5 })}
        icon="H5"
        title="标题5"
        isText
      />
      <ToolbarButton
        onClick={() => editor.chain().focus().toggleHeading({ level: 6 }).run()}
        isActive={isActive('heading', { level: 6 })}
        icon="H6"
        title="标题6"
        isText
      />

      <ToolbarSeparator />

      {/* 对齐方式工具 */}
      <ToolbarButton
        onClick={() => editor.chain().focus().setTextAlign('left').run()}
        isActive={isActive('textAlign', { align: 'left' })}
        icon={AlignLeft}
        title="左对齐"
      />
      <ToolbarButton
        onClick={() => editor.chain().focus().setTextAlign('center').run()}
        isActive={isActive('textAlign', { align: 'center' })}
        icon={AlignCenter}
        title="居中对齐"
      />
      <ToolbarButton
        onClick={() => editor.chain().focus().setTextAlign('right').run()}
        isActive={isActive('textAlign', { align: 'right' })}
        icon={AlignRight}
        title="右对齐"
      />

      <ToolbarSeparator />

      {/* 列表工具 */}
      <ToolbarButton
        onClick={() => editor.chain().focus().toggleBulletList().run()}
        isActive={isActive('bulletList')}
        icon={List}
        title="无序列表"
      />
      <ToolbarButton
        onClick={() => editor.chain().focus().toggleOrderedList().run()}
        isActive={isActive('orderedList')}
        icon={ListOrdered}
        title="有序列表"
      />

      <ToolbarSeparator />

      {/* 引用和代码工具 */}
      <ToolbarButton
        onClick={() => editor.chain().focus().toggleBlockquote().run()}
        isActive={isActive('blockquote')}
        icon={Quote}
        title="引用"
      />
      <ToolbarButton
        onClick={() => editor.chain().focus().toggleCode().run()}
        isActive={isActive('code')}
        icon={Code}
        title="行内代码"
      />
      <ToolbarButton
        onClick={toggleCodeBlock}
        isActive={isActive('codeBlock')}
        icon={Code2}
        title="代码块"
      />

      <ToolbarSeparator />

      {/* 撤销/重做工具 */}
      <ToolbarButton
        onClick={() => editor.chain().focus().undo().run()}
        icon={Undo}
        title="撤销"
        disabled={!editor.can().undo()}
      />
      <ToolbarButton
        onClick={() => editor.chain().focus().redo().run()}
        icon={Redo}
        title="重做"
        disabled={!editor.can().redo()}
      />

      <ToolbarSeparator />

      {/* 宽度模式切换按钮 */}
      <button
        onClick={toggleWidthMode}
        className={`h-8 w-8 p-0 rounded flex items-center justify-center transition-colors ${
          isWideMode ? 'bg-gray-200 dark:bg-gray-700 text-gray-900 dark:text-gray-100' : 'text-gray-600 dark:text-gray-400 hover:bg-gray-100 dark:hover:bg-gray-800 hover:text-gray-900 dark:hover:text-gray-100'
        }`}
        title={isWideMode ? "切换到普通宽度" : "切换到宽屏模式"}
      >
        {React.createElement(isWideMode ? NormalWidthIcon : WideWidthIcon, { className: "w-4 h-4" })}
      </button>

      <ToolbarSeparator />

      {/* 添加图片上传按钮 */}
      <input
        type="file"
        ref={fileInputRef}
        onChange={handleImageUpload}
        accept="image/*"
        className="hidden"
      />
      <ToolbarButton
        onClick={() => fileInputRef.current?.click()}
        icon={Image}
        title="上传图片"
      />
    </div>
  )
}

export default EditorToolbar 