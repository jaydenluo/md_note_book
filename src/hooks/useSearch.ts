import { useState, useEffect, useCallback } from 'react'
import type { Note } from '@stores/noteStore'
import { storage } from '@services/storage'
import type { SearchResult, SearchOptions, AdvancedSearchOptions } from '@services/storage'
import { debounce } from '@utils/debounce'

// 基本搜索结果接口
interface BasicSearchResult {
  results: Note[]
  isSearching: boolean
}

// 增强搜索结果接口
interface EnhancedSearchResult {
  results: SearchResult[]
  isSearching: boolean
  suggestions: string[]
  totalCount: number
  hasMore: boolean
}

// 搜索模式类型
type SearchMode = 'basic' | 'enhanced'

// 基本搜索Hook（保持向后兼容）
export function useSearch(notes: Note[], query: string): BasicSearchResult {
  const [results, setResults] = useState<Note[]>(notes)
  const [isSearching, setIsSearching] = useState(false)

  useEffect(() => {
    if (!query) {
      setResults(notes)
      setIsSearching(false)
      return
    }

    setIsSearching(true)
    const searchLower = query.toLowerCase()
    const filtered = notes.filter(note =>
      note.title.toLowerCase().includes(searchLower) ||
      note.content.toLowerCase().includes(searchLower)
    )
    setResults(filtered)
    setIsSearching(false)
  }, [notes, query])

  return { results, isSearching }
}

// 增强全文搜索Hook
export function useFullTextSearch(options: SearchOptions = {}): {
  search: (query: string) => Promise<void>
  advancedSearch: (query: string, advancedOptions?: AdvancedSearchOptions) => Promise<void>
  fuzzySearch: (query: string) => Promise<void>
  searchByTags: (tagIds: string[]) => Promise<void>
  combinedSearch: (combinedOptions: {
    query?: string;
    tagIds?: string[];
    fuzzy?: boolean;
  }) => Promise<void>
  getSuggestions: (partialQuery: string) => Promise<string[]>
  results: SearchResult[]
  isSearching: boolean
  suggestions: string[]
  error: string | null
  clearResults: () => void
} {
  const [results, setResults] = useState<SearchResult[]>([])
  const [isSearching, setIsSearching] = useState(false)
  const [suggestions, setSuggestions] = useState<string[]>([])
  const [error, setError] = useState<string | null>(null)
  
  // 稳定化options对象，避免无限循环
  const stableOptions = useCallback(() => options, [JSON.stringify(options)])

  // 防抖搜索函数
  const debouncedSearch = useCallback(
    debounce(async (query: string, searchOptions: SearchOptions) => {
      if (!query.trim()) {
        setResults([])
        setIsSearching(false)
        return
      }

      try {
        setIsSearching(true)
        setError(null)
        const searchResults = await storage.fullTextSearch(query, searchOptions)
        setResults(searchResults)
      } catch (err) {
        console.error('搜索失败:', err)
        setError(err instanceof Error ? err.message : '搜索失败')
        setResults([])
      } finally {
        setIsSearching(false)
      }
    }, 300),
    []
  )

  // 基本搜索函数
  const search = useCallback(async (query: string) => {
    await debouncedSearch(query, stableOptions())
  }, [debouncedSearch, stableOptions])

  // 高级搜索函数
  const advancedSearch = useCallback(async (query: string, advancedOptions: AdvancedSearchOptions = {}) => {
    if (!query.trim()) {
      setResults([])
      setIsSearching(false)
      return
    }

    try {
      setIsSearching(true)
      setError(null)
      const mergedOptions = { ...stableOptions(), ...advancedOptions }
      const searchResults = await storage.advancedSearch(query, mergedOptions)
      setResults(searchResults)
    } catch (err) {
      console.error('高级搜索失败:', err)
      setError(err instanceof Error ? err.message : '搜索失败')
      setResults([])
    } finally {
      setIsSearching(false)
    }
  }, [stableOptions])

  // 模糊搜索函数
  const fuzzySearch = useCallback(async (query: string) => {
    if (!query.trim()) {
      setResults([])
      setIsSearching(false)
      return
    }

    try {
      setIsSearching(true)
      setError(null)
      const searchResults = await storage.fuzzySearch(query, stableOptions())
      setResults(searchResults)
    } catch (err) {
      console.error('模糊搜索失败:', err)
      setError(err instanceof Error ? err.message : '模糊搜索失败')
      setResults([])
    } finally {
      setIsSearching(false)
    }
  }, [stableOptions])

  // 标签搜索函数
  const searchByTags = useCallback(async (tagIds: string[]) => {
    if (!tagIds || tagIds.length === 0) {
      setResults([])
      setIsSearching(false)
      return
    }

    try {
      setIsSearching(true)
      setError(null)
      const searchResults = await storage.searchByTags(tagIds, stableOptions())
      setResults(searchResults)
    } catch (err) {
      console.error('标签搜索失败:', err)
      setError(err instanceof Error ? err.message : '标签搜索失败')
      setResults([])
    } finally {
      setIsSearching(false)
    }
  }, [stableOptions])

  // 组合搜索函数
  const combinedSearch = useCallback(async (combinedOptions: {
    query?: string;
    tagIds?: string[];
    fuzzy?: boolean;
  }) => {
    try {
      setIsSearching(true)
      setError(null)
      const searchResults = await storage.combinedSearch({
        ...stableOptions(),
        ...combinedOptions
      })
      setResults(searchResults)
    } catch (err) {
      console.error('组合搜索失败:', err)
      setError(err instanceof Error ? err.message : '搜索失败')
      setResults([])
    } finally {
      setIsSearching(false)
    }
  }, [stableOptions])

  // 获取搜索建议
  const getSuggestions = useCallback(async (partialQuery: string): Promise<string[]> => {
    if (!partialQuery.trim()) {
      setSuggestions([])
      return []
    }

    try {
      const suggestionResults = await storage.searchSuggestions(partialQuery, 10)
      setSuggestions(suggestionResults)
      return suggestionResults
    } catch (err) {
      console.error('获取搜索建议失败:', err)
      return []
    }
  }, [])

  // 清空搜索结果
  const clearResults = useCallback(() => {
    setResults([])
    setSuggestions([])
    setError(null)
  }, [])

  return {
    search,
    advancedSearch,
    fuzzySearch,
    searchByTags,
    combinedSearch,
    getSuggestions,
    results,
    isSearching,
    suggestions,
    error,
    clearResults
  }
}

// 搜索历史Hook
export function useSearchHistory(maxHistory: number = 20): {
  history: string[]
  addToHistory: (query: string) => void
  removeFromHistory: (query: string) => void
  clearHistory: () => void
} {
  const [history, setHistory] = useState<string[]>(() => {
    try {
      const saved = localStorage.getItem('search-history')
      return saved ? JSON.parse(saved) : []
    } catch {
      return []
    }
  })

  const addToHistory = useCallback((query: string) => {
    if (!query.trim()) return
    
    setHistory(prev => {
      const filtered = prev.filter(item => item !== query)
      const newHistory = [query, ...filtered].slice(0, maxHistory)
      localStorage.setItem('search-history', JSON.stringify(newHistory))
      return newHistory
    })
  }, [maxHistory])

  const removeFromHistory = useCallback((query: string) => {
    setHistory(prev => {
      const newHistory = prev.filter(item => item !== query)
      localStorage.setItem('search-history', JSON.stringify(newHistory))
      return newHistory
    })
  }, [])

  const clearHistory = useCallback(() => {
    setHistory([])
    localStorage.removeItem('search-history')
  }, [])

  return {
    history,
    addToHistory,
    removeFromHistory,
    clearHistory
  }
} 