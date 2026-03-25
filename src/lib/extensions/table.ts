// 表格相关扩展配置
import Table from '@tiptap/extension-table'
import TableRow from '@tiptap/extension-table-row'
import TableHeader from '@tiptap/extension-table-header'
import TableCell from '@tiptap/extension-table-cell'
import { EditorState } from 'prosemirror-state'
import { findParentNode } from '@tiptap/core'

// 自定义函数：获取当前选中的单元格
function getSelectionCell(state: EditorState) {
  return findParentNode(
    node => node.type.name === 'tableCell' || node.type.name === 'tableHeader',
  )(state.selection)
}

// 自定义表格扩展
const CustomTable = Table.extend({
  name: 'table',
  
  addOptions() {
    return {
      ...this.parent?.(),
      resizable: true,
      handleWidth: 2,
      cellMinWidth: 50,
      lastColumnResizable: true,
      allowTableNodeSelection: false,
      HTMLAttributes: {
        class: 'tiptap-table',
      },
    }
  }
})
              
// 自定义表格单元格扩展，支持对齐属性
const CustomTableCell = TableCell.extend({
  addAttributes() {
    return {
      ...this.parent?.(),
      textAlign: {
        default: 'left',
        parseHTML: element => element.style.textAlign || element.getAttribute('data-text-align') || 'left',
        renderHTML: attributes => {
          return {
            style: `text-align: ${attributes.textAlign}`,
            'data-text-align': attributes.textAlign,
          }
        },
      },
      // 添加列宽属性
      width: {
        default: null,
        parseHTML: element => element.style.width,
        renderHTML: attributes => ({
          style: attributes.width ? `width: ${attributes.width}` : null,
        }),
      },
    }
  },
  
  // 添加设置单元格属性的命令
  addCommands() {
    return {
      ...this.parent?.(),
      // 设置单元格属性命令
      setCellAttribute: (attributeName, attributeValue) => ({ tr, state, dispatch }) => {
        // 获取当前选中的单元格
        const cell = getSelectionCell(state)
        
        if (cell) {
          if (dispatch) {
            tr.setNodeMarkup(cell.pos, undefined, {
              ...cell.node.attrs,
              [attributeName]: attributeValue,
                })
              }
          
          return true
        }
        
        return false
      },
    }
  },
})

// 导出表格相关扩展
export { CustomTable, CustomTableCell, TableRow, TableHeader } 