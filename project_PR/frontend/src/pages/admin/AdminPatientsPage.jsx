import React, { useState, useEffect, useCallback } from 'react'
import { Link } from 'react-router-dom'
import { adminService } from '../../services/adminService'
import {
  UserCheck,
  Search,
  RefreshCw,
  ChevronLeft,
  ChevronRight,
  AlertCircle,
  Eye,
  HeartHandshake,
  Pill,
} from 'lucide-react'

export const AdminPatientsPage = () => {
  const [patients, setPatients] = useState([])
  const [totalCount, setTotalCount] = useState(0)
  const [isLoading, setIsLoading] = useState(true)
  const [isRefreshing, setIsRefreshing] = useState(false)
  const [error, setError] = useState(null)

  // Filters & Pagination
  const [searchTerm, setSearchTerm] = useState('')
  const [activeSearch, setActiveSearch] = useState('')
  const [page, setPage] = useState(1)
  const pageSize = 15

  const fetchPatients = useCallback(
    async (isSilent = false) => {
      if (isSilent) {
        setIsRefreshing(true)
      } else {
        setIsLoading(true)
      }
      setError(null)

      const offset = (page - 1) * pageSize

      try {
        const data = await adminService.getPatients({
          search: activeSearch || null,
          limit: pageSize,
          offset,
        })
        setPatients(Array.isArray(data.items) ? data.items : [])
        setTotalCount(data.total_count || 0)
      } catch (err) {
        const detail = err?.response?.data?.detail
        setError(
          typeof detail === 'string'
            ? detail
            : 'Unable to load patient profiles directory. Please try again.'
        )
      } finally {
        setIsLoading(false)
        setIsRefreshing(false)
      }
    },
    [page, pageSize, activeSearch]
  )

  useEffect(() => {
    fetchPatients()
  }, [fetchPatients])

  const handleSearchSubmit = (e) => {
    e.preventDefault()
    setActiveSearch(searchTerm.trim())
    setPage(1)
  }

  const handleClearSearch = () => {
    setSearchTerm('')
    setActiveSearch('')
    setPage(1)
  }

  const totalPages = Math.ceil(totalCount / pageSize) || 1

  return (
    <div className="space-y-6">
      {/* Header Banner */}
      <div className="relative overflow-hidden rounded-2xl bg-white border border-slate-200/80 p-6 sm:p-7 shadow-xs">
        <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
          <div>
            <div className="inline-flex items-center space-x-2 px-3 py-1 rounded-full bg-teal-50 border border-teal-200 text-teal-700 text-xs font-bold mb-3 shadow-xs">
              <UserCheck className="w-3.5 h-3.5" />
              <span>Clinical Patient Records</span>
            </div>

            <h1 className="text-2xl sm:text-3xl font-bold text-slate-900 tracking-tight">
              Patient Profiles
            </h1>
            <p className="text-sm text-slate-500 mt-1.5 max-w-xl font-medium">
              System directory of registered patients, active prescriptions, and assigned caregiver linkages.
            </p>
          </div>

          <div className="flex items-center gap-3">
            <button
              onClick={() => fetchPatients(true)}
              disabled={isRefreshing || isLoading}
              className="inline-flex items-center gap-2 px-4 py-2 text-xs font-semibold text-slate-700 bg-white hover:bg-slate-50 border border-slate-200 rounded-xl transition-colors disabled:opacity-50 cursor-pointer shadow-xs"
            >
              <RefreshCw
                className={`w-3.5 h-3.5 text-teal-600 ${isRefreshing ? 'animate-spin' : ''}`}
              />
              <span>{isRefreshing ? 'Updating...' : 'Refresh'}</span>
            </button>
          </div>
        </div>
      </div>

      {/* Filter & Search Bar */}
      <div className="bg-white border border-slate-200/80 rounded-2xl p-4 sm:p-5 shadow-xs flex flex-col md:flex-row md:items-center justify-between gap-4">
        <form onSubmit={handleSearchSubmit} className="flex-1 max-w-md flex items-center gap-2">
          <div className="relative flex-1">
            <Search className="w-4 h-4 text-slate-400 absolute left-3.5 top-1/2 -translate-y-1/2" />
            <input
              type="text"
              placeholder="Search by patient name, email, or phone..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="w-full pl-9.5 pr-4 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs text-slate-900 placeholder:text-slate-400 focus:outline-hidden focus:ring-2 focus:ring-teal-500/20 focus:border-teal-500 transition-all"
            />
          </div>
          <button
            type="submit"
            className="px-3.5 py-2 bg-teal-600 hover:bg-teal-700 text-white rounded-xl text-xs font-semibold transition-colors cursor-pointer shadow-xs"
          >
            Search
          </button>
          {activeSearch && (
            <button
              type="button"
              onClick={handleClearSearch}
              className="px-3 py-2 text-xs text-slate-500 hover:text-slate-800 cursor-pointer font-medium"
            >
              Clear
            </button>
          )}
        </form>

        <div className="text-xs text-slate-500 font-medium">
          Showing <strong className="text-slate-800 font-bold">{patients.length}</strong> of{' '}
          <strong className="text-slate-800 font-bold">{totalCount}</strong> patients
        </div>
      </div>

      {/* Table Content */}
      {isLoading ? (
        <div className="space-y-3 animate-pulse">
          {[1, 2, 3, 4, 5].map((i) => (
            <div key={i} className="h-16 bg-slate-100 border border-slate-200 rounded-2xl" />
          ))}
        </div>
      ) : error ? (
        <div className="bg-white border border-slate-200 rounded-2xl p-8 text-center shadow-xs">
          <div className="w-12 h-12 rounded-full bg-rose-50 border border-rose-200 text-rose-600 flex items-center justify-center mx-auto mb-3">
            <AlertCircle className="w-6 h-6" />
          </div>
          <h3 className="text-base font-bold text-slate-900">Unable to load patients</h3>
          <p className="text-xs text-slate-500 max-w-md mx-auto mt-1 font-medium">{error}</p>
          <button
            onClick={() => fetchPatients(false)}
            className="mt-4 inline-flex items-center gap-1.5 px-4 py-2 text-xs font-bold text-teal-700 bg-teal-50 hover:bg-teal-100 border border-teal-200 rounded-xl transition-colors cursor-pointer"
          >
            <RefreshCw className="w-3.5 h-3.5" />
            <span>Try Again</span>
          </button>
        </div>
      ) : patients.length === 0 ? (
        <div className="bg-white border border-slate-200/80 rounded-2xl p-12 text-center shadow-xs">
          <div className="w-12 h-12 rounded-full bg-slate-100 border border-slate-200 text-slate-400 flex items-center justify-center mx-auto mb-3">
            <UserCheck className="w-6 h-6" />
          </div>
          <h3 className="text-base font-bold text-slate-900">No patients found</h3>
          <p className="text-xs text-slate-500 max-w-sm mx-auto mt-1 font-medium">
            {activeSearch
              ? 'No patient records matched your search query.'
              : 'No patient profiles have been initialized in the system yet.'}
          </p>
        </div>
      ) : (
        <div className="bg-white border border-slate-200/80 rounded-2xl overflow-hidden shadow-xs">
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs">
              <thead className="bg-slate-50/80 border-b border-slate-200/80 text-slate-500 font-semibold uppercase tracking-wider text-[10px]">
                <tr>
                  <th className="px-5 py-3.5">Patient Name</th>
                  <th className="px-5 py-3.5">Email & Phone</th>
                  <th className="px-5 py-3.5">Linked Caregivers</th>
                  <th className="px-5 py-3.5">Active Medications</th>
                  <th className="px-5 py-3.5">Account Status</th>
                  <th className="px-5 py-3.5 text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {patients.map((p) => (
                  <tr key={p.id} className="hover:bg-slate-50/60 transition-colors">
                    <td className="px-5 py-4">
                      <div className="font-bold text-slate-900">
                        {p.first_name} {p.last_name}
                      </div>
                      <div className="text-[11px] text-slate-400 font-mono mt-0.5">ID: {p.id.substring(0, 8)}...</div>
                    </td>
                    <td className="px-5 py-4">
                      <div className="font-mono text-slate-700">{p.email}</div>
                      {p.phone_number && (
                        <div className="text-[11px] text-slate-400 mt-0.5">{p.phone_number}</div>
                      )}
                    </td>
                    <td className="px-5 py-4">
                      <span className="inline-flex items-center space-x-1.5 px-2.5 py-0.5 rounded-full text-[10px] font-bold bg-sky-50 text-sky-700 border border-sky-200">
                        <HeartHandshake className="w-3 h-3" />
                        <span>{p.linked_caregivers_count} Linked</span>
                      </span>
                    </td>
                    <td className="px-5 py-4">
                      <span className="inline-flex items-center space-x-1.5 px-2.5 py-0.5 rounded-full text-[10px] font-bold bg-emerald-50 text-emerald-700 border border-emerald-200">
                        <Pill className="w-3 h-3" />
                        <span>{p.active_medications_count} Active</span>
                      </span>
                    </td>
                    <td className="px-5 py-4">
                      {p.is_active ? (
                        <span className="inline-flex items-center gap-1.5 px-2 py-0.5 rounded-full text-[10px] font-bold bg-emerald-50 text-emerald-700 border border-emerald-200">
                          <span className="w-1.5 h-1.5 rounded-full bg-emerald-500" />
                          Active
                        </span>
                      ) : (
                        <span className="inline-flex items-center gap-1.5 px-2 py-0.5 rounded-full text-[10px] font-bold bg-rose-50 text-rose-700 border border-rose-200">
                          <span className="w-1.5 h-1.5 rounded-full bg-rose-500" />
                          Inactive
                        </span>
                      )}
                    </td>
                    <td className="px-5 py-4 text-right">
                      <Link
                        to={`/app/admin/patients/${p.id}`}
                        className="inline-flex items-center space-x-1 px-3 py-1.5 bg-slate-100 hover:bg-teal-50 text-slate-700 hover:text-teal-700 rounded-xl text-xs font-bold border border-slate-200 hover:border-teal-200 transition-colors cursor-pointer shadow-2xs"
                      >
                        <Eye className="w-3.5 h-3.5" />
                        <span>View</span>
                      </Link>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          {/* Pagination */}
          <div className="flex items-center justify-between px-5 py-4 border-t border-slate-100 text-xs bg-slate-50/50">
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

export default AdminPatientsPage
