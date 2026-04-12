import { useState, useEffect, useCallback } from 'react'
import InfiniteScroll from 'react-infinite-scroll-component'
import { postsApi }   from '../api/posts'
import PostCard       from '../components/feed/PostCard'
import StoryBar       from '../components/stories/StoryBar'
import { PostCardSkeleton } from '../components/common/Skeletons'
import { useAuth }    from '../context/AuthContext'

const TABS = ['For You', 'Following']

export default function FeedPage() {
  const { user }  = useAuth()
  const [tab, setTab]         = useState('For You')
  const [posts, setPosts]     = useState([])
  const [page, setPage]       = useState(0)
  const [hasMore, setHasMore] = useState(true)
  const [loading, setLoading] = useState(true)

  const fetchPosts = useCallback(async (reset = false) => {
    const currentPage = reset ? 0 : page
    try {
      const fn = tab === 'Following'
        ? postsApi.getFollowingFeed(currentPage, 10)
        : postsApi.getGlobalFeed(currentPage, 10, 'latest')
      const { data } = await fn
      const newPosts = data.data?.content || []
      setPosts(prev => reset ? newPosts : [...prev, ...newPosts])
      setHasMore(!data.data?.last)
      setPage(currentPage + 1)
    } catch (err) {
      console.error(err)
    } finally {
      setLoading(false)
    }
  }, [tab, page])

  useEffect(() => {
    setPosts([])
    setPage(0)
    setHasMore(true)
    setLoading(true)
    const fn = tab === 'Following'
      ? postsApi.getFollowingFeed(0, 10)
      : postsApi.getGlobalFeed(0, 10, 'latest')
    fn.then(({ data }) => {
      setPosts(data.data?.content || [])
      setHasMore(!data.data?.last)
      setPage(1)
    }).finally(() => setLoading(false))
  }, [tab])

  const loadMore = () => fetchPosts(false)

  const handlePostDeleted = (postId) => {
    setPosts(prev => prev.filter(p => p.id !== postId))
  }

  return (
    <div className="max-w-xl mx-auto px-4 py-4 space-y-4">
      {/* Stories */}
      <StoryBar />

      {/* Tabs */}
      <div className="flex bg-white dark:bg-gray-900 border border-gray-200 dark:border-gray-800 rounded-2xl p-1">
        {TABS.map(t => (
          <button
            key={t}
            onClick={() => setTab(t)}
            className={`flex-1 py-2 rounded-xl text-sm font-semibold transition-all ${
              tab === t
                ? 'bg-gray-900 dark:bg-white text-white dark:text-gray-900'
                : 'text-gray-500 dark:text-gray-400 hover:text-gray-700 dark:hover:text-gray-200'
            }`}
          >
            {t}
          </button>
        ))}
      </div>

      {/* Feed */}
      {loading ? (
        <div className="space-y-4">
          {Array(3).fill(0).map((_, i) => <PostCardSkeleton key={i} />)}
        </div>
      ) : posts.length === 0 ? (
        <EmptyFeed tab={tab} />
      ) : (
        <InfiniteScroll
          dataLength={posts.length}
          next={loadMore}
          hasMore={hasMore}
          loader={<PostCardSkeleton />}
          endMessage={
            <p className="text-center text-gray-400 dark:text-gray-600 text-sm py-8">
              You're all caught up! 🎉
            </p>
          }
          className="space-y-4"
        >
          {posts.map(post => (
            <PostCard key={post.id} post={post} onDelete={handlePostDeleted} />
          ))}
        </InfiniteScroll>
      )}
    </div>
  )
}

function EmptyFeed({ tab }) {
  return (
    <div className="text-center py-20 bg-white dark:bg-gray-900 border border-gray-200 dark:border-gray-800 rounded-2xl">
      <div className="text-6xl mb-4">📸</div>
      <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-2">
        {tab === 'Following' ? 'Your feed is empty' : 'No posts yet'}
      </h3>
      <p className="text-gray-500 dark:text-gray-400 text-sm">
        {tab === 'Following'
          ? 'Follow people to see their posts here'
          : 'Be the first to share a moment!'}
      </p>
    </div>
  )
}
