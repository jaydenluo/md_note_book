import React, { useState, useEffect, useRef } from 'react';

interface ResizablePanelProps {
  id: string; // 唯一标识，用于保存宽度设置
  defaultWidth: number; // 默认宽度（像素）
  minWidth?: number; // 最小宽度（像素）
  maxWidth?: number; // 最大宽度（像素）
  direction?: 'left' | 'right'; // 调整方向
  className?: string; // 额外的CSS类
  children: React.ReactNode;
}

/**
 * 可调整宽度的面板组件
 * @param props 组件属性
 */
export const ResizablePanel: React.FC<ResizablePanelProps> = ({
  id,
  defaultWidth,
  minWidth = 150,
  maxWidth = 500,
  direction = 'right',
  className = '',
  children
}) => {
  // 从localStorage获取保存的宽度，如果没有则使用默认宽度
  const getSavedWidth = () => {
    const saved = localStorage.getItem(`resizable-panel-${id}`);
    return saved ? parseInt(saved, 10) : defaultWidth;
  };

  // 状态
  const [width, setWidth] = useState(getSavedWidth());
  const [isResizing, setIsResizing] = useState(false);
  const panelRef = useRef<HTMLDivElement>(null);
  const startXRef = useRef(0);
  const startWidthRef = useRef(0);

  // 保存宽度到localStorage
  const saveWidth = (newWidth: number) => {
    localStorage.setItem(`resizable-panel-${id}`, newWidth.toString());
  };

  // 开始调整大小
  const handleMouseDown = (e: React.MouseEvent) => {
    e.preventDefault();
    setIsResizing(true);
    startXRef.current = e.clientX;
    startWidthRef.current = width;
    document.body.style.cursor = 'col-resize';
    document.body.style.userSelect = 'none';
  };

  // 处理鼠标移动
  useEffect(() => {
    const handleMouseMove = (e: MouseEvent) => {
      if (!isResizing) return;
      
      const delta = e.clientX - startXRef.current;
      const newWidth = direction === 'right' 
        ? startWidthRef.current + delta 
        : startWidthRef.current - delta;
      
      // 限制宽度在最小值和最大值之间
      const clampedWidth = Math.max(minWidth, Math.min(maxWidth, newWidth));
      setWidth(clampedWidth);
    };

    // 结束调整大小
    const handleMouseUp = () => {
      if (isResizing) {
        setIsResizing(false);
        document.body.style.cursor = '';
        document.body.style.userSelect = '';
        saveWidth(width); // 保存宽度设置
      }
    };

    if (isResizing) {
      document.addEventListener('mousemove', handleMouseMove);
      document.addEventListener('mouseup', handleMouseUp);
    }

    return () => {
      document.removeEventListener('mousemove', handleMouseMove);
      document.removeEventListener('mouseup', handleMouseUp);
    };
  }, [isResizing, width, minWidth, maxWidth, direction]);

  // 调整手柄的样式和位置
  const handleStyle = {
    position: 'absolute',
    top: 0,
    bottom: 0,
    width: '5px',
    cursor: 'col-resize',
    ...(direction === 'right'
      ? { right: '-2px' }
      : { left: '-2px' }),
  } as React.CSSProperties;

  return (
    <div
      ref={panelRef}
      className={`relative ${className}`}
      style={{ width: `${width}px`, flexShrink: 0 }}
    >
      {children}
      <div
        className="absolute top-0 bottom-0 z-10 hover:bg-blue-500 hover:opacity-20"
        style={handleStyle}
        onMouseDown={handleMouseDown}
      />
    </div>
  );
}; 