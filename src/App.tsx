import React, { useMemo } from 'react'
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
import { Sidebar } from './components/Sidebar'
import { setupContextMenu, createContextMenu } from '@utils/contextMenu'
import type { Note } from '@stores/noteStore'

// Lucide 图标组件
import { Menu, Search, Star, Clock, Share, Settings, Plus } from 'lucide-react'

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
  
  // 添加右键菜单状态
  const [contextMenu, setContextMenu] = useState<{
    visible: boolean;
    x: number;
    y: number;
    type?: string;
    data?: any;
  }>({
    visible: false,
    x: 0,
    y: 0,
  });
  
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
    activeTab: activeTab ? { id: activeTab.id, noteId: activeTab.noteId, title: activeTab.title } : null,
    selectedCategoryId,
    totalNotes: notes.length
  });

  // 从localStorage加载分类ID（仅在组件挂载时执行一次）
  useEffect(() => {
    // 从localStorage加载上次选择的分类ID
    const savedCategoryId = localStorage.getItem('selectedCategoryId');
    if (savedCategoryId) {
      console.log('从localStorage加载分类ID:', savedCategoryId);
      setSelectedCategoryId(savedCategoryId);
    }
  }, []);

  // 筛选笔记
  const filteredNotes = useMemo(() => {
    // 简化日志
    console.log('筛选笔记，分类ID:', selectedCategoryId);
    
    return notes.filter(note => {
      // 分类筛选
      if (selectedCategoryId && note.categoryId !== selectedCategoryId) {
        return false;
      }
      
      // 搜索筛选
      if (searchQuery) {
        const query = searchQuery.toLowerCase();
        return note.title.toLowerCase().includes(query) || 
               note.content.toLowerCase().includes(query);
      }
      
      return true;
    });
  }, [notes, selectedCategoryId, searchQuery]);

  // 监听selectedCategoryId变化
  useEffect(() => {
    // 简化日志
    console.log('分类ID变化:', selectedCategoryId);
  }, [selectedCategoryId]);

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

  // 禁用默认右键菜单
  useEffect(() => {
    setupContextMenu();
  }, []);

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
    // 只在以下情况重置分类ID：
    // 1. 有选中的分类ID
    // 2. 有笔记存在（不是空列表）
    // 3. 但没有任何笔记属于该分类
    if (
      selectedCategoryId && 
      notes.length > 0 && 
      !categories.some(c => c.id === selectedCategoryId) // 只在分类不存在时重置
    ) {
      console.log('选中的分类已被删除，重置选中状态');
      setSelectedCategoryId(null);
    }
  }, [notes, categories, selectedCategoryId]);

  // 自动聚焦新分类输入框
  useEffect(() => {
    if (isCreatingCategory && newCategoryInputRef.current) {
      newCategoryInputRef.current.focus()
    }
  }, [isCreatingCategory])

  // 记录selectedCategoryId变化
  const selectedCategoryIdRef = useRef(selectedCategoryId);
  
  // 同步ref值与state值
  useEffect(() => {
    // 当状态值变化时更新ref
    selectedCategoryIdRef.current = selectedCategoryId;
    console.log('selectedCategoryId实际变化为:', selectedCategoryId);
  }, [selectedCategoryId]);

  // 创建一个包装过的setSelectedCategoryId函数，用于跟踪状态变化
  const setSelectedCategoryIdWithLogging = (id: string | null) => {
    // 简洁日志
    console.log('设置分类ID:', id);
    
    // 防止设置相同的值
    if (id === selectedCategoryId) {
      return;
    }
    
    // 直接保存到localStorage，避免使用useEffect
    if (id) {
      localStorage.setItem('selectedCategoryId', id);
    } else {
      localStorage.removeItem('selectedCategoryId');
    }
    
    // 更新状态 - 放在最后执行
    setSelectedCategoryId(id);
    
    // 立即更新ref，以便其他地方可以访问最新值
    selectedCategoryIdRef.current = id;
  };

  // 创建笔记
  const handleCreateNote = () => {
    // 添加日志，确认使用了正确的分类ID
    console.log('创建笔记使用的分类ID:', selectedCategoryId);
    
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
      
      {/* 使用Sidebar组件显示分类 */}
      <div className="flex-1 overflow-auto">
        <Sidebar
          selectedCategoryId={selectedCategoryId}
          onSelectCategory={setSelectedCategoryIdWithLogging}
        />
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
                onContextMenu={(e) => handleNoteContextMenu(e, note)}
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

  // 处理笔记右键菜单
  const handleNoteContextMenu = (e: React.MouseEvent, note: Note) => {
    e.preventDefault();
    
    const x = e.clientX;
    const y = e.clientY;
    
    createContextMenu(x, y, [
      {
        label: '打开',
        onClick: () => handleOpenNote(note.id)
      },
      {
        label: '删除',
        onClick: () => {
          if (confirm(`确定要删除笔记 "${note.title || '无标题'}" 吗？`)) {
            // 这里需要调用deleteNote函数
            console.log('删除笔记:', note.id);
          }
        }
      }
    ]);
  };

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

  const debugAppState = () => {
    console.log('========== 应用状态 ==========');
    console.log('当前选中的分类ID:', selectedCategoryId);
    console.log('分类数量:', categories.length);
    console.log('笔记总数:', notes.length);
    console.log('筛选后的笔记数:', filteredNotes.length);
    
    // 检查每个分类下的笔记数量
    categories.forEach(category => {
      const notesInCategory = notes.filter(note => note.categoryId === category.id);
      console.log(`分类 "${category.name}" 下的笔记数量:`, notesInCategory.length);
    });
    
    console.log('========== 调试结束 ==========');
  };

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
              onClick={debugAppState}
            >
              调试
            </button>
          </div>
          
        {/* 内容区域 - 添加顶部边距避开导航栏 */}
        <div className="flex w-full mt-12">
          {/* 侧边栏 */}
          <AnimatePresence>
            {sidebarOpen && (
              <ResizablePanel
                id="sidebar-panel"
                defaultWidth={250}
                minWidth={200}
                maxWidth={400}
                direction="right"
                className="h-[calc(100vh-48px)] bg-white dark:bg-gray-800 border-r border-gray-200 dark:border-gray-700"
              >
                {renderSidebar()}
              </ResizablePanel>
            )}
          </AnimatePresence>
          
          {/* 主内容区 */}
          <div className="flex flex-1 h-[calc(100vh-48px)]">
          {/* 笔记列表 */}
          <ResizablePanel
              id="note-list-panel"
            defaultWidth={280}
            minWidth={220}
              maxWidth={500}
              direction="right"
              className="border-r border-gray-200 dark:border-gray-700"
          >
            {renderNoteList()}
          </ResizablePanel>
          
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
