import React, { useState } from 'react'
import TiptapEditor from './TiptapEditor'

/**
 * 编辑器演示组件
 * 用于展示美化后的编辑器效果
 */
const EditorDemo: React.FC = () => {
  const [content, setContent] = useState(`
    <h1>欢迎使用美化后的编辑器</h1>
    <p>这是一个<strong>现代化</strong>的Markdown编辑器，具有以下特性：</p>
    
    <h2>🎨 美观的设计</h2>
    <ul>
      <li>现代化的工具栏设计</li>
      <li>流畅的动画效果</li>
      <li>深色/浅色主题支持</li>
      <li>优雅的排版样式</li>
    </ul>
    
    <h2>💡 丰富的功能</h2>
    <ol>
      <li><strong>文本格式</strong>：加粗、斜体、下划线、删除线</li>
      <li><em>标题级别</em>：支持H1、H2、H3标题</li>
      <li>对齐方式：左对齐、居中、右对齐</li>
      <li>列表：有序列表和无序列表</li>
    </ol>
    
    <h3>引用块示例</h3>
    <blockquote>
      这是一个引用块，具有特殊的样式设计。
    </blockquote>
    
    <h3>代码示例</h3>
    <p>行内代码：<code>console.log('Hello World')</code></p>
    
    <pre><code>// 代码块示例
function greet(name) {
  return \`Hello, \${name}!\`;
}

console.log(greet('World'));</code></pre>
    
    <p>这个编辑器支持<strong>实时预览</strong>，您可以立即看到格式化的效果。</p>
  `)

  return (
    <div className="h-screen bg-gray-50 dark:bg-gray-900">
      <div className="h-full max-w-4xl mx-auto bg-white dark:bg-gray-800 shadow-xl">
        <TiptapEditor
          content={content}
          onChange={setContent}
          placeholder="开始编写您的笔记..."
          showToolbar={true}
        />
      </div>
    </div>
  )
}

export default EditorDemo 