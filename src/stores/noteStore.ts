import { create } from 'zustand'
import { v4 as uuidv4 } from 'uuid'
import { storage } from '../services/storage'

export interface Note {
  id: string
  title: string
  content: string
  categoryId: string | null
  createdAt: Date
  updatedAt: Date
  reminder?: Date
  type?: 'doc' | 'folder'
  parentId?: string | null
}

interface CreateNoteData {
  title: string
  content: string
  categoryId: string | null
  type?: 'doc' | 'folder'
  parentId?: string | null
}

interface NoteStore {
  notes: Note[]
  isLoading: boolean
  error: string | null
  reminderWorker: Worker | null
  initNotes: (notes: Note[]) => void
  loadNotes: () => Promise<void>
  loadNoteContent: (id: string) => Promise<Note | null>
  createNote: (data: CreateNoteData) => string
  updateNote: (id: string, data: Partial<Note>) => Promise<boolean>
  deleteNote: (id: string) => Promise<void>
  setReminder: (id: string, date: Date) => Promise<void>
  initReminderWorker: () => void
}

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
      const currentNotes = get().notes;
      const currentNotesMap = new Map(currentNotes.map(note => [note.id, note]));
      
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
      const { notes } = get();
      const noteIndex = notes.findIndex(n => n.id === id);
      
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

  createNote: (data: CreateNoteData) => {
    console.log('【创建笔记】开始创建笔记，传入的数据:', data);
    
    // 确保内容字段不为null或undefined
    const safeContent = data.content || '';
    
    const newNote: Note = {
      id: uuidv4(),
      ...data,
      content: safeContent, // 确保有内容字段，即使为空字符串
      type: data.type || 'doc',
      parentId: data.parentId || null,
      createdAt: new Date(),
      updatedAt: new Date()
    }
    
    console.log('【创建笔记】创建的新笔记:', newNote);

    // 更新状态
    const notes = [...get().notes, newNote];
    set({ notes });
    
    // 持久化保存笔记到存储
    try {
      // 保存单个笔记
      storage.saveOneNote(newNote).catch(error => {
        console.error('保存新笔记失败:', error);
      });
      
      // 或者保存所有笔记
      // storage.saveNotes(notes).catch(error => {
      //   console.error('保存笔记列表失败:', error);
      // });
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
      const { notes } = get();
      const noteIndex = notes.findIndex(note => note.id === id);
      
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
      
      // 持久化保存更新后的笔记
      try {
        await storage.saveOneNote(updatedNote);
      } catch (saveError) {
        console.error(`保存更新的笔记失败 (ID: ${id}):`, saveError);
        // 即使保存失败，也不影响状态更新
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
      const { reminderWorker } = get()
      if (reminderWorker) {
        reminderWorker.postMessage({
          type: 'CLEAR_REMINDER',
          noteId: id
        })
      }

      const notes = get().notes.filter(note => note.id !== id)
      set({ notes })
      
      // 持久化保存删除后的笔记列表
      try {
        await storage.saveNotes(notes);
      } catch (saveError) {
        console.error('保存删除后的笔记列表失败:', saveError);
      }
    } catch (err) {
      set({ error: (err as Error).message })
    }
  },

  setReminder: async (id: string, date: Date) => {
    try {
      // 获取当前笔记
      const { notes } = get();
      const noteIndex = notes.findIndex(note => note.id === id);
      
      if (noteIndex === -1) {
        console.error(`设置提醒失败: 找不到ID为 ${id} 的笔记`);
        return;
      }
      
      // 更新笔记对象
      const updatedNote = { 
        ...notes[noteIndex], 
        reminder: date, 
        updatedAt: new Date() 
      };
      
      // 更新状态
      const updatedNotes = [...notes];
      updatedNotes[noteIndex] = updatedNote;
      set({ notes: updatedNotes });
      
      // 持久化保存更新后的笔记
      try {
        await storage.saveOneNote(updatedNote);
      } catch (saveError) {
        console.error(`保存设置提醒的笔记失败 (ID: ${id}):`, saveError);
      }
    } catch (err) {
      set({ error: (err as Error).message })
    }
  },

  initReminderWorker: () => {
    try {
      const worker = new Worker(
        new URL('../workers/reminder.ts', import.meta.url),
        { type: 'module' }
      )
      set({ reminderWorker: worker })

      // 初始化现有的提醒
      const { notes } = get()
      notes.forEach(note => {
        if (note.reminder && note.reminder.getTime() > Date.now()) {
          worker.postMessage({
            type: 'SET_REMINDER',
            noteId: note.id,
            title: note.title,
            time: note.reminder.getTime()
          })
        }
      })
    } catch (err) {
      set({ error: (err as Error).message })
    }
  }
})) 