import React, { createContext, useContext, useState, useEffect, useCallback } from 'react'
import { useAuth } from './AuthContext'
import { notificationService } from '../services/notificationService'
import { caregiverService } from '../services/caregiverService'

const NotificationContext = createContext(null)

export const NotificationProvider = ({ children }) => {
  const { user } = useAuth()
  const isPatient = user?.role === 'PATIENT'
  const isCaregiver = user?.role === 'CAREGIVER'

  const [notifications, setNotifications] = useState([])
  const [totalCount, setTotalCount] = useState(0)
  const [unreadCount, setUnreadCount] = useState(0)
  const [isLoading, setIsLoading] = useState(false)
  const [error, setError] = useState(null)

  // Fetch only unread count (lightweight)
  const refreshUnreadCount = useCallback(async () => {
    if (!isPatient && !isCaregiver) return
    try {
      const data = isCaregiver
        ? await caregiverService.getUnreadCount()
        : await notificationService.getUnreadCount()
      setUnreadCount(typeof data.unread_count === 'number' ? data.unread_count : 0)
    } catch {
      // Ignore background count error to prevent breaking app
    }
  }, [isPatient, isCaregiver])

  // Fetch list of notifications
  const refreshNotifications = useCallback(
    async (params = {}) => {
      if (!isPatient && !isCaregiver) return
      setIsLoading(true)
      setError(null)
      try {
        const data = isCaregiver
          ? await caregiverService.getNotifications(params)
          : await notificationService.getNotifications(params)
        setNotifications(Array.isArray(data.items) ? data.items : [])
        setTotalCount(data.total_count || 0)
        setUnreadCount(typeof data.unread_count === 'number' ? data.unread_count : 0)
      } catch (err) {
        const detail = err.response?.data?.detail
        setError(
          typeof detail === 'string'
            ? detail
            : 'Unable to load notifications. Please try again.'
        )
      } finally {
        setIsLoading(false)
      }
    },
    [isPatient, isCaregiver]
  )

  // Mark single notification as read
  const markAsRead = async (notificationId) => {
    if (!notificationId) return

    // Optimistic update
    setNotifications((prev) =>
      prev.map((n) =>
        n.id === notificationId ? { ...n, is_read: true, read_at: new Date().toISOString() } : n
      )
    )
    setUnreadCount((prev) => Math.max(0, prev - 1))

    try {
      const updated = isCaregiver
        ? await caregiverService.markAsRead(notificationId)
        : await notificationService.markAsRead(notificationId)
      // Sync with server response
      setNotifications((prev) =>
        prev.map((n) => (n.id === notificationId ? updated : n))
      )
    } catch {
      // Refresh to restore accurate server state if failed
      refreshUnreadCount()
    }
  }

  // Mark all notifications as read
  const markAllAsRead = async () => {
    // Optimistic update
    setNotifications((prev) =>
      prev.map((n) => ({ ...n, is_read: true, read_at: new Date().toISOString() }))
    )
    setUnreadCount(0)

    try {
      if (isCaregiver) {
        await caregiverService.markAllAsRead()
      } else {
        await notificationService.markAllAsRead()
      }
    } catch {
      // Refresh to restore accurate server state if failed
      refreshUnreadCount()
    }
  }

  // Initial load when user logs in
  useEffect(() => {
    if (isPatient || isCaregiver) {
      refreshUnreadCount()
      refreshNotifications({ limit: 15 })
    } else {
      setNotifications([])
      setTotalCount(0)
      setUnreadCount(0)
    }
  }, [isPatient, isCaregiver, refreshUnreadCount, refreshNotifications])

  const value = {
    notifications,
    totalCount,
    unreadCount,
    isLoading,
    error,
    refreshNotifications,
    refreshUnreadCount,
    markAsRead,
    markAllAsRead,
  }

  return (
    <NotificationContext.Provider value={value}>
      {children}
    </NotificationContext.Provider>
  )
}

export const useNotifications = () => {
  const context = useContext(NotificationContext)
  if (!context) {
    throw new Error('useNotifications must be used within a NotificationProvider')
  }
  return context
}

export default NotificationContext
