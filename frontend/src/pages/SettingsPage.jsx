import { useState } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import {
  Eye, EyeOff, Shield, Bell, Lock, LogOut,
  ChevronRight, Loader, Monitor, BarChart2,
  UserX, Trash2, ExternalLink
} from 'lucide-react'
import { authApi }      from '../api/auth'
import { analyticsApi } from '../api/analytics'
import { useAuth }      from '../context/AuthContext'
import { useTheme }     from '../context/ThemeContext'
import { formatNumber } from '../utils/helpers'
import toast            from 'react-hot-toast'

export default function SettingsPage() {
  const { logout, user }  = useAuth()
  const { dark, toggle }  = useTheme()
  const navigate          = useNavigate()
  const [section, setSection]   = useState(null)
  const [pwForm, setPwForm]     = useState({ currentPassword: '', newPassword: '', confirm: '' })
  const [showPw, setShowPw]     = useState(false)
  const [loading, setLoading]   = useState(false)
  const [analytics, setAnalytics] = useState(null)
  const [analyticsLoading, setAnalyticsLoading] = useState(false)

  const toggle_section = (id) => setSection(s => s === id ? null : id)

  const handleChangePassword = async (e) => {
    e.preventDefault()
    if (pwForm.newPassword !== pwForm.confirm) { toast.error("Passwords don't match"); return }
    if (pwForm.newPassword.length < 8) { toast.error("Password must be at least 8 characters"); return }
    if (!/(?=.*[a-z])(?=.*[A-Z])(?=.*\d)/.test(pwForm.newPassword)) {
      toast.error("Must include uppercase, lowercase, and number")
      return
    }
    setLoading(true)
    try {
      await authApi.changePassword({
        currentPassword: pwForm.currentPassword,
        newPassword:     pwForm.newPassword,
      })
      toast.success('Password changed successfully!')
      setPwForm({ currentPassword: '', newPassword: '', confirm: '' })
      setSection(null)
    } catch (err) {
      toast.error(err?.response?.data?.message || 'Failed to change password')
    } finally { setLoading(false) }
  }

  const handleOpenAnalytics = async () => {
    if (section === 'analytics') { setSection(null); return }
    setSection('analytics')
    if (!analytics) {
      setAnalyticsLoading(true)
      try {
        const { data } = await analyticsApi.profile()
        setAnalytics(data.data)
      } catch { toast.error('Failed to load analytics') }
      finally { setAnalyticsLoading(false) }
    }
  }

  const SECTIONS = [
    { id: 'security',      icon: Shield,   label: 'Security',       desc: 'Change password, login sessions' },
    { id: 'privacy',       icon: Lock,     label: 'Privacy',        desc: 'Account visibility, blocked users' },
    { id: 'analytics',     icon: BarChart2, label: 'Analytics',     desc: 'Profile and post engagement stats', action: handleOpenAnalytics },
    { id: 'notifications', icon: Bell,     label: 'Notifications',  desc: 'Manage notification preferences' },
  ]

  return (
    <div className="max-w-xl mx-auto px-4 py-4 pb-10 space-y-3">
      <h2 className="text-xl font-bold text-gray-900 dark:text-white px-1 mb-4">Settings</h2>

      {/* Profile quick link */}
      {user && (
        <Link to={`/${user.username}`}
          className="flex items-center gap-3 bg-white dark:bg-gray-900 rounded-2xl border border-gray-200 dark:border-gray-800 p-4 hover:bg-gray-50 dark:hover:bg-gray-800 transition-colors">
          <div className="w-12 h-12 rounded-full overflow-hidden bg-gray-200 dark:bg-gray-700 flex-shrink-0">
            {user.profilePictureUrl
              ? <img src={user.profilePictureUrl} alt="" className="w-full h-full object-cover" />
              : <div className="w-full h-full" style={{background:'linear-gradient(135deg,#405DE6,#C13584)'}} />
            }
          </div>
          <div className="flex-1 min-w-0">
            <p className="font-semibold text-gray-900 dark:text-white truncate">{user.fullName || user.username}</p>
            <p className="text-sm text-blue-500">Edit profile →</p>
          </div>
          <ChevronRight size={18} className="text-gray-400 flex-shrink-0" />
        </Link>
      )}

      {/* Dark mode */}
      <div className="bg-white dark:bg-gray-900 rounded-2xl border border-gray-200 dark:border-gray-800 p-4">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 bg-gray-100 dark:bg-gray-800 rounded-xl flex items-center justify-center">
              <Monitor size={20} className="text-gray-600 dark:text-gray-400" />
            </div>
            <div>
              <p className="font-semibold text-gray-900 dark:text-white text-sm">Appearance</p>
              <p className="text-xs text-gray-500">{dark ? 'Dark mode on' : 'Light mode on'}</p>
            </div>
          </div>
          <button
            onClick={toggle}
            className={`w-12 h-6 rounded-full transition-colors relative ${dark ? 'bg-brand-500' : 'bg-gray-200 dark:bg-gray-700'}`}
          >
            <div className={`w-5 h-5 bg-white rounded-full shadow-sm absolute top-0.5 transition-transform ${dark ? 'translate-x-6' : 'translate-x-0.5'}`} />
          </button>
        </div>
      </div>

      {/* Expandable sections */}
      {SECTIONS.map(({ id, icon: Icon, label, desc, action }) => (
        <div key={id}>
          <button
            onClick={action || (() => toggle_section(id))}
            className="w-full bg-white dark:bg-gray-900 rounded-2xl border border-gray-200 dark:border-gray-800 p-4 flex items-center justify-between hover:bg-gray-50 dark:hover:bg-gray-800 transition-colors"
          >
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 bg-gray-100 dark:bg-gray-800 rounded-xl flex items-center justify-center flex-shrink-0">
                <Icon size={20} className="text-gray-600 dark:text-gray-400" />
              </div>
              <div className="text-left">
                <p className="font-semibold text-gray-900 dark:text-white text-sm">{label}</p>
                <p className="text-xs text-gray-500 mt-0.5">{desc}</p>
              </div>
            </div>
            <ChevronRight size={18} className={`text-gray-400 transition-transform flex-shrink-0 ${section === id ? 'rotate-90' : ''}`} />
          </button>

          {/* ── Security Panel ──────────────────────────────────────── */}
          {section === 'security' && id === 'security' && (
            <div className="bg-white dark:bg-gray-900 rounded-2xl border border-gray-200 dark:border-gray-800 p-5 mt-1 animate-slide-down">
              <h3 className="font-semibold text-gray-900 dark:text-white mb-4">Change Password</h3>
              <form onSubmit={handleChangePassword} className="space-y-3">
                {[
                  { key: 'currentPassword', label: 'Current password' },
                  { key: 'newPassword',     label: 'New password' },
                  { key: 'confirm',         label: 'Confirm new password' },
                ].map(({ key, label }) => (
                  <div key={key} className="relative">
                    <input
                      type={showPw ? 'text' : 'password'}
                      value={pwForm[key]}
                      onChange={e => setPwForm(f => ({ ...f, [key]: e.target.value }))}
                      placeholder={label}
                      className={`input-base pr-12 text-sm ${
                        key === 'confirm' && pwForm.confirm && pwForm.confirm !== pwForm.newPassword
                          ? 'border-red-400' : ''
                      }`}
                    />
                    {key === 'confirm' && (
                      <button type="button" onClick={() => setShowPw(v => !v)}
                        className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400">
                        {showPw ? <EyeOff size={16} /> : <Eye size={16} />}
                      </button>
                    )}
                  </div>
                ))}
                {pwForm.confirm && pwForm.confirm !== pwForm.newPassword && (
                  <p className="text-red-500 text-xs">Passwords don't match</p>
                )}
                <button type="submit" disabled={loading}
                  className="btn-primary w-full flex items-center justify-center gap-2 text-sm">
                  {loading && <Loader size={15} className="animate-spin" />}
                  Update Password
                </button>
              </form>
            </div>
          )}

          {/* ── Analytics Panel ─────────────────────────────────────── */}
          {section === 'analytics' && id === 'analytics' && (
            <div className="bg-white dark:bg-gray-900 rounded-2xl border border-gray-200 dark:border-gray-800 p-5 mt-1 animate-slide-down">
              <h3 className="font-semibold text-gray-900 dark:text-white mb-4">Profile Analytics</h3>
              {analyticsLoading ? (
                <div className="grid grid-cols-2 gap-3">
                  {Array(6).fill(0).map((_, i) => (
                    <div key={i} className="bg-gray-50 dark:bg-gray-800 rounded-xl p-3 animate-pulse">
                      <div className="h-6 bg-gray-200 dark:bg-gray-700 rounded w-12 mx-auto mb-1" />
                      <div className="h-3 bg-gray-200 dark:bg-gray-700 rounded w-16 mx-auto" />
                    </div>
                  ))}
                </div>
              ) : analytics ? (
                <>
                  <div className="grid grid-cols-2 gap-3">
                    {[
                      { label: 'Posts',         value: analytics.postCount },
                      { label: 'Followers',     value: analytics.followerCount },
                      { label: 'Total Views',   value: analytics.totalViews },
                      { label: 'Total Likes',   value: analytics.totalLikes },
                      { label: 'Comments',      value: analytics.totalComments },
                      { label: 'Following',     value: analytics.followingCount },
                    ].map(({ label, value }) => (
                      <div key={label} className="bg-gray-50 dark:bg-gray-800 rounded-xl p-3 text-center">
                        <p className="text-xl font-bold text-gray-900 dark:text-white">{formatNumber(value ?? 0)}</p>
                        <p className="text-xs text-gray-500 mt-0.5">{label}</p>
                      </div>
                    ))}
                  </div>
                  {analytics.topPostId && (
                    <Link to={`/posts/${analytics.topPostId}`}
                      className="mt-3 flex items-center justify-center gap-1 text-sm text-blue-500 hover:underline">
                      View top post <ExternalLink size={13} />
                    </Link>
                  )}
                </>
              ) : null}
            </div>
          )}

          {/* ── Privacy Panel ────────────────────────────────────────── */}
          {section === 'privacy' && id === 'privacy' && (
            <div className="bg-white dark:bg-gray-900 rounded-2xl border border-gray-200 dark:border-gray-800 p-5 mt-1 animate-slide-down space-y-3">
              <h3 className="font-semibold text-gray-900 dark:text-white">Privacy</h3>
              <Link to={user ? `/${user.username}` : '/'}
                className="flex items-center justify-between text-sm text-gray-700 dark:text-gray-300 py-2 px-3 rounded-xl hover:bg-gray-50 dark:hover:bg-gray-800 transition-colors">
                <span className="flex items-center gap-2"><Lock size={15} /> Account privacy (private/public)</span>
                <ChevronRight size={15} className="text-gray-400" />
              </Link>
              <button className="w-full flex items-center justify-between text-sm text-gray-700 dark:text-gray-300 py-2 px-3 rounded-xl hover:bg-gray-50 dark:hover:bg-gray-800 transition-colors">
                <span className="flex items-center gap-2"><UserX size={15} /> Blocked accounts</span>
                <ChevronRight size={15} className="text-gray-400" />
              </button>
            </div>
          )}
        </div>
      ))}

      {/* Logout */}
      <button
        onClick={logout}
        className="w-full bg-white dark:bg-gray-900 rounded-2xl border border-red-200 dark:border-red-900/40 p-4 flex items-center gap-3 text-red-500 hover:bg-red-50 dark:hover:bg-red-900/10 transition-colors"
      >
        <LogOut size={20} />
        <span className="font-semibold">Log out</span>
      </button>

      <p className="text-center text-xs text-gray-400 dark:text-gray-600 pb-2">
        SnapGram © {new Date().getFullYear()}
      </p>
    </div>
  )
}
