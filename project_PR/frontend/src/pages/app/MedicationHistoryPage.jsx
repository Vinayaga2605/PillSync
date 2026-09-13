import React, { useState, useEffect, useCallback } from 'react'
import { historyService } from '../../services/historyService'
import {
  History,
  Calendar,
  RefreshCw,
  AlertCircle,
  CheckCircle2,
  XCircle,
  Clock,
  FileText,
  ChevronLeft,
  ChevronRight,
  Pill,
  X,
} from 'lucide-react'

export const MedicationHistoryPage = () => {
  // Filters State
  const [statusFilter, setStatusFilter] = useState('ALL') // 'ALL' | 'TAKEN' | 'SKIPPED' | 'PENDING'
  const [filterDate, setFilterDate] = useState('')

  // Pagination State
  const [page, setPage] = useState(1)
  const pageSize = 15
  const [totalCount, setTotalCount] = useState(0)

  // Data & Loading State
  const [items, setItems] = useState([])
  const [isLoading, setIsLoading] = useState(true)
  const [isRefreshing, setIsRefreshing] = useState(false)
  const [error, setError] = useState(null)

  // Fetch History Data
  const fetchHistory = useCallback(async (isSilent = false) => {
    if (isSilent) {
      setIsRefreshing(true)
    } else {
      setIsLoading(true)
    }
    setError(null)

    const offset = (page - 1) * pageSize

    try {
      const data = await historyService.getMedicationHistory({
        startDate: filterDate || null,
        endDate: filterDate || null,
        status: statusFilter,
        limit: pageSize,
        offset,
      })

      setItems(Array.isArray(data.items) ? data.items : [])
      setTotalCount(data.total_count || 0)
    } catch (err) {
      const detail = err.response?.data?.detail
      setError(
        typeof detail === 'string'
          ? detail
          : 'Unable to load medication history. Please try again.'
      )
    } finally {
      setIsLoading(false)
      setIsRefreshing(false)
    }
  }, [page, pageSize, statusFilter, filterDate])

  useEffect(() => {
    fetchHistory()
  }, [fetchHistory])

  // Reset pagination to page 1 on filter changes
  const handleStatusChange = (status) => {
    setStatusFilter(status)
    setPage(1)
  }

  const handleDateChange = (dateVal) => {
    setFilterDate(dateVal)
    setPage(1)
  }

  const handleClearFilters = () => {
    setStatusFilter('ALL')
    setFilterDate('')
    setPage(1)
  }

  // Format ISO timestamp to readable date and 12-hour time
  const formatDateTime = (isoString) => {
    if (!isoString) return '-'
    try {
      const dateObj = new Date(isoString)
      if (isNaN(dateObj.getTime())) return isoString

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

  const totalPages = Math.ceil(totalCount / pageSize) || 1

  const getStatusBadge = (status) => {
    switch (status?.toUpperCase()) {
      case 'TAKEN':
        return (
          <span className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-[11px] font-bold bg-emerald-50 border border-emerald-200 text-emerald-700">
            <CheckCircle2 className="w-3 h-3 text-emerald-600" />
            Taken
          </span>
        )
      case 'SKIPPED':
        return (
          <span className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-[11px] font-bold bg-rose-50 border border-rose-200 text-rose-700">
            <XCircle className="w-3 h-3 text-rose-600" />
            Skipped
          </span>
        )
      case 'PENDING':
        return (
          <span className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-[11px] font-bold bg-amber-50 border border-amber-200 text-amber-700">
            <Clock className="w-3 h-3 text-amber-600" />
            Pending
          </span>
        )
      default:
        return (
          <span className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-[11px] font-semibold bg-slate-100 border border-slate-200 text-slate-600">
            {status}
          </span>
        )
    }
  }

  return (
    <div className="space-y-6">
      {/* Header Banner */}
      <div className="relative overflow-hidden rounded-2xl bg-white border border-slate-200/80 p-6 sm:p-8 shadow-xs">
        <div className="relative z-10 flex flex-col md:flex-row md:items-center md:justify-between gap-4">
          <div>
            <div className="inline-flex items-center space-x-2 px-3 py-1 rounded-full bg-teal-50 border border-teal-200 text-teal-700 text-xs font-bold mb-3 shadow-xs">
              <History className="w-3.5 h-3.5" />
              <span>Dose Records</span>
            </div>

            <h1 className="text-2xl sm:text-3xl font-bold text-slate-900 tracking-tight">
              Medication History
            </h1>
            <p className="text-sm text-slate-500 mt-1.5 max-w-xl font-medium">
              Chronological log of your recorded medication doses, intake timestamps, and intake notes.
            </p>
          </div>

          <div className="flex items-center gap-3">
            <button
              onClick={() => fetchHistory(true)}
              disabled={isRefreshing || isLoading}
              className="inline-flex items-center gap-2 px-4 py-2 text-sm font-semibold text-slate-700 bg-white hover:bg-slate-50 border border-slate-200 rounded-xl transition-colors disabled:opacity-50 cursor-pointer shadow-xs"
            >
              <RefreshCw className={`w-4 h-4 text-teal-600 ${isRefreshing ? 'animate-spin' : ''}`} />
              <span>{isRefreshing ? 'Updating...' : 'Refresh'}</span>
            </button>
          </div>
        </div>
      </div>

      {/* Filter Controls */}
      <div className="bg-white border border-slate-200/80 rounded-2xl p-4 sm:p-5 shadow-xs flex flex-col lg:flex-row lg:items-center justify-between gap-4">
        {/* Status Filter Buttons */}
        <div className="flex flex-wrap items-center gap-1.5 p-1 bg-slate-100 rounded-xl border border-slate-200 self-start">
          {[
            { id: 'ALL', label: 'All Records' },
            { id: 'TAKEN', label: 'Taken' },
            { id: 'SKIPPED', label: 'Skipped' },
            { id: 'PENDING', label: 'Pending' },
          ].map((item) => (
            <button
              key={item.id}
              onClick={() => handleStatusChange(item.id)}
              className={`px-3.5 py-1.5 rounded-lg text-xs font-bold transition-all cursor-pointer ${
                statusFilter === item.id
                  ? 'bg-white text-teal-800 shadow-xs'
                  : 'text-slate-600 hover:text-slate-900'
              }`}
            >
              {item.label}
            </button>
          ))}
        </div>

        {/* Date Filter & Clear */}
        <div className="flex items-center space-x-2.5">
          <div className="flex items-center space-x-1.5 bg-white border border-slate-200 rounded-xl px-3 py-1.5 shadow-xs">
            <Calendar className="w-4 h-4 text-slate-400 shrink-0" />
            <input
              type="date"
              value={filterDate}
              onChange={(e) => handleDateChange(e.target.value)}
              className="bg-transparent text-xs text-slate-800 focus:outline-none [color-scheme:light]"
              placeholder="Filter by date"
            />
          </div>

          {(statusFilter !== 'ALL' || filterDate) && (
            <button
              onClick={handleClearFilters}
              className="inline-flex items-center gap-1 px-3 py-1.5 text-xs text-slate-600 hover:text-slate-900 bg-slate-100 hover:bg-slate-200 rounded-xl border border-slate-200 transition-colors cursor-pointer font-semibold"
              title="Reset all filters"
            >
              <X className="w-3.5 h-3.5" />
              <span>Reset</span>
            </button>
          )}
        </div>
      </div>

      {/* Main Content Area */}
      {isLoading ? (
        <div className="bg-white border border-slate-200/80 rounded-2xl p-6 shadow-xs animate-pulse space-y-4">
          <div className="h-6 w-40 bg-slate-200 rounded" />
          {[1, 2, 3, 4, 5].map((i) => (
            <div key={i} className="h-16 bg-slate-100 rounded-xl" />
          ))}
        </div>
      ) : error ? (
        <div className="bg-white border border-slate-200 rounded-2xl p-8 text-center shadow-xs">
          <div className="w-12 h-12 rounded-full bg-rose-50 border border-rose-200 text-rose-600 flex items-center justify-center mx-auto mb-3">
            <AlertCircle className="w-6 h-6" />
          </div>
          <h3 className="text-base font-bold text-slate-900">Unable to load medication history</h3>
          <p className="text-xs text-slate-500 max-w-md mx-auto mt-1 font-medium">{error}</p>
          <button
            onClick={() => fetchHistory(false)}
            className="mt-4 inline-flex items-center gap-1.5 px-4 py-2 text-xs font-bold text-teal-700 bg-teal-50 hover:bg-teal-100 border border-teal-200 rounded-xl transition-colors cursor-pointer"
          >
            <RefreshCw className="w-3.5 h-3.5" />
            <span>Try Again</span>
          </button>
        </div>
      ) : items.length === 0 ? (
        <div className="bg-white border border-slate-200/80 rounded-2xl p-12 text-center shadow-xs">
          <div className="w-12 h-12 rounded-full bg-slate-100 border border-slate-200 text-slate-400 flex items-center justify-center mx-auto mb-3">
            <History className="w-6 h-6" />
          </div>
          <h3 className="text-base font-bold text-slate-900">No medication history found</h3>
          <p className="text-xs text-slate-500 max-w-sm mx-auto mt-1 font-medium">
            {statusFilter !== 'ALL' || filterDate
              ? 'No dose events matched your current filters. Try changing or clearing your search criteria.'
              : 'Logged intake records and dose actions will appear here in chronological order.'}
          </p>
          {(statusFilter !== 'ALL' || filterDate) && (
            <button
              onClick={handleClearFilters}
              className="mt-4 inline-flex items-center gap-1.5 px-3.5 py-1.5 text-xs font-bold text-teal-700 bg-teal-50 hover:bg-teal-100 border border-teal-200 rounded-xl transition-colors cursor-pointer"
            >
              <span>Clear Filters</span>
            </button>
          )}
        </div>
      ) : (
        <div className="bg-white border border-slate-200/80 rounded-2xl shadow-xs overflow-hidden">
          {/* Desktop Table View */}
          <div className="hidden md:block overflow-x-auto">
            <table className="w-full text-left text-xs">
              <thead className="bg-slate-50/80 text-slate-600 uppercase tracking-wider font-bold border-b border-slate-200">
                <tr>
                  <th scope="col" className="py-3.5 px-5">Medication</th>
                  <th scope="col" className="py-3.5 px-4">Scheduled Time</th>
                  <th scope="col" className="py-3.5 px-4">Status</th>
                  <th scope="col" className="py-3.5 px-4">Action / Taken Time</th>
                  <th scope="col" className="py-3.5 px-4">Dose Quantity</th>
                  <th scope="col" className="py-3.5 px-5">Notes</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {items.map((row) => (
                  <tr key={row.id} className="hover:bg-slate-50/70 transition-colors">
                    <td className="py-4 px-5">
                      <div className="flex items-center space-x-3">
                        <div className="w-8 h-8 rounded-lg bg-teal-50 text-teal-700 border border-teal-200 flex items-center justify-center shrink-0">
                          <Pill className="w-4 h-4" />
                        </div>
                        <div>
                          <p className="font-bold text-slate-900">{row.medicine_name}</p>
                          {row.generic_name && (
                            <p className="text-[11px] text-slate-500 italic">{row.generic_name}</p>
                          )}
                        </div>
                      </div>
                    </td>
                    <td className="py-4 px-4 text-slate-700 font-semibold whitespace-nowrap">
                      {formatDateTime(row.scheduled_timestamp)}
                    </td>
                    <td className="py-4 px-4 whitespace-nowrap">
                      {getStatusBadge(row.status)}
                    </td>
                    <td className="py-4 px-4 text-slate-600 whitespace-nowrap font-medium">
                      {row.actual_taken_timestamp
                        ? formatDateTime(row.actual_taken_timestamp)
                        : <span className="text-slate-400">-</span>}
                    </td>
                    <td className="py-4 px-4 text-slate-700 whitespace-nowrap font-semibold">
                      {row.dose_quantity_taken
                        ? `${Number(row.dose_quantity_taken)} ${row.dosage_unit || 'dose'}`
                        : <span className="text-slate-400">-</span>}
                    </td>
                    <td className="py-4 px-5 text-slate-600 max-w-xs truncate font-medium">
                      {row.notes ? (
                        <span className="flex items-center gap-1.5 text-slate-700" title={row.notes}>
                          <FileText className="w-3.5 h-3.5 text-slate-400 shrink-0" />
                          <span className="truncate">{row.notes}</span>
                        </span>
                      ) : (
                        <span className="text-slate-400">-</span>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          {/* Mobile Stacked Card View */}
          <div className="md:hidden divide-y divide-slate-100 p-3 space-y-3">
            {items.map((row) => (
              <div key={row.id} className="bg-slate-50/70 border border-slate-200/80 rounded-xl p-4 space-y-2.5 shadow-xs">
                <div className="flex items-start justify-between">
                  <div className="flex items-center space-x-2.5 min-w-0">
                    <div className="w-8 h-8 rounded-lg bg-teal-50 text-teal-700 border border-teal-200 flex items-center justify-center shrink-0">
                      <Pill className="w-4 h-4" />
                    </div>
                    <div className="min-w-0">
                      <h4 className="text-sm font-bold text-slate-900 truncate">{row.medicine_name}</h4>
                      {row.generic_name && (
                        <p className="text-xs text-slate-500 italic truncate">{row.generic_name}</p>
                      )}
                    </div>
                  </div>
                  {getStatusBadge(row.status)}
                </div>

                <div className="grid grid-cols-2 gap-2 text-xs pt-2 border-t border-slate-200/60">
                  <div>
                    <span className="text-[10px] text-slate-500 uppercase tracking-wider block font-semibold">Scheduled</span>
                    <span className="text-slate-800 font-semibold">{formatDateTime(row.scheduled_timestamp)}</span>
                  </div>
                  <div>
                    <span className="text-[10px] text-slate-500 uppercase tracking-wider block font-semibold">Recorded Action</span>
                    <span className="text-slate-800 font-semibold">
                      {row.actual_taken_timestamp ? formatDateTime(row.actual_taken_timestamp) : '-'}
                    </span>
                  </div>
                </div>

                {row.notes && (
                  <div className="pt-2 border-t border-slate-200/60 text-xs text-slate-600 flex items-start gap-1.5 font-medium">
                    <FileText className="w-3.5 h-3.5 text-slate-400 shrink-0 mt-0.5" />
                    <p className="italic">{row.notes}</p>
                  </div>
                )}
              </div>
            ))}
          </div>

          {/* Pagination Footer */}
          <div className="flex items-center justify-between px-5 py-4 bg-white border-t border-slate-100 text-xs">
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
export default MedicationHistoryPage
