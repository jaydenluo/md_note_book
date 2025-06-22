import React from 'react'
import { useState, useEffect, useRef } from 'react'
import { storage } from '@services/storage'
import { useCategories } from '@stores/categoryStore'
import { useNotes } from '@stores/noteStore'
import { useTags } from '@stores/tagStore'
import { useTabs } from '@stores/tabsStore'
import { motion, AnimatePresence } from 'framer-motion'
import { useTheme } from '@utils/theme'
import { debounce } from '@utils/debounce'
import { cn } from '@utils/cn'
import { TabManager } from './components/TabManager'
import { NoteTab } from './components/NoteTab'
import { ResizablePanel } from './components/ui/ResizablePanel'

// Lucide 图标组件
import { Menu, Search, Star, Clock, Share, Settings, Plus, FileText } from 'lucide-react'

function App() {
  const [selectedCategoryId, setSelectedCategoryId] = useState<string | null>(null)
  const [isLoading, setIsLoading] = useState(true)
  const [isInitialized, setIsInitialized] = useState(false)
  const [isSaving, setIsSaving] = useState(false)
  const [sidebarOpen, setSidebarOpen] = useState(true)
  const [searchQuery, setSearchQuery] = useState('')
  const [isCreatingCategory, setIsCreatingCategory] = useState(false)
  const [newCategoryName, setNewCategoryName] = useState('')
  const [isMobileView, setIsMobileView] = useState(window.innerWidth < 768)
  const newCategoryInputRef = useRef<HTMLInputElement>(null)
  const titleInputRef = useRef<HTMLInputElement>(null)
  const contentTextareaRef = useRef<HTMLTextAreaElement>(null)

  const loadCategories = useCategories(state => state.loadCategories)
  const loadNotes = useNotes(state => state.loadNotes)
  const loadTags = useTags(state => state.loadTags)
  const notes = useNotes(state => state.notes)
  const categories = useCategories(state => state.categories)
  const createNote = useNotes(state => state.createNote)
  const updateNote = useNotes(state => state.updateNote)
  const createCategory = useCategories(state => state.createCategory)
  const { isDark, toggleTheme } = useTheme()
  
  // 从tabsStore获取标签相关状态和方法
  const tabs = useTabs(state => state.tabs)
  const activeTabId = useTabs(state => state.activeTabId)
  const addTab = useTabs(state => state.addTab)
  const closeTab = useTabs(state => state.closeTab)
  const closeOtherTabs = useTabs(state => state.closeOtherTabs)
  const closeAllTabs = useTabs(state => state.closeAllTabs)
  const activateTab = useTabs(state => state.activateTab)
  const getTabByNoteId = useTabs(state => state.getTabByNoteId)

  // 获取当前活动的笔记ID
  const activeTab = tabs.find(tab => tab.id === activeTabId)
  const selectedNoteId = activeTab?.noteId || null

  // 调试信息
  console.log('App状态:', {
    tabs: tabs.map(t => ({ id: t.id, noteId: t.noteId, title: t.title })),
    activeTabId,
    selectedNoteId,
    activeTab: activeTab ? { id: activeTab.id, noteId: activeTab.noteId, title: activeTab.title } : null
  });

  // 响应式设计
  useEffect(() => {
    const handleResize = () => {
      setIsMobileView(window.innerWidth < 768)
      if (window.innerWidth < 768) {
        setSidebarOpen(false)
      }
    }

    window.addEventListener('resize', handleResize)
    return () => window.removeEventListener('resize', handleResize)
  }, [])

  // 应用主题
  useEffect(() => {
    document.documentElement.classList.toggle('dark', isDark)
  }, [isDark])

  // 初始化数据
  useEffect(() => {
    const initData = async () => {
      setIsLoading(true)
      try {
        await storage.init()
        
        // 加载数据
        await Promise.all([
          loadCategories(),
          loadNotes(),
          loadTags()
        ])
        
        setIsInitialized(true)
      } catch (error) {
        console.error('初始化数据失败:', error)
      } finally {
        setIsLoading(false)
      }
    }
    
    initData()
  }, [loadCategories, loadNotes, loadTags])

  // 当选中的分类被删除时，重置选中状态
  useEffect(() => {
    if (selectedCategoryId && !notes.some(note => note.categoryId === selectedCategoryId)) {
      setSelectedCategoryId(null)
    }
  }, [notes, selectedCategoryId])

  // 自动聚焦新分类输入框
  useEffect(() => {
    if (isCreatingCategory && newCategoryInputRef.current) {
      newCategoryInputRef.current.focus()
    }
  }, [isCreatingCategory])

  // 创建笔记
  const handleCreateNote = () => {
    const id = createNote({
      title: '新笔记',
      content: '',
      categoryId: selectedCategoryId
    })
    
    // 创建新标签并激活
    addTab(id, '新笔记')
    
    // 在移动视图中，创建笔记后自动关闭侧边栏
    if (isMobileView) {
      setSidebarOpen(false)
    }
  }

  // 打开笔记
  const handleOpenNote = (noteId: string) => {
    const note = notes.find(n => n.id === noteId);
    if (note) {
      // 添加标签并激活
      addTab(noteId, note.title);
    }
    
    // 在移动视图中，打开笔记后自动关闭侧边栏
    if (isMobileView) {
      setSidebarOpen(false)
    }
  }

  // 创建分类
  const handleCreateCategory = () => {
    if (newCategoryName.trim()) {
      const id = createCategory({
        name: newCategoryName.trim()
      })
      setNewCategoryName('')
      setIsCreatingCategory(false)
      setSelectedCategoryId(id)
    }
  }

  // 筛选笔记
  const filteredNotes = notes.filter(note => {
    // 分类筛选
    if (selectedCategoryId && note.categoryId !== selectedCategoryId) {
      return false
    }
    
    // 搜索筛选
    if (searchQuery) {
      const query = searchQuery.toLowerCase()
      return note.title.toLowerCase().includes(query) || 
             note.content.toLowerCase().includes(query)
    }
    
    return true
  })

  // 渲染侧边栏内容
  const renderSidebar = () => (
    <div className="flex flex-col h-full bg-white dark:bg-gray-800">
      {/* 搜索框 */}
      <div className="p-3 border-b border-gray-200 dark:border-gray-700">
        <div className="relative">
          <div className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400">
            <Search className="h-4 w-4" />
          </div>
          <input
            type="text"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="搜索笔记..."
            className="w-full pl-10 pr-4 py-2 bg-gray-100 dark:bg-gray-700 rounded-lg border-none dark:text-white"
          />
        </div>
      </div>
      
      {/* 操作按钮 */}
      <div className="flex p-3 border-b border-gray-200 dark:border-gray-700">
        <button className="flex items-center justify-center p-2 bg-gray-100 dark:bg-gray-700 rounded-lg mr-2 text-gray-600 dark:text-gray-300">
          <Star className="h-4 w-4" />
        </button>
        <button className="flex items-center justify-center p-2 bg-gray-100 dark:bg-gray-700 rounded-lg mr-2 text-gray-600 dark:text-gray-300">
          <Clock className="h-4 w-4" />
        </button>
        <button className="flex items-center justify-center p-2 bg-gray-100 dark:bg-gray-700 rounded-lg text-gray-600 dark:text-gray-300">
          <Share className="h-4 w-4" />
        </button>
        <button
          className="flex items-center justify-center p-2 ml-auto bg-gray-100 dark:bg-gray-700 rounded-lg text-gray-600 dark:text-gray-300"
          onClick={toggleTheme}
        >
          <Settings className="h-4 w-4" />
        </button>
      </div>
      
      {/* 分类 */}
      <div className="p-3 border-b border-gray-200 dark:border-gray-700">
        <div className="flex items-center justify-between mb-2">
          <h2 className="font-medium dark:text-white">分类</h2>
          <button 
            onClick={() => setIsCreatingCategory(true)}
            className="p-1 rounded hover:bg-gray-100 dark:hover:bg-gray-700 text-gray-600 dark:text-gray-300"
          >
            <Plus className="h-4 w-4" />
          </button>
        </div>
        
        {isCreatingCategory && (
          <div className="mb-2 bg-white dark:bg-gray-800 rounded-lg border border-gray-200 dark:border-gray-700 p-2">
            <input
              ref={newCategoryInputRef}
              type="text"
              value={newCategoryName}
              onChange={(e) => setNewCategoryName(e.target.value)}
              placeholder="分类名称"
              className="w-full px-3 py-1.5 border border-gray-300 dark:border-gray-600 rounded-lg mb-1 bg-white dark:bg-gray-800 dark:text-white"
            />
            <div className="flex justify-end space-x-2">
              <button 
                className="px-2 py-1 text-xs rounded hover:bg-gray-100 dark:hover:bg-gray-700 text-gray-600 dark:text-gray-300"
                onClick={() => setIsCreatingCategory(false)}
              >
                取消
              </button>
              <button 
                className="px-2 py-1 text-xs bg-blue-500 text-white rounded hover:bg-blue-600 disabled:opacity-50"
                onClick={handleCreateCategory}
                disabled={!newCategoryName.trim()}
              >
                创建
              </button>
            </div>
          </div>
        )}
        
        <div className="space-y-1">
          {categories.map(category => (
            <button
              key={category.id}
              onClick={() => setSelectedCategoryId(category.id)}
              className={`w-full flex items-center justify-between px-3 py-2 rounded-lg ${
                selectedCategoryId === category.id
                  ? 'bg-blue-100 dark:bg-blue-900 text-blue-700 dark:text-blue-300'
                  : 'hover:bg-gray-100 dark:hover:bg-gray-700 text-gray-700 dark:text-gray-300'
              }`}
            >
              <div className="flex items-center">
                <FileText className="h-4 w-4 mr-2" />
                <span className="truncate">{category.name}</span>
              </div>
              <span className="text-xs px-2 py-0.5 bg-gray-200 dark:bg-gray-700 rounded-full">
                {notes.filter(note => note.categoryId === category.id).length}
              </span>
            </button>
          ))}
        </div>
      </div>
    </div>
  )

  // 渲染笔记列表
  const renderNoteList = () => (
    <div className="flex flex-col h-full bg-white dark:bg-gray-800">
      {/* 笔记列表头部 */}
      <div className="p-3 border-b border-gray-200 dark:border-gray-700 flex items-center justify-between">
        <h2 className="font-medium dark:text-white">
          {selectedCategoryId 
            ? `${categories.find(c => c.id === selectedCategoryId)?.name || '未知分类'} (${filteredNotes.length})`
            : `所有笔记 (${filteredNotes.length})`}
        </h2>
        <button 
          onClick={handleCreateNote}
          className="p-1.5 rounded hover:bg-gray-100 dark:hover:bg-gray-700 text-gray-600 dark:text-gray-300"
        >
          <Plus className="h-4 w-4" />
        </button>
      </div>
      
      {/* 笔记列表 */}
      <div className="flex-1 overflow-y-auto">
        {filteredNotes.length === 0 ? (
          <div className="flex flex-col items-center justify-center h-full p-4 text-gray-500 dark:text-gray-400">
            <svg className="w-12 h-12 mb-2 opacity-50" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
            </svg>
            <p className="text-center">
              {selectedCategoryId 
                  ? '此分类下还没有笔记' 
                  : '开始创建你的第一个笔记吧'}
            </p>
          </div>
        ) : (
          <div className="divide-y divide-gray-200 dark:divide-gray-700">
            {filteredNotes.map(note => (
              <button
                key={note.id}
                onClick={() => handleOpenNote(note.id)}
                className={`w-full p-3 text-left ${
                  selectedNoteId === note.id 
                    ? 'bg-blue-50 dark:bg-blue-900/30 border-l-4 border-l-blue-500' 
                    : 'hover:bg-gray-50 dark:hover:bg-gray-700'
                }`}
              >
                <h3 className="font-medium truncate dark:text-white">{note.title || '无标题'}</h3>
                <p className="text-sm text-gray-500 dark:text-gray-400 mt-1 truncate line-clamp-2">
                  {note.content || '空笔记'}
                </p>
                <div className="text-xs text-gray-500 dark:text-gray-400 mt-2">
                  {new Date(note.updatedAt).toLocaleDateString()}
                </div>
              </button>
            ))}
          </div>
        )}
      </div>
    </div>
  )

  // 渲染笔记内容区域（包含标签）
  const renderNoteContent = () => (
    <div className="flex flex-col h-full bg-white dark:bg-gray-800">
      {/* 标签栏 */}
      {tabs.length > 0 ? (
        <TabManager 
          activeTabId={activeTabId}
          onTabChange={activateTab}
          onTabClose={closeTab}
          onTabCloseOthers={closeOtherTabs}
          onTabCloseAll={closeAllTabs}
        />
      ) : (
        <div className="flex items-center justify-between p-3 border-b border-gray-200 dark:border-gray-700">
          <h2 className="font-medium dark:text-white">无打开的笔记</h2>
          <button 
            onClick={handleCreateNote}
            className="p-1.5 rounded hover:bg-gray-100 dark:hover:bg-gray-700 text-gray-600 dark:text-gray-300"
          >
            <Plus className="h-4 w-4" />
          </button>
        </div>
      )}
      
      {/* 笔记内容 */}
      <div className="flex-1 overflow-hidden">
        {selectedNoteId ? (
          <NoteTab noteId={selectedNoteId} key={selectedNoteId} />
        ) : (
          <div className="flex flex-col items-center justify-center h-full text-gray-500 dark:text-gray-400">
            <h2 className="text-xl font-medium mb-2">选择或创建一个笔记</h2>
            <p className="text-center max-w-md">
              从左侧选择一个笔记开始编辑，或者创建一个新的笔记。
            </p>
            <button 
              className="mt-4 px-4 py-2 bg-blue-500 text-white rounded-lg flex items-center"
              onClick={handleCreateNote}
            >
              <Plus className="h-4 w-4 mr-2" />
              创建新笔记
            </button>
          </div>
        )}
      </div>
    </div>
  )

  // 加载动画
  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-screen bg-white dark:bg-gray-900">
        <div className="text-center">
          <div className="w-12 h-12 border-4 border-blue-500 border-t-transparent rounded-full animate-spin mx-auto mb-4"></div>
          <h2 className="text-lg font-medium text-gray-700 dark:text-gray-300">加载中...</h2>
        </div>
      </div>
    )
  }

  // 桌面布局
  if (!isMobileView) {
    return (
      <div className="flex h-screen bg-gray-100 dark:bg-gray-900">
        {/* 顶部导航栏 - 固定在顶部 */}
        <div className="fixed top-0 left-0 right-0 h-12 bg-white dark:bg-gray-800 border-b border-gray-200 dark:border-gray-700 flex items-center px-4 z-10">
          <button 
            className="mr-4 p-1.5 rounded hover:bg-gray-100 dark:hover:bg-gray-700 text-gray-600 dark:text-gray-300"
            onClick={() => setSidebarOpen(!sidebarOpen)}
          >
            <Menu className="h-5 w-5" />
          </button>
          <h1 className="text-lg font-bold dark:text-white">笔记本</h1>
          <button 
            className="ml-auto px-2 py-1 text-xs bg-blue-500 text-white rounded"
            onClick={() => {
              console.log('当前状态:', { tabs, activeTabId, selectedNoteId });
            }}
          >
            调试
          </button>
        </div>
        
        {/* 内容区域 - 添加顶部边距避开导航栏 */}
        <div className="flex w-full mt-12">
          {/* 侧边栏 */}
          <AnimatePresence>
            {sidebarOpen && (
              <div className="h-[calc(100vh-48px)] border-r border-gray-200 dark:border-gray-700 w-[250px] min-w-[180px] max-w-[350px] relative">
                {renderSidebar()}
              </div>
            )}
          </AnimatePresence>
          
          {/* 主内容区 */}
          <div className="flex flex-1 h-[calc(100vh-48px)]">
            {/* 笔记列表 */}
            <div className="w-[280px] min-w-[220px] max-w-[400px] border-r border-gray-200 dark:border-gray-700">
              {renderNoteList()}
            </div>
            
            {/* 笔记内容 */}
            <div className="flex-1">
              {renderNoteContent()}
            </div>
          </div>
        </div>
      </div>
    )
  }
  
  // 移动布局
  return (
    <div className="flex flex-col h-screen bg-gray-100 dark:bg-gray-900">
      {/* 顶部导航栏 */}
      <header className="h-12 bg-white dark:bg-gray-800 border-b border-gray-200 dark:border-gray-700 flex items-center px-4">
        <button 
          className="mr-4 p-1.5 rounded hover:bg-gray-100 dark:hover:bg-gray-700 text-gray-600 dark:text-gray-300"
          onClick={() => setSidebarOpen(true)}
        >
          <Menu className="h-5 w-5" />
        </button>
        <h1 className="text-lg font-bold dark:text-white">笔记本</h1>
      </header>
      
      {/* 侧边栏 - 移动端抽屉 */}
      {sidebarOpen && (
        <div className="fixed inset-0 bg-black bg-opacity-50 z-40" onClick={() => setSidebarOpen(false)}>
          <motion.div
            initial={{ x: -300 }}
            animate={{ x: 0 }}
            exit={{ x: -300 }}
            className="w-[280px] h-full bg-white dark:bg-gray-800 overflow-hidden"
            onClick={e => e.stopPropagation()}
          >
            {renderSidebar()}
          </motion.div>
        </div>
      )}
      
      {/* 主内容区 - 移动端标签页 */}
      <div className="flex flex-col flex-1">
        {/* 标签栏 */}
        {tabs.length > 0 && (
          <TabManager 
            activeTabId={activeTabId}
            onTabChange={activateTab}
            onTabClose={closeTab}
            onTabCloseOthers={closeOtherTabs}
            onTabCloseAll={closeAllTabs}
          />
        )}
        
        {/* 内容区域 */}
        {selectedNoteId ? (
          <div className="flex-1 overflow-hidden">
            <NoteTab noteId={selectedNoteId} key={selectedNoteId} />
          </div>
        ) : (
          renderNoteList()
        )}
      </div>
    </div>
  )
}

export default App
