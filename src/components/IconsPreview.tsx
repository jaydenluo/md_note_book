import React, { useState, useMemo } from 'react';
import * as Icons from 'lucide-react';
import { Input } from './ui/input';
import { ScrollArea } from './ui/scroll-area';
import { Button } from './ui/button';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from './ui/dialog';

// 图标预览组件属性接口
interface IconsPreviewProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

// 获取所有图标
const iconList = Object.entries(Icons).filter(([name]) => 
  name !== 'createLucideIcon' && 
  name !== 'default' &&
  typeof Icons[name as keyof typeof Icons] === 'function'
);

export function IconsPreview({ open, onOpenChange }: IconsPreviewProps) {
  const [searchQuery, setSearchQuery] = useState('');

  // 过滤图标
  const filteredIcons = useMemo(() => {
    const query = searchQuery.toLowerCase();
    return iconList.filter(([name]) => 
      name.toLowerCase().includes(query)
    );
  }, [searchQuery]);

  // 复制图标导入代码
  const copyIconImport = (iconName: string) => {
    const importText = `import { ${iconName} } from 'lucide-react';`;
    navigator.clipboard.writeText(importText);
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-3xl max-h-[80vh] flex flex-col">
        <DialogHeader>
          <DialogTitle>Lucide 图标预览</DialogTitle>
        </DialogHeader>
        
        <div className="mb-4">
          <Input
            type="text"
            placeholder="搜索图标..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full"
          />
        </div>

        <ScrollArea className="flex-1">
          <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-6 gap-4 p-4">
            {filteredIcons.map(([name, Icon]) => (
              <Button
                key={name}
                variant="outline"
                className="flex flex-col items-center justify-center p-4 h-auto gap-2 hover:bg-gray-100 dark:hover:bg-gray-800"
                onClick={() => copyIconImport(name)}
                title={`点击复制导入代码: import { ${name} } from 'lucide-react'`}
              >
                {React.createElement(Icon as any, { size: 24 })}
                <span className="text-xs text-center break-all">{name}</span>
              </Button>
            ))}
          </div>
        </ScrollArea>
      </DialogContent>
    </Dialog>
  );
} 