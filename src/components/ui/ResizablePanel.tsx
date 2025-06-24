import React, { useState, useEffect, useRef } from 'react';

interface ResizablePanelProps {
  id: string; // 唯一标识，用于保存宽度设置
  defaultWidth: number; // 默认宽度（像素）
  minWidth: number; // 最小宽度（像素）
  maxWidth: number; // 最大宽度（像素）
  direction: 'left' | 'right'; // 调整方向
  className?: string; // 额外的CSS类
  children: React.ReactNode;
}

/**
 * 可调整大小的面板组件
 * 支持拖拽调整宽度，并自动保存设置
 */
export const ResizablePanel: React.FC<ResizablePanelProps> = ({
  id,
  defaultWidth,
  minWidth,
  maxWidth,
  direction,
  className = '',
  children
}) => {
  const [width, setWidth] = useState(defaultWidth);
  const [isDragging, setIsDragging] = useState(false);
  const startXRef = useRef(0);
  const startWidthRef = useRef(0);

  // 从localStorage加载保存的宽度
  useEffect(() => {
    const savedWidth = localStorage.getItem(`panel-width-${id}`);
    if (savedWidth) {
      const parsedWidth = parseInt(savedWidth, 10);
      if (parsedWidth >= minWidth && parsedWidth <= maxWidth) {
        setWidth(parsedWidth);
      }
    }
  }, [id, minWidth, maxWidth]);

  // 保存宽度到localStorage
  const saveWidth = (newWidth: number) => {
    localStorage.setItem(`panel-width-${id}`, newWidth.toString());
  };

  const handleMouseDown = (e: React.MouseEvent) => {
    e.preventDefault();
    setIsDragging(true);
    startXRef.current = e.clientX;
    startWidthRef.current = width;

    // 添加全局事件监听
    document.addEventListener('mousemove', handleMouseMove);
    document.addEventListener('mouseup', handleMouseUp);
    
    // 防止选中文本
    document.body.style.userSelect = 'none';
    document.body.style.cursor = 'col-resize';
  };

    const handleMouseMove = (e: MouseEvent) => {
    if (!isDragging) return;
      
    const deltaX = direction === 'right' 
      ? startXRef.current - e.clientX 
      : e.clientX - startXRef.current;
      
    const newWidth = Math.max(minWidth, Math.min(maxWidth, startWidthRef.current + deltaX));
    setWidth(newWidth);
    };

    const handleMouseUp = () => {
    if (isDragging) {
      setIsDragging(false);
      saveWidth(width);
    }

    // 移除全局事件监听
      document.removeEventListener('mousemove', handleMouseMove);
      document.removeEventListener('mouseup', handleMouseUp);
    
    // 恢复默认样式
    document.body.style.userSelect = '';
    document.body.style.cursor = '';
  };

  return (
    <div
      className={`relative ${className}`}
      style={{ width: `${width}px` }}
    >
      {children}
      
      {/* 拖拽把手 */}
      <div
        className={`
          absolute top-0 bottom-0 w-1 cursor-col-resize z-10
          ${direction === 'right' ? '-left-0.5' : '-right-0.5'}
          hover:bg-blue-500 hover:opacity-50 transition-colors duration-200
          ${isDragging ? 'bg-blue-500 opacity-50' : 'bg-transparent'}
        `}
        onMouseDown={handleMouseDown}
        title="拖拽调整宽度"
      />
    </div>
  );
}; 