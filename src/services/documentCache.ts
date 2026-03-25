import { Note } from '@stores/noteStore';

interface CacheEntry {
  note: Note;
  timestamp: number;
}

/**
 * DocumentCache 类用于管理笔记内容的内存缓存
 * 采用 LRU (Least Recently Used) 策略，防止内存占用过大
 */
class DocumentCache {
  private cache: Map<string, CacheEntry> = new Map();
  private maxItems: number;
  private ttl: number; // Time to live in milliseconds

  constructor(maxItems = 100, ttl = 30 * 60 * 1000) {
    this.maxItems = maxItems;
    this.ttl = ttl;
  }

  /**
   * 获取缓存的笔记
   */
  get(id: string): Note | null {
    const entry = this.cache.get(id);
    if (!entry) return null;

    // 检查是否过期
    if (Date.now() - entry.timestamp > this.ttl) {
      this.cache.delete(id);
      return null;
    }

    // 更新访问时间 (LRU)
    entry.timestamp = Date.now();
    this.cache.delete(id);
    this.cache.set(id, entry);
    
    return entry.note;
  }

  /**
   * 设置缓存
   */
  set(note: Note): void {
    if (!note.id) return;

    // 如果已存在，先删除以更新位置 (LRU)
    if (this.cache.has(note.id)) {
      this.cache.delete(note.id);
    } else if (this.cache.size >= this.maxItems) {
      // 删除最早访问的项目
      const firstKey = this.cache.keys().next().value;
      if (firstKey) this.cache.delete(firstKey);
    }

    this.cache.set(note.id, {
      note,
      timestamp: Date.now()
    });
  }

  /**
   * 删除缓存
   */
  delete(id: string): void {
    this.cache.delete(id);
  }

  /**
   * 清空缓存
   */
  clear(): void {
    this.cache.clear();
  }
}

export const documentCache = new DocumentCache();
