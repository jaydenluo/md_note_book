import React, { useMemo } from 'react'
import { useState, useEffect, useRef } from 'react'
import { storage } from '@services/storage'
import { useCategories } from '@stores/categoryStore'
import { useNotes } from '@stores/noteStore'
import { useTags } from '@stores/tagStore'
import { useTabs } from '@stores/tabsStore'
import { useConfig } from '@stores/configStore'
import { triggerGitAutoSync } from '@stores/noteStore'
import { motion, AnimatePresence } from 'framer-motion'
import { useTheme } from '@utils/theme'
import { useAutoCodeTheme } from '@utils/theme'
import { TabManager } from './components/TabManager'
import { NoteTab } from './components/NoteTab'
import { ResizablePanel } from './components/ui/ResizablePanel'
import { Sidebar } from './components/Sidebar'
import { ReminderBoard } from './components/ReminderBoard'
import { ReminderCardDialog, type ReminderCardFormValues } from './components/ReminderCardDialog'
import { setupContextMenu } from '@utils/contextMenu'
import { useAlertDialog } from '@/components/ui/alert-dialog'
import type { Note } from '@stores/noteStore'
import { useQuickSearch } from '@/components/QuickSearchDialog'
import { useUiModeStore } from '@stores/uiModeStore'
import { useReminderNotifications } from '@hooks/useReminderNotifications'

// Lucide 图标组件
import { Search, FileText, FileDown, Trash2 } from 'lucide-react'
import { ContextMenu, useContextMenu } from './components/ui/ContextMenu'
import type { ContextMenuItem } from './components/ui/ContextMenu'
import { ExportService } from './services/exportService'
// 统一导入自定义SVG图标
import { FolderIcon, FolderPlusIcon } from '@/components/icons'
// 补充自定义图标
import { FilePlusIcon, ChevronRightIcon, ChevronDownIcon, FileTextIcon } from '@/components/icons'

/**
 * 自定义菜单图标组件
 */
const MenuIcon = ({ className, size = 16 }: { className?: string; size?: number }) => (
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
    className={className}
  >
    <line x1="3" y1="12" x2="21" y2="12" />
    <line x1="3" y1="6" x2="21" y2="6" />
    <line x1="3" y1="18" x2="21" y2="18" />
  </svg>
);

function App() {
  const [selectedCategoryId, setSelectedCategoryId] = useState<string | null>(null)
  const [sidebarOpen, setSidebarOpen] = useState(true)
  const [searchQuery, setSearchQuery] = useState('')
  const [isMobileView, setIsMobileView] = useState(window.innerWidth < 768)
  const [isReminderDialogOpen, setIsReminderDialogOpen] = useState(false)
  const [editingReminderCard, setEditingReminderCard] = useState<Note | null>(null)
  
  const { contextMenu, showContextMenu, hideContextMenu } = useContextMenu();
  const deleteNote = useNotes(state => state.deleteNote)

  /**
   * 处理右键菜单点击
   */
  const handleContextMenuItemClick = async (item: ContextMenuItem) => {
    const note = (contextMenu.data as { note?: Note } | undefined)?.note
    if (!note) return;

    switch (item.id) {
      case 'delete': {
        const confirmed = await showConfirm({
          title: '确认删除',
          description: `确定要删除${note.type === 'folder' ? '目录' : '笔记'} "${note.title || '无标题'}" 吗？`
        });
        if (confirmed) {
          await deleteNote(note.id);
        }
        break;
      }
      case 'export-md':
        await ExportService.exportAsMarkdown(note.title, note.content || '');
        break;
      case 'export-pdf':
        await ExportService.exportAsPDF(note.title, note.content || '');
        break;
    }
  };

  /**
   * 生成右键菜单项
   */
  const getContextMenuItems = (note: Note): ContextMenuItem[] => {
    const items: ContextMenuItem[] = [
      {
        id: 'delete',
        label: '删除',
        icon: <Trash2 size={14} />,
        onClick: () => {}, // 统一在 handleContextMenuItemClick 处理
        danger: true
      }
    ];

    if (note.type === 'doc') {
      items.unshift(
        {
          id: 'export-md',
          label: '另存为 Markdown',
          icon: <FileDown size={14} />,
          onClick: () => {}
        },
        {
          id: 'export-pdf',
          label: '另存为 PDF',
          icon: <FileText size={14} />,
          onClick: () => {}
        }
      );
    }

    return items;
  };
  
  const titleInputRef = useRef<HTMLInputElement>(null)
  const contentTextareaRef = useRef<HTMLTextAreaElement>(null)
  const autoSaveTimerRef = useRef<number | null>(null)

  const loadCategories = useCategories(state => state.loadCategories)
  const loadNotes = useNotes(state => state.loadNotes)
  const loadNoteContent = useNotes(state => state.loadNoteContent)
  const loadTags = useTags(state => state.loadTags)
  const notes = useNotes(state => state.notes)
  const categories = useCategories(state => state.categories)
  const createNote = useNotes(state => state.createNote)
  const updateNote = useNotes(state => state.updateNote)
  const createCategory = useCategories(state => state.createCategory)
  const { isDark } = useTheme()
  const { showConfirm } = useAlertDialog()
  const uiMode = useUiModeStore(state => state.mode)

  useReminderNotifications(notes)
  
  // 获取配置
  const { config } = useConfig()
  
  // 从tabsStore获取标签相关状态和方法
  const tabs = useTabs(state => state.tabs)
  const activeTabId = useTabs(state => state.activeTabId)
  const addTab = useTabs(state => state.addTab)
  const closeTab = useTabs(state => state.closeTab)
  const closeAllTabs = useTabs(state => state.closeAllTabs)
  const activateTab = useTabs(state => state.activateTab)
  const getTabByNoteId = useTabs(state => state.getTabByNoteId)

  // 获取当前活动的笔记ID
  const activeTab = tabs.find(tab => tab.id === activeTabId)
  const selectedNoteId = activeTab?.noteId || null

  // 获取当前编辑的笔记
  const currentNote = selectedNoteId ? notes.find(note => note.id === selectedNoteId) : null

  // 记录selectedCategoryId变化
  const selectedCategoryIdRef = useRef(selectedCategoryId);

  /**
   * 打开指定笔记并自动切换标签
   */
  const handleOpenNote = (noteId: string) => {
    const note = notes.find(n => n.id === noteId);
    if (note) {
      const existingTab = getTabByNoteId(noteId);
      if (existingTab) {
        activateTab(existingTab.id);
      } else {
        addTab(noteId, note.title);
      }
      // 确保内容被加载
      loadNoteContent(noteId).catch(err => console.error('加载笔记内容失败:', err));
    }
    if (isMobileView) {
      setSidebarOpen(false)
    }
  }

  /**
   * 处理笔记拖拽开始
   */
  const [dragNoteId, setDragNoteId] = useState<string | null>(null);
  const [dragOverFolderId, setDragOverFolderId] = useState<string | null>(null);

  const handleDragStart = (noteId: string) => {
    setDragNoteId(noteId);
  };

  /**
   * 处理笔记拖拽结束
   */
  const handleDragEnd = () => {
    setDragNoteId(null);
    setDragOverFolderId(null);
  };

  /**
   * 处理在目录上方拖拽
   */
  const handleDragOverFolder = (folderId: string, e: React.DragEvent) => {
    e.preventDefault();
    setDragOverFolderId(folderId);
  };

  /**
   * 处理在目录下释放拖拽
   */
  const handleDropOnFolder = async (folderId: string) => {
    if (dragNoteId && dragNoteId !== folderId) {
      const note = notes.find(n => n.id === dragNoteId);
      if (note && note.type !== 'folder') {
        await updateNote(dragNoteId, { parentId: folderId });
      }
    }
    handleDragEnd();
  };

  /**
   * 处理在根目录释放拖拽
   */
  const handleDropOnRoot = async () => {
    if (dragNoteId) {
      const note = notes.find(n => n.id === dragNoteId);
      if (note && note.type !== 'folder') {
        // 使用 undefined 而不是 null 以匹配 Note 类型定义中的可选字段
        await updateNote(dragNoteId, { parentId: undefined });
      }
    }
    handleDragEnd();
  };

  /**
   * 新建文档并激活
   */
  const handleCreateDoc = () => {
    const id = createNote({
      title: '新文档',
      content: '',
      categoryId: selectedCategoryId || undefined,
      type: 'doc',
      parentId: (dragOverFolderId && dragOverFolderId !== 'root') ? (dragOverFolderId as string) : undefined
    });
    addTab(id, '新文档')
    activateTab(id)
  };

  /**
   * 新建目录
   */
  const handleCreateFolder = () => {
    const id = createNote({
      title: '新目录',
      content: '',
      categoryId: selectedCategoryId || undefined,
      type: 'folder',
      parentId: undefined
    });
    console.log('创建了新目录:', id);
  };

  // 目录折叠状态
  const [collapsedFolders, setCollapsedFolders] = useState<Record<string, boolean>>({});
  // 目录重命名状态
  const [editingFolderId, setEditingFolderId] = useState<string | null>(null);
  const [editingFolderName, setEditingFolderName] = useState('');
  const editFolderInputRef = useRef<HTMLInputElement>(null);

  /**
   * 切换目录折叠状态
   */
  const handleFolderClick = (folderId: string) => {
    setCollapsedFolders(prev => ({ ...prev, [folderId]: !prev[folderId] }));
  };

  /**
   * 双击开启目录重命名
   */
  const handleFolderDoubleClick = (folder: Note) => {
    setEditingFolderId(folder.id);
    setEditingFolderName(folder.title);
    setTimeout(() => editFolderInputRef.current?.focus(), 0);
  };

  /**
   * 保存目录重命名结果
   */
  const handleFolderNameSave = async (folderId: string) => {
    if (editingFolderName.trim()) {
      await updateNote(folderId, { title: editingFolderName.trim() });
    }
    setEditingFolderId(null);
    setEditingFolderName('');
  };

  /**
   * 初始化快速搜索功能
   */
  const { QuickSearchDialog } = useQuickSearch((noteId: string) => {
    handleOpenNote(noteId)
  })

  /**
   * 记录选中的分类 ID 变化并持久化
   */
  const setSelectedCategoryIdWithLogging = (id: string | null) => {
    setSelectedCategoryId(id);
    selectedCategoryIdRef.current = id;
    // 立即保存到 storage 以便下次启动恢复
    storage.saveSettings({ selectedCategoryId: id || undefined })
      .catch(err => console.error('持久化分类选择失败:', err));
  };

  /**
   * 当选中的分类ID改变时同步保存到存储
   */
  useEffect(() => {
    if (selectedCategoryId) {
      storage.saveSettings({ selectedCategoryId })
        .catch(error => console.error('保存分类选择失败:', error));
    }
  }, [selectedCategoryId]);

  /**
   * 筛选笔记列表
   */
  const handleCreateReminderCard = () => {
    setEditingReminderCard(null)
    setIsReminderDialogOpen(true)
  }

  const handleEditReminderCard = (note: Note) => {
    setEditingReminderCard(note)
    setIsReminderDialogOpen(true)
  }

  const handleSaveReminderCard = async (values: ReminderCardFormValues) => {
    const payload = {
      title: values.title.trim(),
      content: values.content,
      categoryId: values.categoryId || selectedCategoryId || undefined,
      dueDate: new Date(`${values.dueDate}T00:00:00`),
      reminderEnabled: values.reminderEnabled,
      type: 'reminder-card',
    } as const

    if (editingReminderCard) {
      await updateNote(editingReminderCard.id, payload)
    } else {
      createNote(payload)
    }

    setEditingReminderCard(null)
    setIsReminderDialogOpen(false)
  }

  const handleDeleteReminderCard = async () => {
    if (!editingReminderCard) return

    await deleteNote(editingReminderCard.id)
    setEditingReminderCard(null)
    setIsReminderDialogOpen(false)
  }

  const filteredNotes = useMemo(() => {
    return notes.filter(note => {
      if (note.type === 'reminder-card') {
        return false;
      }
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

  /**
   * 处理响应式设计，监听窗口大小变化
   */
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

  /**
   * 应用代码高亮主题
   */
  useAutoCodeTheme(config.codeTheme.light, config.codeTheme.dark, config.codeTheme.noBackground);

  /**
   * 应用暗色模式和代码高亮
   */
  useEffect(() => {
    document.documentElement.classList.toggle('dark', isDark);
    const currentTheme = isDark ? config.codeTheme.dark : config.codeTheme.light;
    import('@utils/theme').then(({ switchCodeTheme }) => {
      switchCodeTheme(currentTheme, config.codeTheme.noBackground);
    });
  }, [isDark, config.codeTheme.dark, config.codeTheme.light, config.codeTheme.noBackground]);

  /**
   * 禁用浏览器默认右键菜单
   */
  useEffect(() => {
    setupContextMenu();
  }, []);

  /**
   * 初始化应用数据：加载分类、笔记、标签并恢复选择状态
   */
  useEffect(() => {
    const initData = async () => {
      try {
        console.log('开始初始化应用数据...');
        await storage.init();
        
        // 1. 并发加载基础数据
        await Promise.all([
          loadCategories(),
          loadNotes(),
          loadTags()
        ]);

        // 2. 检查分类（一级目录）逻辑
        const currentCategories = useCategories.getState().categories;
        let targetCategoryId: string | null = null;

        // 获取上次保存的设置
        const settings = await storage.getSettings();
        const lastCategoryId = settings.selectedCategoryId;

        if (currentCategories.length === 0) {
          // 如果没有分类，创建一个默认目录
          console.log('没有找到分类，创建“默认目录”');
          targetCategoryId = await createCategory({ name: '默认目录' });
        } else {
          // 优先恢复上次选中的，如果不存在则选中第一个
          const exists = lastCategoryId && currentCategories.some(c => c.id === lastCategoryId);
          targetCategoryId = exists ? (lastCategoryId as string) : currentCategories[0].id;
        }

        // 设置选中的分类并同步到 Ref 和持久化存储
        if (targetCategoryId) {
          setSelectedCategoryId(targetCategoryId);
          selectedCategoryIdRef.current = targetCategoryId;
          await storage.saveSettings({ selectedCategoryId: targetCategoryId });
        }

        // 3. 恢复选中的笔记（二级目录）
        // Zustand persist 会自动恢复 tabs 数组和 activeTabId
        const currentTabs = useTabs.getState().tabs;
        const currentActiveTabId = useTabs.getState().activeTabId;
        const allNotesList = useNotes.getState().notes;

        // 恢复所有已打开标签的内容（确保文件系统懒加载内容就绪）
        if (currentTabs.length > 0) {
          console.log(`正在恢复 ${currentTabs.length} 个标签页内容...`);
          await Promise.all(currentTabs.map(tab => loadNoteContent(tab.noteId)));
        }

        if (currentActiveTabId && currentTabs.some(t => t.id === currentActiveTabId)) {
          // 如果有上次激活的标签，内容已加载，只需确保 UI 状态同步
          console.log('恢复上次激活的笔记状态:', currentActiveTabId);
        } else if (currentTabs.length > 0) {
          // 如果有打开的标签但没有激活的，激活第一个
          console.log('激活首个打开的标签:', currentTabs[0].id);
          activateTab(currentTabs[0].id);
        } else {
          // 如果没有任何打开的标签，尝试自动选中当前分类下的第一篇笔记
          const categoryNotes = allNotesList.filter(
            n => n.categoryId === targetCategoryId && n.type !== 'folder' && n.type !== 'reminder-card'
          );
          if (categoryNotes.length > 0) {
            const firstNote = categoryNotes[0];
            console.log('自动选中分类下的第一条笔记:', firstNote.id);
            handleOpenNote(firstNote.id);
          }
        }

        console.log('应用数据初始化完成');

        // 方案A：启动后自动同步一次（若已配置且开启 autoSync）
        triggerGitAutoSync('app_start').catch(err => console.error('启动自动同步失败:', err))
      } catch (error) {
        console.error('初始化数据失败:', error);
      }
    };
    
    initData();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []); // 仅在挂载时执行一次核心初始化逻辑

  /**
   * 当选中的分类被删除时，重置选中状态
   */
  useEffect(() => {
    if (
      selectedCategoryId && 
      notes.length > 0 && 
      !categories.some(c => c.id === selectedCategoryId)
    ) {
      console.log('选中的分类已被删除，重置选中状态');
      setSelectedCategoryIdWithLogging(categories.length > 0 ? categories[0].id : null);
    }
  }, [notes, categories, selectedCategoryId]);

  /**
   * 增加右键处理
   */
  const handleNoteRightClick = (e: React.MouseEvent, note: Note) => {
    showContextMenu(e, 'note', { note });
  };

  /**
   * 渲染二级笔记列表
   */
  const renderNoteList = () => {
    const folders = filteredNotes.filter(n => n.type === 'folder' && !n.parentId);
    const rootDocs = filteredNotes.filter(n => n.type !== 'folder' && !n.parentId);
    const notesByParent: Record<string, typeof filteredNotes> = {};
    filteredNotes.forEach(n => {
      if (n.parentId) {
        if (!notesByParent[n.parentId]) notesByParent[n.parentId] = [];
        notesByParent[n.parentId].push(n);
      }
    });

    return (
    <div className="flex flex-col h-full min-h-0 bg-white dark:bg-gray-800">
      <div className="h-9 py-0 px-3 border-b border-gray-200 dark:border-gray-700 flex items-center justify-between">
      <div className="flex">
      <button 
              className="p-1 rounded hover:bg-gray-100 dark:hover:bg-gray-700 text-gray-600 dark:text-gray-300"
              onClick={() => setSidebarOpen(!sidebarOpen)}
            >
            <MenuIcon className="h-5 w-5" />
            </button>
        <h2 className="font-medium dark:text-white truncate max-w-[150px]" title={selectedCategoryId 
            ? `${categories.find(c => c.id === selectedCategoryId)?.name || '未知分类'} (${filteredNotes.length})`
            : `所有笔记 (${filteredNotes.length})`}>
          {selectedCategoryId 
            ? `${categories.find(c => c.id === selectedCategoryId)?.name || '未知分类'} (${filteredNotes.length})`
            : `所有笔记 (${filteredNotes.length})`}
        </h2>
      </div>

          <div className="flex space-x-2">
        <button 
              onClick={handleCreateDoc}
          className="p-1.5 rounded hover:bg-gray-100 dark:hover:bg-gray-700 text-gray-600 dark:text-gray-300"
              title="新建文档"
            >
              <FilePlusIcon className="h-4 w-4" />
            </button>
            <button
              onClick={handleCreateFolder}
              className="p-1.5 rounded hover:bg-gray-100 dark:hover:bg-gray-700 text-blue-600 dark:text-blue-300"
              title="新建目录"
            >
              <FolderPlusIcon className="h-4 w-4" />
        </button>
      </div>
        </div>

        <div className="flex-1 min-h-0 overflow-auto">
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
                onContextMenu={(e) => handleNoteRightClick(e, folder)}
              >
                <span className="transition-transform duration-200 mr-1">
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
                  <span className="font-semibold text-blue-700 dark:text-blue-300 truncate max-w-[120px] inline-block text-sm" title={folder.title}>{folder.title}</span>
                )}
                <button
                  className="ml-auto p-1 rounded hover:bg-gray-100 dark:hover:bg-gray-700 text-gray-500 dark:text-gray-300"
                  title="在此目录下新建文档"
                  onClick={e => {
                    e.stopPropagation();
                    const id = createNote({
                      title: '新文档',
                      content: '',
                      categoryId: selectedCategoryId || undefined,
                      type: 'doc',
                      parentId: folder.id
                    });
                    addTab(id, '新文档');
                    activateTab(id);
                  }}
                >
                  <FilePlusIcon className="w-4 h-4" />
                </button>
              </div>
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
                    onContextMenu={(e) => handleNoteRightClick(e, note)}
                    className={`w-full p-2 text-left flex items-center gap-2 rounded text-sm ${selectedNoteId === note.id ? 'bg-blue-50 dark:bg-blue-900/30 border-l-4 border-l-blue-500' : 'hover:bg-gray-50 dark:hover:bg-gray-700'}`}
                  >
                    <FileTextIcon className="w-4 h-4 text-gray-400 flex-shrink-0" />
                    <span className="truncate max-w-[180px] inline-block" title={note.title || '无标题'}>{note.title || '无标题'}</span>
                </button>
              ))}
              </div>
            </div>
          ))}
          <div className="divide-y divide-gray-200 dark:divide-gray-700">
            {rootDocs.map(note => (
              <button
                key={note.id}
                draggable
                onDragStart={() => handleDragStart(note.id)}
                onDragEnd={handleDragEnd}
                onClick={() => handleOpenNote(note.id)}
                onContextMenu={(e) => handleNoteRightClick(e, note)}
                className={`w-full p-3 text-left flex items-center gap-2 text-sm ${selectedNoteId === note.id ? 'bg-blue-50 dark:bg-blue-900/30 border-l-4 border-l-blue-500' : 'hover:bg-gray-50 dark:hover:bg-gray-700'}`}
              >
                <FileTextIcon className="w-4 h-4 text-gray-400 flex-shrink-0" />
                <span className="truncate max-w-[180px] inline-block" title={note.title || '无标题'}>{note.title || '无标题'}</span>
              </button>
            ))}
          </div>
        </div>

        <div className="w-full aspect-video border-t border-gray-200 dark:border-gray-700 bg-gray-50 dark:bg-gray-900/30 flex items-center justify-center text-xs text-gray-400">
          广告位（16:9占位）
        </div>
      </div>
    );
  };

  /**
   * 渲染主内容区域（包含标签页和笔记内容）
   */
  const renderNoteContent = () => (
    <div className="flex flex-col h-full bg-gray-50 dark:bg-gray-900">
      <TabManager 
        activeTabId={activeTabId}
        onTabChange={activateTab}
        onTabClose={closeTab}
        onTabCloseAll={closeAllTabs}
        onTabActivate={handleTabActivate}
      />
      <div className="flex-1 overflow-auto">
        {!selectedNoteId ? (
          <div className="flex flex-col items-center justify-center h-full text-gray-400 dark:text-gray-400 bg-gray-50 dark:bg-gray-800">
            <div className="mb-6">
              <span className="inline-flex items-center justify-center w-24 h-24 rounded-full bg-blue-50 dark:bg-blue-900/40 shadow-lg mb-4">
                <svg width="56" height="56" fill="none" viewBox="0 0 56 56"><rect width="56" height="56" rx="16" fill="#3B82F6" fillOpacity="0.08"/><path d="M16 20a4 4 0 0 1 4-4h16a4 4 0 0 1 4 4v16a4 4 0 0 1-4 4H20a4 4 0 0 1-4-4V20Z" fill="#3B82F6" fillOpacity="0.15"/><rect x="20" y="24" width="16" height="2.5" rx="1.25" fill="#3B82F6"/><rect x="20" y="29" width="10" height="2.5" rx="1.25" fill="#3B82F6"/></svg>
              </span>
            </div>
            <div className="text-center">
              <div className="text-2xl font-bold mb-2 text-gray-700 dark:text-gray-200">没有笔记被打开</div>
              <div className="text-base mb-6 text-gray-500 dark:text-gray-400">请选择左侧的笔记，或新建一篇笔记开始记录。</div>
              <button
                onClick={handleCreateDoc}
                className="px-6 py-2 rounded-md bg-blue-500 hover:bg-blue-600 text-white font-medium shadow transition-colors"
              >
                + 创建新笔记
              </button>
            </div>
          </div>
        ) : (
          <div className="h-full">
            {(() => {
              const activeTab = tabs.find(tab => tab.id === activeTabId);
              return activeTab ? (<NoteTab noteId={activeTab.noteId} />) : null;
            })()}
          </div>
        )}
      </div>
    </div>
  )

  /**
   * 渲染左侧导航栏
   */
  const renderSidebar = () => (
    <div className="flex flex-col h-full bg-white dark:bg-gray-800">
      {/* 搜索框 */}
      <div className="h-9 p-1 border-b border-gray-200 dark:border-gray-700 flex items-center">
        <div className="relative flex-1">
          <div className="absolute left-2 top-1/2 transform -translate-y-1/2 text-gray-400">
            <Search className="h-3.5 w-3.5" />
          </div>
          <input
            type="text"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="搜索笔记..."
            className="w-full pl-8 pr-4 py-1 h-7 bg-gray-100 dark:bg-gray-700 rounded-md border-none dark:text-white text-sm focus:ring-1 focus:ring-blue-500"
          />
        </div>
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

  /**
   * 定时自动保存当前笔记内容
   */
  useEffect(() => {
    if (autoSaveTimerRef.current) {
      window.clearInterval(autoSaveTimerRef.current);
      autoSaveTimerRef.current = null;
    }
    
    if (config.autoSaveInterval > 0) {
      autoSaveTimerRef.current = window.setInterval(() => {
        if (selectedNoteId && currentNote) {
          const titleInput = titleInputRef.current;
          const contentTextarea = contentTextareaRef.current;
          
          if (titleInput || contentTextarea) {
            const updateData: Partial<Note> = {};
            if (titleInput && titleInput.value !== currentNote.title) {
              updateData.title = titleInput.value;
            }
            if (contentTextarea && contentTextarea.value !== currentNote.content) {
              updateData.content = contentTextarea.value;
            }
            if (Object.keys(updateData).length > 0) {
              updateNote(selectedNoteId, updateData);
            }
          }
        }
      }, config.autoSaveInterval);
    }
    
    return () => {
      if (autoSaveTimerRef.current) {
        window.clearInterval(autoSaveTimerRef.current);
      }
    };
  }, [config.autoSaveInterval, selectedNoteId, currentNote, updateNote]);

  /**
   * 处理标签激活时同步加载笔记详情
   */
  const handleTabActivate = async (noteId: string): Promise<void> => {
    const note = notes.find(n => n.id === noteId);
    const isNewNote = note && note.createdAt.getTime() > Date.now() - 5000;
    
    if (!isNewNote) {
      await loadNoteContent(noteId);
    }
  };

  // 桌面布局渲染
  if (!isMobileView) {
    return (
      <div className="flex h-screen bg-gray-100 dark:bg-gray-900 overflow-hidden">
        <div 
          className="grid h-full w-full" 
          style={{ 
            gridTemplateColumns: sidebarOpen
              ? uiMode === 'reminder'
                ? 'auto 1fr'
                : 'auto auto 1fr'
              : uiMode === 'reminder'
                ? '1fr'
                : 'auto 1fr',
            transition: 'grid-template-columns 0.3s ease'
          }}
        >
          {/* 一级菜单 (Sidebar) */}
          <AnimatePresence>
            {sidebarOpen && (
              <ResizablePanel
                id="sidebar-panel"
                defaultWidth={250}
                minWidth={200}
                maxWidth={400}
                direction="left"
                className="h-full bg-white dark:bg-gray-800 border-r border-gray-200 dark:border-gray-700 z-20 overflow-hidden"
              >
                {renderSidebar()}
              </ResizablePanel>
            )}
          </AnimatePresence>
          
          {/* 二级菜单 (NoteList) */}
          <ResizablePanel
            id="note-list-panel"
            defaultWidth={320}
            minWidth={280}
            maxWidth={500}
            direction="left"
            className={`${uiMode === 'reminder' ? 'hidden' : 'h-full'} bg-white dark:bg-gray-800 border-r border-gray-200 dark:border-gray-700 z-10 overflow-hidden`}
          >
            {uiMode === 'document' ? renderNoteList() : null}
          </ResizablePanel>
          
          {/* 主内容区 (Editor) */}
          <div className="min-w-0 h-full bg-white dark:bg-gray-800 relative w-full overflow-hidden">
            {uiMode === 'document' ? (
              renderNoteContent()
            ) : (
              <ReminderBoard
                selectedCategoryId={selectedCategoryId}
                notes={notes}
                categories={categories}
                onCreateCard={handleCreateReminderCard}
                onEditCard={handleEditReminderCard}
              />
            )}
          </div>
        </div>
        
        <QuickSearchDialog />
        <ReminderCardDialog
          open={isReminderDialogOpen}
          note={editingReminderCard}
          categories={categories}
          onOpenChange={(open) => {
            setIsReminderDialogOpen(open)
            if (!open) {
              setEditingReminderCard(null)
            }
          }}
          onSave={handleSaveReminderCard}
          onDelete={editingReminderCard ? handleDeleteReminderCard : undefined}
        />
        
        <ContextMenu
          visible={contextMenu.visible}
          x={contextMenu.x}
          y={contextMenu.y}
          items={contextMenu.data?.note ? getContextMenuItems(contextMenu.data.note).map(item => ({
            ...item,
            onClick: () => {
              // 执行具体的业务逻辑
              handleContextMenuItemClick(item);
              // 关闭菜单
              hideContextMenu();
            }
          })) : []}
          onClose={hideContextMenu}
        />
      </div>
    )
  }
  
  // 移动布局渲染
  return (
    <div className="flex flex-col h-screen bg-gray-100 dark:bg-gray-900">
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
      
      <div className="flex flex-col flex-1">
        {uiMode === 'document' && tabs.length > 0 && (
          <TabManager 
            activeTabId={activeTabId}
            onTabChange={activateTab}
            onTabClose={closeTab}
            onTabCloseAll={closeAllTabs}
            onTabActivate={handleTabActivate}
          />
        )}
        
        {uiMode === 'reminder' ? (
          <ReminderBoard
            selectedCategoryId={selectedCategoryId}
            notes={notes}
            categories={categories}
            onCreateCard={handleCreateReminderCard}
            onEditCard={handleEditReminderCard}
          />
        ) : selectedNoteId ? (
          <div className="flex-1 overflow-hidden">
            <NoteTab noteId={selectedNoteId} />
          </div>
        ) : (
          renderNoteList()
        )}
      </div>
      
      <QuickSearchDialog />
      <ReminderCardDialog
        open={isReminderDialogOpen}
        note={editingReminderCard}
        categories={categories}
        onOpenChange={(open) => {
          setIsReminderDialogOpen(open)
          if (!open) {
            setEditingReminderCard(null)
          }
        }}
        onSave={handleSaveReminderCard}
        onDelete={editingReminderCard ? handleDeleteReminderCard : undefined}
      />

      <ContextMenu
        visible={contextMenu.visible}
        x={contextMenu.x}
        y={contextMenu.y}
        items={contextMenu.data?.note ? getContextMenuItems(contextMenu.data.note).map(item => ({
          ...item,
          onClick: () => {
            handleContextMenuItemClick(item);
            hideContextMenu();
          }
        })) : []}
        onClose={hideContextMenu}
      />
    </div>
  )
}

export default App
