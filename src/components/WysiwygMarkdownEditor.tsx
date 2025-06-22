import React, { useState, useRef, useEffect } from 'react';
import { md } from '@utils/markdown';

interface WysiwygMarkdownEditorProps {
  content: string;
  onChange: (content: string) => void;
}

/**
 * 所见即所得的 Markdown 编辑器
 * 实现思路：在编辑区域和预览区域之间切换，而不是按块处理
 */
const WysiwygMarkdownEditor = ({ content, onChange }: WysiwygMarkdownEditorProps): JSX.Element => {
  const [editingContent, setEditingContent] = useState(content);
  const [editingLine, setEditingLine] = useState<number | null>(null);
  const [renderedContent, setRenderedContent] = useState('');
  const editorRef = useRef<HTMLDivElement>(null);
  
  // 初始化内容
  useEffect(() => {
    setEditingContent(content);
    setRenderedContent(md.render(content));
  }, [content]);
  
  // 处理内容变更
  const handleContentChange = (newContent: string) => {
    setEditingContent(newContent);
    setRenderedContent(md.render(newContent));
    onChange(newContent);
  };
  
  // 处理行点击，进入编辑模式
  const handleLineClick = (lineNumber: number) => {
    setEditingLine(lineNumber);
  };
  
  // 处理编辑区域失焦，退出编辑模式
  const handleBlur = () => {
    setEditingLine(null);
  };
  
  // 将内容分割成行
  const contentLines = editingContent.split('\n');
  
  // 渲染行
  const renderLine = (line: string, index: number) => {
    const isEditing = editingLine === index;
    
    if (isEditing) {
      return (
        <div key={index} className="mb-2">
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
    
    // 渲染预览
    return (
      <div 
        key={index} 
        className="mb-2 p-2 cursor-text hover:bg-gray-50 dark:hover:bg-gray-800 rounded"
        onClick={() => handleLineClick(index)}
        dangerouslySetInnerHTML={{ __html: md.render(line) }}
      />
    );
  };
  
  return (
    <div 
      ref={editorRef}
      className="wysiwyg-markdown-editor p-6 bg-white dark:bg-gray-900 rounded-lg"
    >
      {contentLines.map((line, index) => renderLine(line, index))}
      
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