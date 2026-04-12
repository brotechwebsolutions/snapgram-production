import { useState, useRef, useEffect, useCallback } from 'react'
import { Link, useNavigate }  from 'react-router-dom'
import {
  Camera, Eye, EyeOff, Loader, Mail, ArrowLeft,
  CheckCircle, RefreshCw, KeyRound, User, AtSign,
  Check, X as XIcon,
} from 'lucide-react'
import { authApi }   from '../api/auth'
import { usersApi }  from '../api/users'
import { useAuth }   from '../context/AuthContext'
import { useTheme }  from '../context/ThemeContext'
import { useDebounce } from '../hooks/useDebounce'
import toast          from 'react-hot-toast'

const OTP_LENGTH      = 6
const RESEND_COOLDOWN = 60
const USERNAME_RULES  = /^[a-zA-Z0-9._]+$/

// ── OTP 6-digit input ────────────────────────────────────────────────────────
function OtpInput({ digits, onChange, hasError, inputRefs }) {
  const handleChange = (idx, val) => {
    if (val && !/^\d$/.test(val)) return
    const next = [...digits]; next[idx] = val; onChange(next)
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
          className={`
            w-11 h-14 text-center text-2xl font-bold rounded-xl border-2 outline-none
            transition-all duration-150 select-none
            ${d ? 'border-brand-500 bg-brand-50 dark:bg-brand-900/20 text-brand-700 dark:text-brand-300 scale-105'
                : 'border-gray-200 dark:border-gray-700 bg-gray-50 dark:bg-gray-800 text-gray-900 dark:text-white'}
            ${hasError ? 'border-red-400 dark:border-red-500' : ''}
            focus:border-brand-400 dark:focus:border-brand-500 focus:scale-105
          `}
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

// ── Step indicator ────────────────────────────────────────────────────────────
function StepBar({ step }) {
  const steps = [
    { n: 1, label: 'Email' },
    { n: 2, label: 'Verify' },
    { n: 3, label: 'Profile' },
  ]
  return (
    <div className="flex items-center justify-center gap-1 mb-6">
      {steps.map((s, idx) => (
        <div key={s.n} className="flex items-center">
          <div className={`flex items-center justify-center w-7 h-7 rounded-full text-xs font-bold transition-all ${
            s.n < step  ? 'bg-green-500 text-white' :
            s.n === step ? 'bg-brand-500 text-white scale-110' :
                           'bg-gray-200 dark:bg-gray-700 text-gray-400 dark:text-gray-500'
          }`}>
            {s.n < step ? <Check size={14} /> : s.n}
          </div>
          <span className={`ml-1 text-xs font-medium hidden xs:inline ${
            s.n === step ? 'text-gray-900 dark:text-white' : 'text-gray-400'
          }`}>{s.label}</span>
          {idx < steps.length - 1 && (
            <div className={`w-6 h-0.5 mx-2 rounded transition-colors ${
              s.n < step ? 'bg-green-400' : 'bg-gray-200 dark:bg-gray-700'
            }`} />
          )}
        </div>
      ))}
    </div>
  )
}

// ── Username availability indicator ──────────────────────────────────────────
function UsernameStatus({ status }) {
  // status: 'idle' | 'checking' | 'available' | 'taken' | 'invalid'
  if (status === 'idle') return null
  if (status === 'checking') return (
    <p className="text-xs text-gray-400 mt-1 flex items-center gap-1">
      <Loader size={11} className="animate-spin" /> Checking...
    </p>
  )
  if (status === 'available') return (
    <p className="text-xs text-green-600 dark:text-green-400 mt-1 flex items-center gap-1">
      <Check size={12} /> Username available!
    </p>
  )
  if (status === 'taken') return (
    <p className="text-xs text-red-500 mt-1 flex items-center gap-1">
      <XIcon size={12} /> Already taken. Try another.
    </p>
  )
  if (status === 'invalid') return (
    <p className="text-xs text-red-500 mt-1">
      Only letters, numbers, dots, underscores (3–30 chars)
    </p>
  )
  return null
}

// ── Page layout wrapper ───────────────────────────────────────────────────────
function PageWrap({ children, dark, toggle }) {
  return (
    <div className="min-h-screen bg-gray-50 dark:bg-black flex flex-col items-center justify-center p-4">
      <button onClick={toggle} className="absolute top-4 right-4 p-2 text-gray-500 hover:text-gray-700 dark:hover:text-gray-300">
        {dark ? '☀️' : '🌙'}
      </button>
      <div className="w-full max-w-sm">
        {/* Logo */}
        <div className="text-center mb-5">
          <div className="w-14 h-14 mx-auto mb-3 rounded-2xl flex items-center justify-center shadow-lg"
            style={{ background: 'linear-gradient(135deg,#405DE6,#C13584,#FD1D1D)' }}>
            <Camera size={26} className="text-white" />
          </div>
          <h1 className="text-2xl font-bold gradient-text">SnapGram</h1>
          <p className="text-gray-400 dark:text-gray-500 text-xs mt-1">Create your account</p>
        </div>
        {children}
        <p className="text-center text-xs text-gray-400 dark:text-gray-600 mt-6">
          By signing up, you agree to our{' '}
          <a href="#" className="underline hover:text-gray-600">Terms</a> and{' '}
          <a href="#" className="underline hover:text-gray-600">Privacy Policy</a>.
        </p>
      </div>
    </div>
  )
}

// ══════════════════════════════════════════════════════════════════════════════
// MAIN COMPONENT
// ══════════════════════════════════════════════════════════════════════════════
/**
 * RegisterPage — complete Instagram-like 3-step signup:
 *
 *   Step 1: Enter email → POST /auth/send-otp
 *   Step 2: Verify 6-digit OTP → POST /auth/verify-otp
 *   Step 3: Choose username + full name + password → POST /auth/set-password
 *           (returns JWT → auto-login → redirect to home feed)
 *
 * Features:
 *   ✅ OTP-first (no password in step 1)
 *   ✅ Username uniqueness checked in real-time (debounced 500ms)
 *   ✅ Full name required
 *   ✅ Password strength meter
 *   ✅ Auto-login after signup (no second login needed)
 *   ✅ Loading states on every async action
 *   ✅ Error messages on every field
 *   ✅ OTP resend with 60-second countdown
 *   ✅ Paste support on OTP input
 *   ✅ Auto-submit OTP when all 6 digits entered
 */
export default function RegisterPage() {
  const { dark, toggle }      = useTheme()
  const { login: ctxLogin }   = useAuth()
  const navigate               = useNavigate()

  // ── Shared ─────────────────────────────────────────────────────────────
  const [step, setStep]  = useState(1)   // 1 | 2 | 3
  const [email, setEmail] = useState('')

  // ── Step 1 ─────────────────────────────────────────────────────────────
  const [emailError, setEmailError] = useState('')
  const [sendingOtp, setSendingOtp] = useState(false)

  // ── Step 2 ─────────────────────────────────────────────────────────────
  const [digits, setDigits]       = useState(Array(OTP_LENGTH).fill(''))
  const [otpError, setOtpError]   = useState('')
  const [verifying, setVerifying] = useState(false)
  const [countdown, setCountdown] = useState(RESEND_COOLDOWN)
  const [canResend, setCanResend] = useState(false)
  const [resending, setResending] = useState(false)
  const timerRef  = useRef(null)
  const inputRefs = useRef([])

  // ── Step 3 ─────────────────────────────────────────────────────────────
  const [username, setUsername]    = useState('')
  const [fullName, setFullName]    = useState('')
  const [password, setPassword]    = useState('')
  const [confirm,  setConfirm]     = useState('')
  const [showPw,   setShowPw]      = useState(false)
  const [fieldErrors, setFieldErrors] = useState({})
  const [settingPw, setSettingPw]  = useState(false)
  const [usernameStatus, setUsernameStatus] = useState('idle')
  // 'idle' | 'checking' | 'available' | 'taken' | 'invalid'

  const debouncedUsername = useDebounce(username, 500)

  // ── Lifecycle ──────────────────────────────────────────────────────────
  useEffect(() => () => clearInterval(timerRef.current), [])

  useEffect(() => {
    if (step === 2) setTimeout(() => inputRefs.current[0]?.focus(), 150)
  }, [step])

  useEffect(() => {
    if (step === 2 && digits.every(d => d !== '') && !verifying) {
      handleVerifyOtp()
    }
  }, [digits])

  // Real-time username check
  useEffect(() => {
    const u = debouncedUsername.trim().toLowerCase()
    if (!u) { setUsernameStatus('idle'); return }
    if (u.length < 3 || u.length > 30 || !USERNAME_RULES.test(u)) {
      setUsernameStatus('invalid'); return
    }
    setUsernameStatus('checking')
    usersApi.checkUsername(u)
      .then(({ data }) => {
        setUsernameStatus(data.data ? 'available' : 'taken')
      })
      .catch(() => setUsernameStatus('idle'))
  }, [debouncedUsername])

  // ── Helpers ────────────────────────────────────────────────────────────
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

  // ── STEP 1: Send OTP ───────────────────────────────────────────────────
  const handleSendOtp = async (e) => {
    e.preventDefault()
    const trimmed = email.trim().toLowerCase()
    if (!trimmed) { setEmailError('Email address is required'); return }
    if (!/\S+@\S+\.\S+/.test(trimmed)) { setEmailError('Please enter a valid email address'); return }
    setEmailError('')
    setSendingOtp(true)
    try {
      await authApi.sendOtp(trimmed)
      setEmail(trimmed)
      setStep(2)
      startCountdown()
      toast.success('OTP sent! Check your email.')
    } catch (err) {
      const msg = err?.response?.data?.message || 'Failed to send OTP. Please try again.'
      setEmailError(msg)
    } finally {
      setSendingOtp(false)
    }
  }

  // ── STEP 2: Verify OTP ─────────────────────────────────────────────────
  const handleVerifyOtp = useCallback(async () => {
    const otp = digits.join('')
    if (otp.length !== OTP_LENGTH) {
      setOtpError(`Please enter all ${OTP_LENGTH} digits`)
      inputRefs.current[digits.findIndex(d => !d)]?.focus()
      return
    }
    setVerifying(true); setOtpError('')
    try {
      await authApi.verifySignupOtp({ email, otp })
      setStep(3)
      toast.success('Email verified! Now set up your profile.')
    } catch (err) {
      const msg = err?.response?.data?.message || 'Verification failed. Please try again.'
      setOtpError(msg)
      setDigits(Array(OTP_LENGTH).fill(''))
      setTimeout(() => inputRefs.current[0]?.focus(), 100)
    } finally {
      setVerifying(false)
    }
  }, [digits, email])

  const handleResendOtp = async () => {
    if (!canResend || resending) return
    setResending(true); setOtpError('')
    try {
      await authApi.sendOtp(email)
      setDigits(Array(OTP_LENGTH).fill(''))
      setTimeout(() => inputRefs.current[0]?.focus(), 100)
      startCountdown()
      toast.success('New OTP sent to your email!')
    } catch (err) {
      toast.error(err?.response?.data?.message || 'Failed to resend. Please try again.')
    } finally {
      setResending(false) }
  }

  // ── STEP 3: Set username + fullName + password ─────────────────────────
  const validateStep3 = () => {
    const e = {}
    const u = username.trim().toLowerCase()

    if (!fullName.trim() || fullName.trim().length < 2)
      e.fullName = 'Full name must be at least 2 characters'
    if (!u)
      e.username = 'Username is required'
    else if (u.length < 3 || u.length > 30)
      e.username = 'Username must be 3–30 characters'
    else if (!USERNAME_RULES.test(u))
      e.username = 'Only letters, numbers, dots, underscores'
    else if (usernameStatus === 'taken')
      e.username = 'This username is already taken'
    else if (usernameStatus === 'checking')
      e.username = 'Please wait — checking availability...'
    else if (usernameStatus === 'invalid')
      e.username = 'Invalid username format'

    if (password.length < 8)
      e.password = 'Password must be at least 8 characters'
    else if (!/(?=.*[a-z])(?=.*[A-Z])(?=.*\d)/.test(password))
      e.password = 'Must include uppercase, lowercase, and number'

    if (!confirm)
      e.confirm = 'Please confirm your password'
    else if (confirm !== password)
      e.confirm = "Passwords don't match"

    setFieldErrors(e)
    return Object.keys(e).length === 0
  }

  const handleCreateAccount = async (e) => {
    e.preventDefault()
    if (!validateStep3()) return
    setSettingPw(true)
    try {
      // setPassword returns JWT (auto-login)
      const { data } = await authApi.setPassword({
        email,
        username: username.trim().toLowerCase(),
        fullName: fullName.trim(),
        password,
      })
      // Store tokens and user in AuthContext / localStorage
      const { accessToken, refreshToken, user: userData } = data.data
      localStorage.setItem('accessToken', accessToken)
      localStorage.setItem('refreshToken', refreshToken)
      localStorage.setItem('user', JSON.stringify(userData))

      toast.success(`Welcome to SnapGram, @${userData.username}! 🎉`)
      // Navigate to home feed
      navigate('/', { replace: true })
    } catch (err) {
      const msg = err?.response?.data?.message || 'Failed to create account. Please try again.'
      // Username conflict
      if (msg.toLowerCase().includes('username')) {
        setFieldErrors(prev => ({ ...prev, username: msg }))
        setUsernameStatus('taken')
      } else {
        toast.error(msg)
      }
    } finally {
      setSettingPw(false)
    }
  }

  // ══════════════════════════════════════════════════════════════════════════
  // RENDER
  // ══════════════════════════════════════════════════════════════════════════

  // ── STEP 1 ─────────────────────────────────────────────────────────────
  if (step === 1) {
    return (
      <PageWrap dark={dark} toggle={toggle}>
        <StepBar step={1} />
        <div className="bg-white dark:bg-gray-900 rounded-2xl border border-gray-200 dark:border-gray-800 p-6 shadow-sm">
          <div className="flex items-center gap-3 mb-5">
            <div className="w-9 h-9 rounded-full bg-blue-50 dark:bg-blue-900/30 flex items-center justify-center flex-shrink-0">
              <Mail size={17} className="text-blue-500" />
            </div>
            <div>
              <p className="font-semibold text-sm text-gray-900 dark:text-white">Enter your email</p>
              <p className="text-xs text-gray-500">A 6-digit code will be sent to verify you</p>
            </div>
          </div>

          <form onSubmit={handleSendOtp} noValidate className="space-y-4">
            <div>
              <input
                type="email"
                value={email}
                onChange={e => { setEmail(e.target.value); setEmailError('') }}
                placeholder="Email address"
                autoComplete="email"
                autoFocus
                className={`input-base ${emailError ? 'border-red-400 focus:ring-red-400' : ''}`}
              />
              {emailError && <p className="text-red-500 text-xs mt-1.5">{emailError}</p>}
            </div>

            <button type="submit" disabled={sendingOtp}
              className="btn-primary w-full flex items-center justify-center gap-2">
              {sendingOtp
                ? <><Loader size={17} className="animate-spin" /> Sending OTP...</>
                : 'Send OTP'}
            </button>
          </form>
        </div>

        <div className="mt-3 text-center bg-white dark:bg-gray-900 rounded-2xl border border-gray-200 dark:border-gray-800 p-4">
          <p className="text-sm text-gray-600 dark:text-gray-400">
            Already have an account?{' '}
            <Link to="/login" className="text-blue-500 font-semibold hover:underline">Log in</Link>
          </p>
        </div>
      </PageWrap>
    )
  }

  // ── STEP 2 ─────────────────────────────────────────────────────────────
  if (step === 2) {
    const masked = email.replace(/^(.{2})(.*)(@.*)$/, (_, a, b, c) =>
      a + '*'.repeat(Math.min(b.length, 4)) + c)

    return (
      <PageWrap dark={dark} toggle={toggle}>
        <StepBar step={2} />
        <div className="bg-white dark:bg-gray-900 rounded-2xl border border-gray-200 dark:border-gray-800 p-6 shadow-sm">
          <div className="text-center mb-6">
            <div className="w-14 h-14 mx-auto mb-3 bg-blue-50 dark:bg-blue-900/20 rounded-2xl flex items-center justify-center">
              <Mail size={26} className="text-blue-500" />
            </div>
            <p className="text-gray-500 dark:text-gray-400 text-sm">Verification code sent to</p>
            <p className="font-semibold text-gray-900 dark:text-white">{masked}</p>
            <p className="text-gray-400 text-xs mt-1">Expires in 5 minutes</p>
          </div>

          <OtpInput digits={digits} onChange={setDigits} hasError={!!otpError} inputRefs={inputRefs} />

          {otpError && (
            <div className="mt-3 p-3 bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-xl">
              <p className="text-red-600 dark:text-red-400 text-sm text-center">{otpError}</p>
            </div>
          )}

          <button
            onClick={handleVerifyOtp}
            disabled={verifying || digits.join('').length !== OTP_LENGTH}
            className="btn-primary w-full flex items-center justify-center gap-2 mt-4"
          >
            {verifying
              ? <><Loader size={17} className="animate-spin" /> Verifying...</>
              : <><CheckCircle size={17} /> Verify Code</>
            }
          </button>

          <div className="mt-4 text-center space-y-1">
            <p className="text-sm text-gray-500 dark:text-gray-400">Didn't receive it?</p>
            {canResend ? (
              <button onClick={handleResendOtp} disabled={resending}
                className="text-sm font-semibold text-blue-500 hover:text-blue-600 flex items-center gap-1.5 mx-auto">
                {resending
                  ? <><Loader size={13} className="animate-spin" /> Sending...</>
                  : <><RefreshCw size={13} /> Resend Code</>}
              </button>
            ) : (
              <p className="text-sm text-gray-400">
                Resend in <span className="font-semibold tabular-nums text-gray-600 dark:text-gray-300">{countdown}s</span>
              </p>
            )}
            <p className="text-xs text-gray-400 mt-2">Check your spam folder if you don't see it.</p>
          </div>
        </div>

        <button
          onClick={() => { setStep(1); setDigits(Array(OTP_LENGTH).fill('')); setOtpError('') }}
          className="mt-3 w-full text-sm text-gray-400 hover:text-gray-600 dark:hover:text-gray-300
                     flex items-center justify-center gap-1 transition-colors py-2"
        >
          <ArrowLeft size={13} /> Use a different email
        </button>
      </PageWrap>
    )
  }

  // ── STEP 3 ─────────────────────────────────────────────────────────────
  return (
    <PageWrap dark={dark} toggle={toggle}>
      <StepBar step={3} />
      <div className="bg-white dark:bg-gray-900 rounded-2xl border border-gray-200 dark:border-gray-800 p-6 shadow-sm">

        <div className="flex items-center gap-3 mb-5">
          <div className="w-9 h-9 rounded-full bg-brand-50 dark:bg-brand-900/30 flex items-center justify-center flex-shrink-0">
            <User size={17} className="text-brand-500" />
          </div>
          <div>
            <p className="font-semibold text-sm text-gray-900 dark:text-white">Set up your profile</p>
            <p className="text-xs text-gray-500">Choose a username others will find you by</p>
          </div>
        </div>

        <form onSubmit={handleCreateAccount} noValidate className="space-y-4">

          {/* Full Name */}
          <div>
            <label className="text-xs font-medium text-gray-600 dark:text-gray-400 mb-1.5 block">
              Full Name <span className="text-red-400">*</span>
            </label>
            <div className="relative">
              <User size={16} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-gray-400 pointer-events-none" />
              <input
                type="text"
                value={fullName}
                onChange={e => { setFullName(e.target.value); setFieldErrors(p => ({ ...p, fullName: '' })) }}
                placeholder="Your full name"
                autoComplete="name"
                autoFocus
                className={`input-base pl-10 ${fieldErrors.fullName ? 'border-red-400 focus:ring-red-400' : ''}`}
              />
            </div>
            {fieldErrors.fullName && <p className="text-red-500 text-xs mt-1">{fieldErrors.fullName}</p>}
          </div>

          {/* Username */}
          <div>
            <label className="text-xs font-medium text-gray-600 dark:text-gray-400 mb-1.5 block">
              Username <span className="text-red-400">*</span>
            </label>
            <div className="relative">
              <AtSign size={16} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-gray-400 pointer-events-none" />
              <input
                type="text"
                value={username}
                onChange={e => {
                  // Only allow valid characters while typing
                  const val = e.target.value.toLowerCase().replace(/[^a-z0-9._]/g, '')
                  setUsername(val)
                  setFieldErrors(p => ({ ...p, username: '' }))
                  if (!val) setUsernameStatus('idle')
                }}
                placeholder="username"
                autoComplete="username"
                maxLength={30}
                className={`input-base pl-10 ${
                  fieldErrors.username || usernameStatus === 'taken' || usernameStatus === 'invalid'
                    ? 'border-red-400 focus:ring-red-400'
                    : usernameStatus === 'available'
                      ? 'border-green-400 focus:ring-green-400'
                      : ''
                }`}
              />
              {/* Availability indicator icon */}
              {username && usernameStatus !== 'idle' && (
                <div className="absolute right-3 top-1/2 -translate-y-1/2">
                  {usernameStatus === 'checking' && <Loader size={15} className="animate-spin text-gray-400" />}
                  {usernameStatus === 'available' && <Check size={15} className="text-green-500" />}
                  {(usernameStatus === 'taken' || usernameStatus === 'invalid') && <XIcon size={15} className="text-red-500" />}
                </div>
              )}
            </div>
            <UsernameStatus status={fieldErrors.username ? 'invalid' : usernameStatus} />
            {fieldErrors.username && usernameStatus !== 'taken' && (
              <p className="text-red-500 text-xs mt-1">{fieldErrors.username}</p>
            )}
          </div>

          {/* Password */}
          <div>
            <label className="text-xs font-medium text-gray-600 dark:text-gray-400 mb-1.5 block">
              Password <span className="text-red-400">*</span>
            </label>
            <div className="relative">
              <KeyRound size={16} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-gray-400 pointer-events-none" />
              <input
                type={showPw ? 'text' : 'password'}
                value={password}
                onChange={e => { setPassword(e.target.value); setFieldErrors(p => ({ ...p, password: '' })) }}
                placeholder="Create a password"
                autoComplete="new-password"
                className={`input-base pl-10 pr-12 ${fieldErrors.password ? 'border-red-400 focus:ring-red-400' : ''}`}
              />
              <button type="button" onClick={() => setShowPw(v => !v)}
                className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600 p-1">
                {showPw ? <EyeOff size={17} /> : <Eye size={17} />}
              </button>
            </div>
            <StrengthBar password={password} />
            {fieldErrors.password && <p className="text-red-500 text-xs mt-1">{fieldErrors.password}</p>}
          </div>

          {/* Confirm Password */}
          <div>
            <label className="text-xs font-medium text-gray-600 dark:text-gray-400 mb-1.5 block">
              Confirm Password <span className="text-red-400">*</span>
            </label>
            <div className="relative">
              <KeyRound size={16} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-gray-400 pointer-events-none" />
              <input
                type={showPw ? 'text' : 'password'}
                value={confirm}
                onChange={e => { setConfirm(e.target.value); setFieldErrors(p => ({ ...p, confirm: '' })) }}
                placeholder="Repeat your password"
                autoComplete="new-password"
                className={`input-base pl-10 ${fieldErrors.confirm ? 'border-red-400 focus:ring-red-400' : ''}`}
              />
            </div>
            {fieldErrors.confirm && <p className="text-red-500 text-xs mt-1">{fieldErrors.confirm}</p>}
          </div>

          <button type="submit" disabled={settingPw || usernameStatus === 'checking' || usernameStatus === 'taken'}
            className="btn-primary w-full flex items-center justify-center gap-2 mt-2">
            {settingPw
              ? <><Loader size={17} className="animate-spin" /> Creating account...</>
              : 'Create Account'
            }
          </button>
        </form>
      </div>

      <div className="mt-3 text-center bg-white dark:bg-gray-900 rounded-2xl border border-gray-200 dark:border-gray-800 p-4">
        <p className="text-sm text-gray-600 dark:text-gray-400">
          Already have an account?{' '}
          <Link to="/login" className="text-blue-500 font-semibold hover:underline">Log in</Link>
        </p>
      </div>
    </PageWrap>
  )
}
