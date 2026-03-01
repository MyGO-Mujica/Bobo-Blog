import { dayjs } from 'element-plus'

export const formatTime = (time) => dayjs(time).format('YYYY年MM月DD日')

// 人性化时间格式化
export const formatRelativeTime = (time) => {
  const now = dayjs()
  const target = dayjs(time)
  const diffHours = now.diff(target, 'hour')
  const diffDays = now.diff(target, 'day')
  const diffMonths = now.diff(target, 'month')

  if (diffHours < 1) {
    const diffMinutes = now.diff(target, 'minute')
    if (diffMinutes < 1) {
      return '刚刚'
    }
    return `${diffMinutes}分钟前`
  } else if (diffHours < 24) {
    return `${diffHours}小时前`
  } else if (diffDays <= 10) {
    return `${diffDays}天前`
  } else if (diffMonths < 1) {
    return target.format('MM月DD日')
  } else {
    return target.format('YYYY年MM月')
  }
}

// 详细日期格式化（年月日时分）
export const formatDetailTime = (time) => {
  return dayjs(time).format('YYYY年MM月DD日 HH:mm')
}
