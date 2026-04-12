import { formatDistanceToNow, format, isToday, isYesterday } from 'date-fns'

export const timeAgo = (date) => {
  if (!date) return ''
  return formatDistanceToNow(new Date(date), { addSuffix: true })
}

export const formatMessageTime = (date) => {
  if (!date) return ''
  const d = new Date(date)
  if (isToday(d))     return format(d, 'HH:mm')
  if (isYesterday(d)) return 'Yesterday'
  return format(d, 'MMM d')
}

export const formatFullDate = (date) => {
  if (!date) return ''
  return format(new Date(date), 'MMMM d, yyyy')
}

export const formatNumber = (n) => {
  if (!n) return '0'
  if (n >= 1_000_000) return `${(n / 1_000_000).toFixed(1)}M`
  if (n >= 1_000)     return `${(n / 1_000).toFixed(1)}K`
  return String(n)
}

export const getInitials = (name) => {
  if (!name) return '?'
  return name.split(' ').map(w => w[0]).join('').toUpperCase().slice(0, 2)
}

export const extractHashtags = (text) => {
  if (!text) return []
  const matches = text.match(/#[\w]+/g)
  return matches ? matches.map(h => h.slice(1)) : []
}

export const extractMentions = (text) => {
  if (!text) return []
  const matches = text.match(/@[\w.]+/g)
  return matches ? matches.map(m => m.slice(1)) : []
}

export const highlightText = (text) => {
  if (!text) return text
  return text
    .replace(/#([\w]+)/g, '<span class="text-blue-500 cursor-pointer">#$1</span>')
    .replace(/@([\w.]+)/g, '<span class="text-blue-500 cursor-pointer">@$1</span>')
}

export const getAvatarUrl = (user) => {
  if (user?.profilePictureUrl) return user.profilePictureUrl
  return null
}

export const isVideoFile = (file) => {
  return file?.type?.startsWith('video/')
}

export const isImageFile = (file) => {
  return file?.type?.startsWith('image/')
}

export const createFilePreview = (file) => {
  return URL.createObjectURL(file)
}

export const clsx = (...classes) => classes.filter(Boolean).join(' ')
