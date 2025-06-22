import MarkdownIt from 'markdown-it'
import hljs from 'highlight.js'
import mermaid from 'mermaid'

// 使用动态导入插件
// @ts-ignore
import taskListsModule from 'markdown-it-task-lists'
const taskLists = taskListsModule.default || taskListsModule
// @ts-ignore
import katexModule from 'markdown-it-katex'
const katex = katexModule.default || katexModule
// @ts-ignore
import linkAttributesModule from 'markdown-it-link-attributes'
const linkAttributes = linkAttributesModule.default || linkAttributesModule
// @ts-ignore
import containerModule from 'markdown-it-container'
const container = containerModule.default || containerModule

// 初始化 mermaid
mermaid.initialize({
  startOnLoad: true,
  theme: 'default',
  securityLevel: 'loose',
})

// 创建 markdown-it 实例
const md = new MarkdownIt({
  html: true,
  linkify: true,
  typographer: true,
  highlight: (str, lang) => {
    if (lang && hljs.getLanguage(lang)) {
      try {
        return hljs.highlight(str, { language: lang }).value
      } catch (__) {}
    }
    return '' // 使用默认的转义
  }
})

// 添加扩展
md.use(taskLists, { enabled: true })
  .use(katex)
  .use(linkAttributes, {
    pattern: /^https?:\/\//,
    attrs: {
      target: '_blank',
      rel: 'noopener'
    }
  })

// 添加 mermaid 图表支持
const defaultFence = md.renderer.rules.fence!
md.renderer.rules.fence = (tokens, idx, options, env, self) => {
  const token = tokens[idx]
  if (token.info === 'mermaid') {
    return `<div class="mermaid">${token.content}</div>`
  }
  return defaultFence(tokens, idx, options, env, self)
}

// 自定义容器
md.use(container, 'info', {
  validate: function(params: string) {
    return params.trim().match(/^info\s+(.*)$/)
  },
  render: function (tokens: any[], idx: number) {
    const m = tokens[idx].info.trim().match(/^info\s+(.*)$/)
    if (tokens[idx].nesting === 1) {
      return `<div class="info custom-block"><p class="custom-block-title">${md.utils.escapeHtml(m[1])}</p>\n`
    } else {
      return '</div>\n'
    }
  }
})

// 添加更多自定义容器
;['tip', 'warning', 'danger'].forEach(type => {
  md.use(container, type, {
    validate: function(params: string) {
      return params.trim().match(new RegExp(`^${type}\\s+(.*)$`))
    },
    render: function (tokens: any[], idx: number) {
      const m = tokens[idx].info.trim().match(new RegExp(`^${type}\\s+(.*)$`))
      if (tokens[idx].nesting === 1) {
        return `<div class="${type} custom-block"><p class="custom-block-title">${
          md.utils.escapeHtml(m[1])
        }</p>\n`
      } else {
        return '</div>\n'
      }
    }
  })
}) 

/**
 * 渲染Markdown内容为HTML
 * @param content Markdown内容
 * @returns 渲染后的HTML
 */
export function renderMarkdown(content: string): string {
  const html = md.render(content)
  
  // 在下一个事件循环中初始化mermaid图表
  setTimeout(() => {
    try {
      mermaid.init(undefined, document.querySelectorAll('.mermaid'))
    } catch (e) {
      console.error('Mermaid初始化失败:', e)
    }
  }, 0)
  
  return html
} 

// 导出markdown实例
export { md } 