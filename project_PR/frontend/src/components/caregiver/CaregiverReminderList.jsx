import React, { useState } from 'react'
import {
  Clock,
  AlertTriangle,
  Calendar,
  Pill,
  CheckCircle2,
  AlertCircle,
  Sun,
  Sunrise,
  Sunset,
  Moon,
  Info,
} from 'lucide-react'

export const CaregiverReminderList = ({
  dueReminders = [],
  upcomingReminders = [],
  isLoading = false,
  error = null,
  onRetry,
}) => {
  const [activeTab, setActiveTab] = useState('DUE') // 'DUE' | 'UPCOMING'

  const getTimeOfDayIcon = (timeOfDay) => {
    switch (timeOfDay) {
      case 'MORNING':
        return <Sunrise className="w-3.5 h-3.5 text-amber-500" />
      case 'AFTERNOON':
        return <Sun className="w-3.5 h-3.5 text-amber-600" />
      case 'EVENING':
        return <Sunset className="w-3.5 h-3.5 text-orange-500" />
      case 'NIGHT':
      case 'BEDTIME':
        return <Moon className="w-3.5 h-3.5 text-indigo-500" />
      default:
        return <Clock className="w-3.5 h-3.5 text-teal-600" />
    }
  }

  const formatScheduledTime = (timestamp, scheduledTime) => {
    if (scheduledTime) {
      return scheduledTime
    }
    if (timestamp) {
      try {
        const d = new Date(timestamp)
        return d.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
      } catch {
        return timestamp
      }
    }
    return 'Scheduled'
  }

  if (isLoading) {
    return (
      <div className="space-y-3">
        {[1, 2, 3].map((i) => (
          <div key={i} className="bg-white p-4 rounded-2xl border border-slate-200/80 animate-pulse flex items-center justify-between">
            <div className="space-y-2 flex-1">
              <div className="h-4 bg-slate-200 rounded w-1/3"></div>
              <div className="h-3 bg-slate-100 rounded w-1/2"></div>
            </div>
            <div className="h-6 bg-slate-200 rounded-full w-20"></div>
          </div>
        ))}
      </div>
    )
  }

  if (error) {
    return (
      <div className="p-6 rounded-2xl bg-rose-50 border border-rose-200 text-center">
        <AlertCircle className="w-8 h-8 text-rose-500 mx-auto mb-2" />
        <p className="text-sm font-semibold text-rose-800 mb-1">Unable to load medication reminders</p>
        <p className="text-xs text-rose-600 mb-3">{error}</p>
        {onRetry && (
          <button
            onClick={onRetry}
            className="px-3.5 py-1.5 bg-white text-rose-700 hover:bg-rose-100 border border-rose-200 rounded-xl text-xs font-semibold shadow-2xs transition-colors cursor-pointer"
          >
            Retry
          </button>
        )}
      </div>
    )
  }

  const displayedList = activeTab === 'DUE' ? dueReminders : upcomingReminders

  return (
    <div className="space-y-4">
      {/* Tabs */}
      <div className="flex items-center space-x-2 bg-slate-100/80 p-1 rounded-xl border border-slate-200/80 w-fit">
        <button
          onClick={() => setActiveTab('DUE')}
          className={`flex items-center space-x-1.5 px-3.5 py-1.5 rounded-lg text-xs font-semibold transition-all cursor-pointer ${
            activeTab === 'DUE'
              ? 'bg-white text-slate-900 shadow-2xs'
              : 'text-slate-600 hover:text-slate-900'
          }`}
        >
          <AlertTriangle className={`w-3.5 h-3.5 ${dueReminders.length > 0 ? 'text-amber-500' : 'text-slate-400'}`} />
          <span>Due Now ({dueReminders.length})</span>
        </button>

        <button
          onClick={() => setActiveTab('UPCOMING')}
          className={`flex items-center space-x-1.5 px-3.5 py-1.5 rounded-lg text-xs font-semibold transition-all cursor-pointer ${
            activeTab === 'UPCOMING'
              ? 'bg-white text-slate-900 shadow-2xs'
              : 'text-slate-600 hover:text-slate-900'
          }`}
        >
          <Clock className="w-3.5 h-3.5 text-sky-500" />
          <span>Upcoming 24h ({upcomingReminders.length})</span>
        </button>
      </div>

      {/* Reminders List */}
      {displayedList.length === 0 ? (
        <div className="p-8 rounded-2xl bg-slate-50 border border-slate-200/80 text-center">
          <CheckCircle2 className="w-9 h-9 text-emerald-500 mx-auto mb-2" />
          <p className="text-sm font-semibold text-slate-800 mb-1">
            {activeTab === 'DUE' ? 'No Medications Currently Due' : 'No Upcoming Medications In Next 24h'}
          </p>
          <p className="text-xs text-slate-500">
            {activeTab === 'DUE'
              ? 'The patient has taken or is caught up on all scheduled medication doses.'
              : 'There are no additional medication doses scheduled for the next 24 hours.'}
          </p>
        </div>
      ) : (
        <div className="space-y-3">
          {displayedList.map((item, idx) => {
            const medName = item.custom_medicine_name || item.medicine_name || 'Medication'
            const doseQty = item.dose_quantity || item.dose_quantity_prescribed || '1'
            const doseUnit = item.dosage_unit || item.dosage_unit_prescribed || 'dose'
            const timeFormatted = formatScheduledTime(item.scheduled_timestamp, item.scheduled_time)
            const timeOfDay = item.time_of_day_type || item.time_of_day

            return (
              <div
                key={item.dose_event_id || item.schedule_time_id || idx}
                className={`rounded-2xl border p-4 sm:p-5 transition-all flex flex-col sm:flex-row sm:items-center justify-between gap-3 ${
                  activeTab === 'DUE'
                    ? 'bg-amber-50/40 border-amber-200/80 shadow-xs'
                    : 'bg-white border-slate-200/80 shadow-xs'
                }`}
              >
                <div className="flex items-start space-x-3.5 min-w-0">
                  <div
                    className={`w-10 h-10 rounded-xl flex items-center justify-center shrink-0 mt-0.5 ${
                      activeTab === 'DUE'
                        ? 'bg-amber-100 text-amber-700 border border-amber-200'
                        : 'bg-sky-50 text-sky-600 border border-sky-100'
                    }`}
                  >
                    <Pill className="w-5 h-5" />
                  </div>

                  <div className="min-w-0">
                    <div className="flex items-center space-x-2 flex-wrap gap-y-1">
                      <h4 className="text-sm font-bold text-slate-900 truncate">{medName}</h4>
                      {activeTab === 'DUE' ? (
                        <span className="inline-flex items-center px-2 py-0.5 rounded-full text-[10px] font-bold bg-amber-100 text-amber-800 border border-amber-300">
                          <AlertTriangle className="w-2.5 h-2.5 mr-1" />
                          DUE NOW
                        </span>
                      ) : (
                        <span className="inline-flex items-center px-2 py-0.5 rounded-full text-[10px] font-semibold bg-sky-50 text-sky-700 border border-sky-200">
                          UPCOMING
                        </span>
                      )}
                    </div>

                    <div className="flex items-center space-x-3 mt-1.5 text-xs text-slate-600 flex-wrap gap-y-1">
                      <span className="font-semibold text-slate-800">
                        {doseQty} {doseUnit}
                      </span>
                      <span className="inline-flex items-center space-x-1 text-slate-600 font-medium">
                        {getTimeOfDayIcon(timeOfDay)}
                        <span>{timeFormatted}</span>
                      </span>
                      {item.scheduled_date && (
                        <span className="inline-flex items-center text-slate-500">
                          <Calendar className="w-3 h-3 mr-1" />
                          {item.scheduled_date}
                        </span>
                      )}
                    </div>

                    {item.instructions && (
                      <p className="text-[11px] text-slate-500 italic mt-1">{item.instructions}</p>
                    )}
                  </div>
                </div>

                <div className="sm:self-center shrink-0">
                  <span className="text-[11px] font-medium text-slate-400 bg-slate-50 sm:bg-transparent px-2 py-1 rounded border sm:border-0 border-slate-200/60">
                    Patient Notification Sent
                  </span>
                </div>
              </div>
            )
          })}
        </div>
      )}
    </div>
  )
}

export default CaregiverReminderList
