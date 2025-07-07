import React, { memo } from 'react';
import { Editor } from '@tiptap/react';
import {
  AlignLeft,
  AlignCenter,
  AlignRight,
  Trash,
  ImageDown,
  Square,
  ImagePlus,
  Frame,
} from 'lucide-react';

// 图片大小选项
type ImageSize = 'small' | 'medium' | 'large';

// 图片工具栏属性
interface ImageToolbarProps {
  editor: Editor;
  node: any;
  updateAttributes: (attrs: Record<string, any>) => void;
  deleteNode: () => void;
}

// 工具栏按钮属性
interface ToolbarButtonProps {
  onClick: () => void;
  icon: React.ReactElement;
  title: string;
  isActive?: boolean;
}

// 工具栏按钮组件
const ToolbarButton = memo(function ToolbarButton({ onClick, icon, title, isActive = false }: ToolbarButtonProps) {
  return React.createElement('button', {
    onClick: (e: React.MouseEvent) => {
      e.preventDefault();
      e.stopPropagation();
      onClick();
    },
    title,
    className: `p-1 rounded hover:bg-gray-200 dark:hover:bg-gray-700 ${
      isActive ? 'bg-gray-200 dark:bg-gray-700' : ''
    }`,
    children: icon
  });
});

// 获取大小图标
const getSizeIcon = (size: string) => {
  const iconProps = { size: 16 };
  switch (size) {
    case 'small': return React.createElement(ImageDown, { ...iconProps, className: "transform scale-75" });
    case 'medium': return React.createElement(ImageDown, iconProps);
    case 'large': return React.createElement(ImageDown, { ...iconProps, className: "transform scale-125" });
    default: return React.createElement(ImageDown, iconProps);
  }
};

const ImageToolbar: React.FC<ImageToolbarProps> = ({
  editor,
  node,
  updateAttributes,
  deleteNode
}) => {
  // 确保节点属性存在
  const safeAttrs = node?.attrs || {};
  
  // 获取当前图片属性
  const { 
    alignment = 'left', 
    size = 'medium', 
    border = true, 
    shadow = true,
    width = null,
    height = null
  } = safeAttrs;

  // 设置图片对齐方式
  const setAlignment = (newAlignment: string) => {
    setTimeout(() => {
      try {
        updateAttributes({ alignment: newAlignment });
      } catch (error) {
        console.error('更新图片对齐方式失败:', error);
      }
    }, 0);
  };

  // 图片大小循环切换
  const toggleSize = () => {
    const sizes: ImageSize[] = ['small', 'medium', 'large'];
    const currentIndex = sizes.indexOf(size as ImageSize);
    const nextSize = sizes[(currentIndex + 1) % sizes.length];
    
    // 根据原始尺寸计算新尺寸
    let newWidth, newHeight;
    if (width && height) {
      const ratio = height / width;
      switch (nextSize) {
        case 'small':
          newWidth = 300;
          break;
        case 'medium':
          newWidth = 500;
          break;
        case 'large':
          newWidth = 800;
          break;
        default:
          newWidth = 500;
      }
      newHeight = Math.round(newWidth * ratio);
    }
    
    setTimeout(() => {
      try {
        updateAttributes({
          size: nextSize,
          width: newWidth,
          height: newHeight
        });
      } catch (error) {
        console.error('更新图片大小失败:', error);
      }
    }, 0);
  };

  // 获取图片大小标题
  const getSizeTitle = () => {
    switch (size) {
      case 'small': return '小图 (300px) - 点击切换为中图';
      case 'medium': return '中图 (500px) - 点击切换为大图';
      case 'large': return '大图 (800px) - 点击切换为小图';
      default: return '调整大小';
    }
  };

  // 切换边框和阴影
  const toggleBorderShadow = () => {
    const newState = !(border && shadow);
    setTimeout(() => {
      try {
        updateAttributes({ border: newState, shadow: newState });
      } catch (error) {
        console.error('更新图片边框和阴影失败:', error);
      }
    }, 0);
  };

  // 删除图片
  const handleDelete = () => {
    setTimeout(() => {
      try {
        deleteNode();
      } catch (error) {
        console.error('删除图片失败:', error);
      }
    }, 0);
  };

  return React.createElement('div', {
    className: "absolute -top-10 left-1/2 transform -translate-x-1/2 bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded shadow-md p-1 flex items-center gap-1 z-10",
    onClick: (e: React.MouseEvent) => e.stopPropagation(),
    children: [
      // 对齐方式按钮组
      React.createElement(ToolbarButton, {
        onClick: () => setAlignment('left'),
        icon: React.createElement(AlignLeft, { size: 16 }),
        title: "左对齐",
        isActive: alignment === 'left',
        key: 'align-left'
      }),
      React.createElement(ToolbarButton, {
        onClick: () => setAlignment('center'),
        icon: React.createElement(AlignCenter, { size: 16 }),
        title: "居中",
        isActive: alignment === 'center',
        key: 'align-center'
      }),
      React.createElement(ToolbarButton, {
        onClick: () => setAlignment('right'),
        icon: React.createElement(AlignRight, { size: 16 }),
        title: "右对齐",
        isActive: alignment === 'right',
        key: 'align-right'
      }),

      // 分隔线
      React.createElement('div', {
        className: "w-px h-5 bg-gray-300 dark:bg-gray-600 mx-1",
        key: 'divider-1'
      }),

      // 图片大小切换按钮
      React.createElement(ToolbarButton, {
        onClick: toggleSize,
        icon: getSizeIcon(size),
        title: getSizeTitle(),
        isActive: true,
        key: 'size-toggle'
      }),

      // 边框和阴影切换按钮
      React.createElement(ToolbarButton, {
        onClick: toggleBorderShadow,
        icon: React.createElement(Frame, { size: 16 }),
        title: border && shadow ? '关闭边框和阴影' : '开启边框和阴影',
        isActive: border && shadow,
        key: 'border-shadow'
      }),

      // 分隔线
      React.createElement('div', {
        className: "w-px h-5 bg-gray-300 dark:bg-gray-600 mx-1",
        key: 'divider-2'
      }),

      // 删除按钮
      React.createElement(ToolbarButton, {
        onClick: handleDelete,
        icon: React.createElement(Trash, { size: 16 }),
        title: "删除图片",
        key: 'delete'
      })
    ]
  });
};

export default ImageToolbar; 