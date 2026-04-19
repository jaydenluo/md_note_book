import React, { useState, useEffect, useRef } from 'react';
import { X } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import { useTabs } from '@stores/tabsStore';
import { cn } from '@utils/cn';

export interface Tab {
  id: string;
  title: string;
  noteId: string;
}

interface TabManagerProps {
  activeTabId: string | null;
  onTabChange: (tabId: string) => void;
  onTabClose: (tabId: string) => void;
  onTabCloseAll: () => void;
  onTabActivate?: (noteId: string) => Promise<void>;
}

export const TabManager = ({
  activeTabId,
  onTabChange,
  onTabClose,
  onTabCloseAll,
  onTabActivate
}: TabManagerProps) => {
  const [showScrollButtons, setShowScrollButtons] = useState(false);
  const [canScrollLeft, setCanScrollLeft] = useState(false);
  const [canScrollRight, setCanScrollRight] = useState(false);
  const [showDropdown, setShowDropdown] = useState(false);
  const [visibleTabsCount, setVisibleTabsCount] = useState(0);
  const tabsContainerRef = useRef<HTMLDivElement>(null);
  const dropdownRef = useRef<HTMLDivElement>(null);

  const tabs = useTabs(state => state.tabs);

  useEffect(() => {
    setVisibleTabsCount(tabs.length);
  }, [tabs]);

  const calculateVisibleTabs = () => {
    if (!tabsContainerRef.current) return;

    const container = tabsContainerRef.current;
    const containerWidth = container.clientWidth;
    const estimatedTabWidth = 168;
    const totalEstimatedWidth = tabs.length * estimatedTabWidth;

    if (totalEstimatedWidth <= containerWidth - 56) {
      setVisibleTabsCount(tabs.length);
      return;
    }

    const availableWidth = containerWidth - 104;
    const maxVisibleTabs = Math.floor(availableWidth / estimatedTabWidth);
    setVisibleTabsCount(Math.max(1, maxVisibleTabs));
  };

  useEffect(() => {
    const checkScroll = () => {
      if (!tabsContainerRef.current) return;

      const { scrollWidth, clientWidth, scrollLeft } = tabsContainerRef.current;
      setShowScrollButtons(scrollWidth > clientWidth);
      setCanScrollLeft(scrollLeft > 0);
      setCanScrollRight(scrollLeft + clientWidth < scrollWidth);
      calculateVisibleTabs();
    };

    checkScroll();
    window.addEventListener('resize', checkScroll);
    return () => window.removeEventListener('resize', checkScroll);
  }, [tabs]);

  useEffect(() => {
    const container = tabsContainerRef.current;
    if (!container) return;

    const handleScroll = () => {
      const { scrollWidth, clientWidth, scrollLeft } = container;
      setCanScrollLeft(scrollLeft > 0);
      setCanScrollRight(scrollLeft + clientWidth < scrollWidth);
    };

    container.addEventListener('scroll', handleScroll);
    return () => container.removeEventListener('scroll', handleScroll);
  }, []);

  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
        setShowDropdown(false);
      }
    };

    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  useEffect(() => {
    if (activeTabId && tabsContainerRef.current) {
      const activeTab = tabsContainerRef.current.querySelector(`[data-tab-id="${activeTabId}"]`);
      if (activeTab) {
        activeTab.scrollIntoView({ behavior: 'smooth', block: 'nearest', inline: 'center' });
      }
    }
  }, [activeTabId]);

  const scrollLeft = () => {
    if (tabsContainerRef.current) {
      tabsContainerRef.current.scrollBy({ left: -220, behavior: 'smooth' });
    }
  };

  const scrollRight = () => {
    if (tabsContainerRef.current) {
      tabsContainerRef.current.scrollBy({ left: 220, behavior: 'smooth' });
    }
  };

  const handleContextMenu = (e: React.MouseEvent) => {
    e.preventDefault();
  };

  const visibleTabs = tabs.slice(0, visibleTabsCount);
  const hiddenTabs = tabs.slice(visibleTabsCount);

  return (
    <div className="flex items-center gap-2 border-b border-slate-200/70 bg-white/72 px-3 py-2 backdrop-blur-xl dark:border-white/10 dark:bg-slate-950/45">
      {showScrollButtons && (
        <button
          onClick={scrollLeft}
          disabled={!canScrollLeft}
          className={cn(
            'inline-flex h-9 w-9 items-center justify-center rounded-2xl border border-slate-200/70 bg-white/80 text-slate-500 shadow-sm transition-all hover:-translate-y-0.5 hover:bg-white dark:border-white/10 dark:bg-slate-900/70 dark:text-slate-300 dark:hover:bg-slate-900',
            !canScrollLeft && 'cursor-not-allowed opacity-30',
          )}
          aria-label="向左滚动标签"
        >
          <svg className="h-4 w-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M15 19l-7-7 7-7" />
          </svg>
        </button>
      )}

      <div
        ref={tabsContainerRef}
        className="flex flex-1 gap-2 overflow-x-auto scrollbar-none"
        style={{ scrollBehavior: 'smooth' }}
      >
        <AnimatePresence>
          {visibleTabs.map(tab => (
            <motion.div
              key={tab.id}
              initial={{ opacity: 0, width: 0 }}
              animate={{ opacity: 1, width: 'auto' }}
              exit={{ opacity: 0, width: 0 }}
              transition={{ duration: 0.2 }}
              className={cn(
                'flex h-10 min-w-[140px] max-w-[220px] items-center rounded-2xl border px-3 shadow-sm transition-all',
                activeTabId === tab.id
                  ? 'border-slate-900 bg-slate-950 text-white shadow-lg shadow-slate-950/10 dark:border-teal-400/30 dark:bg-teal-500/15 dark:text-teal-50 dark:shadow-teal-500/10'
                  : 'border-slate-200/70 bg-white/78 text-slate-600 hover:-translate-y-0.5 hover:bg-white dark:border-white/10 dark:bg-slate-900/70 dark:text-slate-300 dark:hover:bg-slate-900',
              )}
              data-tab-id={tab.id}
              onContextMenu={(e) => handleContextMenu(e)}
            >
              <button
                className="min-w-0 flex-1 truncate text-left text-sm font-medium"
                onClick={() => {
                  onTabChange(tab.id);
                  if (onTabActivate && tab.noteId) {
                    onTabActivate(tab.noteId).catch(err => {
                      console.error(`加载笔记内容失败 (ID: ${tab.noteId}):`, err);
                    });
                  }
                }}
                title={tab.title || '无标题'}
              >
                {tab.title || '无标题'}
              </button>

              <button
                onClick={(e) => {
                  e.stopPropagation();
                  onTabClose(tab.id);
                }}
                className={cn(
                  'rounded-full p-1 transition-colors',
                  activeTabId === tab.id
                    ? 'text-white/70 hover:bg-white/10 hover:text-white dark:text-teal-50/70 dark:hover:bg-white/10 dark:hover:text-teal-50'
                    : 'text-slate-500 hover:bg-slate-200 hover:text-slate-700 dark:text-slate-400 dark:hover:bg-slate-800 dark:hover:text-slate-200',
                )}
                aria-label={`关闭标签 ${tab.title || '无标题'}`}
              >
                <svg className="h-3.5 w-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M6 18L18 6M6 6l12 12" />
                </svg>
              </button>
            </motion.div>
          ))}
        </AnimatePresence>
      </div>

      {showScrollButtons && (
        <button
          onClick={scrollRight}
          disabled={!canScrollRight}
          className={cn(
            'inline-flex h-9 w-9 items-center justify-center rounded-2xl border border-slate-200/70 bg-white/80 text-slate-500 shadow-sm transition-all hover:-translate-y-0.5 hover:bg-white dark:border-white/10 dark:bg-slate-900/70 dark:text-slate-300 dark:hover:bg-slate-900',
            !canScrollRight && 'cursor-not-allowed opacity-30',
          )}
          aria-label="向右滚动标签"
        >
          <svg className="h-4 w-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M9 5l7 7-7 7" />
          </svg>
        </button>
      )}

      {hiddenTabs.length > 0 && (
        <div className="relative" ref={dropdownRef}>
          <button
            onClick={() => setShowDropdown(!showDropdown)}
            className="ml-1 inline-flex h-9 items-center gap-1 rounded-2xl border border-slate-200/70 bg-white/80 px-3 text-slate-500 shadow-sm transition-all hover:-translate-y-0.5 hover:bg-white dark:border-white/10 dark:bg-slate-900/70 dark:text-slate-300 dark:hover:bg-slate-900"
            title="更多标签"
          >
            <svg className="h-4 w-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M4 6h16M4 12h16M4 18h16" />
            </svg>
            <span className="text-xs">{hiddenTabs.length}+</span>
          </button>

          {showDropdown && (
            <div className="absolute right-0 top-full z-50 mt-2 max-h-[320px] min-w-[220px] overflow-y-auto rounded-2xl border border-slate-200/70 bg-white/92 py-2 shadow-2xl backdrop-blur-xl dark:border-white/10 dark:bg-slate-950/92">
              {hiddenTabs.map(tab => (
                <div
                  key={tab.id}
                  className={cn(
                    'flex cursor-pointer items-center justify-between px-3 py-2.5 transition-colors hover:bg-slate-100 dark:hover:bg-slate-900',
                    activeTabId === tab.id ? 'bg-teal-50 text-teal-900 dark:bg-teal-500/10 dark:text-teal-100' : '',
                  )}
                  onClick={() => {
                    onTabChange(tab.id);
                    setShowDropdown(false);
                  }}
                >
                  <span className="inline-block max-w-[160px] truncate text-sm" title={tab.title || '无标题'}>
                    {tab.title || '无标题'}
                  </span>
                  <button
                    onClick={(e) => {
                      e.stopPropagation();
                      onTabClose(tab.id);
                    }}
                    className="rounded-full p-1 text-slate-500 transition-colors hover:bg-slate-200 hover:text-slate-700 dark:text-slate-400 dark:hover:bg-slate-800 dark:hover:text-slate-200"
                    aria-label={`关闭标签 ${tab.title || '无标题'}`}
                  >
                    <svg className="h-3.5 w-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M6 18L18 6M6 6l12 12" />
                    </svg>
                  </button>
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      <button
        onClick={onTabCloseAll}
        className="ml-1 inline-flex h-9 w-9 items-center justify-center rounded-2xl border border-slate-200/70 bg-white/80 text-slate-500 shadow-sm transition-all hover:-translate-y-0.5 hover:bg-white dark:border-white/10 dark:bg-slate-900/70 dark:text-slate-300 dark:hover:bg-slate-900"
        title="关闭全部标签"
      >
        <X className="h-4 w-4" />
      </button>
    </div>
  );
};
