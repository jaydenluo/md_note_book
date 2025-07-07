import React, { useState, useEffect, useRef, useCallback } from 'react';
import { NodeViewWrapper, NodeViewProps } from '@tiptap/react';
import ImageToolbar from './ImageToolbar';

// 节流函数
const throttle = <T extends (...args: unknown[]) => void>(
  func: T,
  wait: number
): ((...args: Parameters<T>) => void) => {
  let lastCall = 0;
  return (...args: Parameters<T>) => {
    const now = Date.now();
    if (now - lastCall < wait) return;
    lastCall = now;
    func(...args);
  };
};

// 图片节点视图组件
const ImageNodeView: React.FC<NodeViewProps> = ({
  editor,
  node,
  updateAttributes,
  deleteNode,
  selected
}) => {
  const captionRef = useRef<HTMLInputElement>(null);
  const containerRef = useRef<HTMLDivElement>(null);
  const imageRef = useRef<HTMLImageElement>(null);
  const [isHovered, setIsHovered] = useState(false);
  const [hasError, setHasError] = useState(false);
  const [isEditingCaption, setIsEditingCaption] = useState(false);
  const [localCaption, setLocalCaption] = useState('');
  const [isResizing, setIsResizing] = useState(false);
  const [originalSize, setOriginalSize] = useState({ width: 0, height: 0 });
  const [currentSize, setCurrentSize] = useState({ width: 0, height: 0 });
  const [startPos, setStartPos] = useState({ x: 0, y: 0 });
  const [resizePreview, setResizePreview] = useState<{ width: number; height: number } | null>(null);

  // 处理函数引用
  const handleResizeMoveRef = useRef<((e: MouseEvent) => void) | undefined>();
  const handleResizeEndRef = useRef<((e: MouseEvent) => void) | undefined>();
  const rafRef = useRef<number | null>(null);

  // 确保节点属性存在，防止null或undefined
  const safeNode = node || { attrs: {} };
  
  // 获取图片属性，使用默认值防止undefined
  const {
    src = '',
    alt = '',
    title = '',
    width = null,
    height = null,
    alignment = 'left',
    size = 'medium',
    border = true,
    shadow = true,
    caption = ''
  } = safeNode.attrs;

  // 初始化本地caption
  useEffect(() => {
    setLocalCaption(caption || '');
  }, [caption]);

  // 处理标题输入开始
  const handleCaptionFocus = (e: React.FocusEvent<HTMLInputElement>) => {
    e.preventDefault();
    e.stopPropagation();
    setIsEditingCaption(true);
    if (editor) {
      editor.setEditable(false);
    }
  };

  // 处理标题输入结束
  const handleCaptionBlur = (e: React.FocusEvent<HTMLInputElement>) => {
    e.preventDefault();
    e.stopPropagation();
    setIsEditingCaption(false);
    if (editor) {
      editor.setEditable(true);
      // 更新caption
      if (updateAttributes) {
        updateAttributes({ caption: localCaption });
      }
    }
  };

  // 处理标题输入
  const handleCaptionChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    e.preventDefault();
    e.stopPropagation();
    setLocalCaption(e.target.value);
  };

  // 处理标题按键事件
  const handleCaptionKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    e.stopPropagation();
    
    if (e.key === 'Enter' || e.key === 'Escape') {
      e.preventDefault();
      if (captionRef.current) {
        captionRef.current.blur();
      }
    }
  };

  // 处理点击事件，防止冒泡导致失去选中状态
  const handleContainerClick = (e: React.MouseEvent) => {
    if (!selected && editor) {
      e.stopPropagation();
      // 使用setTimeout避免在渲染周期内调用flushSync
      setTimeout(() => {
        if (editor && node && typeof node.pos === 'number') {
          editor.commands.setNodeSelection(node.pos);
        }
      }, 0);
    }
  };

  // 处理鼠标悬停
  const handleMouseEnter = () => {
    setIsHovered(true);
  };

  const handleMouseLeave = () => {
    setIsHovered(false);
  };

  // 处理图片加载错误
  const handleImageError = () => {
    setHasError(true);
  };

  // 获取图片大小
  const getSizeStyle = () => {
    // 如果有明确的宽高，使用它们
    if (width && height) {
      return {
        width: `${width}px`,
        height: `${height}px`
      };
    }
    
    // 否则使用预设大小
    let presetWidth;
    switch (size) {
      case 'small': presetWidth = 220; break;
      case 'medium': presetWidth = 420; break;
      case 'large': presetWidth = 730; break;
      default: presetWidth = 420;
    }

    // 如果有原始尺寸，按比例计算高度
    if (originalSize.width && originalSize.height) {
      const ratio = originalSize.height / originalSize.width;
      return {
        width: `${presetWidth}px`,
        height: `${Math.round(presetWidth * ratio)}px`
      };
    }

    return { width: `${presetWidth}px` };
  };

  // 处理对齐方式
  const getAlignmentClass = () => {
    switch (alignment) {
      case 'left': return 'image-align-left';
      case 'center': return 'image-align-center';
      case 'right': return 'image-align-right';
      default: return 'image-align-left';
    }
  };

  // 处理边框和阴影
  const getStyleClasses = () => {
    return [
      'editor-image',
      border ? 'has-border' : '',
      shadow ? 'has-shadow' : '',
      `size-${size}`
    ].filter(Boolean).join(' ');
  };

  // 处理图片加载完成
  const handleImageLoad = () => {
    if (imageRef.current) {
      const { naturalWidth, naturalHeight } = imageRef.current;
      const initialWidth = width || naturalWidth;
      const initialHeight = height || naturalHeight;
      
      setOriginalSize({ width: naturalWidth, height: naturalHeight });
      setCurrentSize({ width: initialWidth, height: initialHeight });
      
      // 设置初始尺寸
      imageRef.current.style.width = `${initialWidth}px`;
      imageRef.current.style.height = `${initialHeight}px`;
    }
  };

  // 处理函数包装器
  const handleResizeMoveHandler = useCallback((e: MouseEvent) => {
    if (handleResizeMoveRef.current) {
      handleResizeMoveRef.current(e);
    }
  }, []);
  
  const handleResizeEndHandler = useCallback((e: MouseEvent) => {
    if (handleResizeEndRef.current) {
      handleResizeEndRef.current(e);
    }
  }, []);

  // 开始调整大小
  const handleResizeStart = (e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();
    
    if (imageRef.current) {
      setIsResizing(true);
      setStartPos({ x: e.clientX, y: e.clientY });
      
      // 记录当前尺寸
      const { width, height } = imageRef.current.getBoundingClientRect();
      setCurrentSize({ width, height });
      
      // 暂停编辑器的编辑功能
      if (editor) {
        editor.setEditable(false);
      }
      
      // 添加全局鼠标事件监听
      document.addEventListener('mousemove', handleResizeMoveHandler);
      document.addEventListener('mouseup', handleResizeEndHandler);
      
      // 添加样式
      if (containerRef.current) {
        containerRef.current.classList.add('resizing');
      }
      
      // 禁用文本选择
      document.body.style.userSelect = 'none';
      document.body.style.cursor = 'se-resize';
    }
  };

  // 初始化处理函数
  useEffect(() => {
    // 更新图片尺寸的函数
    const updateImageSize = (width: number, height: number) => {
      if (!imageRef.current) return;
      
      imageRef.current.style.width = `${width}px`;
      imageRef.current.style.height = `${height}px`;
    };
    
    // 使用requestAnimationFrame更新图片尺寸
    const updateSizeWithRAF = (width: number, height: number) => {
      if (rafRef.current) {
        cancelAnimationFrame(rafRef.current);
      }
      
      rafRef.current = requestAnimationFrame(() => {
        updateImageSize(width, height);
        rafRef.current = null;
      });
    };
    
    // 调整大小过程 - 使用节流函数
    const handleResizeMove = throttle((e: MouseEvent) => {
      if (!isResizing || !imageRef.current) return;
      
      e.preventDefault();
      e.stopPropagation();

      const deltaX = e.clientX - startPos.x;
      let newWidth = currentSize.width + deltaX;
      // 获取容器最大宽度
      let maxContainerWidth = 1200;
      if (containerRef.current) {
        const parent = containerRef.current.parentElement;
        if (parent) {
          maxContainerWidth = Math.min(1200, parent.clientWidth || 1200);
        }
      }
      // 限制宽度范围
      newWidth = Math.max(100, Math.min(newWidth, maxContainerWidth));
      // 始终保持宽高比
      const aspectRatio = currentSize.height / currentSize.width;
      const newHeight = Math.round(newWidth * aspectRatio);
      // 实时预览
      setResizePreview({ width: Math.round(newWidth), height: newHeight });
      // 使用requestAnimationFrame更新图片尺寸
      updateSizeWithRAF(newWidth, newHeight);
    }, 16); // 约60fps的更新频率
    
    handleResizeMoveRef.current = handleResizeMove;

    // 结束调整大小
    handleResizeEndRef.current = (e: MouseEvent) => {
      e.preventDefault();
      e.stopPropagation();
      
      // 取消任何待处理的动画帧
      if (rafRef.current) {
        cancelAnimationFrame(rafRef.current);
        rafRef.current = null;
      }
      
      setIsResizing(false);
      setResizePreview(null); // 拖动结束隐藏预览
      
      // 移除全局事件监听
      document.removeEventListener('mousemove', handleResizeMoveHandler);
      document.removeEventListener('mouseup', handleResizeEndHandler);
      
      // 恢复编辑器的编辑功能
      if (editor) {
        setTimeout(() => {
          editor.setEditable(true);
        }, 10);
      }
      
      // 移除样式
      if (containerRef.current) {
        containerRef.current.classList.remove('resizing');
      }
      
      // 恢复文本选择
      document.body.style.userSelect = '';
      document.body.style.cursor = '';
      
      // 更新节点属性
      if (imageRef.current && updateAttributes) {
        const { width, height } = imageRef.current.getBoundingClientRect();
        const roundedWidth = Math.round(width);
        const roundedHeight = Math.round(height);
        
        updateAttributes({ 
          width: roundedWidth,
          height: roundedHeight
        });
        
        // 更新当前尺寸状态
        setCurrentSize({ width: roundedWidth, height: roundedHeight });
      }
    };
  }, [isResizing, startPos, currentSize, updateAttributes, editor, handleResizeMoveHandler, handleResizeEndHandler]);

  // 清理事件监听
  useEffect(() => {
    return () => {
      if (rafRef.current) {
        cancelAnimationFrame(rafRef.current);
      }
      document.removeEventListener('mousemove', handleResizeMoveHandler);
      document.removeEventListener('mouseup', handleResizeEndHandler);
      document.body.style.userSelect = '';
      document.body.style.cursor = '';
      
      // 确保编辑器恢复可编辑状态
      if (editor) {
        editor.setEditable(true);
      }
    };
  }, [editor, handleResizeMoveHandler, handleResizeEndHandler]);

  // 如果没有src，则渲染占位符
  if (!src) {
    return (
      <NodeViewWrapper className="image-node-view-empty">
        <div className="image-placeholder">
          <span>图片加载失败</span>
        </div>
      </NodeViewWrapper>
    );
  }

  return (
    <NodeViewWrapper
      ref={containerRef}
      className={`image-container ${getAlignmentClass()}`}
      onClick={handleContainerClick}
      onMouseEnter={handleMouseEnter}
      onMouseLeave={handleMouseLeave}
      data-drag-handle
    >
      <div className="image-wrapper" style={{ display: 'inline-block', position: 'relative' }}>
        <img
          ref={imageRef}
          src={src}
          alt={alt}
          title={title}
          className={getStyleClasses()}
          style={getSizeStyle()}
          onError={handleImageError}
          onLoad={handleImageLoad}
          draggable={false}
        />
        {/* 拖动实时像素提示 */}
        {resizePreview && (
          <div
            style={{
              position: 'absolute',
              right: 0,
              bottom: 0,
              background: 'rgba(34,34,34,0.85)',
              color: '#fff',
              fontSize: 12,
              borderRadius: 6,
              padding: '2px 8px',
              margin: 4,
              pointerEvents: 'none',
              zIndex: 200,
              boxShadow: '0 2px 8px rgba(0,0,0,0.15)'
            }}
          >
            {resizePreview.width} x {resizePreview.height} px
          </div>
        )}
        {/* 调整大小的手柄 */}
        {selected && !isEditingCaption && (
          <div
            className="image-block-resize-handle"
            onMouseDown={handleResizeStart}
          />
        )}
        {/* 图片说明容器 */}
        <div className="image-caption-container">
          {/* 非编辑状态下显示说明文字 */}
          {!selected && caption && (
            <div className="image-caption-text">
              {caption}
            </div>
          )}
          {/* 编辑状态下显示输入框 */}
          {selected && (
            <input
              ref={captionRef}
              type="text"
              className="image-caption-input"
              value={localCaption}
              placeholder="添加说明文字..."
              onChange={handleCaptionChange}
              onFocus={handleCaptionFocus}
              onBlur={handleCaptionBlur}
              onKeyDown={handleCaptionKeyDown}
              onClick={(e) => e.stopPropagation()}
            />
          )}
        </div>
      </div>
      {/* 图片工具栏 */}
      {selected && !isEditingCaption && (
        <ImageToolbar
          editor={editor}
          node={node}
          updateAttributes={updateAttributes}
          deleteNode={deleteNode}
        />
      )}
    </NodeViewWrapper>
  );
};

export default ImageNodeView; 