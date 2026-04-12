import { useState, useEffect, useRef } from 'react'
import { useParams, Link, useNavigate } from 'react-router-dom'
import {
  Grid, Bookmark, Film, Settings, UserPlus, UserMinus,
  UserX, Volume2, VolumeX, MoreHorizontal, MessageCircle,
  Camera, Edit3
} from 'lucide-react'
import { usersApi } from '../api/users'
import { postsApi } from '../api/posts'
import { storiesApi } from '../api/stories'
import { useAuth }  from '../context/AuthContext'
import Avatar       from '../components/common/Avatar'
import { ProfileSkeleton } from '../components/common/Skeletons'
import PostDetailModal from '../components/feed/PostDetailModal'
import EditProfileModal from '../components/profile/EditProfileModal'
import { formatNumber } from '../utils/helpers'
import toast from 'react-hot-toast'

const TABS = [
  { id: 'posts',     icon: Grid,     label: 'Posts' },
  { id: 'saved',     icon: Bookmark, label: 'Saved' },
  { id: 'tagged',    icon: Film,     label: 'Tagged' },
]

export default function ProfilePage() {
  const { username }  = useParams()
  const { user: me, updateUser } = useAuth()
  const navigate      = useNavigate()
  const [profile, setProfile]   = useState(null)
  const [posts, setPosts]       = useState([])
  const [highlights, setHighlights] = useState([])
  const [tab, setTab]           = useState('posts')
  const [loading, setLoading]   = useState(true)
  const [postsLoading, setPostsLoading] = useState(false)
  const [selectedPost, setSelectedPost] = useState(null)
  const [showEdit, setShowEdit] = useState(false)
  const [showMenu, setShowMenu] = useState(false)
  const [page, setPage]         = useState(0)
  const [hasMore, setHasMore]   = useState(true)
  const fileRef = useRef(null)

  const isOwn = me?.username === username

  useEffect(() => {
    setLoading(true)
    setProfile(null)
    setPosts([])
    setPage(0)
    setHasMore(true)

    Promise.all([
      usersApi.getProfile(username),
      storiesApi.getUserHighlights(me?.id || '').catch(() => ({ data: { data: [] } }))
    ]).then(([profileRes, hlRes]) => {
      setProfile(profileRes.data.data)
      if (isOwn) setHighlights(hlRes.data.data || [])
    }).catch(() => navigate('/404'))
      .finally(() => setLoading(false))
  }, [username])

  useEffect(() => {
    if (!profile) return
    setPostsLoading(true)
    const fn = tab === 'saved'
      ? postsApi.getSaved(0, 18)
      : postsApi.getUserPosts(profile.id, 0, 18)
    fn.then(({ data }) => {
      setPosts(data.data?.content || [])
      setHasMore(!data.data?.last)
      setPage(1)
    }).finally(() => setPostsLoading(false))
  }, [tab, profile])

  const handleFollow = async () => {
    if (!profile) return
    try {
      const following = profile.isFollowing
      setProfile(p => ({
        ...p,
        isFollowing: !following,
        followerCount: following ? p.followerCount - 1 : p.followerCount + 1
      }))
      following ? await usersApi.unfollow(profile.id) : await usersApi.follow(profile.id)
    } catch { toast.error('Failed to update follow status') }
  }

  const handleBlock = async () => {
    try {
      await usersApi.block(profile.id)
      toast.success('User blocked')
      setShowMenu(false)
      navigate('/')
    } catch { toast.error('Failed to block user') }
  }

  const handleMute = async () => {
    try {
      profile.isMuted ? await usersApi.unmute(profile.id) : await usersApi.mute(profile.id)
      setProfile(p => ({ ...p, isMuted: !p.isMuted }))
      toast.success(profile.isMuted ? 'User unmuted' : 'User muted')
      setShowMenu(false)
    } catch { toast.error('Failed to update mute status') }
  }

  const handleProfilePicUpload = async (e) => {
    const file = e.target.files?.[0]
    if (!file) return
    const formData = new FormData()
    formData.append('file', file)
    try {
      const { data } = await usersApi.uploadProfilePic(formData)
      setProfile(p => ({ ...p, profilePictureUrl: data.data.profilePictureUrl }))
      updateUser({ profilePictureUrl: data.data.profilePictureUrl })
      toast.success('Profile picture updated!')
    } catch { toast.error('Failed to upload') }
  }

  if (loading) return <ProfileSkeleton />
  if (!profile) return null

  return (
    <div className="max-w-4xl mx-auto">
      {/* Cover photo */}
      <div className="relative h-40 md:h-56 bg-gradient-to-br from-gray-200 to-gray-300 dark:from-gray-800 dark:to-gray-700 overflow-hidden">
        {profile.coverPhotoUrl && (
          <img src={profile.coverPhotoUrl} alt="" className="w-full h-full object-cover" />
        )}
        {isOwn && (
          <label className="absolute bottom-3 right-3 bg-black/50 text-white rounded-lg px-3 py-1.5 text-xs cursor-pointer flex items-center gap-1.5 hover:bg-black/70 transition-colors">
            <Camera size={14} /> Edit cover
            <input type="file" accept="image/*" className="hidden" onChange={async e => {
              const file = e.target.files?.[0]
              if (!file) return
              const fd = new FormData()
              fd.append('file', file)
              try {
                const { data } = await usersApi.uploadCoverPhoto(fd)
                setProfile(p => ({ ...p, coverPhotoUrl: data.data.coverPhotoUrl }))
                toast.success('Cover photo updated!')
              } catch { toast.error('Failed to upload') }
            }} />
          </label>
        )}
      </div>

      {/* Profile info */}
      <div className="px-4 pb-4 bg-white dark:bg-gray-900 border-b border-gray-200 dark:border-gray-800">
        <div className="flex items-end justify-between -mt-12 mb-4">
          {/* Avatar */}
          <div className="relative">
            <Avatar user={profile} size="2xl" className="border-4 border-white dark:border-gray-900" />
            {isOwn && (
              <label className="absolute bottom-0 right-0 w-8 h-8 bg-gray-800 rounded-full flex items-center justify-center cursor-pointer hover:bg-gray-700 transition-colors border-2 border-white dark:border-gray-900">
                <Camera size={14} className="text-white" />
                <input ref={fileRef} type="file" accept="image/*" className="hidden" onChange={handleProfilePicUpload} />
              </label>
            )}
          </div>

          {/* Action buttons */}
          <div className="flex items-center gap-2 mt-14">
            {isOwn ? (
              <>
                <button onClick={() => setShowEdit(true)} className="btn-secondary flex items-center gap-2 py-2 px-4 text-sm">
                  <Edit3 size={16} /> Edit profile
                </button>
                <Link to="/settings" className="btn-secondary py-2 px-3 text-sm">
                  <Settings size={16} />
                </Link>
              </>
            ) : (
              <>
                <button onClick={handleFollow} className={`py-2 px-5 rounded-xl font-semibold text-sm transition-all ${profile.isFollowing ? 'btn-secondary' : 'btn-primary'}`}>
                  {profile.isFollowing
                    ? <span className="flex items-center gap-1"><UserMinus size={16} /> Unfollow</span>
                    : <span className="flex items-center gap-1"><UserPlus size={16} /> Follow</span>
                  }
                </button>
                <Link to="/messages" className="btn-secondary py-2 px-3 text-sm">
                  <MessageCircle size={16} />
                </Link>
                <div className="relative">
                  <button onClick={() => setShowMenu(!showMenu)} className="btn-secondary py-2 px-3 text-sm">
                    <MoreHorizontal size={16} />
                  </button>
                  {showMenu && (
                    <div className="absolute right-0 top-10 bg-white dark:bg-gray-800 rounded-xl shadow-xl border border-gray-100 dark:border-gray-700 py-1 w-44 z-20 animate-scale-in">
                      <button onClick={handleMute} className="w-full text-left px-4 py-2.5 text-sm hover:bg-gray-50 dark:hover:bg-gray-700 flex items-center gap-2">
                        {profile.isMuted ? <Volume2 size={16} /> : <VolumeX size={16} />}
                        {profile.isMuted ? 'Unmute' : 'Mute'}
                      </button>
                      <button onClick={handleBlock} className="w-full text-left px-4 py-2.5 text-sm text-red-500 hover:bg-red-50 dark:hover:bg-red-900/20 flex items-center gap-2">
                        <UserX size={16} /> Block
                      </button>
                    </div>
                  )}
                </div>
              </>
            )}
          </div>
        </div>

        {/* Bio section */}
        <div className="space-y-1 mb-4">
          <h1 className="text-lg font-bold text-gray-900 dark:text-white">{profile.fullName}</h1>
          <p className="text-sm text-gray-500 dark:text-gray-400">@{profile.username}</p>
          {profile.bio && <p className="text-sm text-gray-700 dark:text-gray-300 whitespace-pre-line">{profile.bio}</p>}
          {profile.website && (
            <a href={profile.website.startsWith('http') ? profile.website : `https://${profile.website}`}
               target="_blank" rel="noopener noreferrer"
               className="text-sm text-blue-500 hover:underline">{profile.website}</a>
          )}
          {!profile.isOnline && profile.lastSeen && (
            <p className="text-xs text-gray-400">Last seen recently</p>
          )}
          {profile.isOnline && (
            <p className="text-xs text-green-500 flex items-center gap-1">
              <span className="w-2 h-2 bg-green-500 rounded-full inline-block" /> Online
            </p>
          )}
        </div>

        {/* Stats */}
        <div className="flex gap-6">
          {[
            { label: 'posts', value: profile.postCount },
            { label: 'followers', value: profile.followerCount },
            { label: 'following', value: profile.followingCount },
          ].map(({ label, value }) => (
            <button key={label} className="text-center hover:opacity-70 transition-opacity">
              <p className="text-base font-bold text-gray-900 dark:text-white">{formatNumber(value || 0)}</p>
              <p className="text-sm text-gray-500 dark:text-gray-400">{label}</p>
            </button>
          ))}
        </div>
      </div>

      {/* Highlights */}
      {isOwn && highlights.length > 0 && (
        <div className="bg-white dark:bg-gray-900 border-b border-gray-200 dark:border-gray-800 px-4 py-3">
          <div className="flex gap-4 overflow-x-auto no-scrollbar">
            {highlights.map(hl => (
              <div key={hl.id} className="flex flex-col items-center gap-1 flex-shrink-0">
                <div className="w-16 h-16 rounded-full border-2 border-gray-200 dark:border-gray-700 overflow-hidden">
                  {hl.coverImageUrl
                    ? <img src={hl.coverImageUrl} alt={hl.title} className="w-full h-full object-cover" />
                    : <div className="w-full h-full bg-gray-200 dark:bg-gray-700" />
                  }
                </div>
                <span className="text-xs text-gray-600 dark:text-gray-400 w-16 text-center truncate">{hl.title}</span>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Tabs */}
      <div className="bg-white dark:bg-gray-900 border-b border-gray-200 dark:border-gray-800">
        <div className="flex">
          {TABS.filter(t => isOwn || t.id !== 'saved').map(t => (
            <button
              key={t.id}
              onClick={() => setTab(t.id)}
              className={`flex-1 flex items-center justify-center gap-2 py-3 text-sm font-semibold border-b-2 transition-colors ${
                tab === t.id
                  ? 'border-gray-900 dark:border-white text-gray-900 dark:text-white'
                  : 'border-transparent text-gray-400 hover:text-gray-600 dark:hover:text-gray-300'
              }`}
            >
              <t.icon size={18} />
              <span className="hidden sm:inline">{t.label}</span>
            </button>
          ))}
        </div>
      </div>

      {/* Posts grid */}
      {postsLoading ? (
        <div className="grid grid-cols-3 gap-0.5">
          {Array(9).fill(0).map((_, i) => (
            <div key={i} className="aspect-square bg-gray-200 dark:bg-gray-800 animate-pulse" />
          ))}
        </div>
      ) : posts.length === 0 ? (
        <div className="text-center py-20">
          <div className="text-5xl mb-4">📸</div>
          <p className="text-gray-500 dark:text-gray-400">
            {tab === 'saved' ? 'No saved posts yet' : 'No posts yet'}
          </p>
        </div>
      ) : (
        <div className="grid grid-cols-3 gap-0.5">
          {posts.map(post => (
            <div
              key={post.id}
              className="post-grid-item"
              onClick={() => setSelectedPost(post)}
            >
              <img src={post.mediaUrls?.[0]} alt="" loading="lazy" />
              {post.mediaUrls?.length > 1 && (
                <div className="absolute top-2 right-2 text-white">
                  <Grid size={16} />
                </div>
              )}
              <div className="post-grid-item-overlay">
                <span className="flex items-center gap-1 font-semibold">❤️ {formatNumber(post.likeCount)}</span>
                <span className="flex items-center gap-1 font-semibold">💬 {formatNumber(post.commentCount)}</span>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Post detail modal */}
      {selectedPost && (
        <PostDetailModal
          post={selectedPost}
          onClose={() => setSelectedPost(null)}
          onDelete={(id) => {
            setPosts(prev => prev.filter(p => p.id !== id))
            setSelectedPost(null)
          }}
        />
      )}

      {/* Edit profile modal */}
      {showEdit && (
        <EditProfileModal
          profile={profile}
          onClose={() => setShowEdit(false)}
          onUpdated={(updated) => {
            setProfile(p => ({ ...p, ...updated }))
            updateUser(updated)
          }}
        />
      )}
    </div>
  )
}
