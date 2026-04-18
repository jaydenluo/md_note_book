import { useEffect, useState } from 'react'
import type { Category } from '@stores/categoryStore'
import type { Note } from '@stores/noteStore'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'
import { Input } from '@/components/ui/input'
import { Textarea } from '@/components/ui/textarea'

export interface ReminderCardFormValues {
  title: string
  categoryId: string
  dueDate: string
  content: string
  reminderEnabled: boolean
}

interface ReminderCardDialogProps {
  open: boolean
  categories: Category[]
  note?: Note | null
  onOpenChange: (open: boolean) => void
  onSave: (values: ReminderCardFormValues) => void
  onDelete?: () => void
}

const EMPTY_VALUES: ReminderCardFormValues = {
  title: '',
  categoryId: '',
  dueDate: '',
  content: '',
  reminderEnabled: false,
}

export function ReminderCardDialog({
  open,
  categories,
  note,
  onOpenChange,
  onSave,
  onDelete,
}: ReminderCardDialogProps) {
  const [values, setValues] = useState<ReminderCardFormValues>(EMPTY_VALUES)

  useEffect(() => {
    if (!note) {
      setValues((current) => ({
        ...EMPTY_VALUES,
        categoryId: current.categoryId || categories[0]?.id || '',
      }))
      return
    }

    setValues({
      title: note.title,
      categoryId: note.categoryId || categories[0]?.id || '',
      dueDate: note.dueDate ? note.dueDate.toISOString().slice(0, 10) : '',
      content: note.content,
      reminderEnabled: !!note.reminderEnabled,
    })
  }, [categories, note])

  const updateField = <K extends keyof ReminderCardFormValues>(
    key: K,
    value: ReminderCardFormValues[K],
  ) => {
    setValues((current) => ({ ...current, [key]: value }))
  }

  const handleSave = () => {
    onSave(values)
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-2xl">
        <DialogHeader>
          <DialogTitle>{note ? '编辑提醒卡片' : '新建卡片'}</DialogTitle>
          <DialogDescription>
            在备注里记录账号、密码、域名、IP 或操作说明。
          </DialogDescription>
        </DialogHeader>

        <div className="grid gap-4">
          <label className="grid gap-2 text-sm font-medium text-gray-700 dark:text-gray-200">
            标题
            <Input
              aria-label="标题"
              value={values.title}
              onChange={(event) => updateField('title', event.target.value)}
            />
          </label>

          <label className="grid gap-2 text-sm font-medium text-gray-700 dark:text-gray-200">
            分类
            <select
              aria-label="分类"
              value={values.categoryId}
              onChange={(event) => updateField('categoryId', event.target.value)}
              className="h-10 rounded-md border border-gray-300 bg-white px-3 text-sm dark:border-gray-700 dark:bg-gray-800"
            >
              {categories.map((category) => (
                <option key={category.id} value={category.id}>
                  {category.name}
                </option>
              ))}
            </select>
          </label>

          <label className="grid gap-2 text-sm font-medium text-gray-700 dark:text-gray-200">
            到期日期
            <Input
              aria-label="到期日期"
              type="date"
              value={values.dueDate}
              onChange={(event) => updateField('dueDate', event.target.value)}
            />
          </label>

          <label className="grid gap-2 text-sm font-medium text-gray-700 dark:text-gray-200">
            备注
            <Textarea
              aria-label="备注"
              rows={6}
              value={values.content}
              onChange={(event) => updateField('content', event.target.value)}
            />
          </label>

          <label className="flex items-center justify-between rounded-md border border-gray-200 px-4 py-3 text-sm dark:border-gray-700">
            <span>启用提醒</span>
            <input
              aria-label="启用提醒"
              type="checkbox"
              checked={values.reminderEnabled}
              onChange={(event) => updateField('reminderEnabled', event.target.checked)}
            />
          </label>
        </div>

        <DialogFooter className="flex items-center justify-between gap-2 sm:justify-between">
          <div>
            {note && onDelete ? (
              <button
                type="button"
                onClick={onDelete}
                className="rounded-md bg-red-100 px-4 py-2 text-sm font-medium text-red-700 transition-colors hover:bg-red-200"
              >
                删除
              </button>
            ) : null}
          </div>
          <div className="flex gap-2">
            <button
              type="button"
              onClick={() => onOpenChange(false)}
              className="rounded-md bg-gray-100 px-4 py-2 text-sm font-medium text-gray-700 transition-colors hover:bg-gray-200 dark:bg-gray-800 dark:text-gray-200"
            >
              取消
            </button>
            <button
              type="button"
              onClick={handleSave}
              className="rounded-md bg-blue-600 px-4 py-2 text-sm font-medium text-white transition-colors hover:bg-blue-700"
            >
              保存
            </button>
          </div>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}
