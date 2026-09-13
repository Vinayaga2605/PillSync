import React, { useState, useEffect, useCallback } from 'react'
import { Link } from 'react-router-dom'
import { adminService } from '../../services/adminService'
import {
  ShieldAlert,
  Users,
  UserCheck,
  HeartHandshake,
  Pill,
  Calendar,
  CheckCircle2,
  Bell,
  Link2,
  RefreshCw,
  AlertCircle,
  ArrowRight,
  Activity,
  Layers,
  TrendingUp,
  BarChart2,
} from 'lucide-react'

export const AdminDashboardPage = () => {
  const [summary, setSummary] = useState(null)
  const [isLoading, setIsLoading] = useState(true)
  const [isRefreshing, setIsRefreshing] = useState(false)
  const [error, setError] = useState(null)

  const loadSummary = useCallback(async (isSilent = false) => {
    if (isSilent) {
      setIsRefreshing(true)
    } else {
      setIsLoading(true)
    }
    setError(null)

    try {
      const data = await adminService.getDashboardSummary()
      setSummary(data)
    } catch (err) {
      const detail = err?.response?.data?.detail
      setError(
        typeof detail === 'string'
          ? detail
          : 'Unable to load system overview metrics. Please try again.'
      )
    } finally {
      setIsLoading(false)
      setIsRefreshing(false)
    }
  }, [])

  useEffect(() => {
    loadSummary()
  }, [loadSummary])

  const metricCards = [
    {
      title: 'Total Users',
      value: summary?.total_users ?? 0,
      icon: Users,
      color: 'text-purple-600',
      bgColor: 'bg-purple-50 border-purple-200',
      description: `${summary?.total_admins ?? 0} Admins, ${summary?.total_patients ?? 0} Patients, ${summary?.total_caregivers ?? 0} Caregivers`,
    },
    {
      title: 'Registered Patients',
      value: summary?.total_patients ?? 0,
      icon: UserCheck,
      color: 'text-teal-600',
      bgColor: 'bg-teal-50 border-teal-200',
      description: 'Active Patient Profiles',
    },
    {
      title: 'Caregivers',
      value: summary?.total_caregivers ?? 0,
      icon: HeartHandshake,
      color: 'text-sky-600',
      bgColor: 'bg-sky-50 border-sky-200',
      description: 'Assigned Healthcare Monitors',
    },
    {
      title: 'Active Relationships',
      value: summary?.active_caregiver_patient_links ?? 0,
      icon: Link2,
      color: 'text-indigo-600',
      bgColor: 'bg-indigo-50 border-indigo-200',
      description: 'Caregiver-Patient Links',
    },
    {
      title: 'Active Medications',
      value: summary?.total_active_medications ?? 0,
      icon: Pill,
      color: 'text-emerald-600',
      bgColor: 'bg-emerald-50 border-emerald-200',
      description: 'Patient Medication Prescriptions',
    },
    {
      title: 'Active Schedules',
      value: summary?.total_active_schedules ?? 0,
      icon: Calendar,
      color: 'text-blue-600',
      bgColor: 'bg-blue-50 border-blue-200',
      description: 'Dose Time Recurrence Rules',
    },
    {
      title: 'Dose Events Logged',
      value: summary?.total_dose_events ?? 0,
      icon: CheckCircle2,
      color: 'text-amber-600',
      bgColor: 'bg-amber-50 border-amber-200',
      description: 'Intake History Records',
    },
    {
      title: 'In-App Notifications',
      value: summary?.total_notifications ?? 0,
      icon: Bell,
      color: 'text-rose-600',
      bgColor: 'bg-rose-50 border-rose-200',
      description: 'Alerts & Reminders Generated',
    },
  ]

  const quickNavItems = [
    {
      title: 'User Accounts Directory',
      description: 'Browse, inspect, and filter all registered users by role, active status, or email search.',
      path: '/app/admin/users',
      icon: Users,
      badge: `${summary?.total_users ?? '—'} Accounts`,
      badgeColor: 'bg-purple-50 text-purple-700 border-purple-200',
    },
    {
      title: 'Patient Management',
      description: 'Oversee patient health profiles, linked caregivers, and active medication regimens.',
      path: '/app/admin/patients',
      icon: UserCheck,
      badge: `${summary?.total_patients ?? '—'} Patients`,
      badgeColor: 'bg-teal-50 text-teal-700 border-teal-200',
    },
    {
      title: 'Caregiver Management',
      description: 'Monitor registered caregivers, affiliated healthcare organizations, and linked patient loads.',
      path: '/app/admin/caregivers',
      icon: HeartHandshake,
      badge: `${summary?.total_caregivers ?? '—'} Caregivers`,
      badgeColor: 'bg-sky-50 text-sky-700 border-sky-200',
    },
    {
      title: 'Caregiver-Patient Assignments',
      description: 'View active caregiver permissions, relationship bindings, and assigned patient linkages.',
      path: '/app/admin/relationships',
      icon: Link2,
      badge: `${summary?.active_caregiver_patient_links ?? '—'} Links`,
      badgeColor: 'bg-indigo-50 text-indigo-700 border-indigo-200',
    },
  ]

  return (
    <div className="space-y-7">
      {/* Welcome & Action Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <div className="flex items-center space-x-2.5">
            <h1 className="text-xl sm:text-2xl font-bold text-slate-900 tracking-tight">
              Admin Workspace
            </h1>
            <span className="px-2.5 py-0.5 rounded-full text-xs font-bold bg-purple-50 text-purple-700 border border-purple-200 inline-flex items-center space-x-1">
              <ShieldAlert className="w-3 h-3 text-purple-600" />
              <span>System Administrator</span>
            </span>
          </div>
          <p className="text-xs sm:text-sm text-slate-500 mt-1">
            Global system-level oversight, clinical directory administration, and infrastructure adherence metrics.
          </p>
        </div>

        <div className="flex items-center space-x-2.5 self-start sm:self-auto">
          <Link
            to="/app/admin/analytics"
            className="inline-flex items-center space-x-1.5 px-3.5 py-2 rounded-xl bg-purple-50 hover:bg-purple-100 text-purple-700 border border-purple-200 text-xs font-semibold shadow-2xs transition-all"
          >
            <TrendingUp className="w-3.5 h-3.5" />
            <span>View Analytics</span>
          </Link>
          <button
            onClick={() => loadSummary(true)}
            disabled={isLoading || isRefreshing}
            className="inline-flex items-center space-x-1.5 px-3.5 py-2 rounded-xl bg-white hover:bg-slate-50 text-slate-700 border border-slate-200 text-xs font-semibold shadow-2xs transition-all cursor-pointer disabled:opacity-50"
          >
            <RefreshCw className={`w-3.5 h-3.5 ${isRefreshing ? 'animate-spin text-purple-600' : ''}`} />
            <span>{isRefreshing ? 'Refreshing...' : 'Refresh'}</span>
          </button>
        </div>
      </div>

      {/* Error State */}
      {!isLoading && error && (
        <div className="p-6 rounded-2xl bg-rose-50 border border-rose-200 text-center">
          <AlertCircle className="w-8 h-8 text-rose-500 mx-auto mb-2" />
          <h3 className="text-sm font-bold text-rose-900 mb-1">Failed to load system metrics</h3>
          <p className="text-xs text-rose-600 mb-3">{error}</p>
          <button
            onClick={() => loadSummary()}
            className="px-3.5 py-1.5 bg-rose-600 hover:bg-rose-700 text-white rounded-xl text-xs font-semibold shadow-xs transition-colors cursor-pointer"
          >
            Retry
          </button>
        </div>
      )}

      {/* Metrics Grid */}
      <div className="grid grid-cols-2 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {metricCards.map((card, idx) => {
          const Icon = card.icon
          return (
            <div
              key={idx}
              className="bg-white p-4 sm:p-5 rounded-2xl border border-slate-200/80 shadow-xs flex flex-col justify-between hover:border-slate-300 transition-all"
            >
              <div className="flex items-center justify-between">
                <span className="text-xs font-semibold text-slate-500">{card.title}</span>
                <div className={`w-8 h-8 rounded-xl flex items-center justify-center border ${card.bgColor}`}>
                  <Icon className={`w-4 h-4 ${card.color}`} />
                </div>
              </div>
              <div className="mt-4">
                <p className="text-2xl sm:text-3xl font-black text-slate-900 tracking-tight">
                  {isLoading ? '—' : card.value.toLocaleString()}
                </p>
                <p className="text-[11px] text-slate-400 mt-1 font-medium truncate">
                  {card.description}
                </p>
              </div>
            </div>
          )
        })}
      </div>

      {/* Analytics & System Monitoring Spotlight Banner */}
      <div className="bg-gradient-to-r from-purple-900 to-indigo-900 text-white rounded-2xl p-6 shadow-sm flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div className="space-y-1">
          <div className="flex items-center space-x-2 text-purple-300 text-xs font-bold uppercase tracking-wider">
            <TrendingUp className="w-4 h-4" />
            <span>Platform Intelligence & Adherence Insights</span>
          </div>
          <h3 className="text-lg font-bold text-white">System Analytics & Monitoring Center</h3>
          <p className="text-xs text-purple-200 max-w-xl">
            Inspect daily compliance trends, dose performance breakdowns, user registration growth rates, and notification delivery statistics.
          </p>
        </div>

        <Link
          to="/app/admin/analytics"
          className="inline-flex items-center space-x-2 px-4 py-2.5 rounded-xl bg-white hover:bg-purple-50 text-purple-900 text-xs font-bold shadow-sm transition-all self-start md:self-auto shrink-0"
        >
          <BarChart2 className="w-4 h-4" />
          <span>Launch Analytics Dashboard</span>
          <ArrowRight className="w-3.5 h-3.5" />
        </Link>
      </div>

      {/* Quick Access Management Directories */}
      <div className="space-y-4">
        <div className="flex items-center space-x-2">
          <Layers className="w-4 h-4 text-purple-600" />
          <h2 className="text-base font-bold text-slate-900">System Directories & Oversight</h2>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {quickNavItems.map((item, idx) => {
            const Icon = item.icon
            return (
              <Link
                key={idx}
                to={item.path}
                className="group bg-white p-5 rounded-2xl border border-slate-200/80 shadow-xs hover:border-purple-300 hover:shadow-sm transition-all flex flex-col justify-between"
              >
                <div>
                  <div className="flex items-center justify-between mb-3">
                    <div className="w-10 h-10 rounded-xl bg-purple-50 text-purple-600 flex items-center justify-center border border-purple-100 group-hover:bg-purple-600 group-hover:text-white transition-colors">
                      <Icon className="w-5 h-5" />
                    </div>
                    <span className={`text-xs font-bold px-2.5 py-0.5 rounded-full border ${item.badgeColor}`}>
                      {item.badge}
                    </span>
                  </div>

                  <h3 className="text-sm font-bold text-slate-900 group-hover:text-purple-700 transition-colors">
                    {item.title}
                  </h3>
                  <p className="text-xs text-slate-500 mt-1 leading-relaxed">
                    {item.description}
                  </p>
                </div>

                <div className="pt-4 mt-3 border-t border-slate-100 flex items-center justify-between text-xs font-bold text-purple-600 group-hover:text-purple-700">
                  <span>Open Directory</span>
                  <ArrowRight className="w-3.5 h-3.5 transform group-hover:translate-x-1 transition-transform" />
                </div>
              </Link>
            )
          })}
        </div>
      </div>

      {/* System Status Banner */}
      <div className="bg-slate-900 text-white rounded-2xl p-5 shadow-xs flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div className="flex items-center space-x-3.5">
          <div className="w-9 h-9 rounded-xl bg-emerald-500/20 border border-emerald-500/30 text-emerald-400 flex items-center justify-center shrink-0">
            <Activity className="w-5 h-5" />
          </div>
          <div>
            <div className="flex items-center space-x-2">
              <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse" />
              <h4 className="text-sm font-bold">PillSync System Health: Operational</h4>
            </div>
            <p className="text-xs text-slate-400 mt-0.5">
              Read-only administrative governance active. All scheduler and notification services are synchronized.
            </p>
          </div>
        </div>

        <div className="flex items-center space-x-2 shrink-0">
          <span className="text-[11px] font-semibold text-slate-400 bg-slate-800 px-3 py-1.5 rounded-xl border border-slate-700">
            Version 1.0 • Feature 16B
          </span>
        </div>
      </div>
    </div>
  )
}

export default AdminDashboardPage
