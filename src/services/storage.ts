import type { Note } from '@stores/noteStore'
import type { Tag, NoteTag } from '@stores/tagStore'
import type { Category } from '@stores/categoryStore'

// 声明Tauri全局变量
declare global {
  interface Window {
    __TAURI__?: any;
  }
}

// 检测是否在Tauri环境中运行
const isTauriApp = typeof window !== 'undefined' && window.__TAURI__ !== undefined

// 仅在Tauri环境中导入Tauri API
let Database: any
let path: any
if (isTauriApp) {
  // 动态导入，避免在浏览器环境中报错
  const importTauriDeps = async () => {
    try {
      const sqlModule = await import('@tauri-apps/plugin-sql')
      Database = sqlModule.default
      const apiModule = await import('@tauri-apps/api')
      path = apiModule.path
    } catch (error) {
      console.error('无法导入Tauri依赖:', error)
    }
  }
  importTauriDeps()
}

// 内存存储，用于在非Tauri环境中使用
const memoryStorage: {
  categories: Category[];
  notes: Note[];
  tags: Tag[];
  noteTags: NoteTag[];
} = {
  categories: [],
  notes: [],
  tags: [],
  noteTags: []
}

// 数据库名称
const DB_NAME = 'notebook.db'

// 获取数据库路径
async function getDbPath(): Promise<string> {
  if (!isTauriApp) return ':memory:'
  const appDataDir = await path.appDataDir()
  return await path.join(appDataDir, DB_NAME)
}

// 打开数据库连接
async function openDB(): Promise<any> {
  if (!isTauriApp) return null
  const dbPath = await getDbPath()
  return await Database.load(`sqlite:${dbPath}`)
}

// 初始化数据库表
async function initDatabase(db: any): Promise<void> {
  if (!isTauriApp) return Promise.resolve()
  
  // 创建分类表
  await db.execute(`
    CREATE TABLE IF NOT EXISTS categories (
      id TEXT PRIMARY KEY,
      name TEXT NOT NULL,
      color TEXT NOT NULL,
      createdAt TEXT NOT NULL,
      updatedAt TEXT NOT NULL
    )
  `)

  // 创建笔记表
  await db.execute(`
    CREATE TABLE IF NOT EXISTS notes (
      id TEXT PRIMARY KEY,
      title TEXT NOT NULL,
      content TEXT NOT NULL,
      categoryId TEXT,
      createdAt TEXT NOT NULL,
      updatedAt TEXT NOT NULL,
      reminder TEXT,
      FOREIGN KEY (categoryId) REFERENCES categories (id)
    )
  `)

  // 创建标签表
  await db.execute(`
    CREATE TABLE IF NOT EXISTS tags (
      id TEXT PRIMARY KEY,
      name TEXT NOT NULL,
      color TEXT NOT NULL,
      createdAt TEXT NOT NULL,
      updatedAt TEXT NOT NULL
    )
  `)

  // 创建笔记标签关联表
  await db.execute(`
    CREATE TABLE IF NOT EXISTS noteTags (
      noteId TEXT NOT NULL,
      tagId TEXT NOT NULL,
      PRIMARY KEY (noteId, tagId),
      FOREIGN KEY (noteId) REFERENCES notes (id),
      FOREIGN KEY (tagId) REFERENCES tags (id)
    )
  `)

  // 创建索引
  await db.execute(`CREATE INDEX IF NOT EXISTS idx_notes_categoryId ON notes (categoryId)`)
  await db.execute(`CREATE INDEX IF NOT EXISTS idx_noteTags_noteId ON noteTags (noteId)`)
  await db.execute(`CREATE INDEX IF NOT EXISTS idx_noteTags_tagId ON noteTags (tagId)`)
}

// 通用的存储操作函数
async function getAllFromTable<T>(tableName: string): Promise<T[]> {
  if (!isTauriApp) {
    // 从内存存储中获取数据
    return memoryStorage[tableName as keyof typeof memoryStorage] as T[]
  }
  
  const db = await openDB()
  try {
    const results = await db.select(`SELECT * FROM ${tableName}`) as any[]
    return results.map((item: any) => ({
      ...item,
      createdAt: new Date(item.createdAt),
      updatedAt: new Date(item.updatedAt),
      reminder: item.reminder ? new Date(item.reminder) : undefined
    })) as T[]
  } catch (error) {
    console.error(`从表 ${tableName} 获取数据失败:`, error)
    throw error
  }
}

// 为不同类型的数据定义保存函数
async function saveCategories(categories: Category[]): Promise<void> {
  if (!isTauriApp) {
    memoryStorage.categories = [...categories]
    return Promise.resolve()
  }
  
  if (categories.length === 0) return
  const db = await openDB()
  
  try {
    await db.execute('BEGIN TRANSACTION')
    await db.execute('DELETE FROM categories')
    
    for (const item of categories) {
      await db.execute(
        'INSERT INTO categories (id, name, color, createdAt, updatedAt) VALUES (?, ?, ?, ?, ?)',
        [
          item.id,
          item.name,
          item.color,
          item.createdAt.toISOString(),
          item.updatedAt.toISOString()
        ]
      )
    }
    
    await db.execute('COMMIT')
  } catch (error) {
    await db.execute('ROLLBACK')
    console.error('保存分类数据失败:', error)
    throw error
  }
}

async function saveNotes(notes: Note[]): Promise<void> {
  if (!isTauriApp) {
    memoryStorage.notes = [...notes]
    return Promise.resolve()
  }
  
  if (notes.length === 0) return
  const db = await openDB()
  
  try {
    await db.execute('BEGIN TRANSACTION')
    await db.execute('DELETE FROM notes')
    
    for (const item of notes) {
      await db.execute(
        'INSERT INTO notes (id, title, content, categoryId, createdAt, updatedAt, reminder) VALUES (?, ?, ?, ?, ?, ?, ?)',
        [
          item.id,
          item.title,
          item.content,
          item.categoryId,
          item.createdAt.toISOString(),
          item.updatedAt.toISOString(),
          item.reminder ? item.reminder.toISOString() : null
        ]
      )
    }
    
    await db.execute('COMMIT')
  } catch (error) {
    await db.execute('ROLLBACK')
    console.error('保存笔记数据失败:', error)
    throw error
  }
}

async function saveTags(tags: Tag[]): Promise<void> {
  if (!isTauriApp) {
    memoryStorage.tags = [...tags]
    return Promise.resolve()
  }
  
  if (tags.length === 0) return
  const db = await openDB()
  
  try {
    await db.execute('BEGIN TRANSACTION')
    await db.execute('DELETE FROM tags')
    
    for (const item of tags) {
      await db.execute(
        'INSERT INTO tags (id, name, color, createdAt, updatedAt) VALUES (?, ?, ?, ?, ?)',
        [
          item.id,
          item.name,
          item.color,
          item.createdAt.toISOString(),
          item.updatedAt.toISOString()
        ]
      )
    }
    
    await db.execute('COMMIT')
  } catch (error) {
    await db.execute('ROLLBACK')
    console.error('保存标签数据失败:', error)
    throw error
  }
}

async function saveNoteTags(noteTags: NoteTag[]): Promise<void> {
  if (!isTauriApp) {
    memoryStorage.noteTags = [...noteTags]
    return Promise.resolve()
  }
  
  if (noteTags.length === 0) return
  const db = await openDB()
  
  try {
    await db.execute('BEGIN TRANSACTION')
    await db.execute('DELETE FROM noteTags')
    
    for (const item of noteTags) {
      await db.execute(
        'INSERT INTO noteTags (noteId, tagId) VALUES (?, ?)',
        [item.noteId, item.tagId]
      )
    }
    
    await db.execute('COMMIT')
  } catch (error) {
    await db.execute('ROLLBACK')
    console.error('保存笔记标签关联数据失败:', error)
    throw error
  }
}

// 导出的存储服务
export const storage = {
  // 初始化数据库
  init: async (): Promise<void> => {
    try {
      if (!isTauriApp) {
        console.log('在浏览器环境中运行，使用内存存储')
        return Promise.resolve()
      }
      
      const db = await openDB()
      await initDatabase(db)
      return Promise.resolve()
    } catch (error) {
      console.error('初始化数据库失败:', error)
      throw error
    }
  },

  getAllCategories: () => getAllFromTable<Category>('categories'),
  saveCategories,

  getAllNotes: () => getAllFromTable<Note>('notes'),
  saveNotes,
  
  getAllTags: () => getAllFromTable<Tag>('tags'),
  saveTags,
  
  getAllNoteTags: () => getAllFromTable<NoteTag>('noteTags'),
  saveNoteTags,

  exportData: async (): Promise<string> => {
    const categories = await storage.getAllCategories();
    const notes = await storage.getAllNotes();
    const tags = await storage.getAllTags();
    const noteTags = await storage.getAllNoteTags();

    const data = {
      categories,
      notes,
      tags,
      noteTags
    };

    return JSON.stringify(data, null, 2);
  },

  importData: async (jsonData: string): Promise<void> => {
    try {
      const data = JSON.parse(jsonData);
      
      if (data.categories) {
        await storage.saveCategories(data.categories.map((c: any) => ({
          ...c,
          createdAt: new Date(c.createdAt),
          updatedAt: new Date(c.updatedAt)
        })));
      }
      
      if (data.notes) {
        await storage.saveNotes(data.notes.map((n: any) => ({
          ...n,
          createdAt: new Date(n.createdAt),
          updatedAt: new Date(n.updatedAt),
          reminder: n.reminder ? new Date(n.reminder) : undefined
        })));
      }
      
      if (data.tags) {
        await storage.saveTags(data.tags.map((t: any) => ({
          ...t,
          createdAt: new Date(t.createdAt),
          updatedAt: new Date(t.updatedAt)
        })));
      }
      
      if (data.noteTags) {
        await storage.saveNoteTags(data.noteTags);
      }
    } catch (error) {
      console.error('导入数据失败:', error);
      throw new Error('导入数据失败，请检查文件格式');
    }
  }
}

// 从IndexedDB迁移数据到SQLite（一次性迁移功能）
export async function migrateFromIndexedDB(): Promise<boolean> {
  try {
    // 检查是否有IndexedDB数据
    if (!window.indexedDB) {
      return false
    }
    
    // 尝试打开旧的IndexedDB数据库
    const request = indexedDB.open('notebook_db', 1)
    
    return new Promise((resolve) => {
      request.onerror = () => resolve(false) // 无法打开旧数据库，可能不存在
      
      request.onsuccess = async () => {
        const db = request.result
        
        // 检查是否有所需的存储对象
        if (!db.objectStoreNames.contains('categories') || 
            !db.objectStoreNames.contains('notes') || 
            !db.objectStoreNames.contains('tags') || 
            !db.objectStoreNames.contains('noteTags')) {
          resolve(false)
          return
        }
        
        try {
          // 从IndexedDB读取数据
          const categories = await getIndexedDBData(db, 'categories')
          const notes = await getIndexedDBData(db, 'notes')
          const tags = await getIndexedDBData(db, 'tags')
          const noteTags = await getIndexedDBData(db, 'noteTags')
          
          if (!isTauriApp) {
            // 在浏览器环境中直接更新内存存储
            memoryStorage.categories = categories
            memoryStorage.notes = notes
            memoryStorage.tags = tags
            memoryStorage.noteTags = noteTags
            resolve(true)
            return
          }
          
          // 保存到SQLite
          await storage.saveCategories(categories)
          await storage.saveNotes(notes)
          await storage.saveTags(tags)
          await storage.saveNoteTags(noteTags)
          
          // 迁移成功
          resolve(true)
        } catch (error) {
          console.error('迁移数据失败:', error)
          resolve(false)
        } finally {
          db.close()
        }
      }
    })
  } catch (error) {
    console.error('迁移过程出错:', error)
    return false
  }
}

// 从IndexedDB获取数据的辅助函数
function getIndexedDBData(db: IDBDatabase, storeName: string): Promise<any[]> {
  return new Promise((resolve, reject) => {
    const transaction = db.transaction(storeName, 'readonly')
    const store = transaction.objectStore(storeName)
    const request = store.getAll()
    
    request.onerror = () => reject(request.error)
    request.onsuccess = () => {
      const results = request.result.map(item => ({
        ...item,
        createdAt: new Date(item.createdAt),
        updatedAt: new Date(item.updatedAt),
        reminder: item.reminder ? new Date(item.reminder) : undefined
      }))
      resolve(results)
    }
  })
} 