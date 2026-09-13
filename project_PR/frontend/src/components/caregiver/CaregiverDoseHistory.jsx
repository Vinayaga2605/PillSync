import React, { useState } from 'react'
import {
  History,
  CheckCircle2,
  XCircle,
  Clock,
  Filter,
  Calendar,
  AlertCircle,
  Pill,
} from 'lucide-react'

export const CaregiverDoseHistory = ({
  doses = [],
  isLoading = false,
  error = null,
  onRetry,
  onFilterChange,
}) => {
  const [selectedStatus, setSelectedStatus] = useState('')
  const [selectedDate, setSelectedDate] = useState('')

  const handleStatusChange = (status) => {
    setSelectedStatus(status)
    if (onFilterChange) {
      onFilterChange({ status: status || null, targetDate: selectedDate || null })
    }
  }

  const handleDateChange = (e) => {
    const val = e.target.value
    setSelectedDate(val)
    if (onFilterChange) {
      onFilterChange({ status: selectedStatus || null, targetDate: val || null })
    }
  }

  const clearFilters = () => {
    setSelectedStatus('')
    setSelectedDate('')
    if (onFilterChange) {
      onFilterChange({ status: null, targetDate: null })
    }
  }

  const getStatusBadge = (status) => {
    switch (status) {
      case 'TAKEN':
        return (
          <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-bold bg-emerald-50 text-emerald-700 border border-emerald-200">
            <CheckCircle2 className="w-3 h-3 mr-1 text-emerald-600" />
            TAKEN
          </span>
        )
      case 'SKIPPED':
        return (
          <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-bold bg-rose-50 text-rose-700 border border-rose-200">
            <XCircle className="w-3 h-3 mr-1 text-rose-600" />
            SKIPPED
          </span>
        )
      case 'PENDING':
      default:
        return (
          <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-semibold bg-amber-50 text-amber-700 border border-amber-200">
            <Clock className="w-3 h-3 mr-1 text-amber-600" />
            PENDING
          </span>
        )
    }
  }

  const formatDateTime = (ts) => {
    if (!ts) return '—'
    try {
      const d = new Date(ts)
      return d.toLocaleString([], {
        month: 'short',
        day: 'numeric',
        hour: '2-digit',
        minute: '2-digit',
      })
    } catch {
      return ts
    }
  }

  // Calculate summary counts for current dose view
  const totalCount = doses.length
  const takenCount = doses.filter((d) => d.status === 'TAKEN').length
  const skippedCount = doses.filter((d) => d.status === 'SKIPPED').length
  const pendingCount = doses.filter((d) => d.status === 'PENDING' || !d.status).length

  if (isLoading) {
    return (
      <div className="space-y-3">
        {[1, 2, 3, 4].map((i) => (
          <div key={i} className="bg-white p-4 rounded-2xl border border-slate-200/80 animate-pulse flex items-center justify-between">
            <div className="space-y-2 flex-1">
              <div className="h-4 bg-slate-200 rounded w-1/4"></div>
              <div className="h-3 bg-slate-100 rounded w-1/3"></div>
            </div>
            <div className="h-6 bg-slate-200 rounded-full w-20"></div>
          </div>
        ))}
      </div>
    )
  }

  if (error) {
    return (
      <div className="p-6 rounded-2xl bg-rose-50 border border-rose-200 text-center">
        <AlertCircle className="w-8 h-8 text-rose-500 mx-auto mb-2" />
        <p className="text-sm font-semibold text-rose-800 mb-1">Failed to load dose history</p>
        <p className="text-xs text-rose-600 mb-3">{error}</p>
        {onRetry && (
          <button
            onClick={onRetry}
            className="px-3.5 py-1.5 bg-white text-rose-700 hover:bg-rose-100 border border-rose-200 rounded-xl text-xs font-semibold shadow-2xs transition-colors cursor-pointer"
          >
            Retry
          </button>
        )}
      </div>
    )
  }

  return (
    <div className="space-y-4">
      {/* Filter Bar */}
      <div className="bg-white p-3.5 rounded-2xl border border-slate-200/80 flex flex-wrap items-center justify-between gap-3 text-xs">
        <div className="flex items-center space-x-2 flex-wrap gap-y-2">
          <span className="font-semibold text-slate-700 flex items-center">
            <Filter className="w-3.5 h-3.5 mr-1 text-slate-500" />
            Filter Status:
          </span>
          <div className="flex items-center space-x-1.5">
            {['', 'TAKEN', 'SKIPPED', 'PENDING'].map((st) => (
              <button
                key={st}
                onClick={() => handleStatusChange(st)}
                className={`px-2.5 py-1 rounded-lg font-medium transition-all cursor-pointer ${
                  selectedStatus === st
                    ? 'bg-slate-900 text-white font-semibold shadow-2xs'
                    : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
                }`}
              >
                {st === '' ? 'All' : st}
              </button>
            ))}
          </div>
        </div>

        <div className="flex items-center space-x-2">
          <div className="flex items-center space-x-1.5 bg-slate-50 border border-slate-200 rounded-xl px-2.5 py-1">
            <Calendar className="w-3.5 h-3.5 text-slate-400" />
            <input
              type="date"
              value={selectedDate}
              onChange={handleDateChange}
              className="bg-transparent border-0 text-xs text-slate-700 focus:outline-none cursor-pointer"
            />
          </div>

          {(selectedStatus || selectedDate) && (
            <button
              onClick={clearFilters}
              className="text-slate-500 hover:text-slate-800 underline text-xs font-medium cursor-pointer"
            >
              Clear
            </button>
          )}
        </div>
      </div>

      {/* Summary Row */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
        <div className="bg-white p-3 rounded-xl border border-slate-200/80 text-xs">
          <span className="text-slate-500 font-medium block">Total In View</span>
          <span className="text-base font-bold text-slate-900 mt-0.5 block">{totalCount}</span>
        </div>
        <div className="bg-emerald-50/50 p-3 rounded-xl border border-emerald-100 text-xs">
          <span className="text-emerald-700 font-medium block">Taken Doses</span>
          <span className="text-base font-bold text-emerald-800 mt-0.5 block">{takenCount}</span>
        </div>
        <div className="bg-rose-50/50 p-3 rounded-xl border border-rose-100 text-xs">
          <span className="text-rose-700 font-medium block">Skipped Doses</span>
          <span className="text-base font-bold text-rose-800 mt-0.5 block">{skippedCount}</span>
        </div>
        <div className="bg-amber-50/50 p-3 rounded-xl border border-amber-100 text-xs">
          <span className="text-amber-700 font-medium block">Pending Doses</span>
          <span className="text-base font-bold text-amber-800 mt-0.5 block">{pendingCount}</span>
        </div>
      </div>

      {/* Doses List */}
      {doses.length === 0 ? (
        <div className="p-8 rounded-2xl bg-slate-50 border border-slate-200/80 text-center">
          <History className="w-9 h-9 text-slate-400 mx-auto mb-2" />
          <p className="text-sm font-semibold text-slate-700 mb-1">No Dose Records Found</p>
          <p className="text-xs text-slate-500">
            {selectedStatus || selectedDate
              ? 'No medication dose events match your active filters.'
              : 'No dose events have been logged for this patient yet.'}
          </p>
        </div>
      ) : (
        <div className="space-y-2.5">
          {doses.map((dose) => {
            const medName = dose.medicine_name || dose.custom_medicine_name || 'Medication'
            const scheduledTime = formatDateTime(dose.scheduled_timestamp)
            const takenTime = formatDateTime(dose.actual_taken_timestamp)

            return (
              <div
                key={dose.id}
                className="bg-white rounded-2xl border border-slate-200/80 p-4 shadow-xs hover:border-slate-300 transition-all flex flex-col sm:flex-row sm:items-center justify-between gap-3"
              >
                <div className="flex items-start space-x-3 min-w-0">
                  <div className="w-9 h-9 rounded-xl bg-slate-50 border border-slate-200 flex items-center justify-center text-slate-600 shrink-0 mt-0.5">
                    <Pill className="w-4.5 h-4.5" />
                  </div>
                  <div className="min-w-0">
                    <h4 className="text-sm font-bold text-slate-900 truncate">{medName}</h4>
                    <div className="flex items-center space-x-3 mt-1 text-xs text-slate-500 flex-wrap gap-y-1">
                      <span>Scheduled: <strong className="text-slate-700">{scheduledTime}</strong></span>
                      {dose.status === 'TAKEN' && (
                        <span>Taken: <strong className="text-emerald-700">{takenTime}</strong></span>
                      )}
                      {dose.dose_quantity_taken && (
                        <span>Qty: <strong className="text-slate-700">{dose.dose_quantity_taken}</strong></span>
                      )}
                    </div>
                  </div>
                </div>

                <div className="flex items-center space-x-3 self-end sm:self-center shrink-0">
                  {getStatusBadge(dose.status)}
                </div>
              </div>
            )
          })}
        </div>
      )}
    </div>
  )
}

export default CaregiverDoseHistory
