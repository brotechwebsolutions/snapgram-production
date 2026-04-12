import { useState, useRef, useCallback } from 'react'
import { useNavigate, Link }   from 'react-router-dom'
import { Heart, MessageCircle, Bookmark, MoreHorizontal, MapPin, Smile, Share2 } from 'lucide-react'
import { postsApi }  from '../../api/posts'
import { useAuth }   from '../../context/AuthContext'
import Avatar        from '../common/Avatar'
import { timeAgo, formatNumber, highlightText } from '../../utils/helpers'
import toast         from 'react-hot-toast'
import CommentsModal from './CommentsModal'

const REACTIONS = ['❤️','😂','😮','😢','😡','👏','🔥','💯']

export default function PostCard({ post: initialPost, onDelete }) {
  const { user }   = useAuth()
  const navigate   = useNavigate()
  const [post, setPost]             = useState(initialPost)
  const [showComments, setShowComments] = useState(false)
  const [showReactions, setShowReactions] = useState(false)
  const [showMenu, setShowMenu]     = useState(false)
  const [heartAnim, setHeartAnim]   = useState(false)
  const [imgIndex, setImgIndex]     = useState(0)
  const [expanded, setExpanded]     = useState(false)
  const lastTap = useRef(0)

  const isOwner = user?.id === post.user?.id
  const caption = post.caption || ''
  const longCaption = caption.length > 125

  // Double-tap to like
  const handleImgClick = useCallback(() => {
    const now = Date.now()
    if (now - lastTap.current < 300) {
      if (!post.isLiked) { doLike() }
      setHeartAnim(true)
      setTimeout(() => setHeartAnim(false), 800)
    }
    lastTap.current = now
  }, [post.isLiked])

  const doLike = async () => {
    const wasLiked = post.isLiked
    setPost(p => ({ ...p, isLiked: !wasLiked, likeCount: wasLiked ? p.likeCount - 1 : p.likeCount + 1 }))
    try {
      const { data } = await postsApi.like(post.id)
      setPost(p => ({ ...p, ...data.data, isLiked: data.data.isLiked }))
    } catch {
      setPost(p => ({ ...p, isLiked: wasLiked, likeCount: wasLiked ? p.likeCount + 1 : p.likeCount - 1 }))
      toast.error('Failed to like post')
    }
  }

  const handleSave = async () => {
    const wasSaved = post.isSaved
    setPost(p => ({ ...p, isSaved: !wasSaved }))
    try {
      await postsApi.save(post.id)
    } catch {
      setPost(p => ({ ...p, isSaved: wasSaved }))
      toast.error('Failed to save post')
    }
  }

  const handleReact = async (emoji) => {
    setShowReactions(false)
    try {
      const { data } = await postsApi.react(post.id, post.viewerReaction === emoji ? null : emoji)
      setPost(p => ({ ...p, viewerReaction: data.data?.viewerReaction }))
    } catch { toast.error('Failed to react') }
  }

  const handleDelete = async () => {
    if (!confirm('Delete this post?')) return
    try {
      await postsApi.delete(post.id)
      toast.success('Post deleted')
      onDelete?.(post.id)
    } catch { toast.error('Failed to delete post') }
    setShowMenu(false)
  }

  const handleArchive = async () => {
    try {
      await postsApi.archive(post.id)
      toast.success(post.status === 'ARCHIVED' ? 'Post unarchived' : 'Post archived')
      onDelete?.(post.id)
    } catch { toast.error('Failed to archive') }
    setShowMenu(false)
  }

  const handleShare = async () => {
    const url = `${window.location.origin}/posts/${post.id}`
    try {
      await navigator.clipboard.writeText(url)
      toast.success('Link copied to clipboard!')
    } catch { toast.error('Failed to copy link') }
    setShowMenu(false)
  }

  return (
    <article className="bg-white dark:bg-gray-900 border border-gray-200 dark:border-gray-800 rounded-2xl overflow-hidden animate-fade-in">
      {/* Header */}
      <div className="flex items-center justify-between px-4 py-3">
        <Link to={`/${post.user?.username}`} className="flex items-center gap-2.5">
          <Avatar user={post.user} size="sm" />
          <div>
            <p className="font-semibold text-sm leading-tight text-gray-900 dark:text-white">
              {post.user?.username}
              {post.isPinned && <span className="ml-1.5 text-xs text-gray-400">📌</span>}
            </p>
            {post.location && (
              <p className="text-xs text-gray-400 flex items-center gap-0.5">
                <MapPin size={10} /> {post.location}
              </p>
            )}
          </div>
        </Link>

        <div className="relative">
          <button onClick={() => setShowMenu(!showMenu)}
            className="p-1.5 rounded-full hover:bg-gray-100 dark:hover:bg-gray-800 transition-colors">
            <MoreHorizontal size={20} className="text-gray-600 dark:text-gray-400" />
          </button>
          {showMenu && (
            <div className="absolute right-0 top-9 bg-white dark:bg-gray-800 rounded-2xl shadow-xl border border-gray-100 dark:border-gray-700 py-1.5 w-48 z-30 animate-scale-in">
              {isOwner && (
                <>
                  <button onClick={() => { navigate(`/posts/${post.id}`); setShowMenu(false) }}
                    className="w-full text-left px-4 py-2.5 text-sm hover:bg-gray-50 dark:hover:bg-gray-700 transition-colors">
                    Edit post
                  </button>
                  <button onClick={handleArchive}
                    className="w-full text-left px-4 py-2.5 text-sm hover:bg-gray-50 dark:hover:bg-gray-700 transition-colors">
                    {post.status === 'ARCHIVED' ? 'Unarchive' : 'Archive'}
                  </button>
                  <button onClick={handleDelete}
                    className="w-full text-left px-4 py-2.5 text-sm text-red-500 hover:bg-red-50 dark:hover:bg-red-900/20 transition-colors">
                    Delete post
                  </button>
                  <div className="border-t border-gray-100 dark:border-gray-700 my-1" />
                </>
              )}
              <button onClick={handleShare}
                className="w-full text-left px-4 py-2.5 text-sm hover:bg-gray-50 dark:hover:bg-gray-700 flex items-center gap-2 transition-colors">
                <Share2 size={15} /> Copy link
              </button>
            </div>
          )}
        </div>
      </div>

      {/* Media */}
      <div className="relative bg-black select-none" onClick={handleImgClick}>
        {post.mediaUrls?.length > 0 && (
          <>
            <img
              src={post.mediaUrls[imgIndex]}
              alt="Post"
              className="w-full max-h-[600px] object-contain"
              loading="lazy"
            />
            {post.mediaUrls.length > 1 && (
              <>
                <div className="absolute bottom-3 left-0 right-0 flex justify-center gap-1.5 pointer-events-none">
                  {post.mediaUrls.map((_, i) => (
                    <div key={i} className={`rounded-full transition-all ${i === imgIndex ? 'w-3 h-1.5 bg-white' : 'w-1.5 h-1.5 bg-white/60'}`} />
                  ))}
                </div>
                {imgIndex > 0 && (
                  <button onClick={e => { e.stopPropagation(); setImgIndex(i => i - 1) }}
                    className="absolute left-2 top-1/2 -translate-y-1/2 w-8 h-8 bg-black/50 text-white rounded-full flex items-center justify-center text-lg hover:bg-black/70">‹</button>
                )}
                {imgIndex < post.mediaUrls.length - 1 && (
                  <button onClick={e => { e.stopPropagation(); setImgIndex(i => i + 1) }}
                    className="absolute right-2 top-1/2 -translate-y-1/2 w-8 h-8 bg-black/50 text-white rounded-full flex items-center justify-center text-lg hover:bg-black/70">›</button>
                )}
              </>
            )}
          </>
        )}
        {heartAnim && (
          <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
            <span className="text-7xl heart-burst">❤️</span>
          </div>
        )}
      </div>

      {/* Actions */}
      <div className="px-4 pt-3 pb-2">
        <div className="flex items-center justify-between mb-2.5">
          <div className="flex items-center gap-3">
            {/* Like */}
            <button onClick={doLike}
              className={`transition-all active:scale-90 ${post.isLiked ? 'text-red-500' : 'text-gray-700 dark:text-gray-300 hover:text-red-400'}`}>
              <Heart size={26} fill={post.isLiked ? 'currentColor' : 'none'} />
            </button>

            {/* Comment */}
            <button onClick={() => setShowComments(true)}
              className="text-gray-700 dark:text-gray-300 hover:text-gray-900 dark:hover:text-white transition-colors">
              <MessageCircle size={26} />
            </button>

            {/* Reactions */}
            <div className="relative">
              <button
                onClick={() => setShowReactions(r => !r)}
                onMouseEnter={() => setShowReactions(true)}
                className="text-gray-700 dark:text-gray-300 hover:text-gray-900 dark:hover:text-white transition-colors"
              >
                <span className="text-xl">{post.viewerReaction || <Smile size={24} />}</span>
              </button>
              {showReactions && (
                <div
                  className="absolute bottom-10 left-0 bg-white dark:bg-gray-800 rounded-2xl shadow-xl border border-gray-100 dark:border-gray-700 px-3 py-2 flex gap-2.5 z-20 animate-scale-in"
                  onMouseLeave={() => setShowReactions(false)}
                >
                  {REACTIONS.map(e => (
                    <button key={e} onClick={() => handleReact(e)}
                      className={`text-2xl transition-transform hover:scale-125 ${post.viewerReaction === e ? 'scale-125' : ''}`}>
                      {e}
                    </button>
                  ))}
                </div>
              )}
            </div>
          </div>

          {/* Save */}
          <button onClick={handleSave}
            className={`transition-all active:scale-90 ${post.isSaved ? 'text-gray-900 dark:text-white' : 'text-gray-700 dark:text-gray-300 hover:text-gray-900 dark:hover:text-white'}`}>
            <Bookmark size={26} fill={post.isSaved ? 'currentColor' : 'none'} />
          </button>
        </div>

        {/* Like count */}
        {post.likeCount > 0 && (
          <p className="font-semibold text-sm text-gray-900 dark:text-white mb-1">
            {formatNumber(post.likeCount)} {post.likeCount === 1 ? 'like' : 'likes'}
          </p>
        )}

        {/* Caption */}
        {caption && (
          <p className="text-sm text-gray-900 dark:text-white mb-1 leading-relaxed">
            <Link to={`/${post.user?.username}`} className="font-semibold mr-1">{post.user?.username}</Link>
            <span
              dangerouslySetInnerHTML={{
                __html: expanded || !longCaption
                  ? highlightText(caption)
                  : highlightText(caption.slice(0, 125)) + '...'
              }}
            />
            {longCaption && !expanded && (
              <button onClick={() => setExpanded(true)} className="text-gray-400 ml-1 text-xs font-medium hover:text-gray-600">more</button>
            )}
          </p>
        )}

        {/* Comment count */}
        {post.commentCount > 0 && (
          <button onClick={() => setShowComments(true)}
            className="text-sm text-gray-400 hover:text-gray-600 dark:hover:text-gray-300 transition-colors block mb-1">
            View all {formatNumber(post.commentCount)} comments
          </button>
        )}

        {/* Timestamp */}
        <p className="text-xs text-gray-400 dark:text-gray-500">{timeAgo(post.createdAt)}</p>
      </div>

      {showComments && (
        <CommentsModal
          post={post}
          onClose={() => setShowComments(false)}
          onCommentAdded={() => setPost(p => ({ ...p, commentCount: p.commentCount + 1 }))}
        />
      )}
    </article>
  )
}
