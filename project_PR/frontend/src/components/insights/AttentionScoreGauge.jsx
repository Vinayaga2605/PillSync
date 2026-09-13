import React from 'react'
import { AlertTriangle, AlertOctagon, CheckCircle2, ShieldCheck } from 'lucide-react'

export const AttentionScoreGauge = ({ attentionScore }) => {
  const score = attentionScore?.score ?? 0
  const level = attentionScore?.level ?? 'LOW'
  const reasons = attentionScore?.reasons ?? []
  const disclaimer = attentionScore?.disclaimer

  // Determine styling and labels based on score & level
  const getLevelConfig = () => {
    if (score >= 60 || level === 'HIGH_ATTENTION') {
      return {
        label: 'High Attention Needed',
        subtitle: 'Recent routine disruptions or missed doses detected',
        badgeBg: 'bg-rose-50 text-rose-700 border-rose-200',
        strokeColor: '#f43f5e', // rose-500
        icon: AlertOctagon,
        iconColor: 'text-rose-600',
        riskText: 'Warrants immediate review',
      }
    }
    if (score >= 30 || level === 'MODERATE') {
      return {
        label: 'Moderate Attention',
        subtitle: 'Occasional missed doses or minor schedule drift',
        badgeBg: 'bg-amber-50 text-amber-700 border-amber-200',
        strokeColor: '#f59e0b', // amber-500
        icon: AlertTriangle,
        iconColor: 'text-amber-600',
        riskText: 'Room for improvement',
      }
    }
    return {
      label: 'Optimal Consistency',
      subtitle: 'Medication schedule is being followed reliably',
      badgeBg: 'bg-emerald-50 text-emerald-700 border-emerald-200',
      strokeColor: '#10b981', // emerald-500
      icon: CheckCircle2,
      iconColor: 'text-emerald-600',
      riskText: 'Excellent adherence',
    }
  }

  const config = getLevelConfig()
  const IconComp = config.icon

  // Semi-circular gauge parameters
  const radius = 80
  const circumference = Math.PI * radius // ~251.32
  const progressOffset = circumference - (Math.min(100, Math.max(0, score)) / 100) * circumference

  return (
    <div className="bg-white rounded-2xl border border-slate-200/80 p-6 shadow-xs flex flex-col justify-between h-full">
      <div>
        {/* Card Header */}
        <div className="flex items-center justify-between gap-2 pb-2">
          <div>
            <span className="text-[11px] font-bold text-slate-400 uppercase tracking-wider block">
              Routine Health
            </span>
            <h3 className="text-base font-bold text-slate-900 mt-0.5">
              Attention Index
            </h3>
          </div>
          <span
            className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-bold border ${config.badgeBg}`}
          >
            <IconComp className={`w-3.5 h-3.5 ${config.iconColor}`} />
            <span>{config.label}</span>
          </span>
        </div>

        {/* Semi-Circular SVG Gauge */}
        <div className="flex flex-col items-center justify-center my-3 relative">
          <div className="w-52 h-28 relative flex items-end justify-center overflow-hidden">
            <svg
              viewBox="0 0 200 110"
              className="w-52 h-28 transform -rotate-180"
              aria-label="Attention Score Gauge"
            >
              {/* Background Arc */}
              <path
                d="M 20 100 A 80 80 0 0 1 180 100"
                fill="none"
                stroke="#f1f5f9"
                strokeWidth="16"
                strokeLinecap="round"
              />
              {/* Colored Segments Guide */}
              <path
                d="M 20 100 A 80 80 0 0 1 180 100"
                fill="none"
                stroke="url(#gaugeGradient)"
                strokeWidth="16"
                strokeDasharray={circumference}
                strokeDashoffset={progressOffset}
                strokeLinecap="round"
                className="transition-all duration-1000 ease-out"
              />
              <defs>
                <linearGradient id="gaugeGradient" x1="0%" y1="0%" x2="100%" y2="0%">
                  <stop offset="0%" stopColor="#10b981" />
                  <stop offset="50%" stopColor="#f59e0b" />
                  <stop offset="100%" stopColor="#f43f5e" />
                </linearGradient>
              </defs>
            </svg>

            {/* Score in Center */}
            <div className="absolute bottom-1 flex flex-col items-center justify-center text-center">
              <span className="text-3xl font-extrabold text-slate-900 tracking-tight leading-none">
                {score}
              </span>
              <span className="text-[10px] font-semibold text-slate-400 mt-0.5">
                / 100 Risk Score
              </span>
            </div>
          </div>

          {/* Scale Labels */}
          <div className="w-52 flex justify-between text-[10px] font-semibold text-slate-400 px-1 mt-1">
            <span className="text-emerald-600">0 (Solid)</span>
            <span className="text-amber-500">50 (Moderate)</span>
            <span className="text-rose-600">100 (Urgent)</span>
          </div>

          {/* Explanatory subtitle */}
          <p className="text-xs text-slate-500 text-center mt-2.5 max-w-xs font-medium">
            {config.subtitle}
          </p>
        </div>

        {/* Contributing Factors */}
        <div className="mt-4 pt-4 border-t border-slate-100 space-y-2">
          <div className="flex items-center justify-between">
            <span className="text-xs font-bold text-slate-700">
              Why this score?
            </span>
            <span className="text-[10px] font-semibold text-slate-400">
              {reasons.length} factor{reasons.length !== 1 ? 's' : ''} detected
            </span>
          </div>

          {reasons.length > 0 ? (
            <div className="space-y-1.5">
              {reasons.map((reason, idx) => (
                <div
                  key={idx}
                  className="flex items-start gap-2 p-2.5 rounded-xl bg-slate-50 border border-slate-100 text-xs text-slate-700 leading-relaxed"
                >
                  <span className="w-1.5 h-1.5 rounded-full bg-rose-500 mt-1.5 shrink-0" />
                  <span>{reason}</span>
                </div>
              ))}
            </div>
          ) : (
            <div className="p-2.5 rounded-xl bg-emerald-50/70 border border-emerald-100 text-xs text-emerald-800 flex items-center gap-2">
              <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0" />
              <span>No negative factors detected in recent history.</span>
            </div>
          )}
        </div>
      </div>

      {/* Safety Boundary Disclaimer */}
      <div className="mt-5 pt-3 border-t border-slate-100">
        <div className="flex items-start gap-2 text-[11px] text-slate-400 leading-relaxed">
          <ShieldCheck className="w-4 h-4 text-slate-400 shrink-0 mt-0.5" />
          <span>
            {disclaimer ||
              'Reflects behavioral consistency in app records; not a medical or clinical diagnosis.'}
          </span>
        </div>
      </div>
    </div>
  )
}

export default AttentionScoreGauge
