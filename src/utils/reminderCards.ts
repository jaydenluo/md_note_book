export type ReminderFilter = 'all' | 'overdue' | '7d' | '30d'

export type ReminderCardStatus =
  | 'normal'
  | 'due-this-month'
  | 'due-soon'
  | 'due-today'
  | 'overdue'

export const isReminderCard = (note: { type?: string }) => note.type === 'reminder-card'

export function getReminderCardStatus(dueDate: Date, now = new Date()): ReminderCardStatus {
  const today = new Date(now)
  today.setHours(0, 0, 0, 0)

  const target = new Date(dueDate)
  target.setHours(0, 0, 0, 0)

  const diffDays = Math.floor((target.getTime() - today.getTime()) / 86_400_000)

  if (diffDays < 0) return 'overdue'
  if (diffDays === 0) return 'due-today'
  if (diffDays <= 7) return 'due-soon'
  if (diffDays <= 30) return 'due-this-month'
  return 'normal'
}

export function matchesReminderWindow(
  dueDate: Date,
  now: Date,
  filter: ReminderFilter,
): boolean {
  const status = getReminderCardStatus(dueDate, now)

  switch (filter) {
    case 'all':
      return true
    case 'overdue':
      return status === 'overdue'
    case '7d':
      return status === 'overdue' || status === 'due-today' || status === 'due-soon'
    case '30d':
      return (
        status === 'overdue' ||
        status === 'due-today' ||
        status === 'due-soon' ||
        status === 'due-this-month'
      )
  }
}
