import type { Category } from '@stores/categoryStore';
import type { Note } from '@stores/noteStore';
import type { NoteTag, Tag } from '@stores/tagStore';
import {
  buildNoteFilePath,
  getDataRootDir,
  getPathModule,
  NOTES_DIR,
  ensureDirPath,
  NoteIndexEntry,
  readFileContent,
  readMetadataFile,
  writeMetadataFile,
  writeFileContent,
  deleteFile,
  isFileNotFound
} from './fileDataStorage';
import { sanitizeFilename } from '@/utils/markdown';
import { htmlToMarkdown, markdownToHtml } from '@/utils/markdownConvert';

interface CategoryRecord extends Omit<Category, 'createdAt' | 'updatedAt'> {
  createdAt: string;
  updatedAt: string;
}

interface TagRecord extends Omit<Tag, 'createdAt' | 'updatedAt'> {
  createdAt: string;
  updatedAt: string;
}

type NoteTagRecord = NoteTag;

type NoteIndexRecord = NoteIndexEntry;

type MetadataRecordMap = {
  categories: CategoryRecord[];
  tags: TagRecord[];
  noteTags: NoteTagRecord[];
  noteIndex: NoteIndexRecord[];
};

type FrontMatter = Record<string, string>;

function serializeCategory(category: Category): CategoryRecord {
  return {
    ...category,
    createdAt: category.createdAt.toISOString(),
    updatedAt: category.updatedAt.toISOString()
  };
}

function reviveCategory(record: CategoryRecord): Category {
  return {
    ...record,
    createdAt: new Date(record.createdAt),
    updatedAt: new Date(record.updatedAt)
  };
}

function serializeTag(tag: Tag): TagRecord {
  return {
    ...tag,
    createdAt: tag.createdAt.toISOString(),
    updatedAt: tag.updatedAt.toISOString()
  };
}

function reviveTag(record: TagRecord): Tag {
  return {
    ...record,
    createdAt: new Date(record.createdAt),
    updatedAt: new Date(record.updatedAt)
  };
}

function normalizeNoteDates(note: Note): Note {
  const fallbackDate = new Date();
  return {
    ...note,
    createdAt: note.createdAt instanceof Date ? note.createdAt : new Date(note.createdAt ?? fallbackDate),
    updatedAt: note.updatedAt instanceof Date ? note.updatedAt : new Date(note.updatedAt ?? fallbackDate),
    reminder: note.reminder instanceof Date || note.reminder === undefined
      ? note.reminder
      : new Date(note.reminder)
  };
}

async function ensureMetadataDefaults(): Promise<void> {
  await getDataRootDir();
  await Promise.all([
    readMetadataFile('categories', [] as CategoryRecord[]),
    readMetadataFile('tags', [] as TagRecord[]),
    readMetadataFile('noteTags', [] as NoteTagRecord[]),
    readMetadataFile('noteIndex', [] as NoteIndexRecord[])
  ]);
}

async function readMetadata<K extends keyof MetadataRecordMap>(key: K): Promise<MetadataRecordMap[K]> {
  const fallback = [] as MetadataRecordMap[K];
  return readMetadataFile(key, fallback);
}

async function writeMetadata<K extends keyof MetadataRecordMap>(key: K, data: MetadataRecordMap[K]): Promise<void> {
  await writeMetadataFile(key, data);
}

async function readNoteIndex(): Promise<NoteIndexRecord[]> {
  return readMetadata('noteIndex');
}

async function writeNoteIndex(entries: NoteIndexRecord[]): Promise<void> {
  await writeMetadata('noteIndex', entries);
}

function buildNoteIndexEntry(params: {
  note: Note;
  filePath: string;
  fileName: string;
  categoryName?: string | null;
}): NoteIndexRecord {
  const { note, filePath, fileName, categoryName } = params;
  return {
    id: note.id,
    title: note.title || '无标题',
    categoryId: note.categoryId ?? null,
    categoryName: categoryName ?? null,
    type: note.type || 'doc',
    fileName,
    filePath,
    createdAt: note.createdAt.toISOString(),
    updatedAt: note.updatedAt.toISOString()
  };
}

function escapeFrontMatterValue(value: string | undefined | null): string {
  if (!value) return '';
  return value.replace(/\r?\n/g, ' ').trim();
}

function buildFrontMatter(note: Note, categoryName?: string | null): string {
  const metadataLines = [
    ['title', note.title || '无标题'],
    ['id', note.id],
    ['created', note.createdAt.toISOString()],
    ['updated', note.updatedAt.toISOString()],
    ['categoryId', note.categoryId || ''],
    ['categoryName', categoryName || ''],
    ['type', note.type || 'doc'],
    ['reminder', note.reminder ? note.reminder.toISOString() : '']
  ].map(([key, value]) => `${key}: ${escapeFrontMatterValue(value)}`);

  return ['---', ...metadataLines, '---', ''].join('\n');
}

function parseFrontMatter(content: string): { metadata: FrontMatter; body: string } {
  const match = content.match(/^---\r?\n([\s\S]*?)\r?\n---\r?\n?/);
  if (!match) {
    return { metadata: {}, body: content.trim() };
  }

  const metadataLines = match[1].split(/\r?\n/);
  const metadata: FrontMatter = {};

  for (const line of metadataLines) {
    const separatorIndex = line.indexOf(':');
    if (separatorIndex === -1) continue;
    const key = line.slice(0, separatorIndex).trim();
    const value = line.slice(separatorIndex + 1).trim();
    if (key) {
      metadata[key] = value;
    }
  }

  const body = content.slice(match[0].length).trim();
  return { metadata, body };
}

async function readNoteFromEntry(entry: NoteIndexRecord): Promise<Note | null> {
  try {
    const raw = await readFileContent(entry.filePath);
    const { metadata, body } = parseFrontMatter(raw);
    const htmlContent = markdownToHtml(body);

    return {
      id: metadata.id || entry.id,
      title: metadata.title || entry.title,
      content: htmlContent,
      categoryId: metadata.categoryId || entry.categoryId || undefined,
      type: metadata.type || entry.type || 'doc',
      createdAt: metadata.created ? new Date(metadata.created) : new Date(entry.createdAt),
      updatedAt: metadata.updated ? new Date(metadata.updated) : new Date(entry.updatedAt),
      reminder: metadata.reminder ? new Date(metadata.reminder) : undefined,
      filePath: entry.filePath
    };
  } catch (error) {
    if (isFileNotFound(error)) {
      return null;
    }
    throw error;
  }
}

async function ensureCategoryNameMap(): Promise<Map<string, string>> {
  const categories = await readMetadata('categories');
  const map = new Map<string, string>();
  categories.forEach((category: CategoryRecord) => {
    map.set(category.id, category.name);
  });
  return map;
}

async function writeNoteFile(note: Note, categoryName?: string | null, existingEntry?: NoteIndexRecord): Promise<{ filePath: string; fileName: string }> {
  const normalizedNote = normalizeNoteDates({
    ...note,
    title: note.title || '无标题',
    content: note.content || ''
  });

  const { filePath, fileName } = await buildNoteFilePath({
    title: normalizedNote.title,
    noteId: normalizedNote.id,
    categoryName: categoryName || null
  });

  const markdownBody = htmlToMarkdown(normalizedNote.content || '');
  const frontMatter = buildFrontMatter(normalizedNote, categoryName);
  await writeFileContent(filePath, `${frontMatter}${markdownBody}\n`);

  if (existingEntry && existingEntry.filePath && existingEntry.filePath !== filePath) {
    try {
      await deleteFile(existingEntry.filePath);
    } catch (error) {
      if (!isFileNotFound(error)) {
        throw error;
      }
    }
  }

  return { filePath, fileName };
}

async function syncNoteIndexCategoryNames(): Promise<void> {
  const entries = await readNoteIndex();
  const categoryNameMap = await ensureCategoryNameMap();
  const updatedEntries = entries.map((entry) => ({
    ...entry,
    categoryName: entry.categoryId ? categoryNameMap.get(entry.categoryId) || null : null
  }));
  await writeNoteIndex(updatedEntries);
}

export const fileStorageAdapter = {
  async init(): Promise<void> {
    await ensureMetadataDefaults();
  },

  async getAllCategories(): Promise<Category[]> {
    const records = await readMetadata('categories');
    return records.map(reviveCategory);
  },

  async saveCategories(categories: Category[]): Promise<void> {
    const records = categories.map(serializeCategory);
    await writeMetadata('categories', records);

    // 立即为每个分类创建物理文件夹
    const root = await getDataRootDir();
    const pathModule = await getPathModule();
    for (const category of categories) {
      const safeCategory = sanitizeFilename(category.name);
      const categoryDir = await pathModule.join(root, NOTES_DIR, safeCategory || 'uncategorized');
      await ensureDirPath(categoryDir);
    }

    await syncNoteIndexCategoryNames();
  },

  async getAllTags(): Promise<Tag[]> {
    const records = await readMetadata('tags');
    return records.map(reviveTag);
  },

  async saveTags(tags: Tag[]): Promise<void> {
    const records = tags.map(serializeTag);
    await writeMetadata('tags', records);
  },

  async getAllNoteTags(): Promise<NoteTag[]> {
    return readMetadata('noteTags');
  },

  async saveNoteTags(noteTags: NoteTag[]): Promise<void> {
    await writeMetadata('noteTags', noteTags);
  },

  async getAllNotes(): Promise<Note[]> {
    const entries = await readNoteIndex();
    const notes = await Promise.all(entries.map((entry) => readNoteFromEntry(entry)));
    return notes.filter((note): note is Note => Boolean(note)).map((note) => ({
      ...note,
      content: note.content || ''
    }));
  },

  async getNoteById(id: string): Promise<Note | null> {
    const entries = await readNoteIndex();
    const entry = entries.find((item) => item.id === id);
    if (!entry) {
      return null;
    }
    return readNoteFromEntry(entry);
  },

  async saveNotes(notes: Note[]): Promise<void> {
    for (const note of notes) {
      await fileStorageAdapter.saveOneNote(note);
    }
  },

  async saveOneNote(note: Note): Promise<void> {
    const entries = await readNoteIndex();
    const existingEntry = entries.find((item) => item.id === note.id);
    const categoryNameMap = await ensureCategoryNameMap();
    const categoryName = note.categoryId ? categoryNameMap.get(note.categoryId) || null : null;

    const normalizedNote = normalizeNoteDates(note);
    const { filePath, fileName } = await writeNoteFile(normalizedNote, categoryName, existingEntry);

    const nextEntry = buildNoteIndexEntry({
      note: normalizedNote,
      filePath,
      fileName,
      categoryName
    });

    const updatedEntries = existingEntry
      ? entries.map((entry) => (entry.id === note.id ? nextEntry : entry))
      : [...entries, nextEntry];

    await writeNoteIndex(updatedEntries);
  },

  async deleteNote(id: string): Promise<Note | null> {
    const entries = await readNoteIndex();
    const entryIndex = entries.findIndex((item) => item.id === id);
    if (entryIndex === -1) {
      return null;
    }

    const [entry] = entries.splice(entryIndex, 1);
    await writeNoteIndex(entries);

    try {
      await deleteFile(entry.filePath);
    } catch (error) {
      if (!isFileNotFound(error)) {
        throw error;
      }
    }

    return readNoteFromEntry(entry);
  }
};
