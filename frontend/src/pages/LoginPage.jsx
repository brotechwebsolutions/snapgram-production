import { useState } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { Eye, EyeOff, Camera, Loader } from 'lucide-react'
import { useAuth }   from '../context/AuthContext'
import { useTheme }  from '../context/ThemeContext'
import { authApi }   from '../api/auth'
import toast         from 'react-hot-toast'
import OtpVerificationModal from '../components/auth/OtpVerificationModal'

export default function LoginPage() {
  const { login }        = useAuth()
  const { dark, toggle } = useTheme()
  const navigate         = useNavigate()
  const [form, setForm]  = useState({ usernameOrEmail: '', password: '' })
  const [showPw, setShowPw]    = useState(false)
  const [loading, setLoading]  = useState(false)
  const [errors, setErrors]    = useState({})
  // FIX #15 — if login fails because email unverified, prompt OTP
  const [showOtp, setShowOtp]  = useState(false)
  const [otpEmail, setOtpEmail] = useState('')

  const validate = () => {
    const e = {}
    if (!form.usernameOrEmail.trim()) e.usernameOrEmail = 'Email or username is required'
    if (!form.password) e.password = 'Password is required'
    setErrors(e)
    return Object.keys(e).length === 0
  }

  const handleSubmit = async (e) => {
    e.preventDefault()
    if (!validate()) return
    setLoading(true)
    try {
      await login(form)
      navigate('/', { replace: true })
    } catch (err) {
      const msg = err?.response?.data?.message || 'Login failed. Please try again.'

      // FIX #15 — email not verified → show OTP modal
      if (msg.startsWith('EMAIL_NOT_VERIFIED:') || msg.toLowerCase().includes('verify your email')) {
        const email = form.usernameOrEmail.includes('@')
          ? form.usernameOrEmail
          : ''
        setOtpEmail(email)
        // Resend OTP if we have their email
        if (email) {
          try { await authApi.resendOtp(email) } catch { /* silent */ }
        }
        setShowOtp(true)
        toast('Check your email for the verification code', { icon: '📧' })
      } else {
        toast.error(msg)
      }
    } finally {
      setLoading(false)
    }
  }

  const handleOtpVerified = () => {
    setShowOtp(false)
    toast.success('Email verified! You can now log in.')
  }

  return (
    <>
      <div className="min-h-screen bg-gray-50 dark:bg-black flex flex-col items-center justify-center p-4">
        <button onClick={toggle} className="absolute top-4 right-4 p-2 text-gray-500">
          {dark ? '☀️' : '🌙'}
        </button>

        <div className="w-full max-w-sm">
          <div className="text-center mb-8">
            <div className="w-16 h-16 mx-auto mb-4 rounded-2xl flex items-center justify-center"
              style={{background:'linear-gradient(135deg,#405DE6,#C13584,#FD1D1D)'}}>
              <Camera size={32} className="text-white" />
            </div>
            <h1 className="text-3xl font-bold gradient-text">SnapGram</h1>
            <p className="text-gray-500 dark:text-gray-400 text-sm mt-1">Share your moments with the world</p>
          </div>

          <div className="bg-white dark:bg-gray-900 rounded-2xl border border-gray-200 dark:border-gray-800 p-6 shadow-sm">
            <form onSubmit={handleSubmit} className="space-y-4" noValidate>
              <div>
                <input
                  type="text"
                  value={form.usernameOrEmail}
                  onChange={e => setForm(f => ({ ...f, usernameOrEmail: e.target.value }))}
                  placeholder="Email or username"
                  autoComplete="username"
                  className={`input-base ${errors.usernameOrEmail ? 'border-red-400 focus:ring-red-400' : ''}`}
                />
                {errors.usernameOrEmail && <p className="text-red-500 text-xs mt-1">{errors.usernameOrEmail}</p>}
              </div>

              <div className="relative">
                <input
                  type={showPw ? 'text' : 'password'}
                  value={form.password}
                  onChange={e => setForm(f => ({ ...f, password: e.target.value }))}
                  placeholder="Password"
                  autoComplete="current-password"
                  className={`input-base pr-12 ${errors.password ? 'border-red-400 focus:ring-red-400' : ''}`}
                />
                <button type="button" onClick={() => setShowPw(v => !v)}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 p-1">
                  {showPw ? <EyeOff size={18} /> : <Eye size={18} />}
                </button>
                {errors.password && <p className="text-red-500 text-xs mt-1">{errors.password}</p>}
              </div>

              <div className="flex justify-end">
                <Link to="/forgot-password" className="text-sm text-blue-500 hover:underline">
                  Forgot password?
                </Link>
              </div>

              <button type="submit" disabled={loading}
                className="btn-primary w-full flex items-center justify-center gap-2">
                {loading && <Loader size={18} className="animate-spin" />}
                {loading ? 'Signing in...' : 'Log in'}
              </button>
            </form>
          </div>

          <div className="mt-4 text-center bg-white dark:bg-gray-900 rounded-2xl border border-gray-200 dark:border-gray-800 p-4">
            <p className="text-sm text-gray-600 dark:text-gray-400">
              Don't have an account?{' '}
              <Link to="/register" className="text-blue-500 font-semibold hover:underline">Sign up</Link>
            </p>
          </div>
        </div>
      </div>

      {showOtp && (
        <OtpVerificationModal
          email={otpEmail}
          onVerified={handleOtpVerified}
          onClose={() => setShowOtp(false)}
        />
      )}
    </>
  )
}
