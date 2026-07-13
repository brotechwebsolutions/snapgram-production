import { useState, useEffect, useRef, useCallback } from 'react'
import { useParams, useNavigate, useLocation } from 'react-router-dom'
import {
  Send, Image as ImageIcon, ArrowLeft,
  MoreHorizontal, Search, CheckCheck, Check,
  Edit3, X
} from 'lucide-react'
import { messagesApi }  from '../api/messages'
import { searchApi }    from '../api/search'
import { useAuth }      from '../context/AuthContext'
import { useSocket }    from '../context/SocketContext'
import Avatar           from '../components/common/Avatar'
import { MessageSkeleton } from '../components/common/Skeletons'
import { formatMessageTime } from '../utils/helpers'
import toast from 'react-hot-toast'

export default function ChatPage() {
  const { convId }    = useParams()
  const location      = useLocation()
  const { user }      = useAuth()
  const { subscribe } = useSocket()
  const navigate      = useNavigate()

  const [conversations, setConversations] = useState([])
  const [activeConv, setActiveConv]       = useState(null)
  const [messages, setMessages]           = useState([])
  const [text, setText]                   = useState('')
  const [loadingConvs, setLoadingConvs]   = useState(true)
  const [loadingMsgs, setLoadingMsgs]     = useState(false)
  const [typing, setTyping]               = useState(false)
  const [searchQuery, setSearchQuery]     = useState('')

  // New-message (start conversation) modal state
  const [showNewMsg, setShowNewMsg] = useState(false)
  const [nmQuery, setNmQuery]       = useState('')
  const [nmResults, setNmResults]   = useState([])
  const [nmLoading, setNmLoading]   = useState(false)

  const bottomRef     = useRef(null)
  const typingTimer   = useRef(null)
  const fileRef       = useRef(null)
  const activeConvRef = useRef(null)  // FIX: stable ref for WebSocket callbacks
  const userRef       = useRef(null)

  // Keep refs in sync with state
  activeConvRef.current = activeConv
  userRef.current = user

  // Load conversations on mount
  useEffect(() => {
    messagesApi.getConversations()
      .then(({ data }) => setConversations(data.data || []))
      .catch(() => {})
      .finally(() => setLoadingConvs(false))
  }, [])

  // Open conversation from URL param
  useEffect(() => {
    if (convId && conversations.length > 0) {
      const conv = conversations.find(c => c.id === convId)
      if (conv && conv.id !== activeConvRef.current?.id) openConversation(conv)
    }
  }, [convId, conversations])

  // Open a chat automatically when navigated here via a profile's "Message" button
  useEffect(() => {
    const target = location.state?.startChatWith
    if (target && !loadingConvs) {
      startConversation(target)
      navigate(location.pathname, { replace: true, state: {} })
    }
  }, [location.state, loadingConvs])

  // FIX: WebSocket subscriptions use refs — no stale closure issues
  useEffect(() => {
    if (!user) return

    const unsubMsg = subscribe('/user/queue/messages', (msg) => {
      const conv = activeConvRef.current
      if (conv && msg.conversationId === conv.id) {
        setMessages(prev => {
          // Avoid duplicates
          if (prev.some(m => m.id === msg.id)) return prev
          return [msg, ...prev]
        })
        messagesApi.markSeen(msg.id).catch(() => {})
        // Scroll to bottom
        setTimeout(() => bottomRef.current?.scrollIntoView({ behavior: 'smooth' }), 50)
      }
      // Update conversation list
      setConversations(prev => prev.map(c =>
        c.id === msg.conversationId
          ? {
              ...c,
              lastMessage: msg,
              unreadCount: activeConvRef.current?.id === c.id
                ? 0
                : (c.unreadCount || 0) + 1
            }
          : c
      ))
    })

    const unsubTyping = subscribe('/user/queue/typing', (event) => {
      if (activeConvRef.current?.id === event.conversationId) {
        setTyping(event.isTyping)
        if (event.isTyping) {
          clearTimeout(typingTimer.current)
          typingTimer.current = setTimeout(() => setTyping(false), 3000)
        }
      }
    })

    return () => {
      unsubMsg()
      unsubTyping()
    }
  }, [user?.id, subscribe])

  // Debounced user search for the "New message" modal
  useEffect(() => {
    if (!showNewMsg) return
    const q = nmQuery.trim()
    if (!q) { setNmResults([]); setNmLoading(false); return }
    setNmLoading(true)
    const timer = setTimeout(() => {
      searchApi.users(q, 0, 20)
        .then(({ data }) => setNmResults(data.data?.content || []))
        .catch(() => setNmResults([]))
        .finally(() => setNmLoading(false))
    }, 300)
    return () => clearTimeout(timer)
  }, [nmQuery, showNewMsg])

  const openNewMessage = () => {
    setNmQuery('')
    setNmResults([])
    setShowNewMsg(true)
  }

  // Pick a person from the New Message modal — open their existing
  // conversation, or start a fresh (unsaved) one if none exists yet.
  const startConversation = (target) => {
    setShowNewMsg(false)
    const existing = conversations.find(c =>
      c.participants?.some(p => p.id === target.id)
    )
    if (existing) {
      openConversation(existing)
      return
    }
    const draft = {
      id: null, // no conversation exists in the DB until the first message is sent
      participants: [user, target],
      lastMessage: null,
      unreadCount: 0,
    }
    setActiveConv(draft)
    setMessages([])
    navigate('/messages', { replace: true })
  }

  // After the first message in a brand-new conversation succeeds, the
  // backend has now created the Conversation document — sync its real id
  // into local state so subsequent sends/loads target the right thread.
  const syncNewConversation = (conversationId) => {
    setActiveConv(prev => (prev && !prev.id) ? { ...prev, id: conversationId } : prev)
    setConversations(prev => {
      if (prev.some(c => c.id === conversationId)) return prev
      const draft = activeConvRef.current
      return [{ ...draft, id: conversationId }, ...prev]
    })
    navigate(`/messages/${conversationId}`, { replace: true })
  }

  const openConversation = async (conv) => {
    setActiveConv(conv)
    setLoadingMsgs(true)
    setMessages([])
    navigate(`/messages/${conv.id}`, { replace: true })
    try {
      const { data } = await messagesApi.getMessages(conv.id, 0, 30)
      setMessages(data.data?.content || [])
      setConversations(prev => prev.map(c =>
        c.id === conv.id ? { ...c, unreadCount: 0 } : c
      ))
    } catch { toast.error('Failed to load messages') }
    finally { setLoadingMsgs(false) }
  }

  const handleSend = async (e) => {
    e?.preventDefault()
    if (!text.trim() || !activeConv) return
    const recipient = activeConv.participants?.find(p => p.id !== user?.id)
    if (!recipient) return

    const tempId  = `temp-${Date.now()}`
    const tempMsg = {
      id: tempId,
      conversationId: activeConv.id,
      sender: user,
      content: text.trim(),
      messageType: 'TEXT',
      status: 'SENT',
      createdAt: new Date().toISOString(),
    }
    setMessages(prev => [tempMsg, ...prev])
    setText('')
    setTimeout(() => bottomRef.current?.scrollIntoView({ behavior: 'smooth' }), 50)

    try {
      const fd = new FormData()
      fd.append('data', new Blob([JSON.stringify({
        recipientId: recipient.id,
        content: tempMsg.content,
        messageType: 'TEXT',
      })], { type: 'application/json' }))
      const { data } = await messagesApi.send(fd)
      setMessages(prev => prev.map(m => m.id === tempId ? data.data : m))
      if (!activeConv.id && data.data?.conversationId) {
        syncNewConversation(data.data.conversationId)
      } else {
        setConversations(prev => prev.map(c =>
          c.id === activeConv.id ? { ...c, lastMessage: data.data } : c
        ))
      }
    } catch {
      setMessages(prev => prev.filter(m => m.id !== tempId))
      toast.error('Failed to send message')
    }
  }

  const handleTypingIndicator = useCallback(() => {
    if (!activeConvRef.current) return
    clearTimeout(typingTimer.current)
    messagesApi.sendTyping(activeConvRef.current.id, true).catch(() => {})
    typingTimer.current = setTimeout(() => {
      if (activeConvRef.current) {
        messagesApi.sendTyping(activeConvRef.current.id, false).catch(() => {})
      }
    }, 2000)
  }, []) // no deps — uses ref

  const handleImageSend = async (e) => {
    const file = e.target.files?.[0]
    if (!file || !activeConv) return
    const recipient = activeConv.participants?.find(p => p.id !== user?.id)
    if (!recipient) return
    try {
      const fd = new FormData()
      fd.append('file', file)
      fd.append('data', new Blob([JSON.stringify({
        recipientId: recipient.id, messageType: 'IMAGE'
      })], { type: 'application/json' }))
      const { data } = await messagesApi.send(fd)
      setMessages(prev => [data.data, ...prev])
      if (!activeConv.id && data.data?.conversationId) {
        syncNewConversation(data.data.conversationId)
      } else {
        setConversations(prev => prev.map(c =>
          c.id === activeConv.id ? { ...c, lastMessage: data.data } : c
        ))
      }
    } catch { toast.error('Failed to send image') }
    // Reset input
    if (fileRef.current) fileRef.current.value = ''
  }

  const filteredConvs = conversations.filter(conv => {
    if (!searchQuery.trim()) return true
    const other = conv.participants?.find(p => p.id !== user?.id)
    const q = searchQuery.toLowerCase()
    return other?.username?.toLowerCase().includes(q) ||
           other?.fullName?.toLowerCase().includes(q)
  })

  return (
    <div className="flex h-[calc(100dvh-3.5rem)] md:h-[100dvh] bg-white dark:bg-gray-900 overflow-hidden">

      {/* ── Conversations sidebar ─────────────────────────────────── */}
      <div className={`${activeConv ? 'hidden md:flex' : 'flex'} flex-col w-full md:w-80 xl:w-96 border-r border-gray-200 dark:border-gray-800 flex-shrink-0 min-w-0`}>

        {/* Header */}
        <div className="p-4 border-b border-gray-200 dark:border-gray-800">
          <div className="flex items-center justify-between mb-3">
            <h2 className="text-xl font-bold text-gray-900 dark:text-white">Messages</h2>
            <button
              onClick={openNewMessage}
              className="p-2 text-gray-500 hover:text-gray-800 dark:hover:text-gray-200 hover:bg-gray-100 dark:hover:bg-gray-800 rounded-full transition-colors"
              title="New message"
            >
              <Edit3 size={19} />
            </button>
          </div>
          <div className="relative">
            <Search size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400 pointer-events-none" />
            <input
              value={searchQuery}
              onChange={e => setSearchQuery(e.target.value)}
              placeholder="Search conversations..."
              className="input-base pl-9 py-2 text-sm"
            />
          </div>
        </div>

        {/* Conversation list */}
        <div className="flex-1 overflow-y-auto">
          {loadingConvs ? (
            Array(5).fill(0).map((_, i) => (
              <div key={i} className="flex items-center gap-3 p-4 animate-pulse">
                <div className="w-12 h-12 bg-gray-200 dark:bg-gray-700 rounded-full flex-shrink-0" />
                <div className="flex-1 space-y-2">
                  <div className="h-3 bg-gray-200 dark:bg-gray-700 rounded w-28" />
                  <div className="h-2 bg-gray-200 dark:bg-gray-700 rounded w-40" />
                </div>
              </div>
            ))
          ) : filteredConvs.length === 0 ? (
            <div className="text-center py-16 text-gray-400 text-sm px-4">
              {searchQuery ? `No results for "${searchQuery}"` : 'No conversations yet'}
            </div>
          ) : filteredConvs.map(conv => {
            const other    = conv.participants?.find(p => p.id !== user?.id)
            const isActive = activeConv?.id === conv.id
            return (
              <button
                key={conv.id}
                onClick={() => openConversation(conv)}
                className={`w-full flex items-center gap-3 px-4 py-3 transition-colors hover:bg-gray-50 dark:hover:bg-gray-800 ${isActive ? 'bg-blue-50 dark:bg-blue-900/20' : ''}`}
              >
                <div className="relative flex-shrink-0">
                  <Avatar user={other} size="md" />
                  {other?.isOnline && (
                    <span className="absolute bottom-0 right-0 w-3 h-3 bg-green-500 rounded-full border-2 border-white dark:border-gray-900" />
                  )}
                </div>
                <div className="flex-1 min-w-0 text-left">
                  <div className="flex items-center justify-between gap-2">
                    <p className="font-semibold text-sm text-gray-900 dark:text-white truncate">{other?.username}</p>
                    <span className="text-xs text-gray-400 flex-shrink-0">
                      {conv.lastMessage ? formatMessageTime(conv.lastMessage.createdAt) : ''}
                    </span>
                  </div>
                  <p className={`text-xs truncate mt-0.5 ${
                    conv.unreadCount > 0
                      ? 'font-semibold text-gray-800 dark:text-gray-100'
                      : 'text-gray-500 dark:text-gray-400'
                  }`}>
                    {conv.lastMessage?.isDeleted
                      ? '🚫 Message deleted'
                      : conv.lastMessage?.content || 'Start a conversation'}
                  </p>
                </div>
                {conv.unreadCount > 0 && (
                  <span className="w-5 h-5 min-w-[20px] bg-blue-500 rounded-full text-white text-xs flex items-center justify-center flex-shrink-0 font-semibold">
                    {conv.unreadCount > 9 ? '9+' : conv.unreadCount}
                  </span>
                )}
              </button>
            )
          })}
        </div>
      </div>

      {/* ── Chat window ───────────────────────────────────────────── */}
      {activeConv ? (
        <div className="flex-1 flex flex-col min-w-0">
          {/* Chat header */}
          {(() => {
            const other = activeConv.participants?.find(p => p.id !== user?.id)
            return (
              <div className="flex items-center gap-3 px-4 py-3 border-b border-gray-200 dark:border-gray-800 bg-white dark:bg-gray-900 flex-shrink-0">
                <button
                  onClick={() => { setActiveConv(null); navigate('/messages') }}
                  className="md:hidden p-1.5 rounded-full hover:bg-gray-100 dark:hover:bg-gray-800"
                >
                  <ArrowLeft size={20} />
                </button>
                <Avatar user={other} size="sm" />
                <div className="flex-1 min-w-0">
                  <p className="font-semibold text-sm text-gray-900 dark:text-white truncate">{other?.username}</p>
                  <p className="text-xs text-gray-500">
                    {typing
                      ? <span className="text-green-500 animate-pulse">typing...</span>
                      : other?.isOnline
                        ? <span className="text-green-500">Active now</span>
                        : 'Offline'
                    }
                  </p>
                </div>
                <button className="p-2 text-gray-400 hover:text-gray-600 dark:hover:text-gray-200 hover:bg-gray-100 dark:hover:bg-gray-800 rounded-full transition-colors">
                  <MoreHorizontal size={20} />
                </button>
              </div>
            )
          })()}

          {/* Messages */}
          <div className="flex-1 overflow-y-auto px-3 md:px-4 py-4 flex flex-col-reverse gap-1.5">
            {loadingMsgs ? (
              <MessageSkeleton />
            ) : messages.length === 0 ? (
              <div className="flex flex-col items-center justify-center h-full text-center text-gray-400 pb-8">
                <div className="text-4xl mb-3">👋</div>
                <p className="text-sm">Say hi to start the conversation!</p>
              </div>
            ) : messages.map((msg) => {
              const isMine = msg.sender?.id === user?.id || msg.senderId === user?.id
              return (
                <div key={msg.id} className={`flex items-end gap-2 ${isMine ? 'flex-row-reverse' : 'flex-row'}`}>
                  {!isMine && <Avatar user={msg.sender} size="xs" className="flex-shrink-0 mb-0.5" />}
                  <div className={`max-w-[82%] sm:max-w-[72%] ${isMine ? 'message-bubble-sent' : 'message-bubble-received'}`}>
                    {msg.isDeleted ? (
                      <p className="text-xs italic opacity-60">Message deleted</p>
                    ) : msg.messageType === 'IMAGE' ? (
                      <img src={msg.mediaUrl} alt="Shared image" className="rounded-lg max-w-xs max-h-64 object-cover" loading="lazy" />
                    ) : (
                      <p className="text-sm leading-relaxed break-words">{msg.content}</p>
                    )}
                    <div className={`flex items-center gap-1 mt-1 ${isMine ? 'justify-end' : 'justify-start'}`}>
                      <span className="text-[10px] opacity-50 select-none">{formatMessageTime(msg.createdAt)}</span>
                      {isMine && (
                        msg.status === 'SEEN'
                          ? <CheckCheck size={11} className="text-blue-300 opacity-80" />
                          : <Check size={11} className="opacity-40" />
                      )}
                    </div>
                  </div>
                </div>
              )
            })}

            {/* Typing indicator */}
            {typing && (
              <div className="flex items-end gap-2">
                <div className="message-bubble-received py-3 px-4">
                  <div className="flex gap-1 items-center">
                    {[0, 1, 2].map(i => (
                      <div key={i} className="w-2 h-2 bg-gray-400 rounded-full animate-bounce"
                        style={{ animationDelay: `${i * 0.15}s` }} />
                    ))}
                  </div>
                </div>
              </div>
            )}

            <div ref={bottomRef} />
          </div>

          {/* Message input */}
          <div className="px-3 md:px-4 py-3 border-t border-gray-200 dark:border-gray-800 bg-white dark:bg-gray-900 flex-shrink-0 safe-bottom">
            <form onSubmit={handleSend} className="flex items-center gap-2">
              <input
                ref={fileRef}
                type="file"
                accept="image/*,image/gif"
                className="hidden"
                onChange={handleImageSend}
              />
              <button
                type="button"
                onClick={() => fileRef.current?.click()}
                className="p-2 text-gray-400 hover:text-gray-600 dark:hover:text-gray-300 transition-colors flex-shrink-0 rounded-full hover:bg-gray-100 dark:hover:bg-gray-800"
              >
                <ImageIcon size={20} />
              </button>
              <input
                value={text}
                onChange={e => { setText(e.target.value); handleTypingIndicator() }}
                onKeyDown={e => { if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); handleSend() } }}
                placeholder="Message..."
                className="flex-1 bg-gray-100 dark:bg-gray-800 rounded-full px-4 py-2.5 text-sm outline-none text-gray-900 dark:text-white placeholder-gray-400 focus:ring-2 focus:ring-blue-400 dark:focus:ring-blue-600 transition-all"
              />
              <button
                type="submit"
                disabled={!text.trim()}
                className="p-2 text-blue-500 disabled:opacity-30 transition-all flex-shrink-0 rounded-full hover:bg-blue-50 dark:hover:bg-blue-900/20 active:scale-90"
              >
                <Send size={20} />
              </button>
            </form>
          </div>
        </div>
      ) : (
        /* Empty state — no conversation selected */
        <div className="hidden md:flex flex-1 items-center justify-center text-center px-8">
          <div>
            <div className="text-7xl mb-5">💬</div>
            <h3 className="text-xl font-semibold text-gray-900 dark:text-white mb-2">Your messages</h3>
            <p className="text-gray-500 dark:text-gray-400 text-sm max-w-xs">
              Send private photos and messages to a friend or group.
            </p>
          </div>
        </div>
      )}

      {/* ── New message modal ────────────────────────────────────── */}
      {showNewMsg && (
        <div
          className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 px-4"
          onClick={() => setShowNewMsg(false)}
        >
          <div
            className="bg-white dark:bg-gray-900 rounded-2xl w-full max-w-md max-h-[75vh] flex flex-col overflow-hidden shadow-xl"
            onClick={e => e.stopPropagation()}
          >
            <div className="flex items-center justify-between px-4 py-3 border-b border-gray-200 dark:border-gray-800 flex-shrink-0">
              <h3 className="font-semibold text-gray-900 dark:text-white">New message</h3>
              <button
                onClick={() => setShowNewMsg(false)}
                className="p-1.5 text-gray-400 hover:text-gray-700 dark:hover:text-gray-200 hover:bg-gray-100 dark:hover:bg-gray-800 rounded-full transition-colors"
              >
                <X size={18} />
              </button>
            </div>

            <div className="px-4 py-3 border-b border-gray-200 dark:border-gray-800 flex-shrink-0">
              <div className="relative">
                <Search size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400 pointer-events-none" />
                <input
                  autoFocus
                  value={nmQuery}
                  onChange={e => setNmQuery(e.target.value)}
                  placeholder="Search for people..."
                  className="input-base pl-9 py-2 text-sm"
                />
              </div>
            </div>

            <div className="flex-1 overflow-y-auto">
              {nmLoading ? (
                <div className="text-center py-10 text-sm text-gray-400">Searching...</div>
              ) : !nmQuery.trim() ? (
                <div className="text-center py-10 text-sm text-gray-400 px-6">Search for people to start a conversation.</div>
              ) : nmResults.length === 0 ? (
                <div className="text-center py-10 text-sm text-gray-400 px-6">No people found for "{nmQuery}"</div>
              ) : nmResults.map(u => (
                <button
                  key={u.id}
                  onClick={() => startConversation(u)}
                  className="w-full flex items-center gap-3 px-4 py-2.5 hover:bg-gray-50 dark:hover:bg-gray-800 transition-colors text-left"
                >
                  <Avatar user={u} size="md" />
                  <div className="flex-1 min-w-0">
                    <p className="font-semibold text-sm text-gray-900 dark:text-white truncate">{u.username}</p>
                    {u.fullName && <p className="text-xs text-gray-500 truncate">{u.fullName}</p>}
                  </div>
                </button>
              ))}
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
