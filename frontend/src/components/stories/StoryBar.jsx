import { useState, useEffect } from 'react'
import { Plus } from 'lucide-react'
import { storiesApi } from '../../api/stories'
import { useAuth }    from '../../context/AuthContext'
import Avatar         from '../common/Avatar'
import { StorySkeleton } from '../common/Skeletons'
import StoryViewer    from '../stories/StoryViewer'
import CreateStoryModal from '../stories/CreateStoryModal'

export default function StoryBar() {
  const { user }  = useAuth()
  const [groups, setGroups]   = useState([])
  const [loading, setLoading] = useState(true)
  const [viewing, setViewing] = useState(null)   // { groupIdx, storyIdx }
  const [showCreate, setShowCreate] = useState(false)

  useEffect(() => {
    storiesApi.getFeed()
      .then(({ data }) => setGroups(data.data || []))
      .catch(() => {})
      .finally(() => setLoading(false))
  }, [])

  const openStory = (groupIdx) => setViewing({ groupIdx, storyIdx: 0 })

  return (
    <>
      <div className="bg-white dark:bg-gray-900 border border-gray-200 dark:border-gray-800 rounded-2xl p-4">
        <div className="flex gap-4 overflow-x-auto no-scrollbar">
          {/* Your story */}
          <button onClick={() => setShowCreate(true)} className="flex flex-col items-center gap-1.5 flex-shrink-0">
            <div className="relative">
              <Avatar user={user} size="lg" />
              <div className="absolute -bottom-1 -right-1 w-6 h-6 bg-blue-500 rounded-full border-2 border-white dark:border-gray-900 flex items-center justify-center">
                <Plus size={12} className="text-white" strokeWidth={3} />
              </div>
            </div>
            <span className="text-xs text-gray-600 dark:text-gray-400 w-16 text-center truncate">Your story</span>
          </button>

          {/* Loading skeletons */}
          {loading && Array(6).fill(0).map((_, i) => <StorySkeleton key={i} />)}

          {/* Story groups */}
          {!loading && groups.map((group, idx) => {
            // Skip self story group (already handled above)
            if (group.user?.id === user?.id) return null
            const hasUnviewed = group.hasUnviewed
            return (
              <button
                key={idx}
                onClick={() => openStory(idx)}
                className="flex flex-col items-center gap-1.5 flex-shrink-0"
              >
                <div className={`relative p-0.5 rounded-full ${hasUnviewed ? 'bg-instagram-gradient' : 'bg-gray-200 dark:bg-gray-700'}`}
                  style={hasUnviewed ? {background:'linear-gradient(45deg,#f09433,#e6683c,#dc2743,#cc2366,#bc1888)'} : {}}>
                  <div className="bg-white dark:bg-black p-0.5 rounded-full">
                    <Avatar user={group.user} size="lg" />
                  </div>
                </div>
                <span className="text-xs text-gray-600 dark:text-gray-400 w-16 text-center truncate">
                  {group.user?.username}
                </span>
              </button>
            )
          })}
        </div>
      </div>

      {/* Story viewer */}
      {viewing !== null && (
        <StoryViewer
          groups={groups}
          initialGroupIdx={viewing.groupIdx}
          onClose={() => setViewing(null)}
        />
      )}

      {/* Create story modal */}
      {showCreate && (
        <CreateStoryModal
          onClose={() => setShowCreate(false)}
          onCreated={(story) => {
            // Prepend user's story to groups
            setGroups(prev => {
              const existing = prev.findIndex(g => g.user?.id === user?.id)
              if (existing >= 0) {
                const updated = [...prev]
                updated[existing].stories = [story, ...(updated[existing].stories || [])]
                return updated
              }
              return [{ user, stories: [story], hasUnviewed: false }, ...prev]
            })
            setShowCreate(false)
          }}
        />
      )}
    </>
  )
}
