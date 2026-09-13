import React, { useState, useEffect, useCallback } from 'react'
import { useParams, Link } from 'react-router-dom'
import { caregiverService } from '../../services/caregiverService'
import { CaregiverMedicationList } from '../../components/caregiver/CaregiverMedicationList'
import { CaregiverReminderList } from '../../components/caregiver/CaregiverReminderList'
import { CaregiverDoseHistory } from '../../components/caregiver/CaregiverDoseHistory'
import { CaregiverAdherence } from '../../components/caregiver/CaregiverAdherence'
import { CaregiverIntelligence } from '../../components/caregiver/CaregiverIntelligence'
import {
  ArrowLeft,
  Mail,
  Phone,
  Droplet,
  HeartHandshake,
  AlertTriangle,
  Activity,
  Pill,
  Clock,
  History,
  ShieldCheck,
  AlertCircle,
  ShieldAlert,
  RefreshCw,
  CheckCircle2,
  XCircle,
  Sparkles,
} from 'lucide-react'

export const CaregiverPatientDetailPage = () => {
  const { patientId } = useParams()

  // State
  const [patient, setPatient] = useState(null)
  const [medications, setMedications] = useState([])
  const [dueReminders, setDueReminders] = useState([])
  const [upcomingReminders, setUpcomingReminders] = useState([])
  const [doses, setDoses] = useState([])
  const [adherenceData, setAdherenceData] = useState(null)
  const [adherencePeriod, setAdherencePeriod] = useState('today')

  // UI state
  const [activeTab, setActiveTab] = useState('reminders') // 'reminders' | 'medications' | 'doses' | 'adherence' | 'insights'
  const [isLoading, setIsLoading] = useState(true)
  const [isRefreshing, setIsRefreshing] = useState(false)
  const [error, setError] = useState(null)
  const [notFound, setNotFound] = useState(false)

  // Fetch all patient details
  const loadPatientData = useCallback(async (isSilent = false) => {
    if (!patientId) return
    if (isSilent) {
      setIsRefreshing(true)
    } else {
      setIsLoading(true)
    }
    setError(null)
    setNotFound(false)

    try {
      // 1. Fetch patient profile detail
      const patientData = await caregiverService.getPatientDetails(patientId)
      setPatient(patientData)

      // 2. Fetch associated resources in parallel
      const [medsData, dueData, upcomingData, dosesData, adhData] = await Promise.all([
        caregiverService.getPatientMedications(patientId).catch(() => []),
        caregiverService.getPatientRemindersDue(patientId).catch(() => []),
        caregiverService.getPatientRemindersUpcoming(patientId, null, 24).catch(() => []),
        caregiverService.getPatientDoses(patientId).catch(() => []),
        caregiverService.getPatientAdherenceToday(patientId).catch(() => null),
      ])

      setMedications(Array.isArray(medsData) ? medsData : [])
      setDueReminders(Array.isArray(dueData) ? dueData : [])
      setUpcomingReminders(Array.isArray(upcomingData) ? upcomingData : [])
      setDoses(Array.isArray(dosesData) ? dosesData : [])
      setAdherenceData(adhData)
    } catch (err) {
      if (err?.response?.status === 404) {
        setNotFound(true)
      } else {
        setError(err?.response?.data?.detail || 'Unable to load patient information.')
      }
    } finally {
      setIsLoading(false)
      setIsRefreshing(false)
    }
  }, [patientId])

  useEffect(() => {
    loadPatientData()
  }, [loadPatientData])

  // Handle Adherence Period Change
  const handleAdherencePeriodChange = async (period, customParams = {}) => {
    setAdherencePeriod(period)
    try {
      let data = null
      if (period === 'today') {
        data = await caregiverService.getPatientAdherenceToday(patientId)
      } else if (period === 'week') {
        data = await caregiverService.getPatientAdherenceWeek(patientId)
      } else if (period === 'month') {
        data = await caregiverService.getPatientAdherenceMonth(patientId)
      } else if (period === 'custom') {
        data = await caregiverService.getPatientAdherenceRange(patientId, customParams)
      }
      setAdherenceData(data)
    } catch {
      // Keep existing data
    }
  }

  // Handle Dose History Filters
  const handleDoseFilterChange = async (filters) => {
    try {
      const data = await caregiverService.getPatientDoses(patientId, filters)
      setDoses(Array.isArray(data) ? data : [])
    } catch {
      // Keep existing doses
    }
  }

  // 404 Not Found / Unauthorized patient state
  if (notFound) {
    return (
      <div className="p-10 rounded-2xl bg-white border border-slate-200/80 text-center max-w-md mx-auto shadow-xs my-12">
        <div className="w-12 h-12 rounded-2xl bg-rose-50 text-rose-600 flex items-center justify-center mx-auto mb-3">
          <ShieldAlert className="w-6 h-6" />
        </div>
        <h3 className="text-base font-bold text-slate-900 mb-1">Patient Not Found</h3>
        <p className="text-xs text-slate-500 mb-5">
          This patient does not exist or is not actively linked to your caregiver account.
        </p>
        <Link
          to="/app/caregiver/patients"
          className="inline-flex items-center space-x-2 px-4 py-2 bg-slate-900 hover:bg-slate-800 text-white rounded-xl text-xs font-semibold shadow-xs transition-colors"
        >
          <ArrowLeft className="w-3.5 h-3.5" />
          <span>Back to Patients</span>
        </Link>
      </div>
    )
  }

  // Derived metrics from existing adherence & dose events
  const todayAdherenceRate = adherenceData?.adherence_percentage ?? adherenceData?.adherence_rate ?? null
  const takenToday = adherenceData?.taken_doses ?? adherenceData?.taken_count ?? 0
  const skippedToday = adherenceData?.skipped_doses ?? adherenceData?.skipped_count ?? 0
  const dueCount = dueReminders.length
  const upcomingCount = upcomingReminders.length

  return (
    <div className="space-y-6">
      {/* Top Bar: Back button & Refresh */}
      <div className="flex items-center justify-between">
        <Link
          to="/app/caregiver/patients"
          className="inline-flex items-center space-x-2 text-xs font-semibold text-slate-600 hover:text-slate-900 transition-colors cursor-pointer"
        >
          <ArrowLeft className="w-4 h-4" />
          <span>Back to Linked Patients</span>
        </Link>

        <button
          onClick={() => loadPatientData(true)}
          disabled={isLoading || isRefreshing}
          className="inline-flex items-center space-x-1.5 px-3 py-1.5 rounded-xl bg-white hover:bg-slate-50 text-slate-600 text-xs font-medium border border-slate-200/80 shadow-2xs transition-colors cursor-pointer disabled:opacity-50"
        >
          <RefreshCw className={`w-3.5 h-3.5 ${isRefreshing ? 'animate-spin text-sky-600' : ''}`} />
          <span>{isRefreshing ? 'Refreshing...' : 'Refresh Data'}</span>
        </button>
      </div>

      {/* Loading Skeleton */}
      {isLoading && (
        <div className="space-y-6 animate-pulse">
          <div className="bg-white p-6 rounded-2xl border border-slate-200/80 h-44"></div>
          <div className="grid grid-cols-2 sm:grid-cols-5 gap-3.5">
            {[1, 2, 3, 4, 5].map((i) => (
              <div key={i} className="h-20 bg-slate-100 rounded-2xl"></div>
            ))}
          </div>
          <div className="bg-white p-6 rounded-2xl border border-slate-200/80 h-72"></div>
        </div>
      )}

      {/* Error state */}
      {!isLoading && error && (
        <div className="p-8 rounded-2xl bg-rose-50 border border-rose-200 text-center max-w-lg mx-auto">
          <AlertCircle className="w-10 h-10 text-rose-500 mx-auto mb-2" />
          <h3 className="text-sm font-bold text-rose-900 mb-1">Failed to load patient</h3>
          <p className="text-xs text-rose-600 mb-4">{error}</p>
          <button
            onClick={() => loadPatientData()}
            className="px-4 py-2 bg-rose-600 hover:bg-rose-700 text-white rounded-xl text-xs font-semibold shadow-xs transition-colors cursor-pointer"
          >
            Retry
          </button>
        </div>
      )}

      {/* Patient Profile Card & Monitoring Summary */}
      {!isLoading && !error && patient && (
        <>
          {/* Patient Info Header Card */}
          <div className="bg-white rounded-2xl border border-slate-200/80 p-5 sm:p-6 shadow-xs">
            <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-5">
              <div className="flex items-start space-x-4">
                <div className="w-14 h-14 rounded-2xl bg-gradient-to-tr from-sky-500 to-teal-500 flex items-center justify-center text-white font-black text-xl shadow-xs shrink-0">
                  {patient.first_name ? patient.first_name[0].toUpperCase() : 'P'}
                </div>
                <div className="min-w-0">
                  <div className="flex items-center space-x-2.5 flex-wrap gap-y-1">
                    <h1 className="text-xl sm:text-2xl font-bold text-slate-900 tracking-tight truncate">
                      {patient.first_name} {patient.last_name}
                    </h1>
                    <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-bold bg-sky-50 text-sky-700 border border-sky-200">
                      <HeartHandshake className="w-3 h-3 mr-1" />
                      {patient.relationship_type || 'Patient'}
                    </span>
                    {patient.permission_level && (
                      <span className="inline-flex items-center px-2 py-0.5 rounded-full text-[10px] font-medium bg-slate-100 text-slate-600 border border-slate-200">
                        <ShieldCheck className="w-3 h-3 mr-1 text-slate-500" />
                        {patient.permission_level.replace('_', ' ')}
                      </span>
                    )}
                  </div>

                  <div className="flex items-center space-x-4 mt-2 text-xs text-slate-600 flex-wrap gap-y-1">
                    <span className="flex items-center">
                      <Mail className="w-3.5 h-3.5 mr-1.5 text-slate-400" />
                      {patient.email}
                    </span>
                    {patient.phone_number && (
                      <span className="flex items-center">
                        <Phone className="w-3.5 h-3.5 mr-1.5 text-slate-400" />
                        {patient.phone_number}
                      </span>
                    )}
                    {patient.blood_group && (
                      <span className="flex items-center font-semibold text-rose-600">
                        <Droplet className="w-3.5 h-3.5 mr-1" />
                        Blood Group: {patient.blood_group}
                      </span>
                    )}
                  </div>
                </div>
              </div>

              {/* Status capsule */}
              <div className="flex items-center space-x-3 shrink-0">
                {dueCount > 0 ? (
                  <div className="flex items-center space-x-2 px-3 py-1.5 rounded-xl bg-amber-50 text-amber-800 border border-amber-200 text-xs font-bold">
                    <AlertTriangle className="w-4 h-4 text-amber-600 shrink-0" />
                    <span>{dueCount} Doses Due Now</span>
                  </div>
                ) : (
                  <div className="flex items-center space-x-2 px-3 py-1.5 rounded-xl bg-emerald-50 text-emerald-800 border border-emerald-200 text-xs font-semibold">
                    <CheckCircle2 className="w-4 h-4 text-emerald-600" />
                    <span>All Doses Up to Date</span>
                  </div>
                )}
              </div>
            </div>

            {/* Medical Highlights */}
            {(patient.allergies || patient.medical_conditions || patient.emergency_contact_name) && (
              <div className="grid grid-cols-1 md:grid-cols-3 gap-3.5 mt-5 pt-4 border-t border-slate-100 text-xs">
                {patient.allergies && (
                  <div className="bg-rose-50/50 p-2.5 rounded-xl border border-rose-100/80">
                    <span className="font-bold text-rose-700 block mb-0.5">Allergies</span>
                    <span className="text-slate-700">{patient.allergies}</span>
                  </div>
                )}
                {patient.medical_conditions && (
                  <div className="bg-amber-50/50 p-2.5 rounded-xl border border-amber-100/80">
                    <span className="font-bold text-amber-700 block mb-0.5">Medical Conditions</span>
                    <span className="text-slate-700">{patient.medical_conditions}</span>
                  </div>
                )}
                {patient.emergency_contact_name && (
                  <div className="bg-sky-50/50 p-2.5 rounded-xl border border-sky-100/80">
                    <span className="font-bold text-sky-700 block mb-0.5">Emergency Contact</span>
                    <span className="text-slate-700">
                      {patient.emergency_contact_name}{' '}
                      {patient.emergency_contact_phone && `(${patient.emergency_contact_phone})`}
                    </span>
                  </div>
                )}
              </div>
            )}
          </div>

          {/* Compact Patient Monitoring Summary Cards */}
          <div className="grid grid-cols-2 sm:grid-cols-5 gap-3.5">
            {/* Today's Adherence */}
            <div className="bg-white p-4 rounded-2xl border border-slate-200/80 shadow-xs flex flex-col justify-between">
              <div className="flex items-center justify-between text-xs text-slate-500 font-semibold">
                <span>Today's Adherence</span>
                <Activity className="w-3.5 h-3.5 text-teal-600" />
              </div>
              <p
                className={`text-xl font-black mt-2 ${
                  todayAdherenceRate !== null && todayAdherenceRate >= 80
                    ? 'text-emerald-700'
                    : todayAdherenceRate !== null && todayAdherenceRate >= 50
                    ? 'text-amber-700'
                    : todayAdherenceRate !== null
                    ? 'text-rose-700'
                    : 'text-slate-900'
                }`}
              >
                {todayAdherenceRate !== null ? `${todayAdherenceRate}%` : 'N/A'}
              </p>
            </div>

            {/* Doses Taken Today */}
            <div className="bg-white p-4 rounded-2xl border border-slate-200/80 shadow-xs flex flex-col justify-between">
              <div className="flex items-center justify-between text-xs text-slate-500 font-semibold">
                <span>Taken Today</span>
                <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600" />
              </div>
              <p className="text-xl font-black text-emerald-700 mt-2">{takenToday}</p>
            </div>

            {/* Doses Skipped Today */}
            <div className="bg-white p-4 rounded-2xl border border-slate-200/80 shadow-xs flex flex-col justify-between">
              <div className="flex items-center justify-between text-xs text-slate-500 font-semibold">
                <span>Skipped Today</span>
                <XCircle className="w-3.5 h-3.5 text-rose-600" />
              </div>
              <p className={`text-xl font-black mt-2 ${skippedToday > 0 ? 'text-rose-700' : 'text-slate-900'}`}>
                {skippedToday}
              </p>
            </div>

            {/* Doses Due Now */}
            <div className="bg-white p-4 rounded-2xl border border-slate-200/80 shadow-xs flex flex-col justify-between">
              <div className="flex items-center justify-between text-xs text-slate-500 font-semibold">
                <span>Due Now</span>
                <Clock className="w-3.5 h-3.5 text-amber-600" />
              </div>
              <p className={`text-xl font-black mt-2 ${dueCount > 0 ? 'text-amber-600' : 'text-slate-900'}`}>
                {dueCount}
              </p>
            </div>

            {/* Upcoming in 24h */}
            <div className="bg-white p-4 rounded-2xl border border-slate-200/80 shadow-xs flex flex-col justify-between col-span-2 sm:col-span-1">
              <div className="flex items-center justify-between text-xs text-slate-500 font-semibold">
                <span>Upcoming (24h)</span>
                <Pill className="w-3.5 h-3.5 text-sky-600" />
              </div>
              <p className="text-xl font-black text-slate-900 mt-2">{upcomingCount}</p>
            </div>
          </div>

          {/* Navigation Tabs */}
          <div className="flex items-center space-x-2 border-b border-slate-200/80 overflow-x-auto pb-1 text-xs">
            {[
              { id: 'reminders', label: 'Reminders & Schedule', icon: Clock, count: dueCount },
              { id: 'medications', label: 'Medications', icon: Pill, count: medications.length },
              { id: 'doses', label: 'Dose History', icon: History, count: doses.length },
              { id: 'adherence', label: 'Adherence Insights', icon: Activity },
              { id: 'insights', label: 'Smart Insights & Trends', icon: Sparkles },
            ].map((tab) => {
              const Icon = tab.icon
              const isActive = activeTab === tab.id
              return (
                <button
                  key={tab.id}
                  onClick={() => setActiveTab(tab.id)}
                  className={`flex items-center space-x-2 px-4 py-2.5 rounded-xl font-bold transition-all shrink-0 cursor-pointer ${
                    isActive
                      ? 'bg-slate-900 text-white shadow-2xs'
                      : 'text-slate-600 hover:text-slate-900 hover:bg-slate-100'
                  }`}
                >
                  <Icon className={`w-3.5 h-3.5 ${isActive ? 'text-teal-400' : 'text-slate-400'}`} />
                  <span>{tab.label}</span>
                  {tab.count !== undefined && (
                    <span
                      className={`text-[10px] px-1.5 py-0.2 rounded-full font-bold ${
                        isActive ? 'bg-slate-800 text-slate-200' : 'bg-slate-100 text-slate-600'
                      }`}
                    >
                      {tab.count}
                    </span>
                  )}
                </button>
              )
            })}
          </div>

          {/* Tab Content Panes */}
          <div>
            {activeTab === 'reminders' && (
              <CaregiverReminderList
                dueReminders={dueReminders}
                upcomingReminders={upcomingReminders}
              />
            )}

            {activeTab === 'medications' && (
              <CaregiverMedicationList medications={medications} />
            )}

            {activeTab === 'doses' && (
              <CaregiverDoseHistory
                doses={doses}
                onFilterChange={handleDoseFilterChange}
              />
            )}

            {activeTab === 'adherence' && (
              <CaregiverAdherence
                adherenceData={adherenceData}
                activePeriod={adherencePeriod}
                onPeriodChange={handleAdherencePeriodChange}
              />
            )}

            {activeTab === 'insights' && (
              <CaregiverIntelligence
                patientId={patientId}
                patientName={`${patient.first_name} ${patient.last_name}`}
              />
            )}
          </div>
        </>
      )}
    </div>
  )
}

export default CaregiverPatientDetailPage
