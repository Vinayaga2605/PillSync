import React, { useState } from 'react'
import {
  Activity,
  CheckCircle2,
  XCircle,
  Clock,
  Calendar,
  AlertCircle,
  TrendingUp,
  Info,
  ShieldCheck,
  AlertTriangle,
  TrendingDown,
} from 'lucide-react'

/**
 * Adherence Status Interpretation Thresholds (UI Guidance Only):
 * - Good: >= 80%
 * - Needs Attention: 50% - 79%
 * - Poor: < 50%
 * NOTE: These labels are medication schedule adherence UI indicators only and do not constitute medical diagnoses.
 */
const getAdherenceTier = (rate) => {
  if (rate >= 80) {
    return {
      label: 'Good Adherence',
      badge: 'bg-emerald-50 text-emerald-800 border-emerald-200',
      text: 'text-emerald-700',
      bg: 'bg-emerald-500',
      icon: CheckCircle2,
      description: 'Patient is consistently adhering to scheduled medication doses.',
    }
  }
  if (rate >= 50) {
    return {
      label: 'Needs Attention',
      badge: 'bg-amber-50 text-amber-800 border-amber-200',
      text: 'text-amber-700',
      bg: 'bg-amber-500',
      icon: AlertTriangle,
      description: 'Dose intake has intermittent misses or skips. Follow-up is recommended.',
    }
  }
  return {
    label: 'Poor Adherence',
    badge: 'bg-rose-50 text-rose-800 border-rose-200',
    text: 'text-rose-700',
    bg: 'bg-rose-500',
    icon: TrendingDown,
    description: 'Significant number of missed or skipped doses. Close monitoring required.',
  }
}

export const CaregiverAdherence = ({
  adherenceData = null,
  activePeriod = 'today',
  onPeriodChange,
  isLoading = false,
  error = null,
  onRetry,
}) => {
  const [customStart, setCustomStart] = useState('')
  const [customEnd, setCustomEnd] = useState('')

  const handleApplyCustom = () => {
    if (customStart && customEnd && onPeriodChange) {
      onPeriodChange('custom', { startDate: customStart, endDate: customEnd })
    }
  }

  if (isLoading) {
    return (
      <div className="bg-white rounded-2xl border border-slate-200/80 p-6 animate-pulse space-y-6">
        <div className="h-6 bg-slate-200 rounded w-1/4"></div>
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
          {[1, 2, 3, 4].map((i) => (
            <div key={i} className="h-20 bg-slate-100 rounded-xl"></div>
          ))}
        </div>
        <div className="h-4 bg-slate-100 rounded-full w-full"></div>
      </div>
    )
  }

  if (error) {
    return (
      <div className="p-6 rounded-2xl bg-rose-50 border border-rose-200 text-center">
        <AlertCircle className="w-8 h-8 text-rose-500 mx-auto mb-2" />
        <p className="text-sm font-semibold text-rose-800 mb-1">Failed to load adherence statistics</p>
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

  const rate = adherenceData?.adherence_percentage ?? adherenceData?.adherence_rate ?? 0
  const taken = adherenceData?.taken_doses ?? adherenceData?.taken_count ?? 0
  const skipped = adherenceData?.skipped_doses ?? adherenceData?.skipped_count ?? 0
  const pending = adherenceData?.pending_doses ?? adherenceData?.pending_count ?? 0
  const total = adherenceData?.total_doses ?? adherenceData?.total_count ?? (taken + skipped + pending)
  const completed = taken + skipped

  const tier = getAdherenceTier(rate)
  const TierIcon = tier.icon

  const takenPercent = total > 0 ? Math.round((taken / total) * 100) : 0
  const skippedPercent = total > 0 ? Math.round((skipped / total) * 100) : 0
  const pendingPercent = total > 0 ? Math.round((pending / total) * 100) : 0

  return (
    <div className="space-y-4">
      {/* Timeframe selector */}
      <div className="flex flex-wrap items-center justify-between gap-3 bg-white p-3 rounded-2xl border border-slate-200/80">
        <div className="flex items-center space-x-1.5 bg-slate-100/80 p-1 rounded-xl border border-slate-200/80 text-xs">
          {[
            { id: 'today', label: 'Today' },
            { id: 'week', label: 'This Week' },
            { id: 'month', label: 'This Month' },
            { id: 'custom', label: 'Custom Range' },
          ].map((tab) => (
            <button
              key={tab.id}
              onClick={() => onPeriodChange && onPeriodChange(tab.id)}
              className={`px-3 py-1.5 rounded-lg font-semibold transition-all cursor-pointer ${
                activePeriod === tab.id
                  ? 'bg-white text-slate-900 shadow-2xs'
                  : 'text-slate-600 hover:text-slate-900'
              }`}
            >
              {tab.label}
            </button>
          ))}
        </div>

        {activePeriod === 'custom' && (
          <div className="flex items-center space-x-2 text-xs flex-wrap gap-y-2">
            <input
              type="date"
              value={customStart}
              onChange={(e) => setCustomStart(e.target.value)}
              className="bg-slate-50 border border-slate-200 rounded-xl px-2.5 py-1 text-slate-700"
            />
            <span className="text-slate-400 font-medium">to</span>
            <input
              type="date"
              value={customEnd}
              onChange={(e) => setCustomEnd(e.target.value)}
              className="bg-slate-50 border border-slate-200 rounded-xl px-2.5 py-1 text-slate-700"
            />
            <button
              onClick={handleApplyCustom}
              disabled={!customStart || !customEnd}
              className="px-3 py-1 bg-slate-900 hover:bg-slate-800 disabled:opacity-50 text-white rounded-xl font-semibold shadow-2xs transition-colors cursor-pointer"
            >
              Apply
            </button>
          </div>
        )}
      </div>

      {/* Adherence Card */}
      <div className="bg-white rounded-2xl border border-slate-200/80 p-5 sm:p-6 shadow-xs space-y-6">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div>
            <div className="flex items-center space-x-2">
              <h4 className="text-base font-bold text-slate-900 flex items-center">
                <Activity className="w-4.5 h-4.5 mr-2 text-teal-600" />
                Adherence Rate & Health Compliance
              </h4>
            </div>
            <p className="text-xs text-slate-500 mt-0.5">
              Calculated based on scheduled doses recorded as taken versus skipped.
            </p>
          </div>

          <div className={`flex items-center space-x-2.5 px-4 py-2 rounded-xl border ${tier.badge}`}>
            <TierIcon className={`w-5 h-5 ${tier.text}`} />
            <div>
              <div className="flex items-baseline space-x-1.5">
                <span className={`text-2xl font-black ${tier.text}`}>{rate}%</span>
                <span className="text-xs font-bold text-slate-800">{tier.label}</span>
              </div>
            </div>
          </div>
        </div>

        {/* Status Interpretation Note */}
        <div className="bg-slate-50 p-3.5 rounded-xl border border-slate-200/80 flex items-start space-x-2.5 text-xs text-slate-600">
          <Info className="w-4 h-4 text-sky-600 shrink-0 mt-0.5" />
          <div>
            <span className="font-semibold text-slate-800">{tier.label}: </span>
            <span>{tier.description}</span>
            <span className="block text-[10px] text-slate-400 mt-0.5">
              *Adherence benchmarks: Good (≥80%), Needs Attention (50-79%), Poor (&lt;50%). UI compliance indicator only.
            </span>
          </div>
        </div>

        {/* Segmented Dose Breakdown Progress Bar */}
        <div>
          <div className="flex items-center justify-between text-xs mb-2">
            <span className="font-semibold text-slate-700">Dose Outcome Distribution</span>
            <span className="text-slate-500">{completed} of {total} completed</span>
          </div>

          {total === 0 ? (
            <div className="w-full bg-slate-100 h-3.5 rounded-full flex items-center justify-center text-[10px] text-slate-400 font-medium">
              No scheduled doses for this period
            </div>
          ) : (
            <div className="w-full bg-slate-100 h-3.5 rounded-full overflow-hidden flex">
              {taken > 0 && (
                <div
                  className="bg-emerald-500 h-full transition-all duration-500"
                  style={{ width: `${takenPercent}%` }}
                  title={`Taken: ${taken} (${takenPercent}%)`}
                />
              )}
              {skipped > 0 && (
                <div
                  className="bg-rose-500 h-full transition-all duration-500"
                  style={{ width: `${skippedPercent}%` }}
                  title={`Skipped: ${skipped} (${skippedPercent}%)`}
                />
              )}
              {pending > 0 && (
                <div
                  className="bg-amber-400 h-full transition-all duration-500"
                  style={{ width: `${pendingPercent}%` }}
                  title={`Pending: ${pending} (${pendingPercent}%)`}
                />
              )}
            </div>
          )}

          {/* Legend */}
          <div className="flex items-center space-x-4 mt-2 text-xs text-slate-600 flex-wrap gap-y-1">
            <span className="flex items-center">
              <span className="w-2.5 h-2.5 rounded-full bg-emerald-500 mr-1.5"></span>
              Taken ({taken})
            </span>
            <span className="flex items-center">
              <span className="w-2.5 h-2.5 rounded-full bg-rose-500 mr-1.5"></span>
              Skipped ({skipped})
            </span>
            <span className="flex items-center">
              <span className="w-2.5 h-2.5 rounded-full bg-amber-400 mr-1.5"></span>
              Pending ({pending})
            </span>
          </div>
        </div>

        {/* Metric Cards Grid */}
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3.5">
          <div className="bg-slate-50 p-3.5 rounded-xl border border-slate-100">
            <div className="flex items-center space-x-1.5 text-xs text-slate-500 font-medium mb-1">
              <Calendar className="w-3.5 h-3.5 text-slate-400" />
              <span>Total Scheduled</span>
            </div>
            <p className="text-lg font-bold text-slate-900">{total}</p>
          </div>

          <div className="bg-emerald-50/50 p-3.5 rounded-xl border border-emerald-100">
            <div className="flex items-center space-x-1.5 text-xs text-emerald-700 font-medium mb-1">
              <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600" />
              <span>Taken Doses</span>
            </div>
            <p className="text-lg font-bold text-emerald-800">{taken}</p>
          </div>

          <div className="bg-rose-50/50 p-3.5 rounded-xl border border-rose-100">
            <div className="flex items-center space-x-1.5 text-xs text-rose-700 font-medium mb-1">
              <XCircle className="w-3.5 h-3.5 text-rose-600" />
              <span>Skipped Doses</span>
            </div>
            <p className="text-lg font-bold text-rose-800">{skipped}</p>
          </div>

          <div className="bg-amber-50/50 p-3.5 rounded-xl border border-amber-100">
            <div className="flex items-center space-x-1.5 text-xs text-amber-700 font-medium mb-1">
              <Clock className="w-3.5 h-3.5 text-amber-600" />
              <span>Pending Doses</span>
            </div>
            <p className="text-lg font-bold text-amber-800">{pending}</p>
          </div>
        </div>
      </div>
    </div>
  )
}

export default CaregiverAdherence
