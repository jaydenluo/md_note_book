export const formatDate = (date: Date): string => {
  const now = new Date()
  const diff = now.getTime() - date.getTime()
  const oneDay = 24 * 60 * 60 * 1000
  const oneWeek = 7 * oneDay

  if (diff < oneDay) {
    return '今天'
  } else if (diff < 2 * oneDay) {
    return '昨天'
  } else if (diff < oneWeek) {
    return `${Math.floor(diff / oneDay)}天前`
  } else {
    return date.toLocaleDateString('zh-CN', {
      year: 'numeric',
      month: 'long',
      day: 'numeric'
    })
  }
} 