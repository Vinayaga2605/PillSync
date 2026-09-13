import React, { useEffect, useRef } from 'react'
import { Link } from 'react-router-dom'
import { useNotifications } from '../../context/NotificationContext'
import {
  Bell,
  CheckCheck,
  Clock,
  AlertCircle,
  Info,
  Calendar,
  RefreshCw,
  ArrowRight,
  X,
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
    }).format(date)
  } catch {
    return ''
  }
}

export const NotificationPanel = ({ isOpen, onClose }) => {
  const panelRef = useRef(null)
  const {
    notifications,
    unreadCount,
    isLoading,
    error,
    refreshNotifications,
    markAsRead,
    markAllAsRead,
  } = useNotifications()

  // Close on Click Outside or Escape Key
  useEffect(() => {
    if (!isOpen) return

    const handleClickOutside = (event) => {
      if (panelRef.current && !panelRef.current.contains(event.target)) {
        onClose()
      }
    }

    const handleKeyDown = (event) => {
      if (event.key === 'Escape') {
        onClose()
      }
    }

    document.addEventListener('mousedown', handleClickOutside)
    document.addEventListener('keydown', handleKeyDown)

    return () => {
      document.removeEventListener('mousedown', handleClickOutside)
      document.removeEventListener('keydown', handleKeyDown)
    }
  }, [isOpen, onClose])

  if (!isOpen) return null

  const getTypeConfig = (type) => {
    switch (type) {
      case 'MEDICATION_DUE':
        return {
          icon: Clock,
          color: 'text-amber-700',
          bgColor: 'bg-amber-50 border-amber-200',
          label: 'Due Now',
        }
      case 'MEDICATION_UPCOMING':
        return {
          icon: Calendar,
          color: 'text-teal-700',
          bgColor: 'bg-teal-50 border-teal-200',
          label: 'Upcoming',
        }
      case 'MISSED_DOSE':
        return {
          icon: AlertCircle,
          color: 'text-rose-700',
          bgColor: 'bg-rose-50 border-rose-200',
          label: 'Missed',
        }
      case 'SYSTEM':
      default:
        return {
          icon: Info,
          color: 'text-slate-700',
          bgColor: 'bg-slate-100 border-slate-200',
          label: 'System',
        }
    }
  }

  // Display top 10 items in the dropdown panel
  const displayItems = notifications.slice(0, 10)

  return (
    <div
      ref={panelRef}
      className="absolute right-0 top-full mt-2.5 w-80 sm:w-96 max-w-[calc(100vw-2rem)] bg-white border border-slate-200 rounded-2xl shadow-2xl z-50 overflow-hidden flex flex-col max-h-[85vh] sm:max-h-[600px] animate-in fade-in zoom-in-95 duration-150"
      role="dialog"
      aria-label="Notifications panel"
    >
      {/* Panel Header */}
      <div className="flex items-center justify-between p-4 border-b border-slate-100 bg-slate-50/70 shrink-0">
        <div className="flex items-center space-x-2">
          <div className="w-7 h-7 rounded-lg bg-teal-50 text-teal-700 border border-teal-200 flex items-center justify-center">
            <Bell className="w-3.5 h-3.5" />
          </div>
          <div>
            <h3 className="text-sm font-bold text-slate-900 tracking-tight">Notifications</h3>
          </div>
          {unreadCount > 0 && (
            <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-teal-50 text-teal-800 border border-teal-200">
              {unreadCount} unread
            </span>
          )}
        </div>

        <div className="flex items-center space-x-1">
          {unreadCount > 0 && (
            <button
              onClick={markAllAsRead}
              className="inline-flex items-center space-x-1 px-2.5 py-1 rounded-lg text-[11px] font-semibold text-teal-700 hover:text-teal-800 hover:bg-teal-50 transition-colors cursor-pointer"
              title="Mark all notifications as read"
            >
              <CheckCheck className="w-3.5 h-3.5" />
              <span>Mark all read</span>
            </button>
          )}
          <button
            onClick={onClose}
            className="p-1 rounded-lg text-slate-400 hover:text-slate-700 hover:bg-slate-100 transition-colors cursor-pointer"
            aria-label="Close notifications"
          >
            <X className="w-4 h-4" />
          </button>
        </div>
      </div>

      {/* Panel Body */}
      <div className="flex-1 overflow-y-auto divide-y divide-slate-100 p-2 space-y-1.5">
        {isLoading && displayItems.length === 0 ? (
          <div className="p-4 space-y-3 animate-pulse">
            {[1, 2, 3].map((i) => (
              <div key={i} className="h-16 bg-slate-100 rounded-xl" />
            ))}
          </div>
        ) : error ? (
          <div className="p-6 text-center">
            <AlertCircle className="w-8 h-8 text-rose-500 mx-auto mb-2 opacity-80" />
            <p className="text-xs text-slate-600 font-medium">{error}</p>
            <button
              onClick={() => refreshNotifications({ limit: 15 })}
              className="mt-3 inline-flex items-center space-x-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold text-teal-700 bg-teal-50 hover:bg-teal-100 border border-teal-200 transition-colors cursor-pointer"
            >
              <RefreshCw className="w-3 h-3" />
              <span>Retry</span>
            </button>
          </div>
        ) : displayItems.length === 0 ? (
          <div className="py-10 px-4 text-center">
            <div className="w-10 h-10 rounded-full bg-slate-100 border border-slate-200 text-slate-400 flex items-center justify-center mx-auto mb-2.5">
              <Bell className="w-5 h-5 opacity-60" />
            </div>
            <p className="text-xs font-bold text-slate-800">No notifications yet.</p>
            <p className="text-[11px] text-slate-500 mt-0.5">
              Scheduled doses and system alerts will appear here.
            </p>
          </div>
        ) : (
          displayItems.map((item) => {
            const config = getTypeConfig(item.type)
            const Icon = config.icon

            return (
              <div
                key={item.id}
                onClick={() => {
                  if (!item.is_read) {
                    markAsRead(item.id)
                  }
                }}
                className={`group relative p-3 rounded-xl border transition-all cursor-pointer ${
                  !item.is_read
                    ? 'bg-teal-50/30 border-teal-200/80 hover:border-teal-300 shadow-xs'
                    : 'bg-white border-slate-200/70 hover:bg-slate-50 opacity-90 hover:opacity-100'
                }`}
              >
                <div className="flex items-start space-x-3">
                  <div
                    className={`w-8 h-8 rounded-lg flex items-center justify-center shrink-0 border mt-0.5 ${config.bgColor}`}
                  >
                    <Icon className={`w-4 h-4 ${config.color}`} />
                  </div>

                  <div className="flex-1 min-w-0">
                    <div className="flex items-center justify-between gap-1 mb-0.5">
                      <h4
                        className={`text-xs font-bold truncate ${
                          !item.is_read ? 'text-slate-900' : 'text-slate-700'
                        }`}
                      >
                        {item.title}
                      </h4>
                      <span className="text-[10px] text-slate-400 whitespace-nowrap shrink-0">
                        {formatRelativeTime(item.created_at)}
                      </span>
                    </div>

                    <p className="text-xs text-slate-600 line-clamp-2 leading-relaxed font-medium">
                      {item.message}
                    </p>

                    <div className="flex items-center justify-between mt-2 pt-1.5 border-t border-slate-100">
                      <span
                        className={`text-[9px] font-bold px-1.5 py-0.5 rounded border uppercase tracking-wider ${config.bgColor} ${config.color}`}
                      >
                        {config.label}
                      </span>

                      {!item.is_read && (
                        <span className="inline-flex items-center space-x-1 text-[10px] text-teal-600 group-hover:text-teal-700 font-semibold">
                          <span className="w-1.5 h-1.5 rounded-full bg-teal-500" />
                          <span>Tap to mark read</span>
                        </span>
                      )}
                    </div>
                  </div>
                </div>
              </div>
            )
          })
        )}
      </div>

      {/* Panel Footer */}
      <div className="p-3 border-t border-slate-100 bg-slate-50/70 shrink-0">
        <Link
          to="/app/notifications"
          onClick={onClose}
          className="w-full inline-flex items-center justify-center space-x-1.5 py-2 px-3 rounded-xl text-xs font-bold text-teal-700 bg-teal-50 hover:bg-teal-100 border border-teal-200 transition-all cursor-pointer shadow-xs"
        >
          <span>View All Notifications</span>
          <ArrowRight className="w-3.5 h-3.5" />
        </Link>
      </div>
    </div>
  )
}
export default NotificationPanel
