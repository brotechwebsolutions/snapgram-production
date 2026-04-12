import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom'
import { Toaster } from 'react-hot-toast'
import { AuthProvider, useAuth } from './context/AuthContext'
import { ThemeProvider } from './context/ThemeContext'
import { SocketProvider } from './context/SocketContext'
import { NotificationProvider } from './context/NotificationContext'

// Auth pages
import LoginPage          from './pages/LoginPage'
import RegisterPage       from './pages/RegisterPage'
import OtpVerifyPage      from './pages/OtpVerifyPage'
import VerifyEmailPage    from './pages/VerifyEmailPage'
import ForgotPasswordPage from './pages/ForgotPasswordPage'
import ResetPasswordPage  from './pages/ResetPasswordPage'

// App pages
import FeedPage           from './pages/FeedPage'
import ExplorePage        from './pages/ExplorePage'
import ProfilePage        from './pages/ProfilePage'
import PostDetailPage     from './pages/PostDetailPage'
import ChatPage           from './pages/ChatPage'
import NotificationsPage  from './pages/NotificationsPage'
import SettingsPage       from './pages/SettingsPage'
import StoriesPage        from './pages/StoriesPage'
import SearchPage         from './pages/SearchPage'
import NotFoundPage       from './pages/NotFoundPage'

// Layout
import AppLayout from './components/common/AppLayout'

// ── Route guards ───────────────────────────────────────────────────────────

const ProtectedRoute = ({ children }) => {
  const { isAuthenticated, loading } = useAuth()
  if (loading) return <FullPageSpinner />
  if (!isAuthenticated) return <Navigate to="/login" replace />
  return children
}

const GuestRoute = ({ children }) => {
  const { isAuthenticated, loading } = useAuth()
  if (loading) return <FullPageSpinner />
  if (isAuthenticated) return <Navigate to="/" replace />
  return children
}

const FullPageSpinner = () => (
  <div className="min-h-screen flex items-center justify-center bg-gray-50 dark:bg-black">
    <div className="flex flex-col items-center gap-3">
      <div className="w-10 h-10 border-4 border-gray-200 border-t-brand-500 rounded-full animate-spin" />
      <p className="text-sm text-gray-400 dark:text-gray-600">Loading...</p>
    </div>
  </div>
)

// ── Routes ─────────────────────────────────────────────────────────────────

function AppRoutes() {
  return (
    <Routes>
      {/* ── Public auth routes ── */}
      <Route path="/login"           element={<GuestRoute><LoginPage /></GuestRoute>} />
      <Route path="/register"        element={<GuestRoute><RegisterPage /></GuestRoute>} />

      {/* OTP verification — accessible without being logged in */}
      <Route path="/verify-otp"      element={<OtpVerifyPage />} />
      <Route path="/verify-email"    element={<VerifyEmailPage />} />

      {/* Password reset — guest only */}
      <Route path="/forgot-password" element={<GuestRoute><ForgotPasswordPage /></GuestRoute>} />
      <Route path="/reset-password"  element={<GuestRoute><ResetPasswordPage /></GuestRoute>} />

      {/* ── Protected app routes (require login) ── */}
      <Route element={<ProtectedRoute><AppLayout /></ProtectedRoute>}>
        <Route path="/"                  element={<FeedPage />} />
        <Route path="/explore"           element={<ExplorePage />} />
        <Route path="/search"            element={<SearchPage />} />
        <Route path="/stories"           element={<StoriesPage />} />
        <Route path="/messages"          element={<ChatPage />} />
        <Route path="/messages/:convId"  element={<ChatPage />} />
        <Route path="/notifications"     element={<NotificationsPage />} />
        <Route path="/settings"          element={<SettingsPage />} />
        <Route path="/posts/:postId"     element={<PostDetailPage />} />
        {/* /:username must be last — it's a catch-all for profile pages */}
        <Route path="/:username"         element={<ProfilePage />} />
      </Route>

      <Route path="*" element={<NotFoundPage />} />
    </Routes>
  )
}

// ── App root ───────────────────────────────────────────────────────────────

export default function App() {
  return (
    <BrowserRouter>
      <ThemeProvider>
        <AuthProvider>
          <SocketProvider>
            <NotificationProvider>
              <AppRoutes />
              <Toaster
                position="top-center"
                gutter={8}
                toastOptions={{
                  duration: 4000,
                  style: {
                    borderRadius: '12px',
                    fontWeight: 500,
                    fontSize: '14px',
                    padding: '12px 16px',
                  },
                  success: { iconTheme: { primary: '#C13584', secondary: '#fff' } },
                  error:   { iconTheme: { primary: '#ef4444', secondary: '#fff' } },
                }}
              />
            </NotificationProvider>
          </SocketProvider>
        </AuthProvider>
      </ThemeProvider>
    </BrowserRouter>
  )
}
