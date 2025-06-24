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
import { useAlertDialog } from '@/components/ui/alert-dialog'
import { usePromptDialog } from '@/components/ui/prompt-dialog'

// Lucide 图标组件
import { Menu, Search, Star, Clock, Share, Settings, Plus } from 'lucide-react'
// 统一导入自定义SVG图标
import { FolderIcon, FolderPlusIcon } from '@/components/icons'
// 下面是需要补充的自定义图标
import { FilePlusIcon, ChevronRightIcon, ChevronDownIcon, FileTextIcon } from '@/components/icons'

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
  const updateCategory = useCategories(state => state.updateCategory)
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
  // console.log('App状态:', {
  //   tabs: tabs.map(t => ({ id: t.id, noteId: t.noteId, title: t.title })),
  //   activeTabId,
  //   selectedNoteId,
  //   activeTab: activeTab ? { id: activeTab.id, noteId: activeTab.noteId, title: activeTab.title } : null,
  //   selectedCategoryId,
  //   totalNotes: notes.length
  // });

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
    // 当状态值变化时更新ref
    selectedCategoryIdRef.current = selectedCategoryId;
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

  // 检查并创建默认分类
  useEffect(() => {
    // 只在数据初始化完成且分类为空时执行
    if (isInitialized && categories.length === 0) {
      console.log('没有找到分类，创建默认分类')
      const id = createCategory({
        name: '默认分类'
      })
      // 自动选中新创建的分类
      setSelectedCategoryId(id)
      // 更新ref
      selectedCategoryIdRef.current = id
      // 保存到localStorage
      localStorage.setItem('selectedCategoryId', id)
    }
  }, [isInitialized, categories.length, createCategory])

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
  }, [notes, categories]); // 移除selectedCategoryId依赖，避免无限循环

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
  }, [selectedCategoryId]);

  // 创建一个包装过的setSelectedCategoryId函数，用于跟踪状态变化
  const setSelectedCategoryIdWithLogging = (id: string | null) => {
    // 直接保存到localStorage，避免使用useEffect
    if (id) {
      localStorage.setItem('selectedCategoryId', id);
    } else {
      localStorage.removeItem('selectedCategoryId');
    }
    
    // 更新状态
    setSelectedCategoryId(id);
    
    // 立即更新ref，以便其他地方可以访问最新值
    selectedCategoryIdRef.current = id;
  };

  // 添加usePromptDialog hook
  const { showPrompt } = usePromptDialog()
  const { showAlert, showConfirm } = useAlertDialog()

  // 创建新笔记
  const handleCreateNote = () => {
    const id = createNote({
      title: '新笔记',
      content: '',
      categoryId: selectedCategoryId
    })
    // 创建新标签并激活
    addTab(id, '新笔记')
    activateTab(id)
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

  // 处理快速创建分类
  const handleQuickCreateCategory = async () => {
    // 创建一个默认名称的分类
    const defaultName = `新分类 ${categories.length + 1}`;
    const id = createCategory({
      name: defaultName
    });
    
    // 自动选中新创建的分类
    setSelectedCategoryId(id);
    // 更新ref
    selectedCategoryIdRef.current = id;
    // 保存到localStorage
    localStorage.setItem('selectedCategoryId', id);
    
    // 确保侧边栏在移动视图下是打开的，这样用户可以看到并编辑新创建的分类
    if (isMobileView) {
      setSidebarOpen(true);
    }
  };

  // 拖拽相关状态
  const [dragNoteId, setDragNoteId] = useState<string | null>(null);
  const [dragOverFolderId, setDragOverFolderId] = useState<string | null>(null);

  // 拖拽事件处理
  const handleDragStart = (noteId: string) => {
    setDragNoteId(noteId);
  };
  const handleDragEnd = () => {
    setDragNoteId(null);
    setDragOverFolderId(null);
  };
  const handleDragOverFolder = (folderId: string, e: React.DragEvent) => {
    e.preventDefault();
    setDragOverFolderId(folderId);
  };
  const handleDropOnFolder = async (folderId: string) => {
    if (dragNoteId && dragNoteId !== folderId) {
      // 只允许普通笔记拖到目录
      const note = notes.find(n => n.id === dragNoteId);
      if (note && note.type !== 'folder') {
        await updateNote(dragNoteId, { parentId: folderId });
      }
    }
    setDragNoteId(null);
    setDragOverFolderId(null);
  };
  // 拖到根目录
  const handleDropOnRoot = async () => {
    if (dragNoteId) {
      const note = notes.find(n => n.id === dragNoteId);
      if (note && note.type !== 'folder') {
        await updateNote(dragNoteId, { parentId: null });
      }
    }
    setDragNoteId(null);
    setDragOverFolderId(null);
  };

  // 新建文档
  const handleCreateDoc = () => {
    const id = createNote({
      title: '新文档',
      content: '',
      categoryId: selectedCategoryId,
      type: 'doc',
      parentId: dragOverFolderId && dragOverFolderId !== 'root' ? dragOverFolderId : null
    });
    // 使用正确的tab管理方法，而不是直接设置selectedNoteId
    addTab(id, '新文档')
    activateTab(id)
  };
  // 新建目录
  const handleCreateFolder = () => {
    const id = createNote({
      title: '新目录',
      content: '',
      categoryId: selectedCategoryId,
      type: 'folder',
      parentId: null
    });
    // 可选：新建后自动进入重命名状态（如有重命名逻辑）
  };

  // 目录折叠状态
  const [collapsedFolders, setCollapsedFolders] = useState<Record<string, boolean>>({});
  // 目录重命名状态
  const [editingFolderId, setEditingFolderId] = useState<string | null>(null);
  const [editingFolderName, setEditingFolderName] = useState('');
  const editFolderInputRef = useRef<HTMLInputElement>(null);

  // 目录点击切换折叠
  const handleFolderClick = (folderId: string) => {
    setCollapsedFolders(prev => ({ ...prev, [folderId]: !prev[folderId] }));
  };
  // 目录双击重命名
  const handleFolderDoubleClick = (folder: any) => {
    setEditingFolderId(folder.id);
    setEditingFolderName(folder.title);
    setTimeout(() => editFolderInputRef.current?.focus(), 0);
  };
  // 保存目录名
  const handleFolderNameSave = async (folderId: string) => {
    if (editingFolderName.trim()) {
      await updateNote(folderId, { title: editingFolderName.trim() });
    }
    setEditingFolderId(null);
    setEditingFolderName('');
  };

  // 修改renderNoteList，拖拽时才显示"拖到这里可放到根目录"
  const renderNoteList = () => {
    // 顶层目录和未归属目录的笔记
    const folders = filteredNotes.filter(n => n.type === 'folder' && !n.parentId);
    const rootDocs = filteredNotes.filter(n => n.type !== 'folder' && !n.parentId);
    // 目录下的笔记
    const notesByParent: Record<string, typeof filteredNotes> = {};
    filteredNotes.forEach(n => {
      if (n.parentId) {
        if (!notesByParent[n.parentId]) notesByParent[n.parentId] = [];
        notesByParent[n.parentId].push(n);
      }
    });

    return (
    <div className="flex flex-col h-full bg-white dark:bg-gray-800">
      {/* 笔记列表头部 */}
      <div className="p-3 border-b border-gray-200 dark:border-gray-700 flex items-center justify-between">
        <h2 className="font-medium dark:text-white">
          {selectedCategoryId 
            ? `${categories.find(c => c.id === selectedCategoryId)?.name || '未知分类'} (${filteredNotes.length})`
            : `所有笔记 (${filteredNotes.length})`}
        </h2>
          <div className="flex space-x-2">
        <button 
              onClick={handleCreateDoc}
          className="p-1.5 rounded hover:bg-gray-100 dark:hover:bg-gray-700 text-gray-600 dark:text-gray-300"
              title="新建文档"
            >
              {/* 使用自定义文档加号图标 FilePlusIcon 作为新建文档按钮图标 */}
              <FilePlusIcon className="h-5 w-5" />
            </button>
            <button
              onClick={handleCreateFolder}
              className="p-1.5 rounded hover:bg-gray-100 dark:hover:bg-gray-700 text-blue-600 dark:text-blue-300"
              title="新建目录"
            >
              <FolderPlusIcon className="h-5 w-5" />
        </button>
      </div>
        </div>
        {/* 拖到根目录区域，仅在拖拽时显示 */}
        {dragNoteId && (
          <div
            className={`p-2 text-xs text-center cursor-pointer ${dragOverFolderId === 'root' ? 'bg-blue-100 dark:bg-blue-900' : ''}`}
            onDragOver={e => { e.preventDefault(); setDragOverFolderId('root'); }}
            onDrop={handleDropOnRoot}
            onDragLeave={() => setDragOverFolderId(null)}
          >
            拖到这里可放到根目录
          </div>
        )}
        {/* 目录 */}
        {folders.map(folder => (
          <div
            key={folder.id}
            className={`group border-b dark:border-gray-700 ${dragOverFolderId === folder.id ? 'bg-blue-100 dark:bg-blue-900' : ''}`}
            onDragOver={e => handleDragOverFolder(folder.id, e)}
            onDrop={() => handleDropOnFolder(folder.id)}
            onDragLeave={() => setDragOverFolderId(null)}
          >
            <div
              className="flex items-center px-4 py-2 cursor-pointer select-none"
              onClick={() => handleFolderClick(folder.id)}
              onDoubleClick={() => handleFolderDoubleClick(folder)}
            >
              {/* 折叠icon动画 */}
              <span className="transition-transform duration-200 mr-1">
                {/* 使用自定义Chevron图标 */}
                {collapsedFolders[folder.id] ? <ChevronRightIcon size={16} /> : <ChevronDownIcon size={16} />}
              </span>
              <FolderIcon className="w-4 h-4 mr-2 text-blue-500" />
              {editingFolderId === folder.id ? (
                <input
                  ref={editFolderInputRef}
                  value={editingFolderName}
                  onChange={e => setEditingFolderName(e.target.value)}
                  onBlur={() => handleFolderNameSave(folder.id)}
                  onKeyDown={e => {
                    if (e.key === 'Enter') handleFolderNameSave(folder.id);
                    if (e.key === 'Escape') { setEditingFolderId(null); setEditingFolderName(''); }
                  }}
                  className="px-2 py-1 rounded border border-blue-400 outline-none w-28 text-sm"
                  autoFocus
                />
              ) : (
                <span className="font-semibold text-blue-700 dark:text-blue-300 truncate text-sm">{folder.title}</span>
              )}
              {/* 目录右侧新建文件按钮，右对齐 */}
              <button
                className="ml-auto p-1 rounded hover:bg-gray-100 dark:hover:bg-gray-700 text-gray-500 dark:text-gray-300"
                title="在此目录下新建文档"
                onClick={e => {
                  e.stopPropagation();
                  // 新建文档到当前目录下
                  const id = createNote({
                    title: '新文档',
                    content: '',
                    categoryId: selectedCategoryId,
                    type: 'doc',
                    parentId: folder.id
                  });
                  // 自动打开新建文档
                  addTab(id, '新文档');
                  activateTab(id);
                }}
              >
                <FilePlusIcon className="w-4 h-4" />
              </button>
            </div>
            {/* 目录下的笔记，折叠时隐藏，有动画 */}
            <div
              className={`pl-8 overflow-hidden transition-all duration-300 ${collapsedFolders[folder.id] ? 'max-h-0 opacity-0' : 'max-h-96 opacity-100'}`}
              style={{ pointerEvents: collapsedFolders[folder.id] ? 'none' : 'auto' }}
            >
              {(notesByParent[folder.id] || []).map(note => (
                <button
                  key={note.id}
                  draggable
                  onDragStart={() => handleDragStart(note.id)}
                  onDragEnd={handleDragEnd}
                  onClick={() => handleOpenNote(note.id)}
                  onContextMenu={e => handleNoteContextMenu(e, note)}
                  className={`w-full p-2 text-left flex items-center gap-2 rounded text-sm ${selectedNoteId === note.id ? 'bg-blue-50 dark:bg-blue-900/30 border-l-4 border-l-blue-500' : 'hover:bg-gray-50 dark:hover:bg-gray-700'}`}
                >
                  <FileTextIcon className="w-4 h-4 text-gray-400" />
                  <span className="truncate">{note.title || '无标题'}</span>
              </button>
            ))}
            </div>
          </div>
        ))}
        {/* 顶层普通笔记 */}
        <div className="divide-y divide-gray-200 dark:divide-gray-700">
          {rootDocs.map(note => (
            <button
              key={note.id}
              draggable
              onDragStart={() => handleDragStart(note.id)}
              onDragEnd={handleDragEnd}
              onClick={() => handleOpenNote(note.id)}
              onContextMenu={e => handleNoteContextMenu(e, note)}
              className={`w-full p-3 text-left flex items-center gap-2 text-sm ${selectedNoteId === note.id ? 'bg-blue-50 dark:bg-blue-900/30 border-l-4 border-l-blue-500' : 'hover:bg-gray-50 dark:hover:bg-gray-700'}`}
            >
              <FileTextIcon className="w-4 h-4 text-gray-400" />
              {/* 根目录文档标题字体与目录下文档一致，均为text-sm */}
              <span className="truncate">{note.title || '无标题'}</span>
            </button>
          ))}
        </div>
      </div>
    );
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

  // 恢复原来的renderSidebar内容
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
      {/* 分类列表 */}
      <div className="flex-1 overflow-auto">
        <Sidebar
          selectedCategoryId={selectedCategoryId}
          onSelectCategory={setSelectedCategoryIdWithLogging}
        />
      </div>
    </div>
  );

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
              className="bg-white dark:bg-gray-800 border-r border-gray-200 dark:border-gray-700"
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
