import { create } from 'zustand'
import { v4 as uuidv4 } from 'uuid'
import { storage } from '@services/storage'

export interface Category {
  id: string
  name: string
  color: string
  createdAt: Date
  updatedAt: Date
}

interface CategoryStore {
  categories: Category[]
  isLoading: boolean
  error: string | null
  initCategories: (categories: Category[]) => void
  loadCategories: () => Promise<void>
  createCategory: (data: { name: string, color?: string }) => string
  updateCategory: (id: string, data: Partial<Category>) => Promise<void>
  deleteCategory: (id: string) => Promise<void>
}

export const useCategories = create<CategoryStore>((set, get) => ({
  categories: [],
  isLoading: false,
  error: null,

  initCategories: (categories: Category[]) => {
    set({ categories, isLoading: false, error: null })
  },

  loadCategories: async () => {
    set({ isLoading: true, error: null })
    try {
      const categories = await storage.getAllCategories()
      set({ categories, isLoading: false })
    } catch (err) {
      set({ error: (err as Error).message, isLoading: false })
    }
  },

  createCategory: (data: { name: string, color?: string }) => {
    const newCategory: Category = {
      id: uuidv4(),
      name: data.name,
      color: data.color || 'bg-blue-100 text-blue-800 dark:bg-blue-900 dark:text-blue-300',
      createdAt: new Date(),
      updatedAt: new Date()
    }

    const categories = [...get().categories, newCategory]
    storage.saveCategories(categories).catch(err => {
      set({ error: (err as Error).message })
    })
    set({ categories })

    return newCategory.id
  },

  updateCategory: async (id: string, data: Partial<Category>) => {
    try {
      const categories = get().categories.map(category =>
        category.id === id
          ? { ...category, ...data, updatedAt: new Date() }
          : category
      )
      await storage.saveCategories(categories)
      set({ categories })
    } catch (err) {
      set({ error: (err as Error).message })
    }
  },

  deleteCategory: async (id: string) => {
    try {
      const categories = get().categories.filter(category => category.id !== id)
      await storage.saveCategories(categories)
      set({ categories })
    } catch (err) {
      set({ error: (err as Error).message })
    }
  }
})) 