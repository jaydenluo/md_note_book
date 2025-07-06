import * as React from "react";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";

// 定义AlertDialog的属性类型
interface AlertDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  title: string;
  description?: string;
  cancelText?: string;
  confirmText?: string;
  onConfirm?: () => void;
  onCancel?: () => void;
  type?: "alert" | "confirm";
  variant?: "default" | "destructive";
}

// AlertDialog组件
export function AlertDialog({ open, onOpenChange, title, description, cancelText = "取消", confirmText = "确定", onConfirm, onCancel, type = "alert", variant = "default" }: AlertDialogProps) {
  // 处理确认按钮点击
  const handleConfirm = () => {
    onOpenChange(false);
    if (onConfirm) {
      onConfirm();
    }
  };

  // 处理取消按钮点击
  const handleCancel = () => {
    onOpenChange(false);
    if (onCancel) {
      onCancel();
    }
  };

  // 判断是否为删除操作
  const isDestructive = variant === "destructive" || title.includes("删除") || title.includes("删除");

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className={`sm:max-w-[425px] ${isDestructive ? 'border-red-200 dark:border-red-800' : ''}`} style={{ boxShadow: '0 4px 24px rgba(0, 0, 0, 0.2)' }}>
        <DialogHeader className="text-center">
          {isDestructive && (
            <div className="mx-auto mb-4 flex h-12 w-12 items-center justify-center rounded-full bg-red-100 dark:bg-red-900/20">
              <svg className="h-6 w-6 text-red-600 dark:text-red-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-2.5L13.732 4c-.77-.833-1.964-.833-2.732 0L3.732 16.5c-.77.833.192 2.5 1.732 2.5z" />
              </svg>
            </div>
          )}
          <DialogTitle className={`text-lg font-semibold ${isDestructive ? 'text-red-900 dark:text-red-100' : ''}`}>
            {title}
          </DialogTitle>
          {description && (
            <DialogDescription className={`text-sm ${isDestructive ? 'text-red-700 dark:text-red-300' : 'text-gray-600 dark:text-gray-400'}`}>
              {description}
            </DialogDescription>
          )}
        </DialogHeader>
        <DialogFooter className="gap-3">
          {type === "confirm" && (
            <Button 
              variant="outline" 
              onClick={handleCancel}
              className="min-w-[80px]"
            >
              {cancelText}
            </Button>
          )}
          <Button 
            onClick={handleConfirm}
            className={`min-w-[80px] ${isDestructive ? 'bg-red-600 hover:bg-red-700 dark:bg-red-600 dark:hover:bg-red-700' : ''}`}
          >
            {confirmText}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

// 创建一个全局的AlertDialog管理器
type AlertDialogState = {
  open: boolean;
  title: string;
  description?: string;
  cancelText?: string;
  confirmText?: string;
  onConfirm?: () => void;
  onCancel?: () => void;
  type: "alert" | "confirm";
  variant?: "default" | "destructive";
};

// 创建一个Context来管理AlertDialog状态
const AlertDialogContext = React.createContext<{
  showAlert: (options: Omit<AlertDialogState, "open" | "type">) => void;
  showConfirm: (options: Omit<AlertDialogState, "open" | "type">) => Promise<boolean>;
}>({
  showAlert: () => {},
  showConfirm: () => Promise.resolve(false),
});

// 导出使用AlertDialog的Hook
export const useAlertDialog = () => React.useContext(AlertDialogContext);

// AlertDialog提供者组件
export function AlertDialogProvider({ children }: { children: React.ReactNode }) {
  const [state, setState] = React.useState<AlertDialogState>({
    open: false,
    title: "",
    type: "alert",
  });

  // 创建一个Promise引用，用于resolve confirm结果
  const confirmResolveRef = React.useRef<(value: boolean) => void>();

  // 显示alert对话框
  const showAlert = React.useCallback((options: Omit<AlertDialogState, "open" | "type">) => {
    setState({
      ...options,
      open: true,
      type: "alert",
    });
  }, []);

  // 显示confirm对话框，返回Promise
  const showConfirm = React.useCallback((options: Omit<AlertDialogState, "open" | "type">): Promise<boolean> => {
    return new Promise((resolve) => {
      confirmResolveRef.current = resolve;
      setState({
        ...options,
        open: true,
        type: "confirm",
        onConfirm: () => {
          if (options.onConfirm) options.onConfirm();
          resolve(true);
        },
        onCancel: () => {
          if (options.onCancel) options.onCancel();
          resolve(false);
        },
      });
    });
  }, []);

  // 处理对话框关闭
  const handleOpenChange = (open: boolean) => {
    if (!open) {
      setState((prev) => ({ ...prev, open }));
      // 如果是confirm对话框，且用户点击了关闭按钮，则视为取消
      if (state.type === "confirm" && confirmResolveRef.current) {
        confirmResolveRef.current(false);
      }
    }
  };

  return (
    <AlertDialogContext.Provider value={{ showAlert, showConfirm }}>
      {children}
      <AlertDialog open={state.open} onOpenChange={handleOpenChange} title={state.title} description={state.description} cancelText={state.cancelText} confirmText={state.confirmText} onConfirm={state.onConfirm} onCancel={state.onCancel} type={state.type} variant={state.variant} />
    </AlertDialogContext.Provider>
  );
}
 