import { useState, useEffect, useRef } from 'react'
import { X, Send, Heart, MoreHorizontal } from 'lucide-react'
import { postsApi } from '../../api/posts'
import { useAuth }  from '../../context/AuthContext'
import Avatar       from '../common/Avatar'
import { CommentSkeleton } from '../common/Skeletons'
import { timeAgo }  from '../../utils/helpers'
import toast        from 'react-hot-toast'
import { Link }     from 'react-router-dom'

export default function CommentsModal({ post, onClose, onCommentAdded }) {
  const { user } = useAuth()
  const [comments, setComments] = useState([])
  const [loading, setLoading]   = useState(true)
  const [content, setContent]   = useState('')
  const [replyTo, setReplyTo]   = useState(null)
  const [submitting, setSubmitting] = useState(false)
  const inputRef = useRef(null)
  const bottomRef = useRef(null)

  useEffect(() => {
    fetchComments()
  }, [])

  useEffect(() => {
    if (replyTo) inputRef.current?.focus()
  }, [replyTo])

  const fetchComments = async () => {
    try {
      const { data } = await postsApi.getComments(post.id, 0, 30)
      setComments(data.data.content || [])
    } catch { toast.error('Failed to load comments') }
    finally { setLoading(false) }
  }

  const handleSubmit = async (e) => {
    e.preventDefault()
    if (!content.trim() || submitting) return
    setSubmitting(true)
    try {
      const payload = { content: content.trim(), parentCommentId: replyTo?.id || null }
      const { data } = await postsApi.addComment(post.id, payload)
      const newComment = data.data
      if (replyTo) {
        setComments(prev => prev.map(c =>
          c.id === replyTo.id
            ? { ...c, replyCount: (c.replyCount || 0) + 1, _replies: [...(c._replies || []), newComment] }
            : c
        ))
      } else {
        setComments(prev => [newComment, ...prev])
      }
      setContent('')
      setReplyTo(null)
      onCommentAdded?.()
      bottomRef.current?.scrollIntoView({ behavior: 'smooth' })
    } catch { toast.error('Failed to post comment') }
    finally { setSubmitting(false) }
  }

  const handleLikeComment = async (commentId) => {
    try {
      await postsApi.likeComment(commentId)
      setComments(prev => prev.map(c =>
        c.id === commentId
          ? { ...c, isLiked: !c.isLiked, likeCount: c.isLiked ? c.likeCount - 1 : c.likeCount + 1 }
          : c
      ))
    } catch { /* silent */ }
  }

  const handleDelete = async (commentId) => {
    try {
      await postsApi.deleteComment(commentId)
      setComments(prev => prev.filter(c => c.id !== commentId))
      toast.success('Comment deleted')
    } catch { toast.error('Failed to delete') }
  }

  return (
    <div className="modal-backdrop" onClick={onClose}>
      <div
        className="bg-white dark:bg-gray-900 rounded-2xl w-full max-w-lg max-h-[85vh] flex flex-col animate-slide-up"
        onClick={e => e.stopPropagation()}
      >
        {/* Header */}
        <div className="flex items-center justify-between px-4 py-3 border-b border-gray-100 dark:border-gray-800">
          <h3 className="font-semibold text-gray-900 dark:text-white">Comments</h3>
          <button onClick={onClose} className="p-1 rounded-full hover:bg-gray-100 dark:hover:bg-gray-800">
            <X size={20} />
          </button>
        </div>

        {/* Comments list */}
        <div className="flex-1 overflow-y-auto px-4 py-3 space-y-4">
          {loading
            ? Array(4).fill(0).map((_, i) => <CommentSkeleton key={i} />)
            : comments.length === 0
              ? <p className="text-center text-gray-500 py-8">No comments yet. Be the first!</p>
              : comments.map(comment => (
                  <CommentItem
                    key={comment.id}
                    comment={comment}
                    currentUser={user}
                    postOwnerId={post.user?.id}
                    onLike={handleLikeComment}
                    onDelete={handleDelete}
                    onReply={(c) => { setReplyTo(c); inputRef.current?.focus() }}
                  />
                ))
          }
          <div ref={bottomRef} />
        </div>

        {/* Reply indicator */}
        {replyTo && (
          <div className="px-4 py-2 bg-gray-50 dark:bg-gray-800 flex items-center justify-between text-sm">
            <span className="text-gray-500">Replying to <strong>@{replyTo.user?.username}</strong></span>
            <button onClick={() => setReplyTo(null)} className="text-gray-400 hover:text-gray-600">
              <X size={16} />
            </button>
          </div>
        )}

        {/* Input */}
        <div className="px-4 py-3 border-t border-gray-100 dark:border-gray-800">
          <form onSubmit={handleSubmit} className="flex items-center gap-3">
            <Avatar user={user} size="sm" />
            <input
              ref={inputRef}
              value={content}
              onChange={e => setContent(e.target.value)}
              placeholder={replyTo ? `Reply to @${replyTo.user?.username}...` : 'Add a comment...'}
              className="flex-1 text-sm bg-transparent outline-none text-gray-900 dark:text-white placeholder-gray-400"
            />
            <button
              type="submit"
              disabled={!content.trim() || submitting}
              className="text-blue-500 font-semibold text-sm disabled:opacity-40 disabled:cursor-not-allowed"
            >
              {submitting ? '...' : 'Post'}
            </button>
          </form>
        </div>
      </div>
    </div>
  )
}

function CommentItem({ comment, currentUser, postOwnerId, onLike, onDelete, onReply }) {
  const [showReplies, setShowReplies] = useState(false)
  const [replies, setReplies]         = useState([])
  const [loadingReplies, setLoadingReplies] = useState(false)

  const canDelete = currentUser?.id === comment.user?.id || currentUser?.id === postOwnerId

  const loadReplies = async () => {
    if (showReplies) { setShowReplies(false); return }
    setLoadingReplies(true)
    try {
      const { data } = await postsApi.getReplies(comment.id, 0, 20)
      setReplies(data.data.content || [])
      setShowReplies(true)
    } catch { /* silent */ }
    finally { setLoadingReplies(false) }
  }

  return (
    <div className="flex gap-3">
      <Link to={`/${comment.user?.username}`}>
        <Avatar user={comment.user} size="sm" />
      </Link>
      <div className="flex-1 min-w-0">
        <div className="bg-gray-50 dark:bg-gray-800 rounded-2xl px-3 py-2 inline-block max-w-full">
          <Link to={`/${comment.user?.username}`} className="font-semibold text-sm text-gray-900 dark:text-white">
            {comment.user?.username}
          </Link>
          <p className="text-sm text-gray-800 dark:text-gray-200 mt-0.5">{comment.content}</p>
        </div>
        <div className="flex items-center gap-4 mt-1 px-1">
          <span className="text-xs text-gray-400">{timeAgo(comment.createdAt)}</span>
          {comment.likeCount > 0 && (
            <span className="text-xs text-gray-400">{comment.likeCount} likes</span>
          )}
          <button onClick={() => onReply(comment)} className="text-xs font-semibold text-gray-500 hover:text-gray-700 dark:hover:text-gray-300">
            Reply
          </button>
          {canDelete && (
            <button onClick={() => onDelete(comment.id)} className="text-xs text-red-400 hover:text-red-600">
              Delete
            </button>
          )}
        </div>

        {/* Replies */}
        {comment.replyCount > 0 && (
          <button onClick={loadReplies} className="text-xs font-semibold text-gray-500 hover:text-gray-700 dark:hover:text-gray-300 mt-1 px-1">
            {loadingReplies ? 'Loading...' : showReplies ? '▲ Hide replies' : `▼ View ${comment.replyCount} replies`}
          </button>
        )}
        {showReplies && (
          <div className="mt-2 space-y-3 pl-2 border-l-2 border-gray-100 dark:border-gray-700">
            {replies.map(reply => (
              <CommentItem key={reply.id} comment={reply} currentUser={currentUser} postOwnerId={postOwnerId} onLike={onLike} onDelete={onDelete} onReply={onReply} />
            ))}
          </div>
        )}
      </div>

      {/* Like button */}
      <button onClick={() => onLike(comment.id)} className={`flex-shrink-0 mt-1 ${comment.isLiked ? 'text-red-500' : 'text-gray-400'}`}>
        <Heart size={14} fill={comment.isLiked ? 'currentColor' : 'none'} />
      </button>
    </div>
  )
}
