import { create } from 'zustand'
import { v4 as uuidv4 } from 'uuid'
import { storage } from '@services/storage'
import { useNotes } from './noteStore'
import { deleteCategoryNotesDir } from '@/services/fileDataStorage'

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
    const existingCategories = get().categories;
    let finalName = data.name;
    let counter = 2;

    // 名称去重逻辑：如果名称已存在，自动递增数字
    while (existingCategories.some(c => c.name === finalName)) {
      finalName = `${data.name}${counter}`;
      counter++;
    }

    const newCategory: Category = {
      id: uuidv4(),
      name: finalName,
      color: data.color || 'bg-blue-100 text-blue-800 dark:bg-blue-900 dark:text-blue-300',
      createdAt: new Date(),
      updatedAt: new Date()
    }

    const categories = [...existingCategories, newCategory]
    // 串行保存，并确保物理文件夹创建
    storage
      .saveCategories(categories)
      .then(() => set({ categories }))
      .catch(err => {
        set({ error: (err as Error).message })
      })

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
      const target = get().categories.find(category => category.id === id)

      // 先删除该分类下的所有笔记/目录（包含磁盘文件）
      await useNotes.getState().deleteNotesByCategory(id)

      // 再删除磁盘 notes/<分类名> 目录（若存在）
      if (target?.name) {
        try {
          await deleteCategoryNotesDir(target.name)
        } catch (error) {
          console.error('删除分类目录失败:', error)
        }
      }

      // 最后更新分类元数据
      const categories = get().categories.filter(category => category.id !== id)
      await storage.saveCategories(categories)
      set({ categories })
    } catch (err) {
      set({ error: (err as Error).message })
    }
  }
})) 