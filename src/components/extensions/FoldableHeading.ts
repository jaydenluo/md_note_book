import { mergeAttributes, Node } from '@tiptap/core'
import { genHeadingId } from '../Editor'

// 定义可折叠标题扩展
export const FoldableHeading = Node.create({
  name: 'heading',
  
  // 继承自TipTap的heading节点
  priority: 100,
  
  // 扩展默认配置
  addOptions() {
    return {
      levels: [1, 2, 3, 4, 5, 6],
      HTMLAttributes: {
        class: 'relative',
      },
    }
  },
  
  // 定义内容规则
  content: 'inline*',
  group: 'block',
  defining: true,
  
  // 添加自定义属性
  addAttributes() {
    return {
      level: {
        default: 1,
        rendered: false,
        parseHTML: element => {
          const level = parseInt(element.getAttribute('data-level') || element.tagName.replace(/^H/, ''))
          return level && this.options.levels.includes(level) ? level : 1
        },
      },
      id: {
        default: null,
        parseHTML: element => element.getAttribute('id'),
        renderHTML: attributes => {
          if (!attributes.id) {
            return {}
          }
          return { id: attributes.id }
        },
      },
      // 添加折叠状态属性
      folded: {
        default: false,
        parseHTML: element => element.hasAttribute('data-folded'),
        renderHTML: attributes => {
          if (!attributes.folded) {
            return {}
          }
          return { 'data-folded': 'true' }
        },
      },
      // 添加data-level属性，用于CSS中的::after伪元素显示正确的H标识
      dataLevel: {
        default: null,
        parseHTML: element => element.getAttribute('data-level'),
        renderHTML: attributes => {
          const level = attributes.level || 1
          return { 'data-level': level.toString() }
        },
      },
    }
  },
  
  // 解析HTML
  parseHTML() {
    return this.options.levels.map(level => ({
      tag: `h${level}`,
      attrs: { level },
    }))
  },
  
  // 渲染HTML
  renderHTML({ node, HTMLAttributes }) {
    const hasLevel = this.options.levels.includes(node.attrs.level)
    const level = hasLevel ? node.attrs.level : this.options.levels[0]
    
    // 自动生成ID，如果没有的话
    if (!HTMLAttributes.id && node.textContent) {
      HTMLAttributes.id = genHeadingId(node.textContent)
    }
    
    // 设置data-level属性
    HTMLAttributes['data-level'] = level.toString()
    
    return [`h${level}`, mergeAttributes(this.options.HTMLAttributes, HTMLAttributes), 0]
  },
  
  // 添加命令
  addCommands() {
    return {
      setHeading: attributes => ({ commands }) => {
        return commands.setNode(this.name, attributes)
      },
      toggleHeading: attributes => ({ commands }) => {
        return commands.toggleNode(this.name, 'paragraph', attributes)
      },
      // 添加折叠/展开命令
      toggleFolded: () => ({ tr, state, dispatch }) => {
        // 获取当前选择
        const { selection } = state
        const { $from } = selection
        
        // 检查当前节点是否为heading
        const node = $from.node()
        if (node.type.name !== this.name) {
          return false
        }
        
        // 切换折叠状态
        if (dispatch) {
          const folded = !node.attrs.folded
          tr.setNodeMarkup($from.before($from.depth), undefined, {
            ...node.attrs,
            folded,
          })
          dispatch(tr)
        }
        
        return true
      },
    }
  },
  
  // 添加键盘快捷键
  addKeyboardShortcuts() {
    return this.options.levels.reduce(
      (items, level) => ({
        ...items,
        [`Mod-Alt-${level}`]: () => this.editor.commands.toggleHeading({ level }),
      }),
      {}
    )
  },
})

export default FoldableHeading 