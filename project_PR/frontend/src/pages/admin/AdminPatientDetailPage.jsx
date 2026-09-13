import React, { useState, useEffect, useCallback } from 'react'
import { useParams, Link } from 'react-router-dom'
import { adminService } from '../../services/adminService'
import {
  UserCheck,
  ArrowLeft,
  Mail,
  Phone,
  Calendar,
  AlertCircle,
  RefreshCw,
  HeartHandshake,
  Pill,
  ExternalLink,
  Shield,
  Activity,
  Heart,
} from 'lucide-react'

export const AdminPatientDetailPage = () => {
  const { patientId } = useParams()
  const [patient, setPatient] = useState(null)
  const [isLoading, setIsLoading] = useState(true)
  const [error, setError] = useState(null)
  const [isNotFound, setIsNotFound] = useState(false)

  const fetchPatient = useCallback(async () => {
    setIsLoading(true)
    setError(null)
    setIsNotFound(false)

    try {
      const data = await adminService.getPatientDetail(patientId)
      setPatient(data)
    } catch (err) {
      if (err?.response?.status === 404) {
        setIsNotFound(true)
      } else {
        const detail = err?.response?.data?.detail
        setError(
          typeof detail === 'string'
            ? detail
            : 'Unable to load patient profile. Please try again.'
        )
      }
    } finally {
      setIsLoading(false)
    }
  }, [patientId])

  useEffect(() => {
    fetchPatient()
  }, [fetchPatient])

  if (isNotFound) {
    return (
      <div className="bg-white border border-slate-200/80 rounded-2xl p-12 text-center shadow-xs max-w-lg mx-auto mt-10">
        <div className="w-12 h-12 rounded-full bg-slate-100 border border-slate-200 text-slate-400 flex items-center justify-center mx-auto mb-3">
          <UserCheck className="w-6 h-6" />
        </div>
        <h2 className="text-lg font-bold text-slate-900">Patient Not Found</h2>
        <p className="text-xs text-slate-500 max-w-sm mx-auto mt-1 font-medium">
          The requested patient profile record does not exist or has been removed.
        </p>
        <Link
          to="/app/admin/patients"
          className="mt-5 inline-flex items-center space-x-1.5 px-4 py-2 bg-teal-600 hover:bg-teal-700 text-white rounded-xl text-xs font-semibold transition-colors cursor-pointer shadow-xs"
        >
          <ArrowLeft className="w-3.5 h-3.5" />
          <span>Back to Patient Directory</span>
        </Link>
      </div>
    )
  }

  return (
    <div className="space-y-6 max-w-4xl">
      {/* Navigation Breadcrumb / Back */}
      <div className="flex items-center justify-between">
        <Link
          to="/app/admin/patients"
          className="inline-flex items-center space-x-1.5 text-xs font-bold text-slate-600 hover:text-teal-700 transition-colors cursor-pointer"
        >
          <ArrowLeft className="w-4 h-4" />
          <span>Back to Patients</span>
        </Link>

        <button
          onClick={fetchPatient}
          disabled={isLoading}
          className="inline-flex items-center space-x-1.5 px-3 py-1.5 bg-white border border-slate-200 rounded-xl text-xs font-semibold text-slate-700 hover:bg-slate-50 transition-colors cursor-pointer shadow-2xs"
        >
          <RefreshCw className={`w-3.5 h-3.5 ${isLoading ? 'animate-spin text-teal-600' : ''}`} />
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
          <h3 className="text-base font-bold text-slate-900">Unable to load patient record</h3>
          <p className="text-xs text-slate-500 max-w-md mx-auto mt-1 font-medium">{error}</p>
          <button
            onClick={fetchPatient}
            className="mt-4 inline-flex items-center gap-1.5 px-4 py-2 text-xs font-bold text-teal-700 bg-teal-50 hover:bg-teal-100 border border-teal-200 rounded-xl transition-colors cursor-pointer"
          >
            <RefreshCw className="w-3.5 h-3.5" />
            <span>Try Again</span>
          </button>
        </div>
      ) : patient ? (
        <div className="space-y-6">
          {/* Header Card */}
          <div className="bg-white border border-slate-200/80 rounded-2xl p-6 sm:p-8 shadow-xs">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-6 border-b border-slate-100">
              <div className="flex items-center space-x-4">
                <div className="w-14 h-14 rounded-2xl bg-teal-50 text-teal-700 border border-teal-200 flex items-center justify-center font-bold text-xl">
                  {patient.first_name?.[0] || 'P'}{patient.last_name?.[0] || ''}
                </div>
                <div>
                  <div className="flex items-center space-x-2.5">
                    <h1 className="text-xl sm:text-2xl font-bold text-slate-900">
                      {patient.first_name} {patient.last_name}
                    </h1>
                    {patient.is_active ? (
                      <span className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-[10px] font-bold bg-emerald-50 text-emerald-700 border border-emerald-200">
                        <span className="w-1.5 h-1.5 rounded-full bg-emerald-500" />
                        Active Patient
                      </span>
                    ) : (
                      <span className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-[10px] font-bold bg-rose-50 text-rose-700 border border-rose-200">
                        <span className="w-1.5 h-1.5 rounded-full bg-rose-500" />
                        Inactive Account
                      </span>
                    )}
                  </div>
                  <p className="text-xs text-slate-400 font-mono mt-1">Patient Profile ID: {patient.id}</p>
                </div>
              </div>

              <div className="flex items-center space-x-2">
                <Link
                  to={`/app/admin/users/${patient.user_id}`}
                  className="inline-flex items-center space-x-1 px-3 py-1.5 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-xl text-xs font-semibold transition-colors cursor-pointer"
                >
                  <span>User Account</span>
                  <ExternalLink className="w-3 h-3" />
                </Link>
              </div>
            </div>

            {/* Quick Metrics Bar */}
            <div className="grid grid-cols-2 gap-4 py-5 border-b border-slate-100">
              <div className="p-4 rounded-xl bg-sky-50/60 border border-sky-200 flex items-center justify-between">
                <div className="flex items-center space-x-3">
                  <div className="w-9 h-9 rounded-lg bg-sky-100 text-sky-700 flex items-center justify-center">
                    <HeartHandshake className="w-4 h-4" />
                  </div>
                  <div>
                    <p className="text-[11px] font-semibold text-slate-500">Linked Caregivers</p>
                    <p className="text-lg font-black text-slate-900">{patient.linked_caregivers_count}</p>
                  </div>
                </div>
                <Link
                  to={`/app/admin/relationships?patient_id=${patient.id}`}
                  className="text-xs font-bold text-sky-700 hover:text-sky-800 flex items-center space-x-1"
                >
                  <span>View Links</span>
                  <ExternalLink className="w-3 h-3" />
                </Link>
              </div>

              <div className="p-4 rounded-xl bg-emerald-50/60 border border-emerald-200 flex items-center justify-between">
                <div className="flex items-center space-x-3">
                  <div className="w-9 h-9 rounded-lg bg-emerald-100 text-emerald-700 flex items-center justify-center">
                    <Pill className="w-4 h-4" />
                  </div>
                  <div>
                    <p className="text-[11px] font-semibold text-slate-500">Active Medications</p>
                    <p className="text-lg font-black text-slate-900">{patient.active_medications_count}</p>
                  </div>
                </div>
              </div>
            </div>

            {/* Details Grid */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-5 pt-6">
              <div className="space-y-1">
                <span className="text-[11px] font-semibold text-slate-400 uppercase tracking-wider">Email Address</span>
                <div className="flex items-center space-x-2 text-xs font-semibold text-slate-800">
                  <Mail className="w-4 h-4 text-slate-400" />
                  <span>{patient.email}</span>
                </div>
              </div>

              <div className="space-y-1">
                <span className="text-[11px] font-semibold text-slate-400 uppercase tracking-wider">Phone Number</span>
                <div className="flex items-center space-x-2 text-xs font-semibold text-slate-800">
                  <Phone className="w-4 h-4 text-slate-400" />
                  <span>{patient.phone_number || 'Not provided'}</span>
                </div>
              </div>

              <div className="space-y-1">
                <span className="text-[11px] font-semibold text-slate-400 uppercase tracking-wider">Date of Birth</span>
                <div className="flex items-center space-x-2 text-xs font-semibold text-slate-800">
                  <Calendar className="w-4 h-4 text-slate-400" />
                  <span>{patient.date_of_birth || 'Not recorded'}</span>
                </div>
              </div>

              <div className="space-y-1">
                <span className="text-[11px] font-semibold text-slate-400 uppercase tracking-wider">Gender & Blood Group</span>
                <div className="flex items-center space-x-2 text-xs font-semibold text-slate-800">
                  <Activity className="w-4 h-4 text-slate-400" />
                  <span>{patient.gender || 'Not specified'} • {patient.blood_group || 'Blood group N/A'}</span>
                </div>
              </div>

              <div className="space-y-1">
                <span className="text-[11px] font-semibold text-slate-400 uppercase tracking-wider">Emergency Contact</span>
                <div className="text-xs font-semibold text-slate-800">
                  {patient.emergency_contact_name || 'None listed'}
                  {patient.emergency_contact_phone && ` (${patient.emergency_contact_phone})`}
                </div>
              </div>

              <div className="space-y-1">
                <span className="text-[11px] font-semibold text-slate-400 uppercase tracking-wider">Registered Since</span>
                <div className="flex items-center space-x-2 text-xs font-semibold text-slate-800">
                  <Calendar className="w-4 h-4 text-slate-400" />
                  <span>{new Date(patient.created_at).toLocaleDateString(undefined, { month: 'short', day: 'numeric', year: 'numeric' })}</span>
                </div>
              </div>
            </div>
          </div>

          {/* Medical Summary Card */}
          <div className="bg-white border border-slate-200/80 rounded-2xl p-6 shadow-xs space-y-4">
            <h3 className="text-sm font-bold text-slate-900 flex items-center space-x-2">
              <Heart className="w-4 h-4 text-rose-500" />
              <span>Medical Notes & Baseline Conditions</span>
            </h3>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div className="p-4 rounded-xl bg-slate-50 border border-slate-200/80 space-y-1.5">
                <h4 className="text-xs font-bold text-slate-700">Medical Conditions</h4>
                <p className="text-xs text-slate-600 leading-relaxed">
                  {patient.medical_conditions || 'No known chronic conditions recorded.'}
                </p>
              </div>

              <div className="p-4 rounded-xl bg-slate-50 border border-slate-200/80 space-y-1.5">
                <h4 className="text-xs font-bold text-slate-700">Allergies</h4>
                <p className="text-xs text-slate-600 leading-relaxed">
                  {patient.allergies || 'No documented drug or food allergies.'}
                </p>
              </div>
            </div>
          </div>
        </div>
      ) : null}
    </div>
  )
}

export default AdminPatientDetailPage
