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

// 从LocalStorage读取数据
const loadFromLocalStorage = <T>(key: string): T[] => {
  try {
    // 首先检查是否有内存中的备份数据
    const memoryData = memoryStorage[key as keyof typeof memoryStorage] as T[];
    
    const data = localStorage.getItem(key);
    if (!data) {
      return memoryData;
    }
    
    // 尝试解析数据
    let parsed: any[] = [];
    try {
      parsed = JSON.parse(data);
    } catch (parseError) {
      console.error(`解析${key}数据失败`, parseError);
      return memoryData;
    }
    
    if (!Array.isArray(parsed) || parsed.length === 0) {
      return memoryData;
    }
    
    // 处理日期字段并验证数据完整性
    const result = parsed.map((item, index) => {
      const processedItem = { ...item };
      
      // 处理日期字段
      try {
        processedItem.createdAt = typeof item.createdAt === 'string' ? new Date(item.createdAt) : new Date();
        processedItem.updatedAt = typeof item.updatedAt === 'string' ? new Date(item.updatedAt) : new Date();
        processedItem.reminder = item.reminder && typeof item.reminder === 'string' ? new Date(item.reminder) : undefined;
      } catch (dateError) {
        console.error(`处理${key}项日期字段失败`, dateError);
      }
      
      // 检查笔记内容是否正常
      if (key === 'notes') {
        // 验证ID
        if (!processedItem.id) {
          return null;
        }
        
        // 验证并修复内容和标题
        processedItem.content = processedItem.content || '';
        processedItem.title = processedItem.title || '无标题';
        processedItem.type = processedItem.type || 'doc';
      }
      
      return processedItem;
    }).filter(item => item !== null) as T[];
    
    // 如果处理后没有有效数据，使用内存中的数据
    if (result.length === 0) {
      return memoryData;
    }
    
    // 更新内存存储
    memoryStorage[key as keyof typeof memoryStorage] = [...result] as any;
    
    return result;
  } catch (error) {
    console.error(`从LocalStorage读取${key}数据失败`, error);
    return memoryStorage[key as keyof typeof memoryStorage] as T[];
  }
};

// 在浏览器环境中使用LocalStorage
const saveToLocalStorage = <T>(key: string, data: T[]): void => {
  try {
    // 内容验证和清理 - 特别是笔记数据
    const cleanData = data.map((item: any) => {
      const newItem = { ...item };
      
      // 处理Date对象，确保它们被正确序列化
      if (newItem.createdAt instanceof Date) {
        newItem.createdAt = newItem.createdAt.toISOString();
      }
      
      if (newItem.updatedAt instanceof Date) {
        newItem.updatedAt = newItem.updatedAt.toISOString();
      }
      
      if (newItem.reminder instanceof Date) {
        newItem.reminder = newItem.reminder.toISOString();
      }
      
      // 特别检查笔记数据
      if (key === 'notes') {
        // 确保内容和标题不是undefined或null
        newItem.content = newItem.content || '';
        newItem.title = newItem.title || '无标题';
      }
      
      return newItem;
    });
    
    const jsonString = JSON.stringify(cleanData);
    
    localStorage.setItem(key, jsonString);
    
    // 备份到内存存储
    memoryStorage[key as keyof typeof memoryStorage] = [...data] as any;
  } catch (error) {
    console.error(`保存${key}数据到LocalStorage失败`, error);
    // 备份到内存，避免数据丢失
    memoryStorage[key as keyof typeof memoryStorage] = [...data] as any;
  }
};

// 数据库名称
const DB_NAME = 'notebook.db'

// 获取数据库路径
async function getDbPath(customPath?: string): Promise<string> {
  if (!isTauriApp) return ':memory:'
  
  // 如果提供了自定义路径，使用自定义路径
  if (customPath && customPath.trim()) {
    try {
      // 动态导入Tauri API
      const { fs } = await import('@tauri-apps/api');
      // 确保目录存在
      await fs.createDir(customPath, { recursive: true });
      return await path.join(customPath, DB_NAME);
    } catch (error) {
      console.error('使用自定义路径失败，回退到默认路径:', error);
      // 如果自定义路径失败，回退到默认路径
    }
  }
  
  // 使用默认路径
  const appDataDir = await path.appDataDir();
  return await path.join(appDataDir, DB_NAME);
}

// 打开数据库连接
async function openDB(customPath?: string): Promise<any> {
  if (!isTauriApp) return null
  const dbPath = await getDbPath(customPath)
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
    // 从LocalStorage中获取数据
    console.log(`从LocalStorage中获取 ${tableName} 数据`);
    const data = loadFromLocalStorage<T>(tableName);
    
    // 如果LocalStorage中没有数据，使用内存存储中的数据
    if (data.length === 0) {
      const memoryData = memoryStorage[tableName as keyof typeof memoryStorage] as T[];
      console.log(`LocalStorage中没有数据，使用内存中的 ${memoryData.length} 条 ${tableName} 数据`);
      return memoryData;
    }
    
    console.log(`从LocalStorage读取到 ${data.length} 条 ${tableName} 数据`);
    
    // 不再清空笔记内容，保留完整数据
    return data;
  }
  
  const db = await openDB();
  try {
    console.log(`从数据库中读取 ${tableName} 表数据...`);
    
    // 查询所有数据，包括笔记内容
    let query = `SELECT * FROM ${tableName}`;
    
    const results = await db.select(query) as any[];
    
    // 数据安全处理，特别针对笔记内容
    const processedResults = results.map((item: any, index: number) => {
      // 处理日期字段
      const processed = {
        ...item,
        createdAt: new Date(item.createdAt),
        updatedAt: new Date(item.updatedAt),
        reminder: item.reminder ? new Date(item.reminder) : undefined
      };
      
      // 特别处理笔记内容
      if (tableName === 'notes') {
        // 确保content字段存在
        if (!processed.content) {
          processed.content = '';
        } else if (typeof processed.content !== 'string') {
          console.error(`数据库中笔记 #${index} (ID: ${processed.id}) 内容类型错误:`, typeof processed.content);
          processed.content = String(processed.content || '');
        }
      }
      
      return processed;
    }) as T[];
    
    console.log(`成功从数据库读取 ${processedResults.length} 条 ${tableName} 数据`);
    return processedResults;
  } catch (error) {
    console.error(`从表 ${tableName} 获取数据失败:`, error);
    throw error;
  }
}

// 获取单个笔记（包含完整内容）
async function getNoteById(id: string): Promise<Note | null> {
  if (!isTauriApp) {
    // 从LocalStorage中获取完整笔记数据（忽略getAllFromTable的内容过滤）
    try {
      const notesStr = localStorage.getItem('notes');
      if (!notesStr) return null;
      
      const allNotes = JSON.parse(notesStr) as any[];
      const note = allNotes.find(n => n.id === id);
      
      if (!note) return null;
      
      // 处理日期字段
      return {
        ...note,
        createdAt: new Date(note.createdAt),
        updatedAt: new Date(note.updatedAt),
        reminder: note.reminder ? new Date(note.reminder) : undefined,
        // 确保内容字段正确
        content: note.content || '',
        title: note.title || '无标题',
        type: note.type || 'doc'
      };
    } catch (error) {
      console.error(`从LocalStorage获取笔记 ID: ${id} 失败:`, error);
      return null;
    }
  }

  const db = await openDB();
  try {
    // 从数据库中获取指定ID的笔记
    const results = await db.select(`SELECT * FROM notes WHERE id = ?`, [id]) as any[];
    
    if (results.length === 0) {
      return null;
    }
    
    // 处理日期字段
    const note = results[0];
    return {
      ...note,
      createdAt: new Date(note.createdAt),
      updatedAt: new Date(note.updatedAt),
      reminder: note.reminder ? new Date(note.reminder) : undefined,
      // 确保内容字段正确
      content: note.content || '',
      title: note.title || '无标题',
      type: note.type || 'doc'
    };
  } catch (error) {
    console.error(`获取笔记 ID: ${id} 失败:`, error);
    throw error;
  }
}

// 为不同类型的数据定义保存函数
async function saveCategories(categories: Category[]): Promise<void> {
  if (!isTauriApp) {
    console.log(`将 ${categories.length} 条分类保存到LocalStorage`);
    // 更新内存存储
    memoryStorage.categories = [...categories];
    // 保存到LocalStorage
    saveToLocalStorage('categories', categories);
    return Promise.resolve();
  }
  
  if (categories.length === 0) return;
  const db = await openDB();
  
  try {
    await db.execute('BEGIN TRANSACTION');
    await db.execute('DELETE FROM categories');
    
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
      );
    }
    
    await db.execute('COMMIT');
  } catch (error) {
    await db.execute('ROLLBACK');
    console.error('保存分类数据失败:', error);
    throw error;
  }
}

async function saveNotes(notes: Note[]): Promise<void> {
  // 验证笔记数据
  notes.forEach((note, index) => {
    if (!note.id) {
      console.error(`笔记 #${index} 缺少ID`, note);
      throw new Error(`笔记 #${index} 缺少ID`);
    }
    
    // 确保必要字段存在
    note.title = note.title || '无标题';
    note.content = note.content || '';
    note.type = note.type || 'doc';
    
    // 确保日期是有效的Date对象
    if (!(note.createdAt instanceof Date)) {
      console.warn(`笔记 #${index} (ID: ${note.id}) createdAt不是有效的Date对象，正在修复`);
      note.createdAt = new Date();
    }
    
    if (!(note.updatedAt instanceof Date)) {
      console.warn(`笔记 #${index} (ID: ${note.id}) updatedAt不是有效的Date对象，正在修复`);
      note.updatedAt = new Date();
    }
  });

  if (!isTauriApp) {
    console.log(`将 ${notes.length} 条笔记保存到LocalStorage`);
    // 更新内存存储
    memoryStorage.notes = [...notes];
    // 保存到LocalStorage
    saveToLocalStorage('notes', notes);
    return Promise.resolve();
  }
  
  if (notes.length === 0) {
    console.warn('尝试保存空笔记数组，操作已跳过');
    return;
  }
  
  console.log(`开始保存 ${notes.length} 条笔记到数据库`);
  const db = await openDB();
  
  try {
    await db.execute('BEGIN TRANSACTION');
    await db.execute('DELETE FROM notes');
    
    for (const item of notes) {
      try {
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
        );
      } catch (itemError) {
        console.error(`保存笔记 ID: ${item.id} 失败:`, itemError);
        throw itemError;
      }
    }
    
    await db.execute('COMMIT');
    console.log(`成功保存 ${notes.length} 条笔记到数据库`);
  } catch (error) {
    await db.execute('ROLLBACK');
    console.error('保存笔记数据失败:', error);
    throw error;
  }
}

// 保存单个笔记
async function saveOneNote(note: Note): Promise<void> {
  // 验证笔记数据
  if (!note.id) {
    console.error(`笔记缺少ID`, note);
    throw new Error(`笔记缺少ID`);
  }
  
  // 确保必要字段存在
  note.title = note.title || '无标题';
  note.content = note.content || '';
  note.type = note.type || 'doc';
  
  // 确保日期是有效的Date对象
  if (!(note.createdAt instanceof Date)) {
    console.warn(`笔记 (ID: ${note.id}) createdAt不是有效的Date对象，正在修复`);
    note.createdAt = new Date();
  }
  
  if (!(note.updatedAt instanceof Date)) {
    console.warn(`笔记 (ID: ${note.id}) updatedAt不是有效的Date对象，正在修复`);
    note.updatedAt = new Date();
  }

  if (!isTauriApp) {
    console.log(`保存单个笔记到LocalStorage (ID: ${note.id})`);
    
    try {
      // 从LocalStorage读取所有笔记
      const notesStr = localStorage.getItem('notes');
      let notes: Note[] = [];
      
      if (notesStr) {
        // 解析现有笔记，并替换要更新的笔记
        const parsedNotes = JSON.parse(notesStr);
        notes = parsedNotes.map((n: any) => {
          if (n.id === note.id) {
            return {
              ...note,
              createdAt: note.createdAt.toISOString(),
              updatedAt: note.updatedAt.toISOString(),
              reminder: note.reminder ? note.reminder.toISOString() : undefined
            };
          }
          return n;
        });
        
        // 如果没有找到要更新的笔记，添加它
        if (!notes.some(n => n.id === note.id)) {
          notes.push({
            ...note,
            createdAt: note.createdAt.toISOString(),
            updatedAt: note.updatedAt.toISOString(),
            reminder: note.reminder ? note.reminder.toISOString() : undefined
          } as any);
        }
      } else {
        // 如果没有现有笔记，创建一个新数组
        notes = [{
          ...note,
          createdAt: note.createdAt.toISOString(),
          updatedAt: note.updatedAt.toISOString(),
          reminder: note.reminder ? note.reminder.toISOString() : undefined
        }] as any[];
      }
      
      // 更新内存中的笔记
      const memoryNotes = memoryStorage.notes;
      const noteIndex = memoryNotes.findIndex(n => n.id === note.id);
      
      if (noteIndex !== -1) {
        // 更新现有笔记
        memoryNotes[noteIndex] = note;
      } else {
        // 添加新笔记
        memoryNotes.push(note);
      }
      
      // 保存到LocalStorage
      localStorage.setItem('notes', JSON.stringify(notes));
      return Promise.resolve();
    } catch (error) {
      console.error(`保存单个笔记失败 (ID: ${note.id}):`, error);
      throw error;
    }
  }
  
  console.log(`保存单个笔记到数据库 (ID: ${note.id})`);
  const db = await openDB();
  
  try {
    // 使用REPLACE语法，如果记录存在则更新，不存在则插入
    await db.execute(
      `REPLACE INTO notes (id, title, content, categoryId, createdAt, updatedAt, reminder) VALUES (?, ?, ?, ?, ?, ?, ?)`,
      [
        note.id,
        note.title,
        note.content,
        note.categoryId,
        note.createdAt.toISOString(),
        note.updatedAt.toISOString(),
        note.reminder ? note.reminder.toISOString() : null
      ]
    );
    
    console.log(`成功保存笔记 (ID: ${note.id}) 到数据库`);
  } catch (error) {
    console.error(`保存笔记失败 (ID: ${note.id}):`, error);
    throw error;
  }
}

async function saveTags(tags: Tag[]): Promise<void> {
  if (!isTauriApp) {
    console.log(`将 ${tags.length} 条标签保存到LocalStorage`);
    // 更新内存存储
    memoryStorage.tags = [...tags];
    // 保存到LocalStorage
    saveToLocalStorage('tags', tags);
    return Promise.resolve();
  }
  
  if (tags.length === 0) return;
  const db = await openDB();
  
  try {
    await db.execute('BEGIN TRANSACTION');
    await db.execute('DELETE FROM tags');
    
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
      );
    }
    
    await db.execute('COMMIT');
  } catch (error) {
    await db.execute('ROLLBACK');
    console.error('保存标签数据失败:', error);
    throw error;
  }
}

async function saveNoteTags(noteTags: NoteTag[]): Promise<void> {
  if (!isTauriApp) {
    console.log(`将 ${noteTags.length} 条笔记标签关联保存到LocalStorage`);
    // 更新内存存储
    memoryStorage.noteTags = [...noteTags];
    // 保存到LocalStorage
    saveToLocalStorage('noteTags', noteTags);
    return Promise.resolve();
  }
  
  if (noteTags.length === 0) return;
  const db = await openDB();
  
  try {
    await db.execute('BEGIN TRANSACTION');
    await db.execute('DELETE FROM noteTags');
    
    for (const item of noteTags) {
      await db.execute(
        'INSERT INTO noteTags (noteId, tagId) VALUES (?, ?)',
        [item.noteId, item.tagId]
      );
    }
    
    await db.execute('COMMIT');
  } catch (error) {
    await db.execute('ROLLBACK');
    console.error('保存笔记标签关联数据失败:', error);
    throw error;
  }
}

// 获取配置
const getConfig = (): { dataPath: string } => {
  try {
    const configStr = localStorage.getItem('notebook-config');
    if (configStr) {
      const config = JSON.parse(configStr);
      return {
        dataPath: config?.config?.dataPath || './data'
      };
    }
  } catch (error) {
    console.error('获取配置失败:', error);
  }
  return { dataPath: './data' };
};

// 导出的存储服务
export const storage = {
  // 初始化数据库
  init: async (): Promise<void> => {
    try {
      if (!isTauriApp) {
        console.log('在浏览器环境中运行，从LocalStorage初始化数据');
        
        // 从LocalStorage加载数据到内存
        memoryStorage.categories = loadFromLocalStorage<Category>('categories');
        memoryStorage.notes = loadFromLocalStorage<Note>('notes');
        memoryStorage.tags = loadFromLocalStorage<Tag>('tags');
        memoryStorage.noteTags = loadFromLocalStorage<NoteTag>('noteTags');
        
        console.log('从LocalStorage初始化完成:', {
          categories: memoryStorage.categories.length,
          notes: memoryStorage.notes.length,
          tags: memoryStorage.tags.length,
          noteTags: memoryStorage.noteTags.length
        });
        
        return Promise.resolve();
      }
      
      // 获取配置的保存路径
      const { dataPath } = getConfig();
      const db = await openDB(dataPath);
      await initDatabase(db);
      return Promise.resolve();
    } catch (error) {
      console.error('初始化数据库失败:', error);
      throw error;
    }
  },

  getAllCategories: () => getAllFromTable<Category>('categories'),
  saveCategories,

  getAllNotes: () => getAllFromTable<Note>('notes'),
  saveNotes,
  saveOneNote,
  
  getAllTags: () => getAllFromTable<Tag>('tags'),
  saveTags,
  
  getAllNoteTags: () => getAllFromTable<NoteTag>('noteTags'),
  saveNoteTags,
  
  getNoteById,

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