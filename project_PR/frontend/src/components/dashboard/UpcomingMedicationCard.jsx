import React from 'react'
import {
  Pill,
  Clock,
  FileText,
  Repeat,
  Coffee,
  Sun,
  Sunset,
  Moon,
} from 'lucide-react'

/**
 * Formats a 24-hour time string (e.g. "14:00:00") or ISO timestamp to 12-hour AM/PM format.
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
 * Formats date and time in user-friendly format (e.g. "Today at 02:00 PM", "Tomorrow at 08:00 AM").
 */
const formatScheduleDateTime = (isoTimestamp, timeStr) => {
  const timeFormatted = formatTime12h(timeStr, isoTimestamp)
  if (!isoTimestamp) return timeFormatted

  try {
    const dateObj = new Date(isoTimestamp)
    if (isNaN(dateObj.getTime())) return timeFormatted

    const today = new Date()
    const isToday =
      dateObj.getDate() === today.getDate() &&
      dateObj.getMonth() === today.getMonth() &&
      dateObj.getFullYear() === today.getFullYear()

    const tomorrow = new Date(today)
    tomorrow.setDate(tomorrow.getDate() + 1)
    const isTomorrow =
      dateObj.getDate() === tomorrow.getDate() &&
      dateObj.getMonth() === tomorrow.getMonth() &&
      dateObj.getFullYear() === tomorrow.getFullYear()

    if (isToday) {
      return `Today at ${timeFormatted}`
    } else if (isTomorrow) {
      return `Tomorrow at ${timeFormatted}`
    } else {
      const dateLabel = new Intl.DateTimeFormat('en-US', {
        weekday: 'short',
        month: 'short',
        day: 'numeric',
      }).format(dateObj)
      return `${dateLabel} at ${timeFormatted}`
    }
  } catch {
    return timeFormatted
  }
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
      return <Clock className="w-3.5 h-3.5 text-amber-400" />
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

export const UpcomingMedicationCard = ({ medication }) => {
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

  const formattedDateTime = formatScheduleDateTime(due_at, scheduled_time)
  const formattedFreq = formatFrequency(frequency_type)

  return (
    <div className="group relative bg-white hover:bg-slate-50/60 border border-slate-200/80 hover:border-slate-300 rounded-xl p-4 transition-all duration-200 shadow-xs flex flex-col justify-between">
      {/* Top row: Medicine info and Status Badge */}
      <div className="flex items-start justify-between gap-3">
        <div className="flex items-start space-x-3 min-w-0">
          <div className="w-10 h-10 rounded-xl bg-teal-50 border border-teal-200/80 text-teal-600 flex items-center justify-center shrink-0 mt-0.5">
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
          <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[11px] font-bold tracking-wide bg-amber-50 border border-amber-200 text-amber-800 shadow-xs">
            <Clock className="w-3.5 h-3.5 text-amber-600" />
            UPCOMING
          </span>
          <span className="text-xs font-semibold text-slate-600 mt-1.5 flex items-center gap-1">
            {getTimeOfDayIcon(time_of_day_type)}
            {formattedDateTime}
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
    </div>
  )
}
export default UpcomingMedicationCard
