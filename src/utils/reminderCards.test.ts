import { describe, expect, it } from 'vitest'
import {
  getReminderCardStatus,
  isReminderCard,
  matchesReminderWindow,
  type ReminderCardStatus,
} from './reminderCards'

const makeDate = (value: string) => new Date(`${value}T00:00:00.000Z`)

describe('reminderCards utilities', () => {
  it('detects reminder card notes', () => {
    expect(isReminderCard({ type: 'reminder-card' })).toBe(true)
    expect(isReminderCard({ type: 'doc' })).toBe(false)
  })

  it('returns overdue status for past due cards', () => {
    const status = getReminderCardStatus(makeDate('2026-04-10'), makeDate('2026-04-18'))
    expect(status).toBe<ReminderCardStatus>('overdue')
  })

  it('returns seven-day status for near-term due cards', () => {
    const status = getReminderCardStatus(makeDate('2026-04-24'), makeDate('2026-04-18'))
    expect(status).toBe<ReminderCardStatus>('due-soon')
  })

  it('matches cards into named reminder windows', () => {
    const dueDate = makeDate('2026-05-10')
    const today = makeDate('2026-04-18')

    expect(matchesReminderWindow(dueDate, today, 'all')).toBe(true)
    expect(matchesReminderWindow(dueDate, today, '30d')).toBe(true)
    expect(matchesReminderWindow(dueDate, today, '7d')).toBe(false)
  })
})
