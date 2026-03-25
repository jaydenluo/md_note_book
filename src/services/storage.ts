import type { Tag, NoteTag } from '@stores/tagStore';
import type { Category } from '@stores/categoryStore';
import type { Note } from '@stores/noteStore';
import { tauriEnvironment } from '@utils/tauri';
import { fileStorageAdapter } from './fileStorageAdapter';
import { readJsonRelative, writeJsonRelative } from './fileDataStorage';

// 导出搜索相关类型
export interface SearchResult {
  note: Note;
  rank: number;
  snippet: string;
}

export interface SearchOptions {
  categoryId?: string;
  type?: string;
  limit?: number;
  offset?: number;
  includeContent?: boolean;
}

export interface AdvancedSearchOptions extends SearchOptions {
  searchFields?: ('title' | 'content')[];
  exactMatch?: boolean;
  caseSensitive?: boolean;
}

// 声明Tauri全局变量
declare global {
  interface Window {
    __TAURI__?: { [key: string]: unknown };
  }
}

const isTauri = tauriEnvironment.isTauri;

const APP_SETTINGS_FILE = 'meta/app-settings.json';

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
const loadFromLocalStorage = <T extends Category | Note | Tag | NoteTag>(key: keyof typeof memoryStorage): T[] => {
  try {
    // 首先检查是否有内存中的备份数据
    const memoryData = memoryStorage[key] as T[];
    
    const data = localStorage.getItem(key);
    if (!data) {
      return memoryData;
    }
    
    // 尝试解析数据
    let parsed: T[] = [];
    try {
      const rawData = JSON.parse(data) as unknown[];
      parsed = rawData.map((item) => {
        // 先将item转换为unknown，然后再转换为目标类型
        const rawItem = item as unknown;
        const processedItem = { ...(rawItem as object) } as T & {
          createdAt?: Date | string;
          updatedAt?: Date | string;
          reminder?: Date | string;
        };
      
      // 处理日期字段
      try {
          if (processedItem.createdAt) {
            processedItem.createdAt = typeof processedItem.createdAt === 'string' 
              ? new Date(processedItem.createdAt) 
              : new Date();
          }
          if (processedItem.updatedAt) {
            processedItem.updatedAt = typeof processedItem.updatedAt === 'string' 
              ? new Date(processedItem.updatedAt) 
              : new Date();
          }
          if (processedItem.reminder) {
            processedItem.reminder = typeof processedItem.reminder === 'string' 
              ? new Date(processedItem.reminder) 
              : undefined;
          }
      } catch (dateError) {
        console.error(`处理${key}项日期字段失败`, dateError);
      }
      
        return processedItem as T;
      });
    } catch (parseError) {
      console.error(`解析${key}数据失败`, parseError);
      return memoryData;
    }
    
    if (!Array.isArray(parsed) || parsed.length === 0) {
      return memoryData;
        }
        
    // 更新内存存储
    switch (key) {
      case 'categories':
        memoryStorage.categories = Array.from(parsed) as Category[];
        break;
      case 'notes':
        memoryStorage.notes = Array.from(parsed) as Note[];
        break;
      case 'tags':
        memoryStorage.tags = Array.from(parsed) as Tag[];
        break;
      case 'noteTags':
        memoryStorage.noteTags = Array.from(parsed) as NoteTag[];
        break;
      default:
        console.warn(`未知的存储键: ${key}`);
      return memoryData;
    }
    
    return parsed;
  } catch (error) {
    console.error(`从LocalStorage读取${key}数据失败`, error);
    return memoryStorage[key] as T[];
  }
};

// 在浏览器环境中使用LocalStorage
const saveToLocalStorage = <T extends Category | Note | Tag | NoteTag>(key: keyof typeof memoryStorage, data: T[]): void => {
  try {
    console.log(`保存${key}数据到LocalStorage，数据条数: ${data.length}`);
    
    // 内容验证和清理 - 特别是笔记数据
    const cleanData = data.map((item) => {
      const newItem = { ...item } as T;
      
      // 处理Date对象，确保它们被正确序列化
      if ('createdAt' in newItem && newItem.createdAt instanceof Date) {
        const dateItem = newItem as unknown as { createdAt: Date };
        (newItem as unknown as { createdAt: string }).createdAt = dateItem.createdAt.toISOString();
      }
      
      if ('updatedAt' in newItem && newItem.updatedAt instanceof Date) {
        const dateItem = newItem as unknown as { updatedAt: Date };
        (newItem as unknown as { updatedAt: string }).updatedAt = dateItem.updatedAt.toISOString();
      }
      
      if ('reminder' in newItem && newItem.reminder instanceof Date) {
        const dateItem = newItem as unknown as { reminder: Date };
        (newItem as unknown as { reminder: string | undefined }).reminder = dateItem.reminder.toISOString();
      }
      
      // 特别检查笔记数据
      if (key === 'notes') {
        const noteItem = newItem as Note;
        // 确保内容和标题不是undefined或null
        noteItem.content = noteItem.content || '';
        noteItem.title = noteItem.title || '无标题';
        noteItem.type = noteItem.type || 'doc';
      }
      
      return newItem;
    });
    
    const jsonString = JSON.stringify(cleanData);
    
    localStorage.setItem(key, jsonString);
    console.log(`${key}数据保存成功`);
    
    // 备份到内存存储
    switch (key) {
      case 'categories':
        memoryStorage.categories = Array.from(data) as Category[];
        break;
      case 'notes':
        memoryStorage.notes = Array.from(data) as Note[];
        break;
      case 'tags':
        memoryStorage.tags = Array.from(data) as Tag[];
        break;
      case 'noteTags':
        memoryStorage.noteTags = Array.from(data) as NoteTag[];
        break;
    }
  } catch (error) {
    console.error(`保存${key}数据到LocalStorage失败`, error);
    // 备份到内存，避免数据丢失
    switch (key) {
      case 'categories':
        memoryStorage.categories = Array.from(data) as Category[];
        break;
      case 'notes':
        memoryStorage.notes = Array.from(data) as Note[];
        break;
      case 'tags':
        memoryStorage.tags = Array.from(data) as Tag[];
        break;
      case 'noteTags':
        memoryStorage.noteTags = Array.from(data) as NoteTag[];
        break;
    }
  }
};

async function getAllFromTable<T extends Category | Note | Tag | NoteTag>(tableName: keyof typeof memoryStorage): Promise<T[]> {
  if (!isTauri) {
    const data = loadFromLocalStorage<T>(tableName);
    if (data.length === 0) {
      return memoryStorage[tableName] as T[];
    }
    return data;
  }

  switch (tableName) {
    case 'categories':
      return fileStorageAdapter.getAllCategories() as Promise<T[]>;
    case 'notes':
      return fileStorageAdapter.getAllNotes() as Promise<T[]>;
    case 'tags':
      return fileStorageAdapter.getAllTags() as Promise<T[]>;
    case 'noteTags':
      return fileStorageAdapter.getAllNoteTags() as Promise<T[]>;
    default:
      throw new Error(`未知的表名: ${tableName}`);
  }
}

// 获取单个笔记（包含完整内容）
async function getNoteById(id: string): Promise<Note | null> {
  if (!isTauri) {
    try {
      const notesStr = localStorage.getItem('notes');
      if (!notesStr) return null;

      const allNotes = JSON.parse(notesStr) as (Omit<Note, 'createdAt' | 'updatedAt' | 'reminder'> & {
        createdAt: string;
        updatedAt: string;
        reminder?: string;
      })[];
      const note = allNotes.find(n => n.id === id);

      if (!note) return null;

      return {
        ...note,
        createdAt: new Date(note.createdAt),
        updatedAt: new Date(note.updatedAt),
        reminder: note.reminder ? new Date(note.reminder) : undefined,
        content: note.content || '',
        title: note.title || '无标题',
        type: note.type || 'doc'
      };
    } catch (error) {
      console.error(`从LocalStorage获取笔记 ID: ${id} 失败:`, error);
      return null;
    }
  }

  return fileStorageAdapter.getNoteById(id);
}

// 为不同类型的数据定义保存函数
async function saveCategories(categories: Category[]): Promise<void> {
  if (!isTauri) {
    console.log(`将 ${categories.length} 条分类保存到LocalStorage`);
    memoryStorage.categories = [...categories];
    saveToLocalStorage('categories', categories);
    return;
  }
  await fileStorageAdapter.saveCategories(categories);
}

// 保存笔记
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

  if (!isTauri) {
    console.log(`将 ${notes.length} 条笔记保存到LocalStorage`);
    // 更新内存存储
    memoryStorage.notes = [...notes];
    // 保存到LocalStorage
    saveToLocalStorage('notes', notes);
    return;
  }
  if (notes.length === 0) {
    console.warn('尝试保存空笔记数组，操作已跳过');
    return;
  }

  await fileStorageAdapter.saveNotes(notes);
}

// 保存单个笔记
async function saveOneNote(note: Note): Promise<void> {
  if (!isTauri) {
    console.log('浏览器模式：保存笔记到 LocalStorage');
    const notes = loadFromLocalStorage<Note>('notes');
    const index = notes.findIndex(n => n.id === note.id);
    if (index !== -1) {
      notes[index] = note;
    } else {
      notes.push(note);
    }
    saveToLocalStorage('notes', notes);
    return;
  }

  await fileStorageAdapter.saveOneNote(note);
}

// 删除笔记
async function deleteNote(id: string): Promise<void> {
  if (!isTauri) {
    try {
      // 从LocalStorage读取所有笔记
      const notesStr = localStorage.getItem('notes');
      if (!notesStr) return;
      
      const allNotes = JSON.parse(notesStr) as Note[];
      const noteToDelete = allNotes.find(note => note.id === id);
      const filteredNotes = allNotes.filter((note) => note.id !== id);
      
      // 更新内存存储
      memoryStorage.notes = filteredNotes;
      
      // 保存到LocalStorage
      localStorage.setItem('notes', JSON.stringify(filteredNotes));
      
      // 清理笔记相关的图片文件（仅在Tauri环境中）
      if (noteToDelete?.content) {
        try {
          const { cleanupUnusedImages } = await import('./imageStorage');
          const usedImagePaths = extractImagePathsFromContent(noteToDelete.content);
          await cleanupUnusedImages(usedImagePaths);
        } catch (cleanupError) {
          console.warn('清理图片文件失败:', cleanupError);
        }
      }
      
      return;
    } catch (error) {
      console.error(`从LocalStorage删除笔记失败 (ID: ${id}):`, error);
      throw error;
    }
  }
  
  const deletedNote = await fileStorageAdapter.deleteNote(id);
  const noteContent = deletedNote?.content || '';

  // 清理笔记相关的图片文件
  try {
    const { cleanupUnusedImages } = await import('./imageStorage');
    const usedImagePaths = extractImagePathsFromContent(noteContent);
    await cleanupUnusedImages(usedImagePaths);
  } catch (cleanupError) {
    console.warn('清理图片文件失败:', cleanupError);
  }
}

// 从HTML内容中提取图片路径
function extractImagePathsFromContent(content: string): string[] {
  const imagePaths: string[] = [];
  
  try {
    // 创建临时DOM元素来解析HTML
    const tempDiv = document.createElement('div');
    tempDiv.innerHTML = content;
    
    // 查找所有图片元素
    const images = tempDiv.querySelectorAll('img[data-image-path]');
    images.forEach(img => {
      const path = img.getAttribute('data-image-path');
      if (path) {
        imagePaths.push(path);
      }
    });
  } catch (error) {
    console.warn('提取图片路径失败:', error);
  }
  
  return imagePaths;
}

async function saveTags(tags: Tag[]): Promise<void> {
  if (!isTauri) {
    console.log(`将 ${tags.length} 条标签保存到LocalStorage`);
    // 更新内存存储
    memoryStorage.tags = [...tags];
    // 保存到LocalStorage
    saveToLocalStorage('tags', tags);
    return;
  }
  
  if (tags.length === 0) {
    console.warn('尝试保存空标签数组，操作已跳过');
    return;
  }

  await fileStorageAdapter.saveTags(tags);
}

async function saveNoteTags(noteTags: NoteTag[]): Promise<void> {
  if (!isTauri) {
    console.log(`将 ${noteTags.length} 条笔记标签关联保存到LocalStorage`);
    // 更新内存存储
    memoryStorage.noteTags = [...noteTags];
    // 保存到LocalStorage
    saveToLocalStorage('noteTags', noteTags);
    return;
  }
  
  if (noteTags.length === 0) {
    console.warn('尝试保存空笔记标签关联数组，操作已跳过');
    return;
  }

  await fileStorageAdapter.saveNoteTags(noteTags);
}

// 添加配置表相关的类型和函数
interface AppSettings {
  selectedCategoryId?: string;
  // 可以添加其他设置项
}

async function saveSettings(settings: AppSettings): Promise<void> {
  if (!isTauri) {
    // 在浏览器环境中，使用 localStorage
    Object.entries(settings).forEach(([key, value]) => {
      if (value !== undefined) {
        localStorage.setItem(key, value.toString());
      }
    });
    return;
  }

  const existing = await readJsonRelative<AppSettings>(APP_SETTINGS_FILE, {});
  await writeJsonRelative(APP_SETTINGS_FILE, { ...existing, ...settings });
}

async function getSettings(): Promise<AppSettings> {
  if (!isTauri) {
    // 在浏览器环境中，从 localStorage 读取
    return {
      selectedCategoryId: localStorage.getItem('selectedCategoryId') || undefined,
      // 可以添加其他设置项
    };
  }

  return readJsonRelative<AppSettings>(APP_SETTINGS_FILE, {});
}

// 获取配置
interface AppConfig {
  dataPath: string;
  theme?: string;
  language?: string;
}

interface StoredConfig {
  config?: AppConfig;
}

const getConfig = (): AppConfig => {
  try {
    const configStr = localStorage.getItem('notebook-config');
    if (configStr) {
      const storedData = JSON.parse(configStr);
      // Zustand persist 存储格式：{ state: { config: AppConfig }, version: number }
      const config = storedData?.state?.config || storedData?.config;
      return {
        dataPath: config?.dataPath || '',
        theme: config?.theme,
        language: config?.language
      };
    }
  } catch (error) {
    console.error('获取配置失败:', error);
  }
  return { dataPath: '' };
};

// 保存配置
const saveConfig = async (config: Partial<AppConfig>): Promise<void> => {
  try {
    const configStr = localStorage.getItem('notebook-config') || '{}';
    const existingConfig = JSON.parse(configStr) as StoredConfig;
    
    const newConfig = {
      ...existingConfig,
      config: {
        ...existingConfig.config,
        ...config
      }
    };
    
    localStorage.setItem('notebook-config', JSON.stringify(newConfig));
    
    if (isTauri) {
      try {
        const { mkdir, writeTextFile } = await import('@tauri-apps/plugin-fs');
        const { join, appDataDir } = await import('@tauri-apps/api/path');
        
        const appDir = await appDataDir();
        const notebookDir = await join(appDir, 'notebook');
        const configPath = await join(notebookDir, 'config.json');
        
        // 确保目录存在
        try {
          await mkdir(notebookDir, { recursive: true });
        } catch (error) {
          console.warn('创建配置目录失败:', error);
        }
        
        // 写入配置文件
        await writeTextFile(configPath, JSON.stringify(newConfig, null, 2));
      } catch (error) {
        console.error('保存配置文件失败:', error);
      }
    }
  } catch (error) {
    console.error('保存配置失败:', error);
    throw error;
  }
};

// FTS5 全文搜索功能
async function fullTextSearch(query: string, options: SearchOptions = {}): Promise<SearchResult[]> {
  if (!isTauri) {
    const trimmedQuery = query.trim().toLowerCase();
    if (!trimmedQuery) {
      return [];
    }

    const notes = await getAllFromTable<Note>('notes');
    const start = options.offset ?? 0;
    const limit = options.limit ?? 50;

    const filtered = notes
      .filter((note) => {
        if (options.categoryId && note.categoryId !== options.categoryId) {
          return false;
        }
        if (options.type && note.type !== options.type) {
          return false;
        }

        const titleText = (note.title || '').toLowerCase();
        const contentText = (note.content || '').toLowerCase();
        return titleText.includes(trimmedQuery) || contentText.includes(trimmedQuery);
      })
      .slice(start, start + limit)
      .map((note) => {
        const titleText = (note.title || '').toLowerCase();
        const rank = titleText.includes(trimmedQuery) ? 2 : 1;
        return {
          note,
          rank,
          snippet: (note.content || '').substring(0, 200)
        };
      });

    return filtered;
  }

  try {
    const limit = options.limit ?? 50;
    const rustResults = await invoke<any[]>('search_notes', { query, limit });
    
    // 获取所有笔记以匹配结果
    const allNotes = await storage.getAllNotes();
    const results: SearchResult[] = [];

    for (const rustRes of rustResults) {
      const note = allNotes.find(n => n.id === rustRes.id);
      if (note) {
        results.push({
          note,
          rank: rustRes.score,
          snippet: rustRes.snippet
        });
      }
    }

    // 过滤分类和类型（Tantivy 目前只做了基础字段，后续可以在 Rust 侧完善过滤）
    return results.filter(r => {
      if (options.categoryId && r.note.categoryId !== options.categoryId) return false;
      if (options.type && r.note.type !== options.type) return false;
      return true;
    });
  } catch (error) {
    console.error('Tantivy 搜索失败:', error);
    return [];
  }
}

// 高级搜索功能（支持多种搜索语法）
async function advancedSearch(
  query: string, 
  options: AdvancedSearchOptions = {}
): Promise<SearchResult[]> {
  const normalizedQuery = options.exactMatch ? query : query.trim();
  return fullTextSearch(normalizedQuery, options);
}

// 搜索建议功能（根据输入提供建议）
async function searchSuggestions(partialQuery: string, limit: number = 10): Promise<string[]> {
  const suggestions = new Set<string>();
  const queryLower = partialQuery.trim().toLowerCase();
  if (!queryLower) {
    return [];
  }

  const notes = await getAllFromTable<Note>('notes');
  notes.forEach((note) => {
    const words = ((note.title || '') + ' ' + (note.content || '')).toLowerCase().split(/\s+/);
    words.forEach((word) => {
      if (word.startsWith(queryLower) && word.length > queryLower.length) {
        suggestions.add(word);
      }
    });
  });

  return Array.from(suggestions).slice(0, limit);
}

// 按标签搜索笔记
async function searchByTags(tagIds: string[], options: SearchOptions = {}): Promise<SearchResult[]> {
  const notes = await getAllFromTable<Note>('notes');
  const noteTags = await getAllFromTable<NoteTag>('noteTags');
  const noteIdsWithTags = new Set(
    noteTags
      .filter((nt) => tagIds.includes(nt.tagId))
      .map((nt) => nt.noteId)
  );

  const start = options.offset ?? 0;
  const limit = options.limit ?? 50;

  return notes
    .filter((note) => {
      if (!noteIdsWithTags.has(note.id)) {
        return false;
      }
      if (options.categoryId && note.categoryId !== options.categoryId) {
        return false;
      }
      if (options.type && note.type !== options.type) {
        return false;
      }
      return true;
    })
    .slice(start, start + limit)
    .map((note) => ({
      note,
      rank: 1,
      snippet: (note.content || '').substring(0, 200)
    }));
}

// 模糊搜索（支持拼音和错别字）
async function fuzzySearch(query: string, options: SearchOptions = {}): Promise<SearchResult[]> {
  const notes = await getAllFromTable<Note>('notes');
  const searchLower = query.toLowerCase();
  const start = options.offset ?? 0;
  const limit = options.limit ?? 50;

  const filtered = notes
    .filter((note) => {
      if (options.categoryId && note.categoryId !== options.categoryId) {
        return false;
      }
      if (options.type && note.type !== options.type) {
        return false;
      }

      const titleLower = (note.title || '').toLowerCase();
      const contentLower = (note.content || '').toLowerCase();

      return fuzzyMatch(titleLower, searchLower) || fuzzyMatch(contentLower, searchLower);
    })
    .slice(start, start + limit)
    .map((note) => ({
      note,
      rank: 1,
      snippet: (note.content || '').substring(0, 200)
    }));

  return filtered;
}

// 简单的模糊匹配算法
function fuzzyMatch(text: string, pattern: string): boolean {
  if (pattern.length === 0) return true;
  if (text.length === 0) return false;
  
  let patternIdx = 0;
  for (let i = 0; i < text.length && patternIdx < pattern.length; i++) {
    if (text[i] === pattern[patternIdx]) {
      patternIdx++;
    }
  }
  
  return patternIdx === pattern.length;
}

// 组合搜索（支持多种搜索条件）
async function combinedSearch(options: {
  query?: string;
  tagIds?: string[];
  categoryId?: string;
  type?: string;
  fuzzy?: boolean;
  limit?: number;
  offset?: number;
}): Promise<SearchResult[]> {
  const { query, tagIds, fuzzy, ...searchOptions } = options;
  
  let results: SearchResult[] = [];
  
  // 如果有搜索词
  if (query && query.trim()) {
    if (fuzzy) {
      results = await fuzzySearch(query, searchOptions);
    } else {
      results = await fullTextSearch(query, searchOptions);
    }
  }
  
  // 如果有标签筛选
  if (tagIds && tagIds.length > 0) {
    const tagResults = await searchByTags(tagIds, searchOptions);
    
    if (results.length > 0) {
      // 取交集
      const resultNoteIds = new Set(results.map(r => r.note.id));
      results = tagResults.filter(r => resultNoteIds.has(r.note.id));
    } else {
      results = tagResults;
    }
  }
  
  // 如果没有任何搜索条件，返回所有笔记
  if (!query && (!tagIds || tagIds.length === 0)) {
    const allNotes = await getAllFromTable<Note>('notes');
    results = allNotes
      .filter(note => {
        if (searchOptions.categoryId && note.categoryId !== searchOptions.categoryId) {
          return false;
        }
        if (searchOptions.type && note.type !== searchOptions.type) {
          return false;
        }
        return true;
      })
      .slice(searchOptions.offset || 0, (searchOptions.offset || 0) + (searchOptions.limit || 50))
      .map(note => ({
        note,
        rank: 1,
        snippet: note.content.substring(0, 200)
      }));
  }
  
  return results;
}

// 重建全文搜索索引
async function rebuildSearchIndex(): Promise<void> {
  if (!isTauri) return;
  console.info('当前使用文件系统搜索逻辑，重建索引暂为无操作');
  await fileStorageAdapter.init();
}

// 导出的存储服务
export const storage = {
  // 初始化存储
  init: async (): Promise<void> => {
    if (!isTauri) {
      console.log('浏览器环境：从 LocalStorage 初始化数据');
      memoryStorage.categories = loadFromLocalStorage<Category>('categories');
      memoryStorage.notes = loadFromLocalStorage<Note>('notes');
      memoryStorage.tags = loadFromLocalStorage<Tag>('tags');
      memoryStorage.noteTags = loadFromLocalStorage<NoteTag>('noteTags');
      return;
    }

    await fileStorageAdapter.init();

    const [categories, notes, tags, noteTags] = await Promise.all([
      fileStorageAdapter.getAllCategories(),
      fileStorageAdapter.getAllNotes(),
      fileStorageAdapter.getAllTags(),
      fileStorageAdapter.getAllNoteTags()
    ]);

    memoryStorage.categories = categories;
    memoryStorage.notes = notes;
    memoryStorage.tags = tags;
    memoryStorage.noteTags = noteTags;
  },

  getAllCategories: () => getAllFromTable<Category>('categories'),
  saveCategories,

  getAllNotes: () => getAllFromTable<Note>('notes'),
  saveNotes,
  saveOneNote,
  deleteNote,
  
  getAllTags: () => getAllFromTable<Tag>('tags'),
  saveTags,
  
  getAllNoteTags: () => getAllFromTable<NoteTag>('noteTags'),
  saveNoteTags,
  
  getNoteById,
  
  // 添加配置相关方法
  getConfig,
  saveConfig,

  // 添加设置相关方法
  saveSettings,
  getSettings,

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
      const data = JSON.parse(jsonData) as {
        categories?: Category[];
        notes?: Note[];
        tags?: Tag[];
        noteTags?: NoteTag[];
      };
      
      if (data.categories) {
        await storage.saveCategories(data.categories.map((c) => ({
          ...c,
          createdAt: new Date(c.createdAt),
          updatedAt: new Date(c.updatedAt)
        })));
      }
      
      if (data.notes) {
        await storage.saveNotes(data.notes.map((n) => ({
          ...n,
          createdAt: new Date(n.createdAt),
          updatedAt: new Date(n.updatedAt),
          reminder: n.reminder ? new Date(n.reminder) : undefined
        })));
      }
      
      if (data.tags) {
        await storage.saveTags(data.tags.map((t) => ({
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
  },

  // 全文搜索功能
  fullTextSearch,
  advancedSearch,
  searchSuggestions,
  rebuildSearchIndex,
  
  // 增强搜索功能
  searchByTags,
  fuzzySearch,
  combinedSearch
};

// 从IndexedDB迁移数据到SQLite（一次性迁移功能）
export async function migrateFromIndexedDB(): Promise<boolean> {
  try {
    // 检查是否有IndexedDB数据
    if (!window.indexedDB) {
      return false;
    }
    
    // 尝试打开旧的IndexedDB数据库
    const request = indexedDB.open('notebook_db', 1);
    
    return new Promise<boolean>((resolve) => {
      request.onerror = () => resolve(false); // 无法打开旧数据库，可能不存在
      
      request.onsuccess = async () => {
        const db = request.result;
        
        // 检查是否有所需的存储对象
        if (!db.objectStoreNames.contains('categories') || 
            !db.objectStoreNames.contains('notes') || 
            !db.objectStoreNames.contains('tags') || 
            !db.objectStoreNames.contains('noteTags')) {
          resolve(false);
          return;
        }
        
        try {
          // 从IndexedDB读取数据
          const categories = await getIndexedDBData<Category>(db, 'categories');
          const notes = await getIndexedDBData<Note>(db, 'notes');
          const tags = await getIndexedDBData<Tag>(db, 'tags');
          const noteTags = await getIndexedDBData<NoteTag>(db, 'noteTags');
          
          if (!isTauri) {
            // 在浏览器环境中直接更新内存存储
            memoryStorage.categories = categories;
            memoryStorage.notes = notes;
            memoryStorage.tags = tags;
            memoryStorage.noteTags = noteTags;
            resolve(true);
            return;
          }
          
          // 保存到SQLite
          await storage.saveCategories(categories);
          await storage.saveNotes(notes);
          await storage.saveTags(tags);
          await storage.saveNoteTags(noteTags);
          
          // 迁移成功
          resolve(true);
        } catch (error) {
          console.error('迁移数据失败:', error);
          resolve(false);
        } finally {
          db.close();
        }
      };
    });
  } catch (error) {
    console.error('迁移过程出错:', error);
    return false;
  }
}

// 从IndexedDB获取数据的辅助函数
interface IndexedDBItem {
  id: string;
  createdAt: string;
  updatedAt: string;
  reminder?: string;
  content?: string;
  title?: string;
  type?: string;
  name?: string;
  color?: string;
  categoryId?: string;
  noteId?: string;
  tagId?: string;
}

function getIndexedDBData<T extends Category | Note | Tag | NoteTag>(db: IDBDatabase, storeName: string): Promise<T[]> {
  return new Promise<T[]>((resolve, reject) => {
    const transaction = db.transaction(storeName, 'readonly');
    const store = transaction.objectStore(storeName);
    const request = store.getAll();
    
    request.onerror = () => reject(request.error);
    request.onsuccess = () => {
      const results = request.result.map((item: IndexedDBItem) => ({
        ...item,
        createdAt: new Date(item.createdAt),
        updatedAt: new Date(item.updatedAt),
        reminder: item.reminder ? new Date(item.reminder) : undefined
      })) as T[];
      resolve(results);
    };
  });
} 