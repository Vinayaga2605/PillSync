import React, { useState, useEffect, useCallback } from 'react'
import { Link } from 'react-router-dom'
import { adminService } from '../../services/adminService'
import {
  TrendingUp,
  Users,
  HeartHandshake,
  Pill,
  Calendar,
  CheckCircle2,
  Bell,
  Link2,
  RefreshCw,
  AlertCircle,
  Activity,
  Server,
  Database,
  ArrowUpRight,
  BarChart3,
} from 'lucide-react'

export const AdminAnalyticsPage = () => {
  const [data, setData] = useState(null)
  const [days, setDays] = useState(30)
  const [isLoading, setIsLoading] = useState(true)
  const [isRefreshing, setIsRefreshing] = useState(false)
  const [error, setError] = useState(null)
  const [lastRefreshed, setLastRefreshed] = useState(new Date())

  const fetchAnalytics = useCallback(async (isBackground = false) => {
    if (isBackground) {
      setIsRefreshing(true)
    } else {
      setIsLoading(true)
    }
    setError(null)

    try {
      const res = await adminService.getAnalyticsSummary({ days })
      setData(res)
      setLastRefreshed(new Date())
    } catch (err) {
      console.error('Failed to load admin analytics:', err)
      setError(err?.response?.data?.detail || 'Failed to load system analytics. Please try again.')
    } finally {
      setIsLoading(false)
      setIsRefreshing(false)
    }
  }, [days])

  useEffect(() => {
    fetchAnalytics()
  }, [fetchAnalytics])

  const getAdherenceColor = (pct) => {
    if (pct >= 80) return 'text-emerald-600'
    if (pct >= 50) return 'text-amber-600'
    return 'text-rose-600'
  }

  const getAdherenceBg = (pct) => {
    if (pct >= 80) return 'bg-emerald-500'
    if (pct >= 50) return 'bg-amber-500'
    return 'bg-rose-500'
  }

  return (
    <div className="space-y-6">
      {/* Header & Controls */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <div className="flex items-center gap-2 text-sm text-slate-500 mb-1">
            <Link to="/app/admin/dashboard" className="hover:text-primary-600 transition-colors">
              Admin
            </Link>
            <span>/</span>
            <span className="text-slate-700 font-medium">Analytics & Monitoring</span>
          </div>
          <h1 className="text-2xl font-bold text-slate-900 tracking-tight flex items-center gap-2">
            <TrendingUp className="w-6 h-6 text-primary-600" />
            System Analytics & Monitoring
          </h1>
          <p className="text-sm text-slate-500 mt-1">
            Real-time aggregate performance indicators, adherence trends, and platform usage metrics.
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-3">
          {/* Timeframe Selector */}
          <div className="flex items-center bg-slate-100 p-1 rounded-xl border border-slate-200">
            {[
              { label: '7 Days', val: 7 },
              { label: '30 Days', val: 30 },
              { label: '90 Days', val: 90 },
            ].map((t) => (
              <button
                key={t.val}
                onClick={() => setDays(t.val)}
                className={`px-3 py-1.5 text-xs font-semibold rounded-lg transition-all ${
                  days === t.val
                    ? 'bg-white text-primary-700 shadow-sm'
                    : 'text-slate-600 hover:text-slate-900'
                }`}
              >
                {t.label}
              </button>
            ))}
          </div>

          <button
            onClick={() => fetchAnalytics(true)}
            disabled={isLoading || isRefreshing}
            className="inline-flex items-center gap-2 px-3.5 py-2 text-sm font-medium text-slate-700 bg-white border border-slate-300 rounded-xl hover:bg-slate-50 shadow-sm transition-colors cursor-pointer"
          >
            <RefreshCw className={`w-4 h-4 ${isRefreshing ? 'animate-spin text-primary-600' : ''}`} />
            <span>{isRefreshing ? 'Updating...' : 'Refresh'}</span>
          </button>
        </div>
      </div>

      {/* Error state */}
      {error && (
        <div className="bg-rose-50 border border-rose-200 rounded-2xl p-6 text-center space-y-3">
          <AlertCircle className="w-8 h-8 text-rose-600 mx-auto" />
          <p className="text-sm font-medium text-rose-900">{error}</p>
          <button
            onClick={() => fetchAnalytics()}
            className="inline-flex items-center gap-2 px-4 py-2 text-xs font-semibold text-rose-700 bg-white border border-rose-300 rounded-xl hover:bg-rose-50 cursor-pointer shadow-xs"
          >
            <RefreshCw className="w-3.5 h-3.5" />
            Try Again
          </button>
        </div>
      )}

      {/* Loading Skeleton */}
      {isLoading ? (
        <div className="space-y-6">
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
            {[...Array(4)].map((_, i) => (
              <div key={i} className="h-28 bg-white border border-slate-200/80 rounded-2xl animate-pulse p-5">
                <div className="w-8 h-8 bg-slate-100 rounded-xl mb-3"></div>
                <div className="w-20 h-4 bg-slate-100 rounded"></div>
              </div>
            ))}
          </div>
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            <div className="h-72 bg-white border border-slate-200/80 rounded-2xl animate-pulse p-6"></div>
            <div className="h-72 bg-white border border-slate-200/80 rounded-2xl animate-pulse p-6"></div>
          </div>
        </div>
      ) : data ? (
        <div className="space-y-6">
          {/* Top Level Summary Cards */}
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
            <div className="bg-white border border-slate-200/80 rounded-2xl p-5 shadow-xs">
              <div className="flex items-center justify-between text-slate-500 mb-2">
                <span className="text-xs font-semibold uppercase tracking-wider">Total Users</span>
                <div className="w-8 h-8 rounded-xl bg-purple-50 text-purple-600 flex items-center justify-center">
                  <Users className="w-4 h-4" />
                </div>
              </div>
              <div className="text-2xl font-bold text-slate-900">{data.overview.total_users}</div>
              <p className="text-xs text-slate-400 mt-1">
                {data.users.new_users_today} registered today
              </p>
            </div>

            <div className="bg-white border border-slate-200/80 rounded-2xl p-5 shadow-xs">
              <div className="flex items-center justify-between text-slate-500 mb-2">
                <span className="text-xs font-semibold uppercase tracking-wider">Overall Adherence</span>
                <div className="w-8 h-8 rounded-xl bg-emerald-50 text-emerald-600 flex items-center justify-center">
                  <Activity className="w-4 h-4" />
                </div>
              </div>
              <div className={`text-2xl font-bold ${getAdherenceColor(data.doses.adherence_percentage)}`}>
                {data.doses.adherence_percentage.toFixed(1)}%
              </div>
              <p className="text-xs text-slate-400 mt-1">
                {data.doses.taken_doses} of {data.doses.completed_trackable_doses} trackable doses
              </p>
            </div>

            <div className="bg-white border border-slate-200/80 rounded-2xl p-5 shadow-xs">
              <div className="flex items-center justify-between text-slate-500 mb-2">
                <span className="text-xs font-semibold uppercase tracking-wider">Active Meds</span>
                <div className="w-8 h-8 rounded-xl bg-teal-50 text-teal-600 flex items-center justify-center">
                  <Pill className="w-4 h-4" />
                </div>
              </div>
              <div className="text-2xl font-bold text-slate-900">{data.medications.active_medications}</div>
              <p className="text-xs text-slate-400 mt-1">
                Across {data.medications.active_schedules} active schedules
              </p>
            </div>

            <div className="bg-white border border-slate-200/80 rounded-2xl p-5 shadow-xs">
              <div className="flex items-center justify-between text-slate-500 mb-2">
                <span className="text-xs font-semibold uppercase tracking-wider">Active Links</span>
                <div className="w-8 h-8 rounded-xl bg-sky-50 text-sky-600 flex items-center justify-center">
                  <Link2 className="w-4 h-4" />
                </div>
              </div>
              <div className="text-2xl font-bold text-slate-900">{data.overview.active_relationships}</div>
              <p className="text-xs text-slate-400 mt-1">
                {data.relationships.caregivers_with_patients} active caregivers
              </p>
            </div>
          </div>

          {/* Row 2: Dose Performance & Adherence Trend */}
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
            {/* Dose Performance Card */}
            <div className="lg:col-span-5 bg-white border border-slate-200/80 rounded-2xl p-6 shadow-xs flex flex-col justify-between">
              <div>
                <div className="flex items-center justify-between mb-4">
                  <h2 className="text-base font-bold text-slate-900 flex items-center gap-2">
                    <CheckCircle2 className="w-5 h-5 text-emerald-600" />
                    Dose Performance Breakdown
                  </h2>
                  <span className="text-xs font-medium text-slate-400">Lifetime</span>
                </div>

                <div className="space-y-4">
                  <div>
                    <div className="flex justify-between text-sm font-semibold mb-1">
                      <span className="text-slate-700 flex items-center gap-1.5">
                        <span className="w-2.5 h-2.5 rounded-full bg-emerald-500"></span>
                        Taken Doses
                      </span>
                      <span className="text-emerald-700">
                        {data.doses.taken_doses}{' '}
                        <span className="text-xs font-normal text-slate-400">
                          ({data.doses.total_doses > 0 ? ((data.doses.taken_doses / data.doses.total_doses) * 100).toFixed(1) : 0}%)
                        </span>
                      </span>
                    </div>
                    <div className="w-full h-2.5 bg-slate-100 rounded-full overflow-hidden">
                      <div
                        className="h-full bg-emerald-500 rounded-full transition-all duration-500"
                        style={{
                          width: `${data.doses.total_doses > 0 ? (data.doses.taken_doses / data.doses.total_doses) * 100 : 0}%`,
                        }}
                      ></div>
                    </div>
                  </div>

                  <div>
                    <div className="flex justify-between text-sm font-semibold mb-1">
                      <span className="text-slate-700 flex items-center gap-1.5">
                        <span className="w-2.5 h-2.5 rounded-full bg-rose-500"></span>
                        Skipped Doses
                      </span>
                      <span className="text-rose-700">
                        {data.doses.skipped_doses}{' '}
                        <span className="text-xs font-normal text-slate-400">
                          ({data.doses.total_doses > 0 ? ((data.doses.skipped_doses / data.doses.total_doses) * 100).toFixed(1) : 0}%)
                        </span>
                      </span>
                    </div>
                    <div className="w-full h-2.5 bg-slate-100 rounded-full overflow-hidden">
                      <div
                        className="h-full bg-rose-500 rounded-full transition-all duration-500"
                        style={{
                          width: `${data.doses.total_doses > 0 ? (data.doses.skipped_doses / data.doses.total_doses) * 100 : 0}%`,
                        }}
                      ></div>
                    </div>
                  </div>

                  <div>
                    <div className="flex justify-between text-sm font-semibold mb-1">
                      <span className="text-slate-700 flex items-center gap-1.5">
                        <span className="w-2.5 h-2.5 rounded-full bg-amber-400"></span>
                        Pending Doses
                      </span>
                      <span className="text-amber-700">
                        {data.doses.pending_doses}{' '}
                        <span className="text-xs font-normal text-slate-400">
                          ({data.doses.total_doses > 0 ? ((data.doses.pending_doses / data.doses.total_doses) * 100).toFixed(1) : 0}%)
                        </span>
                      </span>
                    </div>
                    <div className="w-full h-2.5 bg-slate-100 rounded-full overflow-hidden">
                      <div
                        className="h-full bg-amber-400 rounded-full transition-all duration-500"
                        style={{
                          width: `${data.doses.total_doses > 0 ? (data.doses.pending_doses / data.doses.total_doses) * 100 : 0}%`,
                        }}
                      ></div>
                    </div>
                  </div>
                </div>
              </div>

              <div className="mt-6 p-4 rounded-xl bg-slate-50 border border-slate-200/80 flex items-center justify-between text-xs">
                <span className="text-slate-500">Adherence Metric:</span>
                <span className="font-semibold text-slate-700">
                  Taken ÷ (Taken + Skipped) = {data.doses.adherence_percentage.toFixed(1)}%
                </span>
              </div>
            </div>

            {/* Adherence Daily Trend Card */}
            <div className="lg:col-span-7 bg-white border border-slate-200/80 rounded-2xl p-6 shadow-xs">
              <div className="flex items-center justify-between mb-4">
                <div>
                  <h2 className="text-base font-bold text-slate-900 flex items-center gap-2">
                    <BarChart3 className="w-5 h-5 text-primary-600" />
                    Daily Adherence Trend
                  </h2>
                  <p className="text-xs text-slate-400 mt-0.5">
                    Past {days} days daily intake compliance rate
                  </p>
                </div>
                <span className="text-xs font-semibold px-2.5 py-1 bg-primary-50 text-primary-700 rounded-lg">
                  {days} Days Window
                </span>
              </div>

              {data.adherence_trend.length === 0 ? (
                <div className="h-52 flex flex-col items-center justify-center text-center p-6 text-slate-400 border border-dashed border-slate-200 rounded-xl">
                  <Calendar className="w-8 h-8 text-slate-300 mb-2" />
                  <p className="text-sm font-semibold text-slate-600">No dose records in this window</p>
                  <p className="text-xs text-slate-400 mt-0.5">
                    Dose logs generated during this timeframe will appear here automatically.
                  </p>
                </div>
              ) : (
                <div className="space-y-4">
                  {/* Visual Bar Chart */}
                  <div className="h-44 flex items-end gap-1.5 pt-4 pb-2 px-1 overflow-x-auto border-b border-slate-100">
                    {data.adherence_trend.map((point, idx) => (
                      <div
                        key={idx}
                        className="flex-1 min-w-[28px] max-w-[48px] flex flex-col items-center gap-1.5 group relative"
                      >
                        {/* Hover Tooltip */}
                        <div className="opacity-0 group-hover:opacity-100 transition-opacity absolute -top-14 z-20 pointer-events-none bg-slate-900 text-white text-[10px] px-2 py-1.5 rounded-lg shadow-lg whitespace-nowrap">
                          <p className="font-bold">{point.date}</p>
                          <p>
                            {point.taken} Taken • {point.skipped} Skipped ({point.adherence_percentage}%)
                          </p>
                        </div>

                        {/* Bar */}
                        <div className="w-full bg-slate-100 rounded-t-md h-32 flex items-end overflow-hidden p-0.5">
                          <div
                            className={`w-full rounded-t-sm transition-all duration-300 ${getAdherenceBg(
                              point.adherence_percentage
                            )}`}
                            style={{
                              height: `${Math.max(8, point.adherence_percentage)}%`,
                            }}
                          ></div>
                        </div>

                        {/* Date Label */}
                        <span className="text-[10px] text-slate-400 font-medium truncate w-full text-center">
                          {point.date.slice(5)}
                        </span>
                      </div>
                    ))}
                  </div>

                  <div className="flex items-center justify-between text-xs text-slate-500 pt-1">
                    <span className="flex items-center gap-1.5">
                      <span className="w-2.5 h-2.5 rounded-full bg-emerald-500"></span> High (≥80%)
                    </span>
                    <span className="flex items-center gap-1.5">
                      <span className="w-2.5 h-2.5 rounded-full bg-amber-500"></span> Moderate (50-79%)
                    </span>
                    <span className="flex items-center gap-1.5">
                      <span className="w-2.5 h-2.5 rounded-full bg-rose-500"></span> Low (&lt;50%)
                    </span>
                  </div>
                </div>
              )}
            </div>
          </div>

          {/* Row 3: User Growth & Notification Analytics */}
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            {/* User Distribution & Growth */}
            <div className="bg-white border border-slate-200/80 rounded-2xl p-6 shadow-xs">
              <div className="flex items-center justify-between mb-4">
                <h2 className="text-base font-bold text-slate-900 flex items-center gap-2">
                  <Users className="w-5 h-5 text-purple-600" />
                  User Demographics & Growth
                </h2>
                <Link
                  to="/app/admin/users"
                  className="text-xs font-semibold text-primary-600 hover:text-primary-700 inline-flex items-center gap-1"
                >
                  Manage Users <ArrowUpRight className="w-3.5 h-3.5" />
                </Link>
              </div>

              <div className="grid grid-cols-3 gap-3 mb-5">
                <div className="p-3 bg-purple-50/60 border border-purple-100 rounded-xl text-center">
                  <span className="text-xs font-semibold text-purple-700">Patients</span>
                  <p className="text-lg font-bold text-purple-950 mt-0.5">{data.users.patients}</p>
                </div>
                <div className="p-3 bg-teal-50/60 border border-teal-100 rounded-xl text-center">
                  <span className="text-xs font-semibold text-teal-700">Caregivers</span>
                  <p className="text-lg font-bold text-teal-950 mt-0.5">{data.users.caregivers}</p>
                </div>
                <div className="p-3 bg-indigo-50/60 border border-indigo-100 rounded-xl text-center">
                  <span className="text-xs font-semibold text-indigo-700">Admins</span>
                  <p className="text-lg font-bold text-indigo-950 mt-0.5">{data.users.admins}</p>
                </div>
              </div>

              <div className="space-y-3 text-sm">
                <div className="flex items-center justify-between py-2 border-b border-slate-100">
                  <span className="text-slate-600">Active Account Status</span>
                  <span className="font-semibold text-emerald-600">
                    {data.users.active_users} active / {data.users.inactive_users} inactive
                  </span>
                </div>
                <div className="flex items-center justify-between py-2 border-b border-slate-100">
                  <span className="text-slate-600">New Registrations Today</span>
                  <span className="font-semibold text-slate-800">+{data.users.new_users_today}</span>
                </div>
                <div className="flex items-center justify-between py-2 border-b border-slate-100">
                  <span className="text-slate-600">New Registrations (Last 7 Days)</span>
                  <span className="font-semibold text-slate-800">+{data.users.new_users_last_7_days}</span>
                </div>
                <div className="flex items-center justify-between py-2">
                  <span className="text-slate-600">New Registrations (Last 30 Days)</span>
                  <span className="font-semibold text-slate-800">+{data.users.new_users_last_30_days}</span>
                </div>
              </div>
            </div>

            {/* Notification Activity */}
            <div className="bg-white border border-slate-200/80 rounded-2xl p-6 shadow-xs">
              <div className="flex items-center justify-between mb-4">
                <h2 className="text-base font-bold text-slate-900 flex items-center gap-2">
                  <Bell className="w-5 h-5 text-amber-500" />
                  Notification Center Analytics
                </h2>
                <span className="text-xs font-semibold px-2.5 py-1 bg-amber-50 text-amber-800 rounded-lg">
                  {data.notifications.total_notifications} Dispatched
                </span>
              </div>

              <div className="grid grid-cols-2 gap-3 mb-5">
                <div className="p-3 bg-emerald-50/60 border border-emerald-100 rounded-xl text-center">
                  <span className="text-xs font-semibold text-emerald-700">Read Alerts</span>
                  <p className="text-lg font-bold text-emerald-950 mt-0.5">{data.notifications.read_notifications}</p>
                </div>
                <div className="p-3 bg-amber-50/60 border border-amber-100 rounded-xl text-center">
                  <span className="text-xs font-semibold text-amber-700">Unread Alerts</span>
                  <p className="text-lg font-bold text-amber-950 mt-0.5">{data.notifications.unread_notifications}</p>
                </div>
              </div>

              <div className="space-y-3 text-sm">
                <div className="flex items-center justify-between py-2 border-b border-slate-100">
                  <span className="text-slate-600 flex items-center gap-2">
                    <span className="w-2 h-2 rounded-full bg-teal-500"></span> Medication Due Alerts
                  </span>
                  <span className="font-semibold text-slate-800">{data.notifications.by_type.MEDICATION_DUE || 0}</span>
                </div>
                <div className="flex items-center justify-between py-2 border-b border-slate-100">
                  <span className="text-slate-600 flex items-center gap-2">
                    <span className="w-2 h-2 rounded-full bg-sky-500"></span> Upcoming Dose Alerts
                  </span>
                  <span className="font-semibold text-slate-800">{data.notifications.by_type.MEDICATION_UPCOMING || 0}</span>
                </div>
                <div className="flex items-center justify-between py-2 border-b border-slate-100">
                  <span className="text-slate-600 flex items-center gap-2">
                    <span className="w-2 h-2 rounded-full bg-rose-500"></span> Missed Dose Alerts
                  </span>
                  <span className="font-semibold text-slate-800">{data.notifications.by_type.MISSED_DOSE || 0}</span>
                </div>
                <div className="flex items-center justify-between py-2">
                  <span className="text-slate-600 flex items-center gap-2">
                    <span className="w-2 h-2 rounded-full bg-purple-500"></span> System Announcements
                  </span>
                  <span className="font-semibold text-slate-800">{data.notifications.by_type.SYSTEM || 0}</span>
                </div>
              </div>
            </div>
          </div>

          {/* Row 4: Caregiver Network & System Health */}
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            {/* Caregiver Network */}
            <div className="bg-white border border-slate-200/80 rounded-2xl p-6 shadow-xs">
              <div className="flex items-center justify-between mb-4">
                <h2 className="text-base font-bold text-slate-900 flex items-center gap-2">
                  <HeartHandshake className="w-5 h-5 text-teal-600" />
                  Caregiver Network Distribution
                </h2>
                <Link
                  to="/app/admin/relationships"
                  className="text-xs font-semibold text-primary-600 hover:text-primary-700 inline-flex items-center gap-1"
                >
                  Audit Network <ArrowUpRight className="w-3.5 h-3.5" />
                </Link>
              </div>

              <div className="space-y-3 text-sm">
                <div className="flex items-center justify-between py-2 border-b border-slate-100">
                  <span className="text-slate-600">Total Relationships</span>
                  <span className="font-semibold text-slate-800">{data.relationships.total_relationships}</span>
                </div>
                <div className="flex items-center justify-between py-2 border-b border-slate-100">
                  <span className="text-slate-600">Active Links</span>
                  <span className="font-semibold text-emerald-600">{data.relationships.active_relationships} active</span>
                </div>
                <div className="flex items-center justify-between py-2 border-b border-slate-100">
                  <span className="text-slate-600">Caregivers with Linked Patients</span>
                  <span className="font-semibold text-slate-800">
                    {data.relationships.caregivers_with_patients} / {data.users.caregivers} caregivers
                  </span>
                </div>
                <div className="flex items-center justify-between py-2">
                  <span className="text-slate-600">Patients with Active Caregivers</span>
                  <span className="font-semibold text-slate-800">
                    {data.relationships.patients_with_caregivers} / {data.users.patients} patients
                  </span>
                </div>
              </div>
            </div>

            {/* System Health */}
            <div className="bg-white border border-slate-200/80 rounded-2xl p-6 shadow-xs">
              <div className="flex items-center justify-between mb-4">
                <h2 className="text-base font-bold text-slate-900 flex items-center gap-2">
                  <Server className="w-5 h-5 text-primary-600" />
                  Infrastructure & System Health
                </h2>
                <span className="text-xs text-slate-400">
                  Synced: {lastRefreshed.toLocaleTimeString()}
                </span>
              </div>

              <div className="grid grid-cols-2 gap-3 mb-5">
                <div className="p-4 bg-emerald-50/60 border border-emerald-200 rounded-xl flex items-center gap-3">
                  <div className="w-9 h-9 rounded-lg bg-emerald-100 text-emerald-700 flex items-center justify-center flex-shrink-0">
                    <Server className="w-4 h-4" />
                  </div>
                  <div>
                    <span className="text-xs text-slate-500 font-medium">FastAPI Engine</span>
                    <p className="text-sm font-bold text-emerald-800 capitalize">
                      {data.system_health.api_status}
                    </p>
                  </div>
                </div>

                <div className="p-4 bg-emerald-50/60 border border-emerald-200 rounded-xl flex items-center gap-3">
                  <div className="w-9 h-9 rounded-lg bg-emerald-100 text-emerald-700 flex items-center justify-center flex-shrink-0">
                    <Database className="w-4 h-4" />
                  </div>
                  <div>
                    <span className="text-xs text-slate-500 font-medium">PostgreSQL</span>
                    <p className="text-sm font-bold text-emerald-800 capitalize">
                      {data.system_health.database_status}
                    </p>
                  </div>
                </div>
              </div>

              <div className="p-3.5 rounded-xl bg-slate-50 border border-slate-200/80 flex items-center gap-2.5 text-xs text-slate-600">
                <CheckCircle2 className="w-4 h-4 text-emerald-600 flex-shrink-0" />
                <span>All core system daemons, notification schedulers, and background services are running normally.</span>
              </div>
            </div>
          </div>
        </div>
      ) : null}
    </div>
  )
}

export default AdminAnalyticsPage
