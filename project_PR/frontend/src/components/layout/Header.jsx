import React, { useState } from 'react'
import { useAuth } from '../../context/AuthContext'
import { useNotifications } from '../../context/NotificationContext'
import { NotificationPanel } from '../notifications/NotificationPanel'
import { Pill, LogOut, Menu, Bell } from 'lucide-react'

export const Header = ({ onMobileMenuToggle }) => {
  const { user, logout } = useAuth()
  const { unreadCount } = useNotifications()
  const [isPanelOpen, setIsPanelOpen] = useState(false)

  const isPatient = user?.role === 'PATIENT'

  const getRoleBadgeColor = (role) => {
    switch (role) {
      case 'ADMIN':
        return 'bg-purple-50 text-purple-700 border-purple-200/80'
      case 'CAREGIVER':
        return 'bg-sky-50 text-sky-700 border-sky-200/80'
      case 'PATIENT':
      default:
        return 'bg-teal-50 text-teal-700 border-teal-200/80'
    }
  }

  return (
    <header className="sticky top-0 z-30 h-16 bg-white/90 backdrop-blur-md border-b border-slate-200/80 px-4 sm:px-6 lg:px-8 flex items-center justify-between transition-colors">
      {/* Left: Mobile Toggle & Mobile Brand */}
      <div className="flex items-center space-x-3">
        <button
          onClick={onMobileMenuToggle}
          className="lg:hidden p-2 rounded-xl text-slate-500 hover:text-slate-800 hover:bg-slate-100 border border-transparent hover:border-slate-200 transition-colors cursor-pointer"
          aria-label="Toggle navigation menu"
        >
          <Menu className="w-5 h-5" />
        </button>

        <div className="flex items-center space-x-2.5 lg:hidden">
          <div className="w-8 h-8 rounded-xl bg-gradient-to-tr from-teal-600 to-emerald-500 flex items-center justify-center shadow-sm shadow-teal-600/20 text-white">
            <Pill className="w-4.5 h-4.5 stroke-[2.3]" />
          </div>
          <span className="font-bold text-base text-slate-900 tracking-tight">PillSync</span>
        </div>
      </div>

      {/* Right: Authenticated User & Actions */}
      <div className="flex items-center space-x-2.5 sm:space-x-3.5">
        {/* In-App Notification Bell (For Patients) */}
        {isPatient && (
          <div className="relative">
            <button
              onClick={() => setIsPanelOpen((prev) => !prev)}
              className="relative p-2 rounded-xl text-slate-600 hover:text-slate-900 bg-white hover:bg-slate-50 border border-slate-200 hover:border-slate-300 shadow-xs transition-all cursor-pointer focus:outline-none focus:ring-2 focus:ring-teal-500/20"
              aria-label={
                unreadCount > 0
                  ? `Notifications (${unreadCount} unread)`
                  : 'Notifications'
              }
              aria-expanded={isPanelOpen}
              aria-haspopup="dialog"
            >
              <Bell className="w-4.5 h-4.5" />
              {unreadCount > 0 && (
                <span className="absolute -top-1 -right-1 min-w-[18px] h-[18px] px-1 rounded-full bg-teal-600 text-[10px] font-bold text-white flex items-center justify-center shadow-xs animate-in zoom-in-50 duration-200">
                  {unreadCount > 99 ? '99+' : unreadCount}
                </span>
              )}
            </button>

            {/* Dropdown Panel */}
            <NotificationPanel
              isOpen={isPanelOpen}
              onClose={() => setIsPanelOpen(false)}
            />
          </div>
        )}

        {/* User Info Capsule */}
        <div className="flex items-center space-x-2.5 px-3 py-1.5 rounded-full bg-slate-100/80 border border-slate-200/80">
          <div className="w-6 h-6 rounded-full bg-teal-600 text-white flex items-center justify-center text-xs font-bold shadow-xs">
            {user?.first_name ? user.first_name[0].toUpperCase() : 'U'}
          </div>
          <div className="hidden sm:flex flex-col">
            <span className="text-xs font-semibold text-slate-800 leading-tight">
              {user?.first_name} {user?.last_name}
            </span>
          </div>
          <span
            className={`text-[10px] font-bold px-2 py-0.5 rounded-full border uppercase tracking-wider ${getRoleBadgeColor(
              user?.role
            )}`}
          >
            {user?.role}
          </span>
        </div>

        {/* Logout Button */}
        <button
          onClick={logout}
          className="inline-flex items-center space-x-1.5 px-3 py-1.5 rounded-xl bg-white hover:bg-rose-50 text-slate-600 hover:text-rose-600 border border-slate-200 hover:border-rose-200 text-xs font-medium shadow-xs transition-all cursor-pointer"
          title="Sign out of PillSync"
        >
          <LogOut className="w-3.5 h-3.5" />
          <span className="hidden sm:inline">Log out</span>
        </button>
      </div>
    </header>
  )
}

export default Header
