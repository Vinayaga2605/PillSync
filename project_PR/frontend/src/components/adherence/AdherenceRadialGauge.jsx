import React from 'react'
import { Award, CheckCircle2, XCircle, Clock } from 'lucide-react'

export const AdherenceRadialGauge = ({
  score = 0,
  taken = 0,
  skipped = 0,
  pending = 0,
  total = 0,
  periodStart = '',
  periodEnd = '',
}) => {
  const safeScore = Math.min(100, Math.max(0, Math.round(score || 0)))

  // SVG Geometry
  const size = 220
  const strokeWidth = 16
  const center = size / 2
  const radius = center - strokeWidth
  const circumference = 2 * Math.PI * radius
  const strokeDashoffset = circumference - (safeScore / 100) * circumference

  // Status configuration
  const getStatus = (pct) => {
    if (pct >= 85) {
      return {
        label: 'Excellent',
        sublabel: 'Great adherence',
        color: '#0d9488', // teal-600
        gradientId: 'gaugeTealGrad',
        badgeBg: 'bg-emerald-50 border-emerald-200 text-emerald-700',
      }
    }
    if (pct >= 65) {
      return {
        label: 'Good',
        sublabel: 'Consistent habit',
        color: '#0284c7', // sky-600
        gradientId: 'gaugeSkyGrad',
        badgeBg: 'bg-sky-50 border-sky-200 text-sky-700',
      }
    }
    if (pct >= 40) {
      return {
        label: 'Moderate',
        sublabel: 'Room to improve',
        color: '#d97706', // amber-600
        gradientId: 'gaugeAmberGrad',
        badgeBg: 'bg-amber-50 border-amber-200 text-amber-800',
      }
    }
    return {
      label: 'Needs Attention',
      sublabel: 'Missed doses detected',
      color: '#e11d48', // rose-600
      gradientId: 'gaugeRoseGrad',
      badgeBg: 'bg-rose-50 border-rose-200 text-rose-700',
    }
  }

  const status = getStatus(safeScore)
  const completed = taken + skipped
  const takenPct = total > 0 ? Math.round((taken / total) * 100) : 0
  const skippedPct = total > 0 ? Math.round((skipped / total) * 100) : 0
  const pendingPct = total > 0 ? Math.round((pending / total) * 100) : 0

  return (
    <div className="bg-white border border-slate-200/80 rounded-2xl p-6 shadow-xs flex flex-col lg:flex-row items-center justify-between gap-8">
      {/* Left Column: Radial Circular Gauge Diagram */}
      <div className="flex flex-col sm:flex-row items-center gap-6">
        <div className="relative flex items-center justify-center shrink-0">
          <svg
            width={size}
            height={size}
            className="transform -rotate-90 drop-shadow-xs"
          >
            <defs>
              <linearGradient id="gaugeTealGrad" x1="0%" y1="0%" x2="100%" y2="100%">
                <stop offset="0%" stopColor="#14b8a6" />
                <stop offset="100%" stopColor="#0d9488" />
              </linearGradient>
              <linearGradient id="gaugeSkyGrad" x1="0%" y1="0%" x2="100%" y2="100%">
                <stop offset="0%" stopColor="#38bdf8" />
                <stop offset="100%" stopColor="#0284c7" />
              </linearGradient>
              <linearGradient id="gaugeAmberGrad" x1="0%" y1="0%" x2="100%" y2="100%">
                <stop offset="0%" stopColor="#fbbf24" />
                <stop offset="100%" stopColor="#d97706" />
              </linearGradient>
              <linearGradient id="gaugeRoseGrad" x1="0%" y1="0%" x2="100%" y2="100%">
                <stop offset="0%" stopColor="#fb7185" />
                <stop offset="100%" stopColor="#e11d48" />
              </linearGradient>
            </defs>

            {/* Background Track Circle */}
            <circle
              cx={center}
              cy={center}
              r={radius}
              stroke="#f1f5f9"
              strokeWidth={strokeWidth}
              fill="transparent"
            />

            {/* Glowing Accent Ring (Subtle) */}
            <circle
              cx={center}
              cy={center}
              r={radius}
              stroke={`url(#${status.gradientId})`}
              strokeWidth={strokeWidth}
              strokeDasharray={circumference}
              strokeDashoffset={strokeDashoffset}
              strokeLinecap="round"
              fill="transparent"
              className="transition-all duration-1000 ease-out"
            />
          </svg>

          {/* Center Content Inside Gauge */}
          <div className="absolute inset-0 flex flex-col items-center justify-center text-center select-none pointer-events-none">
            <span className="text-4xl sm:text-5xl font-extrabold tracking-tight text-slate-900">
              {safeScore}%
            </span>
            <span className="text-xs font-semibold text-slate-500 uppercase tracking-wider mt-0.5">
              Adherence
            </span>
            <span className={`inline-flex items-center gap-1 text-[10px] font-bold px-2 py-0.5 rounded-full border mt-1.5 ${status.badgeBg}`}>
              <Award className="w-3 h-3 shrink-0" />
              <span>{status.label}</span>
            </span>
          </div>
        </div>

        {/* Gauge Context & Period Details */}
        <div className="text-center sm:text-left space-y-1.5 max-w-xs">
          <span className="text-xs font-bold text-teal-700 tracking-wider uppercase">
            Intake Performance
          </span>
          <h3 className="text-lg font-bold text-slate-900 leading-snug">
            Overall Compliance Rating
          </h3>
          <p className="text-xs text-slate-500 leading-relaxed font-medium">
            {status.sublabel}. Based on <strong className="text-slate-800 font-bold">{completed}</strong> evaluated dose events out of <strong className="text-slate-800 font-bold">{total}</strong> total scheduled.
          </p>
          {periodStart && periodEnd && (
            <p className="text-[11px] text-slate-400 font-medium pt-1">
              Period: {periodStart} to {periodEnd}
            </p>
          )}
        </div>
      </div>

      {/* Right Column: Visual Breakdown Cards with Mini Progress Meters */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-3.5 w-full lg:w-auto lg:min-w-[420px]">
        {/* Taken Card */}
        <div className="bg-emerald-50/50 border border-emerald-200/80 rounded-2xl p-4 flex flex-col justify-between shadow-xs hover:bg-emerald-50/80 transition-colors">
          <div className="flex items-center justify-between">
            <span className="text-xs font-bold text-emerald-800">Doses Taken</span>
            <div className="w-7 h-7 rounded-lg bg-emerald-100 text-emerald-700 flex items-center justify-center">
              <CheckCircle2 className="w-4 h-4" />
            </div>
          </div>
          <div className="mt-2.5">
            <div className="flex items-baseline space-x-1.5">
              <span className="text-2xl font-extrabold text-emerald-700">{taken}</span>
              <span className="text-[11px] font-semibold text-emerald-600">({takenPct}%)</span>
            </div>
            <div className="w-full bg-emerald-200/60 rounded-full h-1.5 mt-2 overflow-hidden">
              <div
                className="bg-emerald-600 h-full rounded-full transition-all duration-500"
                style={{ width: `${Math.min(100, takenPct)}%` }}
              />
            </div>
            <p className="text-[10px] text-emerald-600/90 mt-1 font-medium">Successfully completed</p>
          </div>
        </div>

        {/* Skipped Card */}
        <div className="bg-rose-50/50 border border-rose-200/80 rounded-2xl p-4 flex flex-col justify-between shadow-xs hover:bg-rose-50/80 transition-colors">
          <div className="flex items-center justify-between">
            <span className="text-xs font-bold text-rose-800">Doses Skipped</span>
            <div className="w-7 h-7 rounded-lg bg-rose-100 text-rose-700 flex items-center justify-center">
              <XCircle className="w-4 h-4" />
            </div>
          </div>
          <div className="mt-2.5">
            <div className="flex items-baseline space-x-1.5">
              <span className="text-2xl font-extrabold text-rose-600">{skipped}</span>
              <span className="text-[11px] font-semibold text-rose-500">({skippedPct}%)</span>
            </div>
            <div className="w-full bg-rose-200/60 rounded-full h-1.5 mt-2 overflow-hidden">
              <div
                className="bg-rose-600 h-full rounded-full transition-all duration-500"
                style={{ width: `${Math.min(100, skippedPct)}%` }}
              />
            </div>
            <p className="text-[10px] text-rose-600/90 mt-1 font-medium">Recorded as skipped</p>
          </div>
        </div>

        {/* Pending Card */}
        <div className="bg-amber-50/50 border border-amber-200/80 rounded-2xl p-4 flex flex-col justify-between shadow-xs hover:bg-amber-50/80 transition-colors">
          <div className="flex items-center justify-between">
            <span className="text-xs font-bold text-amber-800">Pending</span>
            <div className="w-7 h-7 rounded-lg bg-amber-100 text-amber-700 flex items-center justify-center">
              <Clock className="w-4 h-4" />
            </div>
          </div>
          <div className="mt-2.5">
            <div className="flex items-baseline space-x-1.5">
              <span className="text-2xl font-extrabold text-amber-700">{pending}</span>
              <span className="text-[11px] font-semibold text-amber-600">({pendingPct}%)</span>
            </div>
            <div className="w-full bg-amber-200/60 rounded-full h-1.5 mt-2 overflow-hidden">
              <div
                className="bg-amber-500 h-full rounded-full transition-all duration-500"
                style={{ width: `${Math.min(100, pendingPct)}%` }}
              />
            </div>
            <p className="text-[10px] text-amber-600/90 mt-1 font-medium">Upcoming or due</p>
          </div>
        </div>
      </div>
    </div>
  )
}

export default AdherenceRadialGauge
