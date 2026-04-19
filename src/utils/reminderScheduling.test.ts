import { describe, expect, it } from 'vitest'
import { buildReminderSchedule } from './reminderScheduling'

describe('buildReminderSchedule', () => {
  it('creates 30-day, 7-day, and same-day reminder entries', () => {
    const dueDate = new Date('2026-05-18T00:00:00.000Z')
    const schedule = buildReminderSchedule({
      dueDate,
      reminderEnabled: true,
      reminderState: {},
    })

    expect(schedule).toHaveLength(3)
    expect(schedule.map((entry) => entry.key)).toEqual(['30d', '7d', 'day'])
  })

  it('skips entries that were already notified', () => {
    const dueDate = new Date('2026-05-18T00:00:00.000Z')
    const schedule = buildReminderSchedule({
      dueDate,
      reminderEnabled: true,
      reminderState: {
        notified30d: true,
        notified7d: false,
        notifiedOnDay: false,
      },
    })

    expect(schedule.map((entry) => entry.key)).toEqual(['7d', 'day'])
  })
})
