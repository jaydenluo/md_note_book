import { useEffect } from 'react'
import type { Note } from '@stores/noteStore'
import { buildReminderSchedule } from '@utils/reminderScheduling'

export function useReminderNotifications(notes: Note[]) {
  useEffect(() => {
    if (typeof window === 'undefined' || typeof Worker === 'undefined') {
      return
    }

    const worker = new Worker(new URL('../workers/reminder.ts', import.meta.url), {
      type: 'module',
    })

    const directReminders = notes
      .filter((note) => note.reminder)
      .map((note) => ({
        noteId: note.id,
        noteTitle: note.title,
        reminderTime: note.reminder!.getTime(),
      }))

    const reminderCardSchedules = notes
      .filter((note) => note.type === 'reminder-card' && note.dueDate && note.reminderEnabled)
      .flatMap((note) =>
        buildReminderSchedule({
          dueDate: note.dueDate!,
          reminderEnabled: !!note.reminderEnabled,
          reminderState: note.reminderState,
        }).map((schedule) => ({
          noteId: note.id,
          noteTitle: note.title,
          reminderTime: schedule.time.getTime(),
          reminderKey: schedule.key,
        })),
      )

    worker.postMessage({
      type: 'INIT_REMINDERS',
      reminders: [...directReminders, ...reminderCardSchedules],
    })

    return () => {
      worker.terminate()
    }
  }, [notes])
}
