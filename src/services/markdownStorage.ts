import { Note } from '@stores/noteStore';
import { Category } from '@stores/categoryStore';
import { storage } from './storage';
import { sanitizeFilename } from '@/utils/markdown';
import { isTauriApp, tauriEnvironment } from '@utils/tauri';

// 导入类型
// 使用 Tauri 2.x 插件 API
import { getFsPlugin, getDialogPlugin, getPath } from '@/utils/tauri';

type FsPlugin = typeof import('@tauri-apps/plugin-fs');
type DialogPlugin = typeof import('@tauri-apps/plugin-dialog');
type PathModule = typeof import('@tauri-apps/api/path');

// 获取插件实例
let fs: FsPlugin | null = null;
let dialog: DialogPlugin | null = null;
let pathModule: PathModule | null = null;

// 修改函数为异步检查
async function initPlugins() {
  if (await isTauriApp()) {
    fs = (await getFsPlugin()) as FsPlugin | null;
    dialog = (await getDialogPlugin()) as DialogPlugin | null;
    pathModule = (await getPath()) as PathModule | null;
  }
}

// 初始化插件
initPlugins();

async function ensureFsPlugin(): Promise<FsPlugin> {
  if (!tauriEnvironment.isTauri) {
    throw new Error('当前环境不支持文件系统操作');
  }
  if (!fs) {
    fs = (await getFsPlugin()) as FsPlugin | null;
  }
  if (!fs) {
    throw new Error('文件系统插件未初始化');
  }
  return fs;
}

async function ensureDialogPlugin(): Promise<DialogPlugin> {
  if (!tauriEnvironment.isTauri) {
    throw new Error('当前环境不支持对话框操作');
  }
  if (!dialog) {
    dialog = (await getDialogPlugin()) as DialogPlugin | null;
  }
  if (!dialog) {
    throw new Error('对话框插件未初始化');
  }
  return dialog;
}

async function ensurePathModule(): Promise<PathModule> {
  if (!tauriEnvironment.isTauri) {
    throw new Error('当前环境不支持路径操作');
  }
  if (!pathModule) {
    pathModule = (await getPath()) as PathModule | null;
  }
  if (!pathModule) {
    throw new Error('路径模块未初始化');
  }
  return pathModule;
}

async function ensureDir(targetPath: string): Promise<void> {
  const fsPlugin = await ensureFsPlugin();
  await fsPlugin.mkdir(targetPath, { recursive: true });
}

function normalizeDialogSelection(selected: string | string[] | null): string | null {
  if (!selected) return null;
  return Array.isArray(selected) ? selected[0] : selected;
}


/**
 * 从HTML内容转换为Markdown
 */
function htmlToMarkdown(html: string): string {
  // 这里可以使用更复杂的HTML到Markdown转换库
  // 简单实现，实际应用中应该使用turndown或其他库
  let markdown = html
    .replace(/<h1[^>]*>(.*?)<\/h1>/gi, '# $1\n\n')
    .replace(/<h2[^>]*>(.*?)<\/h2>/gi, '## $1\n\n')
    .replace(/<h3[^>]*>(.*?)<\/h3>/gi, '### $1\n\n')
    .replace(/<h4[^>]*>(.*?)<\/h4>/gi, '#### $1\n\n')
    .replace(/<h5[^>]*>(.*?)<\/h5>/gi, '##### $1\n\n')
    .replace(/<h6[^>]*>(.*?)<\/h6>/gi, '###### $1\n\n')
    .replace(/<p[^>]*>(.*?)<\/p>/gi, '$1\n\n')
    .replace(/<br\s*\/?>/gi, '\n')
    .replace(/<strong[^>]*>(.*?)<\/strong>/gi, '**$1**')
    .replace(/<b[^>]*>(.*?)<\/b>/gi, '**$1**')
    .replace(/<em[^>]*>(.*?)<\/em>/gi, '*$1*')
    .replace(/<i[^>]*>(.*?)<\/i>/gi, '*$1*')
    .replace(/<a[^>]*href="(.*?)"[^>]*>(.*?)<\/a>/gi, '[$2]($1)')
    .replace(/<ul[^>]*>(.*?)<\/ul>/gis, '$1\n')
    .replace(/<ol[^>]*>(.*?)<\/ol>/gis, '$1\n')
    .replace(/<li[^>]*>(.*?)<\/li>/gi, '- $1\n')
    .replace(/<blockquote[^>]*>(.*?)<\/blockquote>/gis, '> $1\n\n')
    .replace(/<code[^>]*>(.*?)<\/code>/gi, '`$1`')
    .replace(/<pre[^>]*><code[^>]*>(.*?)<\/code><\/pre>/gis, '```\n$1\n```\n\n')
    .replace(/&nbsp;/g, ' ')
    .replace(/&lt;/g, '<')
    .replace(/&gt;/g, '>')
    .replace(/&amp;/g, '&');

  // 移除剩余的HTML标签
  markdown = markdown.replace(/<[^>]*>/g, '');
  
  // 修复多余的换行
  markdown = markdown.replace(/\n\s*\n\s*\n/g, '\n\n');
  
  return markdown;
}

/**
 * 从Markdown转换为HTML
 */
function markdownToHtml(markdown: string): string {
  // 这里可以使用更复杂的Markdown到HTML转换库
  // 简单实现，实际应用中应该使用marked或其他库
  const html = markdown
    .replace(/^# (.*?)$/gm, '<h1>$1</h1>')
    .replace(/^## (.*?)$/gm, '<h2>$1</h2>')
    .replace(/^### (.*?)$/gm, '<h3>$1</h3>')
    .replace(/^#### (.*?)$/gm, '<h4>$1</h4>')
    .replace(/^##### (.*?)$/gm, '<h5>$1</h5>')
    .replace(/^###### (.*?)$/gm, '<h6>$1</h6>')
    .replace(/^(?!<h[1-6]|<p|<ul|<ol|<li|<blockquote)(.+)$/gm, '<p>$1</p>')
    .replace(/\n\n/g, '</p><p>')
    .replace(/\*\*(.*?)\*\*/g, '<strong>$1</strong>')
    .replace(/\*(.*?)\*/g, '<em>$1</em>')
    .replace(/\[(.*?)\]\((.*?)\)/g, '<a href="$2">$1</a>')
    .replace(/^- (.*?)$/gm, '<li>$1</li>')
    .replace(/^> (.*?)$/gm, '<blockquote>$1</blockquote>')
    .replace(/`([^`]+)`/g, '<code>$1</code>')
    .replace(/```([\s\S]*?)```/g, '<pre><code>$1</code></pre>');

  return html;
}

/**
 * 获取笔记的保存路径
 */
async function getNotePath(note: Note, rootDir: string, categories: Category[]): Promise<string> {
  if (!(await isTauriApp())) return '';
  
  try {
    const pathApi = await ensurePathModule();
    // 查找笔记所属分类
    const category = categories.find(c => c.id === note.categoryId);
    const categoryName = category ? sanitizeFilename(category.name) : 'uncategorized';
    
    // 创建分类目录
    const categoryDir = await pathApi.join(rootDir, 'notes', categoryName);
    await ensureDir(categoryDir);
    
    // 生成文件名
    const fileName = `${sanitizeFilename(note.title || 'untitled')}-${note.id.substring(0, 8)}.md`;
    
    return await pathApi.join(categoryDir, fileName);
  } catch (error) {
    console.error('获取笔记路径失败:', error);
    throw error;
  }
}

/**
 * 获取应用根目录 - 直接使用配置的数据路径
 */
export async function getRootDir(): Promise<string> {
  if (!tauriEnvironment.isTauri) return '';
  
  try {
    const fsPlugin = await ensureFsPlugin();
    const pathApi = await ensurePathModule();
    // 从配置中获取根目录
    const { dataPath } = await storage.getConfig();
    
    // 如果配置中有有效路径，使用该路径
    if (dataPath && dataPath.trim() !== '') {
      // 确保目录存在
      try {
        await fsPlugin.mkdir(dataPath, { recursive: true });
      } catch (error) {
        console.warn('创建配置目录失败:', error);
      }
      console.log('使用配置的数据目录:', dataPath);
      return dataPath;
    }
    
    // 使用系统默认的 AppData 目录
    try {
      const appDir = await pathApi.appDataDir();
      const notebookDir = await pathApi.join(appDir, 'notebook');
      
      // 确保目录存在
      try {
        await fsPlugin.mkdir(notebookDir, { recursive: true });
      } catch (error) {
        console.warn('创建默认目录失败:', error);
      }
      
      console.log('使用系统默认目录:', notebookDir);
      return notebookDir;
    } catch (error) {
      console.error('获取默认目录失败:', error);
      return './data'; // 回退到相对路径
    }
  } catch (error) {
    console.error('获取根目录失败:', error);
    throw error;
  }
}

/**
 * 保存笔记为Markdown文件
 */
async function saveNoteAsMarkdown(note: Note): Promise<string> {
  if (!(await isTauriApp())) return '';
  
  try {
    // 获取所有分类
    const categories = await storage.getAllCategories();
    
    // 获取根目录
    const rootDir = await getRootDir();
    
    // 获取笔记路径
    const notePath = await getNotePath(note, rootDir, categories);
    
    // 转换HTML内容为Markdown
    const markdown = htmlToMarkdown(note.content || '');
    
    // 添加元数据头部
    const metadataHeader = `---
title: ${note.title}
id: ${note.id}
created: ${note.createdAt.toISOString()}
updated: ${note.updatedAt.toISOString()}
category: ${note.categoryId || 'none'}
type: ${note.type || 'doc'}
---

`;
    
    // 写入文件
    const fsPlugin = await ensureFsPlugin();
    await fsPlugin.writeTextFile(notePath, metadataHeader + markdown);
    
    return notePath;
  } catch (error) {
    console.error('保存笔记为Markdown失败:', error);
    throw error;
  }
}

export async function getNoteFilePath(note: Note): Promise<string | null> {
  if (!(await isTauriApp())) return null;
  
  try {
    const notePath = await saveNoteAsMarkdown(note);
    return notePath || null;
  } catch (error) {
    console.error('获取笔记文件路径失败:', error);
    return null;
  }
}

/**
 * 从Markdown文件读取笔记
 */
async function readNoteFromMarkdown(filePath: string): Promise<Note> {
  if (!(await isTauriApp())) throw new Error('不支持在浏览器环境中读取Markdown文件');
  
  try {
    // 读取文件内容
    const fsPlugin = await ensureFsPlugin();
    const content = await fsPlugin.readTextFile(filePath);
    
    // 解析元数据
    const metadataMatch = content.match(/^---\n([\s\S]*?)\n---\n/);
    const metadata: Record<string, string> = {};
    
    if (metadataMatch && metadataMatch[1]) {
      const metadataLines = metadataMatch[1].split('\n');
      metadataLines.forEach((line: string) => {
        const [key, ...valueParts] = line.split(':');
        if (key && valueParts.length > 0) {
          metadata[key.trim()] = valueParts.join(':').trim();
        }
      });
    }
    
    // 提取Markdown内容
    const markdownContent = metadataMatch 
      ? content.substring(metadataMatch[0].length).trim() 
      : content;
    
    // 转换为HTML
    const htmlContent = markdownToHtml(markdownContent);
    
    // 创建笔记对象
    const fileNameFromPath = filePath.split(/[\\/]/).pop() || '';
    const defaultTitle = fileNameFromPath.replace(/\.md$/i, '');

    return {
      id: metadata.id || '',
      title: metadata.title || defaultTitle,
      content: htmlContent,
      categoryId: metadata.category !== 'none' ? metadata.category : null,
      createdAt: metadata.created ? new Date(metadata.created) : new Date(),
      updatedAt: metadata.updated ? new Date(metadata.updated) : new Date(),
      type: metadata.type || 'doc'
    };
  } catch (error) {
    console.error('读取Markdown笔记失败:', error);
    throw error;
  }
}

/**
 * 选择保存目录
 */
export async function selectRootDirectory(): Promise<string | null> {
  if (!tauriEnvironment.isTauri) return null;
  
  try {
    const dialogPlugin = await ensureDialogPlugin();
    // 打开目录选择对话框
    const selected = await dialogPlugin.open({
      directory: true,
      multiple: false,
      title: '选择笔记保存目录'
    });
    const selectedPath = normalizeDialogSelection(selected);
    if (selectedPath) {
      // 保存选择的目录到配置
      await storage.saveConfig({ dataPath: selectedPath });
      return selectedPath;
    }
    
    return null;
  } catch (error) {
    console.error('选择目录失败:', error);
    return null;
  }
}

/**
 * 导出笔记为Markdown文件
 */
export async function exportAllNotesToMarkdown(): Promise<boolean> {
  if (!tauriEnvironment.isTauri) return false;
  
  try {
    // 获取所有笔记和分类
    const notes = await storage.getAllNotes();
    
    // 选择导出目录
    const dialogPlugin = await ensureDialogPlugin();
    const exportDirSelection = await dialogPlugin.open({
      directory: true,
      multiple: false,
      title: '选择导出目录'
    });
    const exportDir = normalizeDialogSelection(exportDirSelection);
    if (!exportDir) return false;
    const pathApi = await ensurePathModule();
    
    // 创建导出目录结构
    const exportNotesDir = await pathApi.join(exportDir, 'notes');
    await ensureDir(exportNotesDir);
    
    // 导出每个笔记
    for (const note of notes) {
      try {
        await saveNoteAsMarkdown(note);
      } catch (error) {
        console.error(`导出笔记 ${note.id} 失败:`, error);
      }
    }
    
    return true;
  } catch (error) {
    console.error('导出笔记失败:', error);
    return false;
  }
}

/**
 * 导入Markdown文件为笔记
 */
export async function importMarkdownAsNote(filePath: string): Promise<Note | null> {
  if (!tauriEnvironment.isTauri) return null;
  
  try {
    const note = await readNoteFromMarkdown(filePath);
    
    // 保存到数据库
    await storage.saveOneNote(note);
    
    return note;
  } catch (error) {
    console.error('导入Markdown笔记失败:', error);
    return null;
  }
}

/**
 * 同步保存笔记到数据库和Markdown文件
 */
export async function syncSaveNote(note: Note): Promise<void> {
  if (!tauriEnvironment.isTauri) return;
  
  try {
    // 保存到数据库
    await storage.saveOneNote(note);
    
    // 如果在Tauri环境中，也保存为Markdown文件
    if (await isTauriApp()) {
      await saveNoteAsMarkdown(note);
    }
  } catch (error) {
    console.error('同步保存笔记失败:', error);
    throw error;
  }
}

/**
 * 保存 Markdown 文件到指定路径
 * @param filePath 文件路径
 * @param content 文件内容
 */
export async function saveMarkdownFile(filePath: string, content: string): Promise<void> {
  if (!tauriEnvironment.isTauri) return;
  
  try {
    const fsPlugin = await ensureFsPlugin();
    await fsPlugin.writeTextFile(filePath, content);
    console.log(`Markdown file saved to ${filePath}`);
  } catch (error) {
    console.error('Failed to save Markdown file:', error);
    throw error;
  }
}

/**
 * 从指定路径读取 Markdown 文件
 * @param filePath 文件路径
 * @returns 文件内容
 */
export async function readMarkdownFile(filePath: string): Promise<string> {
  if (!tauriEnvironment.isTauri) throw new Error('不支持在浏览器环境中读取Markdown文件');
  
  try {
    const fsPlugin = await ensureFsPlugin();
    const content = await fsPlugin.readTextFile(filePath);
    return content;
  } catch (error) {
    console.error('Failed to read Markdown file:', error);
    throw error;
  }
}

/**
 * 导出 Markdown 文件，打开保存对话框
 * @param content 要导出的内容
 * @param defaultName 默认文件名
 * @returns 保存的文件路径，如果用户取消则返回 null
 */
export async function exportMarkdownFile(content: string, defaultName: string = 'note.md'): Promise<string | null> {
  if (!tauriEnvironment.isTauri) return null;
  
  try {
    const dialogPlugin = await ensureDialogPlugin();
    const filePath = await dialogPlugin.save({
      defaultPath: defaultName,
      filters: [{ name: 'Markdown', extensions: ['md'] }]
    });
    
    if (filePath) {
      const fsPlugin = await ensureFsPlugin();
      await fsPlugin.writeTextFile(filePath, content);
      return filePath;
    }
    return null;
  } catch (error) {
    console.error('Failed to export Markdown file:', error);
    throw error;
  }
}

/**
 * 导入 Markdown 文件，打开文件选择对话框
 * @returns 文件内容和路径，如果用户取消则返回 null
 */
export async function importMarkdownFile(): Promise<{ content: string, filePath: string } | null> {
  if (!tauriEnvironment.isTauri) return null;
  
  try {
    const dialogPlugin = await ensureDialogPlugin();
    const selected = await dialogPlugin.open({
      filters: [{ name: 'Markdown', extensions: ['md'] }]
    });
    const filePath = normalizeDialogSelection(selected);
    
    if (filePath) {
      const fsPlugin = await ensureFsPlugin();
      const content = await fsPlugin.readTextFile(filePath);
      return { content, filePath };
    }
    return null;
  } catch (error) {
    console.error('Failed to import Markdown file:', error);
    throw error;
  }
}

export const markdownStorage = {
  saveNoteAsMarkdown,
  readNoteFromMarkdown,
  selectRootDirectory,
  exportAllNotesToMarkdown,
  importMarkdownAsNote,
  syncSaveNote,
  getRootDir
}; 