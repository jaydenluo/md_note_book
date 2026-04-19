import { useEffect, useState } from 'react'
import type { Category } from '@stores/categoryStore'
import type { Note } from '@stores/noteStore'
import {
  Dialog,
  DialogContent,
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

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent
        aria-describedby={undefined}
        className="overflow-hidden border-0 bg-white/95 p-0 shadow-2xl shadow-slate-900/30 sm:max-w-2xl dark:bg-slate-950/95"
      >
        <div className="bg-gradient-to-r from-blue-600 via-sky-600 to-indigo-600 px-6 py-5 text-white">
          <DialogHeader>
            <DialogTitle className="text-2xl font-semibold tracking-tight">
              {note ? '编辑提醒卡片' : '新建提醒卡片'}
            </DialogTitle>
          </DialogHeader>
        </div>

        <div className="grid gap-5 px-6 py-6">
          <div className="grid gap-5 sm:grid-cols-2">
            <label className="grid gap-2 text-sm font-medium text-slate-700 dark:text-slate-200">
              标题
              <Input
                aria-label="标题"
                value={values.title}
                onChange={(event) => updateField('title', event.target.value)}
                className="h-11 rounded-xl border-slate-200 bg-slate-50 dark:border-slate-700 dark:bg-slate-900"
              />
            </label>

            <label className="grid gap-2 text-sm font-medium text-slate-700 dark:text-slate-200">
              分类
              <select
                aria-label="分类"
                value={values.categoryId}
                onChange={(event) => updateField('categoryId', event.target.value)}
                className="h-11 rounded-xl border border-slate-200 bg-slate-50 px-3 text-sm dark:border-slate-700 dark:bg-slate-900"
              >
                {categories.map((category) => (
                  <option key={category.id} value={category.id}>
                    {category.name}
                  </option>
                ))}
              </select>
            </label>
          </div>

          <div className="grid gap-5 sm:grid-cols-2">
            <label className="grid gap-2 text-sm font-medium text-slate-700 dark:text-slate-200">
              到期日期
              <Input
                aria-label="到期日期"
                type="date"
                value={values.dueDate}
                onChange={(event) => updateField('dueDate', event.target.value)}
                className="h-11 rounded-xl border-slate-200 bg-slate-50 dark:border-slate-700 dark:bg-slate-900"
              />
            </label>

            <label className="flex min-h-[108px] items-start justify-between rounded-2xl border border-slate-200 bg-slate-50 px-4 py-4 text-sm font-medium text-slate-700 dark:border-slate-700 dark:bg-slate-900 dark:text-slate-200">
              <div className="pr-4">
                <div className="text-base font-semibold">启用提醒</div>
                <div className="mt-2 text-xs font-normal leading-6 text-slate-500 dark:text-slate-400">
                  默认按 30 天 / 7 天 / 当天触发
                </div>
              </div>
              <input
                aria-label="启用提醒"
                type="checkbox"
                checked={values.reminderEnabled}
                onChange={(event) => updateField('reminderEnabled', event.target.checked)}
                className="mt-1 h-5 w-5 shrink-0 rounded border-slate-300 text-blue-600 focus:ring-blue-500"
              />
            </label>
          </div>

          <label className="grid gap-2 text-sm font-medium text-slate-700 dark:text-slate-200">
            备注
            <Textarea
              aria-label="备注"
              rows={8}
              value={values.content}
              onChange={(event) => updateField('content', event.target.value)}
              className="min-h-[220px] rounded-2xl border-slate-200 bg-slate-50 leading-7 dark:border-slate-700 dark:bg-slate-900"
            />
          </label>
        </div>

        <DialogFooter className="flex items-center justify-between gap-2 border-t border-slate-200 bg-slate-50/80 px-6 py-4 sm:justify-between dark:border-slate-800 dark:bg-slate-950/80">
          <div>
            {note && onDelete ? (
              <button
                type="button"
                onClick={onDelete}
                className="rounded-xl bg-red-100 px-4 py-2 text-sm font-medium text-red-700 transition-colors hover:bg-red-200 dark:bg-red-500/10 dark:text-red-300 dark:hover:bg-red-500/20"
              >
                删除
              </button>
            ) : null}
          </div>
          <div className="flex gap-2">
            <button
              type="button"
              onClick={() => onOpenChange(false)}
              className="rounded-xl bg-white px-4 py-2 text-sm font-medium text-slate-700 transition-colors hover:bg-slate-100 dark:bg-slate-900 dark:text-slate-200 dark:hover:bg-slate-800"
            >
              取消
            </button>
            <button
              type="button"
              onClick={() => onSave(values)}
              className="rounded-xl bg-blue-600 px-4 py-2 text-sm font-medium text-white shadow-lg shadow-blue-600/20 transition-all hover:-translate-y-0.5 hover:bg-blue-700"
            >
              保存
            </button>
          </div>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}
