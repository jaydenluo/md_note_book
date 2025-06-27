import { Extension } from '@tiptap/core'
import { Plugin, PluginKey } from '@tiptap/pm/state'
import { Decoration, DecorationSet } from '@tiptap/pm/view'

// 创建一个插件键
const foldingPluginKey = new PluginKey('folding')

// 定义折叠插件扩展
export const FoldingPlugin = Extension.create({
  name: 'folding',

  // 添加ProseMirror插件
  addProseMirrorPlugins() {
    return [
      new Plugin({
        key: foldingPluginKey,
        
        // 状态管理
        state: {
          // 初始化状态
          init() {
            return {
              decorations: DecorationSet.empty,
              foldedHeadings: new Set(), // 存储已折叠的标题位置
            }
          },
          
          // 应用状态更新
          apply(tr, pluginState) {
            // 如果文档没有变化，保持原状态
            if (!tr.docChanged) {
              return {
                decorations: pluginState.decorations.map(tr.mapping, tr.doc),
                foldedHeadings: pluginState.foldedHeadings,
              }
            }
            
            const foldedHeadings = new Set(pluginState.foldedHeadings)
            const decorations: Decoration[] = []
            
            // 遍历文档中的所有节点
            tr.doc.descendants((node, pos) => {
              // 如果是标题节点
              if (node.type.name === 'heading' && node.attrs.folded) {
                console.log('折叠插件: 找到已折叠标题', node.textContent, '位置', pos)
                foldedHeadings.add(pos)
                
                // 找到该标题下需要折叠的内容
                let endPos = pos + node.nodeSize
                let level = node.attrs.level
                let contentStart = pos + node.nodeSize
                let contentEnd = tr.doc.nodeSize - 2 // 文档结束位置
                
                // 向后查找，直到遇到同级或更高级别的标题
                let hasFoundContent = false
                
                tr.doc.nodesBetween(contentStart, tr.doc.nodeSize - 2, (childNode, childPos) => {
                  if (childPos <= contentStart) return true // 跳过标题本身
                  
                  if (childNode.type.name === 'heading') {
                    const childLevel = childNode.attrs.level
                    if (childLevel <= level) {
                      // 遇到同级或更高级别的标题，停止
                      contentEnd = childPos
                      return false
                    }
                  }
                  
                  hasFoundContent = true
                  return true
                })
                
                if (hasFoundContent) {
                  console.log('折叠插件: 为标题创建装饰', contentStart, contentEnd)
                  // 创建隐藏装饰
                  decorations.push(
                    Decoration.node(contentStart, contentEnd, {
                      class: 'folded-content',
                      style: 'display: none !important;',
                    })
                  )
                }
              }
              
              return true
            })
            
            return {
              decorations: DecorationSet.create(tr.doc, decorations),
              foldedHeadings,
            }
          },
        },
        
        // 提供装饰
        props: {
          decorations(state) {
            return this.getState(state).decorations
          },
        },
      }),
    ]
  },
})

export default FoldingPlugin 