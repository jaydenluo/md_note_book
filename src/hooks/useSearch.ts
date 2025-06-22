import { useState, useEffect } from 'react'
import type { Note } from '@stores/noteStore'

interface SearchResult {
  results: Note[]
  isSearching: boolean
}

export function useSearch(notes: Note[], query: string): SearchResult {
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