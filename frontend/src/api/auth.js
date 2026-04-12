import api from './axios'

/**
 * auth.js — all authentication API calls.
 *
 * SIGNUP (3-step OTP-first flow):
 *   1. sendOtp(email)              → POST /auth/send-otp
 *   2. verifySignupOtp(data)       → POST /auth/verify-otp   { email, otp }
 *   3. setPassword(data)           → POST /auth/set-password { email, username, fullName, password }
 *                                     → returns AuthResponse (JWT + user) for auto-login
 *
 * SESSION:
 *   login(data)                   → POST /auth/login
 *   logout()                      → POST /auth/logout
 *   changePassword(data)          → PUT  /auth/change-password
 *
 * PASSWORD RESET — Mode A (Email Link):
 *   forgotPasswordLink(email)     → POST /auth/forgot-password/link
 *   resetPasswordLink(data)       → POST /auth/reset-password/link { token, newPassword }
 *
 * PASSWORD RESET — Mode B (OTP):
 *   forgotPassword(email)         → POST /auth/forgot-password
 *   resendPasswordResetOtp(email) → POST /auth/forgot-password/resend
 *   resetPassword(data)           → POST /auth/reset-password { email, otp, newPassword }
 *
 * LEGACY:
 *   verifyEmail(token)            → GET  /auth/verify-email?token=
 *   resendOtp(email)              → POST /auth/resend-verification
 */
export const authApi = {
  // ── Signup ────────────────────────────────────────────────────────────────
  sendOtp:               (email)  => api.post('/auth/send-otp', { email }),
  verifySignupOtp:       (data)   => api.post('/auth/verify-otp', data),
  // setPassword returns AuthResponse (JWT) for auto-login after signup
  setPassword:           (data)   => api.post('/auth/set-password', data),

  // ── Session ───────────────────────────────────────────────────────────────
  login:                 (data)   => api.post('/auth/login', data),
  logout:                ()       => api.post('/auth/logout'),
  changePassword:        (data)   => api.put('/auth/change-password', data),

  // ── Password reset — Mode A: Email Link ───────────────────────────────────
  forgotPasswordLink:    (email)  => api.post('/auth/forgot-password/link', { email }),
  resetPasswordLink:     (data)   => api.post('/auth/reset-password/link', data),

  // ── Password reset — Mode B: OTP ─────────────────────────────────────────
  forgotPassword:        (email)  => api.post('/auth/forgot-password', { email }),
  resendPasswordResetOtp:(email)  => api.post('/auth/forgot-password/resend', { email }),
  resetPassword:         (data)   => api.post('/auth/reset-password', data),

  // ── Legacy ────────────────────────────────────────────────────────────────
  verifyOtp:             (data)   => api.post('/auth/verify-otp', data),
  resendOtp:             (email)  => api.post('/auth/resend-verification', { email }),
  verifyEmail:           (token)  => api.get(`/auth/verify-email?token=${token}`),
}
