import React from 'react'
import { Navigate } from 'react-router-dom'
import { useAuth } from '../context/AuthContext'

export const ProtectedRoute = ({ children, allowedRoles }) => {
  const { user, isAuthenticated, isLoading } = useAuth()

  if (isLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-slate-50 text-teal-600">
        <div className="flex flex-col items-center space-y-3">
          <div className="w-10 h-10 border-3 border-teal-500/20 border-t-teal-600 rounded-full animate-spin"></div>
          <p className="text-sm font-semibold text-slate-500">Verifying session...</p>
        </div>
      </div>
    )
  }

  if (!isAuthenticated) {
    return <Navigate to="/login" replace />
  }

  if (allowedRoles && user?.role && !allowedRoles.includes(user.role)) {
    if (user.role === 'ADMIN') {
      return <Navigate to="/app/admin/dashboard" replace />
    }
    if (user.role === 'CAREGIVER') {
      return <Navigate to="/app/caregiver/dashboard" replace />
    }
    return <Navigate to="/app/dashboard" replace />
  }

  return children
}
