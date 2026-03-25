import React from 'react'

interface SearchHighlightProps {
  text: string
  searchQuery: string
  className?: string
  highlightClassName?: string
  maxLength?: number
  isHtml?: boolean
}

// 搜索结果高亮组件
export function SearchHighlight({ 
  text, 
  searchQuery, 
  className = '', 
  highlightClassName = 'bg-yellow-200 dark:bg-yellow-800 px-1 rounded',
  maxLength = 0,
  isHtml = false
}: SearchHighlightProps) {
  if (isHtml) {
    return <HTMLSearchHighlight html={text} className={className} />
  }

  if (!searchQuery.trim()) {
    const displayText = maxLength > 0 && text.length > maxLength 
      ? text.substring(0, maxLength) + '...' 
      : text
    return <span className={className}>{displayText}</span>
  }

  // 处理文本长度限制
  let processedText = text
  if (maxLength > 0 && text.length > maxLength) {
    // 尝试找到搜索词附近的文本片段
    const queryIndex = text.toLowerCase().indexOf(searchQuery.toLowerCase())
    if (queryIndex !== -1) {
      const start = Math.max(0, queryIndex - Math.floor(maxLength / 2))
      const end = Math.min(text.length, start + maxLength)
      processedText = (start > 0 ? '...' : '') + 
                     text.substring(start, end) + 
                     (end < text.length ? '...' : '')
    } else {
      processedText = text.substring(0, maxLength) + '...'
    }
  }

  // 分割搜索查询词
  const searchTerms = searchQuery
    .trim()
    .split(/\s+/)
    .filter(term => term.length > 0)
    .sort((a, b) => b.length - a.length) // 按长度排序，先匹配长词

  if (searchTerms.length === 0) {
    return <span className={className}>{processedText}</span>
  }

  // 创建正则表达式来匹配所有搜索词
  const regex = new RegExp(
    `(${searchTerms.map(term => 
      term.replace(/[.*+?^${}()|[\]\\]/g, '\\$&') // 转义特殊字符
    ).join('|')})`,
    'gi'
  )

  // 分割文本并高亮匹配的部分
  const parts = processedText.split(regex)
  
  return (
    <span className={className}>
      {parts.map((part, index) => {
        // 检查这个部分是否匹配搜索词
        const isMatch = searchTerms.some(term => 
          part.toLowerCase() === term.toLowerCase()
        )
        
        return isMatch ? (
          <mark key={index} className={highlightClassName}>
            {part}
          </mark>
        ) : (
          <span key={index}>{part}</span>
        )
      })}
    </span>
  )
}

// HTML 高亮组件（用于处理已经包含 HTML 标记的文本）
export function HTMLSearchHighlight({ 
  html, 
  className = '' 
}: { 
  html: string
  className?: string 
}) {
  return (
    <span 
      className={className}
      dangerouslySetInnerHTML={{ __html: html }}
    />
  )
}

// 高亮工具函数
export function highlightText(text: string, searchQuery: string): string {
  if (!searchQuery.trim()) return text

  const searchTerms = searchQuery
    .trim()
    .split(/\s+/)
    .filter(term => term.length > 0)
    .sort((a, b) => b.length - a.length)

  if (searchTerms.length === 0) return text

  let highlightedText = text
  
  searchTerms.forEach(term => {
    const regex = new RegExp(
      `(${term.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')})`,
      'gi'
    )
    highlightedText = highlightedText.replace(
      regex, 
      '<mark class="bg-yellow-200 dark:bg-yellow-800 px-1 rounded">$1</mark>'
    )
  })

  return highlightedText
}

// 去除 HTML 标记并高亮
export function stripHtmlAndHighlight(html: string, searchQuery: string): string {
  // 移除 HTML 标签
  const textOnly = html.replace(/<[^>]*>/g, '')
  // 解码 HTML 实体
  const decoded = textOnly
    .replace(/&lt;/g, '<')
    .replace(/&gt;/g, '>')
    .replace(/&amp;/g, '&')
    .replace(/&quot;/g, '"')
    .replace(/&#39;/g, "'")
    .replace(/&nbsp;/g, ' ')
  
  return highlightText(decoded, searchQuery)
}

// 智能摘要提取（提取包含搜索词的文本片段）
export function extractSearchSnippet(
  text: string, 
  searchQuery: string, 
  maxLength: number = 200
): string {
  if (!searchQuery.trim()) {
    return text.length > maxLength ? text.substring(0, maxLength) + '...' : text
  }

  const searchTerms = searchQuery
    .trim()
    .split(/\s+/)
    .filter(term => term.length > 0)

  // 查找第一个匹配的搜索词位置
  let bestMatchIndex = -1
  let bestMatchTerm = ''
  
  for (const term of searchTerms) {
    const index = text.toLowerCase().indexOf(term.toLowerCase())
    if (index !== -1 && (bestMatchIndex === -1 || index < bestMatchIndex)) {
      bestMatchIndex = index
      bestMatchTerm = term
    }
  }

  if (bestMatchIndex === -1) {
    // 没有找到匹配，返回开头
    return text.length > maxLength ? text.substring(0, maxLength) + '...' : text
  }

  // 计算摘要的开始和结束位置
  const termLength = bestMatchTerm.length
  const beforeMatch = Math.floor((maxLength - termLength) / 2)
  const afterMatch = maxLength - termLength - beforeMatch

  const startIndex = Math.max(0, bestMatchIndex - beforeMatch)
  const endIndex = Math.min(text.length, bestMatchIndex + termLength + afterMatch)

  let snippet = text.substring(startIndex, endIndex)
  
  // 添加省略号
  if (startIndex > 0) snippet = '...' + snippet
  if (endIndex < text.length) snippet = snippet + '...'

  return snippet
}