import React, { useState } from 'react'
import { BarChart3, TrendingUp, Calendar, Info } from 'lucide-react'

export const AdherenceDailyChart = ({ dailyData = [] }) => {
  const [hoveredDay, setHoveredDay] = useState(null)

  if (!dailyData || dailyData.length === 0) {
    return null
  }

  // Find max doses across days for chart scaling
  const maxDoses = Math.max(...dailyData.map((d) => d.total || 0), 6)
  const chartHeight = 160

  return (
    <div className="bg-white border border-slate-200/80 rounded-2xl p-6 shadow-xs space-y-4">
      {/* Chart Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-3 border-b border-slate-100">
        <div className="flex items-center space-x-3">
          <div className="w-10 h-10 rounded-xl bg-teal-50 border border-teal-200 text-teal-700 flex items-center justify-center shrink-0">
            <BarChart3 className="w-5 h-5" />
          </div>
          <div>
            <h3 className="text-base font-bold text-slate-900 tracking-tight">
              Daily Intake Trend & Breakdown
            </h3>
            <p className="text-xs text-slate-500 font-medium">
              Daily dose compliance and intake distribution over the selected period
            </p>
          </div>
        </div>

        {/* Legend */}
        <div className="flex items-center gap-4 text-xs font-semibold text-slate-600 flex-wrap">
          <div className="flex items-center space-x-1.5">
            <span className="w-3 h-3 rounded-md bg-emerald-500 shrink-0" />
            <span>Taken</span>
          </div>
          <div className="flex items-center space-x-1.5">
            <span className="w-3 h-3 rounded-md bg-rose-500 shrink-0" />
            <span>Skipped</span>
          </div>
          <div className="flex items-center space-x-1.5">
            <span className="w-3 h-3 rounded-md bg-amber-400 shrink-0" />
            <span>Pending</span>
          </div>
          <div className="flex items-center space-x-1.5 text-teal-700">
            <span className="w-4 h-0.5 border-t-2 border-dashed border-teal-500 shrink-0" />
            <span className="text-[11px]">80% Target</span>
          </div>
        </div>
      </div>

      {/* Interactive Bar Chart Graphic */}
      <div className="relative pt-6 pb-2">
        {/* Target Line (80% Benchmark) */}
        <div className="absolute left-0 right-0 top-12 border-b border-dashed border-teal-400/60 pointer-events-none z-10 flex justify-end">
          <span className="text-[10px] font-bold text-teal-700 bg-teal-50/90 px-1.5 py-0.5 rounded -translate-y-2.5">
            80% Goal
          </span>
        </div>

        {/* Bars Container */}
        <div className="grid grid-flow-col auto-cols-fr gap-2 sm:gap-4 items-end h-44 px-2">
          {dailyData.map((day, idx) => {
            const takenHeight = (day.taken / maxDoses) * chartHeight
            const skippedHeight = (day.skipped / maxDoses) * chartHeight
            const pendingHeight = (day.pending / maxDoses) * chartHeight
            const isHovered = hoveredDay === idx

            return (
              <div
                key={day.date || idx}
                onMouseEnter={() => setHoveredDay(idx)}
                onMouseLeave={() => setHoveredDay(null)}
                className="relative flex flex-col items-center justify-end h-full group cursor-pointer"
              >
                {/* Tooltip on Hover */}
                {isHovered && (
                  <div className="absolute -top-16 z-30 bg-slate-900 text-white rounded-xl py-1.5 px-2.5 text-center shadow-lg pointer-events-none text-xs min-w-[120px] animate-in fade-in zoom-in-95 duration-150">
                    <p className="font-bold text-[11px] text-teal-300">{day.dayName}, {day.dateLabel}</p>
                    <p className="text-[10px] text-slate-200 mt-0.5">
                      {day.taken} taken • {day.skipped} skipped • {day.pending} pending
                    </p>
                    <p className="text-[10px] font-extrabold text-emerald-400 mt-0.5">
                      {day.complianceRate}% adherence
                    </p>
                  </div>
                )}

                {/* Compliance Percentage Pill Above Bar */}
                <span
                  className={`text-[10px] font-extrabold mb-1.5 transition-colors ${
                    day.complianceRate >= 80
                      ? 'text-emerald-700'
                      : day.complianceRate >= 50
                      ? 'text-amber-700'
                      : day.complianceRate > 0
                      ? 'text-rose-600'
                      : 'text-slate-400'
                  }`}
                >
                  {day.total > 0 ? `${day.complianceRate}%` : '—'}
                </span>

                {/* Stacked Vertical Bar */}
                <div className={`w-full max-w-[48px] rounded-t-xl overflow-hidden flex flex-col-reverse transition-transform duration-200 ${isHovered ? 'scale-105 shadow-md ring-2 ring-teal-500/20' : 'bg-slate-100'}`}>
                  {/* Taken (Bottom segment) */}
                  <div
                    style={{ height: `${takenHeight}px` }}
                    className="w-full bg-gradient-to-t from-emerald-600 to-teal-500 transition-all duration-500"
                  />
                  {/* Skipped (Middle segment) */}
                  <div
                    style={{ height: `${skippedHeight}px` }}
                    className="w-full bg-gradient-to-t from-rose-600 to-rose-400 transition-all duration-500"
                  />
                  {/* Pending (Top segment) */}
                  <div
                    style={{ height: `${pendingHeight}px` }}
                    className="w-full bg-gradient-to-t from-amber-500 to-amber-400 transition-all duration-500"
                  />
                </div>

                {/* X-Axis Labels */}
                <div className="mt-2 text-center select-none">
                  <span className={`block text-xs font-bold ${day.isToday ? 'text-teal-700' : 'text-slate-700'}`}>
                    {day.dayName}
                  </span>
                  <span className="block text-[10px] text-slate-400 font-medium">
                    {day.dateLabel}
                  </span>
                </div>
              </div>
            )
          })}
        </div>
      </div>

      {/* Bottom Insights Callout */}
      <div className="flex flex-col sm:flex-row items-center justify-between gap-3 pt-3 border-t border-slate-100 text-xs text-slate-600">
        <div className="flex items-center space-x-2">
          <Info className="w-4 h-4 text-teal-600 shrink-0" />
          <span>
            Bars display total daily dose volume. Green indicates confirmed doses, amber is pending, and rose represents skipped.
          </span>
        </div>
        <div className="flex items-center gap-3 font-semibold shrink-0">
          <span className="text-slate-500">Target Benchmark:</span>
          <span className="text-teal-700 font-bold bg-teal-50 px-2 py-0.5 rounded-md border border-teal-200">
            ≥ 80% Adherence
          </span>
        </div>
      </div>
    </div>
  )
}

export default AdherenceDailyChart
