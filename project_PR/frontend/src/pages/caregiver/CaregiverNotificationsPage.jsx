import React, { useState, useEffect, useCallback } from 'react'
import { Link } from 'react-router-dom'
import { useNotifications } from '../../context/NotificationContext'
import { caregiverService } from '../../services/caregiverService'
import {
  Bell,
  CheckCheck,
  CheckCircle2,
  Clock,
  Calendar,
  AlertCircle,
  Info,
  RefreshCw,
  ChevronLeft,
  ChevronRight,
  User,
  ArrowUpRight,
} from 'lucide-react'

// Helper for relative timestamps
const formatRelativeTime = (isoString) => {
  if (!isoString) return ''
  try {
    const date = new Date(isoString)
    const now = new Date()
    const diffInSeconds = Math.floor((now.getTime() - date.getTime()) / 1000)

    if (diffInSeconds < 60) return 'Just now'
    if (diffInSeconds < 3600) {
      const minutes = Math.floor(diffInSeconds / 60)
      return `${minutes}m ago`
    }
    if (diffInSeconds < 86400) {
      const hours = Math.floor(diffInSeconds / 3600)
      return `${hours}h ago`
    }
    if (diffInSeconds < 172800) return 'Yesterday'
    const days = Math.floor(diffInSeconds / 86400)
    if (days < 7) return `${days}d ago`

    return new Intl.DateTimeFormat('en-US', {
      month: 'short',
      day: 'numeric',
      year: 'numeric',
    }).format(date)
  } catch {
    return ''
  }
}

// Helper for full date format
const formatDateTime = (isoString) => {
  if (!isoString) return ''
  try {
    const dateObj = new Date(isoString)
    return new Intl.DateTimeFormat('en-US', {
      month: 'short',
      day: 'numeric',
      year: 'numeric',
      hour: 'numeric',
      minute: '2-digit',
      hour12: true,
    }).format(dateObj)
  } catch {
    return isoString
  }
}

export const CaregiverNotificationsPage = () => {
  const { unreadCount, refreshUnreadCount } = useNotifications()

  // Filter & Pagination State
  const [unreadOnly, setUnreadOnly] = useState(false)
  const [page, setPage] = useState(1)
  const pageSize = 15

  // Data State
  const [items, setItems] = useState([])
  const [totalCount, setTotalCount] = useState(0)
  const [isLoading, setIsLoading] = useState(true)
  const [isRefreshing, setIsRefreshing] = useState(false)
  const [error, setError] = useState(null)
  const [isMarkingAll, setIsMarkingAll] = useState(false)

  // Fetch paginated notifications for caregiver
  const fetchPageNotifications = useCallback(
    async (isSilent = false) => {
      if (isSilent) {
        setIsRefreshing(true)
      } else {
        setIsLoading(true)
      }
      setError(null)

      const offset = (page - 1) * pageSize

      try {
        const data = await caregiverService.getNotifications({
          unread_only: unreadOnly,
          limit: pageSize,
          offset,
        })
        setItems(Array.isArray(data.items) ? data.items : [])
        setTotalCount(data.total_count || 0)
        refreshUnreadCount()
      } catch (err) {
        const detail = err.response?.data?.detail
        setError(
          typeof detail === 'string'
            ? detail
            : 'Unable to load caregiver notifications. Please try again.'
        )
      } finally {
        setIsLoading(false)
        setIsRefreshing(false)
      }
    },
    [page, pageSize, unreadOnly, refreshUnreadCount]
  )

  useEffect(() => {
    fetchPageNotifications()
  }, [fetchPageNotifications])

  // Toggle filter
  const handleToggleUnreadOnly = (val) => {
    setUnreadOnly(val)
    setPage(1)
  }

  // Mark single item as read
  const handleMarkAsRead = async (notificationId) => {
    // Optimistic update
    setItems((prev) =>
      prev.map((n) =>
        n.id === notificationId
          ? { ...n, is_read: true, read_at: new Date().toISOString() }
          : n
      )
    )
    refreshUnreadCount()

    try {
      const updated = await caregiverService.markAsRead(notificationId)
      setItems((prev) =>
        prev.map((n) => (n.id === notificationId ? updated : n))
      )
    } catch {
      fetchPageNotifications(true)
    }
  }

  // Mark all as read
  const handleMarkAllAsRead = async () => {
    setIsMarkingAll(true)
    // Optimistic update
    setItems((prev) =>
      prev.map((n) => ({ ...n, is_read: true, read_at: new Date().toISOString() }))
    )

    try {
      await caregiverService.markAllAsRead()
      refreshUnreadCount()
      if (unreadOnly) {
        fetchPageNotifications(true)
      }
    } catch {
      fetchPageNotifications(true)
    } finally {
      setIsMarkingAll(false)
    }
  }

  const getTypeConfig = (type) => {
    switch (type) {
      case 'MEDICATION_DUE':
        return {
          icon: Clock,
          color: 'text-amber-700',
          bgColor: 'bg-amber-50 border-amber-200',
          label: 'Medication due',
        }
      case 'MEDICATION_UPCOMING':
        return {
          icon: Calendar,
          color: 'text-teal-700',
          bgColor: 'bg-teal-50 border-teal-200',
          label: 'Upcoming medication',
        }
      case 'MISSED_DOSE':
        return {
          icon: AlertCircle,
          color: 'text-rose-700',
          bgColor: 'bg-rose-50 border-rose-200',
          label: 'Missed dose',
        }
      case 'SYSTEM':
      default:
        return {
          icon: Info,
          color: 'text-slate-700',
          bgColor: 'bg-slate-100 border-slate-200',
          label: 'System notification',
        }
    }
  }

  const totalPages = Math.ceil(totalCount / pageSize) || 1

  return (
    <div className="space-y-6">
      {/* Header Banner */}
      <div className="relative overflow-hidden rounded-2xl bg-white border border-slate-200/80 p-6 sm:p-8 shadow-xs">
        <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
          <div>
            <div className="inline-flex items-center space-x-2 px-3 py-1 rounded-full bg-sky-50 border border-sky-200 text-sky-700 text-xs font-bold mb-3 shadow-xs">
              <Bell className="w-3.5 h-3.5" />
              <span>Caregiver Alert Center</span>
            </div>

            <div className="flex items-center space-x-3">
              <h1 className="text-2xl sm:text-3xl font-bold text-slate-900 tracking-tight">
                Patient Alerts & Notifications
              </h1>
              {unreadCount > 0 && (
                <span className="px-2.5 py-0.5 rounded-full text-xs font-bold bg-sky-50 text-sky-800 border border-sky-200">
                  {unreadCount} unread
                </span>
              )}
            </div>

            <p className="text-sm text-slate-500 mt-1.5 max-w-xl font-medium">
              Real-time alerts for medication schedules, due doses, and missed intakes across all your linked patients.
            </p>
          </div>

          <div className="flex items-center gap-3">
            {unreadCount > 0 && (
              <button
                onClick={handleMarkAllAsRead}
                disabled={isMarkingAll || isLoading}
                className="inline-flex items-center space-x-1.5 px-4 py-2 text-xs font-bold text-sky-700 bg-sky-50 hover:bg-sky-100 border border-sky-200 rounded-xl transition-all disabled:opacity-50 cursor-pointer shadow-xs"
              >
                <CheckCheck className="w-4 h-4" />
                <span>{isMarkingAll ? 'Marking...' : 'Mark all read'}</span>
              </button>
            )}

            <button
              onClick={() => fetchPageNotifications(true)}
              disabled={isRefreshing || isLoading}
              className="inline-flex items-center gap-2 px-4 py-2 text-xs font-semibold text-slate-700 bg-white hover:bg-slate-50 border border-slate-200 rounded-xl transition-colors disabled:opacity-50 cursor-pointer shadow-xs"
            >
              <RefreshCw
                className={`w-3.5 h-3.5 text-sky-600 ${isRefreshing ? 'animate-spin' : ''}`}
              />
              <span>{isRefreshing ? 'Updating...' : 'Refresh'}</span>
            </button>
          </div>
        </div>
      </div>

      {/* Filter Tabs */}
      <div className="bg-white border border-slate-200/80 rounded-2xl p-4 sm:p-5 shadow-xs flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div className="flex items-center space-x-1.5 p-1 bg-slate-100 rounded-xl border border-slate-200 self-start">
          <button
            onClick={() => handleToggleUnreadOnly(false)}
            className={`px-4 py-1.5 rounded-lg text-xs font-bold transition-all cursor-pointer ${
              !unreadOnly
                ? 'bg-white text-sky-800 shadow-xs'
                : 'text-slate-600 hover:text-slate-900'
            }`}
          >
            All Notifications
          </button>
          <button
            onClick={() => handleToggleUnreadOnly(true)}
            className={`inline-flex items-center space-x-1.5 px-4 py-1.5 rounded-lg text-xs font-bold transition-all cursor-pointer ${
              unreadOnly
                ? 'bg-white text-sky-800 shadow-xs'
                : 'text-slate-600 hover:text-slate-900'
            }`}
          >
            <span>Unread Only</span>
            {unreadCount > 0 && (
              <span
                className={`px-1.5 py-0.2 rounded-full text-[10px] font-bold ${
                  unreadOnly ? 'bg-sky-50 text-sky-800' : 'bg-slate-200 text-slate-700'
                }`}
              >
                {unreadCount}
              </span>
            )}
          </button>
        </div>

        <div className="text-xs text-slate-500 font-medium">
          Showing <strong className="text-slate-800 font-bold">{items.length}</strong> of{' '}
          <strong className="text-slate-800 font-bold">{totalCount}</strong> notifications
        </div>
      </div>

      {/* Main List */}
      {isLoading ? (
        <div className="space-y-3 animate-pulse">
          {[1, 2, 3, 4, 5].map((i) => (
            <div key={i} className="h-24 bg-slate-100 border border-slate-200 rounded-2xl" />
          ))}
        </div>
      ) : error ? (
        <div className="bg-white border border-slate-200 rounded-2xl p-8 text-center shadow-xs">
          <div className="w-12 h-12 rounded-full bg-rose-50 border border-rose-200 text-rose-600 flex items-center justify-center mx-auto mb-3">
            <AlertCircle className="w-6 h-6" />
          </div>
          <h3 className="text-base font-bold text-slate-900">Unable to load notifications</h3>
          <p className="text-xs text-slate-500 max-w-md mx-auto mt-1 font-medium">{error}</p>
          <button
            onClick={() => fetchPageNotifications(false)}
            className="mt-4 inline-flex items-center gap-1.5 px-4 py-2 text-xs font-bold text-sky-700 bg-sky-50 hover:bg-sky-100 border border-sky-200 rounded-xl transition-colors cursor-pointer"
          >
            <RefreshCw className="w-3.5 h-3.5" />
            <span>Try Again</span>
          </button>
        </div>
      ) : items.length === 0 ? (
        <div className="bg-white border border-slate-200/80 rounded-2xl p-12 text-center shadow-xs">
          <div className="w-12 h-12 rounded-full bg-slate-100 border border-slate-200 text-slate-400 flex items-center justify-center mx-auto mb-3">
            <Bell className="w-6 h-6" />
          </div>
          <h3 className="text-base font-bold text-slate-900">
            {unreadOnly ? 'No unread notifications' : 'No notifications yet'}
          </h3>
          <p className="text-xs text-slate-500 max-w-sm mx-auto mt-1 font-medium">
            {unreadOnly
              ? 'You have caught up with all patient medication alerts.'
              : 'Dose reminders, upcoming schedule alerts, and system notifications for your linked patients will appear here.'}
          </p>
          {unreadOnly && (
            <button
              onClick={() => handleToggleUnreadOnly(false)}
              className="mt-4 inline-flex items-center gap-1.5 px-3.5 py-1.5 text-xs font-bold text-sky-700 bg-sky-50 hover:bg-sky-100 border border-sky-200 rounded-xl transition-colors cursor-pointer"
            >
              <span>View All Notifications</span>
            </button>
          )}
        </div>
      ) : (
        <div className="space-y-3">
          {items.map((item) => {
            const config = getTypeConfig(item.type)
            const Icon = config.icon

            return (
              <div
                key={item.id}
                className={`relative bg-white border rounded-2xl p-4 sm:p-5 shadow-xs transition-all ${
                  !item.is_read
                    ? 'border-sky-300 bg-sky-50/20'
                    : 'border-slate-200/80 opacity-90 hover:opacity-100 hover:border-slate-300'
                }`}
              >
                <div className="flex flex-col sm:flex-row sm:items-start justify-between gap-3">
                  <div className="flex items-start space-x-3.5 min-w-0">
                    <div
                      className={`w-10 h-10 rounded-xl flex items-center justify-center shrink-0 border ${config.bgColor}`}
                    >
                      <Icon className={`w-5 h-5 ${config.color}`} />
                    </div>

                    <div className="min-w-0 flex-1">
                      <div className="flex flex-wrap items-center gap-2 mb-1">
                        {/* Notification Type */}
                        <span
                          className={`text-[10px] font-bold px-2 py-0.5 rounded border uppercase tracking-wider ${config.bgColor} ${config.color}`}
                        >
                          {config.label}
                        </span>

                        {/* Patient Link Badge */}
                        {item.patient_id ? (
                          <Link
                            to={`/app/caregiver/patients/${item.patient_id}`}
                            className="inline-flex items-center space-x-1 px-2 py-0.5 rounded-md text-[10px] font-bold bg-slate-100 hover:bg-sky-50 text-slate-700 hover:text-sky-700 border border-slate-200 hover:border-sky-200 transition-colors"
                            title="View Patient Details"
                          >
                            <User className="w-3 h-3 text-sky-600" />
                            <span>{item.patient_name || 'Linked Patient'}</span>
                            <ArrowUpRight className="w-2.5 h-2.5 text-slate-400" />
                          </Link>
                        ) : (
                          item.patient_name && (
                            <span className="inline-flex items-center space-x-1 px-2 py-0.5 rounded-md text-[10px] font-bold bg-slate-100 text-slate-700 border border-slate-200">
                              <User className="w-3 h-3 text-slate-500" />
                              <span>{item.patient_name}</span>
                            </span>
                          )
                        )}

                        {/* Read/Unread State */}
                        {!item.is_read ? (
                          <span className="inline-flex items-center gap-1.5 px-2 py-0.5 rounded-full text-[10px] font-bold bg-sky-50 text-sky-700 border border-sky-200">
                            <span className="w-1.5 h-1.5 rounded-full bg-sky-500" />
                            Unread
                          </span>
                        ) : (
                          <span className="text-[10px] text-slate-400 font-medium">Read</span>
                        )}

                        <span className="text-[11px] text-slate-300">•</span>
                        <span className="text-[11px] text-slate-500 font-medium">
                          {formatRelativeTime(item.created_at)}
                        </span>
                      </div>

                      <h3
                        className={`text-sm sm:text-base font-bold ${
                          !item.is_read ? 'text-slate-900' : 'text-slate-800'
                        }`}
                      >
                        {item.title}
                      </h3>

                      <p className="text-xs sm:text-sm text-slate-600 mt-1 leading-relaxed font-medium">
                        {item.message}
                      </p>

                      <div className="text-[11px] text-slate-400 mt-2 font-medium">
                        Received: {formatDateTime(item.created_at)}
                      </div>
                    </div>
                  </div>

                  {/* Actions */}
                  <div className="sm:self-center shrink-0 flex items-center space-x-2 pt-2 sm:pt-0 border-t sm:border-t-0 border-slate-100 justify-end">
                    {!item.is_read ? (
                      <button
                        onClick={() => handleMarkAsRead(item.id)}
                        className="inline-flex items-center space-x-1.5 px-3 py-1.5 rounded-xl text-xs font-bold text-sky-700 bg-sky-50 hover:bg-sky-100 border border-sky-200 transition-all cursor-pointer shadow-xs"
                        title="Mark as read"
                      >
                        <CheckCircle2 className="w-3.5 h-3.5" />
                        <span>Mark Read</span>
                      </button>
                    ) : (
                      <span className="text-xs text-slate-400 px-2 py-1 font-medium">
                        Read on {formatDateTime(item.read_at)}
                      </span>
                    )}
                  </div>
                </div>
              </div>
            )
          })}

          {/* Pagination */}
          <div className="flex items-center justify-between px-5 py-4 bg-white border border-slate-200/80 rounded-2xl text-xs shadow-xs">
            <div className="text-slate-500 font-medium">
              Showing <strong className="text-slate-800 font-bold">{(page - 1) * pageSize + 1}</strong> to{' '}
              <strong className="text-slate-800 font-bold">{Math.min(page * pageSize, totalCount)}</strong> of{' '}
              <strong className="text-slate-800 font-bold">{totalCount}</strong> records
            </div>

            <div className="flex items-center space-x-2">
              <button
                onClick={() => setPage((p) => Math.max(1, p - 1))}
                disabled={page <= 1 || isLoading}
                className="inline-flex items-center space-x-1 px-3 py-1.5 rounded-xl border border-slate-200 bg-white text-slate-700 hover:bg-slate-50 font-semibold disabled:opacity-40 transition-colors cursor-pointer disabled:cursor-not-allowed shadow-xs"
              >
                <ChevronLeft className="w-3.5 h-3.5" />
                <span>Previous</span>
              </button>

              <span className="text-slate-700 font-bold px-2">
                Page {page} of {totalPages}
              </span>

              <button
                onClick={() => setPage((p) => Math.min(totalPages, p + 1))}
                disabled={page >= totalPages || isLoading}
                className="inline-flex items-center space-x-1 px-3 py-1.5 rounded-xl border border-slate-200 bg-white text-slate-700 hover:bg-slate-50 font-semibold disabled:opacity-40 transition-colors cursor-pointer disabled:cursor-not-allowed shadow-xs"
              >
                <span>Next</span>
                <ChevronRight className="w-3.5 h-3.5" />
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}

export default CaregiverNotificationsPage
