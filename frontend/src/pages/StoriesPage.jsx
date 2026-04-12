import { useState, useEffect } from 'react'
import { Plus } from 'lucide-react'
import { storiesApi } from '../api/stories'
import { useAuth }    from '../context/AuthContext'
import Avatar         from '../components/common/Avatar'
import StoryViewer    from '../components/stories/StoryViewer'
import CreateStoryModal from '../components/stories/CreateStoryModal'
import { timeAgo }    from '../utils/helpers'

export default function StoriesPage() {
  const { user }  = useAuth()
  const [groups, setGroups]   = useState([])
  const [loading, setLoading] = useState(true)
  const [viewing, setViewing] = useState(null)
  const [showCreate, setShowCreate] = useState(false)

  useEffect(() => {
    storiesApi.getFeed()
      .then(({ data }) => setGroups(data.data || []))
      .finally(() => setLoading(false))
  }, [])

  const myGroup = groups.find(g => g.user?.id === user?.id)

  return (
    <div className="max-w-xl mx-auto px-4 py-4">
      <div className="flex items-center justify-between mb-4">
        <h2 className="text-xl font-bold text-gray-900 dark:text-white">Stories</h2>
        <button onClick={() => setShowCreate(true)} className="btn-primary py-2 px-4 text-sm flex items-center gap-2">
          <Plus size={18} /> Add story
        </button>
      </div>

      {/* Your story */}
      <div className="bg-white dark:bg-gray-900 rounded-2xl border border-gray-200 dark:border-gray-800 p-4 mb-4">
        <h3 className="text-sm font-semibold text-gray-500 dark:text-gray-400 mb-3">Your story</h3>
        {myGroup ? (
          <button onClick={() => setViewing({ groupIdx: groups.indexOf(myGroup), storyIdx: 0 })}
            className="flex items-center gap-3 w-full hover:bg-gray-50 dark:hover:bg-gray-800 rounded-xl p-2 transition-colors">
            <div className="relative p-0.5 rounded-full" style={{background:'linear-gradient(45deg,#f09433,#e6683c,#dc2743,#cc2366,#bc1888)'}}>
              <div className="bg-white dark:bg-black p-0.5 rounded-full">
                <Avatar user={user} size="md" />
              </div>
            </div>
            <div className="text-left">
              <p className="font-semibold text-sm text-gray-900 dark:text-white">Your story</p>
              <p className="text-xs text-gray-500">{myGroup.stories?.length} story{myGroup.stories?.length !== 1 ? 'ies' : ''}</p>
            </div>
          </button>
        ) : (
          <button onClick={() => setShowCreate(true)} className="flex items-center gap-3 w-full hover:bg-gray-50 dark:hover:bg-gray-800 rounded-xl p-2 transition-colors">
            <div className="relative">
              <Avatar user={user} size="md" />
              <div className="absolute -bottom-1 -right-1 w-6 h-6 bg-blue-500 rounded-full flex items-center justify-center border-2 border-white dark:border-gray-900">
                <Plus size={12} className="text-white" />
              </div>
            </div>
            <div className="text-left">
              <p className="font-semibold text-sm text-gray-900 dark:text-white">Create story</p>
              <p className="text-xs text-gray-500">Share a photo or video</p>
            </div>
          </button>
        )}
      </div>

      {/* Following stories */}
      <div className="bg-white dark:bg-gray-900 rounded-2xl border border-gray-200 dark:border-gray-800 overflow-hidden">
        <h3 className="text-sm font-semibold text-gray-500 dark:text-gray-400 px-4 pt-4 pb-2">All stories</h3>
        {loading ? (
          Array(5).fill(0).map((_, i) => (
            <div key={i} className="flex items-center gap-3 px-4 py-3 animate-pulse">
              <div className="w-12 h-12 bg-gray-200 dark:bg-gray-700 rounded-full" />
              <div className="flex-1 space-y-2">
                <div className="h-3 bg-gray-200 dark:bg-gray-700 rounded w-24" />
                <div className="h-2 bg-gray-200 dark:bg-gray-700 rounded w-16" />
              </div>
            </div>
          ))
        ) : groups.filter(g => g.user?.id !== user?.id).length === 0 ? (
          <div className="text-center py-12 text-gray-400 text-sm px-4">
            Follow people to see their stories here
          </div>
        ) : groups.filter(g => g.user?.id !== user?.id).map((group, idx) => (
          <button key={idx} onClick={() => setViewing({ groupIdx: groups.indexOf(group), storyIdx: 0 })}
            className="w-full flex items-center gap-3 px-4 py-3 hover:bg-gray-50 dark:hover:bg-gray-800 transition-colors">
            <div className={`relative p-0.5 rounded-full ${group.hasUnviewed ? '' : 'bg-gray-200 dark:bg-gray-700'}`}
              style={group.hasUnviewed ? {background:'linear-gradient(45deg,#f09433,#e6683c,#dc2743,#cc2366,#bc1888)'} : {}}>
              <div className="bg-white dark:bg-black p-0.5 rounded-full">
                <Avatar user={group.user} size="md" />
              </div>
            </div>
            <div className="flex-1 text-left">
              <p className="font-semibold text-sm text-gray-900 dark:text-white">{group.user?.username}</p>
              <p className="text-xs text-gray-500">
                {group.stories?.length} stor{group.stories?.length !== 1 ? 'ies' : 'y'} • {timeAgo(group.stories?.[0]?.createdAt)}
              </p>
            </div>
            {group.hasUnviewed && (
              <span className="w-2.5 h-2.5 bg-blue-500 rounded-full flex-shrink-0" />
            )}
          </button>
        ))}
      </div>

      {viewing !== null && (
        <StoryViewer groups={groups} initialGroupIdx={viewing.groupIdx} onClose={() => setViewing(null)} />
      )}
      {showCreate && (
        <CreateStoryModal onClose={() => setShowCreate(false)} onCreated={() => { setShowCreate(false); window.location.reload() }} />
      )}
    </div>
  )
}
