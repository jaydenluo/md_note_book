import { create } from 'zustand'
import { v4 as uuidv4 } from 'uuid'
import { storage } from '@services/storage'

export interface Tag {
  id: string
  name: string
  color: string
  createdAt: Date
  updatedAt: Date
}

export interface NoteTag {
  noteId: string
  tagId: string
}

interface TagStore {
  tags: Tag[]
  noteTags: NoteTag[]
  isLoading: boolean
  error: string | null
  initTags: (tags: Tag[], noteTags: NoteTag[]) => void
  loadTags: () => Promise<void>
  addTag: (data: { name: string, color: string }) => string
  updateTag: (id: string, data: Partial<Tag>) => Promise<void>
  deleteTag: (id: string) => Promise<void>
  addNoteTag: (noteId: string, tagId: string) => Promise<void>
  removeNoteTag: (noteId: string, tagId: string) => Promise<void>
  getNoteTags: (noteId: string) => Tag[]
}

export const useTags = create<TagStore>((set, get) => ({
  tags: [],
  noteTags: [],
  isLoading: false,
  error: null,

  initTags: (tags: Tag[], noteTags: NoteTag[]) => {
    set({ tags, noteTags, isLoading: false, error: null })
  },

  loadTags: async () => {
    set({ isLoading: true, error: null })
    try {
      const [tags, noteTags] = await Promise.all([
        storage.getAllTags(),
        storage.getAllNoteTags()
      ])
      set({ tags, noteTags, isLoading: false })
    } catch (err) {
      set({ error: (err as Error).message, isLoading: false })
    }
  },

  addTag: (data: { name: string, color: string }) => {
    const newTag: Tag = {
      id: uuidv4(),
      name: data.name,
      color: data.color,
      createdAt: new Date(),
      updatedAt: new Date()
    }

    const tags = [...get().tags, newTag]
    storage.saveTags(tags).catch(err => {
      set({ error: (err as Error).message })
    })
    set({ tags })

    return newTag.id
  },

  updateTag: async (id: string, data: Partial<Tag>) => {
    try {
      const tags = get().tags.map(tag =>
        tag.id === id
          ? { ...tag, ...data, updatedAt: new Date() }
          : tag
      )
      await storage.saveTags(tags)
      set({ tags })
    } catch (err) {
      set({ error: (err as Error).message })
    }
  },

  deleteTag: async (id: string) => {
    try {
      const tags = get().tags.filter(tag => tag.id !== id)
      const noteTags = get().noteTags.filter(nt => nt.tagId !== id)
      
      await Promise.all([
        storage.saveTags(tags),
        storage.saveNoteTags(noteTags)
      ])
      
      set({ tags, noteTags })
    } catch (err) {
      set({ error: (err as Error).message })
    }
  },

  addNoteTag: async (noteId: string, tagId: string) => {
    try {
      const noteTags = [...get().noteTags, { noteId, tagId }]
      await storage.saveNoteTags(noteTags)
      set({ noteTags })
    } catch (err) {
      set({ error: (err as Error).message })
    }
  },

  removeNoteTag: async (noteId: string, tagId: string) => {
    try {
      const noteTags = get().noteTags.filter(
        nt => !(nt.noteId === noteId && nt.tagId === tagId)
      )
      await storage.saveNoteTags(noteTags)
      set({ noteTags })
    } catch (err) {
      set({ error: (err as Error).message })
    }
  },

  getNoteTags: (noteId: string) => {
    const { tags, noteTags } = get()
    const noteTagIds = noteTags
      .filter(nt => nt.noteId === noteId)
      .map(nt => nt.tagId)
    return tags.filter(tag => noteTagIds.includes(tag.id))
  }
})) 