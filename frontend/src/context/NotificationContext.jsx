import { createContext, useContext, useState, useEffect, useCallback, useRef } from 'react'
import { useSocket } from './SocketContext'
import { useAuth }   from './AuthContext'
import { notificationsApi } from '../api/notifications'

const NotificationContext = createContext(null)

/**
 * FIX: Notification subscription now uses stable ref to avoid stale closures.
 * The subscription is cleaned up properly when user logs out.
 */
export const NotificationProvider = ({ children }) => {
  const { isAuthenticated, user } = useAuth()
  const { subscribe }             = useSocket()
  const [unreadCount, setUnreadCount]     = useState(0)
  const [notifications, setNotifications] = useState([])
  // Stable ref so the subscribe callback never captures stale state
  const onNotification = useRef(null)

  onNotification.current = (notification) => {
    setNotifications(prev => [notification, ...prev.slice(0, 99)])  // cap at 100
    setUnreadCount(c => c + 1)
  }

  // Load initial unread count
  useEffect(() => {
    if (!isAuthenticated) {
      setUnreadCount(0)
      setNotifications([])
      return
    }
    notificationsApi.getUnreadCount()
      .then(({ data }) => setUnreadCount(data.data?.count ?? 0))
      .catch(() => {})
  }, [isAuthenticated])

  // Subscribe to real-time notifications
  useEffect(() => {
    if (!isAuthenticated || !user) return

    const unsub = subscribe('/user/queue/notifications', (notification) => {
      // Use ref so we always have latest state setters without re-subscribing
      onNotification.current?.(notification)
    })

    return unsub
  }, [isAuthenticated, user?.id, subscribe])

  const markAllRead = useCallback(async () => {
    try {
      await notificationsApi.markAllRead()
      setUnreadCount(0)
      setNotifications(prev => prev.map(n => ({ ...n, isRead: true })))
    } catch { /* silent */ }
  }, [])

  const markOneRead = useCallback((id) => {
    setNotifications(prev => prev.map(n => n.id === id ? { ...n, isRead: true } : n))
    setUnreadCount(c => Math.max(0, c - 1))
  }, [])

  const clearAll = useCallback(() => {
    setNotifications([])
    setUnreadCount(0)
  }, [])

  return (
    <NotificationContext.Provider value={{
      unreadCount,
      notifications,
      setUnreadCount,
      markAllRead,
      markOneRead,
      clearAll,
    }}>
      {children}
    </NotificationContext.Provider>
  )
}

export const useNotifications = () => {
  const ctx = useContext(NotificationContext)
  if (!ctx) throw new Error('useNotifications must be used within NotificationProvider')
  return ctx
}
