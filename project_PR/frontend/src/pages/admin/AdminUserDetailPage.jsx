import React, { useState, useEffect, useCallback } from 'react'
import { useParams, Link } from 'react-router-dom'
import { adminService } from '../../services/adminService'
import {
  Users,
  ArrowLeft,
  ShieldAlert,
  UserCheck,
  HeartHandshake,
  Mail,
  Phone,
  Calendar,
  AlertCircle,
  RefreshCw,
  ExternalLink,
} from 'lucide-react'

export const AdminUserDetailPage = () => {
  const { userId } = useParams()
  const [user, setUser] = useState(null)
  const [isLoading, setIsLoading] = useState(true)
  const [error, setError] = useState(null)
  const [isNotFound, setIsNotFound] = useState(false)

  const fetchUser = useCallback(async () => {
    setIsLoading(true)
    setError(null)
    setIsNotFound(false)

    try {
      const data = await adminService.getUserDetail(userId)
      setUser(data)
    } catch (err) {
      if (err?.response?.status === 404) {
        setIsNotFound(true)
      } else {
        const detail = err?.response?.data?.detail
        setError(
          typeof detail === 'string'
            ? detail
            : 'Unable to load user details. Please try again.'
        )
      }
    } finally {
      setIsLoading(false)
    }
  }, [userId])

  useEffect(() => {
    fetchUser()
  }, [fetchUser])

  const getRoleConfig = (role) => {
    switch (role) {
      case 'ADMIN':
        return {
          label: 'Administrator',
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

  if (isNotFound) {
    return (
      <div className="bg-white border border-slate-200/80 rounded-2xl p-12 text-center shadow-xs max-w-lg mx-auto mt-10">
        <div className="w-12 h-12 rounded-full bg-slate-100 border border-slate-200 text-slate-400 flex items-center justify-center mx-auto mb-3">
          <Users className="w-6 h-6" />
        </div>
        <h2 className="text-lg font-bold text-slate-900">User Not Found</h2>
        <p className="text-xs text-slate-500 max-w-sm mx-auto mt-1 font-medium">
          The requested user account does not exist or has been removed from the system directory.
        </p>
        <Link
          to="/app/admin/users"
          className="mt-5 inline-flex items-center space-x-1.5 px-4 py-2 bg-purple-600 hover:bg-purple-700 text-white rounded-xl text-xs font-semibold transition-colors cursor-pointer shadow-xs"
        >
          <ArrowLeft className="w-3.5 h-3.5" />
          <span>Back to User Directory</span>
        </Link>
      </div>
    )
  }

  return (
    <div className="space-y-6 max-w-4xl">
      {/* Navigation Breadcrumb / Back */}
      <div className="flex items-center justify-between">
        <Link
          to="/app/admin/users"
          className="inline-flex items-center space-x-1.5 text-xs font-bold text-slate-600 hover:text-purple-700 transition-colors cursor-pointer"
        >
          <ArrowLeft className="w-4 h-4" />
          <span>Back to Users</span>
        </Link>

        <button
          onClick={fetchUser}
          disabled={isLoading}
          className="inline-flex items-center space-x-1.5 px-3 py-1.5 bg-white border border-slate-200 rounded-xl text-xs font-semibold text-slate-700 hover:bg-slate-50 transition-colors cursor-pointer shadow-2xs"
        >
          <RefreshCw className={`w-3.5 h-3.5 ${isLoading ? 'animate-spin text-purple-600' : ''}`} />
          <span>Refresh</span>
        </button>
      </div>

      {isLoading ? (
        <div className="bg-white border border-slate-200 rounded-2xl p-8 animate-pulse space-y-4">
          <div className="h-6 bg-slate-200 rounded w-1/3" />
          <div className="h-4 bg-slate-100 rounded w-1/2" />
          <div className="grid grid-cols-2 gap-4 mt-6">
            <div className="h-20 bg-slate-50 rounded-xl" />
            <div className="h-20 bg-slate-50 rounded-xl" />
          </div>
        </div>
      ) : error ? (
        <div className="bg-white border border-slate-200 rounded-2xl p-8 text-center shadow-xs">
          <AlertCircle className="w-8 h-8 text-rose-500 mx-auto mb-2" />
          <h3 className="text-base font-bold text-slate-900">Unable to load user</h3>
          <p className="text-xs text-slate-500 max-w-md mx-auto mt-1 font-medium">{error}</p>
          <button
            onClick={fetchUser}
            className="mt-4 inline-flex items-center gap-1.5 px-4 py-2 text-xs font-bold text-purple-700 bg-purple-50 hover:bg-purple-100 border border-purple-200 rounded-xl transition-colors cursor-pointer"
          >
            <RefreshCw className="w-3.5 h-3.5" />
            <span>Try Again</span>
          </button>
        </div>
      ) : user ? (
        <div className="space-y-6">
          {/* Main Account Card */}
          <div className="bg-white border border-slate-200/80 rounded-2xl p-6 sm:p-8 shadow-xs">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-6 border-b border-slate-100">
              <div className="flex items-center space-x-4">
                <div className="w-14 h-14 rounded-2xl bg-purple-50 text-purple-700 border border-purple-200 flex items-center justify-center font-bold text-xl">
                  {user.first_name?.[0] || 'U'}{user.last_name?.[0] || ''}
                </div>
                <div>
                  <div className="flex items-center space-x-2.5">
                    <h1 className="text-xl sm:text-2xl font-bold text-slate-900">
                      {user.first_name} {user.last_name}
                    </h1>
                    {user.is_active ? (
                      <span className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-[10px] font-bold bg-emerald-50 text-emerald-700 border border-emerald-200">
                        <span className="w-1.5 h-1.5 rounded-full bg-emerald-500" />
                        Active Account
                      </span>
                    ) : (
                      <span className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-[10px] font-bold bg-rose-50 text-rose-700 border border-rose-200">
                        <span className="w-1.5 h-1.5 rounded-full bg-rose-500" />
                        Inactive Account
                      </span>
                    )}
                  </div>
                  <p className="text-xs text-slate-400 font-mono mt-1">User ID: {user.id}</p>
                </div>
              </div>

              {(() => {
                const roleConfig = getRoleConfig(user.role)
                const RoleIcon = roleConfig.icon
                return (
                  <span
                    className={`inline-flex items-center space-x-1.5 px-3 py-1 rounded-xl text-xs font-bold border self-start sm:self-auto ${roleConfig.classes}`}
                  >
                    <RoleIcon className="w-4 h-4" />
                    <span>{roleConfig.label}</span>
                  </span>
                )
              })()}
            </div>

            {/* Details Grid */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-5 pt-6">
              <div className="space-y-1">
                <span className="text-[11px] font-semibold text-slate-400 uppercase tracking-wider">Email Address</span>
                <div className="flex items-center space-x-2 text-xs font-semibold text-slate-800">
                  <Mail className="w-4 h-4 text-slate-400" />
                  <span>{user.email}</span>
                </div>
              </div>

              <div className="space-y-1">
                <span className="text-[11px] font-semibold text-slate-400 uppercase tracking-wider">Phone Number</span>
                <div className="flex items-center space-x-2 text-xs font-semibold text-slate-800">
                  <Phone className="w-4 h-4 text-slate-400" />
                  <span>{user.phone_number || 'Not provided'}</span>
                </div>
              </div>

              <div className="space-y-1">
                <span className="text-[11px] font-semibold text-slate-400 uppercase tracking-wider">Account Created</span>
                <div className="flex items-center space-x-2 text-xs font-semibold text-slate-800">
                  <Calendar className="w-4 h-4 text-slate-400" />
                  <span>{new Date(user.created_at).toLocaleString()}</span>
                </div>
              </div>

              <div className="space-y-1">
                <span className="text-[11px] font-semibold text-slate-400 uppercase tracking-wider">Last Profile Update</span>
                <div className="flex items-center space-x-2 text-xs font-semibold text-slate-800">
                  <Calendar className="w-4 h-4 text-slate-400" />
                  <span>{new Date(user.updated_at).toLocaleString()}</span>
                </div>
              </div>
            </div>
          </div>

          {/* Profile Association Card */}
          <div className="bg-white border border-slate-200/80 rounded-2xl p-6 shadow-xs space-y-4">
            <h3 className="text-sm font-bold text-slate-900">Role-Specific Profile Association</h3>

            {user.role === 'PATIENT' && user.patient_profile_id && (
              <div className="flex flex-col sm:flex-row sm:items-center justify-between p-4 rounded-xl bg-teal-50/50 border border-teal-200 gap-3">
                <div className="flex items-center space-x-3">
                  <div className="w-9 h-9 rounded-xl bg-teal-100 text-teal-700 flex items-center justify-center">
                    <UserCheck className="w-5 h-5" />
                  </div>
                  <div>
                    <h4 className="text-xs font-bold text-teal-900">Active Patient Profile</h4>
                    <p className="text-[11px] text-teal-700 font-mono">Profile ID: {user.patient_profile_id}</p>
                  </div>
                </div>

                <Link
                  to={`/app/admin/patients/${user.patient_profile_id}`}
                  className="inline-flex items-center space-x-1.5 px-3.5 py-1.5 bg-teal-600 hover:bg-teal-700 text-white rounded-xl text-xs font-semibold transition-colors cursor-pointer shadow-2xs self-start sm:self-auto"
                >
                  <span>View Patient Record</span>
                  <ExternalLink className="w-3 h-3" />
                </Link>
              </div>
            )}

            {user.role === 'CAREGIVER' && user.caregiver_profile_id && (
              <div className="flex flex-col sm:flex-row sm:items-center justify-between p-4 rounded-xl bg-sky-50/50 border border-sky-200 gap-3">
                <div className="flex items-center space-x-3">
                  <div className="w-9 h-9 rounded-xl bg-sky-100 text-sky-700 flex items-center justify-center">
                    <HeartHandshake className="w-5 h-5" />
                  </div>
                  <div>
                    <h4 className="text-xs font-bold text-sky-900">Active Caregiver Profile</h4>
                    <p className="text-[11px] text-sky-700 font-mono">Profile ID: {user.caregiver_profile_id}</p>
                  </div>
                </div>

                <Link
                  to={`/app/admin/caregivers/${user.caregiver_profile_id}`}
                  className="inline-flex items-center space-x-1.5 px-3.5 py-1.5 bg-sky-600 hover:bg-sky-700 text-white rounded-xl text-xs font-semibold transition-colors cursor-pointer shadow-2xs self-start sm:self-auto"
                >
                  <span>View Caregiver Record</span>
                  <ExternalLink className="w-3 h-3" />
                </Link>
              </div>
            )}

            {user.role === 'ADMIN' && (
              <div className="p-4 rounded-xl bg-purple-50/50 border border-purple-200 text-xs text-purple-900">
                This account holds administrative security credentials with global read-only governance permissions.
              </div>
            )}
          </div>
        </div>
      ) : null}
    </div>
  )
}

export default AdminUserDetailPage
