import React, { useState, useEffect, useCallback } from 'react'
import { caregiverService } from '../../services/caregiverService'
import {
  Sparkles,
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
  Activity,
  Clock,
  Calendar,
  Lightbulb,
  ChevronRight,
  HelpCircle,
} from 'lucide-react'

export const CaregiverIntelligence = ({ patientId, patientName }) => {
  // State
  const [summaryData, setSummaryData] = useState(null)
  const [historyData, setHistoryData] = useState(null)
  const [suggestionsData, setSuggestionsData] = useState(null)
  const [historyDays, setHistoryDays] = useState(30) // 7 | 30 | 90

  const [isLoading, setIsLoading] = useState(true)
  const [isRefreshing, setIsRefreshing] = useState(false)
  const [error, setError] = useState(null)

  // Fetch all intelligence data
  const fetchAllIntelligence = useCallback(
    async (days = historyDays, isSilent = false) => {
      if (!patientId) return
      if (isSilent) {
        setIsRefreshing(true)
      } else {
        setIsLoading(true)
      }
      setError(null)

      try {
        const [sumRes, histRes, sugRes] = await Promise.allSettled([
          caregiverService.getPatientIntelligenceSummary(patientId),
          caregiverService.getPatientIntelligenceHistory(patientId, days),
          caregiverService.getPatientIntelligenceSuggestions(patientId),
        ])

        if (sumRes.status === 'fulfilled') {
          setSummaryData(sumRes.value)
        } else {
          const detail = sumRes.reason?.response?.data?.detail
          throw new Error(
            typeof detail === 'string'
              ? detail
              : 'Unable to load patient medication intelligence summary.'
          )
        }

        if (histRes.status === 'fulfilled') {
          setHistoryData(histRes.value)
        } else {
          setHistoryData(null)
        }

        if (sugRes.status === 'fulfilled') {
          setSuggestionsData(sugRes.value)
        } else {
          setSuggestionsData(null)
        }
      } catch (err) {
        setError(err.message || 'Failed to load medication insights.')
      } finally {
        setIsLoading(false)
        setIsRefreshing(false)
      }
    },
    [patientId, historyDays]
  )

  useEffect(() => {
    fetchAllIntelligence(historyDays)
  }, [fetchAllIntelligence, historyDays])

  // Handle history period toggle
  const handlePeriodChange = (days) => {
    setHistoryDays(days)
  }

  // Trend Badge Helper
  const renderTrendBadge = (trendDirection, changePct) => {
    const formattedChange = Math.abs(changePct ?? 0).toFixed(1)
    switch (trendDirection) {
      case 'IMPROVING':
        return (
          <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-bold bg-emerald-50 text-emerald-700 border border-emerald-200">
            <TrendingUp className="w-3.5 h-3.5" />
            <span>Improving (+{formattedChange}%)</span>
          </span>
        )
      case 'DECLINING':
        return (
          <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-bold bg-rose-50 text-rose-700 border border-rose-200">
            <TrendingDown className="w-3.5 h-3.5" />
            <span>Declining (-{formattedChange}%)</span>
          </span>
        )
      case 'STABLE':
        return (
          <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-bold bg-sky-50 text-sky-700 border border-sky-200">
            <Minus className="w-3.5 h-3.5" />
            <span>Stable</span>
          </span>
        )
      default:
        return (
          <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-bold bg-slate-100 text-slate-600 border border-slate-200">
            <span>Insufficient Data</span>
          </span>
        )
    }
  }

  if (isLoading) {
    return (
      <div className="space-y-6 animate-pulse">
        <div className="h-32 bg-slate-100 rounded-2xl border border-slate-200/80"></div>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <div className="h-28 bg-slate-100 rounded-2xl"></div>
          <div className="h-28 bg-slate-100 rounded-2xl"></div>
          <div className="h-28 bg-slate-100 rounded-2xl"></div>
        </div>
        <div className="h-64 bg-slate-100 rounded-2xl border border-slate-200/80"></div>
      </div>
    )
  }

  if (error) {
    return (
      <div className="p-8 rounded-2xl bg-rose-50 border border-rose-200 text-center max-w-lg mx-auto">
        <AlertCircle className="w-10 h-10 text-rose-500 mx-auto mb-2" />
        <h3 className="text-sm font-bold text-rose-900 mb-1">Failed to load Smart Insights</h3>
        <p className="text-xs text-rose-600 mb-4">{error}</p>
        <button
          onClick={() => fetchAllIntelligence(historyDays)}
          className="px-4 py-2 bg-rose-600 hover:bg-rose-700 text-white rounded-xl text-xs font-semibold shadow-xs transition-colors cursor-pointer"
        >
          Retry
        </button>
      </div>
    )
  }

  const adherenceRate = summaryData?.overall_adherence_rate
  const adherenceChange = summaryData?.adherence_change_percentage
  const trendDirection = summaryData?.trend_direction || 'INSUFFICIENT_DATA'
  const insights = summaryData?.insights || []
  const medPerformance = summaryData?.medication_performance || []
  const suggestions = suggestionsData?.suggestions || []

  return (
    <div className="space-y-6">
      {/* Header with Title and Refresh */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <div className="flex items-center space-x-2.5">
          <div className="w-9 h-9 rounded-xl bg-gradient-to-tr from-sky-500 to-indigo-600 flex items-center justify-center text-white shadow-2xs">
            <Sparkles className="w-5 h-5" />
          </div>
          <div>
            <h2 className="text-base sm:text-lg font-bold text-slate-900">
              Medication Intelligence & Trends
            </h2>
            <p className="text-xs text-slate-500">
              Automated pattern detection and longitudinal adherence analytics for{' '}
              <span className="font-semibold text-slate-700">{patientName || 'Patient'}</span>
            </p>
          </div>
        </div>

        <button
          onClick={() => fetchAllIntelligence(historyDays, true)}
          disabled={isLoading || isRefreshing}
          className="inline-flex items-center space-x-1.5 px-3 py-1.5 rounded-xl bg-white hover:bg-slate-50 text-slate-600 text-xs font-medium border border-slate-200/80 shadow-2xs transition-colors cursor-pointer disabled:opacity-50 self-start sm:self-auto"
        >
          <RefreshCw className={`w-3.5 h-3.5 ${isRefreshing ? 'animate-spin text-sky-600' : ''}`} />
          <span>{isRefreshing ? 'Refreshing...' : 'Refresh Insights'}</span>
        </button>
      </div>

      {/* Non-Clinical Disclaimer Banner */}
      <div className="bg-sky-50/70 border border-sky-200/80 rounded-2xl p-4 flex items-start space-x-3 text-xs text-sky-900 shadow-2xs">
        <ShieldCheck className="w-5 h-5 text-sky-600 shrink-0 mt-0.5" />
        <div className="space-y-1">
          <p className="font-bold text-sky-950">Caregiver Clinical Safety Disclaimer</p>
          <p className="text-sky-800 leading-relaxed text-[11px]">
            These insights are deterministic summaries of recorded dose confirmations and schedules.
            They are intended for care coordination and routine support only. They do not constitute
            medical advice, diagnosis, treatment adjustments, or emergency predictions.
          </p>
        </div>
      </div>

      {/* Top Metric Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {/* Overall Adherence */}
        <div className="bg-white p-5 rounded-2xl border border-slate-200/80 shadow-xs flex flex-col justify-between">
          <div className="flex items-center justify-between text-xs font-semibold text-slate-500">
            <span>Overall Adherence</span>
            <Activity className="w-4 h-4 text-teal-600" />
          </div>
          <div className="mt-3">
            <p
              className={`text-3xl font-black ${
                adherenceRate !== null && adherenceRate >= 80
                  ? 'text-emerald-700'
                  : adherenceRate !== null && adherenceRate >= 50
                  ? 'text-amber-700'
                  : adherenceRate !== null
                  ? 'text-rose-700'
                  : 'text-slate-900'
              }`}
            >
              {adherenceRate !== null && adherenceRate !== undefined ? `${adherenceRate}%` : 'N/A'}
            </p>
            <p className="text-[11px] text-slate-400 mt-1">Based on taken vs. skipped doses</p>
          </div>
        </div>

        {/* Adherence Trend */}
        <div className="bg-white p-5 rounded-2xl border border-slate-200/80 shadow-xs flex flex-col justify-between">
          <div className="flex items-center justify-between text-xs font-semibold text-slate-500">
            <span>30-Day Trend</span>
            <TrendingUp className="w-4 h-4 text-sky-600" />
          </div>
          <div className="mt-3">
            <div>{renderTrendBadge(trendDirection, adherenceChange)}</div>
            <p className="text-[11px] text-slate-400 mt-2">Comparison with previous period</p>
          </div>
        </div>

        {/* Active Medications Monitored */}
        <div className="bg-white p-5 rounded-2xl border border-slate-200/80 shadow-xs flex flex-col justify-between">
          <div className="flex items-center justify-between text-xs font-semibold text-slate-500">
            <span>Medications Tracked</span>
            <Pill className="w-4 h-4 text-indigo-600" />
          </div>
          <div className="mt-3">
            <p className="text-3xl font-black text-slate-900">{medPerformance.length}</p>
            <p className="text-[11px] text-slate-400 mt-1">Active regimens analyzed</p>
          </div>
        </div>

        {/* Caregiver Suggestions Available */}
        <div className="bg-white p-5 rounded-2xl border border-slate-200/80 shadow-xs flex flex-col justify-between">
          <div className="flex items-center justify-between text-xs font-semibold text-slate-500">
            <span>Care Suggestions</span>
            <Lightbulb className="w-4 h-4 text-amber-500" />
          </div>
          <div className="mt-3">
            <p className="text-3xl font-black text-amber-600">{suggestions.length}</p>
            <p className="text-[11px] text-slate-400 mt-1">Actionable support tips</p>
          </div>
        </div>
      </div>

      {/* Pattern Insights Section */}
      {insights.length > 0 && (
        <div className="bg-white rounded-2xl border border-slate-200/80 p-5 shadow-xs space-y-3.5">
          <div className="flex items-center space-x-2">
            <Sparkles className="w-4 h-4 text-sky-600" />
            <h3 className="text-sm font-bold text-slate-900">Detected Adherence Patterns</h3>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
            {insights.map((insight, idx) => {
              const isWarning =
                insight.type === 'LOW_ADHERENCE' ||
                insight.type === 'MISSED_DOSES' ||
                insight.type === 'DECLINING_ADHERENCE'
              return (
                <div
                  key={idx}
                  className={`p-4 rounded-xl border text-xs flex items-start space-x-3 ${
                    isWarning
                      ? 'bg-amber-50/50 border-amber-200/80 text-amber-900'
                      : 'bg-slate-50/70 border-slate-200/80 text-slate-800'
                  }`}
                >
                  <div
                    className={`p-1.5 rounded-lg shrink-0 ${
                      isWarning ? 'bg-amber-100 text-amber-700' : 'bg-sky-100 text-sky-700'
                    }`}
                  >
                    {isWarning ? (
                      <AlertTriangle className="w-4 h-4" />
                    ) : (
                      <CheckCircle2 className="w-4 h-4" />
                    )}
                  </div>
                  <div className="space-y-1 min-w-0">
                    <p className="font-bold text-slate-900">{insight.title || insight.type}</p>
                    <p className="text-slate-600 leading-relaxed text-[11px]">
                      {insight.description || insight.message}
                    </p>
                  </div>
                </div>
              )
            })}
          </div>
        </div>
      )}

      {/* Smart Caregiver Suggestions Section */}
      {suggestions.length > 0 && (
        <div className="bg-gradient-to-br from-amber-50/40 via-white to-sky-50/30 rounded-2xl border border-amber-200/80 p-5 shadow-xs space-y-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center space-x-2 text-amber-900">
              <Lightbulb className="w-5 h-5 text-amber-600 shrink-0" />
              <h3 className="text-sm sm:text-base font-bold">Caregiver Support Suggestions</h3>
            </div>
            <span className="text-[11px] font-semibold text-amber-800 bg-amber-100/80 px-2.5 py-0.5 rounded-full">
              Non-Clinical Guidance
            </span>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-3.5">
            {suggestions.map((sug, idx) => (
              <div
                key={idx}
                className="bg-white rounded-xl border border-amber-200/90 p-4 shadow-2xs flex flex-col justify-between space-y-3"
              >
                <div>
                  <div className="flex items-center justify-between gap-2">
                    <h4 className="text-xs font-bold text-slate-900">{sug.title}</h4>
                    {sug.priority && (
                      <span
                        className={`text-[10px] font-bold px-2 py-0.5 rounded-full ${
                          sug.priority === 'HIGH'
                            ? 'bg-rose-100 text-rose-700 border border-rose-200'
                            : sug.priority === 'MEDIUM'
                            ? 'bg-amber-100 text-amber-800 border border-amber-200'
                            : 'bg-sky-100 text-sky-700 border border-sky-200'
                        }`}
                      >
                        {sug.priority} PRIORITY
                      </span>
                    )}
                  </div>
                  <p className="text-xs text-slate-600 mt-2 leading-relaxed">{sug.message}</p>
                </div>

                {sug.rationale && (
                  <div className="pt-2 border-t border-slate-100 text-[11px] text-slate-500 flex items-start space-x-1.5">
                    <Info className="w-3.5 h-3.5 text-slate-400 shrink-0 mt-0.5" />
                    <span>
                      <strong className="text-slate-700">Rationale:</strong> {sug.rationale}
                    </span>
                  </div>
                )}
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Historical Trend Timeline (7 / 30 / 90 Days) */}
      <div className="bg-white rounded-2xl border border-slate-200/80 p-5 shadow-xs space-y-4">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
          <div className="flex items-center space-x-2">
            <Calendar className="w-4 h-4 text-sky-600" />
            <h3 className="text-sm sm:text-base font-bold text-slate-900">
              Long-Term Adherence History
            </h3>
          </div>

          {/* Time Window Selector */}
          <div className="flex items-center space-x-1 bg-slate-100 p-1 rounded-xl text-xs font-semibold">
            {[7, 30, 90].map((days) => (
              <button
                key={days}
                onClick={() => handlePeriodChange(days)}
                className={`px-3 py-1 rounded-lg transition-all cursor-pointer ${
                  historyDays === days
                    ? 'bg-white text-slate-900 shadow-2xs font-bold'
                    : 'text-slate-600 hover:text-slate-900'
                }`}
              >
                {days} Days
              </button>
            ))}
          </div>
        </div>

        {/* History Summary Stats */}
        {historyData && (
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 bg-slate-50 p-3.5 rounded-xl border border-slate-100 text-xs">
            <div>
              <span className="text-slate-500 block text-[11px]">Period Adherence</span>
              <span
                className={`text-lg font-bold ${
                  historyData.overall_adherence_rate !== null &&
                  historyData.overall_adherence_rate >= 80
                    ? 'text-emerald-700'
                    : historyData.overall_adherence_rate !== null &&
                      historyData.overall_adherence_rate >= 50
                    ? 'text-amber-700'
                    : historyData.overall_adherence_rate !== null
                    ? 'text-rose-700'
                    : 'text-slate-800'
                }`}
              >
                {historyData.overall_adherence_rate !== null &&
                historyData.overall_adherence_rate !== undefined
                  ? `${historyData.overall_adherence_rate}%`
                  : 'N/A'}
              </span>
            </div>
            <div>
              <span className="text-slate-500 block text-[11px]">Total Doses</span>
              <span className="text-lg font-bold text-slate-900">
                {historyData.total_doses_in_period ?? 0}
              </span>
            </div>
            <div>
              <span className="text-slate-500 block text-[11px]">Doses Taken</span>
              <span className="text-lg font-bold text-emerald-700">
                {historyData.total_taken ?? 0}
              </span>
            </div>
            <div>
              <span className="text-slate-500 block text-[11px]">Doses Skipped</span>
              <span className="text-lg font-bold text-rose-700">
                {historyData.total_skipped ?? 0}
              </span>
            </div>
          </div>
        )}

        {/* History Timeline Daily Breakdown */}
        {historyData?.daily_history && historyData.daily_history.length > 0 ? (
          <div className="space-y-2 max-h-72 overflow-y-auto pr-1">
            {historyData.daily_history.slice().reverse().map((day, idx) => {
              const hasDoses = day.total_doses > 0
              const rate = day.adherence_rate
              return (
                <div
                  key={idx}
                  className="flex items-center justify-between p-2.5 rounded-xl border border-slate-100 hover:bg-slate-50/80 transition-colors text-xs"
                >
                  <div className="flex items-center space-x-3">
                    <span className="font-semibold text-slate-800 w-24">{day.date}</span>
                    <span className="text-slate-500">
                      {hasDoses ? (
                        <>
                          <strong className="text-emerald-700">{day.taken_count}</strong> taken /{' '}
                          <strong className="text-rose-700">{day.skipped_count}</strong> skipped
                        </>
                      ) : (
                        <span className="text-slate-400 italic">No scheduled doses</span>
                      )}
                    </span>
                  </div>

                  <div>
                    {hasDoses ? (
                      <span
                        className={`font-bold px-2.5 py-0.5 rounded-full text-[11px] ${
                          rate >= 80
                            ? 'bg-emerald-50 text-emerald-700 border border-emerald-200'
                            : rate >= 50
                            ? 'bg-amber-50 text-amber-700 border border-amber-200'
                            : 'bg-rose-50 text-rose-700 border border-rose-200'
                        }`}
                      >
                        {rate}%
                      </span>
                    ) : (
                      <span className="text-slate-400 text-[11px] font-medium">N/A</span>
                    )}
                  </div>
                </div>
              )
            })}
          </div>
        ) : (
          <div className="py-8 text-center text-slate-400 text-xs">
            No historical dose records found for this period.
          </div>
        )}
      </div>

      {/* Medication-Level Performance Table */}
      <div className="bg-white rounded-2xl border border-slate-200/80 p-5 shadow-xs space-y-3.5">
        <div className="flex items-center space-x-2">
          <Pill className="w-4 h-4 text-sky-600" />
          <h3 className="text-sm sm:text-base font-bold text-slate-900">
            Medication-Level Adherence Breakdown
          </h3>
        </div>

        {medPerformance.length > 0 ? (
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs border-collapse">
              <thead>
                <tr className="border-b border-slate-100 text-slate-400 font-semibold">
                  <th className="pb-2.5">Medication</th>
                  <th className="pb-2.5">Taken</th>
                  <th className="pb-2.5">Skipped</th>
                  <th className="pb-2.5">Total Doses</th>
                  <th className="pb-2.5 text-right">Adherence Rate</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {medPerformance.map((med, idx) => {
                  const rate = med.adherence_rate
                  return (
                    <tr key={idx} className="hover:bg-slate-50/60">
                      <td className="py-3 font-bold text-slate-900">
                        {med.medicine_name || 'Medication'}
                      </td>
                      <td className="py-3 font-semibold text-emerald-700">{med.taken_count}</td>
                      <td className="py-3 font-semibold text-rose-700">{med.skipped_count}</td>
                      <td className="py-3 text-slate-600">{med.total_doses}</td>
                      <td className="py-3 text-right">
                        <span
                          className={`inline-block font-bold px-2.5 py-0.5 rounded-full text-[11px] ${
                            rate !== null && rate >= 80
                              ? 'bg-emerald-50 text-emerald-700 border border-emerald-200'
                              : rate !== null && rate >= 50
                              ? 'bg-amber-50 text-amber-700 border border-amber-200'
                              : rate !== null
                              ? 'bg-rose-50 text-rose-700 border border-rose-200'
                              : 'bg-slate-100 text-slate-600'
                          }`}
                        >
                          {rate !== null && rate !== undefined ? `${rate}%` : 'N/A'}
                        </span>
                      </td>
                    </tr>
                  )
                })}
              </tbody>
            </table>
          </div>
        ) : (
          <p className="text-xs text-slate-400 py-4 text-center">
            No medication-level performance data available yet.
          </p>
        )}
      </div>
    </div>
  )
}

export default CaregiverIntelligence
