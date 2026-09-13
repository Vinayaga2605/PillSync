import React, { useState, useEffect, useCallback } from 'react'
import { Link } from 'react-router-dom'
import { intelligenceService } from '../../services/intelligenceService'
import {
  Sparkles,
  TrendingUp,
  TrendingDown,
  Minus,
  RefreshCw,
  AlertCircle,
  CheckCircle2,
  AlertTriangle,
  History,
  Activity,
  Layers,
  HelpCircle,
  ChevronDown,
  ChevronUp,
  Pill,
} from 'lucide-react'
import { AttentionScoreGauge } from '../../components/insights/AttentionScoreGauge'
import { AdherenceVelocityCard } from '../../components/insights/AdherenceVelocityCard'
import { SmartSuggestionsList } from '../../components/insights/SmartSuggestionsList'
import { PatternObservationsFeed } from '../../components/insights/PatternObservationsFeed'
import { MedicationConsistencyTable } from '../../components/insights/MedicationConsistencyTable'

export const PatientInsightsPage = () => {
  const [data, setData] = useState(null)
  const [isLoading, setIsLoading] = useState(true)
  const [isRefreshing, setIsRefreshing] = useState(false)
  const [error, setError] = useState(null)

  // Smart Suggestions State
  const [suggestionsData, setSuggestionsData] = useState(null)
  const [suggestionsError, setSuggestionsError] = useState(null)

  // Toggle for Page Purpose Explainer
  const [showPurposeGuide, setShowPurposeGuide] = useState(false)

  const fetchIntelligence = useCallback(async (isSilent = false) => {
    if (isSilent) {
      setIsRefreshing(true)
    } else {
      setIsLoading(true)
    }
    setError(null)
    setSuggestionsError(null)

    try {
      const [intelRes, sugRes] = await Promise.allSettled([
        intelligenceService.getPatientIntelligenceSummary(),
        intelligenceService.getPatientMedicationSuggestions(),
      ])

      if (intelRes.status === 'fulfilled') {
        setData(intelRes.value)
      } else {
        const detail = intelRes.reason?.response?.data?.detail
        setError(
          typeof detail === 'string'
            ? detail
            : 'Unable to load smart insights at this time. Please try again later.'
        )
      }

      if (sugRes.status === 'fulfilled') {
        setSuggestionsData(sugRes.value)
      } else {
        setSuggestionsError('Unable to load medication suggestions right now.')
      }
    } catch {
      setError('An unexpected error occurred while loading insights.')
    } finally {
      setIsLoading(false)
      setIsRefreshing(false)
    }
  }, [])

  useEffect(() => {
    fetchIntelligence()
  }, [fetchIntelligence])

  return (
    <div className="space-y-6 max-w-7xl mx-auto pb-12">
      {/* 1. Page Header */}
      <div className="bg-white p-6 rounded-2xl border border-slate-200/80 shadow-xs">
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
          <div className="flex items-center gap-3.5">
            <div className="p-3 rounded-2xl bg-teal-50 text-teal-600 border border-teal-200/80 shadow-2xs">
              <Sparkles className="w-6 h-6" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h1 className="text-2xl font-bold text-slate-900 tracking-tight">
                  Smart Insights & Patterns
                </h1>
                <button
                  onClick={() => setShowPurposeGuide(!showPurposeGuide)}
                  className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-[11px] font-bold bg-teal-50 text-teal-700 hover:bg-teal-100 transition-colors cursor-pointer border border-teal-200/60"
                  title="Learn how this page works"
                >
                  <HelpCircle className="w-3.5 h-3.5" />
                  <span>Purpose & Guide</span>
                  {showPurposeGuide ? (
                    <ChevronUp className="w-3 h-3" />
                  ) : (
                    <ChevronDown className="w-3 h-3" />
                  )}
                </button>
              </div>
              <p className="text-xs sm:text-sm text-slate-500 mt-1">
                AI-driven analysis of your medication routine, velocity trends, and habit consistency.
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2.5 self-end sm:self-auto flex-wrap">
            <Link
              to="/app/insights/history"
              className="inline-flex items-center gap-2 px-3.5 py-2 text-xs font-semibold rounded-xl bg-teal-600 hover:bg-teal-700 text-white transition-colors cursor-pointer shadow-xs"
            >
              <History className="w-3.5 h-3.5" />
              <span>Medication History</span>
            </Link>
            <button
              onClick={() => fetchIntelligence(true)}
              disabled={isLoading || isRefreshing}
              className="inline-flex items-center gap-2 px-3.5 py-2 text-xs font-semibold rounded-xl bg-slate-100 hover:bg-slate-200/80 text-slate-700 transition-colors cursor-pointer disabled:opacity-50"
              title="Refresh insights"
            >
              <RefreshCw className={`w-3.5 h-3.5 ${isRefreshing ? 'animate-spin' : ''}`} />
              <span>{isRefreshing ? 'Refreshing...' : 'Refresh'}</span>
            </button>
          </div>
        </div>

        {/* Expandable Purpose Explainer Banner */}
        {showPurposeGuide && (
          <div className="mt-5 p-4 rounded-xl bg-teal-50/70 border border-teal-200/80 text-xs text-teal-950 space-y-2 animate-in fade-in duration-200">
            <h4 className="font-bold text-teal-900 flex items-center gap-1.5 text-sm">
              <Sparkles className="w-4 h-4 text-teal-600" />
              <span>What is the Main Purpose of Smart Insights?</span>
            </h4>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-3 pt-1">
              <div className="p-3 bg-white/90 rounded-xl border border-teal-100">
                <strong className="text-slate-900 block mb-1">1. Detect Behavioral Drift</strong>
                <p className="text-slate-600 leading-relaxed text-[11px]">
                  While the <em>Adherence Page</em> records your daily checklist, Smart Insights spots trends before they become clinical issues (e.g. dropping from 100% to 92%).
                </p>
              </div>
              <div className="p-3 bg-white/90 rounded-xl border border-teal-100">
                <strong className="text-slate-900 block mb-1">2. Attention Index (0–100)</strong>
                <p className="text-slate-600 leading-relaxed text-[11px]">
                  A non-clinical score where lower is optimal. Scores above 50 flag that several recent doses were missed or your weekly velocity is declining.
                </p>
              </div>
              <div className="p-3 bg-white/90 rounded-xl border border-teal-100">
                <strong className="text-slate-900 block mb-1">3. Actionable Suggestions</strong>
                <p className="text-slate-600 leading-relaxed text-[11px]">
                  Generates practical tips (adjusting alarm times, reviewing evening doses, planning refills) rather than plain static logs.
                </p>
              </div>
            </div>
          </div>
        )}
      </div>

      {/* Loading State */}
      {isLoading && (
        <div className="bg-white rounded-2xl border border-slate-200/80 p-12 text-center shadow-xs">
          <div className="w-10 h-10 border-3 border-teal-600 border-t-transparent rounded-full animate-spin mx-auto mb-4" />
          <h3 className="text-sm font-semibold text-slate-800">Analyzing medication patterns...</h3>
          <p className="text-xs text-slate-400 mt-1 max-w-sm mx-auto">
            Computing adherence velocity, scheduled dose history, and time-of-day trends.
          </p>
        </div>
      )}

      {/* Error State */}
      {!isLoading && error && (
        <div className="bg-rose-50 border border-rose-200 rounded-2xl p-6 text-rose-800 shadow-xs flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
          <div className="flex items-start gap-3">
            <AlertCircle className="w-5 h-5 text-rose-600 shrink-0 mt-0.5" />
            <div>
              <h3 className="text-sm font-bold">Unable to load insights</h3>
              <p className="text-xs text-rose-700 mt-0.5">{error}</p>
            </div>
          </div>
          <button
            onClick={() => fetchIntelligence(false)}
            className="px-4 py-2 bg-rose-600 hover:bg-rose-700 text-white text-xs font-semibold rounded-xl transition-colors shrink-0 cursor-pointer"
          >
            Retry
          </button>
        </div>
      )}

      {/* Main Content */}
      {!isLoading && !error && data && (
        <>
          {/* 2. Executive KPI Summary Cards */}
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
            {/* KPI 1: Adherence Trend */}
            <div className="bg-white p-4 rounded-2xl border border-slate-200/80 shadow-xs">
              <div className="flex items-center justify-between text-slate-400">
                <span className="text-[11px] font-bold uppercase tracking-wider text-slate-500">
                  Adherence Trajectory
                </span>
                <Activity className="w-4 h-4 text-teal-600" />
              </div>
              <div className="mt-2 flex items-baseline gap-1.5">
                {data.trend?.trend_direction === 'IMPROVING' ? (
                  <>
                    <TrendingUp className="w-4 h-4 text-emerald-600 shrink-0" />
                    <span className="text-base font-extrabold text-emerald-700">
                      Trending Up (+{Math.abs(data.trend?.change_percentage ?? 0)}%)
                    </span>
                  </>
                ) : data.trend?.trend_direction === 'DECLINING' ? (
                  <>
                    <TrendingDown className="w-4 h-4 text-rose-600 shrink-0" />
                    <span className="text-base font-extrabold text-rose-700">
                      Trending Down (-{Math.abs(data.trend?.change_percentage ?? 0)}%)
                    </span>
                  </>
                ) : (
                  <>
                    <Minus className="w-4 h-4 text-sky-600 shrink-0" />
                    <span className="text-base font-extrabold text-sky-700">
                      Stable Routine
                    </span>
                  </>
                )}
              </div>
              <p className="text-[11px] text-slate-400 mt-1 font-medium">
                Compared to prior 7-day period
              </p>
            </div>

            {/* KPI 2: Recent 7-Day Missed Doses */}
            <div className="bg-white p-4 rounded-2xl border border-slate-200/80 shadow-xs">
              <div className="flex items-center justify-between text-slate-400">
                <span className="text-[11px] font-bold uppercase tracking-wider text-slate-500">
                  Recent 7-Day Skips
                </span>
                <AlertTriangle className="w-4 h-4 text-amber-500" />
              </div>
              <div className="mt-2">
                <span
                  className={`text-base font-extrabold ${
                    (data.trend?.current_7d_skipped ?? 0) === 0
                      ? 'text-emerald-700'
                      : 'text-rose-700'
                  }`}
                >
                  {data.trend?.current_7d_skipped ?? 0} Missed Dose{(data.trend?.current_7d_skipped ?? 0) !== 1 ? 's' : ''}
                </span>
              </div>
              <p className="text-[11px] text-slate-400 mt-1 font-medium">
                Out of {(data.trend?.current_7d_taken ?? 0) + (data.trend?.current_7d_skipped ?? 0)} completed doses
              </p>
            </div>

            {/* KPI 3: Regimen Status */}
            <div className="bg-white p-4 rounded-2xl border border-slate-200/80 shadow-xs">
              <div className="flex items-center justify-between text-slate-400">
                <span className="text-[11px] font-bold uppercase tracking-wider text-slate-500">
                  Medications in Regimen
                </span>
                <Pill className="w-4 h-4 text-teal-600" />
              </div>
              <div className="mt-2">
                {data.medications?.filter((m) => m.status === 'NEEDS_ATTENTION').length > 0 ? (
                  <span className="text-base font-extrabold text-amber-700">
                    {data.medications.filter((m) => m.status === 'NEEDS_ATTENTION').length} Needing Focus
                  </span>
                ) : (
                  <span className="text-base font-extrabold text-emerald-700">
                    All in Good Standing
                  </span>
                )}
              </div>
              <p className="text-[11px] text-slate-400 mt-1 font-medium">
                Across {data.medications?.length ?? 0} active prescriptions
              </p>
            </div>

            {/* KPI 4: Active Observations */}
            <div className="bg-white p-4 rounded-2xl border border-slate-200/80 shadow-xs">
              <div className="flex items-center justify-between text-slate-400">
                <span className="text-[11px] font-bold uppercase tracking-wider text-slate-500">
                  Detected Observations
                </span>
                <Sparkles className="w-4 h-4 text-teal-600" />
              </div>
              <div className="mt-2">
                <span className="text-base font-extrabold text-teal-700">
                  {data.insights?.length ?? 0} Pattern{(data.insights?.length ?? 0) !== 1 ? 's' : ''} Logged
                </span>
              </div>
              <p className="text-[11px] text-slate-400 mt-1 font-medium">
                Prioritized by statistical impact
              </p>
            </div>
          </div>

          {/* 3. Attention Score Gauge (Left) & Adherence Velocity Card (Right) */}
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
            <div className="lg:col-span-1">
              <AttentionScoreGauge attentionScore={data.attention_score} />
            </div>
            <div className="lg:col-span-2">
              <AdherenceVelocityCard trend={data.trend} />
            </div>
          </div>

          {/* 4. Smart Suggestions */}
          <SmartSuggestionsList
            suggestionsData={suggestionsData}
            suggestionsError={suggestionsError}
            onRefresh={() => fetchIntelligence(true)}
          />

          {/* 5. Pattern Observations Feed */}
          <PatternObservationsFeed insights={data.insights || []} />

          {/* 6. Medication Consistency Breakdown */}
          <MedicationConsistencyTable medications={data.medications || []} />
        </>
      )}
    </div>
  )
}

export default PatientInsightsPage
