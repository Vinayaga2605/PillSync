import React, { createContext, useContext, useState, useEffect } from 'react'
import { authService } from '../services/authService'

const AuthContext = createContext(null)

export const AuthProvider = ({ children }) => {
  const [user, setUser] = useState(() => {
    const savedUser = localStorage.getItem('pillsync_user')
    try {
      return savedUser ? JSON.parse(savedUser) : null
    } catch {
      return null
    }
  })
  const [token, setToken] = useState(() => localStorage.getItem('pillsync_token') || null)
  const [isLoading, setIsLoading] = useState(true)

  // Verify authentication on mount
  useEffect(() => {
    const verifySession = async () => {
      const storedToken = localStorage.getItem('pillsync_token')
      if (storedToken) {
        try {
          const userData = await authService.getCurrentUser()
          setUser(userData)
          localStorage.setItem('pillsync_user', JSON.stringify(userData))
        } catch {
          // Token expired or invalid
          logout()
        }
      } else {
        setUser(null)
      }
      setIsLoading(false)
    }

    verifySession()
  }, [])

  const login = async (email, password) => {
    const data = await authService.login({ email, password })
    setToken(data.access_token)
    setUser(data.user)
    localStorage.setItem('pillsync_token', data.access_token)
    localStorage.setItem('pillsync_user', JSON.stringify(data.user))
    return data.user
  }

  const register = async (userData) => {
    return await authService.register(userData)
  }

  const logout = () => {
    setToken(null)
    setUser(null)
    localStorage.removeItem('pillsync_token')
    localStorage.removeItem('pillsync_user')
  }

  const updateUser = (updatedFields) => {
    setUser((prev) => {
      const updated = { ...prev, ...updatedFields }
      localStorage.setItem('pillsync_user', JSON.stringify(updated))
      return updated
    })
  }

  const value = {
    user,
    token,
    isAuthenticated: !!token && !!user,
    isLoading,
    login,
    register,
    logout,
    updateUser,
  }

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>
}

export const useAuth = () => {
  const context = useContext(AuthContext)
  if (!context) {
    throw new Error('useAuth must be used within an AuthProvider')
  }
  return context
}
