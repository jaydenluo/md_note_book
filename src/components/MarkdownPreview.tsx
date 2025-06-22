import React, { memo } from 'react';

interface MarkdownPreviewProps {
  content: string;
  className?: string;
}

/**
 * 优化的Markdown预览组件
 * 使用memo减少不必要的重新渲染
 */
const MarkdownPreview: React.FC<MarkdownPreviewProps> = ({ content, className }) => {
  return (
    <div
      className={className}
      dangerouslySetInnerHTML={{ __html: content }}
    />
  );
};

export default MarkdownPreview; 