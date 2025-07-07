import { Node, mergeAttributes } from '@tiptap/core';
import { ReactNodeViewRenderer } from '@tiptap/react';
import ImageNodeView from '../../components/ImageNodeView';

// 图片扩展配置接口
export interface EnhancedImageOptions {
  inline: boolean;
  allowBase64: boolean;
  HTMLAttributes: Record<string, any>;
}

// 增强图片扩展
export const EnhancedImage = Node.create<EnhancedImageOptions>({
  name: 'enhancedImage',
  
  // 默认配置
  addOptions() {
    return {
      inline: false,
      allowBase64: true,
      HTMLAttributes: {},
    };
  },

  // 图片节点的基本属性
  group: 'block',
  draggable: true,
  selectable: true,
  atom: true,

  // 定义图片属性
  addAttributes() {
    return {
      // 基本属性
      src: {
        default: null,
      },
      alt: {
        default: null,
      },
      title: {
        default: null,
      },
      width: {
        default: null,
      },
      height: {
        default: null,
      },
      // 增强属性
      alignment: {
        default: 'left',
      },
      size: {
        default: 'medium',
      },
      border: {
        default: true,
      },
      shadow: {
        default: true,
      },
      caption: {
        default: '',
      },
    };
  },

  // 解析HTML
  parseHTML() {
    return [
      {
        tag: 'img[src]',
        getAttrs: (node) => {
          if (typeof node === 'string') return {};
          
          const element = node as HTMLElement;
          const parent = element.parentElement;
          
          // 获取图片属性
          return {
            src: element.getAttribute('src'),
            alt: element.getAttribute('alt'),
            title: element.getAttribute('title'),
            width: element.getAttribute('width'),
            height: element.getAttribute('height'),
            alignment: parent?.dataset.alignment || 'left',
            size: parent?.dataset.size || 'medium',
            border: parent?.dataset.border !== 'false',
            shadow: parent?.dataset.shadow !== 'false',
            caption: parent?.dataset.caption || '',
          };
        },
      },
      {
        tag: 'div.image-container',
        getAttrs: (node) => {
          if (typeof node === 'string') return {};
          
          const element = node as HTMLElement;
          const img = element.querySelector('img');
          const caption = element.querySelector('.image-caption');
          
          if (!img) return false;
          
          return {
            src: img.getAttribute('src'),
            alt: img.getAttribute('alt'),
            title: img.getAttribute('title'),
            width: img.getAttribute('width'),
            height: img.getAttribute('height'),
            alignment: element.dataset.alignment || 'left',
            size: element.dataset.size || 'medium',
            border: element.dataset.border !== 'false',
            shadow: element.dataset.shadow !== 'false',
            caption: caption?.textContent || '',
          };
        },
      },
    ];
  },

  // 渲染HTML
  renderHTML({ HTMLAttributes }) {
    const { alignment, size, border, shadow, caption, ...attrs } = HTMLAttributes;
    
    // 确保src存在
    if (!attrs.src) {
      console.warn('EnhancedImage: 缺少src属性');
      // 返回一个空的占位符而不是null
      return ['div', { class: 'image-container-empty' }, ''];
    }
    
    // 构建容器属性
    const containerAttrs = {
      'class': 'image-container',
      'data-alignment': alignment || 'left',
      'data-size': size || 'medium',
      'data-border': border !== false ? 'true' : 'false',
      'data-shadow': shadow !== false ? 'true' : 'false',
      'data-caption': caption || '',
    };
    
    // 构建图片类名
    const imgClass = [
      'editor-image',
      border !== false ? 'has-border' : '',
      shadow !== false ? 'has-shadow' : '',
    ].filter(Boolean).join(' ');
    
    // 返回HTML结构，确保没有null值
    const captionElement = caption 
      ? ['div', { class: 'image-caption' }, caption] 
      : ['div', { class: 'image-caption-empty' }, ''];
    
    return [
      'div', 
      containerAttrs,
      ['div', { class: `image-align-${alignment || 'left'}` }, 
        ['img', mergeAttributes({ class: imgClass }, attrs)],
        captionElement,
      ],
    ];
  },

  // 添加命令
  addCommands() {
    return {
      // 设置图片命令
      setEnhancedImage: (options) => ({ commands }) => {
        try {
          return commands.insertContent({
            type: this.name,
            attrs: options,
          });
        } catch (error) {
          console.error('设置图片失败:', error);
          return false;
        }
      },
      // 更新图片属性命令
      updateEnhancedImage: (options) => ({ commands }) => {
        try {
          return commands.updateAttributes(this.name, options);
        } catch (error) {
          console.error('更新图片属性失败:', error);
          return false;
        }
      },
    };
  },

  // 添加节点视图
  addNodeView() {
    return ReactNodeViewRenderer(ImageNodeView);
  },
}); 