import React, { useState, useEffect } from 'react'
import {
  X,
  Clock,
  Calendar,
  Sparkles,
  Plus,
  Trash2,
  AlertCircle,
  Loader2,
  FileText,
} from 'lucide-react'

const FREQUENCY_OPTIONS = [
  { value: 'DAILY', label: 'Daily (Every day)', desc: 'Take dose at specified times every day' },
  { value: 'WEEKLY', label: 'Weekly (Specific days)', desc: 'Take on selected days of the week' },
  { value: 'SPECIFIC_DAYS', label: 'Specific Days', desc: 'Choose precise recurrence days' },
  { value: 'INTERVAL_DAYS', label: 'Interval (Every X days)', desc: 'E.g., every 2 or 3 days' },
  { value: 'AS_NEEDED', label: 'As Needed (PRN)', desc: 'Taken only when required' },
  { value: 'CUSTOM', label: 'Custom Schedule', desc: 'Custom configured regimen' },
]

const TIME_OF_DAY_OPTIONS = [
  { value: 'MORNING', label: 'Morning' },
  { value: 'AFTERNOON', label: 'Afternoon' },
  { value: 'EVENING', label: 'Evening' },
  { value: 'NIGHT', label: 'Night' },
  { value: 'CUSTOM', label: 'Custom' },
]

const WEEKDAYS = [
  { id: 1, label: 'Mon', full: 'Monday' },
  { id: 2, label: 'Tue', full: 'Tuesday' },
  { id: 3, label: 'Wed', full: 'Wednesday' },
  { id: 4, label: 'Thu', full: 'Thursday' },
  { id: 5, label: 'Fri', full: 'Friday' },
  { id: 6, label: 'Sat', full: 'Saturday' },
  { id: 7, label: 'Sun', full: 'Sunday' },
]

export const ScheduleFormModal = ({
  isOpen,
  onClose,
  onSubmit,
  initialData = null,
  medicine = null,
  isLoading = false,
}) => {
  const isEditing = Boolean(initialData)

  const [formData, setFormData] = useState({
    frequency_type: 'DAILY',
    dose_quantity: '1.0',
    dosage_unit: 'tablet',
    days_of_week: [1, 2, 3, 4, 5, 6, 7],
    interval_days: 2,
    start_date: new Date().toISOString().split('T')[0],
    end_date: '',
    instructions: '',
    is_active: true,
    times: [{ scheduled_time: '08:00', time_of_day_type: 'MORNING' }],
  })

  const [errors, setErrors] = useState({})

  // Auto-detect Time of Day helper
  const detectTimeOfDay = (timeStr) => {
    if (!timeStr) return 'CUSTOM'
    const hour = parseInt(timeStr.split(':')[0], 10)
    if (hour >= 5 && hour < 12) return 'MORNING'
    if (hour >= 12 && hour < 17) return 'AFTERNOON'
    if (hour >= 17 && hour < 21) return 'EVENING'
    return 'NIGHT'
  }

  // Populate form data on open / initialData change
  useEffect(() => {
    if (isOpen) {
      if (initialData) {
        // Pre-fill existing schedule
        const formattedTimes = Array.isArray(initialData.times) && initialData.times.length > 0
          ? initialData.times.map((t) => ({
              scheduled_time: (t.scheduled_time || '08:00').substring(0, 5),
              time_of_day_type: t.time_of_day_type || detectTimeOfDay(t.scheduled_time),
              dose_quantity: t.dose_quantity ? String(t.dose_quantity) : '',
            }))
          : [{ scheduled_time: '08:00', time_of_day_type: 'MORNING' }]

        setFormData({
          frequency_type: initialData.frequency_type || 'DAILY',
          dose_quantity: String(initialData.dose_quantity || '1.0'),
          dosage_unit: initialData.dosage_unit || medicine?.dosage_unit || 'tablet',
          days_of_week: Array.isArray(initialData.days_of_week) ? initialData.days_of_week : [1, 2, 3, 4, 5, 6, 7],
          interval_days: initialData.interval_days || 2,
          start_date: initialData.start_date || new Date().toISOString().split('T')[0],
          end_date: initialData.end_date || '',
          instructions: initialData.instructions || '',
          is_active: initialData.is_active !== undefined ? initialData.is_active : true,
          times: formattedTimes,
        })
      } else {
        // New schedule defaults
        setFormData({
          frequency_type: 'DAILY',
          dose_quantity: medicine?.dosage_amount ? String(medicine.dosage_amount) : '1.0',
          dosage_unit: medicine?.dosage_unit || 'tablet',
          days_of_week: [1, 2, 3, 4, 5, 6, 7],
          interval_days: 2,
          start_date: medicine?.start_date || new Date().toISOString().split('T')[0],
          end_date: medicine?.end_date || '',
          instructions: medicine?.instructions || '',
          is_active: true,
          times: [{ scheduled_time: '08:00', time_of_day_type: 'MORNING' }],
        })
      }
      setErrors({})
    }
  }, [isOpen, initialData, medicine])

  // Handle generic field change
  const handleChange = (e) => {
    const { name, value, type, checked } = e.target
    setFormData((prev) => ({
      ...prev,
      [name]: type === 'checkbox' ? checked : value,
    }))
    if (errors[name]) {
      setErrors((prev) => ({ ...prev, [name]: null }))
    }
  }

  // Handle Weekday Toggle
  const toggleWeekday = (dayId) => {
    setFormData((prev) => {
      const current = prev.days_of_week || []
      const exists = current.includes(dayId)
      const updated = exists ? current.filter((d) => d !== dayId) : [...current, dayId].sort()
      return { ...prev, days_of_week: updated }
    })
    if (errors.days_of_week) {
      setErrors((prev) => ({ ...prev, days_of_week: null }))
    }
  }

  // Times Handlers
  const handleAddTime = () => {
    setFormData((prev) => {
      const lastTime = prev.times[prev.times.length - 1]?.scheduled_time || '08:00'
      const lastHour = parseInt(lastTime.split(':')[0], 10)
      const nextHour = (lastHour + 4) % 24
      const nextTimeStr = `${String(nextHour).padStart(2, '0')}:00`

      return {
        ...prev,
        times: [
          ...prev.times,
          {
            scheduled_time: nextTimeStr,
            time_of_day_type: detectTimeOfDay(nextTimeStr),
          },
        ],
      }
    })
    if (errors.times) {
      setErrors((prev) => ({ ...prev, times: null }))
    }
  }

  const handleRemoveTime = (index) => {
    setFormData((prev) => ({
      ...prev,
      times: prev.times.filter((_, i) => i !== index),
    }))
  }

  const handleTimeChange = (index, field, value) => {
    setFormData((prev) => {
      const newTimes = [...prev.times]
      newTimes[index] = {
        ...newTimes[index],
        [field]: value,
      }
      if (field === 'scheduled_time' && !newTimes[index].time_of_day_type_manually_set) {
        newTimes[index].time_of_day_type = detectTimeOfDay(value)
      }
      return { ...prev, times: newTimes }
    })
    if (errors.times) {
      setErrors((prev) => ({ ...prev, times: null }))
    }
  }

  // Form Validation
  const validateForm = () => {
    const newErrors = {}

    const doseNum = parseFloat(formData.dose_quantity)
    if (isNaN(doseNum) || doseNum <= 0) {
      newErrors.dose_quantity = 'Dose quantity must be greater than 0'
    }

    if (!formData.start_date) {
      newErrors.start_date = 'Start date is required'
    }

    if (formData.end_date && formData.start_date && formData.end_date < formData.start_date) {
      newErrors.end_date = 'End date cannot be earlier than start date'
    }

    if (formData.frequency_type !== 'AS_NEEDED') {
      if (!formData.times || formData.times.length === 0) {
        newErrors.times = 'At least one scheduled dose time is required'
      } else {
        const hasInvalidTime = formData.times.some((t) => !t.scheduled_time)
        if (hasInvalidTime) {
          newErrors.times = 'Please fill out all time entries'
        }
      }
    }

    if (
      (formData.frequency_type === 'WEEKLY' || formData.frequency_type === 'SPECIFIC_DAYS') &&
      (!formData.days_of_week || formData.days_of_week.length === 0)
    ) {
      newErrors.days_of_week = 'Please select at least one day of the week'
    }

    if (formData.frequency_type === 'INTERVAL_DAYS') {
      const intervalNum = parseInt(formData.interval_days, 10)
      if (isNaN(intervalNum) || intervalNum < 1) {
        newErrors.interval_days = 'Interval must be at least 1 day'
      }
    }

    setErrors(newErrors)
    return Object.keys(newErrors).length === 0
  }

  // Submit Handler
  const handleSubmit = async (e) => {
    e.preventDefault()
    if (!validateForm()) return

    // Prepare API payload exactly matching MedicationScheduleCreate/Update
    const payload = {
      frequency_type: formData.frequency_type,
      dose_quantity: parseFloat(formData.dose_quantity),
      dosage_unit: formData.dosage_unit.trim() || undefined,
      start_date: formData.start_date,
      end_date: formData.end_date ? formData.end_date : null,
      instructions: formData.instructions.trim() || null,
      is_active: Boolean(formData.is_active),
    }

    if (formData.frequency_type !== 'AS_NEEDED') {
      payload.times = formData.times.map((t) => ({
        scheduled_time: t.scheduled_time.length === 5 ? `${t.scheduled_time}:00` : t.scheduled_time,
        time_of_day_type: t.time_of_day_type || detectTimeOfDay(t.scheduled_time),
        dose_quantity: t.dose_quantity ? parseFloat(t.dose_quantity) : undefined,
      }))
    } else {
      payload.times = []
    }

    if (formData.frequency_type === 'WEEKLY' || formData.frequency_type === 'SPECIFIC_DAYS') {
      payload.days_of_week = formData.days_of_week
    } else {
      payload.days_of_week = null
    }

    if (formData.frequency_type === 'INTERVAL_DAYS') {
      payload.interval_days = parseInt(formData.interval_days, 10)
    } else {
      payload.interval_days = null
    }

    try {
      await onSubmit(payload)
    } catch (err) {
      if (err.response?.data?.detail) {
        const detail = err.response.data.detail
        if (typeof detail === 'string') {
          setErrors({ submit: detail })
        } else if (Array.isArray(detail)) {
          setErrors({ submit: detail.map((d) => d.msg).join(', ') })
        }
      } else {
        setErrors({ submit: 'Failed to save schedule. Please check your inputs.' })
      }
    }
  }

  if (!isOpen) return null

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 overflow-y-auto">
      {/* Backdrop */}
      <div
        className="fixed inset-0 bg-slate-900/40 backdrop-blur-xs transition-opacity"
        onClick={!isLoading ? onClose : undefined}
      />

      {/* Modal Card */}
      <div className="relative w-full max-w-xl rounded-2xl bg-white border border-slate-200 p-6 shadow-2xl animate-in fade-in zoom-in-95 duration-200 max-h-[90vh] flex flex-col">
        {/* Header */}
        <div className="flex items-start justify-between pb-4 border-b border-slate-100 shrink-0">
          <div>
            <div className="flex items-center space-x-2">
              <span className="px-2.5 py-0.5 rounded-md text-[11px] font-bold bg-teal-50 text-teal-700 border border-teal-200">
                {medicine?.name || 'Medication'}
              </span>
              <span className="text-xs text-slate-400">•</span>
              <span className="text-xs text-slate-500 font-medium">
                {isEditing ? 'Edit Dosing Schedule' : 'Create Dosing Schedule'}
              </span>
            </div>
            <h2 className="text-lg font-bold text-slate-900 tracking-tight mt-1">
              {isEditing ? 'Update Schedule' : 'Add Medication Schedule'}
            </h2>
          </div>

          <button
            onClick={onClose}
            disabled={isLoading}
            className="rounded-lg p-1.5 text-slate-400 hover:bg-slate-100 hover:text-slate-700 transition-colors disabled:opacity-50 cursor-pointer"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Scrollable Form Body */}
        <form id="schedule-form" onSubmit={handleSubmit} className="space-y-4 py-4 overflow-y-auto pr-1 flex-1">
          {/* Submit / Server Error Banner */}
          {errors.submit && (
            <div className="flex items-center space-x-2.5 p-3 rounded-xl bg-rose-50 border border-rose-200 text-rose-700 text-xs">
              <AlertCircle className="w-4 h-4 text-rose-600 shrink-0" />
              <span className="font-medium">{errors.submit}</span>
            </div>
          )}

          {/* Dosage Amount & Unit */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div>
              <label className="block text-xs font-bold text-slate-700 mb-1.5">
                Dose Amount <span className="text-rose-500">*</span>
              </label>
              <input
                type="number"
                step="0.1"
                min="0.1"
                name="dose_quantity"
                value={formData.dose_quantity}
                onChange={handleChange}
                placeholder="e.g. 1.0"
                className={`w-full px-3.5 py-2 rounded-xl bg-white border ${
                  errors.dose_quantity ? 'border-rose-400 focus:ring-rose-500/20' : 'border-slate-200 focus:border-teal-500 focus:ring-teal-500/10'
                } text-xs text-slate-900 placeholder-slate-400 focus:outline-none focus:ring-4 transition-all`}
              />
              {errors.dose_quantity && (
                <p className="text-[11px] text-rose-600 mt-1 font-medium">{errors.dose_quantity}</p>
              )}
            </div>

            <div>
              <label className="block text-xs font-bold text-slate-700 mb-1.5">
                Unit (e.g. tablet, ml)
              </label>
              <input
                type="text"
                name="dosage_unit"
                value={formData.dosage_unit}
                onChange={handleChange}
                placeholder="tablet, capsule, ml"
                className="w-full px-3.5 py-2 rounded-xl bg-white border border-slate-200 text-xs text-slate-900 placeholder-slate-400 focus:outline-none focus:border-teal-500 focus:ring-4 focus:ring-teal-500/10 transition-all"
              />
            </div>
          </div>

          {/* Frequency Type */}
          <div>
            <label className="block text-xs font-bold text-slate-700 mb-1.5">
              Frequency <span className="text-rose-500">*</span>
            </label>
            <select
              name="frequency_type"
              value={formData.frequency_type}
              onChange={handleChange}
              className="w-full px-3.5 py-2 rounded-xl bg-white border border-slate-200 text-xs text-slate-900 focus:outline-none focus:border-teal-500 focus:ring-4 focus:ring-teal-500/10 transition-all"
            >
              {FREQUENCY_OPTIONS.map((opt) => (
                <option key={opt.value} value={opt.value}>
                  {opt.label}
                </option>
              ))}
            </select>
          </div>

          {/* Days of Week (for Weekly / Specific Days) */}
          {(formData.frequency_type === 'WEEKLY' || formData.frequency_type === 'SPECIFIC_DAYS') && (
            <div className="p-3.5 rounded-xl bg-slate-50 border border-slate-200/80">
              <label className="block text-xs font-bold text-slate-700 mb-2">
                Repeat on Days <span className="text-rose-500">*</span>
              </label>
              <div className="grid grid-cols-7 gap-1.5">
                {WEEKDAYS.map((day) => {
                  const isSelected = formData.days_of_week?.includes(day.id)
                  return (
                    <button
                      key={day.id}
                      type="button"
                      onClick={() => toggleWeekday(day.id)}
                      className={`py-2 rounded-lg text-xs font-bold transition-all cursor-pointer ${
                        isSelected
                          ? 'bg-teal-600 text-white shadow-xs'
                          : 'bg-white text-slate-600 hover:text-slate-900 border border-slate-200'
                      }`}
                      title={day.full}
                    >
                      {day.label}
                    </button>
                  )
                })}
              </div>
              {errors.days_of_week && (
                <p className="text-[11px] text-rose-600 mt-2 font-medium">{errors.days_of_week}</p>
              )}
            </div>
          )}

          {/* Interval Days (for Interval recurrence) */}
          {formData.frequency_type === 'INTERVAL_DAYS' && (
            <div className="p-3.5 rounded-xl bg-slate-50 border border-slate-200/80">
              <label className="block text-xs font-bold text-slate-700 mb-1.5">
                Every X Days <span className="text-rose-500">*</span>
              </label>
              <div className="flex items-center space-x-3">
                <span className="text-xs text-slate-500 font-medium">Take every</span>
                <input
                  type="number"
                  min="1"
                  max="365"
                  name="interval_days"
                  value={formData.interval_days}
                  onChange={handleChange}
                  className="w-20 px-3 py-1.5 rounded-lg bg-white border border-slate-200 text-xs text-slate-900 text-center font-bold focus:outline-none focus:border-teal-500"
                />
                <span className="text-xs text-slate-500 font-medium">day(s)</span>
              </div>
              {errors.interval_days && (
                <p className="text-[11px] text-rose-600 mt-1 font-medium">{errors.interval_days}</p>
              )}
            </div>
          )}

          {/* Dose Times Section (if not As Needed) */}
          {formData.frequency_type !== 'AS_NEEDED' && (
            <div className="p-3.5 rounded-xl bg-slate-50 border border-slate-200/80 space-y-3">
              <div className="flex items-center justify-between">
                <label className="block text-xs font-bold text-slate-700">
                  Scheduled Dose Times <span className="text-rose-500">*</span>
                </label>
                <button
                  type="button"
                  onClick={handleAddTime}
                  className="inline-flex items-center space-x-1 px-2.5 py-1 rounded-lg text-xs font-semibold text-teal-700 bg-teal-50 hover:bg-teal-100 border border-teal-200 transition-colors cursor-pointer"
                >
                  <Plus className="w-3.5 h-3.5" />
                  <span>Add Time</span>
                </button>
              </div>

              {errors.times && (
                <p className="text-[11px] text-rose-600 font-medium">{errors.times}</p>
              )}

              <div className="space-y-2">
                {formData.times.map((t, idx) => (
                  <div
                    key={idx}
                    className="flex items-center space-x-2 bg-white border border-slate-200 p-2 rounded-xl shadow-xs"
                  >
                    {/* Time Picker */}
                    <div className="relative flex-1">
                      <Clock className="w-3.5 h-3.5 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
                      <input
                        type="time"
                        value={t.scheduled_time}
                        onChange={(e) => handleTimeChange(idx, 'scheduled_time', e.target.value)}
                        className="w-full pl-8 pr-2 py-1.5 rounded-lg bg-slate-50 border border-slate-200 text-xs text-slate-900 font-semibold focus:outline-none focus:border-teal-500"
                      />
                    </div>

                    {/* Time of Day Tag */}
                    <div className="w-28 shrink-0">
                      <select
                        value={t.time_of_day_type || 'CUSTOM'}
                        onChange={(e) => {
                          handleTimeChange(idx, 'time_of_day_type', e.target.value)
                          handleTimeChange(idx, 'time_of_day_type_manually_set', true)
                        }}
                        className="w-full px-2 py-1.5 rounded-lg bg-slate-50 border border-slate-200 text-[11px] text-slate-700 font-medium focus:outline-none focus:border-teal-500"
                      >
                        {TIME_OF_DAY_OPTIONS.map((opt) => (
                          <option key={opt.value} value={opt.value}>
                            {opt.label}
                          </option>
                        ))}
                      </select>
                    </div>

                    {/* Remove Time */}
                    {formData.times.length > 1 && (
                      <button
                        type="button"
                        onClick={() => handleRemoveTime(idx)}
                        className="p-1.5 rounded-lg text-slate-400 hover:text-rose-600 hover:bg-rose-50 transition-colors cursor-pointer"
                        title="Remove time"
                      >
                        <Trash2 className="w-3.5 h-3.5" />
                      </button>
                    )}
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Dates Range */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div>
              <label className="block text-xs font-bold text-slate-700 mb-1.5">
                Start Date <span className="text-rose-500">*</span>
              </label>
              <input
                type="date"
                name="start_date"
                value={formData.start_date}
                onChange={handleChange}
                className={`w-full px-3.5 py-2 rounded-xl bg-white border ${
                  errors.start_date ? 'border-rose-400' : 'border-slate-200 focus:border-teal-500'
                } text-xs text-slate-900 focus:outline-none focus:ring-4 focus:ring-teal-500/10 transition-all`}
              />
              {errors.start_date && (
                <p className="text-[11px] text-rose-600 mt-1 font-medium">{errors.start_date}</p>
              )}
            </div>

            <div>
              <label className="block text-xs font-bold text-slate-700 mb-1.5">
                End Date (Optional)
              </label>
              <input
                type="date"
                name="end_date"
                value={formData.end_date}
                onChange={handleChange}
                className={`w-full px-3.5 py-2 rounded-xl bg-white border ${
                  errors.end_date ? 'border-rose-400' : 'border-slate-200 focus:border-teal-500'
                } text-xs text-slate-900 focus:outline-none focus:ring-4 focus:ring-teal-500/10 transition-all`}
              />
              {errors.end_date && (
                <p className="text-[11px] text-rose-600 mt-1 font-medium">{errors.end_date}</p>
              )}
            </div>
          </div>

          {/* Specific Timing Instructions */}
          <div>
            <label className="block text-xs font-bold text-slate-700 mb-1.5">
              Specific Instructions (Optional)
            </label>
            <input
              type="text"
              name="instructions"
              value={formData.instructions}
              onChange={handleChange}
              placeholder="e.g. Take with food, drink full glass of water"
              className="w-full px-3.5 py-2 rounded-xl bg-white border border-slate-200 text-xs text-slate-900 placeholder-slate-400 focus:outline-none focus:border-teal-500 focus:ring-4 focus:ring-teal-500/10 transition-all"
            />
          </div>

          {/* Active Status Switch */}
          <div className="flex items-center justify-between p-3.5 rounded-xl bg-slate-50 border border-slate-200/80">
            <div>
              <span className="text-xs font-bold text-slate-800">Schedule Active</span>
              <p className="text-[11px] text-slate-500 font-medium">
                Inactive schedules are saved without generating future dose alerts
              </p>
            </div>

            <label className="relative inline-flex items-center cursor-pointer">
              <input
                type="checkbox"
                name="is_active"
                checked={formData.is_active}
                onChange={handleChange}
                className="sr-only peer"
              />
              <div className="w-10 h-5.5 bg-slate-200 peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:rounded-full after:h-4.5 after:w-4.5 after:transition-all peer-checked:bg-teal-600"></div>
            </label>
          </div>
        </form>

        {/* Footer */}
        <div className="flex items-center justify-end space-x-3 pt-4 border-t border-slate-100 shrink-0">
          <button
            type="button"
            onClick={onClose}
            disabled={isLoading}
            className="px-4 py-2 rounded-xl text-xs font-semibold text-slate-600 bg-slate-100 hover:bg-slate-200 border border-slate-200 transition-colors disabled:opacity-50 cursor-pointer"
          >
            Cancel
          </button>

          <button
            type="submit"
            form="schedule-form"
            disabled={isLoading}
            className="inline-flex items-center space-x-2 px-5 py-2 rounded-xl text-xs font-semibold text-white bg-teal-600 hover:bg-teal-700 shadow-sm shadow-teal-600/20 transition-all focus:outline-none focus:ring-4 focus:ring-teal-500/20 disabled:opacity-60 cursor-pointer"
          >
            {isLoading ? (
              <>
                <Loader2 className="w-3.5 h-3.5 animate-spin" />
                <span>Saving...</span>
              </>
            ) : (
              <span>{isEditing ? 'Update Schedule' : 'Create Schedule'}</span>
            )}
          </button>
        </div>
      </div>
    </div>
  )
}
