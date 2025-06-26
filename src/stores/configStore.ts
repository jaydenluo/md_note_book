import { create } from 'zustand'
import { persist } from 'zustand/middleware'

export interface AppConfig {
  // 自动保存时间（毫秒），0表示不自动保存
  autoSaveInterval: number;
  // 数据保存路径（笔记和目录共用）
  dataPath: string;
  // 上次选择的文件路径
  lastSelectedPath: string;
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