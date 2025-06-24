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
}

// AlertDialog组件
export function AlertDialog({ open, onOpenChange, title, description, cancelText = "取消", confirmText = "确定", onConfirm, onCancel, type = "alert" }: AlertDialogProps) {
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

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[425px]" style={{ boxShadow: '0 4px 24px rgba(0, 0, 0, 0.2)' }}>
        <DialogHeader>
          <DialogTitle>{title}</DialogTitle>
          {description && <DialogDescription>{description}</DialogDescription>}
        </DialogHeader>
        <DialogFooter>
          {type === "confirm" && (
            <Button variant="outline" onClick={handleCancel}>
              {cancelText}
            </Button>
          )}
          <Button onClick={handleConfirm}>{confirmText}</Button>
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
      <AlertDialog open={state.open} onOpenChange={handleOpenChange} title={state.title} description={state.description} cancelText={state.cancelText} confirmText={state.confirmText} onConfirm={state.onConfirm} onCancel={state.onCancel} type={state.type} />
    </AlertDialogContext.Provider>
  );
}
 