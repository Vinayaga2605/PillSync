import React, { useState, useEffect, useCallback } from 'react'
import { Link } from 'react-router-dom'
import { adminService } from '../../services/adminService'
import {
  Users,
  Search,
  Filter,
  RefreshCw,
  ChevronLeft,
  ChevronRight,
  AlertCircle,
  Eye,
  ShieldAlert,
  UserCheck,
  HeartHandshake,
} from 'lucide-react'

export const AdminUsersPage = () => {
  const [users, setUsers] = useState([])
  const [totalCount, setTotalCount] = useState(0)
  const [isLoading, setIsLoading] = useState(true)
  const [isRefreshing, setIsRefreshing] = useState(false)
  const [error, setError] = useState(null)

  // Filters & Pagination
  const [searchTerm, setSearchTerm] = useState('')
  const [activeSearch, setActiveSearch] = useState('')
  const [selectedRole, setSelectedRole] = useState('')
  const [selectedStatus, setSelectedStatus] = useState('')
  const [page, setPage] = useState(1)
  const pageSize = 15

  const fetchUsers = useCallback(
    async (isSilent = false) => {
      if (isSilent) {
        setIsRefreshing(true)
      } else {
        setIsLoading(true)
      }
      setError(null)

      const offset = (page - 1) * pageSize
      const is_active =
        selectedStatus === 'ACTIVE'
          ? true
          : selectedStatus === 'INACTIVE'
          ? false
          : null

      try {
        const data = await adminService.getUsers({
          role: selectedRole || null,
          is_active,
          search: activeSearch || null,
          limit: pageSize,
          offset,
        })
        setUsers(Array.isArray(data.items) ? data.items : [])
        setTotalCount(data.total_count || 0)
      } catch (err) {
        const detail = err?.response?.data?.detail
        setError(
          typeof detail === 'string'
            ? detail
            : 'Unable to load user accounts directory. Please try again.'
        )
      } finally {
        setIsLoading(false)
        setIsRefreshing(false)
      }
    },
    [page, pageSize, selectedRole, selectedStatus, activeSearch]
  )

  useEffect(() => {
    fetchUsers()
  }, [fetchUsers])

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

  const getRoleBadge = (role) => {
    switch (role) {
      case 'ADMIN':
        return {
          label: 'Admin',
          icon: ShieldAlert,
          classes: 'bg-purple-50 text-purple-700 border-purple-200',
        }
      case 'CAREGIVER':
        return {
          label: 'Caregiver',
          icon: HeartHandshake,
          classes: 'bg-sky-50 text-sky-700 border-sky-200',
        }
      case 'PATIENT':
      default:
        return {
          label: 'Patient',
          icon: UserCheck,
          classes: 'bg-teal-50 text-teal-700 border-teal-200',
        }
    }
  }

  return (
    <div className="space-y-6">
      {/* Header Banner */}
      <div className="relative overflow-hidden rounded-2xl bg-white border border-slate-200/80 p-6 sm:p-7 shadow-xs">
        <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
          <div>
            <div className="inline-flex items-center space-x-2 px-3 py-1 rounded-full bg-purple-50 border border-purple-200 text-purple-700 text-xs font-bold mb-3 shadow-xs">
              <Users className="w-3.5 h-3.5" />
              <span>User Accounts Management</span>
            </div>

            <h1 className="text-2xl sm:text-3xl font-bold text-slate-900 tracking-tight">
              User Directory
            </h1>
            <p className="text-sm text-slate-500 mt-1.5 max-w-xl font-medium">
              Read-only index of registered patient, caregiver, and administrator accounts.
            </p>
          </div>

          <div className="flex items-center gap-3">
            <button
              onClick={() => fetchUsers(true)}
              disabled={isRefreshing || isLoading}
              className="inline-flex items-center gap-2 px-4 py-2 text-xs font-semibold text-slate-700 bg-white hover:bg-slate-50 border border-slate-200 rounded-xl transition-colors disabled:opacity-50 cursor-pointer shadow-xs"
            >
              <RefreshCw
                className={`w-3.5 h-3.5 text-purple-600 ${isRefreshing ? 'animate-spin' : ''}`}
              />
              <span>{isRefreshing ? 'Updating...' : 'Refresh'}</span>
            </button>
          </div>
        </div>
      </div>

      {/* Filter & Search Bar */}
      <div className="bg-white border border-slate-200/80 rounded-2xl p-4 sm:p-5 shadow-xs flex flex-col md:flex-row md:items-center justify-between gap-4">
        {/* Search form */}
        <form onSubmit={handleSearchSubmit} className="flex-1 max-w-md flex items-center gap-2">
          <div className="relative flex-1">
            <Search className="w-4 h-4 text-slate-400 absolute left-3.5 top-1/2 -translate-y-1/2" />
            <input
              type="text"
              placeholder="Search by name or email..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="w-full pl-9.5 pr-4 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs text-slate-900 placeholder:text-slate-400 focus:outline-hidden focus:ring-2 focus:ring-purple-500/20 focus:border-purple-500 transition-all"
            />
          </div>
          <button
            type="submit"
            className="px-3.5 py-2 bg-purple-600 hover:bg-purple-700 text-white rounded-xl text-xs font-semibold transition-colors cursor-pointer shadow-xs"
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

        {/* Filters */}
        <div className="flex flex-wrap items-center gap-3">
          {/* Role Filter */}
          <div className="flex items-center space-x-1.5">
            <Filter className="w-3.5 h-3.5 text-slate-400" />
            <select
              value={selectedRole}
              onChange={(e) => {
                setSelectedRole(e.target.value)
                setPage(1)
              }}
              className="px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs font-semibold text-slate-700 focus:outline-hidden focus:ring-2 focus:ring-purple-500/20 cursor-pointer"
            >
              <option value="">All Roles</option>
              <option value="PATIENT">Patient</option>
              <option value="CAREGIVER">Caregiver</option>
              <option value="ADMIN">Admin</option>
            </select>
          </div>

          {/* Status Filter */}
          <div>
            <select
              value={selectedStatus}
              onChange={(e) => {
                setSelectedStatus(e.target.value)
                setPage(1)
              }}
              className="px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs font-semibold text-slate-700 focus:outline-hidden focus:ring-2 focus:ring-purple-500/20 cursor-pointer"
            >
              <option value="">All Statuses</option>
              <option value="ACTIVE">Active Only</option>
              <option value="INACTIVE">Inactive Only</option>
            </select>
          </div>
        </div>
      </div>

      {/* Directory Content */}
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
          <h3 className="text-base font-bold text-slate-900">Unable to load users</h3>
          <p className="text-xs text-slate-500 max-w-md mx-auto mt-1 font-medium">{error}</p>
          <button
            onClick={() => fetchUsers(false)}
            className="mt-4 inline-flex items-center gap-1.5 px-4 py-2 text-xs font-bold text-purple-700 bg-purple-50 hover:bg-purple-100 border border-purple-200 rounded-xl transition-colors cursor-pointer"
          >
            <RefreshCw className="w-3.5 h-3.5" />
            <span>Try Again</span>
          </button>
        </div>
      ) : users.length === 0 ? (
        <div className="bg-white border border-slate-200/80 rounded-2xl p-12 text-center shadow-xs">
          <div className="w-12 h-12 rounded-full bg-slate-100 border border-slate-200 text-slate-400 flex items-center justify-center mx-auto mb-3">
            <Users className="w-6 h-6" />
          </div>
          <h3 className="text-base font-bold text-slate-900">No users found</h3>
          <p className="text-xs text-slate-500 max-w-sm mx-auto mt-1 font-medium">
            {activeSearch || selectedRole || selectedStatus
              ? 'No user accounts match your active search and filter criteria.'
              : 'No registered accounts exist in the system yet.'}
          </p>
        </div>
      ) : (
        <div className="bg-white border border-slate-200/80 rounded-2xl overflow-hidden shadow-xs">
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs">
              <thead className="bg-slate-50/80 border-b border-slate-200/80 text-slate-500 font-semibold uppercase tracking-wider text-[10px]">
                <tr>
                  <th className="px-5 py-3.5">User</th>
                  <th className="px-5 py-3.5">Email</th>
                  <th className="px-5 py-3.5">Role</th>
                  <th className="px-5 py-3.5">Status</th>
                  <th className="px-5 py-3.5">Registered</th>
                  <th className="px-5 py-3.5 text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {users.map((u) => {
                  const roleBadge = getRoleBadge(u.role)
                  const RoleIcon = roleBadge.icon

                  return (
                    <tr key={u.id} className="hover:bg-slate-50/60 transition-colors">
                      <td className="px-5 py-4">
                        <div className="font-bold text-slate-900">
                          {u.first_name} {u.last_name}
                        </div>
                        {u.phone_number && (
                          <div className="text-[11px] text-slate-400 mt-0.5">{u.phone_number}</div>
                        )}
                      </td>
                      <td className="px-5 py-4 font-mono text-slate-700">{u.email}</td>
                      <td className="px-5 py-4">
                        <span
                          className={`inline-flex items-center space-x-1 px-2.5 py-0.5 rounded-full text-[10px] font-bold border ${roleBadge.classes}`}
                        >
                          <RoleIcon className="w-3 h-3" />
                          <span>{roleBadge.label}</span>
                        </span>
                      </td>
                      <td className="px-5 py-4">
                        {u.is_active ? (
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
                      <td className="px-5 py-4 text-slate-500">
                        {new Date(u.created_at).toLocaleDateString(undefined, {
                          month: 'short',
                          day: 'numeric',
                          year: 'numeric',
                        })}
                      </td>
                      <td className="px-5 py-4 text-right">
                        <Link
                          to={`/app/admin/users/${u.id}`}
                          className="inline-flex items-center space-x-1 px-3 py-1.5 bg-slate-100 hover:bg-purple-50 text-slate-700 hover:text-purple-700 rounded-xl text-xs font-bold border border-slate-200 hover:border-purple-200 transition-colors cursor-pointer shadow-2xs"
                        >
                          <Eye className="w-3.5 h-3.5" />
                          <span>View</span>
                        </Link>
                      </td>
                    </tr>
                  )
                })}
              </tbody>
            </table>
          </div>

          {/* Pagination */}
          <div className="flex items-center justify-between px-5 py-4 border-t border-slate-100 text-xs bg-slate-50/50">
            <div className="text-slate-500 font-medium">
              Showing <strong className="text-slate-800 font-bold">{(page - 1) * pageSize + 1}</strong> to{' '}
              <strong className="text-slate-800 font-bold">{Math.min(page * pageSize, totalCount)}</strong> of{' '}
              <strong className="text-slate-800 font-bold">{totalCount}</strong> users
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

export default AdminUsersPage
