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

  const getNoteListContextMenuItems = (): ContextMenuItem[] => [
    {
      id: 'create-doc',
      label: '新建文档',
      icon: <FilePlusIcon className="h-4 w-4" />,
      onClick: handleCreateDoc,
    },
    {
      id: 'create-folder',
      label: '新建文件夹',
      icon: <FolderPlusIcon className="h-4 w-4" />,
      onClick: handleCreateFolder,
    },
  ];
  
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
        if (tabs.length >= 10 && tabs[0]) {
          window.dispatchEvent(
            new CustomEvent('notebook:flush-tab-before-close', {
              detail: { noteId: tabs[0].noteId },
            }),
          )
        }
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
    if (tabs.length >= 10 && tabs[0]) {
      window.dispatchEvent(
        new CustomEvent('notebook:flush-tab-before-close', {
          detail: { noteId: tabs[0].noteId },
        }),
      )
    }
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

  const handleNoteListRightClick = (e: React.MouseEvent) => {
    showContextMenu(e, 'note-list');
  };

  /**
   * 渲染二级笔记列表
   */
  const renderNoteList = () => {
    const folders = filteredNotes.filter(n => n.type === 'folder' && !n.parentId);
    const rootDocs = filteredNotes.filter(n => n.type !== 'folder' && !n.parentId);
    const currentCategoryName = selectedCategoryId
      ? categories.find(c => c.id === selectedCategoryId)?.name || '未知分类'
      : '所有笔记';
    const totalDisplayedDocs = filteredNotes.filter(n => n.type !== 'folder').length;
    const notesByParent: Record<string, typeof filteredNotes> = {};
    filteredNotes.forEach(n => {
      if (n.parentId) {
        if (!notesByParent[n.parentId]) notesByParent[n.parentId] = [];
        notesByParent[n.parentId].push(n);
      }
    });

    return (
    <div className="flex h-full min-h-0 flex-col bg-transparent" onContextMenu={handleNoteListRightClick}>
      <div className="border-b border-slate-200/70 bg-white/70 px-4 pb-4 pt-4 backdrop-blur-xl dark:border-white/10 dark:bg-slate-950/40">
        <div className="flex items-start justify-between gap-3">
          <div className="min-w-0 flex-1">
            <div className="flex items-center gap-2">
              <button
                className="inline-flex h-9 w-9 items-center justify-center rounded-2xl border border-slate-200/70 bg-white/80 text-slate-600 shadow-sm transition-all hover:-translate-y-0.5 hover:bg-white dark:border-white/10 dark:bg-slate-900/70 dark:text-slate-300 dark:hover:bg-slate-900"
                onClick={() => setSidebarOpen(!sidebarOpen)}
                title={sidebarOpen ? '收起侧边栏' : '展开侧边栏'}
              >
                <MenuIcon className="h-4.5 w-4.5" />
              </button>
              <span className="inline-flex items-center rounded-full bg-teal-500/12 px-3 py-1 text-[11px] font-semibold tracking-[0.22em] text-teal-700 dark:bg-teal-400/12 dark:text-teal-200">
                WORKSPACE
              </span>
            </div>
            <h2
              className="mt-3 truncate text-lg font-semibold tracking-tight text-slate-900 dark:text-white"
              title={selectedCategoryId ? `${currentCategoryName} (${filteredNotes.length})` : `所有笔记 (${filteredNotes.length})`}
            >
              {currentCategoryName}
            </h2>
            <p className="mt-1 text-sm text-slate-500 dark:text-slate-400">
              {folders.length} 个目录 · {totalDisplayedDocs} 篇笔记
            </p>
          </div>

          <div className="flex items-center gap-2">
            <button
              onClick={handleCreateDoc}
              className="inline-flex h-10 items-center gap-2 rounded-2xl border border-slate-200/70 bg-white/85 px-3 text-sm font-medium text-slate-700 shadow-sm transition-all hover:-translate-y-0.5 hover:bg-white dark:border-white/10 dark:bg-slate-900/70 dark:text-slate-200 dark:hover:bg-slate-900"
              title="新建文档"
            >
              <FilePlusIcon className="h-4 w-4" />
              <span className="hidden sm:inline">文档</span>
            </button>
            <button
              onClick={handleCreateFolder}
              className="inline-flex h-10 items-center gap-2 rounded-2xl bg-slate-950 px-3 text-sm font-medium text-white shadow-lg shadow-slate-950/10 transition-all hover:-translate-y-0.5 hover:bg-slate-800 dark:bg-teal-500 dark:text-slate-950 dark:shadow-teal-500/20 dark:hover:bg-teal-400"
              title="新建目录"
            >
              <FolderPlusIcon className="h-4 w-4" />
              <span className="hidden sm:inline">目录</span>
            </button>
          </div>
        </div>
      </div>

      <div className="min-h-0 flex-1 overflow-auto px-3 py-3">
        {dragNoteId && (
          <div
            className={`mb-3 rounded-2xl border border-dashed px-4 py-3 text-sm text-slate-500 transition-colors dark:text-slate-300 ${
              dragOverFolderId === 'root'
                ? 'border-teal-300 bg-teal-50 text-teal-700 dark:border-teal-400/40 dark:bg-teal-500/10 dark:text-teal-200'
                : 'border-slate-300/80 bg-white/70 dark:border-slate-700 dark:bg-slate-900/50'
            }`}
            onDragOver={e => { e.preventDefault(); setDragOverFolderId('root'); }}
            onDrop={handleDropOnRoot}
            onDragLeave={() => setDragOverFolderId(null)}
          >
            拖到这里可放到根目录
          </div>
        )}

        {filteredNotes.length === 0 ? (
          <div className="flex min-h-[280px] flex-col items-center justify-center rounded-[28px] border border-dashed border-slate-300/80 bg-white/65 px-6 text-center dark:border-slate-700 dark:bg-slate-900/50">
            <div className="flex h-16 w-16 items-center justify-center rounded-2xl bg-teal-500/10 text-teal-600 dark:bg-teal-400/10 dark:text-teal-200">
              <FileText size={28} />
            </div>
            <div className="mt-5 text-lg font-semibold text-slate-900 dark:text-white">这里还没有内容</div>
            <p className="mt-2 max-w-sm text-sm leading-6 text-slate-500 dark:text-slate-400">
              可以先创建文档或目录，再把资料按主题归类，后面检索会更顺手。
            </p>
          </div>
        ) : (
          <>
          <div className="space-y-3">
            {folders.map(folder => (
              <div
                key={folder.id}
                className={`overflow-hidden rounded-[24px] border bg-white/78 shadow-sm transition-all dark:bg-slate-900/60 ${
                  dragOverFolderId === folder.id
                    ? 'border-teal-300 shadow-lg shadow-teal-500/10 dark:border-teal-400/40'
                    : 'border-slate-200/70 dark:border-white/10'
                }`}
                onDragOver={e => handleDragOverFolder(folder.id, e)}
                onDrop={() => handleDropOnFolder(folder.id)}
                onDragLeave={() => setDragOverFolderId(null)}
              >
                <div
                  className="flex items-center gap-2 px-4 py-3.5"
                  onClick={() => handleFolderClick(folder.id)}
                  onDoubleClick={() => handleFolderDoubleClick(folder)}
                  onContextMenu={(e) => handleNoteRightClick(e, folder)}
                >
                  <button
                    type="button"
                    className="inline-flex h-7 w-7 items-center justify-center rounded-xl text-slate-500 transition-colors hover:bg-slate-100 dark:text-slate-400 dark:hover:bg-slate-800"
                    title={collapsedFolders[folder.id] ? '展开目录' : '收起目录'}
                  >
                    <span className="transition-transform duration-200">
                      {collapsedFolders[folder.id] ? <ChevronRightIcon size={16} /> : <ChevronDownIcon size={16} />}
                    </span>
                  </button>
                  <div className="flex h-9 w-9 items-center justify-center rounded-2xl bg-teal-500/10 text-teal-700 dark:bg-teal-400/10 dark:text-teal-200">
                    <FolderIcon className="h-4 w-4" />
                  </div>
                  <div className="min-w-0 flex-1">
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
                        className="w-full rounded-xl border border-teal-300 bg-white px-3 py-1.5 text-sm text-slate-800 outline-none dark:border-teal-400/40 dark:bg-slate-950 dark:text-slate-100"
                        autoFocus
                      />
                    ) : (
                      <>
                        <div className="truncate text-sm font-semibold text-slate-900 dark:text-slate-100" title={folder.title}>
                          {folder.title}
                        </div>
                        <div className="mt-0.5 text-xs text-slate-500 dark:text-slate-400">
                          {(notesByParent[folder.id] || []).length} 篇文档
                        </div>
                      </>
                    )}
                  </div>
                  <button
                    className="inline-flex h-9 w-9 items-center justify-center rounded-2xl border border-slate-200/70 bg-white/70 text-slate-500 transition-all hover:-translate-y-0.5 hover:bg-white dark:border-white/10 dark:bg-slate-900/70 dark:text-slate-300 dark:hover:bg-slate-900"
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
                      if (tabs.length >= 10 && tabs[0]) {
                        window.dispatchEvent(
                          new CustomEvent('notebook:flush-tab-before-close', {
                            detail: { noteId: tabs[0].noteId },
                          }),
                        )
                      }
                      addTab(id, '新文档');
                      activateTab(id);
                    }}
                  >
                    <FilePlusIcon className="h-4 w-4" />
                  </button>
                </div>
                <div
                  className={`overflow-hidden px-2 pb-2 transition-all duration-300 ${collapsedFolders[folder.id] ? 'max-h-0 opacity-0' : 'max-h-96 opacity-100'}`}
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
                      className={`mb-1.5 flex w-full items-center gap-3 rounded-2xl px-3 py-3 text-left text-sm transition-all ${
                        selectedNoteId === note.id
                          ? 'bg-teal-50 text-teal-900 shadow-sm ring-1 ring-teal-200 dark:bg-teal-500/10 dark:text-teal-50 dark:ring-teal-400/20'
                          : 'text-slate-700 hover:bg-slate-100/80 dark:text-slate-200 dark:hover:bg-slate-800/80'
                      }`}
                    >
                      <div className="flex h-8 w-8 items-center justify-center rounded-xl bg-slate-100 text-slate-500 dark:bg-slate-800 dark:text-slate-400">
                        <FileTextIcon className="h-4 w-4 flex-shrink-0" />
                      </div>
                      <span className="truncate" title={note.title || '无标题'}>{note.title || '无标题'}</span>
                    </button>
                  ))}
                </div>
              </div>
            ))}
          </div>
          {rootDocs.length > 0 && (
            <div className="mt-4 overflow-hidden rounded-[24px] border border-slate-200/70 bg-white/78 shadow-sm dark:border-white/10 dark:bg-slate-900/60">
              <div className="px-4 pb-2 pt-4 text-[11px] font-semibold uppercase tracking-[0.22em] text-slate-500 dark:text-slate-400">
                Documents
              </div>
              <div className="space-y-1 px-2 pb-2">
                {rootDocs.map(note => (
                  <button
                    key={note.id}
                    draggable
                    onDragStart={() => handleDragStart(note.id)}
                    onDragEnd={handleDragEnd}
                    onClick={() => handleOpenNote(note.id)}
                    onContextMenu={(e) => handleNoteRightClick(e, note)}
                    className={`flex w-full items-center gap-3 rounded-2xl px-3 py-3 text-left text-sm transition-all ${
                      selectedNoteId === note.id
                        ? 'bg-teal-50 text-teal-900 shadow-sm ring-1 ring-teal-200 dark:bg-teal-500/10 dark:text-teal-50 dark:ring-teal-400/20'
                        : 'text-slate-700 hover:bg-slate-100/80 dark:text-slate-200 dark:hover:bg-slate-800/80'
                    }`}
                  >
                    <div className="flex h-8 w-8 items-center justify-center rounded-xl bg-slate-100 text-slate-500 dark:bg-slate-800 dark:text-slate-400">
                      <FileTextIcon className="h-4 w-4 flex-shrink-0" />
                    </div>
                    <span className="truncate" title={note.title || '无标题'}>{note.title || '无标题'}</span>
                  </button>
                ))}
              </div>
            </div>
          )}
          </>
        )}
      </div>

      <div className="border-t border-slate-200/70 p-4 dark:border-white/10">
        <div className="rounded-[24px] border border-slate-200/70 bg-gradient-to-br from-white to-teal-50/70 p-4 dark:border-white/10 dark:bg-gradient-to-br dark:from-slate-900 dark:to-teal-500/5">
          <div className="flex items-center justify-between text-[11px] font-semibold uppercase tracking-[0.18em] text-slate-500 dark:text-slate-400">
            <span>整理建议</span>
            <span>16:9 · {totalDisplayedDocs} / {folders.length}</span>
          </div>
          <p className="mt-2 text-sm leading-6 text-slate-600 dark:text-slate-300">
            拖拽笔记到目录里整理结构，右键空白区域可以快速新建内容。
          </p>
        </div>
      </div>
    </div>
    );
  };

  /**
   * 渲染主内容区域（包含标签页和笔记内容）
   */
  const renderNoteContent = () => (
    <div className="flex h-full flex-col bg-transparent">
      <div className="flex h-full min-h-0 flex-col rounded-[28px] border border-white/60 bg-white/72 shadow-[0_20px_80px_-40px_rgba(15,23,42,0.45)] backdrop-blur-xl dark:border-white/5 dark:bg-slate-950/72">
        <TabManager 
          activeTabId={activeTabId}
          onTabChange={activateTab}
          onTabClose={closeTab}
          onTabCloseAll={closeAllTabs}
          onTabActivate={handleTabActivate}
        />
        <div className="min-h-0 flex-1 overflow-hidden p-4">
        {!selectedNoteId ? (
          <div className="flex h-full flex-col items-center justify-center rounded-[24px] border border-dashed border-slate-300/80 bg-[radial-gradient(circle_at_top,_rgba(20,184,166,0.12),transparent_45%),rgba(255,255,255,0.8)] px-6 text-center dark:border-slate-700 dark:bg-[radial-gradient(circle_at_top,_rgba(45,212,191,0.12),transparent_40%),rgba(2,6,23,0.72)]">
            <div className="mb-6">
              <span className="mb-4 inline-flex items-center justify-center rounded-[28px] bg-teal-500/10 p-6 shadow-lg shadow-teal-500/10 dark:bg-teal-400/10 dark:shadow-teal-500/5">
                <svg width="56" height="56" fill="none" viewBox="0 0 56 56"><rect width="56" height="56" rx="16" fill="#3B82F6" fillOpacity="0.08"/><path d="M16 20a4 4 0 0 1 4-4h16a4 4 0 0 1 4 4v16a4 4 0 0 1-4 4H20a4 4 0 0 1-4-4V20Z" fill="#3B82F6" fillOpacity="0.15"/><rect x="20" y="24" width="16" height="2.5" rx="1.25" fill="#3B82F6"/><rect x="20" y="29" width="10" height="2.5" rx="1.25" fill="#3B82F6"/></svg>
              </span>
            </div>
            <div className="text-center">
              <div className="mb-2 text-2xl font-bold tracking-tight text-slate-800 dark:text-slate-100">没有笔记被打开</div>
              <div className="mb-6 text-base text-slate-500 dark:text-slate-400">请选择左侧的笔记，或新建一篇笔记开始记录。</div>
              <button
                onClick={handleCreateDoc}
                className="rounded-2xl bg-slate-950 px-6 py-3 text-sm font-medium text-white shadow-lg shadow-slate-950/10 transition-all hover:-translate-y-0.5 hover:bg-slate-800 dark:bg-teal-500 dark:text-slate-950 dark:shadow-teal-500/20 dark:hover:bg-teal-400"
              >
                + 创建新笔记
              </button>
            </div>
          </div>
        ) : (
          <div className="h-full overflow-hidden rounded-[24px] border border-slate-200/70 bg-white/82 shadow-inner shadow-slate-200/60 dark:border-white/10 dark:bg-slate-950/82 dark:shadow-black/20">
            {(() => {
              const activeTab = tabs.find(tab => tab.id === activeTabId);
              return activeTab ? (<NoteTab noteId={activeTab.noteId} />) : null;
            })()}
          </div>
        )}
        </div>
      </div>
    </div>
  )

  /**
   * 渲染左侧导航栏
   */
  const renderSidebar = () => (
    <div className="flex h-full flex-col bg-transparent">
      <div className="border-b border-slate-200/70 bg-white/70 px-4 pb-4 pt-4 backdrop-blur-xl dark:border-white/10 dark:bg-slate-950/40">
        <div className="flex items-center gap-3">
          <div className="flex h-11 w-11 items-center justify-center rounded-[18px] bg-gradient-to-br from-teal-500 via-cyan-500 to-slate-900 text-sm font-bold text-white shadow-lg shadow-teal-500/20 dark:to-slate-800">
            M
          </div>
          <div className="min-w-0">
            <div className="truncate text-sm font-semibold text-slate-900 dark:text-white">Muse Note</div>
            <div className="text-xs text-slate-500 dark:text-slate-400">{notes.length} 项资料正在整理</div>
          </div>
        </div>

        <div className="relative mt-4">
          <div className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-slate-400">
            <Search className="h-4 w-4" />
          </div>
          <input
            type="text"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="搜索笔记..."
            className="h-11 w-full rounded-2xl border border-slate-200/70 bg-white/85 pl-10 pr-4 text-sm text-slate-700 outline-none transition-all focus:border-teal-300 focus:ring-2 focus:ring-teal-500/15 dark:border-white/10 dark:bg-slate-900/70 dark:text-slate-100 dark:focus:border-teal-400/40"
          />
        </div>
      </div>
      <div className="min-h-0 flex-1 overflow-auto">
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
      <div className="flex h-screen overflow-hidden bg-[radial-gradient(circle_at_top_left,_rgba(20,184,166,0.16),transparent_28%),linear-gradient(180deg,#f8fbfb_0%,#eef2f7_48%,#e8edf5_100%)] dark:bg-[radial-gradient(circle_at_top_left,_rgba(45,212,191,0.18),transparent_22%),linear-gradient(180deg,#0f172a_0%,#020617_100%)]">
        <div 
          className="grid h-full w-full gap-3 p-3" 
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
                className="z-20 h-full overflow-hidden rounded-[28px] border border-white/60 bg-white/72 shadow-[0_20px_80px_-40px_rgba(15,23,42,0.45)] backdrop-blur-xl dark:border-white/5 dark:bg-slate-950/76"
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
            className={`${uiMode === 'reminder' ? 'hidden' : 'h-full'} z-10 overflow-hidden rounded-[28px] border border-white/60 bg-white/72 shadow-[0_20px_80px_-40px_rgba(15,23,42,0.45)] backdrop-blur-xl dark:border-white/5 dark:bg-slate-950/76`}
          >
            {uiMode === 'document' ? renderNoteList() : null}
          </ResizablePanel>
          
          {/* 主内容区 (Editor) */}
          <div className="relative h-full min-w-0 w-full overflow-hidden">
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
          items={contextMenu.type === 'note-list'
            ? getNoteListContextMenuItems()
            : contextMenu.data?.note ? getContextMenuItems(contextMenu.data.note).map(item => ({
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
  
  // 移动布局渲染
  return (
    <div className="flex h-screen flex-col overflow-hidden bg-[radial-gradient(circle_at_top_left,_rgba(20,184,166,0.16),transparent_28%),linear-gradient(180deg,#f8fbfb_0%,#eef2f7_48%,#e8edf5_100%)] dark:bg-[radial-gradient(circle_at_top_left,_rgba(45,212,191,0.18),transparent_22%),linear-gradient(180deg,#0f172a_0%,#020617_100%)]">
      {sidebarOpen && (
        <div className="fixed inset-0 z-40 bg-slate-950/35 backdrop-blur-sm" onClick={() => setSidebarOpen(false)}>
          <motion.div
            initial={{ x: -300 }}
            animate={{ x: 0 }}
            exit={{ x: -300 }}
            className="h-full w-[300px] overflow-hidden rounded-r-[28px] border-r border-white/60 bg-white/88 shadow-2xl backdrop-blur-xl dark:border-white/5 dark:bg-slate-950/90"
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
          <div className="flex-1 overflow-hidden p-2 pb-3">
            <div className="h-full overflow-hidden rounded-[24px] border border-white/60 bg-white/78 shadow-[0_20px_80px_-40px_rgba(15,23,42,0.45)] backdrop-blur-xl dark:border-white/5 dark:bg-slate-950/82">
              <NoteTab noteId={selectedNoteId} />
            </div>
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
        items={contextMenu.type === 'note-list'
          ? getNoteListContextMenuItems()
          : contextMenu.data?.note ? getContextMenuItems(contextMenu.data.note).map(item => ({
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
