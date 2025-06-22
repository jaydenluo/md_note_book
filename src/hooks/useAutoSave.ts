import { useEffect, useRef } from 'react'

interface AutoSaveOptions {
  data: any
  onSave: () => Promise<void>
  interval?: number
  debounce?: number
}

export function useAutoSave({
  data,
  onSave,
  interval = 30000, // 默认30秒自动保存
  debounce = 1000   // 默认1秒防抖
}: AutoSaveOptions) {
  const timeoutRef = useRef<number>()
  const intervalRef = useRef<number>()
  const lastSavedRef = useRef<any>(data)

  // 检查数据是否发生变化
  const hasChanges = () => {
    return JSON.stringify(lastSavedRef.current) !== JSON.stringify(data)
  }

  // 保存函数
  const save = async () => {
    if (hasChanges()) {
      await onSave()
      lastSavedRef.current = data
    }
  }

  // 防抖保存
  useEffect(() => {
    if (timeoutRef.current) {
      clearTimeout(timeoutRef.current)
    }

    timeoutRef.current = window.setTimeout(save, debounce)

    return () => {
      if (timeoutRef.current) {
        clearTimeout(timeoutRef.current)
      }
    }
  }, [data])

  // 定时保存
  useEffect(() => {
    intervalRef.current = window.setInterval(save, interval)

    return () => {
      if (intervalRef.current) {
        clearInterval(intervalRef.current)
      }
    }
  }, [interval])

  // 页面关闭前保存
  useEffect(() => {
    const handleBeforeUnload = async (e: BeforeUnloadEvent) => {
      if (hasChanges()) {
        e.preventDefault()
        e.returnValue = ''
        
        try {
          await save()
        } catch (error) {
          console.error('Failed to save before unload:', error)
        }
      }
    }

    window.addEventListener('beforeunload', handleBeforeUnload)
    return () => window.removeEventListener('beforeunload', handleBeforeUnload)
  }, [])

  return { save }
} 