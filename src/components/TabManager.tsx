import React, { useState, useEffect, useRef } from 'react';
import { X, Menu, ChevronDown } from 'lucide-react';
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
  onTabCloseOthers: (tabId: string) => void;
  onTabCloseAll: () => void;
}

export const TabManager = ({
  activeTabId,
  onTabChange,
  onTabClose,
  onTabCloseOthers,
  onTabCloseAll
}: TabManagerProps): JSX.Element => {
  const [showScrollButtons, setShowScrollButtons] = useState(false);
  const [canScrollLeft, setCanScrollLeft] = useState(false);
  const [canScrollRight, setCanScrollRight] = useState(false);
  const [showDropdown, setShowDropdown] = useState(false);
  const [visibleTabsCount, setVisibleTabsCount] = useState(0);
  const tabsContainerRef = useRef<HTMLDivElement>(null);
  const dropdownRef = useRef<HTMLDivElement>(null);
  
  const tabs = useTabs(state => state.tabs);
  
  // 当tabs变化时，更新可见标签数量
  useEffect(() => {
    setVisibleTabsCount(tabs.length);
  }, [tabs]);
  
  // 计算可见标签数量和是否需要折叠
  const calculateVisibleTabs = () => {
    if (!tabsContainerRef.current) return;
    
    const container = tabsContainerRef.current;
    const containerWidth = container.clientWidth;
    
    // 估算每个标签的平均宽度（包括最小宽度和最大宽度）
    const estimatedTabWidth = 160; // 平均标签宽度
    const totalEstimatedWidth = tabs.length * estimatedTabWidth;
    
    // 如果估算的总宽度没有超过容器宽度，显示所有标签
    if (totalEstimatedWidth <= containerWidth - 40) {
      setVisibleTabsCount(tabs.length);
      return;
    }
    
    // 如果超过容器宽度，计算可见标签数量
    const availableWidth = containerWidth - 80; // 为折叠按钮和关闭按钮预留空间
    const maxVisibleTabs = Math.floor(availableWidth / estimatedTabWidth);
    setVisibleTabsCount(Math.max(1, maxVisibleTabs)); // 至少保留一个标签
  };
  
  // 检查是否需要显示滚动按钮
  useEffect(() => {
    const checkScroll = () => {
      if (!tabsContainerRef.current) return;
      
      const { scrollWidth, clientWidth, scrollLeft } = tabsContainerRef.current;
      setShowScrollButtons(scrollWidth > clientWidth);
      setCanScrollLeft(scrollLeft > 0);
      setCanScrollRight(scrollLeft + clientWidth < scrollWidth);
      
      // 计算可见标签数量
      calculateVisibleTabs();
    };
    
    checkScroll();
    window.addEventListener('resize', checkScroll);
    return () => window.removeEventListener('resize', checkScroll);
  }, [tabs]);
  
  // 监听滚动事件
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
  
  // 点击外部关闭下拉菜单
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
        setShowDropdown(false);
      }
    };
    
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);
  
  // 滚动到活动标签
  useEffect(() => {
    if (activeTabId && tabsContainerRef.current) {
      const activeTab = tabsContainerRef.current.querySelector(`[data-tab-id="${activeTabId}"]`);
      if (activeTab) {
        activeTab.scrollIntoView({ behavior: 'smooth', block: 'nearest', inline: 'center' });
      }
    }
  }, [activeTabId]);
  
  // 滚动函数
  const scrollLeft = () => {
    if (tabsContainerRef.current) {
      tabsContainerRef.current.scrollBy({ left: -200, behavior: 'smooth' });
    }
  };
  
  const scrollRight = () => {
    if (tabsContainerRef.current) {
      tabsContainerRef.current.scrollBy({ left: 200, behavior: 'smooth' });
    }
  };
  
  // 右键菜单处理
  const handleContextMenu = (e: React.MouseEvent, tabId: string) => {
    e.preventDefault();
    // 这里可以实现右键菜单，但为了简单起见，我们使用常规按钮
  };
  
  // 切分可见和隐藏的标签
  const visibleTabs = tabs.slice(0, visibleTabsCount);
  const hiddenTabs = tabs.slice(visibleTabsCount);
  
  return (
    <div className="flex items-center border-b border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800">
      {/* 左滚动按钮 */}
      {showScrollButtons && (
        <button
          onClick={scrollLeft}
          disabled={!canScrollLeft}
          className={cn(
            "p-1 text-gray-500 dark:text-gray-400 hover:bg-gray-100 dark:hover:bg-gray-700 rounded-md",
            !canScrollLeft && "opacity-30 cursor-not-allowed"
          )}
        >
          <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M15 19l-7-7 7-7" />
          </svg>
        </button>
      )}
      
      {/* 标签容器 */}
      <div 
        ref={tabsContainerRef}
        className="flex overflow-x-auto scrollbar-none flex-1"
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
                "flex items-center min-w-[120px] max-w-[200px] h-9 px-3 border-r border-gray-200 dark:border-gray-700",
                activeTabId === tab.id ? "bg-gray-100 dark:bg-gray-700" : "hover:bg-gray-50 dark:hover:bg-gray-700/50"
              )}
              data-tab-id={tab.id}
              onContextMenu={(e) => handleContextMenu(e, tab.id)}
            >
              <button 
                className="flex-1 truncate text-left text-sm"
                onClick={() => onTabChange(tab.id)}
              >
                {tab.title || "无标题"}
              </button>
              
              <div className="flex items-center ml-1">
                <button 
                  onClick={(e) => {
                    e.stopPropagation();
                    onTabClose(tab.id);
                  }}
                  className="p-1 rounded-full hover:bg-gray-200 dark:hover:bg-gray-600 text-gray-500 dark:text-gray-400"
                >
                  <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M6 18L18 6M6 6l12 12" />
                  </svg>
                </button>
              </div>
            </motion.div>
          ))}
        </AnimatePresence>
      </div>
      
      {/* 右滚动按钮 */}
      {showScrollButtons && (
        <button
          onClick={scrollRight}
          disabled={!canScrollRight}
          className={cn(
            "p-1 text-gray-500 dark:text-gray-400 hover:bg-gray-100 dark:hover:bg-gray-700 rounded-md",
            !canScrollRight && "opacity-30 cursor-not-allowed"
          )}
        >
          <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M9 5l7 7-7 7" />
          </svg>
        </button>
      )}
      
      {/* 折叠标签下拉菜单 */}
      {hiddenTabs.length > 0 && (
        <div className="relative" ref={dropdownRef}>
          <button
            onClick={() => setShowDropdown(!showDropdown)}
            className="p-1 ml-1 text-gray-500 dark:text-gray-400 hover:bg-gray-100 dark:hover:bg-gray-700 rounded-md flex items-center"
            title="更多标签"
          >
            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M4 6h16M4 12h16M4 18h16" />
            </svg>
            <span className="ml-1 text-xs">{hiddenTabs.length}+</span>
          </button>
          
          {showDropdown && (
            <div className="absolute right-0 top-full mt-1 z-50 bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-md shadow-lg py-1 min-w-[200px] max-h-[300px] overflow-y-auto">
              {hiddenTabs.map(tab => (
                <div 
                  key={tab.id}
                  className={cn(
                    "flex items-center justify-between px-3 py-2 hover:bg-gray-100 dark:hover:bg-gray-700 cursor-pointer",
                    activeTabId === tab.id ? "bg-gray-100 dark:bg-gray-700" : ""
                  )}
                  onClick={() => {
                    onTabChange(tab.id);
                    setShowDropdown(false);
                  }}
                >
                  <span className="truncate text-sm">{tab.title || "无标题"}</span>
                  <button
                    onClick={(e) => {
                      e.stopPropagation();
                      onTabClose(tab.id);
                    }}
                    className="p-1 rounded-full hover:bg-gray-200 dark:hover:bg-gray-600 text-gray-500 dark:text-gray-400"
                  >
                    <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M6 18L18 6M6 6l12 12" />
                    </svg>
                  </button>
                </div>
              ))}
            </div>
          )}
        </div>
      )}
      
      {/* 关闭所有标签按钮 */}
      <button
        onClick={onTabCloseAll}
        className="p-1 ml-1 text-gray-500 dark:text-gray-400 hover:bg-gray-100 dark:hover:bg-gray-700 rounded-md"
        title="关闭所有标签"
      >
        <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M6 18L18 6M6 6l12 12" />
        </svg>
      </button>
    </div>
  );
};