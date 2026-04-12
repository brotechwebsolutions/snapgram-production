import { useState, useEffect } from 'react'
import { useParams, useNavigate } from 'react-router-dom'
import { ArrowLeft } from 'lucide-react'
import { postsApi } from '../api/posts'
import { useAuth }  from '../context/AuthContext'
import PostCard     from '../components/feed/PostCard'
import { PostCardSkeleton } from '../components/common/Skeletons'
import CommentsModal from '../components/feed/CommentsModal'

export default function PostDetailPage() {
  const { postId } = useParams()
  const { user }   = useAuth()
  const navigate   = useNavigate()
  const [post, setPost]     = useState(null)
  const [loading, setLoading] = useState(true)
  const [showComments, setShowComments] = useState(false)

  useEffect(() => {
    postsApi.getById(postId)
      .then(({ data }) => setPost(data.data))
      .catch(() => navigate('/404'))
      .finally(() => setLoading(false))
  }, [postId])

  return (
    <div className="max-w-xl mx-auto px-4 py-4">
      <button onClick={() => navigate(-1)} className="flex items-center gap-2 text-gray-600 dark:text-gray-400 hover:text-gray-900 dark:hover:text-white mb-4 transition-colors">
        <ArrowLeft size={20} /> Back
      </button>
      {loading ? <PostCardSkeleton /> : post && (
        <PostCard post={post} onDelete={() => navigate(-1)} />
      )}
    </div>
  )
}
