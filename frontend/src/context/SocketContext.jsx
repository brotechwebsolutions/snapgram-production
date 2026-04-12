import { createContext, useContext, useEffect, useRef, useState, useCallback } from 'react'
import { Client } from '@stomp/stompjs'
import SockJS from 'sockjs-client'
import { useAuth } from './AuthContext'

const SocketContext = createContext(null)

const MAX_RECONNECT_ATTEMPTS = 5
const BASE_RECONNECT_DELAY   = 3000 // 3s → 6s → 12s → 24s → 48s

/**
 * FIX #7 — WebSocket context with:
 *   - Exponential backoff reconnection
 *   - Connection state tracking (connected/connecting/disconnected)
 *   - Listener re-registration after reconnect
 *   - Clean deactivation on logout
 *   - Debug-friendly connection status
 */
export const SocketProvider = ({ children }) => {
  const { token, isAuthenticated } = useAuth()
  const clientRef         = useRef(null)
  const listenersRef      = useRef({})
  const subscriptionsRef  = useRef({})  // active STOMP subscriptions
  const reconnectCount    = useRef(0)
  const reconnectTimeout  = useRef(null)
  const [connected, setConnected]         = useState(false)
  const [connectionStatus, setStatus]     = useState('disconnected') // connected|connecting|disconnected|error

  // ── Subscribe to a destination ─────────────────────────────────────────

  const subscribe = useCallback((destination, callback) => {
    // Register listener
    if (!listenersRef.current[destination]) {
      listenersRef.current[destination] = []
    }
    if (!listenersRef.current[destination].includes(callback)) {
      listenersRef.current[destination].push(callback)
    }

    // If already connected, create only one STOMP subscription per destination
    if (clientRef.current?.connected && !subscriptionsRef.current[destination]) {
      subscriptionsRef.current[destination] = clientRef.current.subscribe(destination, (msg) => {
        const payload = (() => {
          try { return JSON.parse(msg.body) } catch { return msg.body }
        })()

        ;(listenersRef.current[destination] || []).forEach(cb => cb(payload))
      })
    }

    return () => {
      // Cleanup
      if (listenersRef.current[destination]) {
        listenersRef.current[destination] =
          listenersRef.current[destination].filter(cb => cb !== callback)
      }
      if (listenersRef.current[destination]?.length === 0) {
        subscriptionsRef.current[destination]?.unsubscribe()
        delete subscriptionsRef.current[destination]
        delete listenersRef.current[destination]
      }
    }
  }, [])

  // ── Publish to a destination ───────────────────────────────────────────

  const publish = useCallback((destination, body) => {
    if (clientRef.current?.connected) {
      clientRef.current.publish({
        destination,
        body: JSON.stringify(body),
      })
      return true
    }
    console.warn('[Socket] Cannot publish — not connected:', destination)
    return false
  }, [])

  // ── Re-subscribe all listeners after reconnect ─────────────────────────

  const resubscribeAll = useCallback((client) => {
    // Connection may have dropped; reset stale subscription handles before re-subscribing.
    subscriptionsRef.current = {}

    Object.entries(listenersRef.current).forEach(([dest, callbacks]) => {
      if (callbacks.length > 0) {
        const sub = client.subscribe(dest, (msg) => {
          const parsed = (() => { try { return JSON.parse(msg.body) } catch { return msg.body } })()
          callbacks.forEach(cb => cb(parsed))
        })
        subscriptionsRef.current[dest] = sub
      }
    })
  }, [])

  // ── WebSocket connection lifecycle ─────────────────────────────────────

  useEffect(() => {
    if (!isAuthenticated || !token) {
      if (reconnectTimeout.current) {
        clearTimeout(reconnectTimeout.current)
        reconnectTimeout.current = null
      }
      clientRef.current?.deactivate()
      setConnected(false)
      setStatus('disconnected')
      reconnectCount.current = 0
      subscriptionsRef.current = {}
      return
    }

    const envApiBaseUrl = import.meta.env.VITE_API_BASE_URL
    const API_BASE_URL = envApiBaseUrl
      ? envApiBaseUrl.replace(/\/$/, '')
      : import.meta.env.DEV
        ? 'http://localhost:8080'
        : null

    if (!API_BASE_URL) {
      console.error('[Socket] VITE_API_BASE_URL is required in production')
      setConnected(false)
      setStatus('error')
      return
    }

    const WS_URL = (import.meta.env.VITE_WS_URL || `${API_BASE_URL}/ws`).replace(/\/$/, '')

    setStatus('connecting')

    const client = new Client({
      webSocketFactory: () => new SockJS(WS_URL),
      connectHeaders: { Authorization: `Bearer ${token}` },

      // FIX: Exponential backoff reconnection
      reconnectDelay: 0, // We manage reconnect ourselves for backoff
      onConnect: (frame) => {
        reconnectCount.current = 0
        setConnected(true)
        setStatus('connected')
        console.info('[Socket] Connected')
        resubscribeAll(client)
      },

      onDisconnect: () => {
        setConnected(false)
        setStatus('disconnected')
        console.info('[Socket] Disconnected')
      },

      onStompError: (frame) => {
        setConnected(false)
        setStatus('error')
        console.error('[Socket] STOMP error:', frame.headers?.message)
        scheduleReconnect()
      },

      onWebSocketError: (event) => {
        setConnected(false)
        setStatus('error')
        console.warn('[Socket] WebSocket error:', event.type)
        scheduleReconnect()
      },
    })

    const scheduleReconnect = () => {
      if (reconnectCount.current >= MAX_RECONNECT_ATTEMPTS) {
        console.error('[Socket] Max reconnect attempts reached')
        setStatus('error')
        return
      }
      const delay = BASE_RECONNECT_DELAY * Math.pow(2, reconnectCount.current)
      reconnectCount.current++
      console.info(`[Socket] Reconnecting in ${delay}ms (attempt ${reconnectCount.current})`)
      reconnectTimeout.current = setTimeout(() => {
        if (isAuthenticated && token && !client.active) {
          setStatus('connecting')
          client.activate()
        }
      }, delay)
    }

    client.activate()
    clientRef.current = client

    return () => {
      if (reconnectTimeout.current) {
        clearTimeout(reconnectTimeout.current)
        reconnectTimeout.current = null
      }
      client.deactivate()
      subscriptionsRef.current = {}
    }
  }, [isAuthenticated, token, resubscribeAll])

  return (
    <SocketContext.Provider value={{ connected, connectionStatus, subscribe, publish }}>
      {children}
    </SocketContext.Provider>
  )
}

export const useSocket = () => {
  const ctx = useContext(SocketContext)
  if (!ctx) throw new Error('useSocket must be used within SocketProvider')
  return ctx
}
