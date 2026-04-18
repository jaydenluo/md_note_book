import { useMemo, useState } from 'react'
import type { Category } from '@stores/categoryStore'
import type { Note } from '@stores/noteStore'
import { getReminderCardStatus, matchesReminderWindow, type ReminderFilter } from '@utils/reminderCards'

interface ReminderBoardProps {
  selectedCategoryId: string | null
  notes: Note[]
  categories: Category[]
  now?: Date
  onCreateCard: () => void
  onEditCard: (note: Note) => void
}

const FILTER_LABELS: { key: ReminderFilter; label: string }[] = [
  { key: 'all', label: '全部' },
  { key: 'overdue', label: '已过期' },
  { key: '7d', label: '7天内' },
  { key: '30d', label: '30天内' },
]

const STATUS_LABELS = {
  normal: '正常',
  'due-this-month': '30天内',
  'due-soon': '7天内',
  'due-today': '今天到期',
  overdue: '已过期',
} as const

export function ReminderBoard({
  selectedCategoryId,
  notes,
  categories,
  now = new Date(),
  onCreateCard,
  onEditCard,
}: ReminderBoardProps) {
  const [activeFilter, setActiveFilter] = useState<ReminderFilter>('all')
  const [searchQuery, setSearchQuery] = useState('')

  const categoryMap = useMemo(
    () => new Map(categories.map((category) => [category.id, category.name])),
    [categories],
  )

  const visibleCards = useMemo(() => {
    const normalizedQuery = searchQuery.trim().toLowerCase()

    return notes
      .filter((note) => note.type === 'reminder-card')
      .filter((note) => !selectedCategoryId || note.categoryId === selectedCategoryId)
      .filter((note) => note.dueDate && matchesReminderWindow(note.dueDate, now, activeFilter))
      .filter((note) => {
        if (!normalizedQuery) return true
        return `${note.title} ${note.content}`.toLowerCase().includes(normalizedQuery)
      })
  }, [activeFilter, notes, now, searchQuery, selectedCategoryId])

  return (
    <div className="flex h-full flex-col bg-gray-50 dark:bg-gray-900">
      <div className="flex flex-wrap items-center justify-between gap-4 border-b border-gray-200 px-4 py-4 dark:border-gray-700">
        <div>
          <h2 className="text-2xl font-semibold text-gray-900 dark:text-white">提醒卡片</h2>
          <p className="text-sm text-gray-500 dark:text-gray-400">
            当前分类：{selectedCategoryId ? categoryMap.get(selectedCategoryId) ?? '未命名分类' : '全部分类'}
          </p>
        </div>
        <button
          type="button"
          onClick={onCreateCard}
          className="rounded-md bg-blue-600 px-4 py-2 text-sm font-medium text-white transition-colors hover:bg-blue-700"
        >
          新建卡片
        </button>
      </div>

      <div className="flex flex-wrap items-center justify-between gap-4 border-b border-gray-200 px-4 py-3 dark:border-gray-700">
        <div className="flex flex-wrap gap-2">
          {FILTER_LABELS.map((filter) => (
            <button
              key={filter.key}
              type="button"
              onClick={() => setActiveFilter(filter.key)}
              className={`rounded-full px-3 py-1 text-sm transition-colors ${
                activeFilter === filter.key
                  ? 'bg-blue-600 text-white'
                  : 'bg-gray-200 text-gray-700 dark:bg-gray-800 dark:text-gray-200'
              }`}
            >
              {filter.label}
            </button>
          ))}
        </div>

        <input
          type="search"
          value={searchQuery}
          onChange={(event) => setSearchQuery(event.target.value)}
          placeholder="搜索标题和备注..."
          className="h-10 min-w-[260px] rounded-md border border-gray-300 bg-white px-3 text-sm text-gray-900 focus:outline-none focus:ring-2 focus:ring-blue-500 dark:border-gray-700 dark:bg-gray-800 dark:text-white"
        />
      </div>

      <div className="grid grid-cols-[repeat(auto-fill,minmax(240px,1fr))] gap-4 overflow-auto p-4">
        {visibleCards.map((note) => {
          const status = note.dueDate ? getReminderCardStatus(note.dueDate, now) : 'normal'

          return (
            <button
              key={note.id}
              type="button"
              onClick={() => onEditCard(note)}
              className="rounded-2xl border border-gray-200 bg-white p-4 text-left shadow-sm transition hover:border-blue-300 hover:shadow-md dark:border-gray-700 dark:bg-gray-800"
            >
              <div className="flex items-start justify-between gap-3">
                <h3 className="line-clamp-2 text-lg font-semibold text-gray-900 dark:text-white">
                  {note.title}
                </h3>
                <span className="rounded-full bg-gray-100 px-2 py-1 text-xs text-gray-700 dark:bg-gray-700 dark:text-gray-200">
                  {STATUS_LABELS[status]}
                </span>
              </div>
              <p className="mt-3 text-sm text-gray-500 dark:text-gray-400">
                分类：{note.categoryId ? categoryMap.get(note.categoryId) ?? '未分类' : '未分类'}
              </p>
              <p className="mt-1 text-sm text-gray-600 dark:text-gray-300">
                到期：{note.dueDate ? note.dueDate.toISOString().slice(0, 10) : '未设置'}
              </p>
              <p className="mt-3 line-clamp-3 text-sm leading-6 text-gray-700 dark:text-gray-200">
                {note.content || '暂无备注'}
              </p>
            </button>
          )
        })}
      </div>
    </div>
  )
}
