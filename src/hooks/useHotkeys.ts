import { useEffect, useCallback } from 'react'

type HotkeyCallback = (e: KeyboardEvent) => void
type HotkeyMap = Record<string, HotkeyCallback>

const isMac = navigator.platform.toUpperCase().indexOf('MAC') >= 0

export function useHotkeys(hotkeyMap: HotkeyMap) {
  const handleKeyDown = useCallback((e: KeyboardEvent) => {
    const { key, ctrlKey, metaKey, altKey, shiftKey } = e

    // 构建快捷键字符串
    const parts: string[] = []
    if (isMac ? metaKey : ctrlKey) parts.push('Ctrl')
    if (altKey) parts.push('Alt')
    if (shiftKey) parts.push('Shift')
    parts.push(key.toUpperCase())
    
    const hotkey = parts.join('+')
    const callback = hotkeyMap[hotkey]

    if (callback) {
      e.preventDefault()
      callback(e)
    }
  }, [hotkeyMap])

  useEffect(() => {
    document.addEventListener('keydown', handleKeyDown)
    return () => document.removeEventListener('keydown', handleKeyDown)
  }, [handleKeyDown])
}

// 预定义的快捷键帮助文本
export const HOTKEY_HELP = {
  'Ctrl+S': '保存笔记',
  'Ctrl+N': '新建笔记',
  'Ctrl+F': '搜索',
  'Ctrl+P': '切换预览',
  'Ctrl+B': '加粗',
  'Ctrl+I': '斜体',
  'Ctrl+K': '插入链接',
  'Ctrl+L': '插入无序列表',
  'Ctrl+1': '插入标题1',
  'Ctrl+2': '插入标题2',
  'Ctrl+3': '插入标题3',
} 