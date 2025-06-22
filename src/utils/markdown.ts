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
  startOnLoad: false, // 修改为false，由我们手动控制初始化
  theme: 'default',
  securityLevel: 'loose',
})

// 创建两个markdown-it实例: 一个用于快速渲染(输入时), 一个用于完整渲染(预览时)
const lightMd = new MarkdownIt({
  html: true,
  linkify: true,
  typographer: false, // 禁用排版功能以提高速度
  highlight: (str, lang) => {
    // 简化的高亮处理，提高性能
    if (lang && hljs.getLanguage(lang)) {
      try {
        return `<pre class="hljs"><code class="${lang}">${
          hljs.highlight(str, { language: lang, ignoreIllegals: true }).value
        }</code></pre>`;
      } catch (__) {}
    }
    return `<pre class="hljs"><code>${str}</code></pre>`;
  }
})

// 完整的markdown-it实例，用于最终渲染
const fullMd = new MarkdownIt({
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

// 添加基本扩展到轻量实例
lightMd.use(taskLists, { enabled: true })

// 添加所有扩展到完整实例
fullMd.use(taskLists, { enabled: true })
  .use(katex)
  .use(linkAttributes, {
    pattern: /^https?:\/\//,
    attrs: {
      target: '_blank',
      rel: 'noopener'
    }
  })

// 添加 mermaid 图表支持到完整实例
const defaultFence = fullMd.renderer.rules.fence!
fullMd.renderer.rules.fence = (tokens, idx, options, env, self) => {
  const token = tokens[idx]
  if (token.info === 'mermaid') {
    return `<div class="mermaid">${token.content}</div>`
  }
  return defaultFence(tokens, idx, options, env, self)
}

// 自定义容器只添加到完整实例
fullMd.use(container, 'info', {
  validate: function(params: string) {
    return params.trim().match(/^info\s+(.*)$/)
  },
  render: function (tokens: any[], idx: number) {
    const m = tokens[idx].info.trim().match(/^info\s+(.*)$/)
    if (tokens[idx].nesting === 1) {
      return `<div class="info custom-block"><p class="custom-block-title">${fullMd.utils.escapeHtml(m[1])}</p>\n`
    } else {
      return '</div>\n'
    }
  }
})

// 添加更多自定义容器到完整实例
;['tip', 'warning', 'danger'].forEach(type => {
  fullMd.use(container, type, {
    validate: function(params: string) {
      return params.trim().match(new RegExp(`^${type}\\s+(.*)$`))
    },
    render: function (tokens: any[], idx: number) {
      const m = tokens[idx].info.trim().match(new RegExp(`^${type}\\s+(.*)$`))
      if (tokens[idx].nesting === 1) {
        return `<div class="${type} custom-block"><p class="custom-block-title">${
          fullMd.utils.escapeHtml(m[1])
        }</p>\n`
      } else {
        return '</div>\n'
      }
    }
  })
}) 

// 渲染缓存，避免重复渲染相同的内容
const renderCache = new Map<string, string>();
const MAX_CACHE_SIZE = 100; // 最大缓存大小

/**
 * 根据内容长度和复杂度选择合适的渲染器
 * 短内容或快速实时渲染时使用轻量渲染器
 */
function selectRenderer(content: string, isRealtime: boolean = false): MarkdownIt {
  // 对于实时渲染或短内容，使用轻量级渲染器
  if (isRealtime || content.length < 1000) {
    return lightMd;
  }
  return fullMd;
}

/**
 * 带缓存的Markdown渲染函数
 * @param content Markdown内容
 * @param isRealtime 是否是实时渲染（输入过程中的渲染）
 * @returns 渲染后的HTML
 */
const renderWithCache = (content: string, isRealtime: boolean = false): string => {
  // 对于空内容，直接返回空的段落
  if (!content) {
    return '<p></p>';
  }

  // 对于非常短的内容，不使用缓存，直接渲染
  if (content.length < 10) {
    const renderer = selectRenderer(content, isRealtime);
    return renderer.render(content);
  }

  // 构造缓存键，区分实时渲染和完整渲染
  const cacheKey = isRealtime ? `light:${content}` : `full:${content}`;

  // 检查缓存
  if (renderCache.has(cacheKey)) {
    return renderCache.get(cacheKey) as string;
  }

  // 选择合适的渲染器
  const renderer = selectRenderer(content, isRealtime);
  
  // 渲染新内容
  const html = renderer.render(content);
  
  // 缓存结果
  if (renderCache.size >= MAX_CACHE_SIZE) {
    // 简单的LRU缓存策略：删除最早添加的项目
    const firstKey = renderCache.keys().next().value;
    renderCache.delete(firstKey);
  }
  renderCache.set(cacheKey, html);

  return html;
};

/**
 * 实时渲染函数 - 用于编辑器输入时的快速渲染
 * 使用轻量级渲染器，不初始化复杂功能
 */
function renderRealtime(content: string): string {
  return renderWithCache(content, true);
}

/**
 * 完整渲染函数 - 用于最终展示
 */
function renderComplete(content: string): string {
  return renderWithCache(content, false);
}

// 修改md对象提供不同级别的渲染方法
const md = {
  // 默认render方法保持不变，但内部使用缓存
  render: (content: string, ...args: any[]) => {
    // 对于带参数的调用，使用原始fullMd方法
    if (args.length > 0) {
      return fullMd.render(content, ...args);
    }
    return renderComplete(content);
  },
  
  // 实时渲染方法，用于编辑器输入时
  renderRealtime,
  
  // 完整渲染方法，用于最终展示
  renderComplete,
  
  // 传递原始的utils供插件使用
  utils: fullMd.utils
};

/**
 * 渲染Markdown内容为HTML
 * @param content Markdown内容
 * @param isRealtime 是否是实时渲染
 * @returns 渲染后的HTML
 */
export function renderMarkdown(content: string, isRealtime: boolean = false): string {
  const html = isRealtime ? md.renderRealtime(content) : md.renderComplete(content);
  
  // 只有在完整渲染模式下才初始化mermaid图表
  if (!isRealtime) {
  setTimeout(() => {
    try {
        // 只初始化新的mermaid元素
        const elements = document.querySelectorAll('.mermaid:not([data-processed="true"])') as NodeListOf<HTMLElement>;
        if (elements.length > 0) {
          mermaid.init(undefined, elements);
          // 标记已处理的元素
          elements.forEach(el => el.setAttribute('data-processed', 'true'));
        }
    } catch (e) {
        console.error('Mermaid初始化失败:', e);
    }
    }, 0);
  }
  
  return html;
}

// 清除渲染缓存
export function clearMarkdownCache() {
  renderCache.clear();
} 

// 导出markdown实例
export { md } 