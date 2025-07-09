// 表格相关扩展配置
import Table from '@tiptap/extension-table'
import TableRow from '@tiptap/extension-table-row'
import TableHeader from '@tiptap/extension-table-header'
import TableCell from '@tiptap/extension-table-cell'

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
        parseHTML: element => element.style.textAlign || 'left',
        renderHTML: attributes => ({
          style: `text-align: ${attributes.textAlign}`,
        }),
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
})

// 导出表格相关扩展
export { CustomTable, CustomTableCell, TableRow, TableHeader } 