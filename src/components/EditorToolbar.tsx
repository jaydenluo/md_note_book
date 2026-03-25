import React, { useRef, useState } from 'react'
import { type Editor } from '@tiptap/core'
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
  Image as ImageIcon,
  Table,
  Link,
  Undo,
  Redo,
  SquareCode,
} from 'lucide-react'
import { useConfig } from '@/stores/configStore'
import { NormalWidthIcon, WideWidthIcon } from './icons'
import { Button } from './ui/button'
import { cn } from '@/utils/cn'
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger
} from './ui/dropdown-menu'
import { LinkDialog } from './ui/link-dialog'

// 工具栏属性接口
interface EditorToolbarProps {
  editor: Editor | null
}

// 工具栏按钮组件 - 简洁版本
interface ToolbarButtonProps {
  onClick: () => void
  isActive?: boolean
  icon: React.ComponentType<{ className?: string }> | string
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
      className={`h-8 w-8 p-0 rounded flex items-center justify-center transition-colors ${isActive ? 'bg-gray-200 dark:bg-gray-700 text-gray-700 dark:text-gray-100' :
        'text-gray-600 dark:text-gray-400 hover:bg-gray-100 dark:hover:bg-gray-800 hover:text-gray-900 dark:hover:text-gray-100'
      } ${disabled ? 'opacity-40 cursor-not-allowed' : ''}`}
    >
      {typeof Icon === 'string' ? (
        <span className="text-sm">{Icon}</span>
      ) : (
        <Icon className="w-4 h-4" />
      )}
    </button>
  )
})

ToolbarButton.displayName = 'ToolbarButton'

// 分隔线组件
const ToolbarSeparator = React.forwardRef<HTMLDivElement>((props, ref) => {
  return <div ref={ref} className="w-px h-6 bg-gray-300 dark:bg-gray-600 mx-1" />
})

ToolbarSeparator.displayName = 'ToolbarSeparator'

const EditorToolbar = ({ editor }: EditorToolbarProps) => {
  // 将所有hooks移到组件顶部
  const { config, updateConfigItem } = useConfig()
  const [showLinkDialog, setShowLinkDialog] = useState(false)
  const [hoveredSize, setHoveredSize] = React.useState({ rows: 0, cols: 0 })
  const [open, setOpen] = useState(false)
  const fileInputRef = useRef<HTMLInputElement>(null)

  if (!editor) {
    return null
  }

  // 获取编辑器宽度模式配置
  const isWideMode = config.editorWidthMode === 'wide'

  // 切换编辑器宽度模式
  const toggleWidthMode = () => {
    const newMode = isWideMode ? 'normal' : 'wide'
    updateConfigItem('editorWidthMode', newMode)
  }

  // 检查当前格式状态
  const isActive = (name: string, attributes?: Record<string, unknown>) => {
    return editor.isActive(name, attributes)
  }

  // 切换代码块
  const toggleCodeBlock = () => {
    editor.chain().focus().setNode('codeBlock', { language: 'plaintext' }).run()
  }

  // 添加图片上传处理函数 - 使用文件化存储
  const handleImageUpload = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0]
    if (file && editor) {
      try {
        // 导入图片存储服务
        const { uploadAndSaveImage, getImageUrl } = await import('../services/imageStorage')
        
        // 上传并保存图片文件
        const imageInfo = await uploadAndSaveImage(file, {
          maxSizeMB: 1,
          maxWidthOrHeight: 800,
          format: 'webp',
          quality: 0.8,
        })
        
        // 获取图片URL
        const imageUrl = await getImageUrl(imageInfo.path)
        
        // 使用setTimeout避免在渲染周期内调用flushSync
        setTimeout(() => {
          // 使用增强图片扩展，存储图片路径而不是base64
          editor.chain().focus().insertContent({
            type: 'enhancedImage',
            attrs: {
              src: imageUrl,
              alt: imageInfo.originalName,
              size: 'medium',
              alignment: 'center',
              border: true,
              shadow: true,
              // 添加图片信息属性
              'data-image-id': imageInfo.id,
              'data-image-path': imageInfo.path,
              'data-image-size': imageInfo.size,
              'data-image-width': imageInfo.width,
              'data-image-height': imageInfo.height,
            }
          }).run()
        }, 0)
        
        console.log('图片上传成功:', imageInfo)
      } catch (error) {
        console.error('图片上传失败:', error)
        // 如果文件化存储失败，回退到base64方式
        const reader = new FileReader()
        reader.onload = (e) => {
          const result = e.target?.result as string
          if (result) {
            try {
              setTimeout(() => {
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
                }).run()
              }, 0)
            } catch (error) {
              console.error('插入图片失败:', error)
            }
          }
        }
        reader.onerror = (error) => {
          console.error('读取图片文件失败:', error)
        }
        reader.readAsDataURL(file)
      }
    }
    // 清除文件输入，以便可以重复选择同一文件
    if (event.target) {
      event.target.value = ''
    }
  }

  return (
    <div className="border-b border-input bg-transparent px-2">
      <div className="flex items-center gap-0.5 p-1 border-b border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800">
        {/* 基本格式化工具 */}

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
          icon={SquareCode}
          title="代码块"
        />
        {/* 链接工具 */}
        <ToolbarButton
          onClick={() => setShowLinkDialog(true)}
          isActive={isActive('link')}
          icon={Link}
          title="添加链接"
        />
        <ToolbarSeparator />

        {/* 表格按钮 */}
        <DropdownMenu open={open} onOpenChange={setOpen}>
          <DropdownMenuTrigger asChild>
            <Button
              variant="ghost"
              className={cn(
                "px-2 py-1",
                editor.isActive('table') && "bg-accent text-accent-foreground"
              )}
            >
              <Table className="h-4 w-4" />
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent
            className="w-[280px] bg-gray-50 dark:bg-gray-700 border-border z-[99999]"
            align="start"
            onMouseLeave={() => setHoveredSize({ rows: 0, cols: 0 })}
          >
            <DropdownMenuLabel className="text-sm font-medium px-2 py-1.5">插入表格</DropdownMenuLabel>
            <DropdownMenuSeparator className="mb-1" />
            <div className="px-2 pb-2">
              <div
                className="grid grid-cols-10 gap-[1.5px] p-2 rounded-md bg-muted/10 dark:bg-muted/5 border border-border/20"
                style={{ aspectRatio: '1/1' }}
              >
                {Array.from({ length: 100 }).map((_, i) => {
                  const row = Math.floor(i / 10)
                  const col = i % 10
                  const isHighlighted = row <= hoveredSize.rows && col <= hoveredSize.cols
                  return (
                    <div
                      key={i}
                      className={cn(
                        "w-full aspect-square rounded-[1px] border border-border/100 transition-colors duration-75 cursor-pointer",
                        "dark:border-border/100 hover:border-border/60 dark:hover:border-border/50",
                        "hover:bg-primary/10 dark:hover:bg-muted/10",
                        isHighlighted && [
                          "bg-primary/30 dark:bg-accent/40",
                          "border-accent/60 dark:border-accent/70",
                          "hover:border-accent/70 dark:hover:border-accent/80",
                          "hover:bg-accent/40 dark:hover:bg-accent/50"
                        ]
                      )}
                      onMouseEnter={() => setHoveredSize({ rows: row, cols: col })}
                      onClick={() => {
                        editor.chain().focus().insertTable({
                          rows: row + 1,
                          cols: col + 1
                        }).run()
                        setOpen(false)
                      }}
                    />
                  )
                })}
              </div>
              <div className="mt-2 text-center text-sm text-muted-foreground/70">
                {hoveredSize.rows > 0 && hoveredSize.cols > 0 ?
                  `${hoveredSize.rows + 1} × ${hoveredSize.cols + 1}` :
                  "移动鼠标选择大小"
                }
              </div>
            </div>
          </DropdownMenuContent>
        </DropdownMenu>

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
          icon={ImageIcon}
          title="上传图片"
        />

        {/* 宽度模式切换按钮 */}
        <button
          onClick={toggleWidthMode}
          className={`h-8 w-8 p-0 rounded flex items-center justify-center transition-colors ${isWideMode ? 'bg-gray-200 dark:bg-gray-700 text-gray-900 dark:text-gray-100' : 'text-gray-600 dark:text-gray-400 hover:bg-gray-100 dark:hover:bg-gray-800 hover:text-gray-900 dark:hover:text-gray-100'
            }`}
          title={isWideMode ? "切换到普通宽度" : "切换到宽屏模式"}
        >
          {isWideMode ? <NormalWidthIcon className="w-4 h-4" /> : <WideWidthIcon className="w-4 h-4" />}
        </button>

      </div>
      {/* 添加链接对话框 */}
      <LinkDialog
        editor={editor}
        isOpen={showLinkDialog}
        onClose={() => setShowLinkDialog(false)}
      />
    </div>
  )
}

export default EditorToolbar 