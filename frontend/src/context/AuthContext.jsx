import { createContext, useContext, useState, useEffect, useCallback } from 'react'
import { authApi } from '../api/auth'
import { usersApi } from '../api/users'

const AuthContext = createContext(null)

export const AuthProvider = ({ children }) => {
  const [user, setUser]       = useState(() => {
    try { return JSON.parse(localStorage.getItem('user')) }
    catch { return null }
  })
  const [token, setToken]     = useState(() => localStorage.getItem('accessToken'))
  const [loading, setLoading] = useState(true)

  // Rehydrate from server on mount — ensures fresh user data after reload
  useEffect(() => {
    const rehydrate = async () => {
      const storedToken = localStorage.getItem('accessToken')
      if (storedToken) {
        try {
          const { data } = await usersApi.getMe()
          const userData = data.data
          setUser(userData)
          localStorage.setItem('user', JSON.stringify(userData))
        } catch {
          // Token expired or invalid — clear everything
          clearAuth()
        }
      }
      setLoading(false)
    }
    rehydrate()
  }, [])

  const clearAuth = useCallback(() => {
    setUser(null)
    setToken(null)
    localStorage.removeItem('accessToken')
    localStorage.removeItem('refreshToken')
    localStorage.removeItem('user')
  }, [])

  const login = useCallback(async (credentials) => {
    const { data } = await authApi.login(credentials)
    const { accessToken, refreshToken, user: userData } = data.data
    localStorage.setItem('accessToken', accessToken)
    localStorage.setItem('refreshToken', refreshToken)
    localStorage.setItem('user', JSON.stringify(userData))
    setToken(accessToken)
    setUser(userData)
    return userData
  }, [])

  const logout = useCallback(async () => {
    try { await authApi.logout() } catch { /* ignore — clear client state anyway */ }
    clearAuth()
    window.location.href = '/login'
  }, [clearAuth])

  const updateUser = useCallback((updated) => {
    setUser(prev => {
      const merged = { ...(prev || {}), ...updated }
      localStorage.setItem('user', JSON.stringify(merged))
      return merged
    })
  }, [])

  // Refresh user from server (call after profile update)
  const refreshUser = useCallback(async () => {
    try {
      const { data } = await usersApi.getMe()
      setUser(data.data)
      localStorage.setItem('user', JSON.stringify(data.data))
    } catch { /* silent */ }
  }, [])

  return (
    <AuthContext.Provider value={{
      user,
      token,
      loading,
      login,
      logout,
      updateUser,
      refreshUser,
      clearAuth,
      isAuthenticated: !!token && !!user,
    }}>
      {children}
    </AuthContext.Provider>
  )
}

export const useAuth = () => {
  const ctx = useContext(AuthContext)
  if (!ctx) throw new Error('useAuth must be used within AuthProvider')
  return ctx
}
