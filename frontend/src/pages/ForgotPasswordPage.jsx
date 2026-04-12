import { useState, useRef, useEffect, useCallback } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import {
  Camera, Loader, CheckCircle, Mail, ArrowLeft,
  Eye, EyeOff, RefreshCw, Link2, KeyRound
} from 'lucide-react'
import { authApi }  from '../api/auth'
import { useTheme } from '../context/ThemeContext'
import toast        from 'react-hot-toast'

// ── Constants ───────────────────────────────────────────────────────────────
const OTP_LENGTH      = 6
const RESEND_COOLDOWN = 60

// ── Reusable OTP digit row ───────────────────────────────────────────────────
function OtpRow({ digits, onChange, hasError, inputRefs }) {
  const handleChange = (idx, val) => {
    if (val && !/^\d$/.test(val)) return
    const next = [...digits]
    next[idx] = val
    onChange(next)
    if (val && idx < OTP_LENGTH - 1) inputRefs.current[idx + 1]?.focus()
  }
  const handleKey = (idx, e) => {
    if (e.key === 'Backspace') {
      if (!digits[idx] && idx > 0) inputRefs.current[idx - 1]?.focus()
      else { const n = [...digits]; n[idx] = ''; onChange(n) }
    }
    if (e.key === 'ArrowLeft'  && idx > 0)           inputRefs.current[idx - 1]?.focus()
    if (e.key === 'ArrowRight' && idx < OTP_LENGTH-1) inputRefs.current[idx + 1]?.focus()
  }
  const handlePaste = (e) => {
    e.preventDefault()
    const text = e.clipboardData.getData('text').replace(/\D/g, '').slice(0, OTP_LENGTH)
    if (!text) return
    const next = Array(OTP_LENGTH).fill('')
    text.split('').forEach((d, i) => { next[i] = d })
    onChange(next)
    inputRefs.current[Math.min(text.length - 1, OTP_LENGTH - 1)]?.focus()
  }
  return (
    <div className="flex gap-2 justify-center" onPaste={handlePaste}>
      {digits.map((d, i) => (
        <input key={i} ref={el => inputRefs.current[i] = el}
          type="text" inputMode="numeric" pattern="[0-9]*" maxLength={1}
          value={d}
          onChange={e => handleChange(i, e.target.value)}
          onKeyDown={e => handleKey(i, e)}
          className={`w-11 h-14 text-center text-2xl font-bold rounded-xl border-2 outline-none
            transition-all duration-150 select-none
            ${d ? 'border-brand-500 bg-brand-50 dark:bg-brand-900/20 text-brand-700 dark:text-brand-300 scale-105'
                : 'border-gray-200 dark:border-gray-700 bg-gray-50 dark:bg-gray-800 text-gray-900 dark:text-white'}
            ${hasError ? 'border-red-400 dark:border-red-500' : ''}
            focus:border-brand-400 dark:focus:border-brand-500 focus:scale-105`}
          aria-label={`Digit ${i + 1}`}
        />
      ))}
    </div>
  )
}

// ── Password strength bar ────────────────────────────────────────────────────
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

// ── Logo ─────────────────────────────────────────────────────────────────────
function Logo({ title, subtitle }) {
  return (
    <div className="text-center mb-6">
      <div className="w-14 h-14 mx-auto mb-4 rounded-2xl flex items-center justify-center"
        style={{background:'linear-gradient(135deg,#405DE6,#C13584,#FD1D1D)'}}>
        <Camera size={28} className="text-white" />
      </div>
      <h1 className="text-2xl font-bold text-gray-900 dark:text-white">{title}</h1>
      {subtitle && <p className="text-gray-500 dark:text-gray-400 text-sm mt-1">{subtitle}</p>}
    </div>
  )
}

// ── MAIN COMPONENT ───────────────────────────────────────────────────────────
/**
 * ForgotPasswordPage — supports two reset methods:
 *
 *   "Reset via Email Link" (Mode A):
 *     Step 1: User enters email
 *     Step 2: Link sent → success screen with instructions
 *     Step 3: User clicks link → goes to /reset-password?token=xxx
 *
 *   "Reset via OTP" (Mode B):
 *     Step 1: User enters email
 *     Step 2: OTP entry + new password in same form
 *     Step 3: Success
 */
export default function ForgotPasswordPage() {
  const { dark, toggle } = useTheme()
  const navigate          = useNavigate()

  // ── shared state ──────────────────────────────────────────────────────────
  const [mode, setMode]         = useState(null)    // null | 'link' | 'otp'
  const [email, setEmail]       = useState('')
  const [emailError, setEmailError] = useState('')
  const [sending, setSending]   = useState(false)
  const [done, setDone]         = useState(false)

  // ── OTP state ─────────────────────────────────────────────────────────────
  const [otpSent, setOtpSent]   = useState(false)
  const [digits, setDigits]     = useState(Array(OTP_LENGTH).fill(''))
  const [otpError, setOtpError] = useState('')
  const [password, setPassword] = useState('')
  const [confirm, setConfirm]   = useState('')
  const [showPw, setShowPw]     = useState(false)
  const [pwErrors, setPwErrors] = useState({})
  const [submitting, setSubmitting] = useState(false)

  // countdown
  const [countdown, setCountdown] = useState(RESEND_COOLDOWN)
  const [canResend, setCanResend] = useState(false)
  const [resending, setResending] = useState(false)
  const timerRef  = useRef(null)
  const inputRefs = useRef([])

  useEffect(() => () => clearInterval(timerRef.current), [])

  const startCountdown = useCallback(() => {
    setCountdown(RESEND_COOLDOWN); setCanResend(false)
    clearInterval(timerRef.current)
    timerRef.current = setInterval(() => {
      setCountdown(c => {
        if (c <= 1) { clearInterval(timerRef.current); setCanResend(true); return 0 }
        return c - 1
      })
    }, 1000)
  }, [])

  const validateEmail = () => {
    const t = email.trim()
    if (!t) { setEmailError('Email is required'); return false }
    if (!/\S+@\S+\.\S+/.test(t)) { setEmailError('Please enter a valid email address'); return false }
    setEmailError(''); return true
  }

  // ── MODE A: Send link ──────────────────────────────────────────────────────
  const handleSendLink = async (e) => {
    e.preventDefault()
    if (!validateEmail()) return
    setSending(true)
    try {
      await authApi.forgotPasswordLink(email.trim().toLowerCase())
    } catch { /* always show success (anti-enumeration) */ }
    finally { setSending(false); setDone(true) }
  }

  // ── MODE B: Send OTP ──────────────────────────────────────────────────────
  const handleSendOtp = async (e) => {
    e.preventDefault()
    if (!validateEmail()) return
    setSending(true)
    try {
      await authApi.forgotPassword(email.trim().toLowerCase())
    } catch { /* always proceed (anti-enumeration) */ }
    finally {
      setSending(false)
      setOtpSent(true)
      startCountdown()
      setTimeout(() => inputRefs.current[0]?.focus(), 150)
      toast.success('Check your email for the 6-digit reset code')
    }
  }

  const handleResend = async () => {
    if (!canResend || resending) return
    setResending(true); setOtpError('')
    try {
      await authApi.resendPasswordResetOtp(email.trim().toLowerCase())
      setDigits(Array(OTP_LENGTH).fill(''))
      setTimeout(() => inputRefs.current[0]?.focus(), 100)
      startCountdown()
      toast.success('New reset code sent!')
    } catch (err) {
      toast.error(err?.response?.data?.message || 'Failed to resend. Please try again.')
    } finally { setResending(false) }
  }

  const validatePw = () => {
    const e = {}
    if (password.length < 8)       e.password = 'Password must be at least 8 characters'
    else if (!/(?=.*[a-z])(?=.*[A-Z])(?=.*\d)/.test(password))
                                    e.password = 'Must include uppercase, lowercase, and number'
    if (!confirm)                   e.confirm  = 'Please confirm your password'
    else if (confirm !== password)  e.confirm  = "Passwords don't match"
    setPwErrors(e)
    return Object.keys(e).length === 0
  }

  const handleReset = async (e) => {
    e.preventDefault()
    const otp = digits.join('')
    if (otp.length !== OTP_LENGTH) {
      setOtpError(`Please enter all ${OTP_LENGTH} digits`)
      inputRefs.current[digits.findIndex(d => !d)]?.focus()
      return
    }
    if (!validatePw()) return
    setSubmitting(true); setOtpError('')
    try {
      await authApi.resetPassword({
        email: email.trim().toLowerCase(), otp, newPassword: password,
      })
      setDone(true)
      toast.success('Password reset successfully!')
    } catch (err) {
      const msg = err?.response?.data?.message || 'Reset failed. Please try again.'
      if (msg.toLowerCase().includes('code') || msg.toLowerCase().includes('otp') || msg.toLowerCase().includes('incorrect')) {
        setOtpError(msg)
        setDigits(Array(OTP_LENGTH).fill(''))
        setTimeout(() => inputRefs.current[0]?.focus(), 100)
      } else { toast.error(msg) }
    } finally { setSubmitting(false) }
  }

  // ── Shared wrapper ────────────────────────────────────────────────────────
  const Wrapper = ({ children }) => (
    <div className="min-h-screen bg-gray-50 dark:bg-black flex flex-col items-center justify-center p-4">
      <button onClick={toggle} className="absolute top-4 right-4 p-2 text-gray-500">
        {dark ? '☀️' : '🌙'}
      </button>
      <div className="w-full max-w-sm">{children}</div>
    </div>
  )

  // ── SUCCESS screen (both modes) ───────────────────────────────────────────
  if (done) {
    if (mode === 'link') {
      return (
        <Wrapper>
          <div className="bg-white dark:bg-gray-900 rounded-2xl border border-gray-200 dark:border-gray-800 p-8 text-center shadow-sm animate-scale-in">
            <div className="w-16 h-16 bg-green-100 dark:bg-green-900/30 rounded-full flex items-center justify-center mx-auto mb-5">
              <Mail size={32} className="text-green-500" />
            </div>
            <h2 className="text-xl font-bold text-gray-900 dark:text-white mb-2">Check your inbox</h2>
            <p className="text-gray-500 dark:text-gray-400 text-sm mb-2">If an account exists for</p>
            <p className="font-semibold text-gray-700 dark:text-gray-200 text-sm mb-4 break-all">{email}</p>
            <p className="text-gray-500 dark:text-gray-400 text-sm mb-6">
              we've sent a password reset link. It expires in <strong>30 minutes</strong>.
            </p>
            <div className="space-y-2">
              <Link to="/login" className="btn-primary w-full text-center block">Back to login</Link>
              <button onClick={() => { setDone(false); setMode(null); setEmail('') }}
                className="btn-secondary w-full text-sm">Try a different email</button>
            </div>
            <p className="text-xs text-gray-400 mt-4">Didn't receive it? Check your spam folder.</p>
          </div>
        </Wrapper>
      )
    }
    // OTP success
    return (
      <Wrapper>
        <div className="bg-white dark:bg-gray-900 rounded-2xl border border-gray-200 dark:border-gray-800 p-8 text-center shadow-sm animate-scale-in">
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
      </Wrapper>
    )
  }

  // ── MODE SELECTION screen ─────────────────────────────────────────────────
  if (mode === null) {
    return (
      <Wrapper>
        <Logo title="Forgot password?" subtitle="Choose how you want to reset your password." />
        <div className="space-y-3">
          {/* Mode A: Link */}
          <button
            onClick={() => setMode('link')}
            className="w-full flex items-start gap-4 p-4 bg-white dark:bg-gray-900
              border-2 border-gray-200 dark:border-gray-700 rounded-2xl
              hover:border-brand-400 dark:hover:border-brand-500
              hover:bg-brand-50/30 dark:hover:bg-brand-900/10
              transition-all duration-200 text-left group"
          >
            <div className="w-10 h-10 rounded-xl bg-blue-100 dark:bg-blue-900/30 flex items-center justify-center flex-shrink-0 mt-0.5">
              <Link2 size={20} className="text-blue-500" />
            </div>
            <div>
              <p className="font-semibold text-gray-900 dark:text-white text-sm">Reset via Email Link</p>
              <p className="text-xs text-gray-500 dark:text-gray-400 mt-0.5 leading-relaxed">
                We'll send a reset link to your email. Click it to set a new password.
              </p>
            </div>
          </button>

          {/* Mode B: OTP */}
          <button
            onClick={() => setMode('otp')}
            className="w-full flex items-start gap-4 p-4 bg-white dark:bg-gray-900
              border-2 border-gray-200 dark:border-gray-700 rounded-2xl
              hover:border-brand-400 dark:hover:border-brand-500
              hover:bg-brand-50/30 dark:hover:bg-brand-900/10
              transition-all duration-200 text-left group"
          >
            <div className="w-10 h-10 rounded-xl bg-purple-100 dark:bg-purple-900/30 flex items-center justify-center flex-shrink-0 mt-0.5">
              <KeyRound size={20} className="text-purple-500" />
            </div>
            <div>
              <p className="font-semibold text-gray-900 dark:text-white text-sm">Reset via OTP Code</p>
              <p className="text-xs text-gray-500 dark:text-gray-400 mt-0.5 leading-relaxed">
                We'll send a 6-digit code to your email. Enter it here to reset your password instantly.
              </p>
            </div>
          </button>
        </div>

        <div className="mt-5 text-center">
          <Link to="/login" className="text-sm text-blue-500 hover:underline flex items-center justify-center gap-1">
            <ArrowLeft size={14} /> Back to login
          </Link>
        </div>
      </Wrapper>
    )
  }

  // ── MODE A: Email entry + "Send Link" ─────────────────────────────────────
  if (mode === 'link') {
    return (
      <Wrapper>
        <Logo title="Reset via email link" subtitle="Enter your email and we'll send you a reset link." />
        <div className="bg-white dark:bg-gray-900 rounded-2xl border border-gray-200 dark:border-gray-800 p-6 shadow-sm">
          <form onSubmit={handleSendLink} className="space-y-4" noValidate>
            <div>
              <div className="relative">
                <Mail size={16} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-gray-400 pointer-events-none" />
                <input
                  type="email" value={email} autoFocus
                  onChange={e => { setEmail(e.target.value); setEmailError('') }}
                  placeholder="Enter your email address"
                  className={`input-base pl-10 ${emailError ? 'border-red-400 focus:ring-red-400' : ''}`}
                />
              </div>
              {emailError && <p className="text-red-500 text-xs mt-1">{emailError}</p>}
            </div>
            <button type="submit" disabled={sending}
              className="btn-primary w-full flex items-center justify-center gap-2">
              {sending && <Loader size={18} className="animate-spin" />}
              {sending ? 'Sending link...' : 'Send reset link'}
            </button>
          </form>
        </div>
        <div className="mt-4 space-y-2 text-center">
          <button onClick={() => setMode(null)}
            className="text-sm text-gray-400 hover:text-gray-600 dark:hover:text-gray-300 flex items-center justify-center gap-1">
            <ArrowLeft size={13} /> Choose different method
          </button>
          <Link to="/login" className="text-sm text-blue-500 hover:underline block">Back to login</Link>
        </div>
      </Wrapper>
    )
  }

  // ── MODE B: OTP flow ──────────────────────────────────────────────────────
  // Step 1: Email entry
  if (!otpSent) {
    return (
      <Wrapper>
        <Logo title="Reset via OTP" subtitle="Enter your email and we'll send a 6-digit code." />
        <div className="bg-white dark:bg-gray-900 rounded-2xl border border-gray-200 dark:border-gray-800 p-6 shadow-sm">
          <form onSubmit={handleSendOtp} className="space-y-4" noValidate>
            <div>
              <div className="relative">
                <Mail size={16} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-gray-400 pointer-events-none" />
                <input
                  type="email" value={email} autoFocus
                  onChange={e => { setEmail(e.target.value); setEmailError('') }}
                  placeholder="Enter your email address"
                  className={`input-base pl-10 ${emailError ? 'border-red-400 focus:ring-red-400' : ''}`}
                />
              </div>
              {emailError && <p className="text-red-500 text-xs mt-1">{emailError}</p>}
            </div>
            <button type="submit" disabled={sending}
              className="btn-primary w-full flex items-center justify-center gap-2">
              {sending && <Loader size={18} className="animate-spin" />}
              {sending ? 'Sending code...' : 'Send reset code'}
            </button>
          </form>
        </div>
        <div className="mt-4 space-y-2 text-center">
          <button onClick={() => setMode(null)}
            className="text-sm text-gray-400 hover:text-gray-600 dark:hover:text-gray-300 flex items-center justify-center gap-1">
            <ArrowLeft size={13} /> Choose different method
          </button>
          <Link to="/login" className="text-sm text-blue-500 hover:underline block">Back to login</Link>
        </div>
      </Wrapper>
    )
  }

  // Step 2: OTP + new password
  return (
    <Wrapper>
      <div className="text-center mb-5">
        <div className="w-14 h-14 mx-auto mb-4 rounded-2xl flex items-center justify-center"
          style={{background:'linear-gradient(135deg,#405DE6,#C13584,#FD1D1D)'}}>
          <Camera size={28} className="text-white" />
        </div>
        <h1 className="text-2xl font-bold text-gray-900 dark:text-white">Enter reset code</h1>
        <p className="text-gray-500 dark:text-gray-400 text-sm mt-1">
          Code sent to <strong className="text-gray-700 dark:text-gray-200">{email}</strong>
        </p>
      </div>

      <div className="bg-white dark:bg-gray-900 rounded-2xl border border-gray-200 dark:border-gray-800 p-6 shadow-sm">
        <form onSubmit={handleReset} className="space-y-5" noValidate>
          {/* OTP digits */}
          <div>
            <p className="text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wide mb-3">
              6-digit reset code
            </p>
            <OtpRow digits={digits} onChange={setDigits} hasError={!!otpError} inputRefs={inputRefs} />
            {otpError && (
              <div className="mt-3 p-3 bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-xl">
                <p className="text-red-600 dark:text-red-400 text-sm text-center">{otpError}</p>
              </div>
            )}
            {/* Resend */}
            <div className="mt-3 text-center">
              {canResend ? (
                <button type="button" onClick={handleResend} disabled={resending}
                  className="text-sm font-semibold text-blue-500 hover:text-blue-600 flex items-center gap-1.5 mx-auto">
                  {resending ? <><Loader size={13} className="animate-spin" />Sending...</>
                             : <><RefreshCw size={13} />Resend code</>}
                </button>
              ) : (
                <p className="text-xs text-gray-400">
                  Resend in <span className="font-semibold tabular-nums">{countdown}s</span>
                </p>
              )}
            </div>
          </div>

          <div className="border-t border-gray-100 dark:border-gray-800" />

          {/* New password */}
          <div>
            <label className="text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wide mb-1.5 block">
              New password
            </label>
            <div className="relative">
              <input type={showPw ? 'text' : 'password'} value={password}
                onChange={e => { setPassword(e.target.value); setPwErrors(p => ({...p, password:''})) }}
                placeholder="New password" autoComplete="new-password"
                className={`input-base pr-12 ${pwErrors.password ? 'border-red-400 focus:ring-red-400' : ''}`}
              />
              <button type="button" onClick={() => setShowPw(v => !v)}
                className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600 p-1">
                {showPw ? <EyeOff size={17} /> : <Eye size={17} />}
              </button>
            </div>
            <StrengthBar password={password} />
            {pwErrors.password && <p className="text-red-500 text-xs mt-1">{pwErrors.password}</p>}
          </div>

          {/* Confirm */}
          <div>
            <label className="text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wide mb-1.5 block">
              Confirm password
            </label>
            <input type={showPw ? 'text' : 'password'} value={confirm}
              onChange={e => { setConfirm(e.target.value); setPwErrors(p => ({...p, confirm:''})) }}
              placeholder="Confirm new password" autoComplete="new-password"
              className={`input-base ${pwErrors.confirm ? 'border-red-400 focus:ring-red-400' : ''}`}
            />
            {pwErrors.confirm && <p className="text-red-500 text-xs mt-1">{pwErrors.confirm}</p>}
          </div>

          <button type="submit" disabled={submitting}
            className="btn-primary w-full flex items-center justify-center gap-2">
            {submitting && <Loader size={18} className="animate-spin" />}
            {submitting ? 'Resetting...' : 'Reset password'}
          </button>
        </form>
      </div>

      <div className="mt-4 space-y-2 text-center">
        <button onClick={() => { setOtpSent(false); setDigits(Array(OTP_LENGTH).fill('')); setOtpError('') }}
          className="text-sm text-gray-400 hover:text-gray-600 dark:hover:text-gray-300 flex items-center justify-center gap-1">
          <ArrowLeft size={13} /> Use a different email
        </button>
        <Link to="/login" className="text-sm text-blue-500 hover:underline block">Back to login</Link>
      </div>
    </Wrapper>
  )
}
