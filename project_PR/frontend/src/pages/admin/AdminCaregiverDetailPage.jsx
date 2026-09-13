import React, { useState, useEffect, useCallback } from 'react'
import { useParams, Link } from 'react-router-dom'
import { adminService } from '../../services/adminService'
import {
  HeartHandshake,
  ArrowLeft,
  Mail,
  Phone,
  Calendar,
  AlertCircle,
  RefreshCw,
  Building,
  UserCheck,
  ExternalLink,
} from 'lucide-react'

export const AdminCaregiverDetailPage = () => {
  const { caregiverId } = useParams()
  const [caregiver, setCaregiver] = useState(null)
  const [isLoading, setIsLoading] = useState(true)
  const [error, setError] = useState(null)
  const [isNotFound, setIsNotFound] = useState(false)

  const fetchCaregiver = useCallback(async () => {
    setIsLoading(true)
    setError(null)
    setIsNotFound(false)

    try {
      const data = await adminService.getCaregiverDetail(caregiverId)
      setCaregiver(data)
    } catch (err) {
      if (err?.response?.status === 404) {
        setIsNotFound(true)
      } else {
        const detail = err?.response?.data?.detail
        setError(
          typeof detail === 'string'
            ? detail
            : 'Unable to load caregiver profile. Please try again.'
        )
      }
    } finally {
      setIsLoading(false)
    }
  }, [caregiverId])

  useEffect(() => {
    fetchCaregiver()
  }, [fetchCaregiver])

  if (isNotFound) {
    return (
      <div className="bg-white border border-slate-200/80 rounded-2xl p-12 text-center shadow-xs max-w-lg mx-auto mt-10">
        <div className="w-12 h-12 rounded-full bg-slate-100 border border-slate-200 text-slate-400 flex items-center justify-center mx-auto mb-3">
          <HeartHandshake className="w-6 h-6" />
        </div>
        <h2 className="text-lg font-bold text-slate-900">Caregiver Not Found</h2>
        <p className="text-xs text-slate-500 max-w-sm mx-auto mt-1 font-medium">
          The requested caregiver profile does not exist or has been removed from the directory.
        </p>
        <Link
          to="/app/admin/caregivers"
          className="mt-5 inline-flex items-center space-x-1.5 px-4 py-2 bg-sky-600 hover:bg-sky-700 text-white rounded-xl text-xs font-semibold transition-colors cursor-pointer shadow-xs"
        >
          <ArrowLeft className="w-3.5 h-3.5" />
          <span>Back to Caregiver Directory</span>
        </Link>
      </div>
    )
  }

  return (
    <div className="space-y-6 max-w-4xl">
      {/* Navigation Breadcrumb / Back */}
      <div className="flex items-center justify-between">
        <Link
          to="/app/admin/caregivers"
          className="inline-flex items-center space-x-1.5 text-xs font-bold text-slate-600 hover:text-sky-700 transition-colors cursor-pointer"
        >
          <ArrowLeft className="w-4 h-4" />
          <span>Back to Caregivers</span>
        </Link>

        <button
          onClick={fetchCaregiver}
          disabled={isLoading}
          className="inline-flex items-center space-x-1.5 px-3 py-1.5 bg-white border border-slate-200 rounded-xl text-xs font-semibold text-slate-700 hover:bg-slate-50 transition-colors cursor-pointer shadow-2xs"
        >
          <RefreshCw className={`w-3.5 h-3.5 ${isLoading ? 'animate-spin text-sky-600' : ''}`} />
          <span>Refresh</span>
        </button>
      </div>

      {isLoading ? (
        <div className="bg-white border border-slate-200 rounded-2xl p-8 animate-pulse space-y-4">
          <div className="h-6 bg-slate-200 rounded w-1/3" />
          <div className="h-4 bg-slate-100 rounded w-1/2" />
          <div className="grid grid-cols-2 gap-4 mt-6">
            <div className="h-24 bg-slate-50 rounded-xl" />
            <div className="h-24 bg-slate-50 rounded-xl" />
          </div>
        </div>
      ) : error ? (
        <div className="bg-white border border-slate-200 rounded-2xl p-8 text-center shadow-xs">
          <AlertCircle className="w-8 h-8 text-rose-500 mx-auto mb-2" />
          <h3 className="text-base font-bold text-slate-900">Unable to load caregiver profile</h3>
          <p className="text-xs text-slate-500 max-w-md mx-auto mt-1 font-medium">{error}</p>
          <button
            onClick={fetchCaregiver}
            className="mt-4 inline-flex items-center gap-1.5 px-4 py-2 text-xs font-bold text-sky-700 bg-sky-50 hover:bg-sky-100 border border-sky-200 rounded-xl transition-colors cursor-pointer"
          >
            <RefreshCw className="w-3.5 h-3.5" />
            <span>Try Again</span>
          </button>
        </div>
      ) : caregiver ? (
        <div className="space-y-6">
          {/* Header Card */}
          <div className="bg-white border border-slate-200/80 rounded-2xl p-6 sm:p-8 shadow-xs">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-6 border-b border-slate-100">
              <div className="flex items-center space-x-4">
                <div className="w-14 h-14 rounded-2xl bg-sky-50 text-sky-700 border border-sky-200 flex items-center justify-center font-bold text-xl">
                  {caregiver.first_name?.[0] || 'C'}{caregiver.last_name?.[0] || ''}
                </div>
                <div>
                  <div className="flex items-center space-x-2.5">
                    <h1 className="text-xl sm:text-2xl font-bold text-slate-900">
                      {caregiver.first_name} {caregiver.last_name}
                    </h1>
                    {caregiver.is_active ? (
                      <span className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-[10px] font-bold bg-emerald-50 text-emerald-700 border border-emerald-200">
                        <span className="w-1.5 h-1.5 rounded-full bg-emerald-500" />
                        Active Caregiver
                      </span>
                    ) : (
                      <span className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-[10px] font-bold bg-rose-50 text-rose-700 border border-rose-200">
                        <span className="w-1.5 h-1.5 rounded-full bg-rose-500" />
                        Inactive Account
                      </span>
                    )}
                  </div>
                  <p className="text-xs text-slate-400 font-mono mt-1">Caregiver Profile ID: {caregiver.id}</p>
                </div>
              </div>

              <div className="flex items-center space-x-2">
                <Link
                  to={`/app/admin/users/${caregiver.user_id}`}
                  className="inline-flex items-center space-x-1 px-3 py-1.5 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-xl text-xs font-semibold transition-colors cursor-pointer"
                >
                  <span>User Account</span>
                  <ExternalLink className="w-3 h-3" />
                </Link>
              </div>
            </div>

            {/* Quick Metrics Bar */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 py-5 border-b border-slate-100">
              <div className="p-4 rounded-xl bg-teal-50/60 border border-teal-200 flex items-center justify-between">
                <div className="flex items-center space-x-3">
                  <div className="w-9 h-9 rounded-lg bg-teal-100 text-teal-700 flex items-center justify-center">
                    <UserCheck className="w-4 h-4" />
                  </div>
                  <div>
                    <p className="text-[11px] font-semibold text-slate-500">Active Patient Caseload</p>
                    <p className="text-lg font-black text-slate-900">{caregiver.linked_patients_count} Patients</p>
                  </div>
                </div>
                <Link
                  to={`/app/admin/relationships?caregiver_id=${caregiver.id}`}
                  className="text-xs font-bold text-teal-700 hover:text-teal-800 flex items-center space-x-1"
                >
                  <span>View Assignments</span>
                  <ExternalLink className="w-3 h-3" />
                </Link>
              </div>

              <div className="p-4 rounded-xl bg-slate-50 border border-slate-200/80 flex items-center space-x-3">
                <div className="w-9 h-9 rounded-lg bg-slate-100 text-slate-600 flex items-center justify-center">
                  <Building className="w-4 h-4" />
                </div>
                <div>
                  <p className="text-[11px] font-semibold text-slate-500">Healthcare Organization</p>
                  <p className="text-sm font-bold text-slate-800">{caregiver.organization || 'Independent Caregiver'}</p>
                </div>
              </div>
            </div>

            {/* Details Grid */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-5 pt-6">
              <div className="space-y-1">
                <span className="text-[11px] font-semibold text-slate-400 uppercase tracking-wider">Email Address</span>
                <div className="flex items-center space-x-2 text-xs font-semibold text-slate-800">
                  <Mail className="w-4 h-4 text-slate-400" />
                  <span>{caregiver.email}</span>
                </div>
              </div>

              <div className="space-y-1">
                <span className="text-[11px] font-semibold text-slate-400 uppercase tracking-wider">Phone Number</span>
                <div className="flex items-center space-x-2 text-xs font-semibold text-slate-800">
                  <Phone className="w-4 h-4 text-slate-400" />
                  <span>{caregiver.phone_number || 'Not provided'}</span>
                </div>
              </div>

              <div className="space-y-1">
                <span className="text-[11px] font-semibold text-slate-400 uppercase tracking-wider">Default Relationship Type</span>
                <div className="text-xs font-semibold text-slate-800">
                  {caregiver.relationship_type || 'General Caregiver'}
                </div>
              </div>

              <div className="space-y-1">
                <span className="text-[11px] font-semibold text-slate-400 uppercase tracking-wider">Registered Since</span>
                <div className="flex items-center space-x-2 text-xs font-semibold text-slate-800">
                  <Calendar className="w-4 h-4 text-slate-400" />
                  <span>{new Date(caregiver.created_at).toLocaleDateString(undefined, { month: 'short', day: 'numeric', year: 'numeric' })}</span>
                </div>
              </div>
            </div>
          </div>
        </div>
      ) : null}
    </div>
  )
}

export default AdminCaregiverDetailPage
