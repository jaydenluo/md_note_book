import * as React from "react"
import { Button } from "@/components/ui/button"
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog"
import { Input } from "@/components/ui/input"

// 定义PromptDialog的属性类型
interface PromptDialogProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  title: string
  description?: string
  defaultValue?: string
  cancelText?: string
  confirmText?: string
  onConfirm?: (value: string) => void
  onCancel?: () => void
}

// PromptDialog组件
export function PromptDialog({
  open,
  onOpenChange,
  title,
  description,
  defaultValue = "",
  cancelText = "取消",
  confirmText = "确定",
  onConfirm,
  onCancel,
}: PromptDialogProps) {
  const [value, setValue] = React.useState(defaultValue)
  const inputRef = React.useRef<HTMLInputElement>(null)

  // 当对话框打开时，重置输入值为默认值
  React.useEffect(() => {
    if (open) {
      setValue(defaultValue)
      // 聚焦到输入框
      setTimeout(() => {
        inputRef.current?.focus()
        inputRef.current?.select()
      }, 0)
    }
  }, [open, defaultValue])

  // 处理确认按钮点击
  const handleConfirm = () => {
    onOpenChange(false)
    if (onConfirm) {
      onConfirm(value)
    }
  }

  // 处理取消按钮点击
  const handleCancel = () => {
    onOpenChange(false)
    if (onCancel) {
      onCancel()
    }
  }

  // 处理按键事件，按Enter确认，按Esc取消
  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter') {
      e.preventDefault()
      handleConfirm()
    } else if (e.key === 'Escape') {
      e.preventDefault()
      handleCancel()
    }
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[425px]" style={{ boxShadow: '0 4px 24px rgba(0, 0, 0, 0.2)' }}>
        <DialogHeader>
          <DialogTitle>{title}</DialogTitle>
          {description && <DialogDescription>{description}</DialogDescription>}
        </DialogHeader>
        <div className="py-4">
          <Input
            ref={inputRef}
            value={value}
            onChange={(e) => setValue(e.target.value)}
            onKeyDown={handleKeyDown}
            className="w-full"
            autoFocus
          />
        </div>
        <DialogFooter>
          <Button variant="outline" onClick={handleCancel}>
            {cancelText}
          </Button>
          <Button onClick={handleConfirm} disabled={!value.trim()}>
            {confirmText}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}

// 创建一个全局的PromptDialog管理器
type PromptDialogState = {
  open: boolean
  title: string
  description?: string
  defaultValue?: string
  cancelText?: string
  confirmText?: string
  onConfirm?: (value: string) => void
  onCancel?: () => void
}

// 创建一个Context来管理PromptDialog状态
const PromptDialogContext = React.createContext<{
  showPrompt: (options: Omit<PromptDialogState, 'open'>) => Promise<string | null>
}>({
  showPrompt: () => Promise.resolve(null),
})

// 导出使用PromptDialog的Hook
export const usePromptDialog = () => React.useContext(PromptDialogContext)

// PromptDialog提供者组件
export function PromptDialogProvider({ children }: { children: React.ReactNode }) {
  const [state, setState] = React.useState<PromptDialogState>({
    open: false,
    title: '',
  })

  // 创建一个Promise引用，用于resolve prompt结果
  const promptResolveRef = React.useRef<(value: string | null) => void>()

  // 显示prompt对话框，返回Promise
  const showPrompt = React.useCallback((options: Omit<PromptDialogState, 'open'>): Promise<string | null> => {
    return new Promise((resolve) => {
      promptResolveRef.current = resolve
      setState({
        ...options,
        open: true,
        onConfirm: (value) => {
          if (options.onConfirm) options.onConfirm(value)
          resolve(value)
        },
        onCancel: () => {
          if (options.onCancel) options.onCancel()
          resolve(null)
        }
      })
    })
  }, [])

  // 处理对话框关闭
  const handleOpenChange = (open: boolean) => {
    if (!open) {
      setState((prev) => ({ ...prev, open }))
      // 如果用户点击了关闭按钮，则视为取消
      if (promptResolveRef.current) {
        promptResolveRef.current(null)
      }
    }
  }

  return (
    <PromptDialogContext.Provider value={{ showPrompt }}>
      {children}
      <PromptDialog
        open={state.open}
        onOpenChange={handleOpenChange}
        title={state.title}
        description={state.description}
        defaultValue={state.defaultValue}
        cancelText={state.cancelText}
        confirmText={state.confirmText}
        onConfirm={state.onConfirm}
        onCancel={state.onCancel}
      />
    </PromptDialogContext.Provider>
  )
} 