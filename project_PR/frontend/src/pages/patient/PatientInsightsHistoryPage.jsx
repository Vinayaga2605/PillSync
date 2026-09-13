import React, { useState, useEffect, useCallback } from 'react'
import { Link } from 'react-router-dom'
import { intelligenceService } from '../../services/intelligenceService'
import {
  History,
  ArrowLeft,
  TrendingUp,
  TrendingDown,
  Minus,
  RefreshCw,
  AlertCircle,
  CheckCircle2,
  AlertTriangle,
  Info,
  Pill,
  ShieldCheck,
  Calendar,
  Layers,
  BarChart3,
} from 'lucide-react'

export const PatientInsightsHistoryPage = () => {
  const [selectedDays, setSelectedDays] = useState(30) // 7 | 30 | 90
  const [timelineMode, setTimelineMode] = useState('DAILY') // 'DAILY' | 'WEEKLY'
  const [data, setData] = useState(null)
  const [isLoading, setIsLoading] = useState(true)
  const [isRefreshing, setIsRefreshing] = useState(false)
  const [error, setError] = useState(null)

  const fetchHistory = useCallback(async (days, isSilent = false) => {
    if (isSilent) {
      setIsRefreshing(true)
    } else {
      setIsLoading(true)
    }
    setError(null)

    try {
      const res = await intelligenceService.getPatientIntelligenceHistory(days)
      setData(res)
    } catch (err) {
      const detail = err.response?.data?.detail
      setError(
        typeof detail === 'string'
          ? detail
          : 'Unable to load medication history. Please try again later.'
      )
    } finally {
      setIsLoading(false)
      setIsRefreshing(false)
    }
  }, [])

  useEffect(() => {
    fetchHistory(selectedDays)
  }, [fetchHistory, selectedDays])

  // Helper for trend badge
  const renderTrendBadge = (trendDirection, changePct) => {
    switch (trendDirection) {
      case 'IMPROVING':
        return (
          <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs font-semibold bg-emerald-50 text-emerald-700 border border-emerald-200">
            <TrendingUp className="w-3.5 h-3.5" />
            <span>Improving {changePct !== null ? `(+${Math.abs(changePct)}%)` : ''}</span>
          </span>
        )
      case 'DECLINING':
        return (
          <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs font-semibold bg-rose-50 text-rose-700 border border-rose-200">
            <TrendingDown className="w-3.5 h-3.5" />
            <span>Declining {changePct !== null ? `(-${Math.abs(changePct)}%)` : ''}</span>
          </span>
        )
      case 'STABLE':
        return (
          <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs font-semibold bg-sky-50 text-sky-700 border border-sky-200">
            <Minus className="w-3.5 h-3.5" />
            <span>Stable</span>
          </span>
        )
      default:
        return (
          <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs font-semibold bg-slate-100 text-slate-600 border border-slate-200">
            <Info className="w-3.5 h-3.5" />
            <span>Insufficient Data</span>
          </span>
        )
    }
  }

  // Helper for medication status badge
  const renderStatusBadge = (status) => {
    switch (status) {
      case 'GOOD':
        return (
          <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-medium bg-emerald-50 text-emerald-700 border border-emerald-200">
            <CheckCircle2 className="w-3 h-3" />
            <span>Good</span>
          </span>
        )
      case 'NEEDS_ATTENTION':
        return (
          <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-medium bg-amber-50 text-amber-700 border border-amber-200">
            <AlertTriangle className="w-3 h-3" />
            <span>Needs Attention</span>
          </span>
        )
      default:
        return (
          <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-medium bg-slate-100 text-slate-600 border border-slate-200">
            <Minus className="w-3 h-3" />
            <span>Insufficient Data</span>
          </span>
        )
    }
  }

  return (
    <div className="space-y-6 max-w-7xl mx-auto pb-12">
      {/* 1. Header Section with Back Link */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 bg-white p-6 rounded-2xl border border-slate-200/80 shadow-xs">
        <div>
          <div className="flex items-center gap-2 mb-2">
            <Link
              to="/app/insights"
              className="inline-flex items-center gap-1 text-xs font-semibold text-teal-600 hover:text-teal-700 transition-colors"
            >
              <ArrowLeft className="w-3.5 h-3.5" />
              <span>Back to Smart Insights</span>
            </Link>
          </div>
          <div className="flex items-center gap-2.5">
            <div className="p-2.5 rounded-xl bg-teal-50 text-teal-600 border border-teal-200/80">
              <History className="w-6 h-6" />
            </div>
            <div>
              <h1 className="text-2xl font-bold text-slate-900 tracking-tight">Medication History</h1>
              <p className="text-xs sm:text-sm text-slate-500 mt-0.5">
                Explore your medication-taking patterns over time.
              </p>
            </div>
          </div>
        </div>

        {/* Period Selector Tabs */}
        <div className="flex items-center gap-2 self-start sm:self-auto">
          <div className="flex items-center bg-slate-100 p-1 rounded-xl">
            {[7, 30, 90].map((days) => (
              <button
                key={days}
                onClick={() => setSelectedDays(days)}
                disabled={isLoading && selectedDays === days}
                className={`px-3.5 py-1.5 rounded-lg text-xs font-semibold transition-all cursor-pointer ${
                  selectedDays === days
                    ? 'bg-white text-slate-900 shadow-2xs'
                    : 'text-slate-600 hover:text-slate-900'
                }`}
              >
                {days} Days
              </button>
            ))}
          </div>

          <button
            onClick={() => fetchHistory(selectedDays, true)}
            disabled={isLoading || isRefreshing}
            className="p-2 text-xs font-semibold rounded-xl bg-slate-100 hover:bg-slate-200/80 text-slate-700 transition-colors cursor-pointer disabled:opacity-50"
            title="Refresh history"
          >
            <RefreshCw className={`w-4 h-4 ${isRefreshing ? 'animate-spin' : ''}`} />
          </button>
        </div>
      </div>

      {/* Loading State */}
      {isLoading && (
        <div className="bg-white rounded-2xl border border-slate-200/80 p-12 text-center shadow-xs">
          <div className="w-10 h-10 border-3 border-teal-600 border-t-transparent rounded-full animate-spin mx-auto mb-4" />
          <h3 className="text-sm font-semibold text-slate-800">
            Loading {selectedDays}-day historical records...
          </h3>
          <p className="text-xs text-slate-400 mt-1 max-w-sm mx-auto">
            Aggregating daily intake logs, weekly summaries, and medication consistency rates.
          </p>
        </div>
      )}

      {/* Error State */}
      {!isLoading && error && (
        <div className="bg-rose-50 border border-rose-200 rounded-2xl p-6 text-rose-800 shadow-xs flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
          <div className="flex items-start gap-3">
            <AlertCircle className="w-5 h-5 text-rose-600 shrink-0 mt-0.5" />
            <div>
              <h3 className="text-sm font-bold">Unable to load history</h3>
              <p className="text-xs text-rose-700 mt-0.5">{error}</p>
            </div>
          </div>
          <button
            onClick={() => fetchHistory(selectedDays, false)}
            className="px-4 py-2 bg-rose-600 hover:bg-rose-700 text-white text-xs font-semibold rounded-xl transition-colors shrink-0 cursor-pointer"
          >
            Retry
          </button>
        </div>
      )}

      {/* Loaded Content */}
      {!isLoading && !error && data && (
        <>
          {/* 2. Top Summary & Period Comparison Cards */}
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
            {/* Overview Metric Card */}
            <div className="bg-white rounded-2xl border border-slate-200/80 p-6 shadow-xs flex flex-col justify-between">
              <div>
                <span className="text-xs font-semibold text-slate-500 uppercase tracking-wider">
                  {selectedDays}-Day Aggregate
                </span>
                <div className="mt-4 flex items-baseline gap-2">
                  {data.summary.overall_adherence !== null ? (
                    <>
                      <span className="text-4xl font-extrabold text-slate-900 tracking-tight">
                        {data.summary.overall_adherence}%
                      </span>
                      <span className="text-xs font-medium text-slate-400">adherence rate</span>
                    </>
                  ) : (
                    <span className="text-2xl font-bold text-slate-400">No dose logs</span>
                  )}
                </div>

                <div className="grid grid-cols-3 gap-2 mt-6 pt-4 border-t border-slate-100 text-center">
                  <div className="bg-slate-50 p-2.5 rounded-xl">
                    <span className="text-[10px] font-bold text-slate-400 uppercase">Taken</span>
                    <p className="text-base font-bold text-teal-600 mt-0.5">
                      {data.summary.total_taken}
                    </p>
                  </div>
                  <div className="bg-slate-50 p-2.5 rounded-xl">
                    <span className="text-[10px] font-bold text-slate-400 uppercase">Skipped</span>
                    <p className="text-base font-bold text-rose-600 mt-0.5">
                      {data.summary.total_skipped}
                    </p>
                  </div>
                  <div className="bg-slate-50 p-2.5 rounded-xl">
                    <span className="text-[10px] font-bold text-slate-400 uppercase">Completed</span>
                    <p className="text-base font-bold text-slate-800 mt-0.5">
                      {data.summary.total_completed}
                    </p>
                  </div>
                </div>
              </div>

              <div className="mt-6 pt-4 border-t border-slate-100 flex items-center justify-between text-xs text-slate-400">
                <span>Active Prescriptions</span>
                <span className="font-semibold text-slate-700">
                  {data.summary.active_medications_count} medications
                </span>
              </div>
            </div>

            {/* Period Comparison Card */}
            <div className="lg:col-span-2 bg-white rounded-2xl border border-slate-200/80 p-6 shadow-xs flex flex-col justify-between">
              <div>
                <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2">
                  <div>
                    <span className="text-xs font-semibold text-slate-500 uppercase tracking-wider">
                      Period Comparison
                    </span>
                    <h3 className="text-base font-bold text-slate-900 mt-0.5">
                      Last {selectedDays} Days vs Prior {selectedDays} Days
                    </h3>
                  </div>
                  {renderTrendBadge(
                    data.comparison.trend_direction,
                    data.comparison.change_percentage
                  )}
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 mt-6">
                  {/* Current Period */}
                  <div className="bg-slate-50 p-4 rounded-xl border border-slate-200/60">
                    <div className="flex items-center justify-between">
                      <span className="text-xs font-semibold text-slate-500">
                        Current {selectedDays} Days
                      </span>
                      <span className="text-[10px] font-bold px-2 py-0.5 rounded bg-teal-50 text-teal-700 border border-teal-200/60">
                        Selected
                      </span>
                    </div>
                    <p className="text-2xl font-bold text-slate-900 mt-1.5">
                      {data.comparison.current_adherence !== null
                        ? `${data.comparison.current_adherence}%`
                        : 'No Data'}
                    </p>
                    <p className="text-[11px] text-slate-500 mt-1">
                      <span className="text-teal-600 font-semibold">{data.comparison.current_taken} taken</span>
                      {' / '}
                      <span className="text-rose-600 font-semibold">{data.comparison.current_skipped} skipped</span>
                    </p>
                  </div>

                  {/* Previous Equivalent Period */}
                  <div className="bg-slate-50 p-4 rounded-xl border border-slate-200/60">
                    <div className="flex items-center justify-between">
                      <span className="text-xs font-semibold text-slate-500">
                        Previous {selectedDays} Days
                      </span>
                      <span className="text-[10px] font-semibold px-2 py-0.5 rounded bg-slate-100 text-slate-600">
                        Preceding
                      </span>
                    </div>
                    <p className="text-2xl font-bold text-slate-900 mt-1.5">
                      {data.comparison.previous_adherence !== null
                        ? `${data.comparison.previous_adherence}%`
                        : 'No Data'}
                    </p>
                    <p className="text-[11px] text-slate-500 mt-1">
                      <span className="text-teal-600 font-semibold">{data.comparison.previous_taken} taken</span>
                      {' / '}
                      <span className="text-rose-600 font-semibold">{data.comparison.previous_skipped} skipped</span>
                    </p>
                  </div>
                </div>

                {/* Explanatory Note */}
                <div className="mt-4 p-3 bg-slate-50/70 rounded-xl border border-slate-200/50 text-xs text-slate-600">
                  {data.comparison.trend_direction === 'IMPROVING' ? (
                    <p>
                      Your adherence rate was{' '}
                      <strong className="text-emerald-700">
                        +{Math.abs(data.comparison.change_percentage ?? 0)}% higher
                      </strong>{' '}
                      over the selected {selectedDays} days compared to the preceding {selectedDays} days.
                    </p>
                  ) : data.comparison.trend_direction === 'DECLINING' ? (
                    <p>
                      Your adherence rate was{' '}
                      <strong className="text-rose-700">
                        -{Math.abs(data.comparison.change_percentage ?? 0)}% lower
                      </strong>{' '}
                      over the selected {selectedDays} days compared to the preceding {selectedDays} days.
                    </p>
                  ) : data.comparison.trend_direction === 'STABLE' ? (
                    <p>
                      Your adherence rate has remained stable across the compared {selectedDays}-day periods.
                    </p>
                  ) : (
                    <p className="text-slate-500 italic">
                      More completed dose records are required before a reliable period comparison can be evaluated.
                    </p>
                  )}
                </div>
              </div>

              {/* Safety Notice */}
              <div className="mt-4 pt-3 border-t border-slate-100 flex items-center gap-2 text-[11px] text-slate-400">
                <ShieldCheck className="w-4 h-4 text-slate-400 shrink-0" />
                <span>
                  This historical comparison reflects software-recorded dose actions and is not a medical prognosis.
                </span>
              </div>
            </div>
          </div>

          {/* 3. Adherence Timeline Visualizer (Daily & Weekly) */}
          <div className="bg-white rounded-2xl border border-slate-200/80 p-6 shadow-xs">
            <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 mb-6">
              <div>
                <h2 className="text-base font-bold text-slate-900">Historical Adherence Timeline</h2>
                <p className="text-xs text-slate-500 mt-0.5">
                  Inspection of daily and weekly compliance over the selected {selectedDays}-day window.
                </p>
              </div>

              {/* Daily / Weekly View Switcher */}
              <div className="flex items-center bg-slate-100 p-1 rounded-xl self-start sm:self-auto">
                <button
                  onClick={() => setTimelineMode('DAILY')}
                  className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition-all cursor-pointer flex items-center gap-1.5 ${
                    timelineMode === 'DAILY'
                      ? 'bg-white text-slate-900 shadow-2xs'
                      : 'text-slate-600 hover:text-slate-900'
                  }`}
                >
                  <Calendar className="w-3.5 h-3.5" />
                  <span>Daily ({data.daily_timeline.length})</span>
                </button>
                <button
                  onClick={() => setTimelineMode('WEEKLY')}
                  className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition-all cursor-pointer flex items-center gap-1.5 ${
                    timelineMode === 'WEEKLY'
                      ? 'bg-white text-slate-900 shadow-2xs'
                      : 'text-slate-600 hover:text-slate-900'
                  }`}
                >
                  <BarChart3 className="w-3.5 h-3.5" />
                  <span>Weekly ({data.weekly_timeline.length})</span>
                </button>
              </div>
            </div>

            {/* Daily View Mode */}
            {timelineMode === 'DAILY' && (
              <div className="space-y-2 max-h-96 overflow-y-auto pr-1">
                {data.daily_timeline.map((point) => {
                  const hasDoses = point.completed_count > 0

                  return (
                    <div
                      key={point.date}
                      className="p-3 bg-slate-50/70 hover:bg-slate-50 border border-slate-200/60 rounded-xl flex flex-col sm:flex-row sm:items-center justify-between gap-2 transition-colors text-xs"
                    >
                      <div className="flex items-center gap-3">
                        <span className="font-semibold text-slate-700 min-w-[90px]">
                          {point.date}
                        </span>
                        <div className="text-[11px] text-slate-500">
                          {hasDoses ? (
                            <span>
                              <strong className="text-teal-600">{point.taken_count} taken</strong>
                              {' / '}
                              <strong className="text-rose-600">{point.skipped_count} skipped</strong>
                            </span>
                          ) : (
                            <span className="text-slate-400 italic">No scheduled doses completed</span>
                          )}
                        </div>
                      </div>

                      {/* Visual Progress Bar */}
                      <div className="flex items-center gap-3">
                        {hasDoses ? (
                          <>
                            <div className="w-32 bg-slate-200 h-2 rounded-full overflow-hidden">
                              <div
                                className={`h-full rounded-full ${
                                  (point.adherence_percentage ?? 0) >= 80
                                    ? 'bg-emerald-500'
                                    : (point.adherence_percentage ?? 0) >= 50
                                    ? 'bg-amber-500'
                                    : 'bg-rose-500'
                                }`}
                                style={{ width: `${point.adherence_percentage ?? 0}%` }}
                              />
                            </div>
                            <span className="font-bold text-slate-900 min-w-[45px] text-right">
                              {point.adherence_percentage}%
                            </span>
                          </>
                        ) : (
                          <span className="text-[11px] text-slate-400 italic">No data</span>
                        )}
                      </div>
                    </div>
                  )
                })}
              </div>
            )}

            {/* Weekly View Mode */}
            {timelineMode === 'WEEKLY' && (
              <div className="space-y-2.5">
                {data.weekly_timeline.map((week, idx) => {
                  const hasDoses = week.completed_count > 0

                  return (
                    <div
                      key={idx}
                      className="p-4 bg-slate-50 hover:bg-slate-100/60 border border-slate-200/80 rounded-xl flex flex-col sm:flex-row sm:items-center justify-between gap-3 transition-colors text-xs"
                    >
                      <div>
                        <div className="flex items-center gap-2">
                          <span className="font-bold text-slate-900">{week.week_label}</span>
                          <span className="text-[11px] text-slate-400">
                            ({week.week_start} to {week.week_end})
                          </span>
                        </div>
                        <p className="text-[11px] text-slate-500 mt-1">
                          {hasDoses ? (
                            <span>
                              Total: <strong className="text-teal-600">{week.taken_count} taken</strong>
                              {' / '}
                              <strong className="text-rose-600">{week.skipped_count} skipped</strong>
                              {' ('}{week.completed_count} completed doses{')'}
                            </span>
                          ) : (
                            <span className="text-slate-400 italic">No completed doses logged in this week</span>
                          )}
                        </p>
                      </div>

                      <div className="flex items-center gap-4">
                        {hasDoses ? (
                          <>
                            <div className="w-36 bg-slate-200 h-2.5 rounded-full overflow-hidden">
                              <div
                                className={`h-full rounded-full ${
                                  (week.adherence_percentage ?? 0) >= 80
                                    ? 'bg-emerald-500'
                                    : (week.adherence_percentage ?? 0) >= 50
                                    ? 'bg-amber-500'
                                    : 'bg-rose-500'
                                }`}
                                style={{ width: `${week.adherence_percentage ?? 0}%` }}
                              />
                            </div>
                            <span className="font-bold text-slate-900 text-sm min-w-[50px] text-right">
                              {week.adherence_percentage}%
                            </span>
                          </>
                        ) : (
                          <span className="text-xs text-slate-400 italic">No data</span>
                        )}
                      </div>
                    </div>
                  )
                })}
              </div>
            )}
          </div>

          {/* 4. Medication-Level Historical Breakdown */}
          <div className="bg-white rounded-2xl border border-slate-200/80 p-6 shadow-xs">
            <div className="flex items-center justify-between mb-4">
              <div>
                <h2 className="text-base font-bold text-slate-900">
                  Medication Performance ({selectedDays} Days)
                </h2>
                <p className="text-xs text-slate-500 mt-0.5">
                  Long-term adherence and trend rating for each prescribed medication.
                </p>
              </div>
              <span className="text-xs font-semibold text-slate-500">
                {data.medications.length} medications
              </span>
            </div>

            {data.medications.length > 0 ? (
              <div className="overflow-x-auto">
                <table className="w-full text-left text-xs">
                  <thead>
                    <tr className="border-b border-slate-100 text-slate-400 font-semibold uppercase tracking-wider text-[10px]">
                      <th className="py-3 px-4">Medication</th>
                      <th className="py-3 px-4">Adherence</th>
                      <th className="py-3 px-4">Doses ({selectedDays}d)</th>
                      <th className="py-3 px-4">Status</th>
                      <th className="py-3 px-4">Trend</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100 font-medium text-slate-700">
                    {data.medications.map((med) => (
                      <tr key={med.patient_medication_id} className="hover:bg-slate-50/60 transition-colors">
                        <td className="py-3.5 px-4">
                          <div className="flex items-center gap-2.5">
                            <div className="p-2 rounded-lg bg-teal-50 text-teal-600 border border-teal-100 shrink-0">
                              <Pill className="w-4 h-4" />
                            </div>
                            <div>
                              <p className="font-bold text-slate-900">{med.medicine_name}</p>
                              {med.dosage && (
                                <p className="text-[11px] text-slate-400">{med.dosage}</p>
                              )}
                            </div>
                          </div>
                        </td>

                        <td className="py-3.5 px-4">
                          {med.adherence_percentage !== null ? (
                            <div className="space-y-1">
                              <span className="font-bold text-slate-900 text-sm">
                                {med.adherence_percentage}%
                              </span>
                              <div className="w-24 h-1.5 bg-slate-100 rounded-full overflow-hidden">
                                <div
                                  className={`h-full rounded-full ${
                                    med.adherence_percentage >= 80
                                      ? 'bg-emerald-500'
                                      : med.adherence_percentage >= 50
                                      ? 'bg-amber-500'
                                      : 'bg-rose-500'
                                  }`}
                                  style={{ width: `${Math.min(100, med.adherence_percentage)}%` }}
                                />
                              </div>
                            </div>
                          ) : (
                            <span className="text-slate-400 italic">No dose history</span>
                          )}
                        </td>

                        <td className="py-3.5 px-4">
                          <div className="text-[11px] space-y-0.5">
                            <p>
                              <span className="text-teal-600 font-semibold">{med.taken_count} taken</span>
                              {' / '}
                              <span className="text-rose-600 font-semibold">{med.skipped_count} skipped</span>
                            </p>
                            <p className="text-slate-400 font-normal">
                              {med.completed_count} total completed
                            </p>
                          </div>
                        </td>

                        <td className="py-3.5 px-4">
                          {renderStatusBadge(med.status)}
                        </td>

                        <td className="py-3.5 px-4">
                          {renderTrendBadge(med.trend, null)}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            ) : (
              <div className="p-8 text-center bg-slate-50 rounded-2xl border border-dashed border-slate-200">
                <Pill className="w-8 h-8 text-slate-400 mx-auto mb-2" />
                <h4 className="text-sm font-semibold text-slate-800">No active medications</h4>
                <p className="text-xs text-slate-500 mt-1">
                  Add prescriptions to start tracking medication-specific historical trends.
                </p>
              </div>
            )}
          </div>
        </>
      )}
    </div>
  )
}

export default PatientInsightsHistoryPage
