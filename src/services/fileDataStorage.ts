import { tauriEnvironment } from '@utils/tauri';
import { sanitizeFilename } from '@/utils/markdown';

export type FsDirEntry = { path: string; children?: FsDirEntry[] };

type FsMethods = {
  mkdir: (path: string, options?: { recursive?: boolean }) => Promise<void>;
  readTextFile: (path: string) => Promise<string>;
  writeTextFile: (path: string, contents: string) => Promise<void>;
  readDir: (path: string, options?: { recursive?: boolean }) => Promise<FsDirEntry[]>;
  remove: (path: string, options?: { recursive?: boolean }) => Promise<void>;
};

type FsModule = Partial<FsMethods> & {
  default?: Partial<FsMethods>;
  [key: string]: unknown;
};

type FsMethodName = keyof FsMethods;

type PathModule = {
  join: (...paths: string[]) => Promise<string>;
  dirname: (path: string) => Promise<string>;
  appDataDir: () => Promise<string>;
};

export type MetadataKey = 'categories' | 'tags' | 'noteTags' | 'noteIndex';

export interface NoteIndexEntry {
  id: string;
  title: string;
  categoryId?: string | null;
  categoryName?: string | null;
  type: string;
  fileName: string;
  filePath: string;
  createdAt: string;
  updatedAt: string;
}

const METADATA_DIR = 'meta';
export const NOTES_DIR = 'notes';
const METADATA_FILE_MAP: Record<MetadataKey, string> = {
  categories: 'categories.json',
  tags: 'tags.json',
  noteTags: 'note-tags.json',
  noteIndex: 'note-index.json'
};

let cachedRootDir: string | null = null;
let fsModulePromise: Promise<FsModule> | null = null;
let pathModulePromise: Promise<PathModule> | null = null;
let fsMethodsCache: FsMethods | null = null;

function ensureTauri(): void {
  if (!tauriEnvironment.isTauri) {
    throw new Error('文件系统存储仅在 Tauri 环境中可用');
  }
}

async function getFsModule(): Promise<FsModule> {
  ensureTauri();
  if (!fsModulePromise) {
    fsModulePromise = import('@tauri-apps/plugin-fs') as Promise<FsModule>;
  }
  return fsModulePromise;
}

export async function getPathModule(): Promise<PathModule> {
  ensureTauri();
  if (!pathModulePromise) {
    pathModulePromise = import('@tauri-apps/api/path') as Promise<PathModule>;
  }
  return pathModulePromise;
}

function pickMethod<M extends FsMethodName>(module: FsModule, method: M): FsMethods[M] {
  const candidate = module[method] ?? module.default?.[method];
  if (typeof candidate !== 'function') {
    throw new Error(`文件系统插件缺少 ${method} 方法`);
  }
  return candidate as FsMethods[M];
}

async function getFsMethods(): Promise<FsMethods> {
  if (fsMethodsCache) {
    return fsMethodsCache;
  }
  const module = await getFsModule();
  fsMethodsCache = {
    mkdir: pickMethod(module, 'mkdir'),
    readTextFile: pickMethod(module, 'readTextFile'),
    writeTextFile: pickMethod(module, 'writeTextFile'),
    readDir: pickMethod(module, 'readDir'),
    remove: pickMethod(module, 'remove')
  };
  return fsMethodsCache;
}

function readPersistedConfig(): { dataPath?: string } {
  try {
    const raw = localStorage.getItem('notebook-config');
    if (!raw) {
      return {};
    }
    const parsed = JSON.parse(raw) as {
      state?: { config?: { dataPath?: string } };
      config?: { dataPath?: string };
    };
    return parsed.state?.config ?? parsed.config ?? {};
  } catch (error) {
    console.warn('解析 notebook-config 失败:', error);
    return {};
  }
}

export async function ensureDirPath(targetPath: string): Promise<void> {
  const { mkdir } = await getFsMethods();
  await mkdir(targetPath, { recursive: true });
}

async function resolveRootDir(): Promise<string> {
  const config = readPersistedConfig();
  const trimmed = config.dataPath?.trim();
  const pathModule = await getPathModule();

  if (trimmed) {
    await ensureDirPath(trimmed);
    return trimmed;
  }

  const appDir = await pathModule.appDataDir();
  const defaultDir = await pathModule.join(appDir, 'notebook');
  await ensureDirPath(defaultDir);
  return defaultDir;
}

async function ensureBaseStructure(root: string): Promise<void> {
  const pathModule = await getPathModule();
  const metaDir = await pathModule.join(root, METADATA_DIR);
  const notesDir = await pathModule.join(root, NOTES_DIR);
  await ensureDirPath(metaDir);
  await ensureDirPath(notesDir);
}

export function isFileNotFound(error: unknown): boolean {
  const message = error instanceof Error ? error.message : String(error);
  // 打印原始错误信息以便调试
  console.log('检查文件是否存在错误:', message);
  const lowerMessage = message.toLowerCase();

  // 综合判断逻辑：英文关键字、中文关键字、系统错误码
  const isEnglishMissing = lowerMessage.includes('no such file') || lowerMessage.includes('not found');
  const isChineseMissing = 
    message.includes('系统找不到指定的文件') || 
    message.includes('系统找不到指定的路径') ||
    message.includes('系统找不到指定');
  const isOsErrorMissing = 
    message.includes('os error 2') || 
    message.includes('os error 3');

  return isEnglishMissing || isChineseMissing || isOsErrorMissing;
}

async function readTextFile(filePath: string): Promise<string> {
  const { readTextFile: readFn } = await getFsMethods();
  return readFn(filePath);
}

async function writeTextFile(filePath: string, content: string): Promise<void> {
  const { writeTextFile: writeFn } = await getFsMethods();
  await writeFn(filePath, content);
}

async function ensureParentDir(filePath: string): Promise<void> {
  const pathModule = await getPathModule();
  const dir = await pathModule.dirname(filePath);
  await ensureDirPath(dir);
}

async function getMetadataFilePath(key: MetadataKey): Promise<string> {
  const root = await getDataRootDir();
  const pathModule = await getPathModule();
  const metaDir = await pathModule.join(root, METADATA_DIR);
  return pathModule.join(metaDir, METADATA_FILE_MAP[key]);
}

export async function getDataRootDir(options?: { force?: boolean }): Promise<string> {
  if (!cachedRootDir || options?.force) {
    cachedRootDir = await resolveRootDir();
    await ensureBaseStructure(cachedRootDir);
  }
  return cachedRootDir;
}

export async function readMetadataFile<T>(key: MetadataKey, fallback: T): Promise<T> {
  try {
    const filePath = await getMetadataFilePath(key);
    const content = await readTextFile(filePath);
    return JSON.parse(content) as T;
  } catch (error) {
    if (isFileNotFound(error)) {
      await writeMetadataFile(key, fallback);
      return fallback;
    }
    console.error(`读取 ${key} 元数据失败:`, error);
    return fallback;
  }
}

export async function writeMetadataFile<T>(key: MetadataKey, data: T): Promise<void> {
  const filePath = await getMetadataFilePath(key);
  await ensureParentDir(filePath);
  await writeTextFile(filePath, JSON.stringify(data, null, 2));
}

export async function readJsonRelative<T>(relativePath: string, fallback: T): Promise<T> {
  try {
    const root = await getDataRootDir();
    const pathModule = await getPathModule();
    const filePath = await pathModule.join(root, relativePath);
    const content = await readTextFile(filePath);
    return JSON.parse(content) as T;
  } catch (error) {
    if (isFileNotFound(error)) {
      return fallback;
    }
    console.error(`读取 ${relativePath} 失败:`, error);
    return fallback;
  }
}

export async function writeJsonRelative<T>(relativePath: string, data: T): Promise<void> {
  const root = await getDataRootDir();
  const pathModule = await getPathModule();
  const filePath = await pathModule.join(root, relativePath);
  await ensureParentDir(filePath);
  await writeTextFile(filePath, JSON.stringify(data, null, 2));
}

export function resetFileStorageCache(): void {
  cachedRootDir = null;
}

export function generateNoteFileName(title: string, noteId: string): string {
  const safeTitle = sanitizeFilename(title || 'untitled');
  const shortId = (noteId || '').substring(0, 8) || 'note';
  return `${safeTitle}-${shortId}.md`;
}

export async function buildNoteFilePath(params: {
  title: string;
  noteId: string;
  categoryName?: string | null;
}): Promise<{ filePath: string; fileName: string; categoryDir: string }> {
  const { title, noteId, categoryName } = params;
  const root = await getDataRootDir();
  const pathModule = await getPathModule();
  const safeCategory = categoryName ? sanitizeFilename(categoryName) : 'uncategorized';
  const categoryDir = await pathModule.join(root, NOTES_DIR, safeCategory || 'uncategorized');
  await ensureDirPath(categoryDir);
  const fileName = generateNoteFileName(title, noteId);
  const filePath = await pathModule.join(categoryDir, fileName);
  return { filePath, fileName, categoryDir };
}

/**
 * 删除指定分类对应的 notes 子目录（notes/<categoryName>）
 */
export async function deleteCategoryNotesDir(categoryName: string): Promise<void> {
  const { remove } = await getFsMethods();
  const root = await getDataRootDir();
  const pathModule = await getPathModule();
  const safeCategory = categoryName ? sanitizeFilename(categoryName) : 'uncategorized';
  const categoryDir = await pathModule.join(root, NOTES_DIR, safeCategory || 'uncategorized');

  try {
    await remove(categoryDir, { recursive: true });
  } catch (error) {
    if (!isFileNotFound(error)) {
      throw error;
    }
  }
}

export async function listNoteFiles(): Promise<string[]> {
  const { readDir } = await getFsMethods();
  const root = await getDataRootDir();
  const pathModule = await getPathModule();
  const notesDir = await pathModule.join(root, NOTES_DIR);
  const entries = await readDir(notesDir, { recursive: true });
  return entries
    .filter((entry: FsDirEntry) => !entry.children || entry.children.length === 0)
    .map((entry: FsDirEntry) => entry.path);
}

export const dataDirectoryConstants = {
  rootCacheKey: () => cachedRootDir,
  metadataDirName: METADATA_DIR,
  notesDirName: NOTES_DIR,
  metadataFiles: METADATA_FILE_MAP
};

export async function readFileContent(filePath: string): Promise<string> {
  return readTextFile(filePath);
}

export async function writeFileContent(filePath: string, content: string): Promise<void> {
  await ensureParentDir(filePath);
  await writeTextFile(filePath, content);
}

export async function deleteFile(filePath: string): Promise<void> {
  const { remove } = await getFsMethods();
  await remove(filePath);
}
