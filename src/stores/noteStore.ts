import { create } from 'zustand'
import { v4 as uuidv4 } from 'uuid'
import { storage } from '../services/storage'
import { markdownStorage } from '../services/markdownStorage'
import { tauriEnvironment } from '@utils/tauri';
import { useEffect } from 'react';
import { getDataRootDir } from '@/services/fileDataStorage'
import { GitSyncService } from '@/services/gitSync'
import { buildReminderSchedule } from '@/utils/reminderScheduling'
import { useTabs } from './tabsStore'

// 定义笔记类型
export interface Note {
  id: string;
  title: string;
  content: string;
  type: string;
  categoryId?: string;
  parentId?: string;
  filePath?: string;
  reminder?: Date;
  dueDate?: Date;
  reminderEnabled?: boolean;
  reminderState?: {
    notified30d?: boolean;
    notified7d?: boolean;
    notifiedOnDay?: boolean;
  };
  createdAt: Date;
  updatedAt: Date;
}

const noteSaveQueue = new Map<string, Promise<void>>();

let gitAutoSyncTimer: number | null = null;
let gitAutoSyncInProgress = false;

type PersistedGitSyncConfig = {
  repoUrl: string
  branch: string
  autoSync: boolean
}

/**
 * 从 localStorage 读取 Git 同步配置
 */
function loadGitSyncConfig(): PersistedGitSyncConfig | null {
  try {
    const raw = localStorage.getItem('git_sync_config')
    if (!raw) return null
    const parsed = JSON.parse(raw) as Partial<PersistedGitSyncConfig>
    if (!parsed.repoUrl) return null
    return {
      repoUrl: parsed.repoUrl,
      branch: parsed.branch || 'master',
      autoSync: parsed.autoSync ?? true,
    }
  } catch {
    return null
  }
}

/**
 * 主动触发一次 Git 自动同步（供 App 启动时调用）
 */
export async function triggerGitAutoSync(reason: string): Promise<void> {
  await runGitAutoSyncNow(reason)
}

/**
 * 执行一次 Git 自动同步（带互斥锁）
 */
async function runGitAutoSyncNow(reason: string): Promise<void> {
  if (!tauriEnvironment.isTauri) return

  const cfg = loadGitSyncConfig()
  if (!cfg?.autoSync) return
  if (!cfg.repoUrl) return
  if (gitAutoSyncInProgress) return

  gitAutoSyncInProgress = true
  try {
    const rootDir = await getDataRootDir()
    const gitService = new GitSyncService(rootDir)

    const repoRes = await gitService.isGitRepo()
    if (!repoRes.success || !repoRes.isRepo) return

    const remote = await gitService.getRemoteUrl('origin')
    if (!remote) return

    console.log(`触发 Git 自动同步: ${reason}`)
    await gitService.pull(cfg.branch)
    await gitService.commitAndPush('Auto-sync from NoteBook', cfg.branch)
  } catch (error) {
    console.error('Git 自动同步失败:', error)
  } finally {
    gitAutoSyncInProgress = false
  }
}

/**
 * 计划一次 Git 自动同步（保存后延迟去抖）
 */
function scheduleGitAutoSync(reason: string): void {
  if (!tauriEnvironment.isTauri) return

  const cfg = loadGitSyncConfig()
  if (!cfg?.autoSync) return

  if (gitAutoSyncTimer) {
    window.clearTimeout(gitAutoSyncTimer)
    gitAutoSyncTimer = null
  }

  gitAutoSyncTimer = window.setTimeout(() => {
    gitAutoSyncTimer = null
    runGitAutoSyncNow(reason).catch(() => undefined)
  }, 30_000)
}

function enqueueNoteSave(note: Note): Promise<void> {
  const previous = noteSaveQueue.get(note.id) ?? Promise.resolve();
  const queueTask = previous.catch(() => undefined).then(() => markdownStorage.syncSaveNote(note));
  const trackedTask = queueTask.finally(() => {
    if (noteSaveQueue.get(note.id) === trackedTask) {
      noteSaveQueue.delete(note.id);
    }
  });
  noteSaveQueue.set(note.id, trackedTask);
  return trackedTask;
}

// 定义 store 状态类型
interface CreateNotePayload {
  title?: string;
  content?: string;
  type?: string;
  categoryId?: string | null;
  parentId?: string | null;
  dueDate?: Date;
  reminderEnabled?: boolean;
  reminderState?: {
    notified30d?: boolean;
    notified7d?: boolean;
    notifiedOnDay?: boolean;
  };
}

interface NoteStore {
  notes: Note[];
  isLoading: boolean;
  error: string | null;
  reminderWorker: Worker | null;
  
  // 方法类型定义
  initNotes: (notes: Note[]) => void;
  loadNotes: () => Promise<void>;
  loadNoteContent: (id: string) => Promise<Note | null>;
  createNote: (payload: CreateNotePayload) => string;
  updateNote: (id: string, updates: Partial<Note>) => Promise<boolean>;
  deleteNote: (id: string) => Promise<void>;
  deleteNotesByCategory: (categoryId: string) => Promise<void>;
  setReminder: (id: string, date: Date) => Promise<void>;
  initReminderWorker: () => void;
  importMarkdownFile: (filePath: string) => Promise<Note | null>;
}

/**
 * 关闭与指定 noteId 列表关联的标签页
 */
function closeTabsByNoteIds(noteIds: string[]): void {
  const ids = new Set(noteIds)
  const tabs = useTabs.getState().tabs
  tabs.forEach(tab => {
    if (ids.has(tab.noteId)) {
      useTabs.getState().closeTab(tab.id)
    }
  })
}

// 创建一个新的 store 来存储环境状态
export const useEnvironmentStore = create<{
  isTauriApp: boolean;
  setIsDesktop: (value: boolean) => void;
}>((set) => ({
  isTauriApp: tauriEnvironment.isTauri,
  setIsDesktop: (value) => set({ isTauriApp: value }),
}));

// 在组件中初始化环境检测
export const useInitEnvironment = () => {
  const setIsDesktop = useEnvironmentStore((state) => state.setIsDesktop);

  useEffect(() => {
    const checkEnvironment = async () => {
      const desktop = await tauriEnvironment.isTauri;
      setIsDesktop(desktop);
    };
    checkEnvironment();
  }, [setIsDesktop]);
};

// 在 noteStore 中使用环境状态
export const useNotes = create<NoteStore>((set, get) => ({
  notes: [],
  isLoading: false,
  error: null,
  reminderWorker: null,


  initNotes: (notes: Note[]) => {
    set({ notes, isLoading: false, error: null })
  },

  loadNotes: async () => {
    set({ isLoading: true, error: null })
    try {
      const notes = await storage.getAllNotes()
      
      // 获取当前内存中的笔记，用于保护内容
      const state = get();
      const currentNotes = state.notes;
      const currentNotesMap = new Map(currentNotes.map((note: Note) => [note.id, note]));
      
      // 处理笔记内容
      for (let i = 0; i < notes.length; i++) {
        const note = notes[i];
        
        // 检查笔记内容是否为空
        if (!note.content) {
          // 尝试从当前内存中恢复内容
          const currentNote = currentNotesMap.get(note.id);
          if (currentNote && currentNote.content) {
            note.content = currentNote.content;
          } else {
            note.content = '';
          }
        }
        
        // 确保所有必要字段都存在
        if (!note.title) {
          note.title = '无标题';
        }
        
        note.type = note.type || 'doc';
        
        // 检查内容是否是HTML格式
        if (note.content && !note.content.startsWith('<p>') && !note.content.startsWith('<h')) {
          // 如果不是HTML格式，转换为HTML格式
          note.content = `<p>${note.content}</p>`;
        }
        
        // 调试日志
        console.log(`加载笔记 ID: ${note.id}, 标题: ${note.title}, 内容长度: ${note.content?.length || 0}`);
      }
      
      set({ notes, isLoading: false })
      

    } catch (err) {
      console.error('加载笔记失败:', err);
      set({ error: (err as Error).message, isLoading: false })
    }
  },

  // 加载单个笔记的内容
  loadNoteContent: async (id: string) => {
    try {
      // 从当前状态中获取笔记的元数据
      const state = get();
      const { notes } = state;
      const noteIndex = notes.findIndex((n: Note) => n.id === id);
      
      if (noteIndex === -1) {
        console.error(`找不到ID为 ${id} 的笔记`);
        return null;
      }
      
      // 判断笔记内容是否已加载
      if (notes[noteIndex].content && notes[noteIndex].content.length > 0) {
        console.log(`笔记 ${id} 的内容已缓存，直接使用，标题: ${notes[noteIndex].title}`);
        console.log(`内容长度: ${notes[noteIndex].content.length} 字符`);
        console.log(`内容预览: ${notes[noteIndex].content.substring(0, 100)}...`);
        return notes[noteIndex];
      }
      
      console.log(`加载笔记 ${id} 的内容...`);
      
      // 尝试从存储加载内容
      const fullNote = await storage.getNoteById(id);
      
      if (fullNote && fullNote.content) {
        console.log(`成功从存储加载笔记 ${id} 的内容`);
        console.log(`内容长度: ${fullNote.content.length} 字符`);
        console.log(`内容预览: ${fullNote.content.substring(0, 100)}...`);
        
        // 更新状态中的笔记内容
        const updatedNotes = [...notes];
        updatedNotes[noteIndex] = fullNote;
        
        set({ notes: updatedNotes });
        return fullNote;
      }
      
      console.log(`笔记 ${id} 的内容不存在或为空，标题: ${notes[noteIndex].title}`);
      console.log(`当前内容长度: ${notes[noteIndex].content?.length || 0} 字符`);
      if (notes[noteIndex].content && notes[noteIndex].content.length > 0) {
        console.log(`当前内容预览: ${notes[noteIndex].content.substring(0, 100)}...`);
      }
      
      return notes[noteIndex];
      
    } catch (err) {
      console.error(`加载笔记 ${id} 内容失败:`, err);
      set({ error: (err as Error).message });
      return null;
    }
  },

  createNote: (payload: CreateNotePayload = {}) => {
    const {
      title = '新笔记',
      content = '',
      type = 'doc',
      categoryId = null,
      parentId = null,
      dueDate,
      reminderEnabled,
      reminderState
    } = payload;
    
    console.log('【创建笔记】开始创建笔记，标题:', title, '内容长度:', content?.length || 0);
    
    const newNote: Note = {
      id: uuidv4(),
      title,
      content,
      type,
      categoryId: categoryId || undefined,
      parentId: parentId || undefined,
      dueDate,
      reminderEnabled,
      reminderState,
      createdAt: new Date(),
      updatedAt: new Date()
    }
    
    console.log('【创建笔记】创建的新笔记:', newNote);

    // 更新状态
    const state = get();
    const notes = [...state.notes, newNote];
    set({ notes });
    
    // 持久化保存（通过同步方法，内部串行：先DB再Markdown）
    try {
      if (tauriEnvironment.isTauri) {
        enqueueNoteSave(newNote).catch(error => {
          console.error('保存新笔记失败:', error);
        });
      } else {
        // 浏览器环境兜底
        storage.saveOneNote(newNote).catch(error => {
          console.error('保存新笔记到浏览器存储失败:', error);
        });
      }
    } catch (error) {
      console.error('尝试保存笔记时出错:', error);
    }
    
    console.log('【创建笔记】完成创建，当前笔记总数:', notes.length);

    return newNote.id
  },

  updateNote: async (id: string, data: Partial<Note>) => {
    try {
      // 安全检查：确保不保存undefined或null内容
      if (data.content === undefined || data.content === null) {
        data = { ...data };
        delete data.content;
      }
      
      // 获取当前笔记
      const state = get();
      const { notes } = state;
      const noteIndex = notes.findIndex((note: Note) => note.id === id);
      
      if (noteIndex === -1) {
        console.error(`更新笔记失败: 找不到ID为 ${id} 的笔记`);
        return false;
      }
      
      // 更新笔记对象
      const updatedNote = { 
        ...notes[noteIndex], 
        ...data, 
        updatedAt: new Date() 
      };
      
      // 更新状态
      const updatedNotes = [...notes];
      updatedNotes[noteIndex] = updatedNote;
      set({ notes: updatedNotes });
      
      // 持久化保存更新（通过同步方法，内部串行：先DB再Markdown）
      try {
        if (tauriEnvironment.isTauri) {
          await enqueueNoteSave(updatedNote);
        } else {
          await storage.saveOneNote(updatedNote);
        }

        scheduleGitAutoSync('note_updated')
      } catch (saveError) {
        console.error('保存笔记更新失败:', saveError);
      }
      
      return true;
    } catch (err) {
      console.error(`更新笔记失败 (ID: ${id}):`, err);
      set({ error: (err as Error).message })
      return false;
    }
  },

  deleteNote: async (id: string) => {
    try {
      const state = get();
      const { reminderWorker, notes } = state;
      
      // 清除提醒
      if (reminderWorker) {
        reminderWorker.postMessage({
          type: 'CLEAR_REMINDER',
          noteId: id
        })
      }

      // 获取要删除的笔记
      const target = notes.find((note: Note) => note.id === id);
      if (!target) return

      // 计算需要删除的所有 noteId（folder 递归删除子项）
      const idsToDelete: string[] = []
      const collectIds = (noteId: string) => {
        idsToDelete.push(noteId)
        notes
          .filter(n => n.parentId === noteId)
          .forEach(child => collectIds(child.id))
      }

      if (target.type === 'folder') {
        collectIds(target.id)
      } else {
        idsToDelete.push(target.id)
      }

      // 关闭相关标签页
      closeTabsByNoteIds(idsToDelete)

      // 从状态中移除（包含 folder 及其子项）
      const updatedNotes = notes.filter((note: Note) => !idsToDelete.includes(note.id))
      set({ notes: updatedNotes })

      // 从存储中删除（会删除磁盘 md 文件 + noteIndex 记录）
      for (const noteId of idsToDelete) {
        try {
          await storage.deleteNote(noteId)
        } catch (error) {
          console.error(`删除笔记失败 (ID: ${noteId}):`, error)
        }
      }
    } catch (err) {
      console.error(`删除笔记失败 (ID: ${id}):`, err);
      set({ error: (err as Error).message })
    }
  },

  deleteNotesByCategory: async (categoryId: string) => {
    const state = get()
    const notes = state.notes

    const targets = notes.filter(n => n.categoryId === categoryId)
    const idsToDelete: string[] = []

    const collectIds = (id: string) => {
      idsToDelete.push(id)
      notes
        .filter(n => n.parentId === id)
        .forEach(child => collectIds(child.id))
    }

    targets.forEach(n => {
      if (n.type === 'folder') {
        collectIds(n.id)
      } else {
        idsToDelete.push(n.id)
      }
    })

    const uniqueIds = Array.from(new Set(idsToDelete))
    closeTabsByNoteIds(uniqueIds)

    set({ notes: notes.filter(n => !uniqueIds.includes(n.id)) })

    for (const noteId of uniqueIds) {
      try {
        await storage.deleteNote(noteId)
      } catch (error) {
        console.error(`删除笔记失败 (ID: ${noteId}):`, error)
      }
    }
  },

  setReminder: async (id: string, date: Date) => {
    try {
      const state = get();
      const { notes, reminderWorker } = state;
      const noteIndex = notes.findIndex((note: Note) => note.id === id)
      
      if (noteIndex === -1) {
        throw new Error(`找不到ID为 ${id} 的笔记`)
      }
      
      // 更新笔记对象
      const updatedNote = { 
        ...notes[noteIndex], 
        reminder: date, 
        updatedAt: new Date() 
      }
      
      // 更新状态
      const updatedNotes = [...notes]
      updatedNotes[noteIndex] = updatedNote
      set({ notes: updatedNotes })
      
      // 持久化保存更新后的笔记
      await storage.saveOneNote(updatedNote)
      
      // 发送提醒到Worker
      if (reminderWorker) {
        reminderWorker.postMessage({
          type: 'SET_REMINDER',
          noteId: id,
          noteTitle: updatedNote.title,
          reminderTime: date.getTime()
        })
      }
    } catch (err) {
      console.error(`设置提醒失败 (ID: ${id}):`, err)
      set({ error: (err as Error).message })
    }
  },

  initReminderWorker: () => {
    if (typeof window === 'undefined') return
    
    try {
      // 创建提醒Worker
      const worker = new Worker(new URL('../workers/reminder.ts', import.meta.url), {
        type: 'module'
      })
      
      // 设置Worker消息处理
      worker.onmessage = (event) => {
        const { type, noteId, noteTitle } = event.data
        
        if (type === 'REMINDER') {
          // 显示提醒通知
          if (Notification.permission === 'granted') {
            new Notification('笔记提醒', {
              body: noteTitle || '你有一个笔记提醒',
              icon: '/favicon.ico'
            })
          } else if (Notification.permission !== 'denied') {
            Notification.requestPermission().then(permission => {
              if (permission === 'granted') {
                new Notification('笔记提醒', {
                  body: noteTitle || '你有一个笔记提醒',
                  icon: '/favicon.ico'
                })
              }
            })
          }
          
          console.log(`提醒触发: ${noteId} - ${noteTitle}`)
        }
      }
      
      // 初始化Worker
      const state = get();
      const { notes } = state;
      const reminders = notes
        .filter((note: Note) => note.reminder)
        .map((note: Note) => ({
          noteId: note.id,
          noteTitle: note.title,
          reminderTime: note.reminder!.getTime()
        }))
      
          worker.postMessage({
        type: 'INIT_REMINDERS',
        reminders
      })
      
      // 保存Worker实例
      set({ reminderWorker: worker })
      
      console.log('提醒Worker初始化完成')
    } catch (err) {
      console.error('初始化提醒Worker失败:', err)
      set({ error: (err as Error).message })
    }
  },
  

  
  // 导入Markdown文件
  importMarkdownFile: async (filePath: string) => {
    try {
      const note = await markdownStorage.importMarkdownAsNote(filePath);
      
      if (note) {
        // 更新状态
        const state = get();
        const notes = [...state.notes, note];
        set({ notes });
      }
      
      return note;
    } catch (error) {
      console.error('导入Markdown文件失败:', error);
      return null;
    }
  }
})) 
