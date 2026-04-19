import type { Note } from '@stores/noteStore'

export interface ReminderScheduleEntry {
  key: '30d' | '7d' | 'day'
  time: Date
}

interface ReminderScheduleInput {
  dueDate: Date
  reminderEnabled: boolean
  reminderState?: Note['reminderState']
}

const DAY_MS = 86_400_000

function addDays(date: Date, days: number) {
  return new Date(date.getTime() + days * DAY_MS)
}

function startOfDay(date: Date) {
  const normalized = new Date(date)
  normalized.setHours(0, 0, 0, 0)
  return normalized
}

export function buildReminderSchedule({
  dueDate,
  reminderEnabled,
  reminderState,
}: ReminderScheduleInput): ReminderScheduleEntry[] {
  if (!reminderEnabled) {
    return []
  }

  const normalizedDueDate = startOfDay(dueDate)
  const entries: ReminderScheduleEntry[] = []

  if (!reminderState?.notified30d) {
    entries.push({ key: '30d', time: addDays(normalizedDueDate, -30) })
  }

  if (!reminderState?.notified7d) {
    entries.push({ key: '7d', time: addDays(normalizedDueDate, -7) })
  }

  if (!reminderState?.notifiedOnDay) {
    entries.push({ key: 'day', time: normalizedDueDate })
  }

  return entries
}
