import { mergeAttributes, Node } from '@tiptap/core'
import { Plugin } from 'prosemirror-state'
import { Decoration, DecorationSet } from 'prosemirror-view'

// 图片扩展配置接口
interface ImageOptions {
  // 默认图片宽度
  defaultWidth: number
  // 图片对齐方式
  defaultAlignment: 'left' | 'center' | 'right'
  // 是否显示边框
  defaultBorder: boolean
  // 是否显示阴影
  defaultShadow: boolean
}

declare module '@tiptap/core' {
  interface Commands<ReturnType> {
    customImage: {
      // 插入图片命令
      setImage: (options: { src: string, alt?: string, title?: string }) => ReturnType
      // 更新图片属性命令
      updateImage: (options: { src?: string, alt?: string, title?: string, width?: number, alignment?: string }) => ReturnType
    }
  }
}

// 创建自定义图片扩展
export const CustomImage = Node.create<ImageOptions>({
  name: 'customImage',
  
  // 默认配置
  addOptions() {
    return {
      defaultWidth: 800,
      defaultAlignment: 'left',
      defaultBorder: true,
      defaultShadow: true,
    }
  },

  // 图片节点的基本属性
  group: 'block',
  draggable: true,
  selectable: true,
  atom: true,

  // 定义图片属性
  addAttributes() {
    return {
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
        default: this.options.defaultWidth,
      },
      alignment: {
        default: this.options.defaultAlignment,
        parseHTML: element => element.style.textAlign,
        renderHTML: attributes => {
          return {
            style: `text-align: ${attributes.alignment}`,
          }
        },
      },
      border: {
        default: this.options.defaultBorder,
        parseHTML: element => element.getAttribute('data-border') === 'true',
        renderHTML: attributes => {
          return {
            'data-border': attributes.border,
          }
        },
      },
      shadow: {
        default: this.options.defaultShadow,
        parseHTML: element => element.getAttribute('data-shadow') === 'true',
        renderHTML: attributes => {
          return {
            'data-shadow': attributes.shadow,
          }
        },
      },
    }
  },

  // 解析HTML
  parseHTML() {
    return [
      {
        tag: 'img[src]',
      },
    ]
  },

  // 渲染HTML
  renderHTML({ HTMLAttributes }) {
    const { border, shadow, alignment, ...attrs } = HTMLAttributes
    
    // 构建图片类名
    const className = [
      'custom-image',
      border ? 'has-border' : '',
      shadow ? 'has-shadow' : '',
      `align-${alignment}`,
    ].filter(Boolean).join(' ')

    return ['div', { class: className, style: `text-align: ${alignment}` },
      ['img', mergeAttributes(attrs)],
    ]
  },

  // 添加命令
  addCommands() {
    return {
      setImage: options => ({ commands }) => {
        return commands.insertContent({
          type: this.name,
          attrs: options,
        })
      },
      updateImage: options => ({ commands }) => {
        return commands.updateAttributes(this.name, options)
      },
    }
  },

  // 添加插件处理拖拽上传
  addProseMirrorPlugins() {
    return [
      new Plugin({
        props: {
          handleDrop(view, event, slice, moved) {
            if (!event.dataTransfer?.files?.length) return false
            
            // 处理拖拽的文件
            const files = Array.from(event.dataTransfer.files).filter(file => 
              file.type.startsWith('image/')
            )
            
            if (files.length === 0) return false

            // 这里可以处理文件上传
            // TODO: 实现文件上传逻辑

            return true
          },
          handlePaste(view, event) {
            // 处理粘贴事件
            const items = Array.from(event.clipboardData?.items || [])
            const images = items.filter(item => item.type.startsWith('image/'))
            
            if (images.length === 0) return false

            // TODO: 实现粘贴图片处理逻辑

            return true
          },
        },
      }),
    ]
  },
}) 