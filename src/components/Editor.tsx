import React, { useState, useEffect, useRef } from 'react'
import type { FC } from 'react'
import { useNotes } from '@stores/noteStore'
import { useTags } from '@stores/tagStore'
import { useCategories } from '@stores/categoryStore'
import { useTabs } from '@stores/tabsStore'
import TagSelector from './TagSelector'
import { debounce } from '@utils/debounce'
import TiptapEditor from './TiptapEditor'
import { ResizablePanel } from './ui/ResizablePanel'

// 编辑器属性接口
interface EditorProps {
  noteId: string | null
}

// 大纲项接口
interface OutlineItem {
  id?: string;
  level: number;
  text: string;
  position: number;
  line?: number;
}

/**
 * 笔记编辑器组件
 * 基于TiptapEditor的Markdown编辑器
 */
const Editor: FC<EditorProps> = ({ noteId }) => {
  // 状态定义
  const [isTagSelectorOpen, setIsTagSelectorOpen] = useState(false)
  const [isSaving, setIsSaving] = useState(false)
  const [localTitle, setLocalTitle] = useState('')
  const [localContent, setLocalContent] = useState('')
  const [showOutline, setShowOutline] = useState(true)
  const [outlineItems, setOutlineItems] = useState<OutlineItem[]>([])
  const [stats, setStats] = useState({ chars: 0, words: 0, lines: 0 })
  const titleRef = useRef<HTMLInputElement>(null)

  // 获取笔记数据
  const note = useNotes(state => 
    noteId ? state.notes.find(n => n.id === noteId) : null
  )
  const updateNote = useNotes(state => state.updateNote)
  const categories = useCategories(state => state.categories)
  const updateTabTitle = useTabs(state => state.updateTabTitle)
  const getTabByNoteId = useTabs(state => state.getTabByNoteId)

  // 获取当前笔记对应的标签页
  const tab = noteId ? getTabByNoteId(noteId) : null

  // 获取当前笔记的分类
  const category = note 
    ? categories.find(c => c.id === note.categoryId) 
    : null

  // 创建防抖保存函数
  const debouncedSave = useRef(
    debounce(async (id: string, data: { title?: string; content?: string }) => {
      let shouldSetSaving = true;
      
      try {
        if (shouldSetSaving && (data.content?.length ?? 0) > 100 || data.title) {
          setIsSaving(true);
        }
        
        const result = await updateNote(id, data);
      
      // 如果更新了标题，同时更新标签页标题
      if (data.title && tab) {
          updateTabTitle(tab.id, data.title);
        }
        
        return result;
      } finally {
        setTimeout(() => {
          if (shouldSetSaving) {
            setIsSaving(false);
          }
        }, 300);
      }
    }, 800)
  ).current;

  // 提取大纲的防抖函数
  const debouncedExtractOutline = useRef(
    debounce((content: string) => {
      extractOutline(content)
    }, 500)
  ).current

  // 当笔记变化时，直接初始化本地状态
  useEffect(() => {
    if (!note) return;
    
    // 直接加载原始数据
    setLocalTitle(note.title);
    setLocalContent(note.content);
    
    // 提取大纲
    extractOutline(note.content);
    
    // 计算统计信息
    calculateStats(note.content);
    
  }, [note?.id]); // 只在笔记ID变更时执行

  // 修改标题变更处理
  const handleTitleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (!note) return;
    
    const newTitle = e.target.value;
    setLocalTitle(newTitle);
    
    // 保存到服务器
    debouncedSave(note.id, { title: newTitle });
  };
  
  // 内容变更处理
  const handleContentChange = (newContent: string) => {
    if (!note) return;
    
    setLocalContent(newContent);
    debouncedSave(note.id, { content: newContent });
    
    // 更新大纲
    debouncedExtractOutline(newContent);
    
    // 更新统计信息
    calculateStats(newContent);
  };
  
  // 计算文本统计信息
  const calculateStats = (content: string) => {
    if (!content) {
      setStats({ chars: 0, words: 0, lines: 0 });
      return;
    }
    
    const chars = content.length;
    const words = content.trim().split(/\s+/).filter(Boolean).length;
    const lines = content.split('\n').length;
    
    setStats({ chars, words, lines });
  };

  // 提取大纲
  const extractOutline = (content: string) => {
    // 使用正则表达式匹配 Markdown 标题
    const headingRegex = /^(#{1,6})\s+(.+?)(?:\s+\{#([a-zA-Z0-9_-]+)\})?$/gm;
    const items: OutlineItem[] = [];
    let match;
    
    let lastIndex = 0;
    while ((match = headingRegex.exec(content)) !== null) {
      const level = match[1].length; // # 的数量表示标题级别
      const text = match[2].trim();
      const id = match[3] || '';
      const position = match.index;
      
      items.push({
        id,
        level,
        text,
        position,
        line: content.substring(0, position).split('\n').length
      });
      
      lastIndex = headingRegex.lastIndex;
    }
    
    setOutlineItems(items);
    return items;
  };

  // 处理大纲点击
  const handleOutlineClick = (position: number) => {
    if (!note) return;
    
    // 滚动编辑器到指定位置
    const editorElement = document.querySelector('.tiptap-editor .ProseMirror');
    if (editorElement) {
      // 获取大致的滚动位置
      const linesBeforePosition = localContent.substring(0, position).split('\n').length;
      const lineHeight = 24; // 估计的行高
      const scrollTop = linesBeforePosition * lineHeight;
      
      editorElement.scrollTop = scrollTop;
      
      // 尝试聚焦编辑器
      (editorElement as HTMLElement).focus();
      }
  };

  // 自定义可调整宽度的大纲面板
  const renderOutlinePanel = () => {
    if (!showOutline) return null;
    
    return (
      <div className="border-l border-gray-200 dark:border-gray-700 overflow-auto bg-white dark:bg-gray-800" style={{ width: '240px' }}>
        {/* 使用自定义的可调整大小逻辑 */}
        <div className="outline-resizer h-full relative">
          {/* 拖拽把手 */}
          <div 
            className="absolute left-0 top-0 bottom-0 w-1 cursor-col-resize hover:bg-blue-500 hover:opacity-50 z-10"
            onMouseDown={(e) => {
              e.preventDefault();
              
              const startX = e.clientX;
              const outlinePanel = e.currentTarget.parentElement?.parentElement;
              const startWidth = outlinePanel?.offsetWidth || 240;
              
              const onMouseMove = (moveEvent: MouseEvent) => {
                if (!outlinePanel) return;
                
                const deltaX = startX - moveEvent.clientX;
                const newWidth = Math.max(180, Math.min(400, startWidth + deltaX));
                outlinePanel.style.width = `${newWidth}px`;
                
                // 防止选中文本
                moveEvent.preventDefault();
              };
              
              const onMouseUp = () => {
                document.removeEventListener('mousemove', onMouseMove);
                document.removeEventListener('mouseup', onMouseUp);
                
                // 保存设置
                const outlineWidth = outlinePanel?.offsetWidth || 240;
                localStorage.setItem('outline-width', outlineWidth.toString());
              };
              
              document.addEventListener('mousemove', onMouseMove);
              document.addEventListener('mouseup', onMouseUp);
            }}
          />
          
          <div className="p-4 h-full">
            <h3 className="text-lg font-medium mb-2">大纲</h3>
            <div className="space-y-1 overflow-y-auto">
              {outlineItems.length > 0 ? (
                outlineItems.map((item, index) => (
                  <div 
                    key={index}
                    onClick={() => handleOutlineClick(item.position)}
                    className={`
                      cursor-pointer hover:bg-gray-100 dark:hover:bg-gray-700 rounded p-1
                      ${item.level === 1 ? 'font-bold' : ''}
                      ${item.level === 2 ? 'pl-2' : ''}
                      ${item.level === 3 ? 'pl-4' : ''}
                      ${item.level === 4 ? 'pl-6' : ''}
                      ${item.level === 5 ? 'pl-8' : ''}
                      ${item.level === 6 ? 'pl-10' : ''}
                    `}
                  >
                    {item.text}
                  </div>
                ))
              ) : (
                <div className="text-sm text-gray-500 dark:text-gray-400">
                  没有找到标题
                </div>
              )}
            </div>
          </div>
        </div>
      </div>
    );
  };
    
  // 加载保存的大纲宽度
  useEffect(() => {
    const savedWidth = localStorage.getItem('outline-width');
    if (savedWidth && showOutline) {
      const outlinePanel = document.querySelector('.outline-resizer')?.parentElement;
      if (outlinePanel) {
        outlinePanel.style.width = `${savedWidth}px`;
      }
    }
  }, [showOutline]);

  // 渲染编辑器
  return (
    <div className="flex flex-col h-full">
      {/* 标题输入区域 */}
          {note && (
            <div className="flex-none px-4 py-3 border-b dark:border-gray-700">
              <input
                ref={titleRef}
                type="text"
                value={localTitle}
                onChange={handleTitleChange}
                placeholder="笔记标题"
                className="w-full text-xl font-semibold border-none focus:outline-none focus:ring-0 bg-transparent dark:text-white"
              />
              <div className="flex items-center text-xs text-gray-500 dark:text-gray-400">
                <span>
                  {new Date(note?.updatedAt || Date.now()).toLocaleString()} · {note?.content.length || 0} 字符
                </span>
                <span className="mx-2">·</span>
                <span>{category ? category.name : '未分类'}</span>
                {isSaving && (
                  <span className="ml-2 flex items-center text-blue-500">
                    <svg className="w-3 h-3 mr-1 animate-spin" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
                    </svg>
                    保存中...
                  </span>
                )}
            {/* 标签按钮 */}
            <button
              onClick={() => setIsTagSelectorOpen(!isTagSelectorOpen)}
              className="ml-4 p-1 rounded hover:bg-gray-100 dark:hover:bg-gray-700 text-gray-600 dark:text-gray-300"
              title="标签"
            >
              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M7 7h.01M7 3h5c.512 0 1.024.195 1.414.586l7 7a2 2 0 010 2.828l-7 7a2 2 0 01-2.828 0l-7-7A1.994 1.994 0 013 12V7a4 4 0 014-4z" />
              </svg>
            </button>
            {/* 大纲按钮 */}
            <button
              onClick={() => setShowOutline(!showOutline)}
              className={`ml-2 p-1 rounded hover:bg-gray-100 dark:hover:bg-gray-700 ${
                showOutline ? 'bg-blue-100 dark:bg-blue-900 text-blue-600 dark:text-blue-300' : 'text-gray-600 dark:text-gray-300'
              }`}
              title="大纲"
            >
              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M4 6h16M4 10h16M4 14h16M4 18h16" />
              </svg>
            </button>
              </div>
            </div>
          )}
      
      {/* 主内容区域 - 编辑器和大纲 */}
      <div className="flex flex-1 overflow-hidden">
        {/* 编辑器区域 */}
        <div className="flex-1 overflow-hidden">
                    {note && (
                      <TiptapEditor
                        content={localContent}
              onChange={handleContentChange}
                        className="h-full"
              placeholder="开始编写笔记..."
                      />
                    )}
                  </div>
        
        {/* 右侧大纲区域 - 使用自定义的可调整宽度面板 */}
        {renderOutlinePanel()}
                </div>
      
      {/* 底部状态栏 */}
      <div className="flex-none border-t border-gray-200 dark:border-gray-700 bg-gray-50 dark:bg-gray-800 px-4 py-2 text-xs text-gray-500 dark:text-gray-400 flex justify-between items-center">
        <div className="flex items-center space-x-4">
          <div>
            字符数: {stats.chars}
                </div>
          <div>
            单词数: {stats.words}
            </div>
          <div>
            行数: {stats.lines}
          </div>
        </div>
        <div className="flex items-center">
          {isSaving ? (
            <span className="flex items-center text-blue-500">
              <svg className="w-3 h-3 mr-1 animate-spin" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
              </svg>
              正在保存...
            </span>
          ) : (
            <span className="text-green-500">
              已保存
            </span>
          )}
          <span className="ml-4">
            最后更新: {new Date(note?.updatedAt || Date.now()).toLocaleTimeString()}
          </span>
          </div>
      </div>
      
      {/* 标签选择器 */}
      {isTagSelectorOpen && note && (
        <TagSelector
          noteId={note.id}
          onClose={() => setIsTagSelectorOpen(false)}
        />
      )}
    </div>
  )
}

export default Editor 