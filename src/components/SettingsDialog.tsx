import React, { useState, useEffect } from 'react';
import { useConfig, CODE_THEMES } from '@stores/configStore';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { motion } from 'framer-motion';
import { Settings, Save, RotateCcw } from 'lucide-react';
import { storage } from '@services/storage';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { isTauriApp, tauriEnvironment } from '@utils/tauri';

interface SettingsDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

export function SettingsDialog({ open, onOpenChange }: SettingsDialogProps) {
  const { config, updateConfig } = useConfig();
  
  // 本地状态，用于表单输入
  const [localConfig, setLocalConfig] = useState({
    autoSaveInterval: config.autoSaveInterval,
    dataPath: config.dataPath,
    codeTheme: config.codeTheme,
  });
  
  // 搜索索引管理状态
  const [isRebuildingIndex, setIsRebuildingIndex] = useState(false);
  const [indexRebuildSuccess, setIndexRebuildSuccess] = useState<boolean | null>(null);

  // 当配置变化时更新本地状态
  useEffect(() => {
    setLocalConfig({
      autoSaveInterval: config.autoSaveInterval,
      dataPath: config.dataPath,
      codeTheme: config.codeTheme,
    });
  }, [config, open]);

  // 处理输入变化
  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const { name, value, type, checked } = e.target;
    
    if (name === 'autoSaveInterval') {
      // 确保自动保存时间是一个非负数
      const numValue = parseInt(value);
      setLocalConfig({
        ...localConfig,
        [name]: isNaN(numValue) ? 0 : Math.max(0, numValue),
      });
    } else if (type === 'checkbox') {
      setLocalConfig({
        ...localConfig,
        [name]: checked,
      });
      

    } else {
      setLocalConfig({
        ...localConfig,
        [name]: value,
      });
    }
  };

  // 选择文件夹路径（仅在Tauri环境中可用）
  const selectFolder = async () => {
    if (!(await isTauriApp())) {
      alert('此功能仅在桌面应用中可用');
      return;
    }

    try {
      // 动态导入Tauri对话框API
      const { open } = await import('@tauri-apps/plugin-dialog');
      const { homeDir } = await import('@tauri-apps/api/path');
      
      // 打开文件夹选择对话框
      const selected = await open({
        directory: true,
        multiple: false,
        defaultPath: config.lastSelectedPath || await homeDir(),
      });

      if (selected) {
        // 更新本地状态和配置
        const folderPath = selected as string;
        setLocalConfig({
          ...localConfig,
          dataPath: folderPath,
        });
        
        // 保存最后选择的路径
        updateConfig({ 
          lastSelectedPath: folderPath,
          dataPath: folderPath,
        });
      }
    } catch (error) {
      console.error('选择文件夹失败:', error);
    }
  };

  // 处理主题选择变化
  const handleThemeChange = (mode: 'light' | 'dark', value: string) => {
    setLocalConfig({
      ...localConfig,
      codeTheme: {
        ...localConfig.codeTheme,
        [mode]: value,
      },
    });
  };

  // 处理主题背景色选项变化
  const handleNoBackgroundChange = (value: boolean) => {
    setLocalConfig({
      ...localConfig,
      codeTheme: {
        ...localConfig.codeTheme,
        noBackground: value,
      },
    });
  };
  


  // 保存设置
  const saveSettings = () => {
    updateConfig({
      autoSaveInterval: localConfig.autoSaveInterval,
      dataPath: localConfig.dataPath,
      codeTheme: localConfig.codeTheme,
    });
    onOpenChange(false);
  };

  const handleDataPathChange = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const newPath = event.target.value;
    if (!tauriEnvironment.isTauri) {
      console.warn('非Tauri环境不支持修改数据路径');
      return;
    }
    // 更新本地状态
    setLocalConfig({
      ...localConfig,
      dataPath: newPath,
    });

    // 保存配置
    updateConfig({
      dataPath: newPath,
    });
  };

  const handleSelectPath = async () => {
    if (!tauriEnvironment.isTauri) {
      alert('此功能仅在桌面应用中可用');
      return;
    }

    try {
      const { open } = await import('@tauri-apps/plugin-dialog');
      const { homeDir } = await import('@tauri-apps/api/path');

      const selected = await open({
        directory: true,
        multiple: false,
        defaultPath: config.lastSelectedPath || await homeDir(),
      });

      if (selected) {
        const folderPath = selected as string;
        setLocalConfig({
          ...localConfig,
          dataPath: folderPath,
        });
        updateConfig({
          lastSelectedPath: folderPath,
          dataPath: folderPath,
        });
      }
    } catch (error) {
      console.error('选择文件夹失败:', error);
    }
  };

  // 重建搜索索引
  const handleRebuildSearchIndex = async () => {
    if (!tauriEnvironment.isTauri) {
      alert('搜索索引功能仅在桌面应用中可用');
      return;
    }

    try {
      setIsRebuildingIndex(true);
      setIndexRebuildSuccess(null);
      
      await storage.rebuildSearchIndex();
      
      setIndexRebuildSuccess(true);
      setTimeout(() => setIndexRebuildSuccess(null), 3000);
    } catch (error) {
      console.error('重建搜索索引失败:', error);
      setIndexRebuildSuccess(false);
      setTimeout(() => setIndexRebuildSuccess(null), 3000);
    } finally {
      setIsRebuildingIndex(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent 
        className="max-w-2xl bg-gray-200 dark:bg-gray-900 rounded-lg border-0 shadow-xl"
        aria-describedby="settings-dialog-description"
      >
        <DialogHeader className="border-b border-gray-300 dark:border-gray-800 pb-4 mb-6">
          <div className="flex items-center gap-2">
            <Settings className="w-5 h-5 text-blue-600" />
            <DialogTitle className="text-xl font-medium">设置</DialogTitle>
          </div>
        </DialogHeader>
        
        <div 
          id="settings-dialog-description" 
          className="space-y-8 px-1"
        >
          {/* 自动保存设置 */}
          <motion.div 
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ duration: 0.3 }}
            className="flex items-center"
          >
            <div className="w-1/4 text-right pr-6">
              <span className="text-sm font-medium">自动保存间隔</span>
            </div>
            <div className="w-3/4 flex items-center gap-3">
                              <Input
                  id="autoSaveInterval"
                  name="autoSaveInterval"
                  type="number"
                  min="0"
                  value={localConfig.autoSaveInterval}
                  onChange={handleChange}
                  className="w-24 bg-white dark:bg-gray-800 border-gray-300 dark:border-gray-700"
                />
              <span className="text-sm text-gray-500 dark:text-gray-400">
                毫秒 (0表示不自动保存)
              </span>
            </div>
          </motion.div>
          
          {/* 数据存储设置 */}
          <motion.div 
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ duration: 0.3, delay: 0.1 }}
            className="flex items-start"
          >
            <div className="w-1/4 text-right pr-6 pt-2">
              <span className="text-sm font-medium">数据保存路径</span>
            </div>
            <div className="w-3/4 space-y-2">
              <div className="flex items-center gap-2">
                <Input
                  id="dataPath"
                  name="dataPath"
                  value={localConfig.dataPath}
                  onChange={handleDataPathChange}
                  placeholder="./data"
                  className="flex-1 bg-white dark:bg-gray-800 border-gray-300 dark:border-gray-700"
                  readOnly={tauriEnvironment.isTauri}
                />
                                  <Button 
                    variant="outline" 
                    onClick={handleSelectPath}
                    className="px-4 bg-white border-blue-300 hover:bg-blue-50 dark:bg-gray-800 dark:border-blue-800 dark:hover:bg-blue-900"
                  >
                    浏览
                  </Button>
              </div>
              <p className="text-xs text-gray-500 dark:text-gray-400">
                笔记和目录将保存在同一位置，默认为程序目录下的data文件夹
              </p>
            </div>
          </motion.div>
          


          {/* 代码高亮主题设置 */}
          <motion.div 
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ duration: 0.3, delay: 0.3 }}
            className="flex items-start"
          >
            <div className="w-1/4 text-right pr-6 pt-2">
              <span className="text-sm font-medium">代码高亮主题</span>
            </div>
            <div className="w-3/4 space-y-4">
              {/* 亮色主题选择 */}
              <div className="flex items-center gap-3">
                <span className="text-sm text-gray-500 dark:text-gray-400 w-20">亮色模式</span>
                <Select
                  value={localConfig.codeTheme.light}
                  onValueChange={(value) => handleThemeChange('light', value)}
                >
                  <SelectTrigger className="w-[200px] bg-white dark:bg-gray-800">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent className="bg-white dark:bg-gray-800 border border-gray-300 dark:border-gray-700 shadow-lg">
                    {CODE_THEMES.light.map((theme) => (
                      <SelectItem key={theme.id} value={theme.id}>
                        {theme.name}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              {/* 暗色主题选择 */}
              <div className="flex items-center gap-3">
                <span className="text-sm text-gray-500 dark:text-gray-400 w-20">暗色模式</span>
                <Select
                  value={localConfig.codeTheme.dark}
                  onValueChange={(value) => handleThemeChange('dark', value)}
                >
                  <SelectTrigger className="w-[200px] bg-white dark:bg-gray-800">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent className="bg-white dark:bg-gray-800 border border-gray-300 dark:border-gray-700 shadow-lg">
                    {CODE_THEMES.dark.map((theme) => (
                      <SelectItem key={theme.id} value={theme.id}>
                        {theme.name}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              
              {/* 透明背景选项 */}
                <div className="flex items-center">
                  <input
                  id="noBackground"
                    type="checkbox"
                    checked={localConfig.codeTheme.noBackground}
                    onChange={(e) => handleNoBackgroundChange(e.target.checked)}
                  className="h-4 w-4 rounded border-gray-300 text-blue-600 focus:ring-blue-500"
                  />
                <label htmlFor="noBackground" className="ml-2 block text-sm text-gray-500 dark:text-gray-400">
                  代码块透明背景
                  </label>
              </div>
            </div>
          </motion.div>

          {/* 搜索索引管理 */}
          {tauriEnvironment.isTauri && (
            <motion.div 
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              transition={{ duration: 0.3, delay: 0.4 }}
              className="flex items-start"
            >
              <div className="w-1/4 text-right pr-6 pt-2">
                <span className="text-sm font-medium">搜索索引</span>
              </div>
              <div className="w-3/4 space-y-4">
                <div className="flex items-center gap-3">
                  <Button 
                    onClick={handleRebuildSearchIndex}
                    disabled={isRebuildingIndex}
                    variant="outline"
                    className="flex items-center gap-2 bg-white border-gray-300 hover:bg-gray-50 dark:bg-gray-800 dark:border-gray-700 dark:hover:bg-gray-700"
                  >
                    <RotateCcw className={`w-4 h-4 ${isRebuildingIndex ? 'animate-spin' : ''}`} />
                    {isRebuildingIndex ? '重建中...' : '重建索引'}
                  </Button>
                  
                  {indexRebuildSuccess !== null && (
                    <motion.div
                      initial={{ opacity: 0, scale: 0.8 }}
                      animate={{ opacity: 1, scale: 1 }}
                      exit={{ opacity: 0, scale: 0.8 }}
                      className={`text-sm px-3 py-1 rounded-full ${
                        indexRebuildSuccess 
                          ? 'bg-green-100 text-green-700 dark:bg-green-900 dark:text-green-300' 
                          : 'bg-red-100 text-red-700 dark:bg-red-900 dark:text-red-300'
                      }`}
                    >
                      {indexRebuildSuccess ? '重建成功' : '重建失败'}
                    </motion.div>
                  )}
                </div>
                
                <p className="text-xs text-gray-500 dark:text-gray-400">
                  重建全文搜索索引可以提高搜索性能和准确性。
                  如果搜索结果不准确或缺失，请尝试重建索引。
                </p>
              </div>
            </motion.div>
          )}
        </div>
        
        <DialogFooter className="mt-8 border-t border-gray-300 dark:border-gray-800 pt-4">
          <Button 
            onClick={saveSettings} 
            className="bg-blue-600 hover:bg-blue-700 text-white flex items-center gap-2"
          >
            <Save className="w-4 h-4" />
            保存设置
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
} 