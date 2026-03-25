import type { FC } from 'react'
import { useState, useRef, useEffect, useMemo } from 'react'
import { useNotes } from '@stores/noteStore'
import { useTags } from '@stores/tagStore'
import { formatDate } from '@utils/date'
import { useSearch } from '@hooks/useSearch'
import { useHotkeys } from '@hooks/useHotkeys'
import { useAlertDialog } from '@/components/ui/alert-dialog'
import { ContextMenu, useContextMenu } from './ui/ContextMenu'
import type { ContextMenuItem } from './ui/ContextMenu'
import { ExportService } from '@services/exportService'
import { FileText, FileDown, Trash2 } from 'lucide-react'

interface NoteListProps {
  selectedNoteId: string | null
  onSelectNote: (id: string) => void
  categoryId: string | null
}

export const NoteList: FC<NoteListProps> = ({
  selectedNoteId,
  onSelectNote,
  categoryId
}) => {
  const [searchTerm, setSearchTerm] = useState('')
  const [selectedTagId, setSelectedTagId] = useState<string | null>(null)
  const [sortBy, setSortBy] = useState<'updated' | 'created' | 'title'>('updated')
  const searchInputRef = useRef<HTMLInputElement>(null)
  
  const notes = useNotes(state => state.notes)
  const createNote = useNotes(state => state.createNote)
  const deleteNote = useNotes(state => state.deleteNote)
  const isLoading = useNotes(state => state.isLoading)
  const tags = useTags(state => state.tags)
  const getNoteTags = useTags(state => state.getNoteTags)
  const { showConfirm } = useAlertDialog()

  const filteredNotes = useMemo(() => {
    return notes
      .filter(note => {
        // 分类筛选
        if (categoryId && note.categoryId !== categoryId) {
          return false
        }

        // 标签筛选
        if (selectedTagId) {
          const noteTags = getNoteTags(note.id)
          if (!noteTags.some(tag => tag.id === selectedTagId)) {
            return false
          }
        }

        // 搜索筛选
        if (searchTerm) {
          const searchLower = searchTerm.toLowerCase()
          return (
            note.title.toLowerCase().includes(searchLower) ||
            note.content.toLowerCase().includes(searchLower)
          )
        }

        return true
      })
      .sort((a, b) => {
        if (sortBy === 'updated') {
          return b.updatedAt.getTime() - a.updatedAt.getTime()
        } else if (sortBy === 'created') {
          return b.createdAt.getTime() - a.createdAt.getTime()
        } else {
          return a.title.localeCompare(b.title)
        }
      })
  }, [notes, categoryId, selectedTagId, searchTerm, getNoteTags, sortBy])

  const { results: searchResults, isSearching } = useSearch(
    filteredNotes,
    searchTerm
  )

  const displayedNotes = searchTerm ? searchResults : filteredNotes

  // 注册快捷键
  useHotkeys({
    'Ctrl+F': (e) => {
      e.preventDefault()
      searchInputRef.current?.focus()
    },
    'Ctrl+N': () => {
      if (categoryId) {
        handleCreateNote()
      }
    }
  })

  // 处理笔记列表导航
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (!displayedNotes.length) return

      const currentIndex = selectedNoteId
        ? displayedNotes.findIndex(note => note.id === selectedNoteId)
        : -1

      switch (e.key) {
        case 'ArrowUp':
          e.preventDefault()
          if (currentIndex > 0) {
            onSelectNote(displayedNotes[currentIndex - 1].id)
          } else if (currentIndex === -1) {
            onSelectNote(displayedNotes[displayedNotes.length - 1].id)
          }
          break

        case 'ArrowDown':
          e.preventDefault()
          if (currentIndex < displayedNotes.length - 1) {
            onSelectNote(displayedNotes[currentIndex + 1].id)
          } else if (currentIndex === -1) {
            onSelectNote(displayedNotes[0].id)
          }
          break
      }
    }

    document.addEventListener('keydown', handleKeyDown)
    return () => document.removeEventListener('keydown', handleKeyDown)
  }, [displayedNotes, selectedNoteId])

  const handleCreateNote = () => {
    if (categoryId) {
      const id = createNote({
        title: '新笔记',
        content: '',
        categoryId
      })
      onSelectNote(id)
    }
  }

  return (
    <div className="flex flex-col h-full">
      <div className="py-0 px-3 h-9 border-b dark:border-gray-700 flex items-center gap-2">
        <div className="relative flex-1">
          <Search size={16} className="absolute left-2 top-1/2 transform -translate-y-1/2 text-gray-400" />
          <input
            ref={searchInputRef}
            type="text"
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            placeholder="搜索笔记..."
            className="w-full h-7 pl-8 pr-8 py-1 border rounded-md bg-transparent dark:border-gray-600 dark:bg-gray-800 focus:ring-1 focus:ring-blue-500 focus:border-transparent transition-all duration-200 text-sm"
          />
          {searchTerm && (
            <button 
              onClick={() => setSearchTerm('')}
              className="absolute right-2 top-1/2 transform -translate-y-1/2 text-gray-400 hover:text-gray-600 dark:hover:text-gray-300"
            >
              <X size={14} />
            </button>
          )}
        </div>
        
        {/* 高级搜索按钮 */}
        <AdvancedSearchDialog 
          onSelectNote={onSelectNote}
          trigger={
            <button 
              className="h-7 px-2 text-xs border rounded bg-transparent dark:border-gray-600 dark:bg-gray-800 hover:bg-gray-50 dark:hover:bg-gray-700 transition-colors flex items-center gap-1"
              title="高级搜索"
            >
              <Settings size={12} />
            </button>
          }
        />
        
        <select
          value={sortBy}
          onChange={(e) => setSortBy(e.target.value as any)}
          className="h-7 text-xs border rounded px-2 py-1 bg-transparent dark:border-gray-600 dark:bg-gray-800"
        >
          <option value="updated">最近更新</option>
          <option value="created">创建时间</option>
          <option value="title">标题</option>
        </select>
      </div>

      <div className="flex flex-wrap gap-2 p-3 border-b dark:border-gray-700 max-h-14 overflow-y-auto scrollbar-thin">
        <AnimatePresence>
          {tags.map(tag => (
            <motion.button
              key={tag.id}
              initial={{ scale: 0.8, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.8, opacity: 0 }}
              whileHover={{ scale: 1.05 }}
              whileTap={{ scale: 0.95 }}
              onClick={() => setSelectedTagId(
                selectedTagId === tag.id ? null : tag.id
              )}
              className={`inline-flex items-center px-2 py-1 rounded-full text-xs ${
                tag.color
              } ${
                selectedTagId === tag.id
                  ? 'ring-2 ring-offset-1 ring-blue-500 dark:ring-blue-400'
                  : ''
              }`}
            >
              <Tag size={10} className="mr-1" />
              {tag.name}
            </motion.button>
          ))}
        </AnimatePresence>
      </div>

      <div className="flex items-center justify-between px-3 py-2 border-b dark:border-gray-700">
        <div className="text-xs font-medium text-gray-500 dark:text-gray-400">
          {displayedNotes.length} 个笔记
        </div>
        <motion.button
          whileHover={{ scale: 1.02 }}
          whileTap={{ scale: 0.98 }}
          onClick={handleCreateNote}
          disabled={!categoryId}
          className="flex items-center justify-center px-3 py-1 bg-blue-500 text-white rounded-md hover:bg-blue-600 transition-colors disabled:opacity-50 disabled:cursor-not-allowed text-xs"
        >
          <Plus size={14} className="mr-1" />
          新建笔记
        </motion.button>
      </div>

      <div className="flex-1 overflow-auto">
        {displayedNotes.length === 0 ? (
          <div className="flex flex-col items-center justify-center h-full text-gray-500 dark:text-gray-400 p-4">
            <div className="text-5xl mb-4">📝</div>
            <p className="text-center">
              {searchTerm 
                ? '没有找到匹配的笔记' 
                : categoryId 
                  ? '此分类下还没有笔记' 
                  : '开始创建你的第一个笔记吧'}
            </p>
          </div>
        ) : (
        <AnimatePresence>
          {displayedNotes.map((note, index) => (
            <motion.div
              key={note.id}
              initial={{ x: -20, opacity: 0 }}
              animate={{ x: 0, opacity: 1 }}
              exit={{ x: -20, opacity: 0 }}
              transition={{ delay: index * 0.05 }}
              className={`group relative w-full p-4 text-left border-b dark:border-gray-700 hover:bg-gray-50 dark:hover:bg-gray-700 transition-colors cursor-pointer ${
                selectedNoteId === note.id ? 'bg-blue-50 dark:bg-gray-700 border-l-4 border-l-blue-500' : ''
              }`}
              onClick={() => onSelectNote(note.id)}
            >
                <div className="flex justify-between items-start">
                  <h3 className="font-medium truncate pr-6">{note.title || '无标题'}</h3>
                  <div className="absolute right-2 top-4 hidden group-hover:flex items-center space-x-1">
                    <button
                      onClick={async (e) => {
                        e.stopPropagation();
                        const confirmed = await showConfirm({
                          title: '确认删除',
                          description: `确定要删除笔记 "${note.title || '无标题'}" 吗？`
                        });
                        if (confirmed) {
                          await deleteNote(note.id);
                        }
                      }}
                      className="p-1 rounded-full hover:bg-red-100 dark:hover:bg-red-900 text-gray-400 hover:text-red-500 transition-colors"
                      title="删除笔记"
                    >
                      <X size={14} />
                    </button>
                  </div>
                </div>
                <p className="text-sm text-gray-500 dark:text-gray-400 mt-1 truncate line-clamp-2">
                  {note.content || '空笔记'}
              </p>
                <div className="flex items-center justify-between mt-2 text-xs text-gray-500 dark:text-gray-400">
                  <div className="flex items-center">
                    <Clock size={12} className="mr-1" />
                    {formatDate(note.updatedAt)}
                  </div>
                  <div className="flex flex-wrap gap-1">
                <AnimatePresence>
                      {getNoteTags(note.id).slice(0, 3).map(tag => (
                    <motion.span
                      key={tag.id}
                      initial={{ scale: 0.8, opacity: 0 }}
                      animate={{ scale: 1, opacity: 1 }}
                      exit={{ scale: 0.8, opacity: 0 }}
                          className={`inline-flex items-center px-1.5 py-0.5 rounded-full text-xs ${tag.color}`}
                    >
                          <span className="w-1 h-1 rounded-full bg-current mr-1"></span>
                      {tag.name}
                    </motion.span>
                  ))}
                </AnimatePresence>
                  </div>
              </div>
            </motion.div>
          ))}
        </AnimatePresence>
        )}
      </div>
    </div>
  )
} 