import React, { useState, useEffect } from 'react'
import { useAuth } from '../../context/AuthContext'
import { patientService } from '../../services/patientService'
import {
  User,
  Mail,
  Phone,
  Calendar,
  Heart,
  AlertCircle,
  CheckCircle2,
  Edit3,
  X,
  Save,
  ShieldCheck,
  Activity,
  AlertTriangle,
  Stethoscope,
  PhoneCall,
  Lock,
} from 'lucide-react'

export const ProfilePage = () => {
  const { user, updateUser } = useAuth()
  const isPatient = user?.role === 'PATIENT'

  const [profile, setProfile] = useState(null)
  const [formData, setFormData] = useState({})
  const [isEditing, setIsEditing] = useState(false)
  const [isLoading, setIsLoading] = useState(true)
  const [isSaving, setIsSaving] = useState(false)
  const [error, setError] = useState(null)
  const [successMessage, setSuccessMessage] = useState(null)
  const [validationErrors, setValidationErrors] = useState({})

  // Fetch patient profile on mount if user is a patient
  useEffect(() => {
    if (!isPatient) {
      setIsLoading(false)
      return
    }

    const fetchProfile = async () => {
      setIsLoading(true)
      setError(null)
      try {
        const data = await patientService.getMyProfile()
        setProfile(data)
        setFormData({
          first_name: data.first_name || '',
          last_name: data.last_name || '',
          phone_number: data.phone_number || '',
          date_of_birth: data.date_of_birth || '',
          gender: data.gender || '',
          blood_group: data.blood_group || '',
          allergies: data.allergies || '',
          medical_conditions: data.medical_conditions || '',
          emergency_contact_name: data.emergency_contact_name || '',
          emergency_contact_phone: data.emergency_contact_phone || '',
        })
      } catch (err) {
        if (err.response?.status === 403) {
          setError('Access to clinical profile is restricted to Patient accounts.')
        } else {
          setError('Unable to load patient profile from the server. Please try again.')
        }
      } finally {
        setIsLoading(false)
      }
    }

    fetchProfile()
  }, [isPatient])

  const handleInputChange = (e) => {
    const { name, value } = e.target
    setFormData((prev) => ({ ...prev, [name]: value }))
    if (validationErrors[name]) {
      setValidationErrors((prev) => ({ ...prev, [name]: null }))
    }
    if (error) setError(null)
  }

  const validateForm = () => {
    const errs = {}
    if (!formData.first_name?.trim()) {
      errs.first_name = 'First name is required'
    }
    if (!formData.last_name?.trim()) {
      errs.last_name = 'Last name is required'
    }
    if (formData.date_of_birth) {
      const selectedDate = new Date(formData.date_of_birth)
      const today = new Date()
      if (selectedDate > today) {
        errs.date_of_birth = 'Date of birth cannot be in the future'
      }
    }
    setValidationErrors(errs)
    return Object.keys(errs).length === 0
  }

  const handleStartEdit = (targetInputId = null) => {
    setFormData({
      first_name: profile?.first_name || '',
      last_name: profile?.last_name || '',
      phone_number: profile?.phone_number || '',
      date_of_birth: profile?.date_of_birth || '',
      gender: profile?.gender || '',
      blood_group: profile?.blood_group || '',
      allergies: profile?.allergies || '',
      medical_conditions: profile?.medical_conditions || '',
      emergency_contact_name: profile?.emergency_contact_name || '',
      emergency_contact_phone: profile?.emergency_contact_phone || '',
    })
    setValidationErrors({})
    setError(null)
    setSuccessMessage(null)
    setIsEditing(true)

    if (targetInputId) {
      setTimeout(() => {
        const el = document.getElementById(targetInputId)
        if (el) {
          el.focus()
          el.scrollIntoView({ behavior: 'smooth', block: 'center' })
        }
      }, 100)
    }
  }

  const handleCancelEdit = () => {
    setIsEditing(false)
    setValidationErrors({})
    setError(null)
    // Restore previous saved values
    if (profile) {
      setFormData({
        first_name: profile.first_name || '',
        last_name: profile.last_name || '',
        phone_number: profile.phone_number || '',
        date_of_birth: profile.date_of_birth || '',
        gender: profile.gender || '',
        blood_group: profile.blood_group || '',
        allergies: profile.allergies || '',
        medical_conditions: profile.medical_conditions || '',
        emergency_contact_name: profile.emergency_contact_name || '',
        emergency_contact_phone: profile.emergency_contact_phone || '',
      })
    }
  }

  const handleSaveProfile = async (e) => {
    if (e && e.preventDefault) e.preventDefault()
    if (!validateForm()) return

    setIsSaving(true)
    setError(null)
    setSuccessMessage(null)

    const payload = {
      first_name: formData.first_name.trim(),
      last_name: formData.last_name.trim(),
      phone_number: formData.phone_number.trim() || null,
      date_of_birth: formData.date_of_birth || null,
      gender: formData.gender || null,
      blood_group: formData.blood_group.trim() || null,
      allergies: formData.allergies.trim() || null,
      medical_conditions: formData.medical_conditions.trim() || null,
      emergency_contact_name: formData.emergency_contact_name.trim() || null,
      emergency_contact_phone: formData.emergency_contact_phone.trim() || null,
    }

    try {
      const updatedData = await patientService.updateMyProfile(payload)
      setProfile(updatedData)
      if (updateUser) {
        updateUser({
          first_name: updatedData.first_name,
          last_name: updatedData.last_name,
          phone_number: updatedData.phone_number,
        })
      }
      setIsEditing(false)
      setSuccessMessage('Profile details updated successfully!')
      setTimeout(() => setSuccessMessage(null), 4000)
    } catch (err) {
      if (err.response?.status === 422) {
        const detail = err.response.data?.detail
        if (Array.isArray(detail) && detail.length > 0) {
          setError(detail[0]?.msg || 'Validation failed. Please verify the submitted data.')
        } else {
          setError('Please check your submitted form values.')
        }
      } else if (err.response?.status === 403) {
        setError('You are not authorized to modify this patient profile.')
      } else {
        setError('Failed to update profile. Please check your network connection.')
      }
    } finally {
      setIsSaving(false)
    }
  }

  // Skeleton / Loading State
  if (isLoading) {
    return (
      <div className="space-y-6 max-w-4xl">
        <div className="flex items-center justify-between">
          <div className="h-8 w-48 bg-slate-200 rounded-lg animate-pulse"></div>
          <div className="h-9 w-28 bg-slate-200 rounded-lg animate-pulse"></div>
        </div>
        <div className="bg-white border border-slate-200/80 rounded-2xl p-6 space-y-6 shadow-xs">
          <div className="flex items-center space-x-4">
            <div className="w-16 h-16 rounded-2xl bg-slate-200 animate-pulse"></div>
            <div className="space-y-2">
              <div className="h-5 w-40 bg-slate-200 rounded animate-pulse"></div>
              <div className="h-3 w-28 bg-slate-200 rounded animate-pulse"></div>
            </div>
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 pt-4">
            {[...Array(6)].map((_, i) => (
              <div key={i} className="h-20 bg-slate-100 rounded-xl animate-pulse"></div>
            ))}
          </div>
        </div>
      </div>
    )
  }

  return (
    <div className="space-y-6 max-w-4xl">
      {/* Page Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-slate-900 tracking-tight">Patient Profile</h1>
          <p className="text-xs sm:text-sm text-slate-500 mt-1 font-medium">
            Personal health details and emergency contact records
          </p>
        </div>

        {isPatient && !isEditing && (
          <button
            onClick={handleStartEdit}
            className="inline-flex items-center space-x-2 px-4 py-2 rounded-xl bg-teal-50 hover:bg-teal-100 text-teal-700 border border-teal-200 text-xs font-bold shadow-xs transition-all cursor-pointer"
          >
            <Edit3 className="w-4 h-4" />
            <span>Edit Profile</span>
          </button>
        )}
      </div>

      {/* Alerts */}
      {error && (
        <div className="p-4 rounded-xl bg-rose-50 border border-rose-200 flex items-start space-x-3 text-rose-700 text-xs shadow-xs font-medium">
          <AlertCircle className="w-4 h-4 text-rose-600 shrink-0 mt-0.5" />
          <span>{error}</span>
        </div>
      )}

      {successMessage && (
        <div className="p-4 rounded-xl bg-emerald-50 border border-emerald-200 flex items-start space-x-3 text-emerald-700 text-xs shadow-xs font-medium">
          <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0 mt-0.5" />
          <span>{successMessage}</span>
        </div>
      )}

      {/* Non-Patient View Warning */}
      {!isPatient && (
        <div className="p-5 rounded-2xl bg-white border border-slate-200/80 shadow-xs space-y-4">
          <div className="flex items-center space-x-3 pb-4 border-b border-slate-100">
            <div className="w-12 h-12 rounded-xl bg-teal-50 text-teal-700 border border-teal-200 flex items-center justify-center font-bold text-lg">
              {user?.first_name ? user.first_name[0].toUpperCase() : 'U'}
            </div>
            <div>
              <h2 className="text-lg font-bold text-slate-900">
                {user?.first_name} {user?.last_name}
              </h2>
              <span className="inline-flex items-center px-2 py-0.5 rounded-full text-[10px] font-bold uppercase tracking-wider bg-teal-50 text-teal-700 border border-teal-200">
                {user?.role}
              </span>
            </div>
          </div>

          <div className="p-4 rounded-xl bg-slate-50 border border-slate-200/80 text-xs text-slate-600 flex items-start space-x-3 font-medium">
            <Lock className="w-4 h-4 text-teal-600 shrink-0 mt-0.5" />
            <p>
              Detailed clinical health records (allergies, medical conditions, blood group) are managed under Patient
              accounts. Caregiver management and assignment tools will be accessible in upcoming updates.
            </p>
          </div>
        </div>
      )}

      {/* Patient Profile Content */}
      {isPatient && (
        <div className="bg-white border border-slate-200/80 rounded-2xl p-6 sm:p-8 shadow-xs">
          {/* Identity Header */}
          <div className="flex items-center space-x-4 pb-6 border-b border-slate-100">
            <div className="w-16 h-16 rounded-2xl bg-teal-600 flex items-center justify-center text-white text-2xl font-bold shadow-sm shadow-teal-600/20">
              {profile?.first_name ? profile.first_name[0].toUpperCase() : 'P'}
            </div>
            <div>
              <div className="flex items-center space-x-2.5">
                <h2 className="text-xl font-bold text-slate-900">
                  {profile?.first_name} {profile?.last_name}
                </h2>
                <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-[10px] font-bold uppercase tracking-wider bg-teal-50 text-teal-700 border border-teal-200">
                  Patient
                </span>
              </div>
              <p className="text-xs text-slate-500 mt-1 flex items-center space-x-1.5 font-medium">
                <Mail className="w-3.5 h-3.5 text-slate-400" />
                <span>{profile?.email}</span>
              </p>
            </div>
          </div>

          {/* View Mode */}
          {!isEditing ? (
            <div className="space-y-6 pt-6">
              {/* Section: Personal Information */}
              <div>
                <div className="flex items-center justify-between mb-3">
                  <h3 className="text-xs font-bold text-teal-700 uppercase tracking-wider flex items-center space-x-2">
                    <User className="w-4 h-4" />
                    <span>Personal Details</span>
                  </h3>
                  <button
                    type="button"
                    onClick={() => handleStartEdit('personal_first_name')}
                    className="inline-flex items-center space-x-1.5 px-3 py-1.5 rounded-xl text-xs font-bold text-teal-700 bg-teal-50 hover:bg-teal-100 border border-teal-200 transition-all cursor-pointer shadow-2xs group"
                  >
                    <Edit3 className="w-3.5 h-3.5 group-hover:scale-110 transition-transform" />
                    <span>Edit Personal Details</span>
                  </button>
                </div>
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
                  <div className="p-3.5 rounded-xl bg-slate-50 border border-slate-200/80 shadow-xs">
                    <p className="text-[11px] font-semibold text-slate-500">Phone Number</p>
                    <p className="text-xs font-bold text-slate-800 mt-1">
                      {profile?.phone_number || <span className="text-slate-400 font-normal">Not provided</span>}
                    </p>
                  </div>

                  <div className="p-3.5 rounded-xl bg-slate-50 border border-slate-200/80 shadow-xs">
                    <p className="text-[11px] font-semibold text-slate-500">Date of Birth</p>
                    <p className="text-xs font-bold text-slate-800 mt-1">
                      {profile?.date_of_birth || <span className="text-slate-400 font-normal">Not set</span>}
                    </p>
                  </div>

                  <div className="p-3.5 rounded-xl bg-slate-50 border border-slate-200/80 shadow-xs">
                    <p className="text-[11px] font-semibold text-slate-500">Gender</p>
                    <p className="text-xs font-bold text-slate-800 mt-1">
                      {profile?.gender ? profile.gender.replace(/_/g, ' ') : <span className="text-slate-400 font-normal">Not set</span>}
                    </p>
                  </div>
                </div>
              </div>

              {/* Section: Clinical & Medical Information */}
              <div className="pt-2 border-t border-slate-100">
                <div className="flex items-center justify-between mb-3">
                  <h3 className="text-xs font-bold text-teal-700 uppercase tracking-wider flex items-center space-x-2">
                    <Stethoscope className="w-4 h-4" />
                    <span>Clinical Information</span>
                  </h3>
                  <button
                    type="button"
                    onClick={() => handleStartEdit('clinical_blood_group')}
                    className="inline-flex items-center space-x-1.5 px-3 py-1.5 rounded-xl text-xs font-bold text-teal-700 bg-teal-50 hover:bg-teal-100 border border-teal-200 transition-all cursor-pointer shadow-2xs group"
                  >
                    <Edit3 className="w-3.5 h-3.5 group-hover:scale-110 transition-transform" />
                    <span>Edit Clinical Info</span>
                  </button>
                </div>
                <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                  <div className="p-3.5 rounded-xl bg-slate-50 border border-slate-200/80 shadow-xs">
                    <p className="text-[11px] font-semibold text-slate-500">Blood Group</p>
                    <p className="text-xs font-bold text-slate-800 mt-1">
                      {profile?.blood_group || <span className="text-slate-400 font-normal">Not specified</span>}
                    </p>
                  </div>

                  <div className="p-3.5 rounded-xl bg-slate-50 border border-slate-200/80 sm:col-span-2 shadow-xs">
                    <p className="text-[11px] font-semibold text-slate-500">Known Allergies</p>
                    <p className="text-xs font-bold text-slate-800 mt-1">
                      {profile?.allergies || <span className="text-slate-400 font-normal">No allergies recorded</span>}
                    </p>
                  </div>

                  <div className="p-3.5 rounded-xl bg-slate-50 border border-slate-200/80 sm:col-span-3 shadow-xs">
                    <p className="text-[11px] font-semibold text-slate-500">Medical Conditions</p>
                    <p className="text-xs font-bold text-slate-800 mt-1">
                      {profile?.medical_conditions || <span className="text-slate-400 font-normal">No conditions recorded</span>}
                    </p>
                  </div>
                </div>
              </div>

              {/* Section: Emergency Contact */}
              <div className="pt-2 border-t border-slate-100">
                <div className="flex items-center justify-between mb-3">
                  <h3 className="text-xs font-bold text-teal-700 uppercase tracking-wider flex items-center space-x-2">
                    <PhoneCall className="w-4 h-4" />
                    <span>Emergency Contact</span>
                  </h3>
                  <button
                    type="button"
                    onClick={() => handleStartEdit('emergency_contact_name')}
                    className="inline-flex items-center space-x-1.5 px-3 py-1.5 rounded-xl text-xs font-bold text-teal-700 bg-teal-50 hover:bg-teal-100 border border-teal-200 transition-all cursor-pointer shadow-2xs group"
                  >
                    <Edit3 className="w-3.5 h-3.5 group-hover:scale-110 transition-transform" />
                    <span>Edit Emergency Contact</span>
                  </button>
                </div>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div className="p-3.5 rounded-xl bg-slate-50 border border-slate-200/80 shadow-xs">
                    <p className="text-[11px] font-semibold text-slate-500">Contact Name</p>
                    <p className="text-xs font-bold text-slate-800 mt-1">
                      {profile?.emergency_contact_name || <span className="text-slate-400 font-normal">Not provided</span>}
                    </p>
                  </div>

                  <div className="p-3.5 rounded-xl bg-slate-50 border border-slate-200/80 shadow-xs">
                    <p className="text-[11px] font-semibold text-slate-500">Contact Phone</p>
                    <p className="text-xs font-bold text-slate-800 mt-1">
                      {profile?.emergency_contact_phone || <span className="text-slate-400 font-normal">Not provided</span>}
                    </p>
                  </div>
                </div>
              </div>

              {/* Bottom Quick Action Banner */}
              <div className="pt-4 border-t border-slate-100">
                <div className="flex flex-col sm:flex-row items-center justify-between gap-4 bg-gradient-to-r from-teal-50/70 via-slate-50 to-teal-50/40 p-4 sm:p-5 rounded-2xl border border-teal-200/60 shadow-xs">
                  <div className="flex items-center space-x-3.5">
                    <div className="w-10 h-10 rounded-xl bg-teal-600 text-white flex items-center justify-center shrink-0 shadow-sm shadow-teal-600/20">
                      <Edit3 className="w-5 h-5" />
                    </div>
                    <div>
                      <p className="text-sm font-bold text-slate-900">Need to update your personal details?</p>
                      <p className="text-xs text-slate-500 mt-0.5">
                        Change your phone number, date of birth, emergency contact, or medical conditions anytime.
                      </p>
                    </div>
                  </div>
                  <button
                    type="button"
                    onClick={() => handleStartEdit('personal_first_name')}
                    className="w-full sm:w-auto inline-flex items-center justify-center space-x-2 px-5 py-2.5 rounded-xl bg-teal-600 hover:bg-teal-700 text-white text-xs font-bold shadow-sm shadow-teal-600/20 transition-all cursor-pointer hover:shadow-md shrink-0"
                  >
                    <Edit3 className="w-4 h-4" />
                    <span>Change Personal Details</span>
                  </button>
                </div>
              </div>
            </div>
          ) : (
            /* Edit Mode Form */
            <form onSubmit={handleSaveProfile} className="space-y-6 pt-6" noValidate>
              {/* Sticky / Notice Banner for Editing */}
              <div className="flex items-center justify-between p-3.5 rounded-xl bg-teal-50/90 border border-teal-200">
                <div className="flex items-center space-x-2">
                  <span className="w-2.5 h-2.5 rounded-full bg-teal-600 animate-pulse"></span>
                  <p className="text-xs font-bold text-teal-900">Editing Profile & Personal Details</p>
                </div>
                <div className="flex items-center space-x-2">
                  <button
                    type="button"
                    onClick={handleCancelEdit}
                    disabled={isSaving}
                    className="px-3 py-1.5 rounded-lg bg-white hover:bg-slate-100 text-slate-700 text-xs font-semibold border border-slate-200 transition-all cursor-pointer"
                  >
                    Cancel
                  </button>
                  <button
                    type="submit"
                    disabled={isSaving}
                    className="inline-flex items-center space-x-1.5 px-3.5 py-1.5 rounded-lg bg-teal-600 hover:bg-teal-700 text-white text-xs font-bold shadow-sm shadow-teal-600/20 transition-all cursor-pointer disabled:opacity-60"
                  >
                    <Save className="w-3.5 h-3.5" />
                    <span>Save</span>
                  </button>
                </div>
              </div>

              {/* Personal Details Inputs */}
              <div>
                <h3 className="text-xs font-bold text-teal-700 uppercase tracking-wider mb-3 flex items-center space-x-2">
                  <User className="w-4 h-4" />
                  <span>Personal Details</span>
                </h3>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div>
                    <label className="block text-xs font-bold text-slate-700 mb-1">
                      First name *
                    </label>
                    <input
                      id="personal_first_name"
                      type="text"
                      name="first_name"
                      value={formData.first_name}
                      onChange={handleInputChange}
                      className={`w-full px-3 py-2 bg-white border rounded-xl text-xs text-slate-900 placeholder:text-slate-400 focus:outline-none focus:ring-4 transition-all ${
                        validationErrors.first_name
                          ? 'border-rose-400 focus:ring-rose-500/20'
                          : 'border-slate-200 focus:border-teal-500 focus:ring-teal-500/10'
                      }`}
                    />
                    {validationErrors.first_name && (
                      <p className="text-[11px] text-rose-600 mt-1 font-medium">{validationErrors.first_name}</p>
                    )}
                  </div>

                  <div>
                    <label className="block text-xs font-bold text-slate-700 mb-1">
                      Last name *
                    </label>
                    <input
                      id="personal_last_name"
                      type="text"
                      name="last_name"
                      value={formData.last_name}
                      onChange={handleInputChange}
                      className={`w-full px-3 py-2 bg-white border rounded-xl text-xs text-slate-900 placeholder:text-slate-400 focus:outline-none focus:ring-4 transition-all ${
                        validationErrors.last_name
                          ? 'border-rose-400 focus:ring-rose-500/20'
                          : 'border-slate-200 focus:border-teal-500 focus:ring-teal-500/10'
                      }`}
                    />
                    {validationErrors.last_name && (
                      <p className="text-[11px] text-rose-600 mt-1 font-medium">{validationErrors.last_name}</p>
                    )}
                  </div>

                  <div>
                    <label className="block text-xs font-bold text-slate-700 mb-1">
                      Phone number
                    </label>
                    <input
                      id="personal_phone_number"
                      type="tel"
                      name="phone_number"
                      value={formData.phone_number}
                      onChange={handleInputChange}
                      placeholder="+1 (555) 000-0000"
                      className="w-full px-3 py-2 bg-white border border-slate-200 rounded-xl text-xs text-slate-900 placeholder:text-slate-400 focus:outline-none focus:border-teal-500 focus:ring-4 focus:ring-teal-500/10 transition-all"
                    />
                  </div>

                  <div>
                    <label className="block text-xs font-bold text-slate-700 mb-1">
                      Date of birth
                    </label>
                    <input
                      id="personal_date_of_birth"
                      type="date"
                      name="date_of_birth"
                      value={formData.date_of_birth}
                      onChange={handleInputChange}
                      className={`w-full px-3 py-2 bg-white border rounded-xl text-xs text-slate-900 focus:outline-none focus:ring-4 transition-all ${
                        validationErrors.date_of_birth
                          ? 'border-rose-400 focus:ring-rose-500/20'
                          : 'border-slate-200 focus:border-teal-500 focus:ring-teal-500/10'
                      }`}
                    />
                    {validationErrors.date_of_birth && (
                      <p className="text-[11px] text-rose-600 mt-1 font-medium">{validationErrors.date_of_birth}</p>
                    )}
                  </div>

                  <div>
                    <label className="block text-xs font-bold text-slate-700 mb-1">
                      Gender
                    </label>
                    <select
                      id="personal_gender"
                      name="gender"
                      value={formData.gender}
                      onChange={handleInputChange}
                      className="w-full px-3 py-2 bg-white border border-slate-200 rounded-xl text-xs text-slate-900 focus:outline-none focus:border-teal-500 focus:ring-4 focus:ring-teal-500/10 transition-all"
                    >
                      <option value="">Select gender</option>
                      <option value="MALE">Male</option>
                      <option value="FEMALE">Female</option>
                      <option value="OTHER">Other</option>
                      <option value="PREFER_NOT_TO_SAY">Prefer not to say</option>
                    </select>
                  </div>
                </div>
              </div>

              {/* Clinical Information Inputs */}
              <div className="pt-2 border-t border-slate-100">
                <h3 className="text-xs font-bold text-teal-700 uppercase tracking-wider mb-3 flex items-center space-x-2">
                  <Stethoscope className="w-4 h-4" />
                  <span>Clinical Details</span>
                </h3>
                <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                  <div>
                    <label className="block text-xs font-bold text-slate-700 mb-1">
                      Blood group
                    </label>
                    <input
                      id="clinical_blood_group"
                      type="text"
                      name="blood_group"
                      value={formData.blood_group}
                      onChange={handleInputChange}
                      placeholder="e.g. O+, A+, B-"
                      className="w-full px-3 py-2 bg-white border border-slate-200 rounded-xl text-xs text-slate-900 placeholder:text-slate-400 focus:outline-none focus:border-teal-500 focus:ring-4 focus:ring-teal-500/10 transition-all"
                    />
                  </div>

                  <div className="sm:col-span-2">
                    <label className="block text-xs font-bold text-slate-700 mb-1">
                      Known allergies
                    </label>
                    <input
                      id="clinical_allergies"
                      type="text"
                      name="allergies"
                      value={formData.allergies}
                      onChange={handleInputChange}
                      placeholder="e.g. Penicillin, Peanuts, Latex"
                      className="w-full px-3 py-2 bg-white border border-slate-200 rounded-xl text-xs text-slate-900 placeholder:text-slate-400 focus:outline-none focus:border-teal-500 focus:ring-4 focus:ring-teal-500/10 transition-all"
                    />
                  </div>

                  <div className="sm:col-span-3">
                    <label className="block text-xs font-bold text-slate-700 mb-1">
                      Medical conditions
                    </label>
                    <textarea
                      id="clinical_medical_conditions"
                      name="medical_conditions"
                      rows={2}
                      value={formData.medical_conditions}
                      onChange={handleInputChange}
                      placeholder="e.g. Hypertension, Type 2 Diabetes, Asthma"
                      className="w-full px-3 py-2 bg-white border border-slate-200 rounded-xl text-xs text-slate-900 placeholder:text-slate-400 focus:outline-none focus:border-teal-500 focus:ring-4 focus:ring-teal-500/10 transition-all"
                    />
                  </div>
                </div>
              </div>

              {/* Emergency Contact Inputs */}
              <div className="pt-2 border-t border-slate-100">
                <h3 className="text-xs font-bold text-teal-700 uppercase tracking-wider mb-3 flex items-center space-x-2">
                  <PhoneCall className="w-4 h-4" />
                  <span>Emergency Contact</span>
                </h3>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div>
                    <label className="block text-xs font-bold text-slate-700 mb-1">
                      Emergency contact name
                    </label>
                    <input
                      id="emergency_contact_name"
                      type="text"
                      name="emergency_contact_name"
                      value={formData.emergency_contact_name}
                      onChange={handleInputChange}
                      placeholder="e.g. Jane Vance (Spouse)"
                      className="w-full px-3 py-2 bg-white border border-slate-200 rounded-xl text-xs text-slate-900 placeholder:text-slate-400 focus:outline-none focus:border-teal-500 focus:ring-4 focus:ring-teal-500/10 transition-all"
                    />
                  </div>

                  <div>
                    <label className="block text-xs font-bold text-slate-700 mb-1">
                      Emergency contact phone
                    </label>
                    <input
                      id="emergency_contact_phone"
                      type="tel"
                      name="emergency_contact_phone"
                      value={formData.emergency_contact_phone}
                      onChange={handleInputChange}
                      placeholder="+1 (555) 123-4567"
                      className="w-full px-3 py-2 bg-white border border-slate-200 rounded-xl text-xs text-slate-900 placeholder:text-slate-400 focus:outline-none focus:border-teal-500 focus:ring-4 focus:ring-teal-500/10 transition-all"
                    />
                  </div>
                </div>
              </div>

              {/* Form Action Buttons */}
              <div className="flex items-center justify-end space-x-3 pt-4 border-t border-slate-100">
                <button
                  type="button"
                  onClick={handleCancelEdit}
                  disabled={isSaving}
                  className="px-4 py-2 rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-700 text-xs font-semibold border border-slate-200 transition-all disabled:opacity-50 cursor-pointer"
                >
                  Cancel
                </button>

                <button
                  type="submit"
                  disabled={isSaving}
                  className="inline-flex items-center space-x-2 px-5 py-2 rounded-xl bg-teal-600 hover:bg-teal-700 text-white text-xs font-semibold shadow-sm shadow-teal-600/20 focus:outline-none focus:ring-4 focus:ring-teal-500/20 transition-all disabled:opacity-60 cursor-pointer"
                >
                  {isSaving ? (
                    <>
                      <div className="w-3.5 h-3.5 border-2 border-white/30 border-t-white rounded-full animate-spin"></div>
                      <span>Saving...</span>
                    </>
                  ) : (
                    <>
                      <Save className="w-3.5 h-3.5" />
                      <span>Save Changes</span>
                    </>
                  )}
                </button>
              </div>
            </form>
          )}
        </div>
      )}
    </div>
  )
}
