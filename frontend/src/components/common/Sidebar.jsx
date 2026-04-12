import { useState } from 'react'
import { NavLink, useNavigate } from 'react-router-dom'
import {
  Home, Search, Compass, Film, MessageCircle,
  Bell, PlusSquare, Settings, LogOut, Moon, Sun, Camera, BarChart2
} from 'lucide-react'
import { useAuth }          from '../../context/AuthContext'
import { useTheme }         from '../../context/ThemeContext'
import { useNotifications } from '../../context/NotificationContext'
import Avatar               from './Avatar'
import CreatePostModal      from '../feed/CreatePostModal'

const NAV = [
  { to: '/',              icon: Home,          label: 'Home' },
  { to: '/search',        icon: Search,        label: 'Search' },
  { to: '/explore',       icon: Compass,       label: 'Explore' },
  { to: '/stories',       icon: Film,          label: 'Stories' },
  { to: '/messages',      icon: MessageCircle, label: 'Messages' },
  { to: '/notifications', icon: Bell,          label: 'Notifications', notif: true },
]

export default function Sidebar() {
  const { user, logout }    = useAuth()
  const { dark, toggle }    = useTheme()
  const { unreadCount }     = useNotifications()
  const [showCreate, setShowCreate] = useState(false)
  const navigate = useNavigate()

  const linkClass = ({ isActive }) =>
    `nav-item ${isActive ? 'active' : ''}`

  return (
    <>
      <aside className="hidden md:flex flex-col fixed left-0 top-0 h-full w-64 xl:w-72 border-r border-gray-200 dark:border-gray-800 bg-white dark:bg-black z-40 px-3 py-6">

        {/* Logo */}
        <button onClick={() => navigate('/')} className="px-3 mb-8 flex items-center gap-2.5">
          <div className="w-9 h-9 rounded-xl flex items-center justify-center flex-shrink-0"
            style={{background:'linear-gradient(135deg,#405DE6,#C13584,#FD1D1D)'}}>
            <Camera size={19} className="text-white" />
          </div>
          <span className="text-xl font-bold tracking-tight gradient-text hidden xl:block">SnapGram</span>
        </button>

        {/* Nav */}
        <nav className="flex-1 space-y-0.5">
          {NAV.map(({ to, icon: Icon, label, notif }) => (
            <NavLink key={to} to={to} className={linkClass}>
              <div className="relative">
                <Icon size={24} />
                {notif && unreadCount > 0 && (
                  <span className="notification-dot">{unreadCount > 9 ? '9+' : unreadCount}</span>
                )}
              </div>
              <span className="xl:block hidden">{label}</span>
            </NavLink>
          ))}

          <button onClick={() => setShowCreate(true)} className="nav-item w-full text-left">
            <PlusSquare size={24} />
            <span className="xl:block hidden">Create</span>
          </button>
        </nav>

        {/* Bottom */}
        <div className="space-y-0.5 border-t border-gray-100 dark:border-gray-800 pt-3 mt-3">
          <button onClick={toggle} className="nav-item w-full text-left">
            {dark ? <Sun size={22} /> : <Moon size={22} />}
            <span className="xl:block hidden">{dark ? 'Light Mode' : 'Dark Mode'}</span>
          </button>

          <NavLink to="/settings" className={linkClass}>
            <Settings size={22} />
            <span className="xl:block hidden">Settings</span>
          </NavLink>

          {user && (
            <NavLink to={`/${user.username}`} className={linkClass}>
              <Avatar user={user} size="sm" />
              <div className="xl:block hidden min-w-0">
                <p className="text-sm font-semibold truncate">{user.username}</p>
                <p className="text-xs text-gray-500 truncate">{user.fullName}</p>
              </div>
            </NavLink>
          )}

          <button
            onClick={logout}
            className="nav-item w-full text-left text-red-500 hover:bg-red-50 dark:hover:bg-red-900/20"
          >
            <LogOut size={22} />
            <span className="xl:block hidden">Log out</span>
          </button>
        </div>
      </aside>

      {showCreate && <CreatePostModal onClose={() => setShowCreate(false)} />}
    </>
  )
}
