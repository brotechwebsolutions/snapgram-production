import { useState, useEffect, useRef, useCallback } from 'react'
import { X, ChevronLeft, ChevronRight, Send } from 'lucide-react'
import { messagesApi } from '../../api/messages'
import { storiesApi } from '../../api/stories'
import { useAuth }    from '../../context/AuthContext'
import Avatar         from '../common/Avatar'
import { timeAgo }   from '../../utils/helpers'

const STORY_DURATION = 5000 // 5 seconds per story

export default function StoryViewer({ groups, initialGroupIdx = 0, onClose }) {
  const { user }   = useAuth()
  const [groupIdx, setGroupIdx] = useState(initialGroupIdx)
  const [storyIdx, setStoryIdx] = useState(0)
  const [progress, setProgress] = useState(0)
  const [paused, setPaused]     = useState(false)
  const [replyText, setReplyText] = useState('')
  const [showReactions, setShowReactions] = useState(false)
  const progressTimer = useRef(null)
  const startTime     = useRef(null)
  const elapsed       = useRef(0)

  const group   = groups[groupIdx]
  const stories = group?.stories || []
  const story   = stories[storyIdx]

  // View story on mount/change
  useEffect(() => {
    if (story?.id) {
      storiesApi.view(story.id).catch(() => {})
    }
  }, [story?.id])

  // Progress bar animation
  const startProgress = useCallback(() => {
    elapsed.current = 0
    startTime.current = Date.now()

    const tick = () => {
      if (paused) return
      const delta = Date.now() - startTime.current + elapsed.current
      const pct   = Math.min((delta / STORY_DURATION) * 100, 100)
      setProgress(pct)

      if (pct < 100) {
        progressTimer.current = requestAnimationFrame(tick)
      } else {
        goNext()
      }
    }
    progressTimer.current = requestAnimationFrame(tick)
    return () => cancelAnimationFrame(progressTimer.current)
  }, [paused])

  useEffect(() => {
    setProgress(0)
    elapsed.current = 0
    const cleanup = startProgress()
    return cleanup
  }, [groupIdx, storyIdx])

  useEffect(() => {
    if (paused) {
      cancelAnimationFrame(progressTimer.current)
      elapsed.current += Date.now() - (startTime.current || Date.now())
    } else {
      startTime.current = Date.now()
      const cleanup = startProgress()
      return cleanup
    }
  }, [paused])

  const goNext = useCallback(() => {
    if (storyIdx < stories.length - 1) {
      setStoryIdx(i => i + 1)
    } else if (groupIdx < groups.length - 1) {
      setGroupIdx(i => i + 1)
      setStoryIdx(0)
    } else {
      onClose()
    }
  }, [storyIdx, stories.length, groupIdx, groups.length, onClose])

  const goPrev = useCallback(() => {
    if (storyIdx > 0) {
      setStoryIdx(i => i - 1)
    } else if (groupIdx > 0) {
      setGroupIdx(i => i - 1)
      setStoryIdx(0)
    }
  }, [storyIdx, groupIdx])

  const handleReact = async (emoji) => {
    try {
      await storiesApi.react(story.id, emoji)
      setShowReactions(false)
    } catch { /* silent */ }
  }

  const handleReply = async (e) => {
    e.preventDefault()
    if (!replyText.trim()) return
    try {
      const formData = new FormData()
      formData.append('data', new Blob([JSON.stringify({
        recipientId: group.user?.id,
        content: replyText,
        messageType: 'STORY_REPLY',
      })], { type: 'application/json' }))
      await messagesApi.send(formData)
      setReplyText('')
    } catch { /* silent */ }
  }

  if (!story) return null

  const isOwn = story.user?.id === user?.id

  return (
    <div className="fixed inset-0 z-50 bg-black flex items-center justify-center">
      {/* Close */}
      <button onClick={onClose} className="absolute top-4 right-4 z-50 text-white p-2">
        <X size={28} />
      </button>

      {/* Previous group */}
      {groupIdx > 0 && (
        <button onClick={() => { setGroupIdx(i => i - 1); setStoryIdx(0) }}
          className="absolute left-4 top-1/2 -translate-y-1/2 z-50 text-white p-2 hidden md:block">
          <ChevronLeft size={36} />
        </button>
      )}

      {/* Story container */}
      <div className="relative w-full max-w-sm h-full md:h-[90vh] md:rounded-2xl overflow-hidden bg-gray-900">

        {/* Progress bars */}
        <div className="absolute top-0 left-0 right-0 z-20 flex gap-1 p-3">
          {stories.map((_, i) => (
            <div key={i} className="flex-1 h-0.5 bg-white/30 rounded-full overflow-hidden">
              <div
                className="h-full bg-white rounded-full transition-none"
                style={{
                  width: i < storyIdx ? '100%' : i === storyIdx ? `${progress}%` : '0%',
                }}
              />
            </div>
          ))}
        </div>

        {/* Story header */}
        <div className="absolute top-6 left-0 right-0 z-20 px-4 pt-3 flex items-center gap-3">
          <Avatar user={group.user} size="sm" />
          <div className="flex-1">
            <p className="text-white font-semibold text-sm">{group.user?.username}</p>
            <p className="text-white/60 text-xs">{timeAgo(story.createdAt)}</p>
          </div>
          {isOwn && (
            <span className="text-white/80 text-xs">{story.viewCount} views</span>
          )}
        </div>

        {/* Media */}
        <div
          className="w-full h-full"
          onMouseDown={() => setPaused(true)}
          onMouseUp={() => setPaused(false)}
          onTouchStart={() => setPaused(true)}
          onTouchEnd={() => setPaused(false)}
        >
          {story.mediaType === 'VIDEO'
            ? <video src={story.mediaUrl} className="w-full h-full object-cover" autoPlay muted loop />
            : <img src={story.mediaUrl} alt="" className="w-full h-full object-cover" />
          }

          {/* Caption overlay */}
          {story.caption && (
            <div className="absolute bottom-20 left-0 right-0 px-4 text-center">
              <p className="text-white text-sm font-medium bg-black/30 rounded-xl px-3 py-2 backdrop-blur-sm">
                {story.caption}
              </p>
            </div>
          )}
        </div>

        {/* Click zones for navigation */}
        <button
          className="absolute left-0 top-0 w-1/3 h-full z-10"
          onClick={goPrev}
        />
        <button
          className="absolute right-0 top-0 w-1/3 h-full z-10"
          onClick={goNext}
        />

        {/* Bottom: reply / reactions */}
        {!isOwn && (
          <div className="absolute bottom-0 left-0 right-0 z-20 px-4 pb-6">
            {showReactions && (
              <div className="flex justify-center gap-4 mb-3">
                {['❤️','😂','😮','🔥','👏','💯'].map(e => (
                  <button key={e} onClick={() => handleReact(e)} className="text-3xl hover:scale-125 transition-transform">
                    {e}
                  </button>
                ))}
              </div>
            )}
            <form onSubmit={handleReply} className="flex items-center gap-2">
              <input
                value={replyText}
                onChange={e => setReplyText(e.target.value)}
                onFocus={() => setPaused(true)}
                onBlur={() => setPaused(false)}
                placeholder={`Reply to ${group.user?.username}...`}
                className="flex-1 bg-white/10 backdrop-blur-sm text-white placeholder-white/60 rounded-full px-4 py-2.5 text-sm outline-none border border-white/20"
              />
              <button type="button" onClick={() => setShowReactions(r => !r)} className="text-white text-xl">
                ❤️
              </button>
              {replyText && (
                <button type="submit" className="text-white">
                  <Send size={20} />
                </button>
              )}
            </form>
          </div>
        )}
      </div>

      {/* Next group */}
      {groupIdx < groups.length - 1 && (
        <button onClick={() => { setGroupIdx(i => i + 1); setStoryIdx(0) }}
          className="absolute right-4 top-1/2 -translate-y-1/2 z-50 text-white p-2 hidden md:block">
          <ChevronRight size={36} />
        </button>
      )}
    </div>
  )
}
