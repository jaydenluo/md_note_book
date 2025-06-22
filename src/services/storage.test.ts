import { describe, it, expect, beforeEach } from 'vitest'
import { storage } from './storage'
import { mockIndexedDB, generateTestCategory, generateTestNote } from '@test/utils'

describe('StorageService', () => {
  beforeEach(() => {
    mockIndexedDB()
  })

  it('initializes successfully', async () => {
    await storage.init()
    expect(storage).toBeDefined()
  })

  it('saves and retrieves categories', async () => {
    const testCategories = [
      generateTestCategory({ id: '1', name: 'Category 1' }),
      generateTestCategory({ id: '2', name: 'Category 2' })
    ]

    await storage.saveCategories(testCategories)
    const retrievedCategories = await storage.getAllCategories()

    expect(retrievedCategories).toHaveLength(2)
    expect(retrievedCategories[0].name).toBe('Category 1')
    expect(retrievedCategories[1].name).toBe('Category 2')
  })

  it('saves and retrieves notes', async () => {
    const testNotes = [
      generateTestNote({ id: '1', title: 'Note 1' }),
      generateTestNote({ id: '2', title: 'Note 2' })
    ]

    await storage.saveNotes(testNotes)
    const retrievedNotes = await storage.getAllNotes()

    expect(retrievedNotes).toHaveLength(2)
    expect(retrievedNotes[0].title).toBe('Note 1')
    expect(retrievedNotes[1].title).toBe('Note 2')
  })

  it('handles errors gracefully', async () => {
    // 模拟 IndexedDB 错误
    global.indexedDB = {
      open: () => {
        throw new Error('IndexedDB error')
      }
    } as any

    await expect(storage.getAllCategories()).rejects.toThrow()
    await expect(storage.getAllNotes()).rejects.toThrow()
  })
}) 