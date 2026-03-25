import React, { useState, useEffect, useRef } from 'react'
import { Search, Clock, Hash, FileText, Calendar } from 'lucide-react'
import { 
  Dialog, 
  DialogContent,
} from '@components/ui/dialog'
import { useFullTextSearch, useSearchHistory } from '@hooks/useSearch'
import { useCategories } from '@stores/categoryStore'
import { useTags } from '@stores/tagStore'
import { SearchHighlight, extractSearchSnippet } from './SearchHighlight'
import { useHotkeys } from '@hooks/useHotkeys'

interface QuickSearchDialogProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  onSelectNote: (noteId: string) => void
}

// 快速搜索对话框组件
export function QuickSearchDialog({ open, onOpenChange, onSelectNote }: QuickSearchDialogProps) {
  const [query, setQuery] = useState('')
  const [selectedIndex, setSelectedIndex] = useState(0)
  const inputRef = useRef<HTMLInputElement>(null)
  const resultsRef = useRef<HTMLDivElement>(null)

  const categories = useCategories(state => state.categories)
  const tags = useTags(state => state.tags)
  
  const { 
    search, 
    results, 
    isSearching, 
    clearResults 
  } = useFullTextSearch({ limit: 10 })
  
  const {
    history,
    addToHistory,
  } = useSearchHistory(10)

  // 组合搜索结果（包含历史记录、分类、标签）
  const combinedResults = React.useMemo(() => {
    const items: Array<{
      type: 'note' | 'history' | 'category' | 'tag'
      id: string
      title: string
      subtitle?: string
      icon: React.ReactNode
      data?: any
    }> = []

    // 添加搜索历史（仅在没有搜索词时显示）
    if (!query.trim() && history.length > 0) {
      history.slice(0, 5).forEach(historyItem => {
        items.push({
          type: 'history',
          id: `history-${historyItem}`,
          title: historyItem,
          subtitle: '搜索历史',
          icon: <Clock className="h-4 w-4 text-gray-400" />,
          data: historyItem
        })
      })
    }

    // 添加笔记结果
    results.forEach(result => {
      items.push({
        type: 'note',
        id: result.note.id,
        title: result.note.title,
        subtitle: result.snippet || extractSearchSnippet(result.note.content, query, 100),
        icon: <FileText className="h-4 w-4 text-blue-500" />,
        data: result
      })
    })

    // 添加匹配的分类（仅在有搜索词时）
    if (query.trim()) {
      const matchedCategories = categories.filter(category =>
        category.name.toLowerCase().includes(query.toLowerCase())
      )
      matchedCategories.slice(0, 3).forEach(category => {
        items.push({
          type: 'category',
          id: `category-${category.id}`,
          title: category.name,
          subtitle: '分类',
          icon: <div className="w-3 h-3 rounded" style={{ backgroundColor: category.color }} />,
          data: category
        })
      })

      // 添加匹配的标签
      const matchedTags = tags.filter(tag =>
        tag.name.toLowerCase().includes(query.toLowerCase())
      )
      matchedTags.slice(0, 3).forEach(tag => {
        items.push({
          type: 'tag',
          id: `tag-${tag.id}`,
          title: tag.name,
          subtitle: '标签',
          icon: <Hash className="h-4 w-4 text-green-500" />,
          data: tag
        })
      })
    }

    return items
  }, [query, results, history, categories, tags])

  // 处理搜索
  useEffect(() => {
    if (query.trim()) {
      search(query)
    } else {
      clearResults()
    }
    setSelectedIndex(0)
  }, [query, search, clearResults])

  // 聚焦输入框
  useEffect(() => {
    if (open && inputRef.current) {
      inputRef.current.focus()
    }
  }, [open])

  // 重置状态
  useEffect(() => {
    if (open) {
      setQuery('')
      setSelectedIndex(0)
      clearResults()
    }
  }, [open, clearResults])

  // 处理选择
  const handleSelect = (item: typeof combinedResults[0]) => {
    switch (item.type) {
      case 'note':
        addToHistory(query)
        onSelectNote(item.data.note.id)
        onOpenChange(false)
        break
      case 'history':
        setQuery(item.data)
        break
      case 'category':
        // 可以扩展为跳转到分类视图
        console.log('选中分类:', item.data)
        break
      case 'tag':
        // 可以扩展为按标签搜索
        console.log('选中标签:', item.data)
        break
    }
  }

  // 键盘导航
  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (!combinedResults.length) return

    switch (e.key) {
      case 'ArrowDown':
        e.preventDefault()
        setSelectedIndex(prev => Math.min(prev + 1, combinedResults.length - 1))
        break
      case 'ArrowUp':
        e.preventDefault()
        setSelectedIndex(prev => Math.max(prev - 1, 0))
        break
      case 'Enter':
        e.preventDefault()
        if (combinedResults[selectedIndex]) {
          handleSelect(combinedResults[selectedIndex])
        }
        break
      case 'Escape':
        e.preventDefault()
        onOpenChange(false)
        break
    }
  }

  // 滚动到选中项
  useEffect(() => {
    if (resultsRef.current && selectedIndex >= 0) {
      const selectedElement = resultsRef.current.children[selectedIndex] as HTMLElement
      if (selectedElement) {
        selectedElement.scrollIntoView({
          block: 'nearest',
          behavior: 'smooth'
        })
      }
    }
  }, [selectedIndex])

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl p-0 overflow-hidden">
        {/* 搜索输入 */}
        <div className="flex items-center border-b px-4 py-3">
          <Search className="h-5 w-5 text-gray-400 mr-3" />
          <input
            ref={inputRef}
            type="text"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            onKeyDown={handleKeyDown}
            placeholder="搜索笔记、分类或标签..."
            className="flex-1 bg-transparent border-none outline-none text-lg placeholder-gray-400"
          />
          {isSearching && (
            <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-blue-500 ml-2" />
          )}
        </div>

        {/* 搜索结果 */}
        <div 
          ref={resultsRef}
          className="max-h-96 overflow-y-auto"
        >
          {combinedResults.length > 0 ? (
            <div className="py-2">
              {combinedResults.map((item, index) => (
                <div
                  key={item.id}
                  onClick={() => handleSelect(item)}
                  className={`flex items-center px-4 py-3 cursor-pointer transition-colors ${
                    index === selectedIndex 
                      ? 'bg-blue-50 dark:bg-blue-900/20 border-r-2 border-blue-500' 
                      : 'hover:bg-gray-50 dark:hover:bg-gray-800'
                  }`}
                >
                  <div className="flex-shrink-0 mr-3">
                    {item.icon}
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="font-medium text-sm truncate">
                      {item.type === 'note' ? (
                        <SearchHighlight 
                          text={item.title}
                          searchQuery={query}
                          highlightClassName="bg-yellow-200 dark:bg-yellow-700 px-1 rounded"
                        />
                      ) : (
                        item.title
                      )}
                    </div>
                    {item.subtitle && (
                      <div className="text-xs text-gray-500 dark:text-gray-400 truncate mt-1">
                        {item.type === 'note' ? (
                          <SearchHighlight 
                            text={item.subtitle}
                            searchQuery={query}
                            highlightClassName="bg-yellow-200 dark:bg-yellow-700 px-1 rounded"
                            isHtml={true}
                          />
                        ) : (
                          item.subtitle
                        )}
                      </div>
                    )}
                  </div>
                  {item.type === 'note' && item.data && (
                    <div className="flex-shrink-0 ml-2 text-right space-y-1">
                      <div className="text-[10px] text-gray-400">
                        评分: {item.data.rank.toFixed(1)}
                      </div>
                      <div className="text-xs text-gray-400">
                        <Calendar className="h-3 w-3 inline mr-1" />
                        {item.data.note.updatedAt.toLocaleDateString()}
                      </div>
                    </div>
                  )}
                </div>
              ))}
            </div>
          ) : query.trim() ? (
            <div className="py-8 text-center text-gray-500">
              <Search className="h-12 w-12 mx-auto mb-3 opacity-50" />
              <p>未找到匹配的内容</p>
              <p className="text-xs mt-1">尝试使用不同的关键词</p>
            </div>
          ) : (
            <div className="py-8 text-center text-gray-500">
              <Search className="h-12 w-12 mx-auto mb-3 opacity-50" />
              <p>开始输入来搜索笔记</p>
              <p className="text-xs mt-1">支持搜索标题、内容、分类和标签</p>
            </div>
          )}
        </div>

        {/* 快捷键提示 */}
        <div className="border-t px-4 py-2 text-xs text-gray-500 dark:text-gray-400 bg-gray-50 dark:bg-gray-800">
          <div className="flex items-center justify-between">
            <span>快捷键: ↑↓ 导航, Enter 选择, Esc 关闭</span>
            <span>Ctrl+K 打开快速搜索</span>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  )
}

// 快速搜索Hook，提供全局快捷键支持
export function useQuickSearch(onSelectNote: (noteId: string) => void) {
  const [open, setOpen] = useState(false)

  // 注册全局快捷键
  useHotkeys({
    'Ctrl+K': () => {
      setOpen(true)
    },
    'Cmd+K': () => {
      setOpen(true)
    }
  })

  return {
    open,
    setOpen,
    QuickSearchDialog: (props: Omit<QuickSearchDialogProps, 'open' | 'onOpenChange' | 'onSelectNote'>) => (
      <QuickSearchDialog
        {...props}
        open={open}
        onOpenChange={setOpen}
        onSelectNote={onSelectNote}
      />
    )
  }
}