import { NavLink } from 'react-router-dom'
import { Home, Search, PlusSquare, Heart, User } from 'lucide-react'
import { useAuth }          from '../../context/AuthContext'
import { useNotifications } from '../../context/NotificationContext'
import { useState }         from 'react'
import CreatePostModal      from '../feed/CreatePostModal'

export default function BottomNav() {
  const { user }        = useAuth()
  const { unreadCount } = useNotifications()
  const [showCreate, setShowCreate] = useState(false)

  const activeClass   = 'text-gray-900 dark:text-white scale-110'
  const inactiveClass = 'text-gray-400 dark:text-gray-500'

  return (
    <>
      <nav className="md:hidden fixed bottom-0 left-0 right-0 z-40 bg-white dark:bg-black border-t border-gray-200 dark:border-gray-800 safe-bottom">
        <div className="flex items-center justify-around px-2 py-2">
          <NavLink to="/" className={({ isActive }) => `p-2 transition-all ${isActive ? activeClass : inactiveClass}`}>
            <Home size={26} />
          </NavLink>

          <NavLink to="/search" className={({ isActive }) => `p-2 transition-all ${isActive ? activeClass : inactiveClass}`}>
            <Search size={26} />
          </NavLink>

          <button
            onClick={() => setShowCreate(true)}
            className="p-2 text-gray-700 dark:text-gray-300 active:scale-95 transition-all"
          >
            <PlusSquare size={28} />
          </button>

          <NavLink to="/notifications" className={({ isActive }) => `relative p-2 transition-all ${isActive ? activeClass : inactiveClass}`}>
            <Heart size={26} />
            {unreadCount > 0 && (
              <span className="notification-dot">{unreadCount > 9 ? '9+' : unreadCount}</span>
            )}
          </NavLink>

          <NavLink to={user ? `/${user.username}` : '/login'} className={({ isActive }) => `p-2 transition-all ${isActive ? activeClass : inactiveClass}`}>
            {user?.profilePictureUrl
              ? <img src={user.profilePictureUrl} alt="" className="w-7 h-7 rounded-full object-cover ring-2 ring-transparent" />
              : <User size={26} />
            }
          </NavLink>
        </div>
      </nav>

      {showCreate && <CreatePostModal onClose={() => setShowCreate(false)} />}
    </>
  )
}
