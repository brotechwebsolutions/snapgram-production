import { useState, useRef, useEffect, useCallback } from 'react'
import { Mail, RefreshCw, CheckCircle, Loader, X, ArrowLeft } from 'lucide-react'
import { authApi } from '../../api/auth'
import toast from 'react-hot-toast'

const RESEND_COOLDOWN_SECS = 60
const OTP_LENGTH = 6

/**
 * OTP Verification Modal (STEP 5)
 *
 * Features:
 * - 6 individual digit inputs with auto-focus and keyboard navigation
 * - Paste support (pastes all 6 digits at once)
 * - Auto-submits when all 6 digits entered
 * - Resend cooldown timer (60 seconds)
 * - Shows remaining attempts on wrong code
 * - Masked email display
 */
export default function OtpVerificationModal({ email, onVerified, onClose }) {
  const [digits, setDigits]       = useState(Array(OTP_LENGTH).fill(''))
  const [loading, setLoading]     = useState(false)
  const [resending, setResending] = useState(false)
  const [countdown, setCountdown] = useState(RESEND_COOLDOWN_SECS)
  const [canResend, setCanResend] = useState(false)
  const [error, setError]         = useState('')
  const inputRefs = useRef([])
  const timerRef  = useRef(null)

  // Start countdown on mount
  useEffect(() => {
    startCountdown()
    return () => clearInterval(timerRef.current)
  }, [])

  const startCountdown = useCallback(() => {
    setCountdown(RESEND_COOLDOWN_SECS)
    setCanResend(false)
    clearInterval(timerRef.current)
    timerRef.current = setInterval(() => {
      setCountdown(c => {
        if (c <= 1) {
          clearInterval(timerRef.current)
          setCanResend(true)
          return 0
        }
        return c - 1
      })
    }, 1000)
  }, [])

  // Focus first input on mount
  useEffect(() => {
    setTimeout(() => inputRefs.current[0]?.focus(), 100)
  }, [])

  const handleChange = (index, value) => {
    if (value && !/^\d$/.test(value)) return // Only allow digits
    const next = [...digits]
    next[index] = value
    setDigits(next)
    setError('')
    if (value && index < OTP_LENGTH - 1) {
      inputRefs.current[index + 1]?.focus()
    }
  }

  const handleKeyDown = (index, e) => {
    if (e.key === 'Backspace') {
      if (!digits[index] && index > 0) {
        inputRefs.current[index - 1]?.focus()
      } else {
        const next = [...digits]
        next[index] = ''
        setDigits(next)
      }
    }
    if (e.key === 'ArrowLeft' && index > 0) inputRefs.current[index - 1]?.focus()
    if (e.key === 'ArrowRight' && index < OTP_LENGTH - 1) inputRefs.current[index + 1]?.focus()
    if (e.key === 'Enter') handleVerify()
  }

  const handlePaste = (e) => {
    e.preventDefault()
    const text = e.clipboardData.getData('text').replace(/\D/g, '').slice(0, OTP_LENGTH)
    if (!text) return
    const next = Array(OTP_LENGTH).fill('')
    text.split('').forEach((d, i) => { if (i < OTP_LENGTH) next[i] = d })
    setDigits(next)
    const lastFilledIndex = Math.min(text.length - 1, OTP_LENGTH - 1)
    inputRefs.current[lastFilledIndex]?.focus()
    setError('')
  }

  const handleVerify = useCallback(async () => {
    const otp = digits.join('')
    if (otp.length !== OTP_LENGTH) {
      setError(`Please enter all ${OTP_LENGTH} digits`)
      inputRefs.current[digits.findIndex(d => !d)]?.focus()
      return
    }
    if (!email) {
      setError('Email address is required')
      return
    }

    setLoading(true)
    setError('')
    try {
      await authApi.verifyOtp({ email: email.toLowerCase().trim(), otp })
      onVerified()
    } catch (err) {
      const msg = err?.response?.data?.message || 'Verification failed. Please try again.'
      setError(msg)
      // Clear digits on wrong code
      setDigits(Array(OTP_LENGTH).fill(''))
      setTimeout(() => inputRefs.current[0]?.focus(), 100)
    } finally {
      setLoading(false)
    }
  }, [digits, email, onVerified])

  // Auto-submit when all digits filled
  useEffect(() => {
    if (digits.every(d => d !== '') && !loading) {
      handleVerify()
    }
  }, [digits])

  const handleResend = async () => {
    if (!canResend || resending) return
    setResending(true)
    setError('')
    try {
      await authApi.resendOtp(email)
      toast.success('New verification code sent!')
      setDigits(Array(OTP_LENGTH).fill(''))
      setTimeout(() => inputRefs.current[0]?.focus(), 100)
      startCountdown()
    } catch (err) {
      const msg = err?.response?.data?.message || 'Failed to resend. Please try again.'
      toast.error(msg)
    } finally {
      setResending(false)
    }
  }

  // Mask email: jo***@gmail.com
  const maskedEmail = email
    ? email.replace(/^(.{2})(.*)(@.*)$/, (_, a, b, c) => a + '*'.repeat(Math.min(b.length, 5)) + c)
    : ''

  const allFilled = digits.every(d => d !== '')

  return (
    <div className="fixed inset-0 bg-black/70 backdrop-blur-sm z-50 flex items-center justify-center p-4"
         onClick={(e) => e.target === e.currentTarget && onClose?.()}>
      <div className="bg-white dark:bg-gray-900 rounded-2xl w-full max-w-md shadow-2xl animate-scale-in">

        {/* Header */}
        <div className="flex items-center justify-between p-5 border-b border-gray-100 dark:border-gray-800">
          <button onClick={onClose}
            className="text-gray-400 hover:text-gray-600 dark:hover:text-gray-300 p-1 rounded-lg hover:bg-gray-100 dark:hover:bg-gray-800 transition-colors">
            <X size={20} />
          </button>
          <h2 className="font-semibold text-gray-900 dark:text-white">Verify your email</h2>
          <div className="w-8" />
        </div>

        <div className="p-6">
          {/* Icon + instructions */}
          <div className="text-center mb-6">
            <div className="w-16 h-16 bg-blue-50 dark:bg-blue-900/30 rounded-2xl flex items-center justify-center mx-auto mb-4">
              <Mail size={32} className="text-blue-500" />
            </div>
            <p className="text-gray-600 dark:text-gray-400 text-sm leading-relaxed">
              We sent a 6-digit code to
            </p>
            <p className="font-semibold text-gray-900 dark:text-white mt-0.5">{maskedEmail}</p>
            <p className="text-gray-400 text-xs mt-1">Code expires in 5 minutes</p>
          </div>

          {/* OTP digit inputs */}
          <div
            className="flex gap-2.5 justify-center mb-4"
            onPaste={handlePaste}
          >
            {digits.map((digit, i) => (
              <input
                key={i}
                ref={el => inputRefs.current[i] = el}
                type="text"
                inputMode="numeric"
                pattern="[0-9]*"
                maxLength={1}
                value={digit}
                onChange={e => handleChange(i, e.target.value)}
                onKeyDown={e => handleKeyDown(i, e)}
                className={`
                  w-11 h-14 text-center text-2xl font-bold rounded-xl border-2 outline-none
                  transition-all duration-150 select-none
                  ${digit
                    ? 'border-blue-500 bg-blue-50 dark:bg-blue-900/20 text-blue-700 dark:text-blue-300 scale-105'
                    : 'border-gray-200 dark:border-gray-700 bg-gray-50 dark:bg-gray-800 text-gray-900 dark:text-white'
                  }
                  ${error ? 'border-red-400 dark:border-red-500 animate-pulse' : ''}
                  focus:border-blue-400 dark:focus:border-blue-500 focus:scale-105
                `}
                aria-label={`Digit ${i + 1}`}
              />
            ))}
          </div>

          {/* Error message */}
          {error && (
            <div className="mb-4 p-3 bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-xl">
              <p className="text-red-600 dark:text-red-400 text-sm text-center">{error}</p>
            </div>
          )}

          {/* Verify button */}
          <button
            onClick={handleVerify}
            disabled={loading || !allFilled}
            className="btn-primary w-full flex items-center justify-center gap-2 mb-4"
          >
            {loading
              ? <><Loader size={18} className="animate-spin" /> Verifying...</>
              : <><CheckCircle size={18} /> Verify Email</>
            }
          </button>

          {/* Resend section */}
          <div className="text-center space-y-1">
            <p className="text-sm text-gray-500 dark:text-gray-400">Didn't receive the code?</p>
            {canResend ? (
              <button
                onClick={handleResend}
                disabled={resending}
                className="text-sm font-semibold text-blue-500 hover:text-blue-600 dark:hover:text-blue-400
                           flex items-center gap-1.5 mx-auto transition-colors"
              >
                {resending
                  ? <><Loader size={14} className="animate-spin" /> Sending...</>
                  : <><RefreshCw size={14} /> Resend Code</>
                }
              </button>
            ) : (
              <p className="text-sm text-gray-400 dark:text-gray-500">
                Resend available in{' '}
                <span className="font-semibold text-gray-600 dark:text-gray-300 tabular-nums">
                  {countdown}s
                </span>
              </p>
            )}
          </div>

          {/* Hint */}
          <p className="text-center text-xs text-gray-400 dark:text-gray-600 mt-4">
            Check your spam or junk folder if you don't see it.
          </p>
        </div>
      </div>
    </div>
  )
}
