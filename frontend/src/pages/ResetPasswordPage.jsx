import { useState, useEffect } from 'react'
import { Link, useSearchParams, useNavigate } from 'react-router-dom'
import { Eye, EyeOff, Loader, CheckCircle, XCircle, Lock } from 'lucide-react'
import { authApi }  from '../api/auth'
import { useTheme } from '../context/ThemeContext'
import toast        from 'react-hot-toast'

/**
 * ResetPasswordPage — handles Mode A (email link) password reset.
 *
 * Accessed when the user clicks the reset link in their email:
 *   /reset-password?token=<uuid>
 *
 * Sends { token, newPassword } to POST /api/auth/reset-password/link
 */

function StrengthBar({ password }) {
  if (!password) return null
  const score = [
    password.length >= 8, /[A-Z]/.test(password), /[a-z]/.test(password),
    /\d/.test(password), /[^a-zA-Z\d]/.test(password),
  ].filter(Boolean).length
  const colors = ['','bg-red-400','bg-orange-400','bg-yellow-400','bg-green-400','bg-emerald-500']
  const labels = ['','Very weak','Weak','Fair','Strong','Very strong']
  return (
    <div className="mt-2">
      <div className="flex gap-1">
        {[1,2,3,4,5].map(i => (
          <div key={i} className={`flex-1 h-1 rounded-full transition-colors ${
            i <= score ? colors[score] : 'bg-gray-200 dark:bg-gray-700'}`} />
        ))}
      </div>
      <p className="text-xs text-gray-400 mt-1">{labels[score]}</p>
    </div>
  )
}

export default function ResetPasswordPage() {
  const [params]         = useSearchParams()
  const navigate          = useNavigate()
  const { dark, toggle } = useTheme()
  const token             = params.get('token')

  const [password, setPassword] = useState('')
  const [confirm, setConfirm]   = useState('')
  const [showPw, setShowPw]     = useState(false)
  const [loading, setLoading]   = useState(false)
  const [success, setSuccess]   = useState(false)
  const [errors, setErrors]     = useState({})

  useEffect(() => {
    if (!token) toast.error('Invalid or missing reset link')
  }, [token])

  const pwStrength = () => {
    if (!password) return 0
    return [password.length >= 8, /[A-Z]/.test(password), /[a-z]/.test(password),
            /\d/.test(password), /[^a-zA-Z\d]/.test(password)].filter(Boolean).length
  }
  const strength = pwStrength()
  const strengthColors = ['','bg-red-400','bg-orange-400','bg-yellow-400','bg-green-400','bg-emerald-500']
  const strengthLabels = ['','Very weak','Weak','Fair','Strong','Very strong']

  const validate = () => {
    const e = {}
    if (password.length < 8) e.password = 'Password must be at least 8 characters'
    else if (!/(?=.*[a-z])(?=.*[A-Z])(?=.*\d)/.test(password))
      e.password = 'Must include uppercase, lowercase, and number'
    if (!confirm)              e.confirm = 'Please confirm your password'
    else if (confirm !== password) e.confirm = "Passwords don't match"
    setErrors(e)
    return Object.keys(e).length === 0
  }

  const handleSubmit = async (e) => {
    e.preventDefault()
    if (!token) { toast.error('Invalid reset link. Please request a new one.'); return }
    if (!validate()) return
    setLoading(true)
    try {
      await authApi.resetPasswordLink({ token, newPassword: password })
      setSuccess(true)
      toast.success('Password reset successfully!')
    } catch (err) {
      const msg = err?.response?.data?.message || 'Reset failed. The link may have expired.'
      toast.error(msg)
      if (msg.includes('expired') || msg.includes('invalid')) {
        setErrors({ token: msg })
      }
    } finally { setLoading(false) }
  }

  // No token screen
  if (!token) {
    return (
      <div className="min-h-screen bg-gray-50 dark:bg-black flex items-center justify-center p-4">
        <div className="bg-white dark:bg-gray-900 rounded-2xl border border-gray-200 dark:border-gray-800 p-8 max-w-sm w-full text-center shadow-sm">
          <XCircle size={48} className="text-red-500 mx-auto mb-4" />
          <h2 className="text-xl font-bold text-gray-900 dark:text-white mb-2">Invalid reset link</h2>
          <p className="text-gray-500 dark:text-gray-400 text-sm mb-6">
            This link is invalid or missing. Please request a new one.
          </p>
          <Link to="/forgot-password" className="btn-primary inline-block w-full text-center">
            Request new reset link
          </Link>
        </div>
      </div>
    )
  }

  // Success screen
  if (success) {
    return (
      <div className="min-h-screen bg-gray-50 dark:bg-black flex items-center justify-center p-4">
        <div className="bg-white dark:bg-gray-900 rounded-2xl border border-gray-200 dark:border-gray-800 p-8 max-w-sm w-full text-center shadow-sm animate-scale-in">
          <div className="w-16 h-16 bg-green-100 dark:bg-green-900/30 rounded-full flex items-center justify-center mx-auto mb-5">
            <CheckCircle size={36} className="text-green-500" />
          </div>
          <h2 className="text-xl font-bold text-gray-900 dark:text-white mb-2">Password updated!</h2>
          <p className="text-gray-500 dark:text-gray-400 text-sm mb-6">
            Your password has been reset. You can now log in with your new password.
          </p>
          <button onClick={() => navigate('/login', { replace: true })} className="btn-primary w-full">
            Log in now
          </button>
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-black flex flex-col items-center justify-center p-4">
      <button onClick={toggle} className="absolute top-4 right-4 p-2 text-gray-500">
        {dark ? '☀️' : '🌙'}
      </button>
      <div className="w-full max-w-sm">
        <div className="text-center mb-8">
          <div className="w-16 h-16 mx-auto mb-4 rounded-2xl flex items-center justify-center"
            style={{background:'linear-gradient(135deg,#405DE6,#C13584,#FD1D1D)'}}>
            <Lock size={28} className="text-white" />
          </div>
          <h1 className="text-2xl font-bold text-gray-900 dark:text-white">Set new password</h1>
          <p className="text-gray-500 dark:text-gray-400 text-sm mt-2">
            Choose a strong password for your account
          </p>
        </div>

        <div className="bg-white dark:bg-gray-900 rounded-2xl border border-gray-200 dark:border-gray-800 p-6 shadow-sm">
          {errors.token && (
            <div className="mb-4 p-3 bg-red-50 dark:bg-red-900/20 rounded-xl border border-red-200 dark:border-red-800">
              <p className="text-red-600 dark:text-red-400 text-sm">{errors.token}</p>
              <Link to="/forgot-password" className="text-red-600 dark:text-red-400 text-sm underline mt-1 block">
                Request a new reset link →
              </Link>
            </div>
          )}

          <form onSubmit={handleSubmit} className="space-y-4" noValidate>
            {/* New password */}
            <div>
              <div className="relative">
                <input type={showPw ? 'text' : 'password'} value={password}
                  onChange={e => { setPassword(e.target.value); setErrors(p => ({...p, password:''})) }}
                  placeholder="New password" autoComplete="new-password" autoFocus
                  className={`input-base pr-12 ${errors.password ? 'border-red-400 focus:ring-red-400' : ''}`}
                />
                <button type="button" onClick={() => setShowPw(v => !v)}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600 p-1">
                  {showPw ? <EyeOff size={18} /> : <Eye size={18} />}
                </button>
              </div>
              {password && (
                <div className="mt-2">
                  <div className="flex gap-1">
                    {[1,2,3,4,5].map(i => (
                      <div key={i} className={`flex-1 h-1 rounded-full transition-colors ${
                        i <= strength ? strengthColors[strength] : 'bg-gray-200 dark:bg-gray-700'}`} />
                    ))}
                  </div>
                  <p className="text-xs text-gray-500 mt-1">{strengthLabels[strength]}</p>
                </div>
              )}
              {errors.password && <p className="text-red-500 text-xs mt-1">{errors.password}</p>}
            </div>

            {/* Confirm */}
            <div>
              <div className="relative">
                <input type={showPw ? 'text' : 'password'} value={confirm}
                  onChange={e => { setConfirm(e.target.value); setErrors(p => ({...p, confirm:''})) }}
                  placeholder="Confirm new password" autoComplete="new-password"
                  className={`input-base ${errors.confirm ? 'border-red-400 focus:ring-red-400' : ''}`}
                />
              </div>
              {errors.confirm && <p className="text-red-500 text-xs mt-1">{errors.confirm}</p>}
            </div>

            <button type="submit" disabled={loading}
              className="btn-primary w-full flex items-center justify-center gap-2">
              {loading && <Loader size={18} className="animate-spin" />}
              {loading ? 'Resetting password...' : 'Reset password'}
            </button>
          </form>
        </div>

        <div className="mt-4 text-center">
          <Link to="/login" className="text-sm text-blue-500 hover:underline">← Back to login</Link>
        </div>
      </div>
    </div>
  )
}
