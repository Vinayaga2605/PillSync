import React from 'react'
import {
  Pill,
  Clock,
  AlertCircle,
  FileText,
  Repeat,
  Coffee,
  Sun,
  Sunset,
  Moon,
  CheckCircle2,
  XCircle,
} from 'lucide-react'

/**
 * Formats a 24-hour time string (e.g. "08:00:00") or ISO timestamp to 12-hour AM/PM format.
 */
const formatTime12h = (timeStr, isoTimestamp) => {
  if (timeStr) {
    const parts = timeStr.split(':')
    if (parts.length >= 2) {
      const h = parseInt(parts[0], 10)
      const m = parts[1]
      const ampm = h >= 12 ? 'PM' : 'AM'
      const formattedHours = h % 12 || 12
      return `${formattedHours}:${m} ${ampm}`
    }
  }
  if (isoTimestamp) {
    try {
      const d = new Date(isoTimestamp)
      if (!isNaN(d.getTime())) {
        return new Intl.DateTimeFormat('en-US', {
          hour: 'numeric',
          minute: '2-digit',
          hour12: true,
        }).format(d)
      }
    } catch {
      // Fallback
    }
  }
  return timeStr || 'Scheduled'
}

/**
 * Returns an icon corresponding to the time of day.
 */
const getTimeOfDayIcon = (type) => {
  switch (type?.toUpperCase()) {
    case 'MORNING':
      return <Coffee className="w-3.5 h-3.5 text-amber-400" />
    case 'AFTERNOON':
      return <Sun className="w-3.5 h-3.5 text-orange-400" />
    case 'EVENING':
      return <Sunset className="w-3.5 h-3.5 text-rose-400" />
    case 'NIGHT':
    case 'BEDTIME':
      return <Moon className="w-3.5 h-3.5 text-indigo-400" />
    default:
      return <Clock className="w-3.5 h-3.5 text-rose-400" />
  }
}

/**
 * Formats frequency_type string (e.g. "DAILY" -> "Daily")
 */
const formatFrequency = (freq) => {
  if (!freq) return null
  switch (freq.toUpperCase()) {
    case 'DAILY':
      return 'Daily'
    case 'WEEKLY':
      return 'Weekly'
    case 'SPECIFIC_DAYS':
      return 'Specific Days'
    case 'INTERVAL_DAYS':
      return 'Interval'
    case 'AS_NEEDED':
      return 'As Needed'
    default:
      return freq.charAt(0) + freq.slice(1).toLowerCase()
  }
}

export const DueMedicationCard = ({ medication, onTake, onSkip, onSnooze }) => {
  if (!medication) return null

  const {
    medicine_name,
    generic_name,
    dose_quantity,
    dosage_unit,
    scheduled_time,
    time_of_day_type,
    due_at,
    frequency_type,
    instructions,
  } = medication

  const formattedTime = formatTime12h(scheduled_time, due_at)
  const formattedFreq = formatFrequency(frequency_type)

  return (
    <div className="group relative bg-white hover:bg-rose-50/20 border border-rose-200/80 hover:border-rose-300 rounded-xl p-4 transition-all duration-200 shadow-xs flex flex-col justify-between">
      {/* Top row: Medicine info and Status Badge */}
      <div className="flex items-start justify-between gap-3">
        <div className="flex items-start space-x-3 min-w-0">
          <div className="w-10 h-10 rounded-xl bg-rose-50 border border-rose-200/80 text-rose-600 flex items-center justify-center shrink-0 mt-0.5">
            <Pill className="w-5 h-5" />
          </div>

          <div className="min-w-0">
            <h3 className="text-sm sm:text-base font-bold text-slate-900 truncate">
              {medicine_name || 'Prescription Medication'}
            </h3>

            {generic_name && (
              <p className="text-xs text-slate-500 italic truncate -mt-0.5">
                {generic_name}
              </p>
            )}

            {/* Dose quantity and unit */}
            <div className="flex items-center gap-2 mt-1">
              <span className="inline-flex items-center text-xs font-semibold text-slate-700 bg-slate-100 px-2 py-0.5 rounded-md border border-slate-200">
                {dose_quantity ? Number(dose_quantity) : 1} {dosage_unit || 'dose'}
              </span>

              {formattedFreq && (
                <span className="inline-flex items-center gap-1 text-[11px] text-slate-500 font-medium">
                  <Repeat className="w-3 h-3 text-slate-400" />
                  {formattedFreq}
                </span>
              )}
            </div>
          </div>
        </div>

        {/* Status Badge */}
        <div className="flex flex-col items-end shrink-0">
          <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[11px] font-bold tracking-wide bg-rose-50 border border-rose-200 text-rose-700 shadow-xs">
            <AlertCircle className="w-3.5 h-3.5 text-rose-600" />
            DUE NOW
          </span>
          <span className="text-xs font-semibold text-slate-700 mt-1.5 flex items-center gap-1">
            {getTimeOfDayIcon(time_of_day_type)}
            {formattedTime}
          </span>
        </div>
      </div>

      {/* Instructions / Notes if provided by API */}
      {instructions && (
        <div className="mt-3 pt-2.5 border-t border-slate-100 flex items-start gap-2 text-xs text-slate-600">
          <FileText className="w-3.5 h-3.5 text-slate-400 shrink-0 mt-0.5" />
          <p className="leading-relaxed line-clamp-2">{instructions}</p>
        </div>
      )}

      {/* Action Buttons: Snooze, Skip, and Take */}
      <div className="mt-4 pt-3 border-t border-slate-100 flex items-center justify-end gap-2 flex-wrap">
        <button
          type="button"
          onClick={() => onSnooze && onSnooze(medication)}
          className="inline-flex items-center space-x-1 px-2.5 py-1.5 rounded-xl text-xs font-semibold text-indigo-700 hover:text-indigo-900 bg-indigo-50 hover:bg-indigo-100 border border-indigo-200 shadow-xs transition-all cursor-pointer focus:outline-none focus:ring-2 focus:ring-indigo-300"
        >
          <Clock className="w-3.5 h-3.5 text-indigo-600" />
          <span>Snooze</span>
        </button>

        <button
          type="button"
          onClick={() => onSkip && onSkip(medication)}
          className="inline-flex items-center space-x-1 px-2.5 py-1.5 rounded-xl text-xs font-semibold text-slate-600 hover:text-slate-900 bg-slate-50 hover:bg-slate-100 border border-slate-200 shadow-xs transition-all cursor-pointer focus:outline-none focus:ring-2 focus:ring-slate-300"
        >
          <XCircle className="w-3.5 h-3.5 text-slate-400" />
          <span>Skip</span>
        </button>

        <button
          type="button"
          onClick={() => onTake && onTake(medication)}
          className="inline-flex items-center space-x-1.5 px-3.5 py-1.5 rounded-xl text-xs font-semibold text-white bg-teal-600 hover:bg-teal-700 shadow-sm shadow-teal-600/20 transition-all cursor-pointer focus:outline-none focus:ring-2 focus:ring-teal-500/30"
        >
          <CheckCircle2 className="w-3.5 h-3.5 stroke-[2.4]" />
          <span>Take</span>
        </button>
      </div>
    </div>
  )
}
export default DueMedicationCard
