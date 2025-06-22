import { create } from 'zustand'
import { persist } from 'zustand/middleware'

export interface Tab {
  id: string;
  noteId: string;
  title: string;
}

interface TabsState {
  tabs: Tab[];
  activeTabId: string | null;
  addTab: (noteId: string, title: string) => string;
  closeTab: (tabId: string) => void;
  closeOtherTabs: (tabId: string) => void;
  closeAllTabs: () => void;
  activateTab: (tabId: string) => void;
  updateTabTitle: (tabId: string, title: string) => void;
  getTabByNoteId: (noteId: string) => Tab | undefined;
}

export const useTabs = create<TabsState>()(
  persist(
    (set, get) => ({
      tabs: [],
      activeTabId: null,

      addTab: (noteId, title) => {
        const { tabs } = get();
        // 检查是否已存在相同noteId的标签
        const existingTab = tabs.find(tab => tab.noteId === noteId);
        
        if (existingTab) {
          // 如果已存在，激活该标签
          set({ activeTabId: existingTab.id });
          return existingTab.id;
        } else {
          // 创建新标签
          const newTab: Tab = {
            id: `tab-${Date.now()}`,
            noteId,
            title
          };
          
          set(state => ({ 
            tabs: [...state.tabs, newTab],
            activeTabId: newTab.id
          }));
          
          return newTab.id;
        }
      },

      closeTab: (tabId) => {
        const { tabs, activeTabId } = get();
        
        // 找到要关闭的标签的索引
        const tabIndex = tabs.findIndex(tab => tab.id === tabId);
        if (tabIndex === -1) return;
        
        // 如果关闭的是当前活动标签，需要激活另一个标签
        let newActiveTabId = activeTabId;
        if (activeTabId === tabId) {
          // 尝试激活下一个标签，如果没有下一个，则激活前一个
          if (tabIndex < tabs.length - 1) {
            newActiveTabId = tabs[tabIndex + 1].id;
          } else if (tabIndex > 0) {
            newActiveTabId = tabs[tabIndex - 1].id;
          } else {
            newActiveTabId = null; // 没有其他标签了
          }
        }
        
        set({
          tabs: tabs.filter(tab => tab.id !== tabId),
          activeTabId: newActiveTabId
        });
      },

      closeOtherTabs: (tabId) => {
        const { tabs } = get();
        const tabToKeep = tabs.find(tab => tab.id === tabId);
        
        if (tabToKeep) {
          set({
            tabs: [tabToKeep],
            activeTabId: tabId
          });
        }
      },

      closeAllTabs: () => {
        set({
          tabs: [],
          activeTabId: null
        });
      },

      activateTab: (tabId) => {
        set({ activeTabId: tabId });
      },

      updateTabTitle: (tabId, title) => {
        set(state => ({
          tabs: state.tabs.map(tab => 
            tab.id === tabId ? { ...tab, title } : tab
          )
        }));
      },

      getTabByNoteId: (noteId) => {
        return get().tabs.find(tab => tab.noteId === noteId);
      }
    }),
    {
      name: 'tabs-storage',
      partialize: (state) => ({ tabs: state.tabs, activeTabId: state.activeTabId })
    }
  )
); 