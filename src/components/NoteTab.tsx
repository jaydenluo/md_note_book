import React, { useRef, useState, useEffect, useCallback } from 'react';
import { useNotes } from '@stores/noteStore';
import { useTabs } from '@stores/tabsStore';
import { Loader2 } from 'lucide-react';
import { debounce } from '@utils/debounce';
import Editor from './Editor'; // 导入 Editor 组件

interface NoteTabProps {
  noteId: string;
}

export const NoteTab = ({ noteId }: NoteTabProps): JSX.Element => {
  const [isSaving, setIsSaving] = useState(false);
  const [isInitialized, setIsInitialized] = useState(false);

  // 获取笔记数据
  const note = useNotes(state => 
    state.notes.find(n => n.id === noteId)
  );
  const updateTabTitle = useTabs(state => state.updateTabTitle);
  const getTabByNoteId = useTabs(state => state.getTabByNoteId);

  // 获取当前笔记对应的标签
  const tab = getTabByNoteId(noteId);

  // 当笔记ID改变时，更新本地状态（仅在初始化时）
  useEffect(() => {
    if (note && !isInitialized) {
      setIsInitialized(true);
    }
  }, [noteId, note, isInitialized]);

  // 当切换到不同笔记时，重置初始化状态
  useEffect(() => {
    setIsInitialized(false);
  }, [noteId]);
  
  // 如果笔记不存在，显示错误信息
  if (!note) {
    return (
      <div className="flex flex-col items-center justify-center h-full text-gray-500 dark:text-gray-400">
        <p className="text-center">笔记不存在或已被删除</p>
      </div>
    );
  }

  return (
    <div className="h-full">
      <Editor noteId={noteId} />
    </div>
  );
}; 