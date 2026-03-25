import { useState, useRef, useEffect } from 'react'
import type { FC } from 'react'
import { useCategories } from '@stores/categoryStore'
import { useNotes } from '@stores/noteStore'
import { motion, AnimatePresence } from 'framer-motion'
import { useAlertDialog } from '@/components/ui/alert-dialog'
import { FolderIcon, FolderPlusIcon } from '@/components/icons'
import { Settings, Sun, Moon, Cloud } from 'lucide-react'
import { SettingsDialog } from './SettingsDialog'
import { CloudSyncDialog } from './CloudSyncDialog'
import { GitSyncDialog } from './GitSyncDialog'
import { useTheme } from '@utils/theme'

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
  const [settingsOpen, setSettingsOpen] = useState(false)
  const [cloudSyncOpen, setCloudSyncOpen] = useState(false)
  const [gitSyncOpen, setGitSyncOpen] = useState(false)
  const { isDark, toggleTheme } = useTheme()
  const newCategoryInputRef = useRef<HTMLInputElement>(null)
  const editCategoryInputRef = useRef<HTMLInputElement>(null)
  
  const categories = useCategories(state => state.categories)
  const createCategory = useCategories(state => state.createCategory)
  const deleteCategory = useCategories(state => state.deleteCategory)
  const updateCategory = useCategories(state => state.updateCategory)
  const notes = useNotes(state => state.notes)
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
      await deleteCategory(id)
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
  
  /* handleCategoryContextMenu 已经不再使用，一级菜单右键功能已取消 */
  
  // 处理同步
  const handleSync = async () => {
    try {
      // 获取当前最新的数据
      const currentCategories = useCategories.getState().categories;
      const currentNotes = useNotes.getState().notes;
      
      const service = new CloudSyncService();
      const isConnected = await service.testConnection();
      
      if (!isConnected) {
        console.error('云同步失败: 无法连接到服务器');
        return;
      }

      console.log('正在执行云同步...');
      const result = await service.sync({
        categories: currentCategories,
        notes: currentNotes
      });

      // 如果远端数据更新，同步到本地 store
      if (result.notes.length > 0 || result.categories.length > 0) {
        useCategories.getState().setCategories(result.categories);
        useNotes.getState().setNotes(result.notes);
        console.log('云同步完成：已更新本地数据');
      }
    } catch (error) {
      console.error('同步失败:', error);
    }
  }

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
                  className={`w-full group rounded-md ${
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
                    >
                      <div className="flex items-center min-w-0 flex-1">
                        <FolderIcon className="mr-2 flex-shrink-0" />
                        <span className="truncate max-w-[150px] inline-block" title={category.name}>{category.name}</span>
                      </div>
                      <div className="flex items-center space-x-1 min-w-[24px] justify-end">
                        <span className="text-xs px-1.5 py-0.5 rounded-full bg-gray-200 dark:bg-gray-700 group-hover:hidden">
                          {getCategoryNoteCount(category.id)}
                        </span>
                        <div className="hidden group-hover:flex items-center">
                          <button
                            onClick={async (e) => {
                              await handleDeleteCategory(category.id, e)
                            }}
                            className="p-1 rounded-full hover:bg-red-100 dark:hover:bg-red-900 hover:text-red-500 dark:hover:text-red-400 transition-colors"
                            title="删除分类"
                          >
                            <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M6 18L18 6M6 6l12 12" />
                            </svg>
                          </button>
                        </div>
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
      
      {/* 底部功能按钮 */}
      <div className="p-2 border-t border-gray-200 dark:border-gray-700 flex items-center justify-around">
        {/* Git 同步按钮 */}
        <button
          onClick={() => setGitSyncOpen(true)}
          className="p-2 text-gray-600 dark:text-gray-400 hover:bg-gray-200 dark:hover:bg-gray-700 rounded-md transition-colors"
          title="Git 同步"
        >
          <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="lucide lucide-github"><path d="M15 22v-4a4.8 4.8 0 0 0-1-3.5c3 0 6-2 6-5.5.08-1.25-.27-2.48-1-3.5.28-1.15.28-2.35 0-3.5 0 0-1 0-3 1.5-2.64-.5-5.36-.5-8 0C6 2 5 2 5 2c-.28 1.15-.28 2.35 0 3.5-.73 1.02-1.08 2.25-1 3.5 0 3.5 3 5.5 6 5.5-.39.49-.68 1.05-.85 1.65-.17.6-.22 1.23-.15 1.85v4"/><path d="M9 18c-4.51 2-5-2-7-2"/></svg>
        </button>

        {/* 云同步按钮 */}
        <button
          onClick={() => setCloudSyncOpen(true)}
          className="p-2 text-gray-600 dark:text-gray-400 hover:bg-gray-200 dark:hover:bg-gray-700 rounded-md transition-colors"
          title="WebDAV 同步"
        >
          <Cloud className="w-5 h-5" />
        </button>

        {/* 主题切换按钮 */}
        <button
          onClick={toggleTheme}
          className="p-2 text-gray-600 dark:text-gray-400 hover:bg-gray-200 dark:hover:bg-gray-700 rounded-md transition-colors"
          title={isDark ? "切换到浅色模式" : "切换到深色模式"}
        >
          {isDark ? (
            <Sun className="w-5 h-5" />
          ) : (
            <Moon className="w-5 h-5" />
          )}
        </button>

        {/* 设置按钮 */}
        <button
          onClick={() => setSettingsOpen(true)}
          className="p-2 text-gray-600 dark:text-gray-400 hover:bg-gray-200 dark:hover:bg-gray-700 rounded-md transition-colors"
          title="设置"
        >
          <Settings className="w-5 h-5" />
        </button>
      </div>

      <SettingsDialog open={settingsOpen} onOpenChange={setSettingsOpen} />
      <CloudSyncDialog 
        isOpen={cloudSyncOpen} 
        onClose={() => setCloudSyncOpen(false)} 
        onSync={handleSync}
      />
      <GitSyncDialog
        isOpen={gitSyncOpen}
        onClose={() => setGitSyncOpen(false)}
      />
    </div>
  )
}