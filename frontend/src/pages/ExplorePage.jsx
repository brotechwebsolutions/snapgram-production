import { useState, useEffect, useCallback } from 'react'
import { useSearchParams, Link } from 'react-router-dom'
import { Hash, TrendingUp } from 'lucide-react'
import { postsApi }  from '../api/posts'
import { searchApi } from '../api/search'
import { useAuth }   from '../context/AuthContext'
import PostDetailModal from '../components/feed/PostDetailModal'
import { formatNumber } from '../utils/helpers'

export default function ExplorePage() {
  const { user }  = useAuth()
  const [params]  = useSearchParams()
  const tag       = params.get('tag')
  const [posts, setPosts]     = useState([])
  const [trending, setTrending] = useState([])
  const [loading, setLoading] = useState(true)
  const [selected, setSelected] = useState(null)
  const [page, setPage]       = useState(0)
  const [hasMore, setHasMore] = useState(true)
  const [loadingMore, setLoadingMore] = useState(false)

  // Load trending hashtags
  useEffect(() => {
    searchApi.trending(10)
      .then(({ data }) => setTrending(data.data || []))
      .catch(() => {})
  }, [])

  // Load posts when tag changes
  useEffect(() => {
    setPosts([]); setPage(0); setHasMore(true); setLoading(true)
    const fn = tag
      ? postsApi.getByHashtag(tag, 0, 18)
      : postsApi.getGlobalFeed(0, 18, 'popular')
    fn.then(({ data }) => {
      setPosts(data.data?.content || [])
      setHasMore(!data.data?.last)
      setPage(1)
    }).finally(() => setLoading(false))
  }, [tag])

  const loadMore = async () => {
    if (loadingMore || !hasMore) return
    setLoadingMore(true)
    try {
      const fn = tag
        ? postsApi.getByHashtag(tag, page, 18)
        : postsApi.getGlobalFeed(page, 18, 'popular')
      const { data } = await fn
      setPosts(prev => [...prev, ...(data.data?.content || [])])
      setHasMore(!data.data?.last)
      setPage(p => p + 1)
    } finally { setLoadingMore(false) }
  }

  return (
    <div className="max-w-4xl mx-auto px-4 py-4">
      {/* Hashtag header */}
      {tag && (
        <div className="bg-white dark:bg-gray-900 rounded-2xl border border-gray-200 dark:border-gray-800 p-4 mb-4 flex items-center gap-4">
          <div className="w-16 h-16 rounded-2xl bg-gray-100 dark:bg-gray-800 flex items-center justify-center flex-shrink-0">
            <Hash size={28} className="text-brand-500" />
          </div>
          <div>
            <h2 className="text-xl font-bold text-gray-900 dark:text-white">#{tag}</h2>
            <p className="text-sm text-gray-500">{formatNumber(posts.length)} posts shown</p>
          </div>
        </div>
      )}

      {/* Trending pills — shown on explore (no tag) */}
      {!tag && trending.length > 0 && (
        <div className="flex gap-2 overflow-x-auto no-scrollbar pb-2 mb-4">
          {trending.map(({ hashtag }) => (
            <Link
              key={hashtag}
              to={`/explore?tag=${hashtag}`}
              className="flex-shrink-0 flex items-center gap-1.5 bg-white dark:bg-gray-900 border border-gray-200 dark:border-gray-800 px-3 py-1.5 rounded-full text-sm hover:bg-gray-50 dark:hover:bg-gray-800 transition-colors"
            >
              <Hash size={12} className="text-brand-500" />
              <span className="text-gray-700 dark:text-gray-300">#{hashtag}</span>
            </Link>
          ))}
        </div>
      )}

      {/* Post grid */}
      {loading ? (
        <div className="grid grid-cols-3 gap-0.5">
          {Array(18).fill(0).map((_, i) => (
            <div key={i} className="aspect-square bg-gray-200 dark:bg-gray-800 animate-pulse" />
          ))}
        </div>
      ) : posts.length === 0 ? (
        <div className="text-center py-24">
          <div className="text-5xl mb-4">🔍</div>
          <p className="text-gray-500">No posts found{tag ? ` for #${tag}` : ''}</p>
          {tag && <Link to="/explore" className="text-blue-500 text-sm hover:underline mt-2 block">← Back to Explore</Link>}
        </div>
      ) : (
        <>
          <div className="grid grid-cols-3 gap-0.5">
            {posts.map(post => (
              <button
                key={post.id}
                className="post-grid-item"
                onClick={() => setSelected(post)}
              >
                <img src={post.mediaUrls?.[0]} alt="" loading="lazy" />
                <div className="post-grid-item-overlay">
                  <span className="font-semibold text-sm">❤️ {formatNumber(post.likeCount)}</span>
                  <span className="font-semibold text-sm">💬 {formatNumber(post.commentCount)}</span>
                </div>
              </button>
            ))}
          </div>
          {hasMore && (
            <button
              onClick={loadMore}
              disabled={loadingMore}
              className="w-full mt-4 py-3 text-sm text-blue-500 hover:text-blue-600 font-medium disabled:opacity-50"
            >
              {loadingMore ? 'Loading...' : 'Load more'}
            </button>
          )}
        </>
      )}

      {selected && (
        <PostDetailModal
          post={selected}
          onClose={() => setSelected(null)}
          onDelete={id => { setPosts(p => p.filter(x => x.id !== id)); setSelected(null) }}
        />
      )}
    </div>
  )
}
