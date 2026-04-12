import { useState, useEffect } from 'react'
import { Link, useSearchParams } from 'react-router-dom'
import { Search, Hash, TrendingUp, User } from 'lucide-react'
import { searchApi } from '../api/search'
import { usersApi }  from '../api/users'
import { useAuth }   from '../context/AuthContext'
import { useDebounce } from '../hooks/useDebounce'
import Avatar from '../components/common/Avatar'
import { UserCardSkeleton, PostCardSkeleton } from '../components/common/Skeletons'
import PostDetailModal from '../components/feed/PostDetailModal'
import { formatNumber } from '../utils/helpers'
import toast from 'react-hot-toast'

const TABS = ['Top', 'People', 'Tags']

export default function SearchPage() {
  const { user }      = useAuth()
  const [params, setParams] = useSearchParams()
  const [query, setQuery]   = useState(params.get('q') || '')
  const [tab, setTab]       = useState('Top')
  const [results, setResults] = useState({ users: [], posts: [] })
  const [trending, setTrending] = useState([])
  const [loading, setLoading]   = useState(false)
  const [selectedPost, setSelectedPost] = useState(null)
  const debounced = useDebounce(query, 400)

  // Load trending on mount
  useEffect(() => {
    searchApi.trending(15)
      .then(({ data }) => setTrending(data.data || []))
      .catch(() => {})
  }, [])

  // Search when debounced query changes
  useEffect(() => {
    if (!debounced.trim()) { setResults({ users: [], posts: [] }); return }
    setParams(debounced ? { q: debounced } : {})
    setLoading(true)
    searchApi.global(debounced, 0, 12)
      .then(({ data }) => {
        setResults({
          users: data.data?.users?.content || [],
          posts: data.data?.posts?.content || [],
        })
      })
      .catch(() => toast.error('Search failed'))
      .finally(() => setLoading(false))
  }, [debounced])

  const handleFollow = async (targetUser) => {
    try {
      targetUser.isFollowing
        ? await usersApi.unfollow(targetUser.id)
        : await usersApi.follow(targetUser.id)
      setResults(prev => ({
        ...prev,
        users: prev.users.map(u => u.id === targetUser.id
          ? { ...u, isFollowing: !u.isFollowing,
              followerCount: u.isFollowing ? u.followerCount - 1 : u.followerCount + 1 }
          : u)
      }))
    } catch { toast.error('Action failed') }
  }

  const showEmpty = !loading && !debounced.trim()
  const showResults = !loading && debounced.trim()

  return (
    <div className="max-w-2xl mx-auto px-4 py-4 space-y-4">
      {/* Search input */}
      <div className="relative">
        <Search size={18} className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-400 pointer-events-none" />
        <input
          value={query}
          onChange={e => setQuery(e.target.value)}
          placeholder="Search people, posts, hashtags..."
          autoFocus
          className="input-base pl-11 text-sm"
        />
        {query && (
          <button onClick={() => setQuery('')}
            className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600 text-lg">×</button>
        )}
      </div>

      {/* Trending — shown when no query */}
      {showEmpty && trending.length > 0 && (
        <div className="bg-white dark:bg-gray-900 rounded-2xl border border-gray-200 dark:border-gray-800 overflow-hidden">
          <div className="flex items-center gap-2 px-4 py-3 border-b border-gray-100 dark:border-gray-800">
            <TrendingUp size={18} className="text-brand-500" />
            <h3 className="font-semibold text-gray-900 dark:text-white text-sm">Trending hashtags</h3>
          </div>
          <div className="p-3 flex flex-wrap gap-2">
            {trending.map(({ hashtag, count }) => (
              <Link
                key={hashtag}
                to={`/explore?tag=${hashtag}`}
                className="flex items-center gap-1.5 bg-gray-100 dark:bg-gray-800 hover:bg-gray-200 dark:hover:bg-gray-700 px-3 py-1.5 rounded-full text-sm transition-colors"
              >
                <Hash size={13} className="text-brand-500" />
                <span className="text-gray-700 dark:text-gray-300 font-medium">#{hashtag}</span>
                <span className="text-gray-400 text-xs">{formatNumber(count)}</span>
              </Link>
            ))}
          </div>
        </div>
      )}

      {showEmpty && (
        <div className="text-center py-12 text-gray-400 dark:text-gray-600">
          <Search size={48} className="mx-auto mb-3 opacity-30" />
          <p className="text-sm">Search for people, hashtags, and posts</p>
        </div>
      )}

      {/* Loading */}
      {loading && (
        <div className="space-y-3">
          {Array(4).fill(0).map((_, i) => <UserCardSkeleton key={i} />)}
        </div>
      )}

      {/* Results */}
      {showResults && (
        <>
          {/* Tabs */}
          <div className="flex bg-white dark:bg-gray-900 border border-gray-200 dark:border-gray-800 rounded-2xl p-1">
            {TABS.map(t => (
              <button key={t} onClick={() => setTab(t)}
                className={`flex-1 py-2 rounded-xl text-sm font-semibold transition-all ${
                  tab === t
                    ? 'bg-gray-900 dark:bg-white text-white dark:text-gray-900'
                    : 'text-gray-500 hover:text-gray-700 dark:hover:text-gray-200'
                }`}>{t}</button>
            ))}
          </div>

          <div className="bg-white dark:bg-gray-900 rounded-2xl border border-gray-200 dark:border-gray-800 overflow-hidden">

            {/* Top tab */}
            {tab === 'Top' && (
              <>
                {results.users.length === 0 && results.posts.length === 0 ? (
                  <NoResults query={debounced} />
                ) : (
                  <>
                    {results.users.slice(0, 3).map(u => (
                      <UserRow key={u.id} u={u} currentUserId={user?.id} onFollow={handleFollow} />
                    ))}
                    {results.posts.length > 0 && (
                      <>
                        <div className="px-4 py-2 text-xs font-semibold text-gray-400 uppercase tracking-wide border-t border-gray-100 dark:border-gray-800">
                          Posts
                        </div>
                        <div className="grid grid-cols-3 gap-0.5">
                          {results.posts.map(post => (
                            <PostThumb key={post.id} post={post} onClick={() => setSelectedPost(post)} />
                          ))}
                        </div>
                      </>
                    )}
                  </>
                )}
              </>
            )}

            {/* People tab */}
            {tab === 'People' && (
              results.users.length === 0
                ? <NoResults query={debounced} />
                : results.users.map(u => (
                    <UserRow key={u.id} u={u} currentUserId={user?.id} onFollow={handleFollow} />
                  ))
            )}

            {/* Tags tab */}
            {tab === 'Tags' && (
              <div className="p-4">
                {debounced.startsWith('#')
                  ? <HashtagRow tag={debounced.slice(1)} />
                  : <HashtagRow tag={debounced} />
                }
              </div>
            )}
          </div>
        </>
      )}

      {selectedPost && (
        <PostDetailModal
          post={selectedPost}
          onClose={() => setSelectedPost(null)}
          onDelete={id => { setResults(p => ({ ...p, posts: p.posts.filter(x => x.id !== id) })); setSelectedPost(null) }}
        />
      )}
    </div>
  )
}

function UserRow({ u, currentUserId, onFollow }) {
  return (
    <div className="flex items-center gap-3 px-4 py-3 hover:bg-gray-50 dark:hover:bg-gray-800 transition-colors">
      <Link to={`/${u.username}`}>
        <Avatar user={u} size="md" />
      </Link>
      <Link to={`/${u.username}`} className="flex-1 min-w-0">
        <p className="font-semibold text-sm text-gray-900 dark:text-white truncate">{u.username}</p>
        <p className="text-xs text-gray-500 truncate">{u.fullName} · {formatNumber(u.followerCount)} followers</p>
      </Link>
      {u.id !== currentUserId && (
        <button
          onClick={() => onFollow(u)}
          className={`text-sm font-semibold px-4 py-1.5 rounded-lg transition-all ${
            u.isFollowing
              ? 'bg-gray-100 dark:bg-gray-800 text-gray-700 dark:text-gray-300'
              : 'bg-blue-500 text-white hover:bg-blue-600'
          }`}
        >
          {u.isFollowing ? 'Following' : 'Follow'}
        </button>
      )}
    </div>
  )
}

function PostThumb({ post, onClick }) {
  return (
    <button onClick={onClick} className="post-grid-item aspect-square">
      <img src={post.mediaUrls?.[0]} alt="" loading="lazy" className="w-full h-full object-cover" />
      <div className="post-grid-item-overlay">
        <span className="font-semibold text-xs">❤️ {formatNumber(post.likeCount)}</span>
      </div>
    </button>
  )
}

function HashtagRow({ tag }) {
  return (
    <Link to={`/explore?tag=${tag}`}
      className="flex items-center gap-3 p-3 hover:bg-gray-50 dark:hover:bg-gray-800 rounded-xl transition-colors">
      <div className="w-11 h-11 bg-gray-100 dark:bg-gray-800 rounded-full flex items-center justify-center">
        <Hash size={20} className="text-gray-500" />
      </div>
      <div>
        <p className="font-semibold text-sm text-gray-900 dark:text-white">#{tag}</p>
        <p className="text-xs text-gray-500">Browse posts</p>
      </div>
    </Link>
  )
}

function NoResults({ query }) {
  return (
    <div className="text-center py-12 text-gray-400">
      <p className="text-sm">No results for "<strong className="text-gray-600 dark:text-gray-300">{query}</strong>"</p>
    </div>
  )
}
