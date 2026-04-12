import { useState } from 'react'
import { NavLink, useNavigate } from 'react-router-dom'
import {
  Home, Search, Compass, Film, MessageCircle,
  Bell, PlusSquare, Settings, LogOut, Moon, Sun, Camera, X
} from 'lucide-react'
import { useAuth } from '../../context/AuthContext'
import { useTheme } from '../../context/ThemeContext'
import { useNotifications } from '../../context/NotificationContext'
import Avatar from './Avatar'
import CreatePostModal from '../feed/CreatePostModal'

const NAV = [
  { to: '/', label: 'Home', icon: Home },
  { to: '/search', label: 'Search', icon: Search },
  { to: '/explore', label: 'Explore', icon: Compass },
  { to: '/stories', label: 'Stories', icon: Film },
  { to: '/messages', label: 'Messages', icon: MessageCircle },
  { to: '/notifications', label: 'Notifications', icon: Bell, notif: true },
]

export default function MobileNavDrawer({ isOpen, onClose }) {
  const { user, logout } = useAuth()
  const { dark, toggle } = useTheme()
  const { unreadCount } = useNotifications()
  const navigate = useNavigate()
  const [showCreate, setShowCreate] = useState(false)

  if (!isOpen) return null

  return (
    <>
      <div className="fixed inset-0 z-50 md:hidden" role="dialog" aria-modal="true">
        <button
          type="button"
          aria-label="Close menu"
          onClick={onClose}
          className="absolute inset-0 bg-black/50 animate-[fadeIn_180ms_ease-out]"
        />

        <aside className="absolute left-0 top-0 h-full w-[82%] max-w-xs bg-white dark:bg-black border-r border-gray-200 dark:border-gray-800 px-4 py-5 flex flex-col animate-[slideInLeft_220ms_ease-out]">
          <div className="flex items-center justify-between mb-5">
            <button onClick={() => { navigate('/'); onClose() }} className="flex items-center gap-2.5">
              <div
                className="w-9 h-9 rounded-xl flex items-center justify-center"
                style={{ background: 'linear-gradient(135deg,#405DE6,#C13584,#FD1D1D)' }}
              >
                <Camera size={19} className="text-white" />
              </div>
              <span className="text-lg font-bold tracking-tight gradient-text">SnapGram</span>
            </button>

            <button
              type="button"
              onClick={onClose}
              className="p-2 rounded-full hover:bg-gray-100 dark:hover:bg-gray-800"
              aria-label="Close menu"
            >
              <X size={18} />
            </button>
          </div>

          <nav className="flex-1 space-y-1">
            {NAV.map(({ to, icon: Icon, label, notif }) => (
              <NavLink
                key={to}
                to={to}
                onClick={onClose}
                className={({ isActive }) => `nav-item ${isActive ? 'active' : ''}`}
              >
                <div className="relative">
                  <Icon size={21} />
                  {notif && unreadCount > 0 && (
                    <span className="notification-dot">{unreadCount > 9 ? '9+' : unreadCount}</span>
                  )}
                </div>
                <span>{label}</span>
              </NavLink>
            ))}

            <button
              type="button"
              onClick={() => {
                setShowCreate(true)
                onClose()
              }}
              className="nav-item w-full text-left"
            >
              <PlusSquare size={21} />
              <span>Create</span>
            </button>
          </nav>

          <div className="space-y-1 border-t border-gray-100 dark:border-gray-800 pt-3 mt-3">
            <button
              type="button"
              onClick={() => {
                toggle()
                onClose()
              }}
              className="nav-item w-full text-left"
            >
              {dark ? <Sun size={20} /> : <Moon size={20} />}
              <span>{dark ? 'Light Mode' : 'Dark Mode'}</span>
            </button>

            <NavLink to="/settings" onClick={onClose} className={({ isActive }) => `nav-item ${isActive ? 'active' : ''}`}>
              <Settings size={20} />
              <span>Settings</span>
            </NavLink>

            {user && (
              <NavLink to={`/${user.username}`} onClick={onClose} className={({ isActive }) => `nav-item ${isActive ? 'active' : ''}`}>
                <Avatar user={user} size="sm" />
                <div className="min-w-0">
                  <p className="text-sm font-semibold truncate">{user.username}</p>
                  <p className="text-xs text-gray-500 truncate">{user.fullName}</p>
                </div>
              </NavLink>
            )}

            <button
              type="button"
              onClick={logout}
              className="nav-item w-full text-left text-red-500 hover:bg-red-50 dark:hover:bg-red-900/20"
            >
              <LogOut size={20} />
              <span>Log out</span>
            </button>
          </div>
        </aside>
      </div>

      {showCreate && <CreatePostModal onClose={() => setShowCreate(false)} />}
    </>
  )
}