import React, { useState, useEffect, useCallback } from 'react'
import { Link } from 'react-router-dom'
import { useAuth } from '../../context/AuthContext'
import { caregiverService } from '../../services/caregiverService'
import { PatientCard } from '../../components/caregiver/PatientCard'
import {
  Users,
  AlertTriangle,
  Clock,
  CheckCircle2,
  XCircle,
  ArrowRight,
  RefreshCw,
  AlertCircle,
  HeartHandshake,
  Pill,
  TrendingDown,
  TrendingUp,
  Minus,
  Bell,
  Calendar,
  Info,
  ArrowUpRight,
  User,
  Sparkles,
  ShieldCheck,
} from 'lucide-react'

export const CaregiverDashboardPage = () => {
  const { user } = useAuth()

  const [summary, setSummary] = useState(null)
  const [patients, setPatients] = useState([])
  const [patientStats, setPatientStats] = useState({}) // { [patientId]: { dueCount, skippedCount, dueMeds: [], adherenceRate } }
  const [intelOverview, setIntelOverview] = useState([]) // List[CaregiverPatientAttentionOverview]
  const [recentAlerts, setRecentAlerts] = useState([])
  const [isLoading, setIsLoading] = useState(true)
  const [isRefreshing, setIsRefreshing] = useState(false)
  const [error, setError] = useState(null)

  const loadDashboard = useCallback(async (isSilent = false) => {
    if (isSilent) {
      setIsRefreshing(true)
    } else {
      setIsLoading(true)
    }
    setError(null)

    try {
      const [sumData, ptData, alertData, intelData] = await Promise.all([
        caregiverService.getDashboardSummary().catch(() => null),
        caregiverService.getPatients().catch(() => []),
        caregiverService.getNotifications({ limit: 4 }).catch(() => ({ items: [] })),
        caregiverService.getCaregiverIntelligenceOverview().catch(() => []),
      ])

      setSummary(sumData)
      const patientList = Array.isArray(ptData) ? ptData : []
      setPatients(patientList)
      setRecentAlerts(Array.isArray(alertData?.items) ? alertData.items : [])
      setIntelOverview(Array.isArray(intelData) ? intelData : [])

      // Fetch supplementary metrics for patients in parallel
      const statsMap = {}
      await Promise.all(
        patientList.map(async (p) => {
          try {
            const todayStr = new Date().toISOString().split('T')[0]
            const [dueDoses, adherence, todayDoses] = await Promise.all([
              caregiverService.getPatientRemindersDue(p.id).catch(() => []),
              caregiverService.getPatientAdherenceToday(p.id).catch(() => null),
              caregiverService.getPatientDoses(p.id, { targetDate: todayStr }).catch(() => []),
            ])

            const dueList = Array.isArray(dueDoses) ? dueDoses : []
            const doseList = Array.isArray(todayDoses) ? todayDoses : []
            const skipped = doseList.filter((d) => d.status === 'SKIPPED').length

            statsMap[p.id] = {
              dueCount: dueList.length,
              skippedCount: skipped,
              dueMeds: dueList.map((d) => d.custom_medicine_name || d.medicine_name || 'Medication').filter(Boolean),
              adherenceRate: adherence ? (adherence.adherence_percentage ?? adherence.adherence_rate ?? 0) : null,
            }
          } catch {
            statsMap[p.id] = { dueCount: 0, skippedCount: 0, dueMeds: [], adherenceRate: null }
          }
        })
      )
      setPatientStats(statsMap)
    } catch (err) {
      setError(err?.response?.data?.detail || 'Unable to load caregiver dashboard overview.')
    } finally {
      setIsLoading(false)
      setIsRefreshing(false)
    }
  }, [])

  useEffect(() => {
    loadDashboard()
  }, [loadDashboard])

  const totalPatients = summary?.total_patients ?? patients.length
  const dueDoses = summary?.due_doses ?? 0
  const upcomingDoses = summary?.upcoming_doses ?? 0
  const takenToday = summary?.taken_doses_today ?? 0
  const skippedToday = summary?.skipped_doses_today ?? 0

  // Derive patients requiring attention
  const attentionPatients = patients.filter((p) => {
    const stats = patientStats[p.id]
    if (!stats) return false
    const hasDue = stats.dueCount > 0
    const hasSkipped = stats.skippedCount > 0
    const hasLowAdherence = stats.adherenceRate !== null && stats.adherenceRate < 70
    return hasDue || hasSkipped || hasLowAdherence
  })

  // Helper for trend badge
  const renderTrendBadge = (trend) => {
    switch (trend) {
      case 'IMPROVING':
        return (
          <span className="inline-flex items-center gap-1 text-[11px] font-bold text-emerald-700 bg-emerald-50 px-2 py-0.5 rounded-full border border-emerald-200">
            <TrendingUp className="w-3 h-3" />
            <span>Improving</span>
          </span>
        )
      case 'DECLINING':
        return (
          <span className="inline-flex items-center gap-1 text-[11px] font-bold text-rose-700 bg-rose-50 px-2 py-0.5 rounded-full border border-rose-200">
            <TrendingDown className="w-3 h-3" />
            <span>Declining</span>
          </span>
        )
      case 'STABLE':
        return (
          <span className="inline-flex items-center gap-1 text-[11px] font-bold text-sky-700 bg-sky-50 px-2 py-0.5 rounded-full border border-sky-200">
            <Minus className="w-3 h-3" />
            <span>Stable</span>
          </span>
        )
      default:
        return (
          <span className="text-[11px] text-slate-400 font-medium">N/A</span>
        )
    }
  }

  return (
    <div className="space-y-7">
      {/* Welcome & Action Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <div className="flex items-center space-x-2.5">
            <h1 className="text-xl sm:text-2xl font-bold text-slate-900 tracking-tight">
              Caregiver Portal
            </h1>
            <span className="px-2.5 py-0.5 rounded-full text-xs font-bold bg-sky-50 text-sky-700 border border-sky-200">
              Monitoring Mode
            </span>
          </div>
          <p className="text-xs sm:text-sm text-slate-500 mt-1">
            Welcome back, {user?.first_name || 'Caregiver'}. Real-time medication adherence, pattern intelligence, and dose compliance monitoring.
          </p>
        </div>

        <div className="flex items-center space-x-2.5 self-start sm:self-auto">
          <button
            onClick={() => loadDashboard(true)}
            disabled={isLoading || isRefreshing}
            className="inline-flex items-center space-x-1.5 px-3.5 py-2 rounded-xl bg-white hover:bg-slate-50 text-slate-700 border border-slate-200 text-xs font-semibold shadow-2xs transition-all cursor-pointer disabled:opacity-50"
          >
            <RefreshCw className={`w-3.5 h-3.5 ${isRefreshing ? 'animate-spin text-sky-600' : ''}`} />
            <span>{isRefreshing ? 'Refreshing...' : 'Refresh'}</span>
          </button>

          <Link
            to="/app/caregiver/patients"
            className="inline-flex items-center space-x-1.5 px-4 py-2 rounded-xl bg-slate-900 hover:bg-slate-800 text-white text-xs font-semibold shadow-xs transition-colors cursor-pointer"
          >
            <Users className="w-3.5 h-3.5" />
            <span>All Patients ({patients.length})</span>
          </Link>
        </div>
      </div>

      {/* Error state */}
      {!isLoading && error && (
        <div className="p-6 rounded-2xl bg-rose-50 border border-rose-200 text-center">
          <AlertCircle className="w-8 h-8 text-rose-500 mx-auto mb-2" />
          <h3 className="text-sm font-bold text-rose-900 mb-1">Failed to load dashboard metrics</h3>
          <p className="text-xs text-rose-600 mb-3">{error}</p>
          <button
            onClick={() => loadDashboard()}
            className="px-3.5 py-1.5 bg-rose-600 hover:bg-rose-700 text-white rounded-xl text-xs font-semibold shadow-xs transition-colors cursor-pointer"
          >
            Retry
          </button>
        </div>
      )}

      {/* Metrics Grid */}
      <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-3.5">
        {/* Total Patients */}
        <div className="bg-white p-4 rounded-2xl border border-slate-200/80 shadow-xs flex flex-col justify-between">
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold text-slate-500">Linked Patients</span>
            <div className="w-7 h-7 rounded-lg bg-sky-50 text-sky-600 flex items-center justify-center">
              <Users className="w-4 h-4" />
            </div>
          </div>
          <p className="text-2xl font-black text-slate-900 mt-3">{isLoading ? '—' : totalPatients}</p>
        </div>

        {/* Needs Attention */}
        <div className="bg-white p-4 rounded-2xl border border-slate-200/80 shadow-xs flex flex-col justify-between">
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold text-slate-500">Needs Attention</span>
            <div
              className={`w-7 h-7 rounded-lg flex items-center justify-center ${
                attentionPatients.length > 0 ? 'bg-amber-50 text-amber-600' : 'bg-slate-50 text-slate-400'
              }`}
            >
              <AlertTriangle className="w-4 h-4" />
            </div>
          </div>
          <p
            className={`text-2xl font-black mt-3 ${
              attentionPatients.length > 0 ? 'text-amber-600' : 'text-slate-900'
            }`}
          >
            {isLoading ? '—' : attentionPatients.length}
          </p>
        </div>

        {/* Due Doses */}
        <div className="bg-white p-4 rounded-2xl border border-slate-200/80 shadow-xs flex flex-col justify-between">
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold text-slate-500">Due Now</span>
            <div
              className={`w-7 h-7 rounded-lg flex items-center justify-center ${
                dueDoses > 0 ? 'bg-amber-100 text-amber-700' : 'bg-slate-50 text-slate-400'
              }`}
            >
              <Clock className="w-4 h-4" />
            </div>
          </div>
          <p className={`text-2xl font-black mt-3 ${dueDoses > 0 ? 'text-amber-600' : 'text-slate-900'}`}>
            {isLoading ? '—' : dueDoses}
          </p>
        </div>

        {/* Upcoming in 24h */}
        <div className="bg-white p-4 rounded-2xl border border-slate-200/80 shadow-xs flex flex-col justify-between">
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold text-slate-500">Upcoming 24h</span>
            <div className="w-7 h-7 rounded-lg bg-teal-50 text-teal-600 flex items-center justify-center">
              <Pill className="w-4 h-4" />
            </div>
          </div>
          <p className="text-2xl font-black text-slate-900 mt-3">{isLoading ? '—' : upcomingDoses}</p>
        </div>

        {/* Taken Today */}
        <div className="bg-white p-4 rounded-2xl border border-slate-200/80 shadow-xs flex flex-col justify-between">
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold text-slate-500">Taken Today</span>
            <div className="w-7 h-7 rounded-lg bg-emerald-50 text-emerald-600 flex items-center justify-center">
              <CheckCircle2 className="w-4 h-4" />
            </div>
          </div>
          <p className="text-2xl font-black text-emerald-700 mt-3">{isLoading ? '—' : takenToday}</p>
        </div>

        {/* Skipped Today */}
        <div className="bg-white p-4 rounded-2xl border border-slate-200/80 shadow-xs flex flex-col justify-between">
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold text-slate-500">Skipped Today</span>
            <div
              className={`w-7 h-7 rounded-lg flex items-center justify-center ${
                skippedToday > 0 ? 'bg-rose-50 text-rose-600' : 'bg-slate-50 text-slate-400'
              }`}
            >
              <XCircle className="w-4 h-4" />
            </div>
          </div>
          <p className={`text-2xl font-black mt-3 ${skippedToday > 0 ? 'text-rose-600' : 'text-slate-900'}`}>
            {isLoading ? '—' : skippedToday}
          </p>
        </div>
      </div>

      {/* Feature 17F: Smart Medication Intelligence & Attention Overview */}
      {!isLoading && intelOverview.length > 0 && (
        <div className="bg-gradient-to-br from-indigo-900/5 via-sky-900/5 to-white rounded-2xl border border-sky-200/80 p-5 shadow-xs space-y-4">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
            <div className="flex items-center space-x-2">
              <div className="w-8 h-8 rounded-lg bg-gradient-to-tr from-sky-500 to-indigo-600 flex items-center justify-center text-white shadow-2xs">
                <Sparkles className="w-4 h-4" />
              </div>
              <div>
                <h2 className="text-base font-bold text-slate-900">
                  Smart Adherence & Attention Overview
                </h2>
                <p className="text-xs text-slate-500">
                  Real-time pattern tracking, 30-day velocity, and non-clinical care indicators
                </p>
              </div>
            </div>

            <div className="flex items-center space-x-2 text-xs text-sky-800 bg-sky-100/70 px-3 py-1 rounded-xl self-start sm:self-auto">
              <ShieldCheck className="w-3.5 h-3.5 text-sky-600 shrink-0" />
              <span className="font-semibold text-[11px]">Non-Clinical Monitoring</span>
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3.5">
            {intelOverview.map((item) => {
              const isHigh = item.attention_level === 'HIGH'
              const isMed = item.attention_level === 'MEDIUM'

              return (
                <div
                  key={item.patient_id}
                  className="bg-white rounded-xl border border-slate-200/80 p-4 shadow-2xs hover:shadow-sm transition-all flex flex-col justify-between space-y-3"
                >
                  <div>
                    <div className="flex items-center justify-between">
                      <h4 className="text-sm font-bold text-slate-900">{item.patient_name}</h4>
                      <span
                        className={`text-[10px] font-bold px-2 py-0.5 rounded-full border ${
                          isHigh
                            ? 'bg-rose-50 text-rose-700 border-rose-200'
                            : isMed
                            ? 'bg-amber-50 text-amber-800 border-amber-200'
                            : 'bg-emerald-50 text-emerald-700 border-emerald-200'
                        }`}
                      >
                        {item.attention_level} ATTENTION
                      </span>
                    </div>

                    {/* Adherence and Trend Bar */}
                    <div className="flex items-center justify-between mt-3 text-xs">
                      <span className="text-slate-500">Adherence (30d):</span>
                      <strong
                        className={`font-black ${
                          item.adherence_rate !== null && item.adherence_rate >= 80
                            ? 'text-emerald-700'
                            : item.adherence_rate !== null && item.adherence_rate >= 50
                            ? 'text-amber-700'
                            : item.adherence_rate !== null
                            ? 'text-rose-700'
                            : 'text-slate-700'
                        }`}
                      >
                        {item.adherence_rate !== null ? `${item.adherence_rate}%` : 'N/A'}
                      </strong>
                    </div>

                    <div className="flex items-center justify-between mt-1 text-xs">
                      <span className="text-slate-500">Adherence Trend:</span>
                      <div>{renderTrendBadge(item.trend_direction)}</div>
                    </div>

                    <div className="flex items-center justify-between mt-1 text-xs">
                      <span className="text-slate-500">Tracked Regimens:</span>
                      <span className="font-semibold text-slate-800">{item.active_medications_count}</span>
                    </div>
                  </div>

                  <div className="pt-2.5 border-t border-slate-100 flex items-center justify-between">
                    <span className="text-[11px] text-slate-400">
                      {item.missed_doses_recent_count} recent missed
                    </span>
                    <Link
                      to={`/app/caregiver/patients/${item.patient_id}`}
                      className="inline-flex items-center space-x-1 text-xs font-bold text-sky-600 hover:text-sky-700 cursor-pointer"
                    >
                      <Sparkles className="w-3 h-3 text-sky-500" />
                      <span>View Smart Insights</span>
                      <ArrowRight className="w-3 h-3" />
                    </Link>
                  </div>
                </div>
              )
            })}
          </div>
        </div>
      )}

      {/* Patients Needing Attention Section */}
      {!isLoading && attentionPatients.length > 0 && (
        <div className="bg-amber-50/60 border border-amber-200/90 rounded-2xl p-5 shadow-xs space-y-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center space-x-2 text-amber-900">
              <AlertTriangle className="w-5 h-5 text-amber-600 shrink-0" />
              <h2 className="text-sm sm:text-base font-bold">
                Patients Needing Attention ({attentionPatients.length})
              </h2>
            </div>
            <span className="text-[11px] font-semibold text-amber-800 bg-amber-100 px-2.5 py-0.5 rounded-full">
              Real-time Alert Status
            </span>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3.5">
            {attentionPatients.map((patient) => {
              const stats = patientStats[patient.id] || {}
              const hasDue = stats.dueCount > 0
              const hasSkipped = stats.skippedCount > 0
              const isLowAdherence = stats.adherenceRate !== null && stats.adherenceRate < 70

              return (
                <div
                  key={patient.id}
                  className="bg-white rounded-xl border border-amber-200 p-4 shadow-2xs hover:shadow-sm transition-all flex flex-col justify-between space-y-3"
                >
                  <div>
                    <div className="flex items-center justify-between">
                      <h4 className="text-sm font-bold text-slate-900">
                        {patient.first_name} {patient.last_name}
                      </h4>
                      <span className="text-[11px] font-semibold text-slate-500 bg-slate-100 px-2 py-0.5 rounded-md">
                        {patient.relationship_type || 'Patient'}
                      </span>
                    </div>

                    {/* Alert Reasons */}
                    <div className="flex items-center space-x-1.5 flex-wrap gap-y-1 mt-2.5">
                      {hasDue && (
                        <span className="inline-flex items-center px-2 py-0.5 rounded-md text-[10px] font-bold bg-amber-100 text-amber-800 border border-amber-300">
                          <AlertTriangle className="w-3 h-3 mr-1 text-amber-600" />
                          {stats.dueCount} {stats.dueCount === 1 ? 'Dose Due' : 'Doses Due'}
                        </span>
                      )}
                      {hasSkipped && (
                        <span className="inline-flex items-center px-2 py-0.5 rounded-md text-[10px] font-bold bg-rose-100 text-rose-800 border border-rose-300">
                          <XCircle className="w-3 h-3 mr-1 text-rose-600" />
                          {stats.skippedCount} Skipped Today
                        </span>
                      )}
                      {isLowAdherence && (
                        <span className="inline-flex items-center px-2 py-0.5 rounded-md text-[10px] font-bold bg-rose-50 text-rose-700 border border-rose-200">
                          <TrendingDown className="w-3 h-3 mr-1 text-rose-600" />
                          Low Adherence ({stats.adherenceRate}%)
                        </span>
                      )}
                    </div>

                    {/* Due Medication Names preview */}
                    {stats.dueMeds && stats.dueMeds.length > 0 && (
                      <p className="text-xs text-slate-600 mt-2 truncate">
                        <span className="font-semibold text-slate-700">Due:</span> {stats.dueMeds.slice(0, 2).join(', ')}
                        {stats.dueMeds.length > 2 && ` +${stats.dueMeds.length - 2} more`}
                      </p>
                    )}
                  </div>

                  <div className="pt-2 border-t border-slate-100 flex items-center justify-between">
                    <span className="text-[11px] text-slate-500">
                      Adherence: <strong className="text-slate-800">{stats.adherenceRate !== null ? `${stats.adherenceRate}%` : 'N/A'}</strong>
                    </span>
                    <Link
                      to={`/app/caregiver/patients/${patient.id}`}
                      className="inline-flex items-center space-x-1 text-xs font-bold text-sky-600 hover:text-sky-700 cursor-pointer"
                    >
                      <span>View Details</span>
                      <ArrowRight className="w-3 h-3" />
                    </Link>
                  </div>
                </div>
              )
            })}
          </div>
        </div>
      )}

      {/* Recent Alerts Section */}
      <div className="bg-white border border-slate-200/80 rounded-2xl p-5 shadow-xs space-y-3.5">
        <div className="flex items-center justify-between">
          <div className="flex items-center space-x-2">
            <Bell className="w-4 h-4 text-sky-600" />
            <h2 className="text-base font-bold text-slate-900">Recent Alerts</h2>
          </div>
          <Link
            to="/app/caregiver/notifications"
            className="text-xs font-bold text-sky-600 hover:text-sky-700 flex items-center space-x-1 cursor-pointer"
          >
            <span>View All Alerts</span>
            <ArrowRight className="w-3.5 h-3.5" />
          </Link>
        </div>

        {isLoading ? (
          <div className="space-y-2 animate-pulse">
            {[1, 2].map((i) => (
              <div key={i} className="h-14 bg-slate-100 rounded-xl" />
            ))}
          </div>
        ) : recentAlerts.length === 0 ? (
          <div className="py-6 text-center text-xs text-slate-400 font-medium">
            No recent alerts across your linked patients.
          </div>
        ) : (
          <div className="space-y-2.5">
            {recentAlerts.map((alert) => {
              const typeConfig = (() => {
                switch (alert.type) {
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
                  default:
                    return {
                      icon: Info,
                      color: 'text-slate-700',
                      bgColor: 'bg-slate-100 border-slate-200',
                      label: 'System notification',
                    }
                }
              })()
              const AlertIcon = typeConfig.icon

              return (
                <div
                  key={alert.id}
                  className={`flex flex-col sm:flex-row sm:items-center justify-between p-3 rounded-xl border transition-all gap-2 ${
                    !alert.is_read
                      ? 'bg-sky-50/30 border-sky-200'
                      : 'bg-slate-50/60 border-slate-200/70 hover:bg-slate-50'
                  }`}
                >
                  <div className="flex items-center space-x-3 min-w-0">
                    <div
                      className={`w-8 h-8 rounded-lg flex items-center justify-center shrink-0 border ${typeConfig.bgColor}`}
                    >
                      <AlertIcon className={`w-4 h-4 ${typeConfig.color}`} />
                    </div>

                    <div className="min-w-0 flex-1">
                      <div className="flex items-center space-x-2 flex-wrap">
                        <span
                          className={`text-[9px] font-bold px-1.5 py-0.2 rounded border uppercase tracking-wider ${typeConfig.bgColor} ${typeConfig.color}`}
                        >
                          {typeConfig.label}
                        </span>

                        {alert.patient_id ? (
                          <Link
                            to={`/app/caregiver/patients/${alert.patient_id}`}
                            className="inline-flex items-center space-x-1 text-[10px] font-bold text-sky-700 hover:text-sky-800 bg-white px-1.5 py-0.2 rounded border border-slate-200 hover:border-sky-300 transition-colors"
                          >
                            <User className="w-2.5 h-2.5 text-sky-600" />
                            <span>{alert.patient_name || 'Linked Patient'}</span>
                            <ArrowUpRight className="w-2.5 h-2.5 text-slate-400" />
                          </Link>
                        ) : (
                          alert.patient_name && (
                            <span className="text-[10px] font-bold text-slate-600 bg-white px-1.5 py-0.2 rounded border border-slate-200">
                              {alert.patient_name}
                            </span>
                          )
                        )}

                        {!alert.is_read && (
                          <span className="w-2 h-2 rounded-full bg-sky-500 shrink-0" title="Unread" />
                        )}
                      </div>

                      <p className="text-xs text-slate-800 font-semibold truncate mt-0.5">
                        {alert.title} — <span className="text-slate-500 font-normal">{alert.message}</span>
                      </p>
                    </div>
                  </div>

                  <div className="text-[11px] text-slate-400 font-medium shrink-0 self-end sm:self-center pl-11 sm:pl-0">
                    {alert.created_at ? new Date(alert.created_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }) : ''}
                  </div>
                </div>
              )
            })}
          </div>
        )}
      </div>

      {/* Linked Patients Overview Section */}
      <div className="space-y-4">
        <div className="flex items-center justify-between">
          <div className="flex items-center space-x-2">
            <Users className="w-4 h-4 text-sky-600" />
            <h2 className="text-base font-bold text-slate-900">Your Assigned Patients</h2>
          </div>
          {patients.length > 3 && (
            <Link
              to="/app/caregiver/patients"
              className="text-xs font-bold text-sky-600 hover:text-sky-700 flex items-center space-x-1 cursor-pointer"
            >
              <span>View All ({patients.length})</span>
              <ArrowRight className="w-3.5 h-3.5" />
            </Link>
          )}
        </div>

        {/* Loading skeleton for patient cards */}
        {isLoading && (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
            {[1, 2, 3].map((i) => (
              <div key={i} className="bg-white p-5 rounded-2xl border border-slate-200/80 animate-pulse space-y-4">
                <div className="flex items-center space-x-3">
                  <div className="w-11 h-11 bg-slate-200 rounded-2xl"></div>
                  <div className="space-y-2 flex-1">
                    <div className="h-4 bg-slate-200 rounded w-2/3"></div>
                    <div className="h-3 bg-slate-100 rounded w-1/3"></div>
                  </div>
                </div>
                <div className="h-16 bg-slate-50 rounded-xl"></div>
              </div>
            ))}
          </div>
        )}

        {/* Empty State */}
        {!isLoading && patients.length === 0 && (
          <div className="p-10 rounded-2xl bg-white border border-slate-200/80 text-center max-w-md mx-auto shadow-xs">
            <HeartHandshake className="w-10 h-10 text-slate-400 mx-auto mb-2" />
            <h3 className="text-sm font-bold text-slate-800 mb-1">No Assigned Patients Yet</h3>
            <p className="text-xs text-slate-500">
              When patients or administrators assign you as a caregiver, their medication adherence will be accessible here.
            </p>
          </div>
        )}

        {/* Patients Grid */}
        {!isLoading && patients.length > 0 && (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
            {patients.slice(0, 6).map((patient) => {
              const stats = patientStats[patient.id] || { dueCount: 0, skippedCount: 0, adherenceRate: null }
              return (
                <PatientCard
                  key={patient.id}
                  patient={patient}
                  dueCount={stats.dueCount}
                  skippedCount={stats.skippedCount}
                  adherenceRate={stats.adherenceRate}
                />
              )
            })}
          </div>
        )}
      </div>
    </div>
  )
}

export default CaregiverDashboardPage
