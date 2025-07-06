import { create } from 'zustand'
import { persist } from 'zustand/middleware'

// 代码高亮主题列表
export const CODE_THEMES = {
  // 亮色主题
  light: [
    { id: 'github', name: 'GitHub Light' },
    { id: 'atom-one-light', name: 'Atom One Light' },
    { id: 'vs', name: 'Visual Studio' },
  ],
  // 暗色主题
  dark: [
    { id: 'atom-one-dark', name: 'One Dark' },
    { id: 'github-dark', name: 'GitHub Dark' },
    { id: 'monokai', name: 'Monokai' },
    { id: 'nord', name: 'Nord' },
  ]
} as const;

export interface AppConfig {
  // 自动保存时间（毫秒），0表示不自动保存
  autoSaveInterval: number;
  // 数据保存路径（笔记和目录共用）
  dataPath: string;
  // 上次选择的文件路径
  lastSelectedPath: string;
  // 代码高亮主题
  codeTheme: {
    light: string; // 亮色模式下的主题
    dark: string;  // 暗色模式下的主题
    noBackground: boolean; // 是否禁用主题背景色
  };
}

interface ConfigStore {
  config: AppConfig;
  // 更新整个配置
  updateConfig: (config: Partial<AppConfig>) => void;
  // 更新单个配置项
  updateConfigItem: <K extends keyof AppConfig>(key: K, value: AppConfig[K]) => void;
  // 重置配置为默认值
  resetConfig: () => void;
}

// 默认配置
const DEFAULT_CONFIG: AppConfig = {
  autoSaveInterval: 800, // 默认800毫秒自动保存
  dataPath: './data', // 默认为程序目录下的data文件夹
  lastSelectedPath: '', // 上次选择的路径，用于文件选择器的默认路径
  codeTheme: {
    light: 'github', // 默认亮色主题：GitHub Light（清晰易读）
    dark: 'atom-one-dark',      // 默认暗色主题：One Dark（护眼且美观）
    noBackground: false, // 默认启用主题背景色
  },
};

// 创建配置存储，使用persist中间件实现持久化
export const useConfig = create<ConfigStore>()(
  persist(
    (set) => ({
      config: { ...DEFAULT_CONFIG },
      
      updateConfig: (newConfig) => 
        set((state) => ({ 
          config: { ...state.config, ...newConfig } 
        })),
      
      updateConfigItem: (key, value) => 
        set((state) => ({
          config: {
            ...state.config,
            [key]: value
          }
        })),
      
      resetConfig: () => 
        set({ config: { ...DEFAULT_CONFIG } }),
    }),
    {
      name: 'notebook-config', // localStorage的键名
      // 只持久化config字段
      partialize: (state) => ({ config: state.config }),
    }
  )
); 