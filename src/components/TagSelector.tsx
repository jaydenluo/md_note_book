import { useState } from 'react'
import { useTags } from '@stores/tagStore'
import { motion, AnimatePresence } from 'framer-motion'

interface TagSelectorProps {
  noteId: string
  onClose?: () => void
}

const TagSelector = ({
  noteId,
  onClose
}: TagSelectorProps) => {
  const [newTagName, setNewTagName] = useState('')
  const [newTagColor, setNewTagColor] = useState('bg-blue-100 text-blue-800 dark:bg-blue-900 dark:text-blue-300')
  
  const tags = useTags(state => state.tags)
  const noteTags = useTags(state => state.getNoteTags(noteId))
  const addTag = useTags(state => state.addTag)
  const addNoteTag = useTags(state => state.addNoteTag)
  const removeNoteTag = useTags(state => state.removeNoteTag)
  
  const tagColors = [
    'bg-blue-100 text-blue-800 dark:bg-blue-900 dark:text-blue-300',
    'bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-300',
    'bg-red-100 text-red-800 dark:bg-red-900 dark:text-red-300',
    'bg-yellow-100 text-yellow-800 dark:bg-yellow-900 dark:text-yellow-300',
    'bg-purple-100 text-purple-800 dark:bg-purple-900 dark:text-purple-300',
    'bg-pink-100 text-pink-800 dark:bg-pink-900 dark:text-pink-300',
    'bg-indigo-100 text-indigo-800 dark:bg-indigo-900 dark:text-indigo-300',
    'bg-gray-100 text-gray-800 dark:bg-gray-900 dark:text-gray-300',
  ]
  
  const handleCreateTag = () => {
    if (newTagName.trim()) {
      const tagId = addTag({
        name: newTagName.trim(),
        color: newTagColor
      })
      addNoteTag(noteId, tagId)
      setNewTagName('')
    }
  }
  
  const toggleNoteTag = (tagId: string) => {
    const hasTag = noteTags.some(tag => tag.id === tagId)
    if (hasTag) {
      removeNoteTag(noteId, tagId)
    } else {
      addNoteTag(noteId, tagId)
    }
  }

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between mb-2">
        <h3 className="font-medium">标签管理</h3>
        {onClose && (
          <button 
            onClick={onClose}
            className="p-1 rounded-full hover:bg-gray-200 dark:hover:bg-gray-700"
          >
            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        )}
      </div>
      
      <div className="flex gap-2 flex-wrap">
      <AnimatePresence>
        {tags.map(tag => (
          <motion.button
            key={tag.id}
            initial={{ scale: 0.8, opacity: 0 }}
            animate={{ scale: 1, opacity: 1 }}
            exit={{ scale: 0.8, opacity: 0 }}
            whileHover={{ scale: 1.05 }}
            whileTap={{ scale: 0.95 }}
              onClick={() => toggleNoteTag(tag.id)}
            className={`inline-flex items-center px-2 py-1 rounded-full text-sm ${
              tag.color
            } ${
                noteTags.some(t => t.id === tag.id)
                  ? 'ring-2 ring-offset-1 ring-blue-500 dark:ring-blue-400'
                : ''
            }`}
          >
              <svg className="w-3 h-3 mr-1" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M7 7h.01M7 3h5c.512 0 1.024.195 1.414.586l7 7a2 2 0 010 2.828l-7 7a2 2 0 01-2.828 0l-7-7A1.994 1.994 0 013 12V7a4 4 0 014-4z" />
              </svg>
            {tag.name}
          </motion.button>
        ))}
      </AnimatePresence>
      </div>
      
      <div className="pt-3 border-t dark:border-gray-700">
        <h4 className="text-sm font-medium mb-2">创建新标签</h4>
        <div className="flex items-center gap-2">
          <input
            type="text"
            value={newTagName}
            onChange={(e) => setNewTagName(e.target.value)}
            placeholder="标签名称"
            className="flex-1 px-3 py-1 border rounded-md dark:border-gray-600 dark:bg-gray-700 focus:ring-2 focus:ring-blue-500 focus:border-transparent"
          />
          <div className="flex gap-1">
            {tagColors.map((color, index) => (
              <button
                key={index}
                onClick={() => setNewTagColor(color)}
                className={`w-6 h-6 rounded-full ${color.split(' ')[0]} ${
                  newTagColor === color ? 'ring-2 ring-offset-1 ring-blue-500' : ''
                }`}
              />
            ))}
          </div>
          <button
            onClick={handleCreateTag}
            disabled={!newTagName.trim()}
            className="p-2 bg-blue-500 text-white rounded-md hover:bg-blue-600 disabled:opacity-50 disabled:cursor-not-allowed"
          >
            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 4v16m8-8H4" />
            </svg>
          </button>
        </div>
      </div>
    </div>
  )
}

export default TagSelector 