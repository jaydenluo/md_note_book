import { useState } from 'react'
import type { FC } from 'react'
import { useCategories } from '@stores/categoryStore'
import { useNotes } from '@stores/noteStore'
import { motion, AnimatePresence } from 'framer-motion'
import { Settings, Moon, Sun, Cloud } from 'lucide-react'
import { useTheme } from '@utils/theme'

// 自定义Folder图标
const FolderIcon = ({ className }: { className?: string }) => (
  <svg
    xmlns="http://www.w3.org/2000/svg"
    width="16"
    height="16"
    viewBox="0 0 24 24"
    fill="none"
    stroke="currentColor"
    strokeWidth="2"
    strokeLinecap="round"
    strokeLinejoin="round"
    className={className}
  >
    <path d="M4 20h16a2 2 0 0 0 2-2V8a2 2 0 0 0-2-2h-7.93a2 2 0 0 1-1.66-.9l-.82-1.2A2 2 0 0 0 7.93 3H4a2 2 0 0 0-2 2v13c0 1.1.9 2 2 2Z" />
  </svg>
);

// 自定义FolderPlus图标
const FolderPlusIcon = ({ size = 16 }: { size?: number }) => (
  <svg
    xmlns="http://www.w3.org/2000/svg"
    width={size}
    height={size}
    viewBox="0 0 24 24"
    fill="none"
    stroke="currentColor"
    strokeWidth="2"
    strokeLinecap="round"
    strokeLinejoin="round"
  >
    <path d="M4 20h16a2 2 0 0 0 2-2V8a2 2 0 0 0-2-2h-7.93a2 2 0 0 1-1.66-.9l-.82-1.2A2 2 0 0 0 7.93 3H4a2 2 0 0 0-2 2v13c0 1.1.9 2 2 2Z" />
    <line x1="12" y1="10" x2="12" y2="16" />
    <line x1="9" y1="13" x2="15" y2="13" />
  </svg>
);

interface SidebarProps {
  selectedCategoryId: string | null
  onSelectCategory: (id: string) => void
}

export const Sidebar: FC<SidebarProps> = ({
  selectedCategoryId,
  onSelectCategory
}) => {
  const [isCreating, setIsCreating] = useState(false)
  const [newCategoryName, setNewCategoryName] = useState('')
  
  const categories = useCategories(state => state.categories)
  const createCategory = useCategories(state => state.createCategory)
  const deleteCategory = useCategories(state => state.deleteCategory)
  const notes = useNotes(state => state.notes)
  const { isDark, toggleTheme } = useTheme()

  const handleCreateCategory = () => {
    if (newCategoryName.trim()) {
      const id = createCategory({ name: newCategoryName.trim() })
      setNewCategoryName('')
      setIsCreating(false)
    onSelectCategory(id)
    }
  }

  const handleDeleteCategory = (id: string, e: React.MouseEvent) => {
    e.stopPropagation()
    if (confirm('确定要删除这个分类吗？相关笔记也会被删除。')) {
      deleteCategory(id)
    }
  }

  const getCategoryNoteCount = (categoryId: string) => {
    return notes.filter(note => note.categoryId === categoryId).length
  }

  return (
    <div className="w-64 h-full flex flex-col bg-gray-50 dark:bg-gray-800 border-r dark:border-gray-700">
      <div className="p-4 border-b dark:border-gray-700">
        <h1 className="text-xl font-bold text-center">笔记本</h1>
      </div>
      
      <div className="flex-1 overflow-auto p-2">
        <div className="mb-4">
          <div className="flex items-center justify-between px-2 py-1 text-sm font-medium text-gray-600 dark:text-gray-400">
            <span>分类</span>
        <motion.button
              whileHover={{ scale: 1.1 }}
              whileTap={{ scale: 0.95 }}
              onClick={() => setIsCreating(true)}
              className="p-1 rounded-full hover:bg-gray-200 dark:hover:bg-gray-700"
              title="新建分类"
        >
              <FolderPlusIcon />
        </motion.button>
      </div>

        <AnimatePresence>
            {isCreating && (
              <motion.div
                initial={{ opacity: 0, height: 0 }}
                animate={{ opacity: 1, height: 'auto' }}
                exit={{ opacity: 0, height: 0 }}
                className="mt-2 p-2 bg-white dark:bg-gray-700 rounded-md shadow-sm"
              >
                <input
                  type="text"
                  value={newCategoryName}
                  onChange={(e) => setNewCategoryName(e.target.value)}
                  placeholder="分类名称"
                  className="w-full px-3 py-1 mb-2 border rounded-md dark:border-gray-600 dark:bg-gray-800 focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                  autoFocus
                />
                <div className="flex justify-end space-x-2">
                  <button
                    onClick={() => setIsCreating(false)}
                    className="px-3 py-1 text-sm rounded-md hover:bg-gray-100 dark:hover:bg-gray-600"
                  >
                    取消
                  </button>
                  <button
                    onClick={handleCreateCategory}
                    disabled={!newCategoryName.trim()}
                    className="px-3 py-1 text-sm bg-blue-500 text-white rounded-md hover:bg-blue-600 disabled:opacity-50 disabled:cursor-not-allowed"
                  >
                    创建
                  </button>
            </div>
              </motion.div>
            )}
          </AnimatePresence>

          <div className="mt-2 space-y-1">
            <AnimatePresence>
              {categories.map(category => (
            <motion.button
              key={category.id}
                  initial={{ opacity: 0, y: -10 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, y: -10 }}
                  whileHover={{ x: 5 }}
              onClick={() => onSelectCategory(category.id)}
                  className={`w-full flex items-center justify-between px-3 py-2 rounded-md ${
                    selectedCategoryId === category.id
                      ? 'bg-blue-100 dark:bg-blue-900 text-blue-700 dark:text-blue-300'
                      : 'hover:bg-gray-200 dark:hover:bg-gray-700'
              }`}
            >
                  <div className="flex items-center">
                    <FolderIcon className="mr-2" />
                    <span className="truncate">{category.name}</span>
                  </div>
                  <div className="flex items-center space-x-1">
                    <span className="text-xs px-1.5 py-0.5 rounded-full bg-gray-200 dark:bg-gray-700">
                      {getCategoryNoteCount(category.id)}
                </span>
                    {selectedCategoryId === category.id && (
                      <button
                        onClick={(e) => handleDeleteCategory(category.id, e)}
                        className="p-1 rounded-full hover:bg-red-100 dark:hover:bg-red-900 hover:text-red-500 dark:hover:text-red-400"
                      >
                        <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M6 18L18 6M6 6l12 12" />
                        </svg>
                      </button>
                    )}
              </div>
            </motion.button>
          ))}
        </AnimatePresence>
            
            {categories.length === 0 && (
              <div className="text-center py-4 text-gray-500 dark:text-gray-400">
                <p>暂无分类</p>
                <p className="text-sm mt-1">点击上方"+"按钮创建</p>
              </div>
            )}
          </div>
        </div>
      </div>
      
      <div className="p-3 border-t dark:border-gray-700">
        <div className="flex items-center justify-between">
          <motion.button
            whileHover={{ scale: 1.1 }}
            whileTap={{ scale: 0.95 }}
            onClick={toggleTheme}
            className="p-2 rounded-md hover:bg-gray-200 dark:hover:bg-gray-700"
            title={isDark ? '切换到亮色模式' : '切换到暗色模式'}
          >
            {isDark ? <Sun size={20} /> : <Moon size={20} />}
          </motion.button>
          
          <motion.button
            whileHover={{ scale: 1.1 }}
            whileTap={{ scale: 0.95 }}
            className="p-2 rounded-md hover:bg-gray-200 dark:hover:bg-gray-700"
            title="云同步"
          >
            <Cloud size={20} />
          </motion.button>
          
          <motion.button
            whileHover={{ scale: 1.1 }}
            whileTap={{ scale: 0.95 }}
            className="p-2 rounded-md hover:bg-gray-200 dark:hover:bg-gray-700"
            title="设置"
          >
            <Settings size={20} />
          </motion.button>
        </div>
      </div>
    </div>
  )
} 