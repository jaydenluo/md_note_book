import { Extension } from '@tiptap/core'

// 定义可折叠内容扩展
export const FoldableContent = Extension.create({
  name: 'foldableContent',
  
  // 扩展全局属性
  addGlobalAttributes() {
    return [
      {
        // 为所有节点添加 hidden-by-fold 属性支持
        types: [
          'paragraph', 'heading', 'bulletList', 'orderedList', 'listItem', 
          'blockquote', 'codeBlock', 'horizontalRule', 'image'
        ],
        attributes: {
          // 添加隐藏状态类
          hiddenByFold: {
            default: false,
            parseHTML: element => {
              // 同时检查CSS类和data属性
              return element.classList.contains('hidden-by-fold') || 
                     element.getAttribute('data-hidden-by-fold') === 'true';
            },
            renderHTML: attributes => {
              if (!attributes.hiddenByFold) {
                return {}
              }
              // 同时添加CSS类和data属性
              return {
                class: 'hidden-by-fold',
                'data-hidden-by-fold': 'true'
              }
            }
          }
        }
      }
    ]
  }
})

export default FoldableContent 