import { create } from 'zustand'
import { persist } from 'zustand/middleware'
import { useEffect } from 'react'

// 导入主题样式（使用 Vite 的方式）
import githubTheme from '../styles/themes/github.min.css?url'
import githubDarkTheme from '../styles/themes/github-dark.min.css?url'
import atomOneDarkTheme from '../styles/themes/atom-one-dark.min.css?url'
import atomOneLightTheme from '../styles/themes/atom-one-light.min.css?url'
import monokaiTheme from '../styles/themes/monokai.min.css?url'
import nordTheme from '../styles/themes/nord.min.css?url'
import vsTheme from '../styles/themes/vs.min.css?url'

interface ThemeState {
  isDark: boolean
  toggleTheme: () => void
}

export const useTheme = create<ThemeState>()(
  persist(
    (set) => ({
      isDark: false,
      toggleTheme: () => set((state) => ({ isDark: !state.isDark })),
    }),
    {
      name: 'theme-storage',
    }
  )
)

// 初始化主题
if (typeof window !== 'undefined') {
  // 检查系统主题
  if (window.matchMedia('(prefers-color-scheme: dark)').matches) {
    useTheme.setState({ isDark: true })
  }

  // 监听系统主题变化
  window.matchMedia('(prefers-color-scheme: dark)').addEventListener('change', (e) => {
    useTheme.setState({ isDark: e.matches })
  })
}

// 主题映射表，将主题ID映射到对应的URL
const THEME_MAP: Record<string, string> = {
  'github': githubTheme,
  'github-dark': githubDarkTheme,
  'atom-one-dark': atomOneDarkTheme,
  'atom-one-light': atomOneLightTheme,
  'monokai': monokaiTheme,
  'nord': nordTheme,
  'vs': vsTheme,
}

// 当前激活的主题样式元素
let currentThemeLink: HTMLLinkElement | null = null;
// 当前主题ID
let currentThemeId: string | null = null;
// 防止重复切换
let isThemeSwitching = false;

/**
 * 创建一个样式元素，用于覆盖主题的背景色
 */
const createNoBackgroundStyle = () => {
  // 检查是否已存在
  let styleElement = document.getElementById('code-theme-no-bg');
  if (!styleElement) {
    styleElement = document.createElement('style');
    styleElement.id = 'code-theme-no-bg';
    document.head.appendChild(styleElement);
  }
  
  // 添加样式规则，覆盖所有代码块的背景色
  styleElement.textContent = `
    /* 覆盖代码块背景色 */
    pre, code, .hljs, .ProseMirror pre, .markdown-body pre {
      background-color: transparent !important;
    }
    
    /* 覆盖内联代码背景色 */
    :not(pre) > code, .ProseMirror :not(pre) > code, .markdown-body :not(pre) > code {
      background-color: transparent !important;
    }
  `;
};

/**
 * 移除背景色覆盖样式
 */
const removeNoBackgroundStyle = () => {
  const styleElement = document.getElementById('code-theme-no-bg');
  if (styleElement) {
    styleElement.remove();
  }
};

/**
 * 切换代码高亮主题
 * @param themeId highlight.js的主题ID
 * @param noBackground 是否禁用背景色
 */
export const switchCodeTheme = (themeId: string, noBackground: boolean = false) => {
  // 防止重复切换
  if (isThemeSwitching || themeId === currentThemeId) {
    return;
  }
  
  try {
    isThemeSwitching = true;
    console.log(`切换代码高亮主题到: ${themeId}${noBackground ? ' (无背景色)' : ''}`);
    
    // 获取主题URL
    const themeUrl = THEME_MAP[themeId];
    if (!themeUrl) {
      console.error(`未找到主题: ${themeId}`);
      isThemeSwitching = false;
      return;
    }
    
    // 移除旧的主题样式
    if (currentThemeLink) {
      currentThemeLink.remove();
    }
    
    // 创建新的主题样式链接
    const link = document.createElement('link');
    link.rel = 'stylesheet';
    link.href = themeUrl;
    link.setAttribute('data-highlight-theme', themeId);
    document.head.appendChild(link);
    
    // 更新当前主题引用
    currentThemeLink = link;
    currentThemeId = themeId;
    
    // 添加主题类到文档根元素
    document.documentElement.classList.forEach(cls => {
      if (cls.startsWith('theme-')) {
        document.documentElement.classList.remove(cls);
      }
    });
    document.documentElement.classList.add(`theme-${themeId}`);
    
    // 处理背景色
    if (noBackground) {
      createNoBackgroundStyle();
    } else {
      removeNoBackgroundStyle();
    }
    
    // 延迟一点时间确保样式已加载
    setTimeout(() => {
      isThemeSwitching = false;
    }, 300);
  } catch (error) {
    console.error('切换主题失败:', error);
    isThemeSwitching = false;
  }
}

/**
 * 根据系统主题自动切换代码高亮主题的Hook
 * @param lightTheme 亮色主题ID
 * @param darkTheme 暗色主题ID
 * @param noBackground 是否禁用背景色
 */
export const useAutoCodeTheme = (lightTheme: string, darkTheme: string, noBackground: boolean = false) => {
  useEffect(() => {
    // 防止重复切换
    let lastTheme: string | null = null;
    
    const updateTheme = () => {
      const isDark = document.documentElement.classList.contains('dark');
      const newTheme = isDark ? darkTheme : lightTheme;
      
      // 如果主题没有变化，跳过
      if (newTheme === lastTheme) {
        return;
      }
      
      lastTheme = newTheme;
      switchCodeTheme(newTheme, noBackground);
    };
    
    // 初始化主题
    updateTheme();
    
    // 监听系统主题变化
    const observer = new MutationObserver(() => {
      if (!isThemeSwitching) {
        updateTheme();
      }
    });
    
    observer.observe(document.documentElement, {
      attributes: true,
      attributeFilter: ['class'],
    });
    
    return () => observer.disconnect();
  }, [lightTheme, darkTheme, noBackground]);
}

// 声明全局 hljs
declare global {
  interface Window {
    hljs: typeof import('highlight.js').default
  }
} 