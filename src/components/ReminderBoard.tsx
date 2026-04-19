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
    card: 'border-slate-200/80 hover:border-slate-300 dark:border-slate-700/80 dark:hover:border-slate-600',
    glow: 'from-slate-500/8 via-slate-500/4 to-transparent',
  },
  'due-this-month': {
    badge: 'bg-amber-100 text-amber-800 dark:bg-amber-500/15 dark:text-amber-200',
    card: 'border-amber-200/80 hover:border-amber-300 dark:border-amber-500/30 dark:hover:border-amber-400/40',
    glow: 'from-amber-400/15 via-amber-400/8 to-transparent',
  },
  'due-soon': {
    badge: 'bg-orange-100 text-orange-800 dark:bg-orange-500/15 dark:text-orange-200',
    card: 'border-orange-200/80 hover:border-orange-300 dark:border-orange-500/35 dark:hover:border-orange-400/45',
    glow: 'from-orange-400/18 via-orange-400/10 to-transparent',
  },
  'due-today': {
    badge: 'bg-rose-100 text-rose-700 dark:bg-rose-500/15 dark:text-rose-200',
    card: 'border-rose-200/80 hover:border-rose-300 dark:border-rose-500/35 dark:hover:border-rose-400/45',
    glow: 'from-rose-400/18 via-rose-400/10 to-transparent',
  },
  overdue: {
    badge: 'bg-red-100 text-red-700 dark:bg-red-500/15 dark:text-red-200',
    card: 'border-red-200/80 hover:border-red-300 dark:border-red-500/35 dark:hover:border-red-400/45',
    glow: 'from-red-400/18 via-red-400/10 to-transparent',
  },
} as const

function formatDueDate(date?: Date) {
  if (!date) return '未设置'
  return date.toISOString().slice(0, 10)
}

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

  const scopedCards = useMemo(
    () =>
      notes
        .filter((note) => note.type === 'reminder-card')
        .filter((note) => !selectedCategoryId || note.categoryId === selectedCategoryId),
    [notes, selectedCategoryId],
  )

  const visibleCards = useMemo(() => {
    const normalizedQuery = searchQuery.trim().toLowerCase()

    return scopedCards
      .filter((note) => note.dueDate && matchesReminderWindow(note.dueDate, now, activeFilter))
      .filter((note) => {
        if (!normalizedQuery) return true
        return `${note.title} ${note.content}`.toLowerCase().includes(normalizedQuery)
      })
  }, [activeFilter, now, scopedCards, searchQuery])

  const overdueCount = useMemo(
    () =>
      scopedCards.filter(
        (note) => note.dueDate && getReminderCardStatus(note.dueDate, now) === 'overdue',
      ).length,
    [now, scopedCards],
  )

  const dueSoonCount = useMemo(
    () => scopedCards.filter((note) => note.dueDate && matchesReminderWindow(note.dueDate, now, '7d')).length,
    [now, scopedCards],
  )

  const enabledCount = useMemo(
    () => scopedCards.filter((note) => note.reminderEnabled).length,
    [scopedCards],
  )

  const activeCategoryLabel = selectedCategoryId
    ? categoryMap.get(selectedCategoryId) ?? '未命名分类'
    : '全部分类'

  const summaryItems = [
    { label: '当前卡片', value: scopedCards.length },
    { label: '7天内', value: dueSoonCount },
    { label: '已启用提醒', value: enabledCount },
    { label: '已过期', value: overdueCount },
  ]

  return (
    <div className="flex h-full min-h-0 flex-col bg-transparent">
      <div className="flex h-full min-h-0 flex-col rounded-[28px] border border-white/60 bg-white/72 shadow-[0_20px_80px_-40px_rgba(15,23,42,0.45)] backdrop-blur-xl dark:border-white/5 dark:bg-slate-950/72">
        <div className="border-b border-slate-200/70 bg-white/72 px-5 py-5 backdrop-blur-xl dark:border-white/10 dark:bg-slate-950/45">
          <div className="flex flex-col gap-4 xl:flex-row xl:items-start xl:justify-between">
            <div className="min-w-0">
              <div className="inline-flex items-center rounded-full bg-teal-500/12 px-3 py-1 text-[11px] font-semibold tracking-[0.22em] text-teal-700 dark:bg-teal-400/12 dark:text-teal-200">
                REMINDER MODE
              </div>
              <h2 className="mt-3 text-2xl font-semibold tracking-tight text-slate-900 dark:text-white">
                提醒卡片
              </h2>
              <p className="mt-1 text-sm text-slate-500 dark:text-slate-400">
                当前分类：{activeCategoryLabel} · 已匹配 {visibleCards.length} 张卡片
              </p>
            </div>

            <div className="flex flex-wrap items-center gap-3 xl:justify-end">
              {summaryItems.map((item) => (
                <div
                  key={item.label}
                  className="min-w-[108px] rounded-2xl border border-slate-200/70 bg-white/82 px-3 py-2 shadow-sm dark:border-white/10 dark:bg-slate-900/72"
                >
                  <div className="text-[11px] font-semibold uppercase tracking-[0.2em] text-slate-400 dark:text-slate-500">
                    {item.label}
                  </div>
                  <div className="mt-1 text-lg font-semibold text-slate-900 dark:text-slate-100">
                    {item.value}
                  </div>
                </div>
              ))}

              <button
                type="button"
                onClick={onCreateCard}
                className="inline-flex h-11 items-center rounded-2xl bg-slate-950 px-5 text-sm font-medium text-white shadow-lg shadow-slate-950/10 transition-all hover:-translate-y-0.5 hover:bg-slate-800 dark:bg-teal-500 dark:text-slate-950 dark:shadow-teal-500/20 dark:hover:bg-teal-400"
              >
                新建卡片
              </button>
            </div>
          </div>
        </div>

        <div className="border-b border-slate-200/70 bg-white/64 px-5 py-4 backdrop-blur-xl dark:border-white/10 dark:bg-slate-950/35">
          <div className="flex flex-col gap-3 lg:flex-row lg:items-center lg:justify-between">
            <div className="flex flex-wrap gap-2">
              {FILTER_LABELS.map((filter) => (
                <button
                  key={filter.key}
                  type="button"
                  onClick={() => setActiveFilter(filter.key)}
                  className={`rounded-full px-4 py-2 text-sm font-medium transition-all ${
                    activeFilter === filter.key
                      ? 'bg-slate-950 text-white shadow-lg shadow-slate-950/10 dark:bg-teal-500 dark:text-slate-950 dark:shadow-teal-500/20'
                      : 'border border-slate-200/80 bg-white/85 text-slate-600 hover:-translate-y-0.5 hover:bg-white dark:border-white/10 dark:bg-slate-900/72 dark:text-slate-300 dark:hover:bg-slate-900'
                  }`}
                >
                  {filter.label}
                </button>
              ))}
            </div>

            <div className="w-full lg:max-w-sm">
              <input
                type="search"
                value={searchQuery}
                onChange={(event) => setSearchQuery(event.target.value)}
                placeholder="搜索标题或备注..."
                className="h-11 w-full rounded-2xl border border-slate-200/70 bg-white/85 px-4 text-sm text-slate-800 outline-none transition-all focus:border-teal-300 focus:ring-2 focus:ring-teal-500/15 dark:border-white/10 dark:bg-slate-900/72 dark:text-slate-100 dark:focus:border-teal-400/40"
              />
            </div>
          </div>
        </div>

        <div className="min-h-0 flex-1 overflow-auto p-4">
          {visibleCards.length === 0 ? (
            <div className="flex h-full min-h-[280px] flex-col items-center justify-center rounded-[24px] border border-dashed border-slate-300/80 bg-[radial-gradient(circle_at_top,_rgba(20,184,166,0.12),transparent_45%),rgba(255,255,255,0.8)] px-6 text-center dark:border-slate-700 dark:bg-[radial-gradient(circle_at_top,_rgba(45,212,191,0.12),transparent_40%),rgba(2,6,23,0.72)]">
              <div className="text-lg font-semibold text-slate-900 dark:text-slate-100">
                当前筛选下没有提醒卡片
              </div>
              <p className="mt-2 max-w-md text-sm leading-6 text-slate-500 dark:text-slate-400">
                可以切换分类、放宽时间范围，或者直接新建一张卡片，把接下来要跟进的事项先挂上去。
              </p>
              <button
                type="button"
                onClick={onCreateCard}
                className="mt-6 inline-flex h-11 items-center rounded-2xl border border-slate-200/80 bg-white px-5 text-sm font-medium text-slate-700 shadow-sm transition-all hover:-translate-y-0.5 hover:bg-slate-50 dark:border-white/10 dark:bg-slate-900/72 dark:text-slate-200 dark:hover:bg-slate-900"
              >
                创建第一张提醒卡
              </button>
            </div>
          ) : (
            <div className="grid grid-cols-1 gap-4 xl:grid-cols-3 lg:grid-cols-2">
              {visibleCards.map((note) => {
                const status = note.dueDate ? getReminderCardStatus(note.dueDate, now) : 'normal'
                const styles = STATUS_STYLES[status]

                return (
                  <button
                    key={note.id}
                    type="button"
                    onClick={() => onEditCard(note)}
                    className={`group relative overflow-hidden rounded-[26px] border bg-white/88 p-5 text-left shadow-sm transition-all duration-200 hover:-translate-y-1 hover:shadow-xl dark:bg-slate-900/82 ${styles.card}`}
                  >
                    <div className={`absolute inset-0 bg-gradient-to-br ${styles.glow}`} />
                    <div className="relative">
                      <div className="flex items-start justify-between gap-3">
                        <div className="min-w-0">
                          <div className="text-[11px] font-semibold uppercase tracking-[0.2em] text-slate-400 dark:text-slate-500">
                            Reminder Card
                          </div>
                          <h3 className="mt-2 line-clamp-2 text-lg font-semibold leading-7 text-slate-900 dark:text-white">
                            {note.title}
                          </h3>
                        </div>
                        <span className={`shrink-0 rounded-full px-2.5 py-1 text-xs font-medium ${styles.badge}`}>
                          {STATUS_LABELS[status]}
                        </span>
                      </div>

                      <div className="mt-4 grid grid-cols-2 gap-2 text-sm">
                        <div className="rounded-2xl bg-slate-50/90 px-3 py-2 dark:bg-slate-800/70">
                          <div className="text-xs text-slate-500 dark:text-slate-400">分类</div>
                          <div className="mt-1 truncate font-medium text-slate-800 dark:text-slate-100">
                            {note.categoryId ? categoryMap.get(note.categoryId) ?? '未分类' : '未分类'}
                          </div>
                        </div>
                        <div className="rounded-2xl bg-slate-50/90 px-3 py-2 dark:bg-slate-800/70">
                          <div className="text-xs text-slate-500 dark:text-slate-400">到期</div>
                          <div className="mt-1 font-medium text-slate-800 dark:text-slate-100">
                            {formatDueDate(note.dueDate)}
                          </div>
                        </div>
                      </div>

                      <p className="mt-4 line-clamp-4 min-h-[96px] text-sm leading-6 text-slate-600 dark:text-slate-300">
                        {note.content || '暂无备注'}
                      </p>

                      <div className="mt-5 flex items-center justify-between text-xs text-slate-400 dark:text-slate-500">
                        <span>{note.reminderEnabled ? '提醒已启用' : '提醒未启用'}</span>
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
    </div>
  )
}
