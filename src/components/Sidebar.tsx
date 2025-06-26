import { useState, useRef, useEffect } from 'react'
import type { FC } from 'react'
import { useCategories } from '@stores/categoryStore'
import { useNotes } from '@stores/noteStore'
import { motion, AnimatePresence } from 'framer-motion'
import { useTheme } from '@utils/theme'
import { createContextMenu } from '@utils/contextMenu'
import { useAlertDialog } from '@/components/ui/alert-dialog'
import { FolderIcon, FolderPlusIcon } from '@/components/icons'
import { SettingsDialog } from '@/components/SettingsDialog'

// 自定义图标组件
const SunIcon = ({ size = 20 }: { size?: number }) => (
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
    <circle cx="12" cy="12" r="4" />
    <path d="M12 2v2" />
    <path d="M12 20v2" />
    <path d="m4.93 4.93 1.41 1.41" />
    <path d="m17.66 17.66 1.41 1.41" />
    <path d="M2 12h2" />
    <path d="M20 12h2" />
    <path d="m6.34 17.66-1.41 1.41" />
    <path d="m19.07 4.93-1.41 1.41" />
  </svg>
);

const MoonIcon = ({ size = 20 }: { size?: number }) => (
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
    <path d="M12 3a6 6 0 0 0 9 9 9 9 0 1 1-9-9Z" />
  </svg>
);

const CloudIcon = ({ size = 20 }: { size?: number }) => (
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
    <path d="M17.5 19H9a7 7 0 1 1 6.71-9h1.79a4.5 4.5 0 1 1 0 9Z" />
  </svg>
);

const SettingsIcon = ({ size = 20 }: { size?: number }) => (
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
    <path d="M12.22 2h-.44a2 2 0 0 0-2 2v.18a2 2 0 0 1-1 1.73l-.43.25a2 2 0 0 1-2 0l-.15-.08a2 2 0 0 0-2.73.73l-.22.38a2 2 0 0 0 .73 2.73l.15.1a2 2 0 0 1 1 1.72v.51a2 2 0 0 1-1 1.74l-.15.09a2 2 0 0 0-.73 2.73l.22.38a2 2 0 0 0 2.73.73l.15-.08a2 2 0 0 1 2 0l.43.25a2 2 0 0 1 1 1.73V20a2 2 0 0 0 2 2h.44a2 2 0 0 0 2-2v-.18a2 2 0 0 1 1-1.73l.43-.25a2 2 0 0 1 2 0l.15.08a2 2 0 0 0 2.73-.73l.22-.39a2 2 0 0 0-.73-2.73l-.15-.08a2 2 0 0 1-1-1.74v-.5a2 2 0 0 1 1-1.74l.15-.09a2 2 0 0 0 .73-2.73l-.22-.38a2 2 0 0 0-2.73-.73l-.15.08a2 2 0 0 1-2 0l-.43-.25a2 2 0 0 1-1-1.73V4a2 2 0 0 0-2-2z" />
    <circle cx="12" cy="12" r="3" />
  </svg>
);

interface SidebarProps {
  selectedCategoryId: string | null
  onSelectCategory: (id: string | null) => void
}

export const Sidebar: FC<SidebarProps> = ({
  selectedCategoryId,
  onSelectCategory
}) => {
  const [isCreating, setIsCreating] = useState(false)
  const [newCategoryName, setNewCategoryName] = useState('')
  const [editingCategoryId, setEditingCategoryId] = useState<string | null>(null)
  const [editingName, setEditingName] = useState('')
  const [isSettingsOpen, setIsSettingsOpen] = useState(false)
  const newCategoryInputRef = useRef<HTMLInputElement>(null)
  const editCategoryInputRef = useRef<HTMLInputElement>(null)
  
  const categories = useCategories(state => state.categories)
  const createCategory = useCategories(state => state.createCategory)
  const deleteCategory = useCategories(state => state.deleteCategory)
  const updateCategory = useCategories(state => state.updateCategory)
  const notes = useNotes(state => state.notes)
  const { isDark, toggleTheme } = useTheme()
  const { showConfirm } = useAlertDialog()

  // 自动聚焦新分类输入框
  useEffect(() => {
    if (isCreating && newCategoryInputRef.current) {
      newCategoryInputRef.current.focus()
    }
  }, [isCreating])

  // 自动聚焦编辑分类输入框
  useEffect(() => {
    if (editingCategoryId && editCategoryInputRef.current) {
      editCategoryInputRef.current.focus()
      editCategoryInputRef.current.select()
    }
  }, [editingCategoryId])

  // 创建分类
  const handleCreateCategory = () => {
    if (newCategoryName.trim()) {
      const id = createCategory({ name: newCategoryName.trim() })
      setNewCategoryName('')
      setIsCreating(false)
      onSelectCategory(id)
    }
  }

  // 直接创建默认分类并进入编辑状态
  const handleQuickCreateCategory = () => {
    const id = createCategory({ name: '默认分类' })
    onSelectCategory(id)
    setEditingCategoryId(id)
    setEditingName('默认分类')
  }

  // 处理分类名称编辑
  const handleStartEditingCategory = (id: string, name: string, e: React.MouseEvent) => {
    e.stopPropagation()
    setEditingCategoryId(id)
    setEditingName(name)
  }

  // 保存分类名称
  const handleSaveCategoryName = async () => {
    if (editingCategoryId && editingName.trim()) {
      await updateCategory(editingCategoryId, { name: editingName.trim() })
      setEditingCategoryId(null)
      setEditingName('')
    } else if (editingCategoryId) {
      // 如果名称为空，恢复原名称
      setEditingCategoryId(null)
      setEditingName('')
    }
  }

  // 处理按键事件
  const handleEditKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter') {
      handleSaveCategoryName()
    } else if (e.key === 'Escape') {
      setEditingCategoryId(null)
      setEditingName('')
    }
  }

  // 删除分类
  const handleDeleteCategory = async (id: string, e: React.MouseEvent) => {
    e.stopPropagation()
    const confirmed = await showConfirm({
      title: '确认删除',
      description: '确定要删除这个分类吗？相关笔记也会被删除。'
    });
    if (confirmed) {
      deleteCategory(id)
    }
  }

  // 处理点击分类
  const handleCategoryClick = (categoryId: string) => {
    // 直接设置分类ID
    onSelectCategory(categoryId);
  }

  // 获取分类下的笔记数量
  const getCategoryNoteCount = (categoryId: string) => {
    return notes.filter(note => note.categoryId === categoryId).length
  }
  
  // 打开设置对话框
  const onOpenSettings = () => {
    setIsSettingsOpen(true)
  }

  // 处理分类右键菜单
  const handleCategoryContextMenu = (e: React.MouseEvent, categoryId: string, categoryName: string) => {
    e.preventDefault();
    
    const x = e.clientX;
    const y = e.clientY;
    
    createContextMenu(x, y, [
      {
        label: '新建笔记',
        onClick: () => {
          // 选中分类并创建笔记
          onSelectCategory(categoryId);
          // 这里需要调用createNote，但我们没有直接访问权限
          console.log('在分类中创建笔记:', categoryId);
        }
      },
      {
        label: '重命名',
        onClick: () => {
          // 开始编辑分类名称
          setEditingCategoryId(categoryId);
          setEditingName(categoryName);
        }
      },
      {
        label: '删除',
        onClick: async () => {
          const confirmed = await showConfirm({
            title: '确认删除',
            description: `确定要删除分类 "${categoryName}" 吗？`
          });
          if (confirmed) {
            deleteCategory(categoryId);
          }
        }
      }
    ]);
  };

  return (
    <div className="h-full flex flex-col bg-gray-50 dark:bg-gray-800">
      <div className="flex-1 overflow-auto p-2">
        <div className="mb-4">
          <div className="flex items-center justify-between px-2 py-1 text-sm font-medium text-gray-600 dark:text-gray-400">
            <span>分类</span>
            <motion.button
              whileHover={{ scale: 1.1 }}
              whileTap={{ scale: 0.95 }}
              onClick={handleQuickCreateCategory}
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
                  ref={newCategoryInputRef}
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
                <motion.div
                  key={category.id}
                  initial={{ opacity: 0, y: -10 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, y: -10 }}
                  className={`w-full rounded-md ${
                    selectedCategoryId === category.id
                      ? 'bg-blue-100 dark:bg-blue-900 text-blue-700 dark:text-blue-300'
                      : 'hover:bg-gray-200 dark:hover:bg-gray-700'
                  }`}
                >
                  {editingCategoryId === category.id ? (
                    <div className="flex items-center px-3 py-2">
                      <FolderIcon className="mr-2 flex-shrink-0" />
                      <input
                        ref={editCategoryInputRef}
                        type="text"
                        value={editingName}
                        onChange={(e) => setEditingName(e.target.value)}
                        onBlur={handleSaveCategoryName}
                        onKeyDown={handleEditKeyDown}
                        className="w-full px-1 py-0 bg-transparent border-b border-gray-400 dark:border-gray-500 focus:outline-none focus:border-blue-500"
                        autoFocus
                      />
                    </div>
                  ) : (
                    <div
                      className="flex items-center justify-between px-3 py-2 cursor-pointer"
                      onClick={() => handleCategoryClick(category.id)}
                      onDoubleClick={(e) => handleStartEditingCategory(category.id, category.name, e)}
                      onContextMenu={(e) => handleCategoryContextMenu(e, category.id, category.name)}
                    >
                      <div className="flex items-center min-w-0 flex-1">
                        <FolderIcon className="mr-2 flex-shrink-0" />
                        <span className="truncate max-w-[150px] inline-block" title={category.name}>{category.name}</span>
                      </div>
                      <div className="flex items-center space-x-1">
                        <span className="text-xs px-1.5 py-0.5 rounded-full bg-gray-200 dark:bg-gray-700">
                          {getCategoryNoteCount(category.id)}
                        </span>
                        {selectedCategoryId === category.id && (
                          <button
                            onClick={(e) => {
                              e.stopPropagation();
                              handleDeleteCategory(category.id, e);
                            }}
                            className="p-1 rounded-full hover:bg-red-100 dark:hover:bg-red-900 hover:text-red-500 dark:hover:text-red-400"
                          >
                            <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M6 18L18 6M6 6l12 12" />
                            </svg>
                          </button>
                        )}
                      </div>
                    </div>
                  )}
                </motion.div>
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
      
      <div className="p-3">
        <div className="flex items-center justify-between">
          <motion.button
            whileHover={{ scale: 1.1 }}
            whileTap={{ scale: 0.95 }}
            onClick={toggleTheme}
            className="p-2 rounded-md hover:bg-gray-200 dark:hover:bg-gray-700"
            title={isDark ? '切换到亮色模式' : '切换到暗色模式'}
          >
            {isDark ? <SunIcon size={20} /> : <MoonIcon size={20} />}
          </motion.button>
          
          <motion.button
            whileHover={{ scale: 1.1 }}
            whileTap={{ scale: 0.95 }}
            className="p-2 rounded-md hover:bg-gray-200 dark:hover:bg-gray-700"
            title="云同步"
          >
            <CloudIcon size={20} />
          </motion.button>
          
          <motion.button
            whileHover={{ scale: 1.1 }}
            whileTap={{ scale: 0.95 }}
            className="p-2 rounded-md hover:bg-gray-200 dark:hover:bg-gray-700"
            title="设置"
            onClick={onOpenSettings}
          >
            <SettingsIcon size={20} />
          </motion.button>
        </div>
      </div>
      
      {/* 设置对话框 */}
      <SettingsDialog 
        open={isSettingsOpen}
        onOpenChange={setIsSettingsOpen}
      />
    </div>
  )
}