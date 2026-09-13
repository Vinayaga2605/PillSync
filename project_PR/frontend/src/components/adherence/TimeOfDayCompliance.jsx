import React from 'react'
import { Sun, Sunset, Moon, Coffee, Clock, CheckCircle2 } from 'lucide-react'

export const TimeOfDayCompliance = ({ historyItems = [] }) => {
  // Categorize historyItems into time slots
  const slots = {
    MORNING: {
      id: 'MORNING',
      name: 'Morning',
      timeRange: '05:00 - 11:59',
      icon: Coffee,
      iconColor: 'text-amber-500 bg-amber-50 border-amber-200',
      ringColor: '#f59e0b',
      taken: 0,
      skipped: 0,
      pending: 0,
      total: 0,
    },
    AFTERNOON: {
      id: 'AFTERNOON',
      name: 'Afternoon',
      timeRange: '12:00 - 16:59',
      icon: Sun,
      iconColor: 'text-orange-500 bg-orange-50 border-orange-200',
      ringColor: '#f97316',
      taken: 0,
      skipped: 0,
      pending: 0,
      total: 0,
    },
    EVENING: {
      id: 'EVENING',
      name: 'Evening',
      timeRange: '17:00 - 20:59',
      icon: Sunset,
      iconColor: 'text-rose-500 bg-rose-50 border-rose-200',
      ringColor: '#f43f5e',
      taken: 0,
      skipped: 0,
      pending: 0,
      total: 0,
    },
    NIGHT: {
      id: 'NIGHT',
      name: 'Night',
      timeRange: '21:00 - 04:59',
      icon: Moon,
      iconColor: 'text-indigo-500 bg-indigo-50 border-indigo-200',
      ringColor: '#6366f1',
      taken: 0,
      skipped: 0,
      pending: 0,
      total: 0,
    },
  }

  historyItems.forEach((item) => {
    const rawDate = item.scheduled_timestamp
    if (!rawDate) return
    const d = new Date(rawDate)
    const hour = d.getHours()

    let slotKey = 'NIGHT'
    if (hour >= 5 && hour < 12) slotKey = 'MORNING'
    else if (hour >= 12 && hour < 17) slotKey = 'AFTERNOON'
    else if (hour >= 17 && hour < 21) slotKey = 'EVENING'

    slots[slotKey].total += 1
    if (item.status === 'TAKEN') slots[slotKey].taken += 1
    else if (item.status === 'SKIPPED') slots[slotKey].skipped += 1
    else if (item.status === 'PENDING') slots[slotKey].pending += 1
  })

  return (
    <div className="bg-white border border-slate-200/80 rounded-2xl p-6 shadow-xs space-y-4">
      <div className="flex items-center justify-between pb-3 border-b border-slate-100">
        <div className="flex items-center space-x-3">
          <div className="w-10 h-10 rounded-xl bg-teal-50 border border-teal-200 text-teal-700 flex items-center justify-center shrink-0">
            <Clock className="w-5 h-5" />
          </div>
          <div>
            <h3 className="text-base font-bold text-slate-900 tracking-tight">
              Time-of-Day Intake Distribution
            </h3>
            <p className="text-xs text-slate-500 font-medium">
              Compliance rates evaluated across morning, afternoon, evening, and bedtime routines
            </p>
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {Object.values(slots).map((slot) => {
          const evaluated = slot.taken + slot.skipped
          const rate = evaluated > 0 ? Math.round((slot.taken / evaluated) * 100) : (slot.total > 0 && slot.taken > 0 ? 100 : 0)
          const Icon = slot.icon

          // SVG Mini Ring calculations
          const r = 24
          const circ = 2 * Math.PI * r
          const offset = circ - (rate / 100) * circ

          return (
            <div
              key={slot.id}
              className="bg-slate-50/70 border border-slate-200/80 rounded-2xl p-4 flex flex-col justify-between hover:border-slate-300 transition-all shadow-xs"
            >
              <div>
                <div className="flex items-center justify-between">
                  <div className="flex items-center space-x-2.5">
                    <div className={`w-8 h-8 rounded-xl border flex items-center justify-center shrink-0 ${slot.iconColor}`}>
                      <Icon className="w-4 h-4" />
                    </div>
                    <div>
                      <h4 className="text-sm font-bold text-slate-900">{slot.name}</h4>
                      <span className="text-[10px] text-slate-500 font-medium">{slot.timeRange}</span>
                    </div>
                  </div>

                  {/* Circular SVG Mini Progress Gauge */}
                  <div className="relative w-12 h-12 flex items-center justify-center shrink-0">
                    <svg width="48" height="48" className="-rotate-90">
                      <circle
                        cx="24"
                        cy="24"
                        r={r}
                        stroke="#e2e8f0"
                        strokeWidth="4"
                        fill="transparent"
                      />
                      <circle
                        cx="24"
                        cy="24"
                        r={r}
                        stroke={slot.ringColor}
                        strokeWidth="4"
                        strokeDasharray={circ}
                        strokeDashoffset={slot.total > 0 ? offset : circ}
                        strokeLinecap="round"
                        fill="transparent"
                        className="transition-all duration-700 ease-out"
                      />
                    </svg>
                    <span className="absolute text-[10px] font-extrabold text-slate-800">
                      {slot.total > 0 ? `${rate}%` : '—'}
                    </span>
                  </div>
                </div>

                <div className="mt-4 pt-3 border-t border-slate-200/60 space-y-1.5 text-xs">
                  <div className="flex justify-between items-center text-slate-600 font-medium">
                    <span>Taken doses:</span>
                    <strong className="text-emerald-700 font-bold">{slot.taken}</strong>
                  </div>
                  <div className="flex justify-between items-center text-slate-600 font-medium">
                    <span>Skipped doses:</span>
                    <strong className="text-rose-600 font-bold">{slot.skipped}</strong>
                  </div>
                  <div className="flex justify-between items-center text-slate-600 font-medium">
                    <span>Pending doses:</span>
                    <strong className="text-amber-700 font-bold">{slot.pending}</strong>
                  </div>
                </div>
              </div>

              <div className="mt-3 pt-2 border-t border-slate-200/50 flex items-center justify-between text-[11px]">
                <span className="text-slate-400 font-medium">Scheduled:</span>
                <span className="font-bold text-slate-800">{slot.total} events</span>
              </div>
            </div>
          )
        })}
      </div>
    </div>
  )
}

export default TimeOfDayCompliance
