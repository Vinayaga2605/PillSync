import React from 'react'
import { NavLink } from 'react-router-dom'
import { useAuth } from '../../context/AuthContext'
import { useNotifications } from '../../context/NotificationContext'
import {
  LayoutDashboard,
  Pill,
  Clock,
  Activity,
  History,
  Bell,
  User,
  X,
  HeartHandshake,
  ShieldAlert,
  Users,
  UserCheck,
  Link2,
  TrendingUp,
  Sparkles,
} from 'lucide-react'

export const Sidebar = ({ mobileOpen, onMobileClose }) => {
  const { user } = useAuth()
  const { unreadCount } = useNotifications()

  const isCaregiver = user?.role === 'CAREGIVER'
  const isAdmin = user?.role === 'ADMIN'

  const patientNavItems = [
    {
      name: 'Dashboard',
      path: '/app/dashboard',
      icon: LayoutDashboard,
    },
    {
      name: 'Medicines',
      path: '/app/medicines',
      icon: Pill,
    },
    {
      name: 'Adherence',
      path: '/app/adherence',
      icon: Activity,
    },
    {
      name: 'Smart Insights',
      path: '/app/insights',
      icon: Sparkles,
    },
    {
      name: 'History',
      path: '/app/history',
      icon: History,
    },
    {
      name: 'Notifications',
      path: '/app/notifications',
      icon: Bell,
      badge: unreadCount > 0 ? (unreadCount > 99 ? '99+' : String(unreadCount)) : null,
      badgeColor: 'bg-teal-50 text-teal-700 border-teal-200 font-bold',
    },
    {
      name: 'Profile',
      path: '/app/profile',
      icon: User,
    },
  ]

  const caregiverNavItems = [
    {
      name: 'Dashboard',
      path: '/app/caregiver/dashboard',
      icon: LayoutDashboard,
    },
    {
      name: 'Patients',
      path: '/app/caregiver/patients',
      icon: HeartHandshake,
    },
    {
      name: 'Notifications',
      path: '/app/caregiver/notifications',
      icon: Bell,
      badge: unreadCount > 0 ? (unreadCount > 99 ? '99+' : String(unreadCount)) : null,
      badgeColor: 'bg-sky-50 text-sky-700 border-sky-200 font-bold',
    },
    {
      name: 'Profile',
      path: '/app/profile',
      icon: User,
    },
  ]

  const adminNavItems = [
    {
      name: 'Dashboard',
      path: '/app/admin/dashboard',
      icon: LayoutDashboard,
    },
    {
      name: 'Analytics',
      path: '/app/admin/analytics',
      icon: TrendingUp,
    },
    {
      name: 'Users',
      path: '/app/admin/users',
      icon: Users,
    },
    {
      name: 'Patients',
      path: '/app/admin/patients',
      icon: UserCheck,
    },
    {
      name: 'Caregivers',
      path: '/app/admin/caregivers',
      icon: HeartHandshake,
    },
    {
      name: 'Relationships',
      path: '/app/admin/relationships',
      icon: Link2,
    },
    {
      name: 'Profile',
      path: '/app/profile',
      icon: User,
    },
  ]

  const navItems = isAdmin ? adminNavItems : (isCaregiver ? caregiverNavItems : patientNavItems)

  const navContent = (
    <div className="flex flex-col h-full bg-white border-r border-slate-200/80 shadow-xs">
      {/* Brand Header */}
      <div className="h-16 flex items-center justify-between px-5 border-b border-slate-200/80">
        <div className="flex items-center space-x-3">
          <div className="w-9 h-9 rounded-xl bg-gradient-to-tr from-teal-600 to-emerald-500 flex items-center justify-center shadow-sm shadow-teal-600/20 text-white">
            <Pill className="w-5 h-5 stroke-[2.3]" />
          </div>
          <div>
            <span className="font-bold text-lg text-slate-900 tracking-tight">PillSync</span>
            <p className="text-[10px] text-teal-600 font-semibold uppercase tracking-wider">Health Portal</p>
          </div>
        </div>

        {/* Mobile close button */}
        <button
          onClick={onMobileClose}
          className="lg:hidden p-1.5 text-slate-500 hover:text-slate-800 rounded-lg hover:bg-slate-100 transition-colors cursor-pointer"
          aria-label="Close navigation"
        >
          <X className="w-5 h-5" />
        </button>
      </div>

      {/* Role Banner / Context */}
      <div className="px-4 py-3 border-b border-slate-200/60">
        <div className="flex items-center space-x-2.5 px-3 py-2 rounded-xl bg-slate-50 border border-slate-200/80">
          {user?.role === 'CAREGIVER' && <HeartHandshake className="w-4 h-4 text-sky-600 shrink-0" />}
          {user?.role === 'ADMIN' && <ShieldAlert className="w-4 h-4 text-purple-600 shrink-0" />}
          {user?.role === 'PATIENT' && <User className="w-4 h-4 text-teal-600 shrink-0" />}
          <div className="flex-1 min-w-0">
            <p className="text-[10px] uppercase font-bold text-slate-500 tracking-wider">Active Workspace</p>
            <p className="text-xs font-semibold text-slate-800 capitalize">
              {user?.role ? user.role.toLowerCase() : 'User'} Mode
            </p>
          </div>
        </div>
      </div>

      {/* Navigation Links */}
      <nav className="flex-1 px-3 py-4 space-y-1 overflow-y-auto">
        {navItems.map((item) => {
          const Icon = item.icon
          return (
            <NavLink
              key={item.path}
              to={item.path}
              onClick={onMobileClose}
              className={({ isActive }) =>
                `flex items-center justify-between px-3.5 py-2.5 rounded-xl text-xs font-medium transition-all ${
                  isActive
                    ? 'bg-teal-50 text-teal-800 font-semibold border border-teal-200/80 shadow-xs'
                    : 'text-slate-600 hover:text-slate-900 hover:bg-slate-100/80'
                }`
              }
            >
              <div className="flex items-center space-x-3">
                <Icon className="w-4 h-4 shrink-0" />
                <span>{item.name}</span>
              </div>
              {item.badge && (
                <span
                  className={`text-[9px] font-bold px-1.5 py-0.5 rounded border ${
                    item.badgeColor || 'bg-slate-100 text-slate-500 border-slate-200'
                  }`}
                >
                  {item.badge}
                </span>
              )}
            </NavLink>
          )
        })}
      </nav>

      {/* Footer Info */}
      <div className="p-4 border-t border-slate-200/80">
        <div className="text-[11px] text-slate-400 text-center font-medium">
          PillSync • Medication Adherence
        </div>
      </div>
    </div>
  )

  return (
    <>
      {/* Desktop Sidebar (Fixed) */}
      <aside className="hidden lg:block w-64 h-screen sticky top-0 shrink-0">
        {navContent}
      </aside>

      {/* Mobile Drawer (Slide-over overlay) */}
      {mobileOpen && (
        <div className="fixed inset-0 z-50 lg:hidden">
          {/* Backdrop */}
          <div
            className="fixed inset-0 bg-slate-900/40 backdrop-blur-xs transition-opacity"
            onClick={onMobileClose}
          />
          {/* Drawer Panel */}
          <div className="fixed inset-y-0 left-0 w-72 max-w-full shadow-2xl z-10 animate-in slide-in-from-left duration-200">
            {navContent}
          </div>
        </div>
      )}
    </>
  )
}

export default Sidebar
