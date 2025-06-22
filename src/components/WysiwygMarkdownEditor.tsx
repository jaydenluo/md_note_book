import React, { useState, useRef, useEffect, useCallback, memo } from 'react';
import { md } from '@utils/markdown';
import { debounce } from '@utils/debounce';

interface WysiwygMarkdownEditorProps {
  content: string;
  onChange: (content: string) => void;
}

/**
 * 所见即所得的 Markdown 编辑器
 * 优化版本：减少渲染次数，使用虚拟化和缓存机制
 */
const WysiwygMarkdownEditor: React.FC<WysiwygMarkdownEditorProps> = ({ content, onChange }) => {
  const [editingContent, setEditingContent] = useState(content);
  const [editingLine, setEditingLine] = useState<number | null>(null);
  // 缓存已渲染的内容，避免重复渲染
  const [renderedCache, setRenderedCache] = useState<Record<string, string>>({});
  const editorRef = useRef<HTMLDivElement>(null);
  
  // 初始化内容，仅在组件挂载或content显著变化时更新
  useEffect(() => {
    if (content !== editingContent) {
    setEditingContent(content);
    }
  }, [content]);
  
  // 防抖处理内容变更，减少高频率更新
  const debouncedOnChange = useRef(
    debounce((value: string) => {
      onChange(value);
    }, 300)
  ).current;
  
  // 处理内容变更
  const handleContentChange = useCallback((newContent: string) => {
    setEditingContent(newContent);
    debouncedOnChange(newContent);
  }, [debouncedOnChange]);
  
  // 处理行点击，进入编辑模式
  const handleLineClick = useCallback((lineNumber: number) => {
    setEditingLine(lineNumber);
  }, []);
  
  // 处理编辑区域失焦，退出编辑模式
  const handleBlur = useCallback(() => {
    setEditingLine(null);
  }, []);
  
  // 获取已缓存的渲染结果，如不存在则渲染并缓存
  const getRenderedHTML = useCallback((line: string) => {
    if (!line.trim()) return '<p></p>'; // 优化空行渲染
    
    if (!renderedCache[line]) {
      const rendered = md.render(line);
      setRenderedCache(prev => ({
        ...prev,
        [line]: rendered
      }));
      return rendered;
    }
    return renderedCache[line];
  }, [renderedCache]);
  
  // 将内容分割成行
  const contentLines = editingContent.split('\n');
  
  // 渲染行 - 使用memo优化
  const LineComponent = memo(({ line, index }: { line: string; index: number }) => {
    const isEditing = editingLine === index;
    
    if (isEditing) {
      return (
        <div className="mb-2">
          <textarea
            autoFocus
            className="w-full p-2 border border-blue-300 rounded focus:outline-none font-mono"
            value={line}
            onChange={(e) => {
              const newLines = [...contentLines];
              newLines[index] = e.target.value;
              handleContentChange(newLines.join('\n'));
            }}
            onBlur={handleBlur}
            onKeyDown={(e) => {
              if (e.key === 'Enter' && !e.shiftKey) {
                e.preventDefault();
                const newLines = [...contentLines];
                newLines.splice(index + 1, 0, '');
                handleContentChange(newLines.join('\n'));
                setEditingLine(index + 1);
              }
            }}
          />
        </div>
      );
    }
    
    // 渲染预览，使用缓存渲染结果
    return (
      <div 
        className="mb-2 p-2 cursor-text hover:bg-gray-50 dark:hover:bg-gray-800 rounded"
        onClick={() => handleLineClick(index)}
        dangerouslySetInnerHTML={{ __html: getRenderedHTML(line) }}
      />
    );
  });
  
  // 避免不必要的重新渲染
  LineComponent.displayName = 'LineComponent';
  
  // 仅渲染可见的行，实现虚拟列表滚动
  // 这里简化处理，实际项目可以使用virtualized库如react-window
  const [visibleStartIndex, setVisibleStartIndex] = useState(0);
  const [visibleEndIndex, setVisibleEndIndex] = useState(Math.min(contentLines.length, 50));
  
  // 监听滚动，更新可见行范围
  useEffect(() => {
    if (!editorRef.current) return;
    
    const handleScroll = () => {
      if (!editorRef.current) return;
      
      const { scrollTop, clientHeight } = editorRef.current;
      // 假设每行平均高度为24px
      const rowHeight = 24;
      const visibleStart = Math.floor(scrollTop / rowHeight);
      const visibleEnd = Math.min(
        contentLines.length,
        Math.ceil((scrollTop + clientHeight) / rowHeight) + 5 // 额外渲染5行作为缓冲
      );
      
      setVisibleStartIndex(Math.max(0, visibleStart - 5)); // 额外渲染5行作为缓冲
      setVisibleEndIndex(visibleEnd);
    };
    
    const editorElement = editorRef.current;
    editorElement.addEventListener('scroll', handleScroll);
    
    // 初始化可见范围
    handleScroll();
    
    return () => {
      editorElement.removeEventListener('scroll', handleScroll);
  };
  }, [contentLines.length]);
  
  // 优化：当行数过多时，仅渲染可见区域附近的行
  const visibleLines = contentLines.length > 100 
    ? contentLines.slice(visibleStartIndex, visibleEndIndex)
    : contentLines;
  
  return (
    <div 
      ref={editorRef}
      className="wysiwyg-markdown-editor p-6 bg-white dark:bg-gray-900 rounded-lg overflow-auto"
      style={{ height: '100%' }}
    >
      {/* 显示虚拟列表的占位元素 */}
      {contentLines.length > 100 && visibleStartIndex > 0 && (
        <div style={{ height: `${visibleStartIndex * 24}px` }} />
      )}
      
      {/* 渲染可见行 */}
      {visibleLines.map((line, i) => {
        const actualIndex = contentLines.length > 100 ? i + visibleStartIndex : i;
        return <LineComponent key={`${actualIndex}-${line.substr(0, 10)}`} line={line} index={actualIndex} />;
      })}
      
      {/* 显示虚拟列表的占位元素 */}
      {contentLines.length > 100 && visibleEndIndex < contentLines.length && (
        <div style={{ height: `${(contentLines.length - visibleEndIndex) * 24}px` }} />
      )}
      
      {/* 添加新行的按钮 */}
      <div 
        className="p-2 text-gray-400 cursor-pointer hover:bg-gray-50 dark:hover:bg-gray-800 rounded text-center"
        onClick={() => {
          const newLines = [...contentLines, ''];
          handleContentChange(newLines.join('\n'));
          setEditingLine(contentLines.length);
        }}
      >
        + 添加新段落
      </div>
    </div>
  );
};

export default WysiwygMarkdownEditor; 