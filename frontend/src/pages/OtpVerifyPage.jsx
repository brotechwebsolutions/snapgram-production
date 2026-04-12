import { useSearchParams, useNavigate } from 'react-router-dom'
import OtpVerificationModal from '../components/auth/OtpVerificationModal'
import toast from 'react-hot-toast'

/**
 * Standalone OTP verification page.
 * Accessed via /verify-otp?email=user@example.com
 * Used when user navigates directly (e.g. from email link or redirect).
 */
export default function OtpVerifyPage() {
  const [params]  = useSearchParams()
  const navigate  = useNavigate()
  const email     = params.get('email') || ''

  const handleVerified = () => {
    toast.success('Email verified! You can now log in.')
    navigate('/login', { replace: true })
  }

  const handleClose = () => {
    navigate('/login', { replace: true })
  }

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-black flex items-center justify-center p-4">
      <OtpVerificationModal
        email={email}
        onVerified={handleVerified}
        onClose={handleClose}
      />
    </div>
  )
}
