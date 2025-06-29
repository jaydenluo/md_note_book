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
import { Editor, Extension } from '@tiptap/core'
import { Plugin, PluginKey } from '@tiptap/pm/state'
// 自定义类型声明
interface WindowWithEditor extends Window {
  tiptapEditorInstance?: Editor;
}

// 安全地访问window
function getGlobalEditor(): Editor | undefined {
  return (window as unknown as WindowWithEditor).tiptapEditorInstance;
}

function setGlobalEditor(editor: Editor | undefined): void {
  (window as unknown as WindowWithEditor).tiptapEditorInstance = editor;
}

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
  content: string;
  onChange?: (html: string) => void;
  className?: string;
  placeholder?: string;
  showToolbar?: boolean;
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
 * 处理标题折叠点击事件
 */
function handleFoldingClick(event: MouseEvent, editor?: Editor) {
  if (!editor) return;
  
  const target = event.target as HTMLElement;
  const headingElement = target.closest('h1, h2, h3, h4, h5, h6');
  
  if (headingElement) {
    const headingRect = headingElement.getBoundingClientRect();
    const clickX = event.clientX;
    
    if (clickX < headingRect.left - 5) {
      // 暂时禁用编辑器编辑功能
      editor.setEditable(false);
      
      try {
        // 直接获取并修改DOM元素的属性
        const isFolded = headingElement.getAttribute('data-folded') === 'true';
        
        // 修改标题折叠状态
        if (isFolded) {
          headingElement.removeAttribute('data-folded');
        } else {
          headingElement.setAttribute('data-folded', 'true');
        }
        
        // 处理折叠内容
        const headingLevel = parseInt(headingElement.tagName.substring(1));
        let currentElement = headingElement.nextElementSibling;
        
        // 遍历处理所有需要隐藏/显示的元素
        while (currentElement) {
          const isHeading = /^H[1-6]$/.test(currentElement.tagName);
          const elementLevel = isHeading ? parseInt(currentElement.tagName.substring(1)) : 0;
          
          // 遇到同级或更高级别的标题，停止处理
          if (isHeading && elementLevel <= headingLevel) {
            break;
          }
          
          // 根据折叠状态添加或移除属性
          if (!isFolded) {
            currentElement.setAttribute('data-hidden-by-fold', 'true');
          } else {
            currentElement.removeAttribute('data-hidden-by-fold');
          }
          
          currentElement = currentElement.nextElementSibling;
        }
        
        // 手动触发编辑器内容更新
        setTimeout(() => {
          // 获取当前编辑器实例的根元素内容
          const editorContent = editor.view.dom.innerHTML;
          
          // 使用setContent方法更新编辑器内容，保留历史记录
          editor.commands.setContent(editorContent, false, {
            preserveWhitespace: 'full',
          });
          
          // 恢复编辑器可编辑状态
          editor.setEditable(true);
        }, 50);
      } catch (error) {
        console.error('折叠操作出错:', error);
        editor.setEditable(true);
      }
      
      event.preventDefault();
      event.stopPropagation();
    }
  }
}

/**
 * 添加折叠扩展
 */
function createHeadingFoldingExtension() {
  return Extension.create({
    name: 'headingFolding',
    
    // 注册事件监听
    addProseMirrorPlugins() {
      return [
        new Plugin({
          key: new PluginKey('heading-folding'),
          props: {
            handleClick(view, pos, event) {
              // 获取编辑器实例
              const domEvent = event as MouseEvent;
              const editorInstance = getGlobalEditor();
              if (editorInstance) {
                handleFoldingClick(domEvent, editorInstance);
              }
              return false;
            },
          },
        })
      ];
    },
    
    // 添加全局HTML属性
    addGlobalAttributes() {
      return [
        {
          types: ['heading'],
          attributes: {
            'data-folded': {
              default: null,
              parseHTML: element => element.getAttribute('data-folded'),
              renderHTML: attributes => {
                if (!attributes['data-folded']) return {};
                return { 'data-folded': attributes['data-folded'] };
              }
            }
          }
        },
        {
          types: ['paragraph', 'heading', 'bulletList', 'orderedList', 'listItem', 'blockquote', 'codeBlock'],
          attributes: {
            'data-hidden-by-fold': {
              default: null,
              parseHTML: element => element.getAttribute('data-hidden-by-fold'),
              renderHTML: attributes => {
                if (!attributes['data-hidden-by-fold']) return {};
                return { 'data-hidden-by-fold': attributes['data-hidden-by-fold'] };
              }
            }
          }
        }
      ];
    }
  });
}

/**
 * Tiptap富文本编辑器组件
 * 提供基础的Markdown编辑功能和格式工具栏，采用简洁朴素的设计
 */
const TiptapEditor = ({
  content,
  onChange,
  className = '',
  placeholder = '开始编写笔记...',
  showToolbar = true // 默认显示工具栏
}: TiptapEditorProps): React.ReactElement => {
  const isFirstRender = useRef(true);

  // 创建编辑器实例
  const editor = useEditor({
    extensions: [
      StarterKit.configure({
        // 启用默认的标题，不再使用自定义版本
        heading: {
          // 配置默认heading扩展
          levels: [1, 2, 3, 4, 5, 6],
          HTMLAttributes: {
            class: 'relative',
          },
        },
        // 禁用默认的代码块，使用我们的自定义版本
        codeBlock: false,
        bulletList: {
          keepMarks: true,
          keepAttributes: true
        },
        orderedList: {
          keepMarks: true,
          keepAttributes: true
        }
      }),
      Underline,
      Link.configure({
        openOnClick: false,
        HTMLAttributes: {
          class: 'text-blue-500 underline cursor-pointer hover:text-blue-700 transition-colors',
        },
      }),
      Placeholder.configure({
        placeholder,
      }),
      CodeBlockLowlight.configure({
        lowlight,
        languageClassPrefix: 'language-',
      }),
      // 添加折叠扩展
      createHeadingFoldingExtension(),
    ],
    content: content || '',
    onUpdate: ({ editor }) => {
      if (isFirstRender.current) {
        isFirstRender.current = false;
        return;
      }
      const html = editor.getHTML();
      onChange?.(html);
    },
    // 启用所有编辑器功能
    enableCoreExtensions: true
  })

  // 当content prop变化时更新编辑器内容
  useEffect(() => {
    if (editor && content !== undefined && editor.getHTML() !== content) {
      editor.commands.setContent(content, false);
    }
  }, [content, editor])

  // 保存编辑器实例到window对象供折叠功能使用
  useEffect(() => {
    if (editor) {
      setGlobalEditor(editor);
    }
    
    return () => {
      if (getGlobalEditor() === editor) {
        setGlobalEditor(undefined);
      }
    };
  }, [editor]);

  return (
    <div className={`tiptap-editor-container w-full ${className}`}>
      {showToolbar && editor && <EditorToolbar editor={editor} />}
      <EditorContent editor={editor} className="tiptap-editor" />
    </div>
  )
}

export default TiptapEditor 