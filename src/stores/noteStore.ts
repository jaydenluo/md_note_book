import { create } from 'zustand'
import { v4 as uuidv4 } from 'uuid'
import { storage } from '@services/storage'

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
  createNote: (data: CreateNoteData) => string
  updateNote: (id: string, data: Partial<Note>) => Promise<void>
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
      set({ notes, isLoading: false })
    } catch (err) {
      set({ error: (err as Error).message, isLoading: false })
    }
  },

  createNote: (data: CreateNoteData) => {
    console.log('【创建笔记】开始创建笔记，传入的数据:', data);
    
    const newNote: Note = {
      id: uuidv4(),
      ...data,
      type: data.type || 'doc',
      parentId: data.parentId || null,
      createdAt: new Date(),
      updatedAt: new Date()
    }
    
    console.log('【创建笔记】创建的新笔记:', newNote);

    const notes = [...get().notes, newNote]
    storage.saveNotes(notes).catch(err => {
      set({ error: (err as Error).message })
    })
    set({ notes })
    
    console.log('【创建笔记】完成创建，当前笔记总数:', notes.length);

    return newNote.id
  },

  updateNote: async (id: string, data: Partial<Note>) => {
    try {
      const notes = get().notes.map(note =>
        note.id === id
          ? { ...note, ...data, updatedAt: new Date() }
          : note
      )
      await storage.saveNotes(notes)
      set({ notes })
    } catch (err) {
      set({ error: (err as Error).message })
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
      await storage.saveNotes(notes)
      set({ notes })
    } catch (err) {
      set({ error: (err as Error).message })
    }
  },

  setReminder: async (id: string, date: Date) => {
    try {
      const notes = get().notes.map(note =>
        note.id === id
          ? { ...note, reminder: date, updatedAt: new Date() }
          : note
      )
      await storage.saveNotes(notes)
      set({ notes })
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