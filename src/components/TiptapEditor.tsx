import React, { useEffect, useRef } from 'react'
import { useEditor, EditorContent } from '@tiptap/react'
import StarterKit from '@tiptap/starter-kit'
import Underline from '@tiptap/extension-underline'
import Link from '@tiptap/extension-link'
import Image from '@tiptap/extension-image'
import TextAlign from '@tiptap/extension-text-align'
import Placeholder from '@tiptap/extension-placeholder'
import CodeBlockLowlight from '@tiptap/extension-code-block-lowlight'
import { lowlight } from 'lowlight'
import EditorToolbar from './EditorToolbar'
import '../styles/editor.css'
import '../styles/codeBlock.css' // 导入代码块样式
import { genHeadingId } from './Editor' // 导入统一的ID生成函数
import { Editor, Extension } from '@tiptap/core'
import { Plugin, PluginKey } from 'prosemirror-state'
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
import java from 'highlight.js/lib/languages/java'
import cpp from 'highlight.js/lib/languages/cpp'
import csharp from 'highlight.js/lib/languages/csharp'
import php from 'highlight.js/lib/languages/php'
import go from 'highlight.js/lib/languages/go'
import rust from 'highlight.js/lib/languages/rust'
import swift from 'highlight.js/lib/languages/swift'
import kotlin from 'highlight.js/lib/languages/kotlin'
import ruby from 'highlight.js/lib/languages/ruby'
import css from 'highlight.js/lib/languages/css'
import html from 'highlight.js/lib/languages/xml'
import sql from 'highlight.js/lib/languages/sql'
import json from 'highlight.js/lib/languages/json'
import yaml from 'highlight.js/lib/languages/yaml'
import xml from 'highlight.js/lib/languages/xml'
import markdown from 'highlight.js/lib/languages/markdown'
import bash from 'highlight.js/lib/languages/bash'
import powershell from 'highlight.js/lib/languages/powershell'

// 注册语言支持
lowlight.registerLanguage('javascript', javascript)
lowlight.registerLanguage('typescript', typescript)
lowlight.registerLanguage('python', python)
lowlight.registerLanguage('java', java)
lowlight.registerLanguage('cpp', cpp)
lowlight.registerLanguage('csharp', csharp)
lowlight.registerLanguage('php', php)
lowlight.registerLanguage('go', go)
lowlight.registerLanguage('rust', rust)
lowlight.registerLanguage('swift', swift)
lowlight.registerLanguage('kotlin', kotlin)
lowlight.registerLanguage('ruby', ruby)
lowlight.registerLanguage('css', css)
lowlight.registerLanguage('html', html)
lowlight.registerLanguage('sql', sql)
lowlight.registerLanguage('json', json)
lowlight.registerLanguage('yaml', yaml)
lowlight.registerLanguage('xml', xml)
lowlight.registerLanguage('markdown', markdown)
lowlight.registerLanguage('bash', bash)
lowlight.registerLanguage('powershell', powershell)

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
 * 增强代码块扩展
 * 扩展CodeBlockLowlight，添加行号显示、复制按钮和高度调整功能
 */
const EnhancedCodeBlock = CodeBlockLowlight.extend({
  addAttributes() {
    return {
      ...this.parent?.(),
      height: {
        default: null,
        parseHTML: element => {
          const height = element.getAttribute('data-height');
          return height ? parseInt(height, 10) : null;
        },
        renderHTML: attributes => {
          return attributes.height ? { 'data-height': attributes.height.toString() } : {};
        }
      }
    };
  },

  addCommands() {
    return {
      setCodeBlock: attributes => ({ commands }) => {
        return commands.setNode(this.name, attributes);
      },
      
      insertCodeBlock: attributes => ({ chain, state }) => {
        const { selection } = state;
        const { $from } = selection;
        
        // 检查光标前后是否已经有空行
        const hasEmptyLineBefore = $from.parent.type.name === 'paragraph' && !$from.parent.textContent.trim();
        
        return chain()
          // 如果前面没有空行，先插入一个空行
          .command(({ tr, dispatch }) => {
            if (!hasEmptyLineBefore && dispatch) {
              // 在当前位置前插入空行
              tr.insert($from.before(), state.schema.nodes.paragraph.create());
              dispatch(tr);
            }
            return true;
          })
          // 创建代码块
          .setNode(this.name, attributes)
          // 在代码块后插入空行
          .command(({ tr, dispatch }) => {
            if (dispatch) {
              const pos = tr.selection.$to.after();
              tr.insert(pos, state.schema.nodes.paragraph.create());
              dispatch(tr);
            }
            return true;
          })
          .run();
      },
    };
  },

  addKeyboardShortcuts() {
    return {
      // 处理回车键
      Enter: ({ editor }) => {
        const { state } = editor;
        const { selection } = state;
        const { $from } = selection;
        
        // 确保我们在代码块内
        if ($from.parent.type.name !== 'codeBlock') {
          return false;
        }

        // 获取当前位置的文本内容
        const currentNodeText = $from.parent.textContent;
        const currentLine = currentNodeText.split('\n').find((_, i) => 
          i === currentNodeText.split('\n').findIndex((_, index) => 
            index === Math.floor($from.parentOffset / ($from.parent.textContent.length / currentNodeText.split('\n').length))
          )
        ) || '';

        // 检查是否在代码块末尾
        const isAtEnd = $from.pos >= $from.end() - 1;
        
        // 检查当前行和上一行是否为空
        const lines = currentNodeText.split('\n');
        const currentLineIndex = lines.findIndex((_, i) => lines.slice(0, i + 1).join('\n').length >= $from.parentOffset);
        const currentLineEmpty = !currentLine.trim();
        const prevLineEmpty = currentLineIndex > 0 && !lines[currentLineIndex - 1].trim();

        // 在以下情况退出代码块：
        // 1. 在代码块末尾
        // 2. 当前行为空
        // 3. 上一行也为空
        if (isAtEnd && currentLineEmpty && prevLineEmpty) {
          return editor
            .chain()
            .command(({ tr }) => {
              // 删除多余的空行
              tr.delete($from.pos - 1, $from.pos);
              return true;
            })
            .exitCode()
            .run();
        }

        // 否则插入换行
        return editor.commands.insertContent('\n');
      },

      // Shift+Enter: 强制退出代码块
      'Shift-Enter': ({ editor }) => {
        const { state } = editor;
        const { selection } = state;
        const { $from } = selection;

        if ($from.parent.type.name === 'codeBlock') {
          return editor
            .chain()
            .insertContent('\n')
            .exitCode()
            .run();
        }
        return false;
      },

      // Tab: 在代码块内插入空格
      Tab: ({ editor }) => {
        const { state } = editor;
        const { selection } = state;
        const { $from } = selection;

        if ($from.parent.type.name === 'codeBlock') {
          // 插入两个空格作为缩进
          return editor.commands.insertContent('  ');
        }
        return false;
      },

      // 处理向上箭头
      ArrowUp: ({ editor }) => {
        const { state } = editor;
        const { selection } = state;
        const { $from } = selection;
        
        if ($from.parent.type.name === 'codeBlock') {
          // 检查是否在第一行的开始位置
          const currentNodeText = $from.parent.textContent;
          const lines = currentNodeText.split('\n');
          const currentLineIndex = lines.findIndex((_, i) => 
            lines.slice(0, i + 1).join('\n').length >= $from.parentOffset
          );
          
          if (currentLineIndex === 0 && $from.parentOffset === 0) {
            // 移动到代码块上方
            return editor
              .chain()
              .setTextSelection($from.before())
              .run();
          }
        }
        return false;
      },

      // 处理向下箭头
      ArrowDown: ({ editor }) => {
        const { state } = editor;
        const { selection } = state;
        const { $from } = selection;
        
        if ($from.parent.type.name === 'codeBlock') {
          // 检查是否在最后一行的末尾
          const currentNodeText = $from.parent.textContent;
          const lines = currentNodeText.split('\n');
          const isLastLine = $from.parentOffset >= currentNodeText.length - 1;
          
          if (isLastLine) {
            // 移动到代码块下方
            return editor
              .chain()
              .setTextSelection($from.after())
              .run();
          }
        }
        return false;
      },
    };
  },

  // 添加DOM事件处理器
  addNodeView() {
    return ({ node, editor, getPos }) => {
      console.log('Creating code block node view');
      
      const container = document.createElement('div');
      container.classList.add('code-block-wrapper');

      // 创建代码块头部
      const header = document.createElement('div');
      header.classList.add('code-block-header');
      
      // 添加语言标识
      const language = document.createElement('span');
      language.classList.add('code-block-language');
      language.textContent = node.attrs.language || 'text';
      header.appendChild(language);

      // 添加复制按钮
      const copyButton = document.createElement('button');
      copyButton.classList.add('code-block-copy-button');
      copyButton.innerHTML = `
        <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
          <rect x="9" y="9" width="13" height="13" rx="2" ry="2"></rect>
          <path d="M5 15H4a2 2 0 0 1-2-2V4a2 2 0 0 1 2-2h9a2 2 0 0 1 2 2v1"></path>
        </svg>
        <span>复制</span>
      `;
      copyButton.onclick = () => {
        navigator.clipboard.writeText(node.textContent);
        
        // 添加复制成功的视觉反馈
        const originalText = copyButton.innerHTML;
        copyButton.innerHTML = `
          <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
            <path d="M20 6L9 17l-5-5"></path>
          </svg>
          <span>已复制</span>
        `;
        copyButton.classList.add('text-green-500');
        
        setTimeout(() => {
          copyButton.innerHTML = originalText;
          copyButton.classList.remove('text-green-500');
        }, 2000);
      };
      header.appendChild(copyButton);
      
      container.appendChild(header);

      // 创建代码块主体
      const body = document.createElement('div');
      body.classList.add('code-block-body');
      
      // 创建代码内容区域
      const content = document.createElement('div');
      content.classList.add('code-block-content');
      
      // 创建行号容器
      const lineNumbers = document.createElement('div');
      lineNumbers.classList.add('code-block-line-numbers');
      
      // 创建pre和code元素
      const pre = document.createElement('pre');
      const code = document.createElement('code');
      pre.appendChild(code);
      pre.classList.add('code-content');

      // 节流函数
      const throttle = (func: Function, limit: number) => {
        let inThrottle: boolean;
        let lastResult: any;
        return function (this: any, ...args: any[]) {
          if (!inThrottle) {
            inThrottle = true;
            lastResult = func.apply(this, args);
            setTimeout(() => (inThrottle = false), limit);
          }
          return lastResult;
        };
      };
      
      // 更新行号的函数
      const updateLineNumbers = () => {
        console.group('代码块内容更新');
        
        // 获取原始文本内容，保留换行符
        const rawText = code.innerText || '';
        console.log('1. 获取代码内容:', rawText);
        
        // 分割成行并过滤掉末尾的空行
        const lines = rawText.split('\n');
        let totalLines = lines.length;
        
        // 如果最后一行是空行且不是唯一的一行，则不计入
        if (totalLines > 1 && !lines[totalLines - 1].trim()) {
          totalLines--;
        }
        
        // 确保至少有一行
        const lineCount = Math.max(1, totalLines);
        
        // 如果行数没有变化，不更新
        if (lineCount === lineNumbers.children.length) {
          console.log('行数未变化，跳过更新');
          console.groupEnd();
          return;
        }
        
        console.log('行数发生变化，开始更新行号');
        console.log('- 当前行号数量:', lineNumbers.children.length);
        console.log('- 新的行数:', lineCount);
        
        // 清空现有行号
        while (lineNumbers.firstChild) {
          lineNumbers.removeChild(lineNumbers.firstChild);
        }
        
        // 创建新的行号
        const fragment = document.createDocumentFragment();
        for (let i = 0; i < lineCount; i++) {
          const lineNumber = document.createElement('div');
          lineNumber.textContent = `${i + 1}`;
          lineNumber.className = 'line-number';
          fragment.appendChild(lineNumber);
        }
        lineNumbers.appendChild(fragment);
        
        console.log('行号更新完成');
        console.groupEnd();
      };

      // 创建节流版本的更新函数
      const throttledUpdate = throttle((reason?: string) => {
        console.log('触发更新，原因:', reason || '未指定');
        updateLineNumbers();
      }, 200);

      if (node.attrs.height) {
        pre.style.maxHeight = `${node.attrs.height}px`;
        lineNumbers.style.maxHeight = `${node.attrs.height}px`;
      }
      
      content.appendChild(lineNumbers);
      content.appendChild(pre);
      body.appendChild(content);
      
      // 添加调整大小手柄
      const resizeHandle = document.createElement('div');
      resizeHandle.classList.add('resize-handle');
      resizeHandle.title = '调整高度';
      
      let startY = 0;
      let startHeight = 0;
      
      const onMouseDown = (e: MouseEvent) => {
        startY = e.clientY;
        startHeight = node.attrs.height || pre.clientHeight;
        
        document.addEventListener('mousemove', onMouseMove);
        document.addEventListener('mouseup', onMouseUp);
        e.preventDefault();
      };
      
      const onMouseMove = (e: MouseEvent) => {
        const newHeight = startHeight + (e.clientY - startY);
        if (newHeight > 50) {
          pre.style.maxHeight = `${newHeight}px`;
          lineNumbers.style.maxHeight = `${newHeight}px`;
        }
      };
      
      const onMouseUp = () => {
        document.removeEventListener('mousemove', onMouseMove);
        document.removeEventListener('mouseup', onMouseUp);
        
        if (typeof getPos === 'function') {
          const height = parseInt(pre.style.maxHeight, 10);
          editor.chain().focus().updateAttributes('codeBlock', {
            height: height,
          }).run();
        }
      };
      
      resizeHandle.addEventListener('mousedown', onMouseDown);
      body.appendChild(resizeHandle);
      
      container.appendChild(body);

      // 添加 MutationObserver 监听代码变化
      const observer = new MutationObserver((mutations) => {
        console.log('检测到代码变化:', mutations.map(m => ({
          type: m.type,
          target: m.target.nodeName,
          addedNodes: m.addedNodes.length,
          removedNodes: m.removedNodes.length
        })));
        requestAnimationFrame(() => throttledUpdate('MutationObserver触发'));
      });

      // 配置 observer
      observer.observe(code, {
        childList: true,    // 监听子节点的增删
        subtree: true,      // 监听所有后代节点
        characterData: true // 监听文本内容的变化
      });

      // 初始化行号
      throttledUpdate("初始化行号");

      return {
        dom: container,
        contentDOM: code,
        update: (updatedNode) => {
          if (updatedNode.type.name !== 'codeBlock') {
            return false;
          }
          
          console.log('代码块节点更新:', {
            language: updatedNode.attrs.language,
            height: updatedNode.attrs.height
          });
          
          // 更新语言标识
          language.textContent = updatedNode.attrs.language || 'text';
          
          // 更新高度
          if (updatedNode.attrs.height) {
            pre.style.maxHeight = `${updatedNode.attrs.height}px`;
            lineNumbers.style.maxHeight = `${updatedNode.attrs.height}px`;
          }
          
          // 更新行号
          throttledUpdate('节点更新触发');
          
          return true;
        },
        destroy: () => {
          observer.disconnect();
          resizeHandle.removeEventListener('mousedown', onMouseDown);
        }
      };
    };
  }
});

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
      // 使用增强型代码块扩展
      EnhancedCodeBlock.configure({
        lowlight,
        HTMLAttributes: {
          class: 'enhanced-code-block',
        },
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