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
  const panelRef = useRef<HTMLDivElement>(null);
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

  // 鼠标事件处理 - 使用捕获阶段
  const handleMouseDown = (e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();
    
    // 立即更新状态，不等待React渲染
    const currentWidth = panelRef.current?.offsetWidth || width;
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
      // 向右拖动增加宽度，向左拖动减少宽度
      const deltaX = e.clientX - startXRef.current;
      
      // 根据方向正确应用宽度变化
      const widthChange = direction === 'right' ? -deltaX : deltaX;
      const newWidth = Math.max(minWidth, Math.min(maxWidth, startWidthRef.current + widthChange));
    setWidth(newWidth);
    };

    const handleMouseUpEffect = () => {
      setIsDragging(false);
      saveWidth(width);
      
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
  }, [isDragging, direction, minWidth, maxWidth, width]);

  // 使用函数引用避免在回调中创建新函数
  const handleMouseMove = useRef((e: MouseEvent) => {
    if (!isDragging) return;
    
    // 向右拖动增加宽度，向左拖动减少宽度
    const deltaX = e.clientX - startXRef.current;
    
    // 根据方向正确应用宽度变化
    const widthChange = direction === 'right' ? -deltaX : deltaX;
    const newWidth = Math.max(minWidth, Math.min(maxWidth, startWidthRef.current + widthChange));
    setWidth(newWidth);
  }).current;

  const handleMouseUp = useRef(() => {
    if (isDragging) {
      setIsDragging(false);
      saveWidth(width);
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
    const currentWidth = panelRef.current?.offsetWidth || width;
    startXRef.current = e.touches[0].clientX;
    startWidthRef.current = currentWidth;
    
    setIsDragging(true);
    
    // 防止选中文本
    document.body.style.userSelect = 'none';
  };

  const handleTouchMove = (e: React.TouchEvent) => {
    if (!isDragging || e.touches.length !== 1) return;
    
    const deltaX = e.touches[0].clientX - startXRef.current;
    const widthChange = direction === 'right' ? -deltaX : deltaX;
    const newWidth = Math.max(minWidth, Math.min(maxWidth, startWidthRef.current + widthChange));
    setWidth(newWidth);
  };

  const handleTouchEnd = () => {
    if (isDragging) {
      setIsDragging(false);
      saveWidth(width);
    }
    
    // 恢复默认样式
    document.body.style.userSelect = '';
  };

  return (
    <div
      ref={panelRef}
      className={`relative ${className}`}
      style={{ width: `${width}px` }}
    >
      {children}
      
      {/* 拖拽把手 - 使用自定义样式类 */}
      <div
        className={`resize-handle ${direction === 'left' ? 'right-0 -mr-1.5' : 'left-0 -ml-1.5'} ${isDragging ? 'bg-blue-500/50' : ''}`}
        onMouseDown={handleMouseDown}
        onTouchStart={handleTouchStart}
        onTouchMove={handleTouchMove}
        onTouchEnd={handleTouchEnd}
        title="拖拽调整宽度"
        data-testid={`resize-handle-${id}`}
      >
        <div className="resize-handle-indicator"></div>
      </div>
    </div>
  );
}; 