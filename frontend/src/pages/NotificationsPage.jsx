import { useState, useEffect } from 'react'
import { Link } from 'react-router-dom'
import { Trash2, CheckCheck, Bell } from 'lucide-react'
import { notificationsApi }  from '../api/notifications'
import { useNotifications }  from '../context/NotificationContext'
import Avatar                from '../components/common/Avatar'
import { NotificationSkeleton } from '../components/common/Skeletons'
import { timeAgo }           from '../utils/helpers'
import toast                 from 'react-hot-toast'

const TYPE_EMOJI = {
  LIKE:           '❤️',
  COMMENT:        '💬',
  REPLY:          '↩️',
  FOLLOW:         '👤',
  FOLLOW_REQUEST: '👋',
  MENTION:        '📣',
  STORY_REACTION: '😍',
  STORY_REPLY:    '↩️',
  POST_SHARE:     '📤',
  MESSAGE:        '✉️',
  SYSTEM:         '🔔',
}

export default function NotificationsPage() {
  const { markAllRead, clearAll, setUnreadCount } = useNotifications()
  const [notifications, setNotifications] = useState([])
  const [loading, setLoading]             = useState(true)
  const [page, setPage]                   = useState(0)
  const [hasMore, setHasMore]             = useState(true)
  const [loadingMore, setLoadingMore]     = useState(false)

  useEffect(() => {
    loadPage(0, true)
    markAllRead()   // mark all as read when page opens
  }, [])

  const loadPage = async (pageNum, reset = false) => {
    if (reset) setLoading(true)
    else setLoadingMore(true)
    try {
      const { data } = await notificationsApi.getAll(pageNum, 20)
      const items    = data.data?.content || []
      setNotifications(prev => reset ? items : [...prev, ...items])
      setHasMore(!data.data?.last)
      setPage(pageNum + 1)
    } catch { toast.error('Failed to load notifications') }
    finally { setLoading(false); setLoadingMore(false) }
  }

  const handleClearAll = async () => {
    try {
      await notificationsApi.clearAll()
      setNotifications([])
      clearAll()
      setUnreadCount(0)
      toast.success('All notifications cleared')
    } catch { toast.error('Failed to clear') }
  }

  const entityLink = (n) => {
    if (n.entityType === 'POST' && n.entityId) return `/posts/${n.entityId}`
    if (n.entityType === 'USER' && n.actor)    return `/${n.actor.username}`
    if (n.actor) return `/${n.actor.username}`
    return null
  }

  return (
    <div className="max-w-xl mx-auto px-0 md:px-4 py-0 md:py-4">
      <div className="bg-white dark:bg-gray-900 md:rounded-2xl md:border border-gray-200 dark:border-gray-800 overflow-hidden">

        {/* Header */}
        <div className="flex items-center justify-between px-4 py-4 border-b border-gray-100 dark:border-gray-800">
          <h2 className="text-xl font-bold text-gray-900 dark:text-white">Notifications</h2>
          <div className="flex items-center gap-2">
            {notifications.length > 0 && (
              <button
                onClick={handleClearAll}
                className="flex items-center gap-1.5 text-sm text-red-500 hover:text-red-600 py-1.5 px-3 rounded-lg hover:bg-red-50 dark:hover:bg-red-900/20 transition-colors"
              >
                <Trash2 size={15} /> Clear all
              </button>
            )}
          </div>
        </div>

        {/* List */}
        {loading ? (
          Array(6).fill(0).map((_, i) => <NotificationSkeleton key={i} />)
        ) : notifications.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-20 text-center px-4">
            <div className="w-16 h-16 bg-gray-100 dark:bg-gray-800 rounded-full flex items-center justify-center mb-4">
              <Bell size={28} className="text-gray-400" />
            </div>
            <h3 className="font-semibold text-gray-700 dark:text-gray-300 mb-1">No notifications yet</h3>
            <p className="text-sm text-gray-400">When people interact with your posts, you'll see it here.</p>
          </div>
        ) : (
          <>
            {notifications.map(n => {
              const link = entityLink(n)
              const Inner = () => (
                <div className={`flex items-center gap-3 px-4 py-3 transition-colors hover:bg-gray-50 dark:hover:bg-gray-800 ${!n.isRead ? 'bg-blue-50/40 dark:bg-blue-900/10' : ''}`}>
                  {/* Actor avatar with type emoji badge */}
                  <div className="relative flex-shrink-0">
                    <Avatar user={n.actor} size="md" />
                    <span className="absolute -bottom-1 -right-1 text-sm leading-none">
                      {TYPE_EMOJI[n.type] || '🔔'}
                    </span>
                  </div>

                  {/* Message */}
                  <div className="flex-1 min-w-0">
                    <p className="text-sm text-gray-800 dark:text-gray-200 leading-snug">
                      <span className="font-semibold">{n.actor?.username || 'Someone'}</span>{' '}
                      {n.message?.replace(n.actor?.username + ' ', '') || n.type?.toLowerCase().replace('_', ' ')}
                    </p>
                    <p className="text-xs text-gray-400 mt-0.5">{timeAgo(n.createdAt)}</p>
                  </div>

                  {/* Unread dot */}
                  {!n.isRead && (
                    <div className="w-2.5 h-2.5 bg-blue-500 rounded-full flex-shrink-0" />
                  )}
                </div>
              )

              return link ? (
                <Link key={n.id} to={link} className="block"><Inner /></Link>
              ) : (
                <div key={n.id}><Inner /></div>
              )
            })}

            {hasMore && (
              <button
                onClick={() => loadPage(page)}
                disabled={loadingMore}
                className="w-full py-3.5 text-sm text-blue-500 hover:text-blue-600 font-medium disabled:opacity-50 border-t border-gray-100 dark:border-gray-800 transition-colors hover:bg-gray-50 dark:hover:bg-gray-800"
              >
                {loadingMore ? 'Loading...' : 'Load more'}
              </button>
            )}
          </>
        )}
      </div>
    </div>
  )
}
