interface ReminderEntry {
  noteId: string
  noteTitle: string
  reminderTime: number
  reminderKey?: string
}

type ReminderMessage =
  | ({ type: 'SET_REMINDER' } & ReminderEntry)
  | { type: 'CLEAR_REMINDER'; noteId: string; reminderKey?: string }
  | { type: 'INIT_REMINDERS'; reminders: ReminderEntry[] }

const reminders = new Map<string, number>()

const getReminderId = (noteId: string, reminderKey?: string) =>
  reminderKey ? `${noteId}:${reminderKey}` : noteId

const checkPermission = async () => {
  if (!('Notification' in window)) {
    console.error('This browser does not support notifications')
    return false
  }

  if (Notification.permission === 'granted') {
    return true
  }

  if (Notification.permission !== 'denied') {
    const permission = await Notification.requestPermission()
    return permission === 'granted'
  }

  return false
}

const showNotification = async (title: string) => {
  if (await checkPermission()) {
    new Notification('笔记提醒', {
      body: `提醒：${title}`,
      icon: '/favicon.ico',
    })
  }
}

const handleSetReminder = (entry: ReminderEntry) => {
  const reminderId = getReminderId(entry.noteId, entry.reminderKey)

  if (reminders.has(reminderId)) {
    clearTimeout(reminders.get(reminderId))
  }

  const delay = entry.reminderTime - Date.now()

  if (delay > 0) {
    const timerId = setTimeout(() => {
      showNotification(entry.noteTitle)
      reminders.delete(reminderId)
    }, delay)

    reminders.set(reminderId, timerId)
  }
}

const handleClearReminder = (noteId: string, reminderKey?: string) => {
  const reminderId = getReminderId(noteId, reminderKey)

  if (reminders.has(reminderId)) {
    clearTimeout(reminders.get(reminderId))
    reminders.delete(reminderId)
  }
}

self.onmessage = (event: MessageEvent<ReminderMessage>) => {
  switch (event.data.type) {
    case 'SET_REMINDER':
      handleSetReminder(event.data)
      break
    case 'CLEAR_REMINDER':
      handleClearReminder(event.data.noteId, event.data.reminderKey)
      break
    case 'INIT_REMINDERS':
      reminders.forEach((timerId) => clearTimeout(timerId))
      reminders.clear()
      event.data.reminders.forEach(handleSetReminder)
      break
  }
}
