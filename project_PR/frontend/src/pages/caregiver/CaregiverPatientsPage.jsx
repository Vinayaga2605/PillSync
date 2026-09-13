import React, { useState, useEffect, useCallback } from 'react'
import { caregiverService } from '../../services/caregiverService'
import { PatientCard } from '../../components/caregiver/PatientCard'
import {
  Search,
  RefreshCw,
  AlertCircle,
  HeartHandshake,
  Filter,
  AlertTriangle,
  CheckCircle2,
} from 'lucide-react'

export const CaregiverPatientsPage = () => {
  const [patients, setPatients] = useState([])
  const [patientStats, setPatientStats] = useState({}) // { [patientId]: { dueCount, skippedCount, adherenceRate } }
  const [isLoading, setIsLoading] = useState(true)
  const [isRefreshing, setIsRefreshing] = useState(false)
  const [error, setError] = useState(null)

  // Filters
  const [searchQuery, setSearchQuery] = useState('')
  const [relationshipFilter, setRelationshipFilter] = useState('ALL')
  const [attentionFilter, setAttentionFilter] = useState('ALL') // 'ALL' | 'NEEDS_ATTENTION' | 'ON_TRACK'

  const fetchPatients = useCallback(async (isSilent = false) => {
    if (isSilent) {
      setIsRefreshing(true)
    } else {
      setIsLoading(true)
    }
    setError(null)

    try {
      const data = await caregiverService.getPatients()
      const patientList = Array.isArray(data) ? data : []
      setPatients(patientList)

      // Fetch supplementary stats for each patient concurrently
      const statsMap = {}
      const todayStr = new Date().toISOString().split('T')[0]

      await Promise.all(
        patientList.map(async (p) => {
          try {
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
              adherenceRate: adherence ? (adherence.adherence_percentage ?? adherence.adherence_rate ?? 0) : null,
            }
          } catch {
            statsMap[p.id] = { dueCount: 0, skippedCount: 0, adherenceRate: null }
          }
        })
      )
      setPatientStats(statsMap)
    } catch (err) {
      setError(err?.response?.data?.detail || 'Unable to retrieve linked patients at this time.')
    } finally {
      setIsLoading(false)
      setIsRefreshing(false)
    }
  }, [])

  useEffect(() => {
    fetchPatients()
  }, [fetchPatients])

  // Compute unique relationships for filter dropdown
  const uniqueRelationships = Array.from(
    new Set(patients.map((p) => p.relationship_type).filter(Boolean))
  )

  // Filtered patients
  const filteredPatients = patients.filter((p) => {
    const fullName = `${p.first_name || ''} ${p.last_name || ''}`.toLowerCase()
    const email = (p.email || '').toLowerCase()
    const query = searchQuery.toLowerCase().trim()

    const matchesQuery = !query || fullName.includes(query) || email.includes(query)
    const matchesRel =
      relationshipFilter === 'ALL' ||
      (p.relationship_type && p.relationship_type.toLowerCase() === relationshipFilter.toLowerCase())

    const stats = patientStats[p.id] || { dueCount: 0, skippedCount: 0, adherenceRate: null }
    const needsAttention =
      stats.dueCount > 0 || stats.skippedCount > 0 || (stats.adherenceRate !== null && stats.adherenceRate < 70)

    let matchesAttention = true
    if (attentionFilter === 'NEEDS_ATTENTION') {
      matchesAttention = needsAttention
    } else if (attentionFilter === 'ON_TRACK') {
      matchesAttention = !needsAttention
    }

    return matchesQuery && matchesRel && matchesAttention
  })

  // Count of attention patients
  const totalNeedingAttention = patients.filter((p) => {
    const stats = patientStats[p.id] || {}
    return stats.dueCount > 0 || stats.skippedCount > 0 || (stats.adherenceRate !== null && stats.adherenceRate < 70)
  }).length

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <div className="flex items-center space-x-2.5">
            <h1 className="text-xl sm:text-2xl font-bold text-slate-900 tracking-tight">Linked Patients</h1>
            <span className="px-2.5 py-0.5 rounded-full text-xs font-bold bg-sky-50 text-sky-700 border border-sky-200">
              {patients.length} {patients.length === 1 ? 'Patient' : 'Patients'}
            </span>
          </div>
          <p className="text-xs sm:text-sm text-slate-500 mt-1">
            Monitor medication adherence, active schedules, and upcoming doses for your assigned patients.
          </p>
        </div>

        <button
          onClick={() => fetchPatients(true)}
          disabled={isLoading || isRefreshing}
          className="inline-flex items-center space-x-2 px-4 py-2 rounded-xl bg-white hover:bg-slate-50 text-slate-700 border border-slate-200 text-xs font-semibold shadow-2xs transition-all cursor-pointer disabled:opacity-50 self-start sm:self-auto"
        >
          <RefreshCw className={`w-3.5 h-3.5 ${isRefreshing ? 'animate-spin text-sky-600' : ''}`} />
          <span>{isRefreshing ? 'Refreshing...' : 'Refresh List'}</span>
        </button>
      </div>

      {/* Search & Filter Bar */}
      <div className="bg-white p-4 rounded-2xl border border-slate-200/80 shadow-xs flex flex-col lg:flex-row items-stretch lg:items-center justify-between gap-3">
        {/* Search Input */}
        <div className="relative flex-1">
          <Search className="w-4 h-4 text-slate-400 absolute left-3.5 top-1/2 -translate-y-1/2" />
          <input
            type="text"
            placeholder="Search patient by name or email..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full pl-9 pr-4 py-2 bg-slate-50 border border-slate-200/80 rounded-xl text-xs text-slate-800 placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-sky-500/20 focus:border-sky-500 transition-all"
          />
        </div>

        {/* Attention Filter Pill Selector */}
        <div className="flex items-center space-x-1.5 bg-slate-100/80 p-1 rounded-xl border border-slate-200/80 text-xs">
          <button
            onClick={() => setAttentionFilter('ALL')}
            className={`px-3 py-1.5 rounded-lg font-semibold transition-all cursor-pointer ${
              attentionFilter === 'ALL' ? 'bg-white text-slate-900 shadow-2xs' : 'text-slate-600 hover:text-slate-900'
            }`}
          >
            All ({patients.length})
          </button>
          <button
            onClick={() => setAttentionFilter('NEEDS_ATTENTION')}
            className={`flex items-center space-x-1 px-3 py-1.5 rounded-lg font-semibold transition-all cursor-pointer ${
              attentionFilter === 'NEEDS_ATTENTION'
                ? 'bg-amber-100 text-amber-900 shadow-2xs'
                : 'text-amber-700 hover:text-amber-900'
            }`}
          >
            <AlertTriangle className="w-3 h-3 text-amber-600" />
            <span>Needs Attention ({totalNeedingAttention})</span>
          </button>
          <button
            onClick={() => setAttentionFilter('ON_TRACK')}
            className={`flex items-center space-x-1 px-3 py-1.5 rounded-lg font-semibold transition-all cursor-pointer ${
              attentionFilter === 'ON_TRACK'
                ? 'bg-emerald-100 text-emerald-900 shadow-2xs'
                : 'text-emerald-700 hover:text-emerald-900'
            }`}
          >
            <CheckCircle2 className="w-3 h-3 text-emerald-600" />
            <span>On Track ({Math.max(0, patients.length - totalNeedingAttention)})</span>
          </button>
        </div>

        {/* Relationship Filter */}
        {uniqueRelationships.length > 0 && (
          <div className="flex items-center space-x-2 shrink-0">
            <Filter className="w-3.5 h-3.5 text-slate-400 shrink-0" />
            <select
              value={relationshipFilter}
              onChange={(e) => setRelationshipFilter(e.target.value)}
              className="px-3 py-2 bg-slate-50 border border-slate-200/80 rounded-xl text-xs font-medium text-slate-700 focus:outline-none cursor-pointer"
            >
              <option value="ALL">All Relationships</option>
              {uniqueRelationships.map((rel) => (
                <option key={rel} value={rel}>
                  {rel}
                </option>
              ))}
            </select>
          </div>
        )}
      </div>

      {/* Loading Skeleton */}
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
              <div className="h-9 bg-slate-100 rounded-xl"></div>
            </div>
          ))}
        </div>
      )}

      {/* Error State */}
      {!isLoading && error && (
        <div className="p-8 rounded-2xl bg-rose-50 border border-rose-200 text-center max-w-lg mx-auto">
          <AlertCircle className="w-10 h-10 text-rose-500 mx-auto mb-2" />
          <h3 className="text-sm font-bold text-rose-900 mb-1">Failed to load linked patients</h3>
          <p className="text-xs text-rose-600 mb-4">{error}</p>
          <button
            onClick={() => fetchPatients()}
            className="px-4 py-2 bg-rose-600 hover:bg-rose-700 text-white rounded-xl text-xs font-semibold shadow-xs transition-colors cursor-pointer"
          >
            Try Again
          </button>
        </div>
      )}

      {/* Empty State */}
      {!isLoading && !error && filteredPatients.length === 0 && (
        <div className="p-12 rounded-2xl bg-white border border-slate-200/80 text-center max-w-md mx-auto shadow-xs">
          <div className="w-12 h-12 rounded-2xl bg-sky-50 text-sky-600 flex items-center justify-center mx-auto mb-3">
            <HeartHandshake className="w-6 h-6" />
          </div>
          <h3 className="text-base font-bold text-slate-800 mb-1">
            {searchQuery || relationshipFilter !== 'ALL' || attentionFilter !== 'ALL'
              ? 'No Matching Patients Found'
              : 'No Linked Patients'}
          </h3>
          <p className="text-xs text-slate-500 mb-4">
            {searchQuery || relationshipFilter !== 'ALL' || attentionFilter !== 'ALL'
              ? 'No assigned patients match your active search and filter criteria.'
              : 'You do not have any active patients linked to your caregiver account yet.'}
          </p>
          {(searchQuery || relationshipFilter !== 'ALL' || attentionFilter !== 'ALL') && (
            <button
              onClick={() => {
                setSearchQuery('')
                setRelationshipFilter('ALL')
                setAttentionFilter('ALL')
              }}
              className="text-xs font-semibold text-sky-600 hover:text-sky-700 underline cursor-pointer"
            >
              Reset all filters
            </button>
          )}
        </div>
      )}

      {/* Patients Grid */}
      {!isLoading && !error && filteredPatients.length > 0 && (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
          {filteredPatients.map((patient) => {
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
  )
}

export default CaregiverPatientsPage
