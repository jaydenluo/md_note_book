import React, { useEffect } from 'react'
import type { FC } from 'react'
import { useNotes } from '../stores/noteStore'
// import { useTabs } from '../stores/tabsStore' // 已移除未使用
import Editor from './Editor'

interface NoteTabProps {
  noteId: string
}

export const NoteTab: FC<NoteTabProps> = ({ noteId }) => {
  // 获取笔记数据
  const note = useNotes(state => state.notes.find(n => n.id === noteId));
  const loadNoteContent = useNotes(state => state.loadNoteContent);

  // 只有在内容未加载时才加载，避免重复加载
  useEffect(() => {
    // 如果note存在且内容未加载（为undefined），才加载内容
    if (noteId && note && note.content === undefined) {
      // 中文注释：只在内容未加载时才加载，已打开的不重复加载
      loadNoteContent(noteId);
    }
  }, [noteId, note, loadNoteContent]);
  
  if (!note) {
    return (
      <div className="flex flex-col items-center justify-center h-full text-gray-500 dark:text-gray-400">
        <p className="text-center">笔记不存在或已被删除</p>
      </div>
    );
  }
  if (note.content === undefined) {
    return (
      <div className="flex flex-col items-center justify-center h-full text-gray-400 dark:text-gray-500">
        <p className="text-center">笔记内容加载中...</p>
      </div>
    );
  }

  return (
    <div className="h-full">
      {/* 只用noteId作为key，避免重复创建实例 */}
      <Editor key={noteId} noteId={noteId} />
    </div>
  );
}; 