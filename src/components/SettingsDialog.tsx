import React, { useState, useEffect } from 'react';
import { useConfig } from '@stores/configStore';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { motion } from 'framer-motion';
import { Settings, Save } from 'lucide-react';

// 声明Tauri全局变量
declare global {
  interface Window {
    __TAURI__?: any;
  }
}

// 检测是否在Tauri环境中运行
const isTauriApp = typeof window !== 'undefined' && window.__TAURI__ !== undefined;

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
  });

  // 当配置变化时更新本地状态
  useEffect(() => {
    setLocalConfig({
      autoSaveInterval: config.autoSaveInterval,
      dataPath: config.dataPath,
    });
  }, [config, open]);

  // 处理输入变化
  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const { name, value } = e.target;
    
    if (name === 'autoSaveInterval') {
      // 确保自动保存时间是一个非负数
      const numValue = parseInt(value);
      setLocalConfig({
        ...localConfig,
        [name]: isNaN(numValue) ? 0 : Math.max(0, numValue),
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
    if (!isTauriApp) {
      alert('此功能仅在桌面应用中可用');
      return;
    }

    try {
      // 动态导入Tauri对话框API
      const { dialog } = await import('@tauri-apps/api');
      const { path } = await import('@tauri-apps/api');
      
      // 打开文件夹选择对话框
      const selected = await dialog.open({
        directory: true,
        multiple: false,
        defaultPath: config.lastSelectedPath || await path.homeDir(),
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

  // 保存设置
  const saveSettings = () => {
    updateConfig({
      autoSaveInterval: localConfig.autoSaveInterval,
      dataPath: localConfig.dataPath,
    });
    onOpenChange(false);
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl bg-gray-200 dark:bg-gray-900 rounded-lg border-0 shadow-xl">
        <DialogHeader className="border-b border-gray-300 dark:border-gray-800 pb-4 mb-6">
          <div className="flex items-center gap-2">
            <Settings className="w-5 h-5 text-blue-600" />
            <DialogTitle className="text-xl font-medium">设置</DialogTitle>
          </div>
        </DialogHeader>
        
        <div className="space-y-8 px-1">
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
                  onChange={handleChange}
                  placeholder="./data"
                  className="flex-1 bg-white dark:bg-gray-800 border-gray-300 dark:border-gray-700"
                  readOnly={isTauriApp}
                />
                                  <Button 
                    variant="outline" 
                    onClick={selectFolder}
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
        </div>
        
        <DialogFooter className="mt-8 pt-4 border-t border-gray-200 dark:border-gray-800">
          <Button 
            variant="outline" 
            onClick={() => onOpenChange(false)} 
            className="min-w-[80px] bg-white border-gray-300 hover:bg-gray-100 dark:bg-gray-800 dark:border-gray-700"
          >
            取消
          </Button>
          <Button 
            onClick={saveSettings} 
            className="min-w-[80px] bg-blue-600 hover:bg-blue-700 flex items-center gap-1"
          >
            <Save className="w-4 h-4" />
            保存
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
} 