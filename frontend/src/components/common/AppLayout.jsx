import { useState } from 'react'
import { Outlet, useLocation, useNavigate } from 'react-router-dom'
import { Menu, Camera } from 'lucide-react'
import Sidebar   from './Sidebar'
import BottomNav from './BottomNav'
import MobileNavDrawer from './MobileNavDrawer'

export default function AppLayout() {
  const navigate = useNavigate()
  const location = useLocation()
  const [menuOpen, setMenuOpen] = useState(false)
  const hideBottomNav = /^\/messages\/.+/.test(location.pathname)

  return (
    <div className="min-h-[100dvh] bg-gray-50 dark:bg-black flex">
      {/* Desktop sidebar */}
      <Sidebar />

      {/* Mobile top bar */}
      <header className="md:hidden fixed top-0 left-0 right-0 z-40 h-14 safe-top bg-white/90 dark:bg-black/90 backdrop-blur border-b border-gray-200 dark:border-gray-800 px-3 flex items-center justify-between">
        <button onClick={() => navigate('/')} className="flex items-center gap-2.5">
          <div
            className="w-8 h-8 rounded-xl flex items-center justify-center"
            style={{ background: 'linear-gradient(135deg,#405DE6,#C13584,#FD1D1D)' }}
          >
            <Camera size={17} className="text-white" />
          </div>
          <span className="text-base font-bold tracking-tight gradient-text">SnapGram</span>
        </button>

        <button
          type="button"
          onClick={() => setMenuOpen(true)}
          className="p-2 rounded-full hover:bg-gray-100 dark:hover:bg-gray-800"
          aria-label="Open navigation menu"
        >
          <Menu size={20} />
        </button>
      </header>

      {/* Main content */}
      <main className="flex-1 min-w-0 md:ml-64 xl:ml-72 pt-14 md:pt-0 pb-16 md:pb-0">
        <Outlet />
      </main>

      {/* Mobile bottom nav */}
      {!hideBottomNav && <BottomNav />}
      <MobileNavDrawer isOpen={menuOpen} onClose={() => setMenuOpen(false)} />
    </div>
  )
}
