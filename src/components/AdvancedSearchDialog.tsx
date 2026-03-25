import React, { useState } from 'react'
import { Search, Clock, X, Settings } from 'lucide-react'
import { Button } from '@components/ui/button'
import { Input } from '@components/ui/input'
import { 
  Dialog, 
  DialogContent, 
  DialogHeader, 
  DialogTitle,
  DialogTrigger 
} from '@components/ui/dialog'
import { 
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@components/ui/select'
import { useFullTextSearch, useSearchHistory } from '@hooks/useSearch'
import { useCategories } from '@stores/categoryStore'
import type { AdvancedSearchOptions } from '@services/storage'
import { SearchHighlight, HTMLSearchHighlight, extractSearchSnippet } from './SearchHighlight'

interface AdvancedSearchDialogProps {
  onSelectNote: (noteId: string) => void
  trigger?: React.ReactNode
}

// 高级搜索对话框组件
export function AdvancedSearchDialog({ onSelectNote, trigger }: AdvancedSearchDialogProps) {
  const [open, setOpen] = useState(false)
  const [query, setQuery] = useState('')
  const [showAdvanced, setShowAdvanced] = useState(false)
  const [searchOptions, setSearchOptions] = useState<AdvancedSearchOptions>({
    limit: 50,
    exactMatch: false,
    searchFields: ['title', 'content'],
    categoryId: undefined
  })
  
  const [sortBy, setSortBy] = useState<'relevance' | 'date' | 'title'>('relevance')

  const categories = useCategories(state => state.categories)
  const { 
    search, 
    combinedSearch,
    getSuggestions, 
    results, 
    isSearching, 
    suggestions, 
    error,
    clearResults 
  } = useFullTextSearch()
  
  const {
    history,
    addToHistory,
    removeFromHistory,
    clearHistory
  } = useSearchHistory()

  const [showSuggestions, setShowSuggestions] = useState(false)
  const [showHistory, setShowHistory] = useState(false)

  // 执行搜索
  const handleSearch = async () => {
    if (!query.trim()) return
    
    addToHistory(query)
    setShowSuggestions(false)
    setShowHistory(false)
    
    if (showAdvanced) {
      // 使用组合搜索，支持多种条件
      await combinedSearch({
        query,
        fuzzy: searchOptions.exactMatch === false, // 如果不是精确匹配，则使用模糊搜索
        categoryId: searchOptions.categoryId,
      })
    } else {
      await search(query)
    }
  }

  // 处理输入变化
  const handleInputChange = async (value: string) => {
    setQuery(value)
    
    if (value.trim().length > 1) {
      await getSuggestions(value)
      setShowSuggestions(true)
    } else {
      setShowSuggestions(false)
    }
  }

  // 选择笔记
  const handleSelectNote = (noteId: string) => {
    onSelectNote(noteId)
    setOpen(false)
    clearResults()
    setQuery('')
  }

  // 使用历史记录或建议
  const handleSelectSuggestion = (suggestion: string) => {
    setQuery(suggestion)
    setShowSuggestions(false)
    setShowHistory(false)
  }

  // 清空搜索
  const handleClear = () => {
    setQuery('')
    clearResults()
    setShowSuggestions(false)
    setShowHistory(false)
  }

  // 键盘事件处理
  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter') {
      handleSearch()
    } else if (e.key === 'Escape') {
      handleClear()
    }
  }

  // 搜索选项更新
  const updateSearchOptions = (field: keyof AdvancedSearchOptions, value: any) => {
    setSearchOptions(prev => ({
      ...prev,
      [field]: value
    }))
  }

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        {trigger || (
          <Button variant="ghost" size="sm">
            <Search className="h-4 w-4 mr-2" />
            高级搜索
          </Button>
        )}
      </DialogTrigger>
      
      <DialogContent className="max-w-4xl max-h-[80vh] overflow-hidden flex flex-col">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Search className="h-5 w-5" />
            全文搜索
          </DialogTitle>
        </DialogHeader>
        
        <div className="flex flex-col gap-4 flex-1 overflow-hidden">
          {/* 搜索输入区域 */}
          <div className="relative">
            <div className="flex gap-2">
              <div className="relative flex-1">
                <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-gray-400" />
                <Input
                  value={query}
                  onChange={(e) => handleInputChange(e.target.value)}
                  onKeyDown={handleKeyDown}
                  onFocus={() => setShowHistory(history.length > 0)}
                  placeholder="输入搜索关键词..."
                  className="pl-10 pr-10"
                />
                {query && (
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={handleClear}
                    className="absolute right-1 top-1/2 transform -translate-y-1/2 h-6 w-6 p-0"
                  >
                    <X className="h-3 w-3" />
                  </Button>
                )}
              </div>
              
              <Button onClick={handleSearch} disabled={!query.trim() || isSearching}>
                {isSearching ? '搜索中...' : '搜索'}
              </Button>
              
              <Button
                variant="outline"
                onClick={() => setShowAdvanced(!showAdvanced)}
              >
                <Settings className="h-4 w-4 mr-2" />
                {showAdvanced ? '简单搜索' : '高级搜索'}
              </Button>
            </div>
            
            {/* 搜索建议和历史 */}
            {(showSuggestions || showHistory) && (
              <div className="absolute top-full left-0 right-0 bg-white dark:bg-gray-800 border rounded-md shadow-lg z-10 max-h-48 overflow-y-auto">
                {showHistory && history.length > 0 && (
                  <div className="p-2">
                    <div className="flex items-center justify-between mb-2">
                      <span className="text-xs text-gray-500 flex items-center gap-1">
                        <Clock className="h-3 w-3" />
                        搜索历史
                      </span>
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={clearHistory}
                        className="h-6 text-xs"
                      >
                        清空
                      </Button>
                    </div>
                    {history.slice(0, 5).map((item, index) => (
                      <div
                        key={index}
                        onClick={() => handleSelectSuggestion(item)}
                        className="px-2 py-1 hover:bg-gray-100 dark:hover:bg-gray-700 cursor-pointer text-sm rounded flex items-center justify-between"
                      >
                        <span>{item}</span>
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={(e) => {
                            e.stopPropagation()
                            removeFromHistory(item)
                          }}
                          className="h-4 w-4 p-0"
                        >
                          <X className="h-2 w-2" />
                        </Button>
                      </div>
                    ))}
                  </div>
                )}
                
                {showSuggestions && suggestions.length > 0 && (
                  <div className="p-2 border-t">
                    <span className="text-xs text-gray-500 mb-2 block">搜索建议</span>
                    {suggestions.map((suggestion, index) => (
                      <div
                        key={index}
                        onClick={() => handleSelectSuggestion(suggestion)}
                        className="px-2 py-1 hover:bg-gray-100 dark:hover:bg-gray-700 cursor-pointer text-sm rounded"
                      >
                        {suggestion}
                      </div>
                    ))}
                  </div>
                )}
              </div>
            )}
          </div>
          
          {/* 高级搜索选项 */}
          {showAdvanced && (
                          <div className="bg-gray-50 dark:bg-gray-800 p-4 rounded-lg">
              <h3 className="text-sm font-medium mb-3 flex items-center gap-2">
                <Settings className="h-4 w-4" />
                搜索选项
              </h3>
              
              <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                {/* 分类筛选 */}
                <div>
                  <label className="text-xs font-medium mb-1 block">分类</label>
                  <Select
                    value={searchOptions.categoryId || 'all'}
                    onValueChange={(value) => 
                      updateSearchOptions('categoryId', value === 'all' ? undefined : value)
                    }
                  >
                    <SelectTrigger className="h-8">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="all">所有分类</SelectItem>
                      {categories.map(category => (
                        <SelectItem key={category.id} value={category.id}>
                          {category.name}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                
                {/* 搜索字段 */}
                <div>
                  <label className="text-xs font-medium mb-1 block">搜索字段</label>
                  <div className="space-y-1">
                    <label className="flex items-center text-xs">
                      <input
                        type="checkbox"
                        checked={searchOptions.searchFields?.includes('title')}
                        onChange={(e) => {
                          const fields = searchOptions.searchFields || []
                          const newFields = e.target.checked
                            ? [...fields.filter(f => f !== 'title'), 'title']
                            : fields.filter(f => f !== 'title')
                          updateSearchOptions('searchFields', newFields)
                        }}
                        className="mr-1"
                      />
                      标题
                    </label>
                    <label className="flex items-center text-xs">
                      <input
                        type="checkbox"
                        checked={searchOptions.searchFields?.includes('content')}
                        onChange={(e) => {
                          const fields = searchOptions.searchFields || []
                          const newFields = e.target.checked
                            ? [...fields.filter(f => f !== 'content'), 'content']
                            : fields.filter(f => f !== 'content')
                          updateSearchOptions('searchFields', newFields)
                        }}
                        className="mr-1"
                      />
                      内容
                    </label>
                  </div>
                </div>
                
                {/* 匹配模式 */}
                <div>
                  <label className="text-xs font-medium mb-1 block">匹配模式</label>
                  <div className="space-y-1">
                    <label className="flex items-center text-xs">
                      <input
                        type="radio"
                        name="searchMode"
                        checked={!searchOptions.exactMatch}
                        onChange={() => updateSearchOptions('exactMatch', false)}
                        className="mr-1"
                      />
                      模糊匹配
                    </label>
                    <label className="flex items-center text-xs">
                      <input
                        type="radio"
                        name="searchMode"
                        checked={searchOptions.exactMatch}
                        onChange={() => updateSearchOptions('exactMatch', true)}
                        className="mr-1"
                      />
                      精确匹配
                    </label>
                  </div>
                </div>
                
                {/* 结果数量限制 */}
                <div>
                  <label className="text-xs font-medium mb-1 block">结果数量</label>
                  <Select
                    value={searchOptions.limit?.toString() || '50'}
                    onValueChange={(value) => updateSearchOptions('limit', parseInt(value))}
                  >
                    <SelectTrigger className="h-8">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="20">20</SelectItem>
                      <SelectItem value="50">50</SelectItem>
                      <SelectItem value="100">100</SelectItem>
                      <SelectItem value="200">200</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </div>
            </div>
          )}
          
          {/* 搜索状态和错误 */}
          {isSearching && (
            <div className="text-center py-4">
              <div className="inline-flex items-center gap-2 text-sm text-gray-500">
                <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-blue-500"></div>
                正在搜索...
              </div>
            </div>
          )}
          
          {error && (
            <div className="bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-lg p-3">
              <p className="text-red-600 dark:text-red-400 text-sm">{error}</p>
            </div>
          )}
          
          {/* 搜索结果 */}
          <div className="flex-1 overflow-y-auto">
            {results.length > 0 && (
              <div>
                <div className="flex items-center justify-between mb-3">
                  <h3 className="text-sm font-medium">
                    搜索结果 ({results.length})
                  </h3>
                  <div className="flex items-center gap-2">
                    <Select value={sortBy} onValueChange={(value: any) => setSortBy(value)}>
                      <SelectTrigger className="w-32 h-8">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="relevance">相关度</SelectItem>
                        <SelectItem value="date">更新时间</SelectItem>
                        <SelectItem value="title">标题</SelectItem>
                      </SelectContent>
                    </Select>
                    <Button variant="ghost" size="sm" onClick={handleClear}>
                      清空结果
                    </Button>
                  </div>
                </div>
                
                <div className="space-y-2">
                  {results
                    .sort((a, b) => {
                      switch (sortBy) {
                        case 'relevance':
                          return b.rank - a.rank
                        case 'date':
                          return b.note.updatedAt.getTime() - a.note.updatedAt.getTime()
                        case 'title':
                          return a.note.title.localeCompare(b.note.title)
                        default:
                          return 0
                      }
                    })
                    .map((result) => (
                    <div
                      key={result.note.id}
                      onClick={() => handleSelectNote(result.note.id)}
                      className="p-3 border rounded-lg hover:bg-gray-50 dark:hover:bg-gray-800 cursor-pointer transition-colors"
                    >
                      <div className="flex items-start justify-between">
                                              <div className="flex-1 min-w-0">
                        <h4 className="font-medium text-sm mb-1 truncate">
                          <SearchHighlight 
                            text={result.note.title}
                            searchQuery={query}
                            highlightClassName="bg-yellow-200 dark:bg-yellow-700 px-1 rounded font-medium"
                          />
                        </h4>
                        {result.snippet && (
                          <div className="text-xs text-gray-600 dark:text-gray-300 line-clamp-2">
                            {result.snippet.includes('<mark>') ? (
                              <HTMLSearchHighlight 
                                html={result.snippet}
                                className="text-xs text-gray-600 dark:text-gray-300"
                              />
                            ) : (
                              <SearchHighlight 
                                text={extractSearchSnippet(result.note.content, query, 200)}
                                searchQuery={query}
                                highlightClassName="bg-yellow-200 dark:bg-yellow-700 px-1 rounded"
                                maxLength={200}
                              />
                            )}
                          </div>
                        )}
                        <div className="flex items-center gap-2 mt-2 text-xs text-gray-500">
                          <span>相关度: {result.rank.toFixed(2)}</span>
                          <span>•</span>
                          <span>{result.note.updatedAt.toLocaleDateString()}</span>
                          {result.note.categoryId && (
                            <>
                              <span>•</span>
                              <span className="inline-flex items-center px-2 py-0.5 rounded-full text-xs bg-gray-100 dark:bg-gray-700 text-gray-600 dark:text-gray-300">
                                {categories.find(c => c.id === result.note.categoryId)?.name || '未分类'}
                              </span>
                            </>
                          )}
                        </div>
                      </div>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}
            
            {query && !isSearching && results.length === 0 && !error && (
              <div className="text-center py-8 text-gray-500">
                <Search className="h-12 w-12 mx-auto mb-3 opacity-50" />
                <p>未找到匹配的笔记</p>
                <p className="text-xs mt-1">尝试使用不同的关键词或调整搜索选项</p>
              </div>
            )}
          </div>
        </div>
      </DialogContent>
    </Dialog>
  )
}