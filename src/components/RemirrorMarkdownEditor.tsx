import React, { useCallback } from 'react';
import { Remirror, useRemirror, ThemeProvider, Toolbar, ToolbarGroup, ToolbarButton } from '@remirror/react';
import { MarkdownExtension } from 'remirror/extensions';
import { EditorState } from '@remirror/pm/state';

interface RemirrorMarkdownEditorProps {
  value: string;
  onChange: (md: string) => void;
  className?: string;
}

/**
 * Remirror 所见即所得 Markdown 编辑器组件
 * 支持基本Markdown格式，onChange返回Markdown源码
 */
function RemirrorMarkdownEditor({ value, onChange, className }: RemirrorMarkdownEditorProps) {
  // 初始化Remirror编辑器，启用Markdown扩展
  const { manager, state, onChange: remirrorOnChange } = useRemirror({
    extensions: () => [
      new MarkdownExtension({ copyAsMarkdown: true })
    ],
    content: value,
    selection: 'start',
    stringHandler: 'markdown',
  });

  // 处理内容变更，返回Markdown源码
  const handleChange = useCallback((params: { state: EditorState }) => {
    const md = manager.store.getMarkdown();
    onChange(md);
    remirrorOnChange(params);
  }, [manager, onChange, remirrorOnChange]);

  return (
    <ThemeProvider>
      <div className={className} style={{ height: '100%' }}>
        {/* 工具栏 */}
        <Toolbar>
          <ToolbarGroup>
            <ToolbarButton type="bold" />
            <ToolbarButton type="italic" />
            <ToolbarButton type="code" />
            <ToolbarButton type="blockquote" />
            <ToolbarButton type="bulletList" />
            <ToolbarButton type="orderedList" />
            <ToolbarButton type="link" />
            <ToolbarButton type="image" />
            <ToolbarButton type="horizontalRule" />
          </ToolbarGroup>
        </Toolbar>
        {/* 编辑器主体 */}
        <Remirror
          manager={manager}
          state={state}
          onChange={handleChange}
          autoFocus
          style={{ minHeight: 300, height: '100%' }}
        />
      </div>
    </ThemeProvider>
  );
}

export default RemirrorMarkdownEditor; 