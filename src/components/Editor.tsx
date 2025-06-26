import React, { useState, useEffect, useRef } from 'react'
import { useNotes } from '../stores/noteStore'
import { useCategories } from '../stores/categoryStore'
import { debounce } from 'lodash-es'
import TagSelector from './TagSelector'
import TiptapEditor from './TiptapEditor'
import type { Note } from '../stores/noteStore'

// 工具函数：根据标题文本生成唯一ID，只用内容hash，保证一致性
export function genHeadingId(text: string) {
  const hash = Math.abs(text.split('').reduce((acc, c) => acc + c.charCodeAt(0), 0));
  return `heading-${hash}`;
}

// 编辑器属性
interface EditorProps {
  noteId: string | null
}

// 大纲项类型
interface OutlineItem {
  id?: string
  level: number
  text: string
  position: number
  line?: number
}

// Editor 组件
export default function Editor({ noteId }: EditorProps) {
  // 不再生成随机editorInstanceId，日志直接用noteId
  // const editorInstanceId = React.useRef(`editor-instance-${Math.random().toString(36).substring(2, 9)}`);
  
  // 状态定义
  const [isTagSelectorOpen, setIsTagSelectorOpen] = useState(false)
  const [localTitle, setLocalTitle] = useState('')
  const [localContent, setLocalContent] = useState('')
  const [showOutline, setShowOutline] = useState(true)
  const [outlineItems, setOutlineItems] = useState<OutlineItem[]>([])
  const [stats, setStats] = useState({ chars: 0, words: 0, lines: 0 })
  const [isSaving, setIsSaving] = useState(false)
  const [saveStatus, setSaveStatus] = useState<'idle' | 'saving' | 'saved' | 'error'>('idle')
  const [outlineWidth, setOutlineWidth] = useState(300) // 默认大纲宽度
  const [isDragging, setIsDragging] = useState(false)
  
  // refs
  const titleRef = useRef<HTMLInputElement>(null)
  const prevNoteIdRef = useRef<string | null>(null)
  const debouncedExtractOutline = useRef(
    debounce((content: string) => {
      extractOutline(content)
    }, 500)
  )
  const startXRef = useRef(0)
  const startWidthRef = useRef(0)
  const outlinePanelRef = useRef<HTMLDivElement>(null)

  // 获取笔记数据
  const note = useNotes(state => 
    noteId ? state.notes.find(n => n.id === noteId) : null
  )
  const updateNote = useNotes(state => state.updateNote)
  const categories = useCategories(state => state.categories)

  // 获取当前笔记的分类
  const category = note 
    ? categories.find(c => c.id === note.categoryId) 
    : null

  // 当笔记变化时更新引用
  useEffect(() => {
    prevNoteIdRef.current = noteId;
  }, [noteId]);

  // 设置本地状态
  useEffect(() => {
    if (note) {
      // 日志只用noteId
      console.log('笔记内容更新:', {
        noteId: note.id,
        title: note.title,
        contentLength: note.content?.length || 0,
        contentPreview: note.content?.substring(0, 50) || '空内容'
      });
      // 确保内容不为null或undefined
      const safeContent = note.content || '';
      setLocalTitle(note.title || '');
      setLocalContent(safeContent);
      extractOutline(safeContent);
      calculateStats(safeContent);
    }
  }, [note?.id]);
  
  // 当组件挂载时初始化防抖提取大纲函数
  useEffect(() => {
    debouncedExtractOutline.current = debounce((content: string) => {
      extractOutline(content)
    }, 500);
    
    // 从localStorage加载大纲宽度
    const savedWidth = localStorage.getItem('outline-panel-width');
    if (savedWidth) {
      const width = parseInt(savedWidth, 10);
      if (width >= 200 && width <= 600) { // 限制合理范围
        setOutlineWidth(width);
      }
    }
  }, []);

  // 组件挂载/卸载日志也只用noteId
  useEffect(() => {
    if (noteId) {
      console.log(`编辑器实例已挂载，noteId: ${noteId}`);
    }
    return () => {
      if (noteId) {
        console.log(`编辑器实例正在卸载，noteId: ${noteId}`);
      }
    }
  }, [noteId]);
  
  // 保存宽度到localStorage
  const saveWidth = (newWidth: number) => {
    localStorage.setItem('outline-panel-width', newWidth.toString());
  };

  // 鼠标事件处理 - 使用捕获阶段
  const handleMouseDown = (e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();
    
    // 立即更新状态，不等待React渲染
    const currentWidth = outlinePanelRef.current?.offsetWidth || outlineWidth;
    startXRef.current = e.clientX;
    startWidthRef.current = currentWidth;
    
    setIsDragging(true);

    // 添加全局事件监听
    document.addEventListener('mousemove', handleMouseMove, { capture: true });
    document.addEventListener('mouseup', handleMouseUp, { capture: true });
    
    // 防止选中文本
    document.body.style.userSelect = 'none';
    document.body.style.cursor = 'col-resize';
  };

  // 使用useEffect监听拖拽状态变化
  useEffect(() => {
    if (!isDragging) return;
      
    const handleMouseMoveEffect = (e: MouseEvent) => {
      // 向左拖动减少宽度
      const deltaX = startXRef.current - e.clientX;
      const newWidth = Math.max(200, Math.min(600, startWidthRef.current + deltaX));
      setOutlineWidth(newWidth);
    };

    const handleMouseUpEffect = () => {
      setIsDragging(false);
      saveWidth(outlineWidth);
      
      // 恢复默认样式
      document.body.style.userSelect = '';
      document.body.style.cursor = '';
      
      // 移除全局事件监听
      document.removeEventListener('mousemove', handleMouseMoveEffect, { capture: true });
      document.removeEventListener('mouseup', handleMouseUpEffect, { capture: true });
    };
    
    // 添加事件监听
    document.addEventListener('mousemove', handleMouseMoveEffect, { capture: true });
    document.addEventListener('mouseup', handleMouseUpEffect, { capture: true });
    
    // 清理函数
    return () => {
      document.removeEventListener('mousemove', handleMouseMoveEffect, { capture: true });
      document.removeEventListener('mouseup', handleMouseUpEffect, { capture: true });
    };
  }, [isDragging, outlineWidth]);

  // 使用函数引用避免在回调中创建新函数
  const handleMouseMove = useRef((e: MouseEvent) => {
    if (!isDragging) return;
    
    // 向左拖动减少宽度
    const deltaX = startXRef.current - e.clientX;
    const newWidth = Math.max(200, Math.min(600, startWidthRef.current + deltaX));
    setOutlineWidth(newWidth);
  }).current;

  const handleMouseUp = useRef(() => {
    if (isDragging) {
      setIsDragging(false);
      saveWidth(outlineWidth);
    }

    // 移除全局事件监听
    document.removeEventListener('mousemove', handleMouseMove, { capture: true });
    document.removeEventListener('mouseup', handleMouseUp, { capture: true });
    
    // 恢复默认样式
    document.body.style.userSelect = '';
    document.body.style.cursor = '';
  }).current;

  // 触摸事件处理
  const handleTouchStart = (e: React.TouchEvent) => {
    if (e.touches.length !== 1) return;
    
    e.preventDefault();
    e.stopPropagation();
    
    // 立即更新状态，不等待React渲染
    const currentWidth = outlinePanelRef.current?.offsetWidth || outlineWidth;
    startXRef.current = e.touches[0].clientX;
    startWidthRef.current = currentWidth;
    
    setIsDragging(true);
    
    // 防止选中文本
    document.body.style.userSelect = 'none';
  };

  const handleTouchMove = (e: React.TouchEvent) => {
    if (!isDragging || e.touches.length !== 1) return;
    
    const deltaX = startXRef.current - e.touches[0].clientX;
    const newWidth = Math.max(200, Math.min(600, startWidthRef.current + deltaX));
    setOutlineWidth(newWidth);
  };

  const handleTouchEnd = () => {
    if (isDragging) {
      setIsDragging(false);
      saveWidth(outlineWidth);
    }
    
    // 恢复默认样式
    document.body.style.userSelect = '';
  };

  // 修改标题变更处理
  const handleTitleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (!note) return;
    
    const newTitle = e.target.value;
    setLocalTitle(newTitle);
  };
  
  // 内容变更处理
  const handleContentChange = (newContent: string) => {
    if (!note) return;
    // 只在内容和当前内容不一致且不为<p></p>时才写入
    if (newContent !== note.content && newContent !== '<p></p>') {
      console.log('内容变更', { 
        noteId: note.id, 
        contentLength: newContent.length,
        firstChars: newContent.substring(0, 30)
      });
    setLocalContent(newContent);
    // 更新大纲
      debouncedExtractOutline.current(newContent);
    // 更新统计信息
    calculateStats(newContent);
    }
  };
  
  // 手动保存笔记
  const handleSaveNote = async () => {
    if (!note || !noteId) return;
    
    try {
      setSaveStatus('saving');
      setIsSaving(true);
      
      // 构建要更新的数据
      const updateData: Partial<Note> = {};
      
      // 如果标题发生变化
      if (localTitle !== note.title) {
        updateData.title = localTitle;
      }
      
      // 如果内容发生变化
      if (localContent !== note.content) {
        updateData.content = localContent;
      }
      
      // 只有当有数据需要更新时才调用更新
      if (Object.keys(updateData).length > 0) {
        console.log(`手动保存笔记 (ID: ${noteId})`, updateData);
        const success = await updateNote(noteId, updateData);
        
        if (success) {
          setSaveStatus('saved');
          
          // 2秒后重置状态
          setTimeout(() => {
            setSaveStatus('idle');
          }, 2000);
        } else {
          setSaveStatus('error');
        }
      } else {
        // 没有变化，直接显示已保存
        setSaveStatus('saved');
        setTimeout(() => {
          setSaveStatus('idle');
        }, 2000);
      }
    } catch (error) {
      console.error('保存笔记失败:', error);
      setSaveStatus('error');
    } finally {
      setIsSaving(false);
    }
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
    const items: OutlineItem[] = [];
    // 检查内容类型：HTML还是Markdown
    const isHTML = content.includes('<') && content.includes('>');
    if (isHTML) {
      // 从HTML内容中提取标题
      const parser = new DOMParser();
      const doc = parser.parseFromString(content, 'text/html');
      const headings = doc.querySelectorAll('h1, h2, h3, h4, h5, h6');
      headings.forEach((heading, index) => {
        const level = parseInt(heading.tagName.charAt(1));
        const text = heading.textContent?.trim() || '';
        let id = heading.id;
        if (!id) {
          // 使用统一的ID生成函数，仅基于内容hash，不依赖索引
          id = genHeadingId(text);
          heading.id = id;
        }
        // 计算位置（大致估算）
        const position = content.indexOf(heading.outerHTML);
        items.push({
          id,
          level,
          text,
          position: position >= 0 ? position : index * 100,
          line: content.substring(0, position).split('\n').length
        });
      });
    } else {
      // 从Markdown内容中提取标题
      const headingRegex = /^(#{1,6})\s+(.+?)(?:\s+\{#([a-zA-Z0-9_-]+)\})?$/gm;
      let match;
      while ((match = headingRegex.exec(content)) !== null) {
        const level = match[1].length; // # 的数量表示标题级别
        const text = match[2].trim();
        let id = match[3] || '';
        if (!id) {
          // 使用统一的ID生成函数，仅基于内容hash，不依赖索引
          id = genHeadingId(text);
        }
        const position = match.index;
        items.push({
          id,
          level,
          text,
          position,
          line: content.substring(0, position).split('\n').length
        });
      }
    }
    setOutlineItems(items);
    return items;
  };

  // 重新生成大纲函数
  const regenerateOutline = () => {
    // 从编辑器获取最新内容
    const editor = (window as any).tiptapEditorInstance;
    if (editor) {
      const latestContent = editor.getHTML();
      // 更新本地内容
      setLocalContent(latestContent);
      // 重新提取大纲
      extractOutline(latestContent);
      // 提供视觉反馈
      const button = document.querySelector('.outline-refresh-btn');
      if (button) {
        button.classList.add('animate-spin');
        setTimeout(() => {
          button.classList.remove('animate-spin');
        }, 500);
      }
      console.log('[大纲] 已重新生成大纲');
    } else {
      console.warn('[大纲] 找不到编辑器实例，无法刷新大纲');
      extractOutline(localContent);
    }
  };

  // 如果没有笔记ID，显示提示信息
  if (!noteId) return <div className="flex-1 flex items-center justify-center text-gray-500">未选择笔记</div>

  // 计算编辑器和大纲的宽度比例
  const outlineWidthPercent = showOutline ? `${outlineWidth}px` : '0px';
  const editorWidthPercent = showOutline ? `calc(100% - ${outlineWidth}px)` : '100%';
    
    return (
    <div className="flex flex-col h-full bg-white dark:bg-gray-800">
      {/* 标题区域 */}
      <div className="flex justify-between items-center p-4 border-b border-gray-200 dark:border-gray-700">
        <div className="flex-1 flex items-center">
          <div className="flex-1">
            <input
              ref={titleRef}
              type="text"
              value={localTitle}
              onChange={handleTitleChange}
              className="w-full text-xl font-semibold bg-transparent border-none outline-none"
              placeholder="无标题"
            />
            <div className="flex items-center text-xs mt-1">
              <span className={`rounded-full w-3 h-3 mr-1 ${category?.color || 'bg-gray-400'}`}></span>
              <span className="text-gray-500 dark:text-gray-400">
                {category?.name || '未分类'}
              </span>
              
              {/* 笔记统计信息 */}
              <span className="text-gray-400 dark:text-gray-500 ml-4">
                {stats.chars} 字符 | {stats.words} 词 | {stats.lines} 行
              </span>
              
              {/* 标签按钮 */}
              <button 
                onClick={() => setIsTagSelectorOpen(!isTagSelectorOpen)}
                className="ml-3 px-2 py-0.5 text-xs bg-gray-100 dark:bg-gray-700 hover:bg-gray-200 dark:hover:bg-gray-600 rounded transition"
              >
                标签
              </button>
            </div>
          </div>
          <div className="flex items-center">
            {/* 标签选择器 */}
            {isTagSelectorOpen && note && (
              <TagSelector
                noteId={note.id}
                onClose={() => setIsTagSelectorOpen(false)}
              />
            )}
            
            {/* 保存按钮 */}
            <button
              onClick={handleSaveNote}
              disabled={isSaving}
              className={`ml-3 p-1.5 rounded flex items-center ${
                saveStatus === 'saving' 
                  ? 'bg-yellow-100 text-yellow-600 dark:bg-yellow-900 dark:text-yellow-300' 
                  : saveStatus === 'saved'
                  ? 'bg-green-100 text-green-600 dark:bg-green-900 dark:text-green-300'
                  : saveStatus === 'error'
                  ? 'bg-red-100 text-red-600 dark:bg-red-900 dark:text-red-300'
                  : 'hover:bg-gray-100 dark:hover:bg-gray-700 text-gray-500'
              }`}
              title="保存笔记"
            >
              {saveStatus === 'saving' ? (
                <svg className="animate-spin h-4 w-4" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                  <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                  <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                </svg>
              ) : saveStatus === 'saved' ? (
                <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                </svg>
              ) : saveStatus === 'error' ? (
                <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                </svg>
              ) : (
                <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 7H5a2 2 0 00-2 2v9a2 2 0 002 2h14a2 2 0 002-2V9a2 2 0 00-2-2h-3m-1 4l-3 3m0 0l-3-3m3 3V4" />
              </svg>
              )}
            </button>
            
            {/* 大纲开关按钮 */}
            <button
              onClick={() => setShowOutline(!showOutline)}
              className="ml-3 p-1 rounded hover:bg-gray-100 dark:hover:bg-gray-700 text-gray-500"
              title={showOutline ? "隐藏大纲" : "显示大纲"}
            >
              <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 6h16M4 12h8m-8 6h16" />
              </svg>
            </button>
              </div>
            </div>
      </div>
      
      {/* 主要编辑区域 */}
      <div className="flex flex-1 overflow-hidden">
        {/* 编辑器 */}
        <div 
          className="flex flex-col h-full overflow-hidden transition-all duration-300"
          style={{ width: editorWidthPercent }}
        >
                      <TiptapEditor
                        content={localContent}
              onChange={handleContentChange}
                      />
                  </div>
        
        {/* 大纲面板 */}
        {showOutline && (
          <div 
            ref={outlinePanelRef}
            className="relative h-full bg-white dark:bg-gray-800 border-l border-gray-200 dark:border-gray-700 transition-all duration-300 shadow-sm"
            style={{ width: outlineWidthPercent }}
          >
            {/* 拖拽把手 - 使用项目已有的resize-handle样式 */}
            <div
              className={`resize-handle left-0 -ml-1.5 ${isDragging ? 'bg-blue-500/50' : ''}`}
              onMouseDown={handleMouseDown}
              onTouchStart={handleTouchStart}
              onTouchMove={handleTouchMove}
              onTouchEnd={handleTouchEnd}
              title="拖拽调整宽度"
            >
              <div className="resize-handle-indicator"></div>
            </div>
            
            <div className="h-full overflow-y-auto p-4">
              <div className="flex justify-between items-center mb-4 pb-2 border-b border-gray-100 dark:border-gray-700">
                <h3 className="text-md font-semibold">大纲</h3>
                <button 
                  onClick={regenerateOutline}
                  className="text-gray-500 hover:text-gray-700 dark:hover:text-gray-300 outline-refresh-btn transition-transform duration-300"
                  title="重新生成大纲"
                >
                  <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                    <path d="M21.5 2v6h-6M21.34 15.57a10 10 0 1 1-.57-8.38" />
                  </svg>
                </button>
              </div>
      
              <div className="space-y-1 text-sm">
                {outlineItems.length > 0 ? (
                  outlineItems.map((item, index) => (
                    <div
                      key={`outline-${index}`}
                      className="cursor-pointer hover:bg-gray-100 dark:hover:bg-gray-700 p-1 rounded"
                      style={{ paddingLeft: `${(item.level - 1) * 12 + 4}px` }}
                      onClick={() => {
                        // 使用Tiptap editor API跳转到标题
                        const editor = (window as any).tiptapEditorInstance;
                        if (!editor) return;
                        console.log('[大纲点击]', item);
                        
                        // 更精确的跳转逻辑
                        // 1. 首先尝试精确匹配heading节点
                        let foundPos: number | null = null;
                        let foundNode = null;
                        
                        editor.state.doc.descendants((node, pos) => {
                          if (node.type.name === 'heading') {
                            // 比较标题文本 - 精确匹配
                            if (node.textContent.trim() === item.text.trim()) {
                              foundPos = pos;
                              foundNode = node;
                              console.log('[大纲跳转] 精确匹配到heading节点', node, 'pos:', pos);
                              return false; // 停止遍历
                            }
                          }
                          return true;
                        });
                        
                        // 2. 若无精确匹配，尝试部分匹配
                        if (foundPos === null) {
                          editor.state.doc.descendants((node, pos) => {
                            if (node.type.name === 'heading') {
                              // 比较标题文本 - 包含匹配
                              if (node.textContent && (
                                  node.textContent.includes(item.text) || 
                                  item.text.includes(node.textContent))
                                 ) {
                                foundPos = pos;
                                foundNode = node;
                                console.log('[大纲跳转] 部分匹配到heading节点', node, 'pos:', pos, '文本:', node.textContent);
                                return false; // 停止遍历
                              }
                            }
                            return true;
                          });
                        }
                        
                        // 3. 如找到位置，跳转并高亮
                        if (foundPos !== null && foundNode) {
                          // 使用可选链操作符避免类型错误
                          const level = foundNode.attrs?.level || 1;
                          editor.commands.focus();
                          editor.commands.setTextSelection(foundPos + level); // 根据heading级别调整光标位置
                          console.log('[大纲跳转] 跳转到pos:', foundPos + level);
                          
                          // 滚动到可见区域
                          setTimeout(() => {
                            const domNode = document.querySelector(`.ProseMirror h${level}[data-node-position="${foundPos}"]`);
                            if (domNode) {
                              domNode.scrollIntoView({ behavior: 'smooth', block: 'center' });
                            }
                          }, 100);
                        } else {
                          // 4. 尝试文本搜索
                          console.warn('[大纲跳转] 未找到对应文本的heading节点:', item.text);
                          const docText = editor.state.doc.textContent;
                          const headingPos = docText.indexOf(item.text);
                          
                          if (headingPos >= 0) {
                            editor.commands.focus();
                            editor.commands.setTextSelection(headingPos);
                            console.log('[大纲跳转] 通过文本内容找到位置:', headingPos);
                          } 
                          // 5. 最后尝试按行号跳转（兜底方案）
                          else if (item.line && item.line > 0) {
                            const lines = editor.state.doc.textBetween(0, editor.state.doc.content.size).split('\n');
                            let charCount = 0;
                            for (let i = 0; i < item.line - 1 && i < lines.length; i++) {
                              charCount += lines[i]?.length + 1;
                            }
                            editor.commands.focus();
                            editor.commands.setTextSelection(charCount);
                            console.log('[大纲跳转] 按行号跳转，charCount:', charCount);
                          }
                        }
                      }}
                    >
                      <span className={`${item.level === 1 ? 'font-medium' : ''} truncate block`}>
                        {item.text}
                      </span>
                    </div>
                  ))
                ) : (
                  <div className="text-gray-400 italic">无大纲项</div>
                )}
                </div>
            </div>
          </div>
        )}
      </div>
      {/* 状态栏：底部固定，显示笔记信息和快捷键 */}
      {note && (
        <div className="w-full px-4 py-2 border-t border-gray-200 dark:border-gray-700 bg-gray-50 dark:bg-gray-800 text-xs flex flex-wrap items-center justify-between gap-2 select-none">
          {/* 左侧：时间与字数统计 */}
          <div className="flex flex-wrap items-center gap-4 text-gray-500 dark:text-gray-400">
            <span>创建于: {note.createdAt ? new Date(note.createdAt).toLocaleString() : '-'}</span>
            <span>更新于: {note.updatedAt ? new Date(note.updatedAt).toLocaleString() : '-'}</span>
            <span>字符数: {stats.chars}</span>
          </div>
          {/* 右侧：快捷键与保存状态 */}
          <div className="flex flex-wrap items-center gap-2">
            <span className="bg-gray-100 dark:bg-gray-800 px-2 py-0.5 rounded mr-1">快捷键:</span>
            <span className="bg-gray-100 dark:bg-gray-800 px-2 py-0.5 rounded">Ctrl+S 保存</span>
            <span className="bg-gray-100 dark:bg-gray-800 px-2 py-0.5 rounded">Ctrl+E 预览</span>
            <span className="bg-gray-100 dark:bg-gray-800 px-2 py-0.5 rounded">Ctrl+Alt+O 大纲</span>
            <span className="bg-gray-100 dark:bg-gray-800 px-2 py-0.5 rounded">Ctrl+Alt+T 所见即所得</span>
            {/* 保存状态显示 */}
            {saveStatus === 'saving' && <span className="ml-2 text-yellow-600">保存中...</span>}
            {saveStatus === 'saved' && <span className="ml-2 text-green-600">已保存</span>}
            {saveStatus === 'error' && <span className="ml-2 text-red-600">保存失败</span>}
          </div>
        </div>
      )}
    </div>
  )
}