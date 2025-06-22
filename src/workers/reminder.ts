interface ReminderMessage {
  type: 'SET_REMINDER' | 'CLEAR_REMINDER'
  noteId: string
  title: string
  time?: number
}

const reminders = new Map<string, number>()

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

const showNotification = async (noteId: string, title: string) => {
  if (await checkPermission()) {
    new Notification('笔记提醒', {
      body: `提醒：${title}`,
      icon: '/favicon.ico'
    })
  }
}

const handleSetReminder = (noteId: string, title: string, time: number) => {
  // 清除已存在的提醒
  if (reminders.has(noteId)) {
    clearTimeout(reminders.get(noteId))
  }

  const now = Date.now()
  const delay = time - now

  if (delay > 0) {
    const timerId = setTimeout(() => {
      showNotification(noteId, title)
      reminders.delete(noteId)
    }, delay)

    reminders.set(noteId, timerId)
  }
}

const handleClearReminder = (noteId: string) => {
  if (reminders.has(noteId)) {
    clearTimeout(reminders.get(noteId))
    reminders.delete(noteId)
  }
}

self.onmessage = (event: MessageEvent<ReminderMessage>) => {
  const { type, noteId, title, time } = event.data

  switch (type) {
    case 'SET_REMINDER':
      if (time) {
        handleSetReminder(noteId, title, time)
      }
      break
    case 'CLEAR_REMINDER':
      handleClearReminder(noteId)
      break
  }
} 