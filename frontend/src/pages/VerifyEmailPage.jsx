import { useEffect, useState } from 'react'
import { useSearchParams, Link, useNavigate } from 'react-router-dom'
import { CheckCircle, XCircle, Loader, Mail } from 'lucide-react'
import { authApi } from '../api/auth'
import OtpVerificationModal from '../components/auth/OtpVerificationModal'

/**
 * FIX #9 — Correct response field access: data.data (not data.message).
 * This page handles both:
 *   a) Direct OTP entry (/verify-email?email=xxx)
 *   b) Legacy token link (/verify-email?token=xxx)
 */
export default function VerifyEmailPage() {
  const [params]    = useSearchParams()
  const navigate    = useNavigate()
  const token       = params.get('token')
  const email       = params.get('email')
  const [status, setStatus]   = useState(token ? 'loading' : 'otp')
  const [message, setMessage] = useState('')

  // If token present → legacy link flow
  useEffect(() => {
    if (!token) return
    authApi.verifyEmail(token)
      .then(({ data }) => {
        // FIX #9: data.data.message or data.message depending on wrapper
        setStatus('success')
        setMessage(data?.data?.message || data?.message || 'Email verified!')
      })
      .catch(err => {
        setStatus('error')
        setMessage(err?.response?.data?.message || 'Verification failed')
      })
  }, [token])

  if (status === 'otp' || (!token && email)) {
    return (
      <div className="min-h-screen bg-gray-50 dark:bg-black flex items-center justify-center p-4">
        <OtpVerificationModal
          email={email || ''}
          onVerified={() => { setStatus('success'); setMessage('Email verified!') }}
          onClose={() => navigate('/login')}
        />
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-black flex items-center justify-center p-4">
      <div className="bg-white dark:bg-gray-900 rounded-2xl border border-gray-200 dark:border-gray-800 p-8 max-w-sm w-full text-center shadow-sm">
        {status === 'loading' && (
          <>
            <Loader size={48} className="animate-spin text-blue-500 mx-auto mb-4" />
            <p className="text-gray-600 dark:text-gray-400">Verifying your email...</p>
          </>
        )}
        {status === 'success' && (
          <>
            <CheckCircle size={48} className="text-green-500 mx-auto mb-4" />
            <h2 className="text-xl font-bold text-gray-900 dark:text-white mb-2">Email Verified! 🎉</h2>
            <p className="text-gray-500 dark:text-gray-400 text-sm mb-6">{message}</p>
            <Link to="/login" className="btn-primary inline-block">Continue to Login</Link>
          </>
        )}
        {status === 'error' && (
          <>
            <XCircle size={48} className="text-red-500 mx-auto mb-4" />
            <h2 className="text-xl font-bold text-gray-900 dark:text-white mb-2">Verification Failed</h2>
            <p className="text-gray-500 dark:text-gray-400 text-sm mb-6">{message}</p>
            <div className="space-y-3">
              <Link to="/login" className="btn-secondary inline-block w-full">Go to Login</Link>
            </div>
          </>
        )}
      </div>
    </div>
  )
}
