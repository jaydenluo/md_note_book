import React from 'react'
import { cn } from '@/lib/utils'
import { Button } from './button'
import { 
  AlignLeft,
  AlignCenter,
  AlignRight,
  X
} from 'lucide-react'
import { Editor } from '@tiptap/core'

// 自定义表格操作图标
const TableCellsMerge = () => (
  <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <rect x="2" y="4" width="20" height="16" rx="2" />
    <path d="M12 4v16" />
  </svg>
)

const TableCellsSplit = () => (
  <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <rect x="2" y="4" width="20" height="16" rx="2" />
    <path d="M12 4v16" />
    <path d="M2 12h20" />
  </svg>
)

const ArrowUp = () => (
  <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <path d="m12 19-7-7 7-7" />
    <path d="M19 12H5" />
  </svg>
)

const ArrowDown = () => (
  <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <path d="m12 5 7 7-7 7" />
    <path d="M5 12h14" />
  </svg>
)

const ArrowLeft = () => (
  <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <path d="m19 12-7-7-7 7" />
    <path d="M12 19V5" />
  </svg>
)

const ArrowRight = () => (
  <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <path d="m5 12 7 7 7-7" />
    <path d="M12 5v14" />
  </svg>
)

const TableRowsSplit = () => (
  <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <rect x="2" y="4" width="20" height="16" rx="2" />
    <path d="M2 12h20" />
  </svg>
)

const TableColumnsSplit = () => (
  <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <rect x="2" y="4" width="20" height="16" rx="2" />
    <path d="M12 4v16" />
  </svg>
)

// 不再直接依赖 BubbleMenu
interface TableBubbleMenuProps {
  editor: Editor
}

export function TableBubbleMenu({ editor }: TableBubbleMenuProps) {
  // 检查是否应该显示菜单
  const [isActive, setIsActive] = React.useState(false)
  const [position, setPosition] = React.useState({ x: 0, y: 0, width: 0 })

  // 添加对齐方式的方法
  const setTextAlign = (align: 'left' | 'center' | 'right' | 'justify') => {
    // 检查当前选中的是否是表格单元格
    if (editor.isActive('tableCell') || editor.isActive('tableHeader')) {
      // 使用 setCellAttribute 命令设置对齐方式
      editor.chain().focus().setCellAttribute('textAlign', align).run()
      
      // 添加日志以便调试
      console.log(`设置单元格对齐方式: ${align}`, editor.getAttributes('tableCell'))
    }
  }

  // 检查当前对齐方式
  const isTextAlignActive = (align: 'left' | 'center' | 'right' | 'justify') => {
    // 获取当前单元格属性
    const cellAttrs = editor.getAttributes('tableCell')
    const headerAttrs = editor.getAttributes('tableHeader')
    
    // 添加日志以便调试
    console.log('当前单元格属性:', cellAttrs, headerAttrs)
    
    // 检查单元格或表头的对齐方式
    return (cellAttrs.textAlign === align) || (headerAttrs.textAlign === align)
  }
  
  // 设置监听器，当选中表格时显示菜单
  React.useEffect(() => {
    const updatePosition = () => {
      if (!editor || !editor.isActive('table')) {
        setIsActive(false)
        return
      }
      
      // 找到当前选中的表格元素
      const currentNode = editor.state.selection.$anchor.node(1) // 获取当前块级节点
      if (!currentNode || currentNode.type.name !== 'table') {
        // 尝试查找DOM中的表格元素
        const dom = editor.view.domAtPos(editor.state.selection.anchor)
        const tableElement = dom.node instanceof Element 
          ? dom.node.closest('table') 
          : dom.node.parentElement instanceof Element 
            ? dom.node.parentElement.closest('table') 
            : null
            
        if (!tableElement) {
          setIsActive(false)
          return
        }
        
        // 获取表格的位置和尺寸
        const rect = tableElement.getBoundingClientRect()
        
        // 将菜单设置在表格上方 6px 处
        setPosition({
          x: rect.left + window.scrollX + rect.width / 2,
          y: rect.top + window.scrollY - 6, // 在表格上方 6px
          width: rect.width
        })
        
        setIsActive(true)
      } else {
        // 如果能直接从选择中获取表格节点
        const tablePos = editor.state.selection.$anchor.start(1)
        const dom = editor.view.domAtPos(tablePos)
        const tableElement = dom.node instanceof Element 
          ? dom.node.closest('table') 
          : dom.node.nodeType === 1 
            ? dom.node as Element 
            : dom.node.parentElement
        
        if (tableElement) {
          const rect = tableElement.getBoundingClientRect()
          setPosition({
            x: rect.left + window.scrollX + rect.width / 2,
            y: rect.top + window.scrollY - 6, // 在表格上方 6px
            width: rect.width
          })
          setIsActive(true)
        } else {
          setIsActive(false)
        }
      }
    }
    
    // 监听选择变化事件
    const handleSelectionChange = () => {
      if (editor.isActive('table')) {
        updatePosition()
      } else {
        setIsActive(false)
      }
    }
    
    // 添加事件监听
    if (editor) {
      editor.on('selectionUpdate', handleSelectionChange)
      editor.on('transaction', handleSelectionChange)
      editor.on('focus', handleSelectionChange)
    }
    
    // 初始化时检查一次
    if (editor && editor.isActive('table')) {
      updatePosition()
    }
    
    return () => {
      if (editor) {
        editor.off('selectionUpdate', handleSelectionChange)
        editor.off('transaction', handleSelectionChange)
        editor.off('focus', handleSelectionChange)
      }
    }
  }, [editor])

  if (!isActive) return null

  return (
    <div
      className={cn(
        "fixed z-[99999]",
        "flex justify-center items-center gap-1 p-1 bg-popover border border-border rounded-md shadow-md",
        "dark:bg-zinc-800 dark:text-zinc-100 dark:border-zinc-700"
      )}
      style={{
        left: `${position.x}px`,
        top: `${position.y}px`,
        transform: 'translateX(-50%) translateY(-100%)',
        maxWidth: `${position.width}px`
      }}
    >
      {/* 合并单元格 */}
      <Button
        size="sm"
        variant="ghost"
        className="h-8 w-8 p-0"
        onClick={() => editor.chain().focus().mergeCells().run()}
        disabled={!editor.can().mergeCells()}
        title="合并单元格"
      >
        <TableCellsMerge />
      </Button>
      {/* 拆分单元格 */}
      <Button
        size="sm"
        variant="ghost"
        className="h-8 w-8 p-0"
        onClick={() => editor.chain().focus().splitCell().run()}
        disabled={!editor.can().splitCell()}
        title="拆分单元格"
      >
        <TableCellsSplit />
      </Button>

      <div className="border-r border-border h-6 mx-1" />

      {/* 对齐方式按钮 */}
      <Button
        size="sm"
        variant="ghost"
        className={cn("h-8 w-8 p-0", isTextAlignActive('left') && "bg-muted")}
        onClick={() => setTextAlign('left')}
        title="左对齐"
      >
        <AlignLeft className="h-4 w-4" />
      </Button>
      <Button
        size="sm"
        variant="ghost"
        className={cn("h-8 w-8 p-0", isTextAlignActive('center') && "bg-muted")}
        onClick={() => setTextAlign('center')}
        title="居中对齐"
      >
        <AlignCenter className="h-4 w-4" />
      </Button>
      <Button
        size="sm"
        variant="ghost"
        className={cn("h-8 w-8 p-0", isTextAlignActive('right') && "bg-muted")}
        onClick={() => setTextAlign('right')}
        title="右对齐"
      >
        <AlignRight className="h-4 w-4" />
      </Button>

      <div className="border-r border-border h-6 mx-1" />

      {/* 增加/删除行列按钮 */}
      <Button
        size="sm"
        variant="ghost"
        className="h-8 w-8 p-0"
        onClick={() => editor.chain().focus().addRowBefore().run()}
        title="上方加行"
      >
        <ArrowUp />
      </Button>
      <Button
        size="sm"
        variant="ghost"
        className="h-8 w-8 p-0"
        onClick={() => editor.chain().focus().addRowAfter().run()}
        title="下方加行"
      >
        <ArrowDown />
      </Button>
      <Button
        size="sm"
        variant="ghost"
        className="h-8 w-8 p-0"
        onClick={() => editor.chain().focus().addColumnBefore().run()}
        title="左侧加列"
      >
        <ArrowLeft />
      </Button>
      <Button
        size="sm"
        variant="ghost"
        className="h-8 w-8 p-0"
        onClick={() => editor.chain().focus().addColumnAfter().run()}
        title="右侧加列"
      >
        <ArrowRight />
      </Button>

      <div className="border-r border-border h-6 mx-1" />

      {/* 删除行列/表格按钮 */}
      <Button
        size="sm"
        variant="ghost"
        className="h-8 w-8 p-0"
        onClick={() => editor.chain().focus().deleteRow().run()}
        title="删除行"
      >
        <TableRowsSplit />
      </Button>
      <Button
        size="sm"
        variant="ghost"
        className="h-8 w-8 p-0"
        onClick={() => editor.chain().focus().deleteColumn().run()}
        title="删除列"
      >
        <TableColumnsSplit />
      </Button>
      <Button
        size="sm"
        variant="ghost"
        className="h-8 w-8 p-0 text-red-500 hover:text-red-600 hover:bg-red-100 dark:hover:bg-red-900/20"
        onClick={() => editor.chain().focus().deleteTable().run()}
        title="删除表格"
      >
        <X className="h-4 w-4" />
      </Button>
    </div>
  )
} 