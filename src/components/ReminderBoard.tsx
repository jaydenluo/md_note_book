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

const STATUS_STYLES = {
  normal: {
    badge: 'bg-slate-100 text-slate-700 dark:bg-slate-700/70 dark:text-slate-200',
    card: 'border-slate-200/80 hover:border-slate-300 dark:border-slate-700',
    glow: 'from-slate-500/10 to-transparent',
  },
  'due-this-month': {
    badge: 'bg-amber-100 text-amber-800 dark:bg-amber-500/15 dark:text-amber-200',
    card: 'border-amber-200/80 hover:border-amber-300 dark:border-amber-500/30',
    glow: 'from-amber-400/15 to-transparent',
  },
  'due-soon': {
    badge: 'bg-orange-100 text-orange-800 dark:bg-orange-500/15 dark:text-orange-200',
    card: 'border-orange-200/80 hover:border-orange-300 dark:border-orange-500/35',
    glow: 'from-orange-400/20 to-transparent',
  },
  'due-today': {
    badge: 'bg-rose-100 text-rose-700 dark:bg-rose-500/15 dark:text-rose-200',
    card: 'border-rose-200/80 hover:border-rose-300 dark:border-rose-500/35',
    glow: 'from-rose-400/20 to-transparent',
  },
  overdue: {
    badge: 'bg-red-100 text-red-700 dark:bg-red-500/15 dark:text-red-200',
    card: 'border-red-200/80 hover:border-red-300 dark:border-red-500/35',
    glow: 'from-red-400/20 to-transparent',
  },
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
    <div className="flex h-full flex-col bg-gradient-to-br from-slate-50 via-slate-100 to-blue-50 dark:from-slate-950 dark:via-slate-900 dark:to-slate-950">
      <div className="border-b border-gray-200/80 bg-white/80 px-5 py-5 backdrop-blur-sm dark:border-gray-800 dark:bg-slate-950/70">
        <div className="flex flex-wrap items-center justify-between gap-4">
          <div>
            <div className="inline-flex rounded-full border border-blue-200/70 bg-blue-50 px-3 py-1 text-xs font-medium tracking-wide text-blue-700 dark:border-blue-500/20 dark:bg-blue-500/10 dark:text-blue-200">
              Reminder Mode
            </div>
            <h2 className="mt-3 text-3xl font-semibold tracking-tight text-gray-900 dark:text-white">提醒卡片</h2>
            <p className="mt-1 text-sm text-gray-500 dark:text-gray-400">
              当前分类：{selectedCategoryId ? categoryMap.get(selectedCategoryId) ?? '未命名分类' : '全部分类'} · 共 {visibleCards.length} 张卡片
            </p>
          </div>
          <button
            type="button"
            onClick={onCreateCard}
            className="rounded-xl bg-blue-600 px-4 py-2.5 text-sm font-medium text-white shadow-lg shadow-blue-600/20 transition-all hover:-translate-y-0.5 hover:bg-blue-700"
          >
            新建卡片
          </button>
        </div>
      </div>

      <div className="flex flex-wrap items-center justify-between gap-4 border-b border-gray-200/80 bg-white/70 px-5 py-4 backdrop-blur-sm dark:border-gray-800 dark:bg-slate-950/50">
        <div className="flex flex-wrap gap-2">
          {FILTER_LABELS.map((filter) => (
            <button
              key={filter.key}
              type="button"
              onClick={() => setActiveFilter(filter.key)}
              className={`rounded-full px-3.5 py-1.5 text-sm font-medium transition-all ${
                activeFilter === filter.key
                  ? 'bg-blue-600 text-white shadow-md shadow-blue-600/20'
                  : 'bg-gray-200/80 text-gray-700 hover:bg-gray-300 dark:bg-slate-800 dark:text-gray-200 dark:hover:bg-slate-700'
              }`}
            >
              {filter.label}
            </button>
          ))}
        </div>

        <div className="min-w-[300px] flex-1 sm:max-w-sm">
          <input
            type="search"
            value={searchQuery}
            onChange={(event) => setSearchQuery(event.target.value)}
            placeholder="搜索标题和备注..."
            className="h-11 w-full rounded-xl border border-gray-200 bg-white px-4 text-sm text-gray-900 shadow-sm focus:outline-none focus:ring-2 focus:ring-blue-500 dark:border-slate-700 dark:bg-slate-900 dark:text-white"
          />
        </div>
      </div>

      <div className="overflow-auto p-5">
        {visibleCards.length === 0 ? (
          <div className="flex min-h-[280px] flex-col items-center justify-center rounded-3xl border border-dashed border-gray-300 bg-white/60 px-6 text-center dark:border-slate-700 dark:bg-slate-900/50">
            <div className="text-lg font-semibold text-gray-800 dark:text-gray-100">当前筛选下没有提醒卡片</div>
            <p className="mt-2 max-w-md text-sm text-gray-500 dark:text-gray-400">
              试试切换分类、放宽时间筛选，或者直接新建一张提醒卡片。
            </p>
          </div>
        ) : (
          <div className="grid grid-cols-[repeat(auto-fill,minmax(250px,1fr))] gap-5">
            {visibleCards.map((note) => {
              const status = note.dueDate ? getReminderCardStatus(note.dueDate, now) : 'normal'
              const styles = STATUS_STYLES[status]

              return (
                <button
                  key={note.id}
                  type="button"
                  onClick={() => onEditCard(note)}
                  className={`group relative overflow-hidden rounded-3xl border bg-white/90 p-5 text-left shadow-sm transition-all duration-200 hover:-translate-y-1 hover:shadow-xl dark:bg-slate-900/85 ${styles.card}`}
                >
                  <div className={`absolute inset-0 bg-gradient-to-br ${styles.glow} opacity-100`} />
                  <div className="relative">
                    <div className="flex items-start justify-between gap-3">
                      <h3 className="line-clamp-2 text-lg font-semibold leading-7 text-gray-900 dark:text-white">
                        {note.title}
                      </h3>
                      <span className={`shrink-0 rounded-full px-2.5 py-1 text-xs font-medium ${styles.badge}`}>
                        {STATUS_LABELS[status]}
                      </span>
                    </div>

                    <div className="mt-4 space-y-2 text-sm">
                      <div className="flex items-center justify-between gap-3 rounded-2xl bg-gray-50/80 px-3 py-2 dark:bg-slate-800/70">
                        <span className="text-gray-500 dark:text-gray-400">分类</span>
                        <span className="font-medium text-gray-800 dark:text-gray-100">
                          {note.categoryId ? categoryMap.get(note.categoryId) ?? '未分类' : '未分类'}
                        </span>
                      </div>
                      <div className="flex items-center justify-between gap-3 rounded-2xl bg-gray-50/80 px-3 py-2 dark:bg-slate-800/70">
                        <span className="text-gray-500 dark:text-gray-400">到期</span>
                        <span className="font-medium text-gray-800 dark:text-gray-100">
                          {note.dueDate ? note.dueDate.toISOString().slice(0, 10) : '未设置'}
                        </span>
                      </div>
                    </div>

                    <p className="mt-4 line-clamp-4 text-sm leading-6 text-gray-700 dark:text-gray-200">
                      {note.content || '暂无备注'}
                    </p>

                    <div className="mt-5 flex items-center justify-between text-xs text-gray-400 dark:text-gray-500">
                      <span>{note.reminderEnabled ? '已启用提醒' : '未启用提醒'}</span>
                      <span className="transition-transform group-hover:translate-x-1">查看详情</span>
                    </div>
                  </div>
                </button>
              )
            })}
          </div>
        )}
      </div>
    </div>
  )
}
