import React, { useEffect, useRef } from 'react'
import { useEditor, EditorContent } from '@tiptap/react'
import StarterKit from '@tiptap/starter-kit'
import Underline from '@tiptap/extension-underline'
import Link from '@tiptap/extension-link'
import TextAlign from '@tiptap/extension-text-align'
import Placeholder from '@tiptap/extension-placeholder'
// import Image from '@tiptap/extension-image' // 移除原始图片扩展
import CodeBlockLowlight from '@tiptap/extension-code-block-lowlight'
import { lowlight } from 'lowlight'
import EditorToolbar from './EditorToolbar'
import '@/styles/editor.css'
import '@/styles/table.css'
import '@/styles/codeBlock.css' // 导入代码块样式
import '../styles/image.css' // 导入图片样式
import '../styles/table.css'
import { genHeadingId } from './Editor' // 导入统一的ID生成函数
import { Editor, Extension } from '@tiptap/core'
import { Plugin, PluginKey } from 'prosemirror-state'
import { useAlertDialog } from './ui/alert-dialog'
import { useConfig } from '../stores/configStore'
import { EnhancedImage } from '../lib/extensions/EnhancedImage' // 导入增强图片扩展
import { CustomTable, CustomTableCell, TableRow, TableHeader } from '../lib/extensions/table'
import { TableBubbleMenu } from './ui/table-bubble-menu'
// 自定义类型声明
interface WindowWithEditor extends Window {
  tiptapEditorInstance?: Editor;
  isResizingCodeBlock?: boolean; // 添加全局拖动状态标志
  isFoldingOperation?: boolean; // 添加全局折叠操作状态标志
  showConfirmDialog?: (options: { title: string; description?: string; variant?: "default" | "destructive"; onConfirm: () => void }) => Promise<boolean>;
  enterKeyTimes?: number[]; // 添加回车键时间记录
  codeBlockUpdateFunctions?: Map<string, () => void>; // 添加代码块更新函数映射
}

// 通用函数：滚动到代码块内的光标位置
function scrollToCursorInCodeBlock(editor: Editor) {
  const { state } = editor;
  const { selection } = state;
  const { $from } = selection;
  
  // 确保光标在代码块内
  if ($from.parent.type.name === 'codeBlock') {
    // 获取代码块元素
    const codeBlockElement = editor.view.nodeDOM($from.before()) as HTMLElement;
    if (codeBlockElement) {
      const preElement = codeBlockElement.querySelector('.code-content') as HTMLElement;
      if (preElement) {
        // 滚动到光标位置
        const selection = window.getSelection();
        if (selection && selection.rangeCount > 0) {
          const range = selection.getRangeAt(0);
          range.collapse(true);
          
          // 计算光标位置并滚动
          const rect = range.getBoundingClientRect();
          const preRect = preElement.getBoundingClientRect();
          
          // 检查光标是否在可视区域内
          if (rect.bottom > preRect.bottom || rect.top < preRect.top) {
            // 光标不在可视区域内，需要滚动
            const scrollTop = preElement.scrollTop + (rect.top - preRect.top) - 20; // 留一些边距
            preElement.scrollTop = Math.max(0, scrollTop);
          }
        }
      }
    }
  }
}

// 通用函数：滚动到编辑器内的光标位置（用于退出代码块后）
function scrollToCursorInEditor(editor: Editor) {
  const selectionElement = window.getSelection();
  if (selectionElement && selectionElement.rangeCount > 0) {
    const range = selectionElement.getRangeAt(0);
    range.collapse(true);
    
    const rect = range.getBoundingClientRect();
    const editorElement = editor.view.dom as HTMLElement;
    const editorRect = editorElement.getBoundingClientRect();
    
    if (rect.bottom > editorRect.bottom || rect.top < editorRect.top) {
      // 光标不在可视区域内，需要滚动
      const scrollTop = editorElement.scrollTop + (rect.top - editorRect.top) - 20;
      editorElement.scrollTop = Math.max(0, scrollTop);
    }
  }
}

// 安全地访问window
function getGlobalEditor(): Editor | undefined {
  return (window as unknown as WindowWithEditor).tiptapEditorInstance;
}

function setGlobalEditor(editor: Editor | undefined): void {
  (window as unknown as WindowWithEditor).tiptapEditorInstance = editor;
}

// 设置全局拖动状态
function setGlobalResizing(isResizing: boolean): void {
  (window as unknown as WindowWithEditor).isResizingCodeBlock = isResizing;
}

// 获取全局拖动状态
function getGlobalResizing(): boolean {
  return !!(window as unknown as WindowWithEditor).isResizingCodeBlock;
}

// 设置全局折叠操作状态
function setGlobalFolding(isFolding: boolean): void {
  (window as unknown as WindowWithEditor).isFoldingOperation = isFolding;
}

// 获取全局折叠操作状态
function getGlobalFolding(): boolean {
  return !!(window as unknown as WindowWithEditor).isFoldingOperation;
}

// 设置全局确认对话框函数
function setGlobalConfirmDialog(showConfirm: (options: { title: string; description?: string; variant?: "default" | "destructive"; onConfirm: () => void }) => Promise<boolean>): void {
  (window as unknown as WindowWithEditor).showConfirmDialog = showConfirm;
}

// 获取全局确认对话框函数
function getGlobalConfirmDialog(): ((options: { title: string; description?: string; variant?: "default" | "destructive"; onConfirm: () => void }) => Promise<boolean>) | undefined {
  return (window as unknown as WindowWithEditor).showConfirmDialog;
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
import c from 'highlight.js/lib/languages/c'
import dart from 'highlight.js/lib/languages/dart'
import r from 'highlight.js/lib/languages/r'
import julia from 'highlight.js/lib/languages/julia'
import matlab from 'highlight.js/lib/languages/matlab'
import perl from 'highlight.js/lib/languages/perl'
import lua from 'highlight.js/lib/languages/lua'
import assembly from 'highlight.js/lib/languages/x86asm'
import scss from 'highlight.js/lib/languages/scss'
import less from 'highlight.js/lib/languages/less'
import objectivec from 'highlight.js/lib/languages/objectivec'

// 注册语言支持
lowlight.registerLanguage('javascript', javascript)
lowlight.registerLanguage('js', javascript)
lowlight.registerLanguage('typescript', typescript)
lowlight.registerLanguage('ts', typescript)
lowlight.registerLanguage('python', python)
lowlight.registerLanguage('py', python)
lowlight.registerLanguage('java', java)
lowlight.registerLanguage('cpp', cpp)
lowlight.registerLanguage('c++', cpp)
lowlight.registerLanguage('c', c)
lowlight.registerLanguage('csharp', csharp)
lowlight.registerLanguage('cs', csharp)
lowlight.registerLanguage('php', php)
lowlight.registerLanguage('go', go)
lowlight.registerLanguage('rust', rust)
lowlight.registerLanguage('rs', rust)
lowlight.registerLanguage('swift', swift)
lowlight.registerLanguage('kotlin', kotlin)
lowlight.registerLanguage('kt', kotlin)
lowlight.registerLanguage('ruby', ruby)
lowlight.registerLanguage('rb', ruby)
lowlight.registerLanguage('css', css)
lowlight.registerLanguage('html', html)
lowlight.registerLanguage('xml', xml)
lowlight.registerLanguage('sql', sql)
lowlight.registerLanguage('json', json)
lowlight.registerLanguage('yaml', yaml)
lowlight.registerLanguage('yml', yaml)
lowlight.registerLanguage('markdown', markdown)
lowlight.registerLanguage('md', markdown)
lowlight.registerLanguage('bash', bash)
lowlight.registerLanguage('sh', bash)
lowlight.registerLanguage('shell', bash)
lowlight.registerLanguage('powershell', powershell)
lowlight.registerLanguage('ps1', powershell)
lowlight.registerLanguage('dart', dart)
lowlight.registerLanguage('r', r)
lowlight.registerLanguage('julia', julia)
lowlight.registerLanguage('matlab', matlab)
lowlight.registerLanguage('perl', perl)
lowlight.registerLanguage('pl', perl)
lowlight.registerLanguage('lua', lua)
lowlight.registerLanguage('assembly', assembly)
lowlight.registerLanguage('asm', assembly)
lowlight.registerLanguage('scss', scss)
lowlight.registerLanguage('less', less)
lowlight.registerLanguage('objectivec', objectivec)
lowlight.registerLanguage('objc', objectivec)

// 编辑器属性接口
interface TiptapEditorProps {
  content: string;
  onChange?: (html: string) => void;
  onStateChange?: (state: { isInCodeBlock: boolean }) => void;
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
      // 设置全局折叠操作状态为true
      setGlobalFolding(true);
      
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
          if (isFolded) {
            // 如果标题当前是折叠状态，展开时移除隐藏属性
            currentElement.removeAttribute('data-hidden-by-fold');
          } else {
            // 如果标题当前是展开状态，折叠时添加隐藏属性
            currentElement.setAttribute('data-hidden-by-fold', 'true');
          }
          
          currentElement = currentElement.nextElementSibling;
        }
        
        // 延迟恢复编辑器状态，确保属性能够持久化
        setTimeout(() => {
          // 设置全局折叠操作状态为false
          setGlobalFolding(false);
          
          // 恢复编辑器可编辑状态
          editor.setEditable(true);
        }, 100);
      } catch (error) {
        console.error('折叠操作出错:', error);
        setGlobalFolding(false);
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
          if (!attributes.height) return {};
          return { 'data-height': attributes.height.toString() };
        }
      }
    };
  },

  // 添加全局HTML属性处理
  addGlobalAttributes() {
    return [
      {
        types: ['codeBlock'],
        attributes: {
          'data-height': {
            default: null,
            parseHTML: element => {
              const height = element.getAttribute('data-height');
              return height ? parseInt(height, 10) : null;
            },
            renderHTML: attributes => {
              if (!attributes['data-height']) return {};
              return { 'data-height': attributes['data-height'].toString() };
            }
          }
        }
      }
    ];
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
      // 处理回车键 - 500ms内连续3次回车退出代码块
      Enter: ({ editor }) => {
        const { state } = editor;
        const { selection } = state;
        const { $from } = selection;
        
        // 确保我们在代码块内
        if ($from.parent.type.name !== 'codeBlock') {
          return false;
        }

        // 获取当前时间戳
        const now = Date.now();
        
        // 获取或创建回车时间记录
        const windowWithEditor = window as WindowWithEditor;
        if (!windowWithEditor.enterKeyTimes) {
          windowWithEditor.enterKeyTimes = [];
        }
        
        // 添加当前回车时间
        windowWithEditor.enterKeyTimes.push(now);
        
        // 只保留最近5次回车记录
        if (windowWithEditor.enterKeyTimes.length > 5) {
          windowWithEditor.enterKeyTimes = windowWithEditor.enterKeyTimes.slice(-5);
        }
        
        // 检查500ms内是否有3次回车
        const recentEnters = windowWithEditor.enterKeyTimes.filter(time => now - time <= 500);
        
        if (recentEnters.length >= 3) {
          // 清空回车记录
          windowWithEditor.enterKeyTimes = [];
          
          // 退出代码块
          return editor
            .chain()
            .command(({ tr }) => {
              // 删除多余的空行
              tr.delete($from.pos - 2, $from.pos);
              return true;
            })
            .exitCode()
            .run();
        }

        // 否则插入换行
        const result = editor.commands.insertContent('\n');
        
        // 滚动到光标位置
        setTimeout(() => {
          scrollToCursorInCodeBlock(editor);
        }, 0);
        
        return result;
      },

      // Shift+Enter: 强制退出代码块
      'Shift-Enter': ({ editor }) => {
        const { state } = editor;
        const { selection } = state;
        const { $from } = selection;

        if ($from.parent.type.name === 'codeBlock') {
          const result = editor
            .chain()
            .insertContent('\n')
            .exitCode()
            .run();
          
          // 在退出代码块后滚动到光标位置
          setTimeout(() => {
            scrollToCursorInEditor(editor);
          }, 0);
          
          return result;
        }
        return false;
      },

      // Tab: 在代码块内插入空格
      Tab: ({ editor }) => {
        const { state } = editor;
        const { selection } = state;
        const { $from } = selection;

        if ($from.parent.type.name === 'codeBlock') {
          const result = editor.commands.insertContent('  ');
          
          // 滚动到光标位置
          setTimeout(() => {
            scrollToCursorInCodeBlock(editor);
          }, 0);
          
          return result;
        }
        return false;
      },

      // Backspace: 删除字符时滚动
      Backspace: ({ editor }) => {
        const { state } = editor;
        const { selection } = state;
        const { $from } = selection;

        if ($from.parent.type.name === 'codeBlock') {
          const result = editor.commands.deleteSelection();
          
          // 滚动到光标位置
          setTimeout(() => {
            scrollToCursorInCodeBlock(editor);
          }, 0);
          
          return result;
        }
        return false;
      },

      // Delete: 删除字符时滚动
      Delete: ({ editor }) => {
        const { state } = editor;
        const { selection } = state;
        const { $from } = selection;

        if ($from.parent.type.name === 'codeBlock') {
          const result = editor.commands.deleteSelection();
          
          // 滚动到光标位置
          setTimeout(() => {
            scrollToCursorInCodeBlock(editor);
          }, 0);
          
          return result;
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
            const result = editor
              .chain()
              .setTextSelection($from.before())
              .run();
            
            // 滚动到光标位置
            setTimeout(() => {
              scrollToCursorInCodeBlock(editor);
            }, 0);
            
            return result;
          }
          
          // 普通向上移动时也滚动
          setTimeout(() => {
            scrollToCursorInCodeBlock(editor);
          }, 0);
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
          const isLastLine = $from.parentOffset >= currentNodeText.length - 1;
          
          if (isLastLine) {
            // 移动到代码块下方
            const result = editor
              .chain()
              .setTextSelection($from.after())
              .run();
            
            // 滚动到光标位置
            setTimeout(() => {
              scrollToCursorInCodeBlock(editor);
            }, 0);
            
            return result;
          }
          
          // 普通向下移动时也滚动
          setTimeout(() => {
            scrollToCursorInCodeBlock(editor);
          }, 0);
        }
        return false;
      },

      // 处理向左箭头
      ArrowLeft: ({ editor }) => {
        const { state } = editor;
        const { selection } = state;
        const { $from } = selection;
        
        if ($from.parent.type.name === 'codeBlock') {
          // 检查是否在行的开始位置
          const currentNodeText = $from.parent.textContent;
          const lines = currentNodeText.split('\n');
          const currentLineIndex = lines.findIndex((_, i) => 
            lines.slice(0, i + 1).join('\n').length >= $from.parentOffset
          );
          
          if (currentLineIndex === 0 && $from.parentOffset === 0) {
            // 移动到代码块上方
            const result = editor
              .chain()
              .setTextSelection($from.before())
              .run();
            
            // 滚动到光标位置
            setTimeout(() => {
              scrollToCursorInCodeBlock(editor);
            }, 0);
            
            return result;
          }
          
          // 普通向左移动时也滚动
          setTimeout(() => {
            scrollToCursorInCodeBlock(editor);
          }, 0);
        }
        return false;
      },

      // 处理向右箭头
      ArrowRight: ({ editor }) => {
        const { state } = editor;
        const { selection } = state;
        const { $from } = selection;
        
        if ($from.parent.type.name === 'codeBlock') {
          // 检查是否在行的末尾
          const currentNodeText = $from.parent.textContent;
          const lines = currentNodeText.split('\n');
          const currentLineIndex = lines.findIndex((_, i) => 
            lines.slice(0, i + 1).join('\n').length >= $from.parentOffset
          );
          
          const isAtLineEnd = $from.parentOffset >= currentNodeText.split('\n').slice(0, currentLineIndex + 1).join('\n').length;
          
          if (isAtLineEnd && currentLineIndex === lines.length - 1) {
            // 移动到代码块下方
            const result = editor
              .chain()
              .setTextSelection($from.after())
              .run();
            
            // 滚动到光标位置
            setTimeout(() => {
              scrollToCursorInCodeBlock(editor);
            }, 0);
            
            return result;
          }
          
          // 普通向右移动时也滚动
          setTimeout(() => {
            scrollToCursorInCodeBlock(editor);
          }, 0);
        }
        return false;
      },
    };
  },

  // 添加DOM事件处理器
  addNodeView() {
    return ({ node, editor, getPos }) => {
      const container = document.createElement('div');
      container.classList.add('code-block-wrapper');
      
      // 添加唯一ID
      const blockId = `code-block-${Date.now()}-${Math.floor(Math.random() * 1000)}`;
      container.dataset.blockId = blockId;
      
      // 如果有设置高度，添加CSS变量
      if (node.attrs.height) {
        container.style.setProperty('--code-block-height', `${node.attrs.height}px`);
      }

      // 创建代码块头部
      const header = document.createElement('div');
      header.classList.add('code-block-header');
      
      // 添加语言标识
      const language = document.createElement('span');
      language.classList.add('code-block-language');
      language.textContent = node.attrs.language || 'text';
      header.appendChild(language);

      // 创建按钮容器，放在最右边
      const buttonContainer = document.createElement('div');
      buttonContainer.classList.add('code-block-actions');

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
      buttonContainer.appendChild(copyButton);

      // 添加删除按钮
      const deleteButton = document.createElement('button');
      deleteButton.classList.add('code-block-delete-button');
      deleteButton.innerHTML = `
        <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
          <polyline points="3,6 5,6 21,6"></polyline>
          <path d="M19,6v14a2,2 0 0,1 -2,2H7a2,2 0 0,1 -2,-2V6m3,0V4a2,2 0 0,1 2,-2h4a2,2 0 0,1 2,2v2"></path>
          <line x1="10" y1="11" x2="10" y2="17"></line>
          <line x1="14" y1="11" x2="14" y2="17"></line>
        </svg>
        <span>删除</span>
      `;
      deleteButton.onclick = async () => {
        // 获取全局确认对话框函数
        const showConfirm = getGlobalConfirmDialog();
        
        if (showConfirm) {
          // 使用UI确认对话框
          await showConfirm({
            title: '删除代码块',
            description: '确定要删除这个代码块吗？此操作无法撤销。',
            variant: 'destructive',
            onConfirm: () => {
              // 删除代码块
              if (typeof getPos === 'function') {
                const pos = getPos();
                if (pos >= 0) {
                  const tr = editor.state.tr.delete(pos, pos + node.nodeSize);
                  editor.view.dispatch(tr);
                }
              }
            }
          });
          
          // 如果用户确认了删除，onConfirm回调会被自动调用
        } else {
          // 降级到原生confirm
          if (confirm('确定要删除这个代码块吗？')) {
            // 删除代码块
            if (typeof getPos === 'function') {
              const pos = getPos();
              if (pos >= 0) {
                const tr = editor.state.tr.delete(pos, pos + node.nodeSize);
                editor.view.dispatch(tr);
              }
            }
          }
        }
      };
      buttonContainer.appendChild(deleteButton);

      // 将按钮容器添加到头部
      header.appendChild(buttonContainer);
      
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
      const throttle = (func: () => void, limit: number) => {
        let inThrottle: boolean;
        return function () {
          if (!inThrottle) {
            inThrottle = true;
            func();
            setTimeout(() => (inThrottle = false), limit);
          }
        };
      };
      
      // 添加行号与代码内容同步滚动
      const syncScroll = () => {
        // 同步垂直滚动位置
        lineNumbers.scrollTop = pre.scrollTop;
      };
      
      // 使用防抖版本的同步滚动，提高性能
      const debouncedSyncScroll = (() => {
        let timer: number | null = null;
        return () => {
          if (timer) {
            cancelAnimationFrame(timer);
          }
          timer = requestAnimationFrame(() => {
            lineNumbers.scrollTop = pre.scrollTop;
            timer = null;
          });
        };
      })();
      
      // 更新行号的函数
      const updateLineNumbers = () => {
        // 获取原始文本内容，尝试多种方式
        let rawText = '';
        
        // 方法1: 直接从code元素获取文本
        if (code.textContent) {
          rawText = code.textContent;
        }
        // 方法2: 从node获取文本
        else if (node.textContent) {
          rawText = node.textContent;
        }
        // 方法3: 从pre元素获取文本
        else if (pre.textContent) {
          rawText = pre.textContent;
        }
        
        // 处理转义的换行符
        rawText = rawText.replace(/\\n/g, '\n');
        
        // 分割成行并计算实际行数，确保空行也被计算
        const lines = rawText.split('\n');
        const lineCount = Math.max(1, lines.length);
        
        console.log(`代码块 ${blockId} 更新行号:`, {
          rawText: JSON.stringify(rawText),
          lines: lines.map((line, i) => `行${i + 1}: "${line}"`),
          lineCount,
          currentLineNumbers: lineNumbers.children.length
        });
        
        // 如果行数没有变化，不更新
        if (lineCount === lineNumbers.children.length) {
          console.log(`代码块 ${blockId} 行数没有变化，跳过更新`);
          return;
        }
        
        console.log(`代码块 ${blockId} 开始更新行号，从 ${lineNumbers.children.length} 行更新到 ${lineCount} 行`);
        
        // 清空现有行号
        lineNumbers.innerHTML = '';
        
        // 创建新的行号
        const fragment = document.createDocumentFragment();
        for (let i = 0; i < lineCount; i++) {
          const lineNumber = document.createElement('div');
          lineNumber.textContent = `${i + 1}`;
          lineNumber.className = 'line-number';
          fragment.appendChild(lineNumber);
        }
        lineNumbers.appendChild(fragment);
        
        console.log(`代码块 ${blockId} 行号更新完成，当前行号数量: ${lineNumbers.children.length}`);
        
        // 确保行号与代码内容同步
        syncScroll();
      };

      // 创建节流版本的更新函数
      const throttledUpdate = throttle(() => {
        updateLineNumbers();
      }, 100);

      if (node.attrs.height) {
        pre.style.maxHeight = `${node.attrs.height}px`;
        lineNumbers.style.maxHeight = `${node.attrs.height}px`;
        
        // 强制设置高度
        pre.style.setProperty('height', `${node.attrs.height}px`, 'important');
        pre.style.setProperty('max-height', `${node.attrs.height}px`, 'important');
        lineNumbers.style.setProperty('height', `${node.attrs.height}px`, 'important');
        lineNumbers.style.setProperty('max-height', `${node.attrs.height}px`, 'important');
      }
      
      content.appendChild(lineNumbers);
      content.appendChild(pre);
      body.appendChild(content);
      
      // 添加调整大小手柄
      const resizeHandle = document.createElement('div');
      resizeHandle.classList.add('code-block_resize-handle');
      resizeHandle.title = '调整高度';
      
      // 初始化变量
      let startY = 0;
      let startHeight = 0;
      let isDragging = false;
      let currentHeight = node.attrs.height || null;
      
      // 更新DOM高度，但不更新编辑器状态
      const updateDOMHeight = (newHeight: number) => {
        if (newHeight > 50) {
          // 立即更新样式
          requestAnimationFrame(() => {
            // 更新CSS变量
            container.style.setProperty('--code-block-height', `${newHeight}px`);
            
            // 更新具体元素的高度
            pre.style.height = `${newHeight}px`;
            pre.style.maxHeight = `${newHeight}px`;
            lineNumbers.style.height = `${newHeight}px`;
            lineNumbers.style.maxHeight = `${newHeight}px`;
          });
          
          // 保存当前高度到局部变量
          currentHeight = newHeight;
        }
      };
      
      const onMouseDown = (e: MouseEvent) => {
        e.preventDefault();
        e.stopPropagation();
        
        isDragging = true;
        startY = e.clientY;
        startHeight = parseInt(window.getComputedStyle(pre).height, 10);
        
        // 添加拖动状态类
        resizeHandle.classList.add('is-dragging');
        container.dataset.dragging = 'true';
        document.body.style.cursor = 'ns-resize';
        
        // 设置全局拖动状态
        setGlobalResizing(true);
        
        // 暂停编辑器的编辑功能
        editor.setEditable(false);
        
        document.addEventListener('mousemove', onMouseMove);
        document.addEventListener('mouseup', onMouseUp);
      };
      
      const onMouseMove = (e: MouseEvent) => {
        if (!isDragging) return;
        
        e.preventDefault();
        e.stopPropagation();
        
        const deltaY = e.clientY - startY;
        const newHeight = Math.max(50, startHeight + deltaY);
        
        updateDOMHeight(newHeight);
      };
      
      const onMouseUp = (e: MouseEvent) => {
        e.preventDefault();
        e.stopPropagation();
        
        isDragging = false;
        
        // 移除拖动状态类
        resizeHandle.classList.remove('is-dragging');
        container.dataset.dragging = 'false';
        document.body.style.cursor = '';
        
        document.removeEventListener('mousemove', onMouseMove);
        document.removeEventListener('mouseup', onMouseUp);
        
        // 在拖动结束时更新编辑器状态
        if (currentHeight !== null) {
          // 确保DOM已完全更新
          requestAnimationFrame(() => {
            // 再次检查当前高度
            const finalHeight = parseInt(window.getComputedStyle(pre).height, 10);
            
            // 强制更新节点属性并触发序列化
            if (typeof getPos === 'function') {
              const pos = getPos();
              if (pos >= 0) {
                // 强制更新节点属性
                const tr = editor.state.tr.setNodeAttribute(pos, 'height', finalHeight || currentHeight);
                // 同时更新data-height属性
                tr.setNodeAttribute(pos, 'data-height', finalHeight || currentHeight);
                editor.view.dispatch(tr);
                
                // 强制触发onChange事件，确保高度被保存
                setTimeout(() => {
                  // 触发编辑器的事件
                  if (typeof editor.options.onUpdate === 'function') {
                    editor.options.onUpdate({
                      editor,
                      transaction: tr
                    });
                  }
                }, 50);
              }
            }
            
            // 设置全局拖动状态为false并恢复编辑器编辑功能
            setGlobalResizing(false);
            editor.setEditable(true);
          });
        } else {
          // 恢复编辑器的编辑功能
          editor.setEditable(true);
          // 设置全局拖动状态为false
          setGlobalResizing(false);
        }
      };
      
      resizeHandle.addEventListener('mousedown', onMouseDown);
      body.appendChild(resizeHandle);
      
      container.appendChild(body);

      // 添加 MutationObserver 监听代码变化
      const observer = new MutationObserver((mutations) => {
        console.log(`代码块 ${blockId} 检测到 ${mutations.length} 个变化`);
        
        // 检查是否有任何相关的变化
        const hasRelevantChanges = mutations.some(mutation => {
          // 文本内容变化
          const isTextChange = mutation.type === 'characterData';
          
          // 子节点变化（包括换行符等）
          const isChildListChange = mutation.type === 'childList' && 
            (mutation.addedNodes.length > 0 || mutation.removedNodes.length > 0);
          
          // 属性变化（可能影响显示）
          const isAttributeChange = mutation.type === 'attributes';
          
          if (isTextChange || isChildListChange || isAttributeChange) {
            console.log(`代码块 ${blockId} 相关变化:`, mutation.type);
          }
          
          return isTextChange || isChildListChange || isAttributeChange;
        });
        
        if (hasRelevantChanges) {
          console.log(`代码块 ${blockId} 触发行号更新`);
          // 延迟更新，确保DOM完全更新
          setTimeout(() => {
            throttledUpdate();
          }, 10);
        }
      });

      // 配置 observer，监听所有相关变化
      observer.observe(code, {
        childList: true,    // 监听子节点的增删
        subtree: true,      // 监听所有后代节点
        characterData: true, // 监听文本内容的变化
        attributes: true    // 监听属性变化
      });
      
      // 同时监听pre元素，确保能捕获到所有变化
      observer.observe(pre, {
        childList: true,    // 监听子节点的增删
        subtree: true,      // 监听所有后代节点
        characterData: true, // 监听文本内容的变化
        attributes: true    // 监听属性变化
      });

      // 初始化行号
      throttledUpdate();
      
      // 延迟再次更新，确保语法高亮完成后行号正确
      setTimeout(() => {
        throttledUpdate();
      }, 100);
      
      // 为每个代码块创建独立的更新机制
      const forceUpdateLineNumbers = () => {
        throttledUpdate();
      };
      
      // 将当前代码块的更新函数存储到全局映射中
      const windowWithEditor = window as WindowWithEditor;
      if (!windowWithEditor.codeBlockUpdateFunctions) {
        windowWithEditor.codeBlockUpdateFunctions = new Map();
      }
      windowWithEditor.codeBlockUpdateFunctions.set(blockId, forceUpdateLineNumbers);

      // 监听代码内容的滚动事件
      pre.addEventListener('scroll', debouncedSyncScroll, { passive: true });
      
      // 确保初始状态也是同步的
      setTimeout(() => syncScroll(), 0);
      
      // 在destroy中清理事件监听
      return {
        dom: container,
        contentDOM: code,
        update: (updatedNode) => {
          if (updatedNode.type.name !== 'codeBlock') {
            return false;
          }
          
          try {
            // 更新语言标识
            language.textContent = updatedNode.attrs.language || 'text';
            
            // 更新高度
            if (updatedNode.attrs.height) {
              // 更新CSS变量
              container.style.setProperty('--code-block-height', `${updatedNode.attrs.height}px`);
              
              // 强制更新具体元素的高度
              pre.style.setProperty('height', `${updatedNode.attrs.height}px`, 'important');
              pre.style.setProperty('max-height', `${updatedNode.attrs.height}px`, 'important');
              lineNumbers.style.setProperty('height', `${updatedNode.attrs.height}px`, 'important');
              lineNumbers.style.setProperty('max-height', `${updatedNode.attrs.height}px`, 'important');
              
              // 确保更新后滚动位置同步
              setTimeout(() => syncScroll(), 0);
            }
            
            return true;
          } catch (err) {
            console.error('更新代码块视图时出错:', err);
            return false;
          }
        },
        destroy: () => {
          observer.disconnect();
          resizeHandle.removeEventListener('mousedown', onMouseDown);
          pre.removeEventListener('scroll', debouncedSyncScroll);
          
          // 清理全局映射中的更新函数
          const windowWithEditor = window as WindowWithEditor;
          if (windowWithEditor.codeBlockUpdateFunctions) {
            windowWithEditor.codeBlockUpdateFunctions.delete(blockId);
          }
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
  onStateChange,
  className = '',
  placeholder = '开始编写笔记...',
  showToolbar = true // 默认显示工具栏
}: TiptapEditorProps): React.ReactElement => {
  const { config } = useConfig();
  const isWideMode = config.editorWidthMode === 'wide';
  const isFirstRender = useRef(true);
  // 添加标志位，用于在拖动过程中禁用onChange事件处理
  const isResizingCodeBlock = useRef(false);
  
  // 使用AlertDialog Hook
  const { showConfirm } = useAlertDialog();

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
        },
      }),
      TextAlign.configure({
          types: ['heading', 'paragraph'],
          alignments: ['left', 'center', 'right'],
          defaultAlignment: 'left',
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
      // 替换为增强图片扩展
      EnhancedImage.configure({
        inline: false,
        allowBase64: true,
        HTMLAttributes: {
          class: 'editor-image',
        },
      }),
      // 使用增强型代码块扩展
      EnhancedCodeBlock.configure({
        lowlight,
        HTMLAttributes: {
          class: 'enhanced-code-block',
          'data-height': null,
        },
      }),
      // 添加折叠扩展
      createHeadingFoldingExtension(),
      // 表格扩展
      CustomTable.configure({
        resizable: true,
        handleWidth: 6,
        cellMinWidth: 50,
        lastColumnResizable: true,
        HTMLAttributes: {
          class: 'tiptap-table',
        },
      }),
      TableRow.configure({
        HTMLAttributes: {
          class: 'tiptap-table-row',
        },
      }),
      TableHeader.configure({
        HTMLAttributes: {
          class: 'tiptap-table-header',
        },
      }),
      CustomTableCell.configure({
        HTMLAttributes: {
          class: 'tiptap-table-cell',
        },
      }),
    ],
    content: content || '',
    onUpdate: ({ editor }) => {
      if (isFirstRender.current) {
        isFirstRender.current = false;
        return;
      }
      
      // 如果正在拖动调整代码块大小或进行折叠操作，则不触发onChange
      if (isResizingCodeBlock.current || getGlobalResizing() || getGlobalFolding()) {
        return;
      }
      
      // 获取HTML内容
      const html = editor.getHTML();
      
      // 调用onChange回调
      onChange?.(html);
      
      // 强制更新所有代码块行号
      const windowWithEditor = window as WindowWithEditor;
      if (windowWithEditor.codeBlockUpdateFunctions) {
        console.log('编辑器内容变化，强制更新所有代码块行号');
        setTimeout(() => {
          windowWithEditor.codeBlockUpdateFunctions!.forEach((updateFn, blockId) => {
            console.log(`强制更新代码块 ${blockId} 的行号`);
            updateFn();
          });
        }, 50);
      }
    },
    onSelectionUpdate: ({ editor }) => {
      // 检查是否在代码块中
      const { state } = editor;
      const { selection } = state;
      const { $from } = selection;
      const isInCodeBlock = $from.parent.type.name === 'codeBlock';
      
      // 通知父组件状态变化
      if (onStateChange) {
        onStateChange({ isInCodeBlock });
      }
    },
    // 启用所有编辑器功能
    enableCoreExtensions: true,
    onCreate: ({ editor }) => {
      // 添加行高调整事件处理
      const handleRowResize = (event: MouseEvent) => {
        const target = event.target as HTMLElement
        if (!target.closest('tr')) return

        const tr = target.closest('tr')
        if (!tr) return

        const startY = event.pageY
        const startHeight = tr.offsetHeight

        const handleMouseMove = (e: MouseEvent) => {
          const currentY = e.pageY
          const diff = currentY - startY
          const newHeight = Math.max(40, startHeight + diff)
          tr.style.height = `${newHeight}px`
        }

        const handleMouseUp = () => {
          document.removeEventListener('mousemove', handleMouseMove)
          document.removeEventListener('mouseup', handleMouseUp)
        }

        document.addEventListener('mousemove', handleMouseMove)
        document.addEventListener('mouseup', handleMouseUp)
      }

      editor.view.dom.addEventListener('mousedown', (event) => {
        const target = event.target as HTMLElement
        if (target.closest('tr > td:first-child::before')) {
          handleRowResize(event)
        }
      })
    },
  })

  // 当content prop变化时更新编辑器内容
  useEffect(() => {
    if (editor && content !== undefined && editor.getHTML() !== content) {
      // 如果正在进行折叠操作，不更新内容
      if (getGlobalFolding()) {
        return;
      }
      
      // 使用setTimeout避免在渲染周期内调用flushSync
      setTimeout(() => {
      editor.commands.setContent(content, false);
      }, 0);
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

  // 设置全局确认对话框函数
  useEffect(() => {
    setGlobalConfirmDialog(showConfirm);
  }, [showConfirm]);

  return (
    <div className="flex flex-col h-full">
      {editor && (
        <>
          {showToolbar && (
            <EditorToolbar editor={editor} />
          )}
        </>
      )}
      <div className="flex-1 overflow-y-auto relative">
        {editor && <TableBubbleMenu editor={editor} />}
        <EditorContent 
          editor={editor} 
          className={`editor-content ${isWideMode ? 'wide' : ''} ${className}`}
        />
      </div>
    </div>
  );
};

export default TiptapEditor 