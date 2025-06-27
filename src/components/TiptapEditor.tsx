import React, { useEffect, useRef } from 'react'
import { useEditor, EditorContent } from '@tiptap/react'
import StarterKit from '@tiptap/starter-kit'
import Underline from '@tiptap/extension-underline'
import Link from '@tiptap/extension-link'
import Image from '@tiptap/extension-image'
import TextAlign from '@tiptap/extension-text-align'
import Placeholder from '@tiptap/extension-placeholder'
import CodeBlockLowlight from '@tiptap/extension-code-block-lowlight'
import { common, createLowlight } from 'lowlight'
import EditorToolbar from './EditorToolbar'
import '../styles/editor.css'
import { genHeadingId } from './Editor' // 导入统一的ID生成函数
import FoldableContent from './extensions/FoldableContent'

// 导入常用的编程语言高亮支持
import javascript from 'highlight.js/lib/languages/javascript'
import typescript from 'highlight.js/lib/languages/typescript'
import python from 'highlight.js/lib/languages/python'
import css from 'highlight.js/lib/languages/css'
import html from 'highlight.js/lib/languages/xml'
import json from 'highlight.js/lib/languages/json'
import markdown from 'highlight.js/lib/languages/markdown'
import sql from 'highlight.js/lib/languages/sql'
import bash from 'highlight.js/lib/languages/bash'

// 创建 lowlight 实例并注册语言支持
const lowlight = createLowlight(common)
lowlight.register('javascript', javascript)
lowlight.register('typescript', typescript)
lowlight.register('python', python)
lowlight.register('css', css)
lowlight.register('html', html)
lowlight.register('json', json)
lowlight.register('markdown', markdown)
lowlight.register('sql', sql)
lowlight.register('bash', bash)

// 编辑器属性接口
interface TiptapEditorProps {
  content: string
  onChange: (content: string) => void
  className?: string
  placeholder?: string
  showToolbar?: boolean // 是否显示工具栏
}

// eslint-disable-next-line @typescript-eslint/no-unused-vars
function addHeadingIdsToHtml(html: string): string {
  try {
    const parser = new DOMParser();
    const doc = parser.parseFromString(html, 'text/html');

    const headings = doc.querySelectorAll('h1, h2, h3, h4, h5, h6');
    headings.forEach((heading) => {
      if (!heading.id) {
        const text = heading.textContent?.trim() || '';
        // 生成与大纲一致的ID
        heading.id = genHeadingId(text);
      }
      
      // 为标题添加data-level属性，用于CSS中的::after伪元素显示正确的H标识
      const level = heading.tagName.substring(1); // 从"H1"提取"1"
      heading.setAttribute('data-level', level);
    });

    return doc.body.innerHTML;
  } catch (error) {
    console.error('为heading添加id时出错:', error);
    return html;
  }
}

/**
 * 确保标题有ID，以便可以跳转，但不更改任何其他属性，用于显示大纲时
 */
// eslint-disable-next-line @typescript-eslint/no-unused-vars
function ensureHeadingIds(html: string): string {
  try {
    const parser = new DOMParser();
    const doc = parser.parseFromString(html, 'text/html');

    const headings = doc.querySelectorAll('h1, h2, h3, h4, h5, h6');
    headings.forEach((heading) => {
      if (!heading.id) {
        const text = heading.textContent?.trim() || '';
        // 生成ID
        heading.id = genHeadingId(text);
      }
    });

    return doc.body.innerHTML;
  } catch (error) {
    console.error('确保标题ID时出错:', error);
    return html;
  }
}

/**
 * Tiptap Markdown编辑器组件
 * 提供基础的Markdown编辑功能和格式工具栏，采用简洁朴素的设计
 */
const TiptapEditor = ({
  content,
  onChange,
  className = '',
  placeholder = '开始编写笔记...',
  showToolbar = true // 默认显示工具栏
}: TiptapEditorProps): React.ReactElement => {
  // 创建防抖的onChange函数
  const debouncedOnChange = useRef(
    (() => {
      let timer: number | null = null
      return (newContent: string) => {
        if (timer) clearTimeout(timer)
        timer = setTimeout(() => {
          onChange(newContent)
        }, 300)
      }
    })()
  ).current

  // 新增：首次渲染时不触发onChange
  const isFirstRender = useRef(true);

  // 创建编辑器实例
  const editor = useEditor({
    extensions: [
      StarterKit.configure({
        heading: {
          HTMLAttributes: {
            class: 'relative',
          },
        },
        // 禁用默认的代码块，使用我们的自定义版本
        codeBlock: false,
      }),
      Underline,
      Link.configure({
        openOnClick: false,
        HTMLAttributes: {
          class: 'text-blue-600 dark:text-blue-400 underline'
        }
      }),
      Image.configure({
        HTMLAttributes: {
          class: 'max-w-full h-auto rounded'
        }
      }),
      TextAlign.configure({
        types: ['heading', 'paragraph']
      }),
      Placeholder.configure({
        placeholder
      }),
      // 添加支持语法高亮的代码块
      CodeBlockLowlight.configure({
        lowlight,
        HTMLAttributes: {
          class: 'code-block',
        },
        languageClassPrefix: 'language-',
      }),
      // 添加折叠内容扩展，使其能够保存折叠状态
      FoldableContent,
    ],
    content: content || '',
    onUpdate: ({ editor }) => {
    if (isFirstRender.current) {
      isFirstRender.current = false;
      return; // 首次渲染不触发onChange
    }
      try {
        // 直接获取HTML，保留所有属性和折叠状态
        const html = editor.getHTML();
        // 保存内容（包含折叠状态）
        debouncedOnChange(html);
      } catch (error) {
        console.error('编辑器更新处理失败:', error);
      }
    },
    editorProps: {
      attributes: {
        class: 'tiptap-editor'
      }
    },
    // 确保编辑器在创建时就有焦点
    autofocus: false,
    // 启用所有编辑器功能
    enableCoreExtensions: true
  })

  // 将editor实例挂载到window，供大纲跳转调用
  useEffect(() => {
    if (editor) {
      // 临时将editor实例挂载到window供大纲跳转使用
      (window as Window & typeof globalThis & { tiptapEditorInstance: typeof editor }).tiptapEditorInstance = editor;
    }
    return () => {
      // 清理window.tiptapEditorInstance全局变量
      if ((window as Window & typeof globalThis & { tiptapEditorInstance: typeof editor }).tiptapEditorInstance === editor) {
        (window as Window & typeof globalThis & { tiptapEditorInstance: typeof editor }).tiptapEditorInstance = null;
      }
    };
  }, [editor]);

  // 不需要全局折叠状态

  // 当content prop变化时更新编辑器内容
  useEffect(() => {
    if (editor) {
      const currentContent = editor.getHTML();
      // 只有当 content 非空且和当前内容不一致时才 setContent
      if (content && currentContent !== content) {
        editor.commands.setContent(content, false);
      }
    }
  }, [content, editor])

  // 确保编辑器在组件挂载后能够正确响应焦点
  useEffect(() => {
    if (editor) {
      // 设置编辑器为可编辑状态
      editor.setEditable(true)
    }
  }, [editor])

  // 当编辑器准备就绪后，添加标题折叠功能
  useEffect(() => {
    if (!editor) return;
    
    // 获取编辑器DOM元素
    const getEditorDOM = (): HTMLElement | null => {
      return document.querySelector('.ProseMirror') as HTMLElement;
    };
    
    // 获取标题下应该被隐藏/显示的元素
    const getElementsInFoldedSection = (heading: HTMLElement, headingLevel: number): HTMLElement[] => {
      const result: HTMLElement[] = [];
      
      // 获取标题元素之后的所有兄弟元素
      let currentNode = heading.nextElementSibling;
      let foundHigherLevelHeading = false;
      
      // 如果找不到下一个元素，则没有什么可折叠的
      if (!currentNode) {
        return result;
      }
      
      try {
        // 遍历直到找到相同或更高级别的标题
        while (currentNode && !foundHigherLevelHeading) {
          // 检查是否是标题元素
          if (currentNode.tagName.match(/^H[1-6]$/)) {
            // 获取当前标题的级别
            const currentLevel = parseInt(currentNode.tagName.substring(1), 10);
            
            // 如果找到了相同或更高级别的标题，则停止遍历
            if (currentLevel <= headingLevel) {
              foundHigherLevelHeading = true;
              break;
            }
            
            // 将子标题也加入需要折叠的元素列表
            if (currentNode instanceof HTMLElement) {
              result.push(currentNode);
            }
          } else if (
            currentNode instanceof HTMLElement && 
            !currentNode.classList.contains('ProseMirror-menubar') &&
            !currentNode.classList.contains('editor-toolbar') &&
            !currentNode.classList.contains('tiptap-toolbar') &&
            !currentNode.hasAttribute('data-no-fold')
          ) {
            // 添加到结果中
            result.push(currentNode as HTMLElement);
          }
          
          // 移动到下一个兄弟元素
          currentNode = currentNode.nextElementSibling;
        }
      } catch (error) {
        console.error("在计算折叠范围时出错:", error);
      }
      
      return result;
    };
    
    // 处理标题点击折叠事件
const handleFoldingClick = (event: MouseEvent) => {
  // 检查点击的目标元素
  const target = event.target as HTMLElement;

  // 检查是否点击了标题元素
  if (target.tagName.match(/^H[1-6]$/)) {
    // 获取点击位置相对于标题元素的坐标
    const rect = target.getBoundingClientRect();
    const relativeX = event.clientX - rect.left;
    
    // 只有当点击位置在标题左侧区域（小三角图标位置）时才触发折叠
    // 小三角图标位于标题左侧25px处，宽度约20px
    if (relativeX < -5 && relativeX > -30) {
      // 阻止事件冒泡和默认行为
      event.preventDefault();
      event.stopPropagation();
      event.stopImmediatePropagation(); // 阻止所有后续监听器
      
      // 临时禁用编辑器
      if (editor && editor.isEditable) {
        editor.setEditable(false);
      }

      try {
        // 检查标题是否已折叠
        const isFolded = target.getAttribute('data-folded') === 'true';
        
        // 获取标题的级别（1-6）
        const headingLevel = parseInt(target.tagName.substring(1), 10);
        
        // 更新折叠状态
        if (isFolded) {
          // 取消折叠 - 移除属性
          target.removeAttribute('data-folded');
          
          // 获取之前被隐藏的元素
          const elementsToShow = getElementsInFoldedSection(target, headingLevel);
          
          // 逐个移除隐藏类和属性
          elementsToShow.forEach(el => {
            el.classList.remove('hidden-by-fold');
            // 移除 hiddenByFold 属性
            el.removeAttribute('data-hidden-by-fold');
          });
        } else {
          // 执行折叠 - 添加属性
          target.setAttribute('data-folded', 'true');
          
          // 获取需要隐藏的所有元素
          const elementsToHide = getElementsInFoldedSection(target, headingLevel);
          
          // 逐个添加隐藏类和属性
          elementsToHide.forEach(el => {
            el.classList.add('hidden-by-fold');
            // 增加 hiddenByFold 属性，以便 Tiptap 可以识别和保存
            el.setAttribute('data-hidden-by-fold', 'true');
          });
        }
        
        // 不自动保存，仅恢复编辑器状态
        setTimeout(() => {
          // 恢复编辑器状态
          if (editor) {
            editor.setEditable(true);
          }
        }, 50); // 50ms的延迟，避免渲染冲突
      } catch (error) {
        console.error("折叠标题时出错:", error);
        
        // 确保编辑器状态被恢复
        if (editor) {
          editor.setEditable(true);
        }
      }
      
      // 返回false进一步阻止事件传播
      return false;
    }
  }
};

    // 设置折叠功能
    const setupFoldingFeature = () => {
      const editorDOM = getEditorDOM();
      if (!editorDOM) {
        console.error("折叠功能: 找不到编辑器DOM");
        return null;
      }
      
      // 清除任何已有的点击处理器
      editorDOM.removeEventListener('click', handleFoldingClick);
      
      // 添加点击事件处理器
      editorDOM.addEventListener('click', handleFoldingClick);
      
      // 清理函数
      return () => {
        editorDOM.removeEventListener('click', handleFoldingClick);
      };
    };
    
    // 初始化折叠功能
    const cleanup = setupFoldingFeature();
    
    return () => {
      if (cleanup) cleanup();
    };
  }, [editor, debouncedOnChange]);

  return (
    <div className={`flex flex-col h-full bg-gray-100 dark:bg-gray-800 ${className}`}>
      {/* 工具栏 */}
      {showToolbar && editor && <EditorToolbar editor={editor} />}
      
      {/* 编辑器内容区域 */}
      <div className="flex-1 overflow-auto">
        {/* @ts-expect-error - EditorContent 的类型定义有问题，但组件实际工作正常 */}
        {editor && <EditorContent editor={editor} className="h-full" />}
      </div>
    </div>
  )
}

export default TiptapEditor 