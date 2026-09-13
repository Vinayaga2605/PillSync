import React, { useState, useEffect } from 'react'
import { scheduleService } from '../../services/scheduleService'
import { ScheduleFormModal } from './ScheduleFormModal'
import { DeleteScheduleModal } from './DeleteScheduleModal'
import {
  Calendar,
  Clock,
  Plus,
  Edit2,
  Trash2,
  X,
  AlertCircle,
  CheckCircle2,
  RotateCw,
  Sparkles,
  Pill,
  Sun,
  Sunrise,
  Sunset,
  Moon,
  Info,
} from 'lucide-react'

export const MedicineScheduleModal = ({ isOpen, onClose, medicine }) => {
  const [schedules, setSchedules] = useState([])
  const [isLoading, setIsLoading] = useState(true)
  const [error, setError] = useState(null)
  const [feedback, setFeedback] = useState(null)

  // Form & Delete Modals
  const [isFormOpen, setIsFormOpen] = useState(false)
  const [editingSchedule, setEditingSchedule] = useState(null)
  const [isSubmitting, setIsSubmitting] = useState(false)

  const [isDeleteOpen, setIsDeleteOpen] = useState(false)
  const [deletingSchedule, setDeletingSchedule] = useState(null)
  const [isDeleting, setIsDeleting] = useState(false)

  // Fetch schedules for the given medicine
  const fetchSchedules = async () => {
    if (!medicine?.id) return

    setIsLoading(true)
    setError(null)
    try {
      const data = await scheduleService.getSchedules(medicine.id)
      setSchedules(Array.isArray(data) ? data : [])
    } catch (err) {
      if (err.response?.status === 404) {
        setError('Medicine record not found or inaccessible.')
      } else {
        setError('Unable to load schedules. Please check your connection and retry.')
      }
    } finally {
      setIsLoading(false)
    }
  }

  useEffect(() => {
    if (isOpen && medicine?.id) {
      fetchSchedules()
      setFeedback(null)
    }
  }, [isOpen, medicine?.id])

  // Clear feedback after 4 seconds
  useEffect(() => {
    if (feedback) {
      const timer = setTimeout(() => setFeedback(null), 4000)
      return () => clearTimeout(timer)
    }
  }, [feedback])

  if (!isOpen || !medicine) return null

  // Format 24hr time to 12hr AM/PM
  const formatTime = (timeStr) => {
    if (!timeStr) return ''
    try {
      const [hStr, mStr] = timeStr.split(':')
      let hour = parseInt(hStr, 10)
      const minutes = mStr || '00'
      const ampm = hour >= 12 ? 'PM' : 'AM'
      hour = hour % 12 || 12
      return `${hour}:${minutes} ${ampm}`
    } catch {
      return timeStr
    }
  }

  // Format date display
  const formatDate = (dateStr) => {
    if (!dateStr) return null
    try {
      const d = new Date(dateStr + 'T00:00:00')
      return d.toLocaleDateString('en-US', {
        month: 'short',
        day: 'numeric',
        year: 'numeric',
      })
    } catch {
      return dateStr
    }
  }

  // Format frequency label
  const formatFrequency = (type, daysOfWeek, intervalDays) => {
    switch (type) {
      case 'DAILY':
        return 'Daily'
      case 'WEEKLY':
      case 'SPECIFIC_DAYS': {
        const dayNames = ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun']
        if (Array.isArray(daysOfWeek) && daysOfWeek.length > 0) {
          const names = daysOfWeek.map((d) => dayNames[d - 1] || d).join(', ')
          return `Weekly (${names})`
        }
        return 'Weekly'
      }
      case 'INTERVAL_DAYS':
        return `Every ${intervalDays || 2} Days`
      case 'AS_NEEDED':
        return 'As Needed (PRN)'
      case 'CUSTOM':
        return 'Custom'
      default:
        return type
    }
  }

  // Get icon for time of day tag
  const getTimeIcon = (type) => {
    switch (type) {
      case 'MORNING':
        return <Sunrise className="w-3 h-3 text-amber-400" />
      case 'AFTERNOON':
        return <Sun className="w-3 h-3 text-yellow-400" />
      case 'EVENING':
        return <Sunset className="w-3 h-3 text-orange-400" />
      case 'NIGHT':
        return <Moon className="w-3 h-3 text-indigo-400" />
      default:
        return <Clock className="w-3 h-3 text-teal-400" />
    }
  }

  // Handlers for Add/Edit
  const handleOpenAdd = () => {
    setEditingSchedule(null)
    setIsFormOpen(true)
  }

  const handleOpenEdit = (schedule) => {
    setEditingSchedule(schedule)
    setIsFormOpen(true)
  }

  const handleFormSubmit = async (payload) => {
    setIsSubmitting(true)
    try {
      if (editingSchedule) {
        const updated = await scheduleService.updateSchedule(medicine.id, editingSchedule.id, payload)
        setSchedules((prev) =>
          prev.map((s) => (s.id === updated.id ? updated : s))
        )
        setFeedback({
          type: 'success',
          message: 'Schedule updated successfully.',
        })
      } else {
        const created = await scheduleService.createSchedule(medicine.id, payload)
        setSchedules((prev) => [created, ...prev])
        setFeedback({
          type: 'success',
          message: 'New schedule created successfully.',
        })
      }
      setIsFormOpen(false)
      setEditingSchedule(null)
    } finally {
      setIsSubmitting(false)
    }
  }

  // Handlers for Delete
  const handleOpenDelete = (schedule) => {
    setDeletingSchedule(schedule)
    setIsDeleteOpen(true)
  }

  const handleConfirmDelete = async () => {
    if (!deletingSchedule) return
    setIsDeleting(true)
    try {
      await scheduleService.deleteSchedule(medicine.id, deletingSchedule.id)
      setSchedules((prev) => prev.filter((s) => s.id !== deletingSchedule.id))
      setFeedback({
        type: 'success',
        message: 'Schedule has been deleted.',
      })
      setIsDeleteOpen(false)
      setDeletingSchedule(null)
    } catch (err) {
      setFeedback({
        type: 'error',
        message: err.response?.data?.detail || 'Failed to delete schedule.',
      })
      setIsDeleteOpen(false)
    } finally {
      setIsDeleting(false)
    }
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 overflow-y-auto">
      {/* Backdrop */}
      <div
        className="fixed inset-0 bg-slate-900/40 backdrop-blur-xs transition-opacity"
        onClick={onClose}
      />

      {/* Modal Card */}
      <div className="relative w-full max-w-2xl rounded-2xl bg-white border border-slate-200 p-6 shadow-2xl animate-in fade-in zoom-in-95 duration-200 max-h-[90vh] flex flex-col">
        {/* Header */}
        <div className="flex items-start justify-between pb-4 border-b border-slate-100 shrink-0">
          <div>
            <div className="flex items-center space-x-2.5">
              <div className="w-8 h-8 rounded-lg bg-teal-50 text-teal-700 border border-teal-200 flex items-center justify-center">
                <Pill className="w-4 h-4" />
              </div>
              <div>
                <h2 className="text-lg font-bold text-slate-900 tracking-tight">
                  {medicine.name}
                </h2>
                <p className="text-xs text-slate-500 font-medium">
                  {medicine.generic_name || 'Prescription / OTC'} • Default dose: {medicine.dosage_amount} {medicine.dosage_unit}
                </p>
              </div>
            </div>
          </div>

          <div className="flex items-center space-x-2">
            <button
              onClick={handleOpenAdd}
              disabled={isLoading}
              className="inline-flex items-center space-x-1.5 px-3.5 py-1.5 rounded-xl text-xs font-semibold text-white bg-teal-600 hover:bg-teal-700 shadow-sm shadow-teal-600/20 transition-all focus:outline-none focus:ring-4 focus:ring-teal-500/20 disabled:opacity-50 cursor-pointer"
            >
              <Plus className="w-3.5 h-3.5 stroke-[2.4]" />
              <span>Add Schedule</span>
            </button>

            <button
              onClick={onClose}
              className="rounded-lg p-1.5 text-slate-400 hover:bg-slate-100 hover:text-slate-700 transition-colors cursor-pointer"
            >
              <X className="w-5 h-5" />
            </button>
          </div>
        </div>

        {/* Feedback Alert */}
        {feedback && (
          <div
            className={`mt-4 flex items-center justify-between p-3 rounded-xl border animate-in fade-in duration-200 shrink-0 ${
              feedback.type === 'success'
                ? 'bg-emerald-50 border-emerald-200 text-emerald-800'
                : 'bg-rose-50 border-rose-200 text-rose-800'
            }`}
          >
            <div className="flex items-center space-x-2.5 text-xs font-semibold">
              {feedback.type === 'success' ? (
                <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0" />
              ) : (
                <AlertCircle className="w-4 h-4 text-rose-600 shrink-0" />
              )}
              <span>{feedback.message}</span>
            </div>
            <button
              onClick={() => setFeedback(null)}
              className="p-1 rounded hover:bg-black/5 text-slate-400 hover:text-slate-700 cursor-pointer"
            >
              <X className="w-3.5 h-3.5" />
            </button>
          </div>
        )}

        {/* Scrollable Schedules Content */}
        <div className="flex-1 overflow-y-auto py-4 space-y-3.5 pr-1">
          {isLoading ? (
            /* Skeleton Loading */
            <div className="space-y-3">
              {[1, 2].map((i) => (
                <div
                  key={i}
                  className="p-4 rounded-xl bg-slate-50 border border-slate-200/80 animate-pulse space-y-3 shadow-xs"
                >
                  <div className="flex justify-between">
                    <div className="w-28 h-4 bg-slate-200 rounded"></div>
                    <div className="w-16 h-4 bg-slate-200 rounded-full"></div>
                  </div>
                  <div className="w-48 h-6 bg-slate-200 rounded"></div>
                  <div className="w-36 h-3 bg-slate-200 rounded"></div>
                </div>
              ))}
            </div>
          ) : error ? (
            /* Error State */
            <div className="bg-slate-50 border border-slate-200 rounded-xl p-6 text-center shadow-xs">
              <AlertCircle className="w-8 h-8 text-rose-600 mx-auto mb-2" />
              <p className="text-xs text-slate-600 mb-3 font-medium">{error}</p>
              <button
                onClick={fetchSchedules}
                className="inline-flex items-center space-x-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold text-slate-700 bg-white hover:bg-slate-100 border border-slate-200 transition-colors cursor-pointer"
              >
                <RotateCw className="w-3.5 h-3.5" />
                <span>Retry</span>
              </button>
            </div>
          ) : schedules.length === 0 ? (
            /* Honest Empty State */
            <div className="bg-slate-50 border border-slate-200/80 rounded-2xl p-8 text-center my-4 shadow-xs">
              <div className="w-12 h-12 rounded-xl bg-teal-50 border border-teal-200 text-teal-600 flex items-center justify-center mx-auto mb-3">
                <Clock className="w-6 h-6 stroke-[1.8]" />
              </div>
              <h3 className="text-sm font-bold text-slate-900">No medication schedule added yet.</h3>
              <p className="text-xs text-slate-500 max-w-xs mx-auto mt-1 mb-5">
                Set up recurring dosage times, daily schedules, and intake instructions for {medicine.name}.
              </p>
              <button
                onClick={handleOpenAdd}
                className="inline-flex items-center space-x-2 px-4 py-2 rounded-xl text-xs font-semibold text-white bg-teal-600 hover:bg-teal-700 shadow-sm shadow-teal-600/20 transition-all focus:outline-none focus:ring-4 focus:ring-teal-500/20 cursor-pointer"
              >
                <Plus className="w-4 h-4 stroke-[2.4]" />
                <span>Add Schedule</span>
              </button>
            </div>
          ) : (
            /* Schedules List */
            <div className="space-y-3">
              {schedules.map((schedule) => (
                <div
                  key={schedule.id}
                  className={`p-4 rounded-xl border transition-all ${
                    schedule.is_active
                      ? 'bg-slate-50/70 border-slate-200/80 hover:border-teal-300 shadow-xs'
                      : 'bg-slate-50/40 border-slate-200/60 opacity-80'
                  }`}
                >
                  {/* Top Bar: Frequency, Dose & Status */}
                  <div className="flex items-start justify-between gap-2">
                    <div className="flex flex-wrap items-center gap-2">
                      {/* Frequency Badge */}
                      <span className="px-2.5 py-0.5 rounded-md text-xs font-bold bg-teal-50 text-teal-800 border border-teal-200">
                        {formatFrequency(schedule.frequency_type, schedule.days_of_week, schedule.interval_days)}
                      </span>

                      {/* Dose Quantity Badge */}
                      <span className="px-2 py-0.5 rounded-md text-xs font-semibold bg-white text-slate-700 border border-slate-200 shadow-xs">
                        {parseFloat(schedule.dose_quantity) % 1 === 0 ? parseFloat(schedule.dose_quantity) : schedule.dose_quantity}{' '}
                        {schedule.dosage_unit || medicine.dosage_unit || 'dose'}
                      </span>

                      {/* Active Status Badge */}
                      <span
                        className={`inline-flex items-center space-x-1.5 px-2 py-0.5 rounded-full text-[10px] font-bold border ${
                          schedule.is_active
                            ? 'bg-emerald-50 text-emerald-700 border-emerald-200'
                            : 'bg-slate-100 text-slate-500 border-slate-200'
                        }`}
                      >
                        <span
                          className={`w-1 h-1 rounded-full ${
                            schedule.is_active ? 'bg-emerald-500' : 'bg-slate-400'
                          }`}
                        />
                        <span>{schedule.is_active ? 'Active' : 'Inactive'}</span>
                      </span>
                    </div>

                    {/* Action Buttons */}
                    <div className="flex items-center space-x-1 shrink-0">
                      <button
                        onClick={() => handleOpenEdit(schedule)}
                        className="p-1.5 rounded-lg text-slate-500 hover:text-slate-800 hover:bg-slate-200/60 transition-colors cursor-pointer"
                        title="Edit schedule"
                      >
                        <Edit2 className="w-3.5 h-3.5" />
                      </button>
                      <button
                        onClick={() => handleOpenDelete(schedule)}
                        className="p-1.5 rounded-lg text-slate-400 hover:text-rose-600 hover:bg-rose-50 transition-colors cursor-pointer"
                        title="Delete schedule"
                      >
                        <Trash2 className="w-3.5 h-3.5" />
                      </button>
                    </div>
                  </div>

                  {/* Scheduled Times List */}
                  {Array.isArray(schedule.times) && schedule.times.length > 0 && (
                    <div className="mt-3 flex flex-wrap items-center gap-1.5">
                      {schedule.times.map((t, idx) => (
                        <div
                          key={idx}
                          className="inline-flex items-center space-x-1.5 px-2.5 py-1 rounded-lg bg-white border border-slate-200 text-xs text-slate-800 shadow-xs"
                        >
                          {getTimeIcon(t.time_of_day_type)}
                          <span className="font-bold text-teal-700">
                            {formatTime(t.scheduled_time)}
                          </span>
                          {t.time_of_day_type && (
                            <span className="text-[10px] text-slate-500 uppercase font-medium">
                              ({t.time_of_day_type.toLowerCase()})
                            </span>
                          )}
                        </div>
                      ))}
                    </div>
                  )}

                  {/* Date Range & Timing Instructions */}
                  <div className="mt-3 pt-2.5 border-t border-slate-200/60 flex flex-wrap items-center justify-between gap-y-1 gap-x-4 text-xs text-slate-500">
                    <div className="flex items-center space-x-1.5">
                      <Calendar className="w-3.5 h-3.5 text-slate-400" />
                      <span>
                        Effective: <strong className="text-slate-700 font-semibold">{formatDate(schedule.start_date)}</strong>
                        {schedule.end_date ? (
                          <> → <strong className="text-slate-700 font-semibold">{formatDate(schedule.end_date)}</strong></>
                        ) : (
                          <span className="text-slate-400"> (Ongoing)</span>
                        )}
                      </span>
                    </div>

                    {schedule.instructions && (
                      <div className="flex items-center space-x-1.5 text-slate-600 italic">
                        <Info className="w-3.5 h-3.5 text-teal-600 shrink-0" />
                        <span className="truncate max-w-xs">{schedule.instructions}</span>
                      </div>
                    )}
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="pt-4 border-t border-slate-100 flex items-center justify-between shrink-0 text-xs text-slate-500">
          <span>{schedules.length} schedule(s) configured</span>
          <button
            onClick={onClose}
            className="px-4 py-1.5 rounded-xl text-xs font-semibold text-slate-700 bg-slate-100 hover:bg-slate-200 border border-slate-200 transition-colors cursor-pointer"
          >
            Close
          </button>
        </div>
      </div>

      {/* Add / Edit Schedule Form Modal */}
      <ScheduleFormModal
        isOpen={isFormOpen}
        onClose={() => {
          setIsFormOpen(false)
          setEditingSchedule(null)
        }}
        onSubmit={handleFormSubmit}
        initialData={editingSchedule}
        medicine={medicine}
        isLoading={isSubmitting}
      />

      {/* Delete Schedule Confirmation Modal */}
      <DeleteScheduleModal
        isOpen={isDeleteOpen}
        onClose={() => {
          setIsDeleteOpen(false)
          setDeletingSchedule(null)
        }}
        onConfirm={handleConfirmDelete}
        scheduleSummary={
          deletingSchedule
            ? `${formatFrequency(deletingSchedule.frequency_type, deletingSchedule.days_of_week, deletingSchedule.interval_days)} schedule for ${medicine.name}`
            : 'this schedule'
        }
        isLoading={isDeleting}
      />
    </div>
  )
}
