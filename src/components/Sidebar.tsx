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
import { useUiModeStore } from '@stores/uiModeStore'
import { CloudSyncService } from '@services/cloudSync'

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
  const mode = useUiModeStore(state => state.mode)
  const setMode = useUiModeStore(state => state.setMode)
  const scopedNotes = selectedCategoryId
    ? notes.filter(note => note.categoryId === selectedCategoryId)
    : notes
  const scopedDocumentCount = scopedNotes.filter(note => note.type !== 'folder' && note.type !== 'reminder-card').length
  const scopedReminderCount = scopedNotes.filter(note => note.type === 'reminder-card').length

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
    const categoryNotes = notes.filter(note => note.categoryId === categoryId)
    if (mode === 'reminder') {
      return categoryNotes.filter(note => note.type === 'reminder-card').length
    }
    return categoryNotes.filter(note => note.type !== 'reminder-card').length
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
    <div className="flex h-full flex-col bg-transparent">
      <div className="flex-1 overflow-auto px-3 pb-3 pt-3">
        <div className="mb-4">
          <div className="mb-4 grid grid-cols-2 gap-1 rounded-2xl border border-slate-200/70 bg-white/70 p-1 backdrop-blur dark:border-white/10 dark:bg-slate-900/60">
            <button
              type="button"
              onClick={() => setMode('document')}
              className={`rounded-2xl px-3 py-2.5 text-sm font-medium transition-all ${
                mode === 'document'
                  ? 'bg-slate-950 text-white shadow-sm dark:bg-teal-500 dark:text-slate-950'
                  : 'text-slate-500 hover:text-slate-700 dark:text-slate-400 dark:hover:text-slate-200'
              }`}
            >
              文档
            </button>
            <button
              type="button"
              onClick={() => setMode('reminder')}
              className={`rounded-2xl px-3 py-2.5 text-sm font-medium transition-all ${
                mode === 'reminder'
                  ? 'bg-slate-950 text-white shadow-sm dark:bg-teal-500 dark:text-slate-950'
                  : 'text-slate-500 hover:text-slate-700 dark:text-slate-400 dark:hover:text-slate-200'
              }`}
            >
              提醒
            </button>
          </div>

          <div className="flex items-center justify-between px-2 py-1 text-sm font-medium text-slate-600 dark:text-slate-400">
            <span>分类</span>
            <motion.button
              whileHover={{ scale: 1.1 }}
              whileTap={{ scale: 0.95 }}
              onClick={handleQuickCreateCategory}
              className="rounded-full border border-slate-200/70 bg-white/80 p-1.5 text-slate-600 shadow-sm transition-all hover:-translate-y-0.5 hover:bg-white dark:border-white/10 dark:bg-slate-900/70 dark:text-slate-300 dark:hover:bg-slate-900"
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
                className="mt-2 rounded-2xl border border-slate-200/70 bg-white/80 p-3 shadow-sm dark:border-white/10 dark:bg-slate-900/70"
              >
                <input
                  ref={newCategoryInputRef}
                  type="text"
                  value={newCategoryName}
                  onChange={(e) => setNewCategoryName(e.target.value)}
                  placeholder="分类名称"
                  className="mb-2 w-full rounded-xl border border-slate-200 bg-white px-3 py-2 text-sm text-slate-700 outline-none transition-all focus:border-teal-300 focus:ring-2 focus:ring-teal-500/15 dark:border-white/10 dark:bg-slate-950 dark:text-slate-100 dark:focus:border-teal-400/40"
                  autoFocus
                />
                <div className="flex justify-end space-x-2">
                  <button
                    onClick={() => setIsCreating(false)}
                    className="rounded-xl px-3 py-2 text-sm text-slate-600 transition-colors hover:bg-slate-100 dark:text-slate-300 dark:hover:bg-slate-800"
                  >
                    取消
                  </button>
                  <button
                    onClick={handleCreateCategory}
                    disabled={!newCategoryName.trim()}
                    className="rounded-xl bg-slate-950 px-3 py-2 text-sm text-white transition-all hover:bg-slate-800 disabled:cursor-not-allowed disabled:opacity-50 dark:bg-teal-500 dark:text-slate-950 dark:hover:bg-teal-400"
                  >
                    创建
                  </button>
                </div>
              </motion.div>
            )}
          </AnimatePresence>

          <div className="mt-2 space-y-2">
            <AnimatePresence>
              {categories.map(category => (
                <motion.div
                  key={category.id}
                  initial={{ opacity: 0, y: -10 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, y: -10 }}
                  className={`group w-full overflow-hidden rounded-[22px] border transition-all ${
                    selectedCategoryId === category.id
                      ? 'border-teal-300 bg-teal-50/80 text-teal-800 shadow-sm shadow-teal-500/5 dark:border-teal-400/30 dark:bg-teal-500/10 dark:text-teal-100'
                      : 'border-transparent bg-white/55 hover:border-slate-200/70 hover:bg-white/85 dark:bg-slate-900/30 dark:hover:border-white/10 dark:hover:bg-slate-900/70'
                  }`}
                >
                  {editingCategoryId === category.id ? (
                    <div className="flex items-center px-3 py-3">
                      <FolderIcon className="mr-2 flex-shrink-0 text-teal-600 dark:text-teal-200" />
                      <input
                        ref={editCategoryInputRef}
                        type="text"
                        value={editingName}
                        onChange={(e) => setEditingName(e.target.value)}
                        onBlur={handleSaveCategoryName}
                        onKeyDown={handleEditKeyDown}
                        className="w-full border-b border-slate-300 bg-transparent px-1 py-0 text-sm focus:border-teal-400 focus:outline-none dark:border-slate-600"
                        autoFocus
                      />
                    </div>
                  ) : (
                    <div
                      className="flex cursor-pointer items-center justify-between px-3 py-3"
                      onClick={() => handleCategoryClick(category.id)}
                      onDoubleClick={(e) => handleStartEditingCategory(category.id, category.name, e)}
                    >
                      <div className="flex items-center min-w-0 flex-1">
                        <div className={`mr-3 flex h-9 w-9 items-center justify-center rounded-2xl ${
                          selectedCategoryId === category.id
                            ? 'bg-white/80 text-teal-700 dark:bg-slate-950/60 dark:text-teal-200'
                            : 'bg-slate-100 text-slate-500 dark:bg-slate-800 dark:text-slate-400'
                        }`}>
                          <FolderIcon className="flex-shrink-0" />
                        </div>
                        <span className="truncate max-w-[150px] inline-block" title={category.name}>{category.name}</span>
                      </div>
                      <div className="flex items-center space-x-1 min-w-[24px] justify-end">
                        <span className="rounded-full bg-slate-200/80 px-2 py-1 text-xs text-slate-600 group-hover:hidden dark:bg-slate-800 dark:text-slate-300">
                          {getCategoryNoteCount(category.id)}
                        </span>
                        <div className="hidden group-hover:flex items-center">
                          <button
                            onClick={async (e) => {
                              await handleDeleteCategory(category.id, e)
                            }}
                            className="rounded-full p-1 transition-colors hover:bg-red-100 hover:text-red-500 dark:hover:bg-red-900/40 dark:hover:text-red-300"
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
              <div className="rounded-[22px] border border-dashed border-slate-300/80 bg-white/60 py-6 text-center text-slate-500 dark:border-slate-700 dark:bg-slate-900/40 dark:text-slate-400">
                <p>暂无分类</p>
                <p className="text-sm mt-1">点击上方"+"按钮创建</p>
              </div>
            )}
          </div>

          <div className="mt-4 rounded-[24px] border border-slate-200/70 bg-gradient-to-br from-white to-teal-50/70 p-4 dark:border-white/10 dark:bg-gradient-to-br dark:from-slate-900 dark:to-teal-500/5">
            <div className="text-[11px] font-semibold uppercase tracking-[0.2em] text-slate-500 dark:text-slate-400">
              当前视图
            </div>
            <div className="mt-3 space-y-2 text-sm text-slate-600 dark:text-slate-300">
              <div className="flex items-center justify-between">
                <span>文档</span>
                <span className="font-medium text-slate-900 dark:text-slate-100">{scopedDocumentCount}</span>
              </div>
              <div className="flex items-center justify-between">
                <span>提醒</span>
                <span className="font-medium text-slate-900 dark:text-slate-100">{scopedReminderCount}</span>
              </div>
              <div className="flex items-center justify-between">
                <span>分类</span>
                <span className="font-medium text-slate-900 dark:text-slate-100">{categories.length}</span>
              </div>
            </div>
          </div>
        </div>
      </div>
      
      {/* 底部功能按钮 */}
      <div className="flex items-center justify-around border-t border-slate-200/70 bg-white/55 p-3 backdrop-blur dark:border-white/10 dark:bg-slate-950/45">
        {/* Git 同步按钮 */}
        <button
          onClick={() => setGitSyncOpen(true)}
          className="rounded-2xl border border-slate-200/70 bg-white/80 p-2.5 text-slate-600 shadow-sm transition-all hover:-translate-y-0.5 hover:bg-white dark:border-white/10 dark:bg-slate-900/70 dark:text-slate-300 dark:hover:bg-slate-900"
          title="Git 同步"
        >
          <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="lucide lucide-github"><path d="M15 22v-4a4.8 4.8 0 0 0-1-3.5c3 0 6-2 6-5.5.08-1.25-.27-2.48-1-3.5.28-1.15.28-2.35 0-3.5 0 0-1 0-3 1.5-2.64-.5-5.36-.5-8 0C6 2 5 2 5 2c-.28 1.15-.28 2.35 0 3.5-.73 1.02-1.08 2.25-1 3.5 0 3.5 3 5.5 6 5.5-.39.49-.68 1.05-.85 1.65-.17.6-.22 1.23-.15 1.85v4"/><path d="M9 18c-4.51 2-5-2-7-2"/></svg>
        </button>

        {/* 云同步按钮 */}
        <button
          onClick={() => setCloudSyncOpen(true)}
          className="rounded-2xl border border-slate-200/70 bg-white/80 p-2.5 text-slate-600 shadow-sm transition-all hover:-translate-y-0.5 hover:bg-white dark:border-white/10 dark:bg-slate-900/70 dark:text-slate-300 dark:hover:bg-slate-900"
          title="WebDAV 同步"
        >
          <Cloud className="w-5 h-5" />
        </button>

        {/* 主题切换按钮 */}
        <button
          onClick={toggleTheme}
          className="rounded-2xl border border-slate-200/70 bg-white/80 p-2.5 text-slate-600 shadow-sm transition-all hover:-translate-y-0.5 hover:bg-white dark:border-white/10 dark:bg-slate-900/70 dark:text-slate-300 dark:hover:bg-slate-900"
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
          className="rounded-2xl border border-slate-200/70 bg-white/80 p-2.5 text-slate-600 shadow-sm transition-all hover:-translate-y-0.5 hover:bg-white dark:border-white/10 dark:bg-slate-900/70 dark:text-slate-300 dark:hover:bg-slate-900"
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
