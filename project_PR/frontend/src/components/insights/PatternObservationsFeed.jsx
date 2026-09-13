import React, { useState, useMemo } from 'react'
import {
  AlertCircle,
  AlertTriangle,
  Info,
  ChevronDown,
  ChevronUp,
  HelpCircle,
  Sparkles,
  TrendingDown,
  Clock,
  Calendar,
} from 'lucide-react'

export const PatternObservationsFeed = ({ insights = [] }) => {
  const [activeFilter, setActiveFilter] = useState('ALL')
  const [expandedWhy, setExpandedWhy] = useState({})

  const toggleWhy = (idx) => {
    setExpandedWhy((prev) => ({ ...prev, [idx]: !prev[idx] }))
  }

  // Filter counts
  const counts = useMemo(() => {
    return {
      ALL: insights.length,
      ADHERENCE: insights.filter((i) => i.category === 'ADHERENCE' || i.title?.toLowerCase().includes('adherence')).length,
      SKIPS: insights.filter((i) => i.category === 'SKIPS' || i.title?.toLowerCase().includes('missed') || i.title?.toLowerCase().includes('skip')).length,
      TIMING: insights.filter((i) => i.category === 'TIMING' || i.title?.toLowerCase().includes('time')).length,
    }
  }, [insights])

  // Filtered list
  const filtered = useMemo(() => {
    if (activeFilter === 'ALL') return insights
    if (activeFilter === 'ADHERENCE') {
      return insights.filter((i) => i.category === 'ADHERENCE' || i.title?.toLowerCase().includes('adherence'))
    }
    if (activeFilter === 'SKIPS') {
      return insights.filter((i) => i.category === 'SKIPS' || i.title?.toLowerCase().includes('missed') || i.title?.toLowerCase().includes('skip'))
    }
    if (activeFilter === 'TIMING') {
      return insights.filter((i) => i.category === 'TIMING' || i.title?.toLowerCase().includes('time'))
    }
    return insights
  }, [insights, activeFilter])

  const getSeverityStyle = (sev) => {
    switch (sev?.toUpperCase()) {
      case 'CRITICAL':
      case 'WARNING':
        return {
          card: 'bg-rose-50/50 border-rose-200/80 hover:border-rose-300',
          iconBg: 'bg-rose-100 text-rose-600',
          icon: AlertTriangle,
          badge: 'bg-rose-100/80 text-rose-800 border-rose-200',
        }
      case 'NOTICE':
      case 'INFO':
        return {
          card: 'bg-sky-50/50 border-sky-200/80 hover:border-sky-300',
          iconBg: 'bg-sky-100 text-sky-600',
          icon: Info,
          badge: 'bg-sky-100/80 text-sky-800 border-sky-200',
        }
      default:
        return {
          card: 'bg-slate-50/70 border-slate-200/80 hover:border-slate-300',
          iconBg: 'bg-slate-100 text-slate-600',
          icon: Sparkles,
          badge: 'bg-slate-100 text-slate-700 border-slate-200',
        }
    }
  }

  const formatMetricKey = (key) => {
    switch (key) {
      case 'current_7d_adherence':
        return 'Recent 7d'
      case 'previous_7d_adherence':
        return 'Prior Week'
      case 'change_percentage':
        return 'Change'
      default:
        return key.replace(/_/g, ' ')
    }
  }

  const formatMetricValue = (key, val) => {
    if (typeof val === 'number') {
      if (key.includes('adherence') || key.includes('percentage') || key.includes('Change')) {
        return `${val > 0 && key.includes('change') ? '+' : ''}${val}%`
      }
      return `${val}`
    }
    return String(val)
  }

  return (
    <div className="bg-white rounded-2xl border border-slate-200/80 p-6 shadow-xs space-y-5">
      {/* Header & Tabs */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h2 className="text-base font-bold text-slate-900">Pattern Observations</h2>
          <p className="text-xs text-slate-500 mt-0.5">
            Statistical behavioral shifts detected across your recent medication history.
          </p>
        </div>

        {/* Filter Pills */}
        <div className="flex items-center gap-1 bg-slate-100 p-1 rounded-xl overflow-x-auto">
          <button
            onClick={() => setActiveFilter('ALL')}
            className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-all cursor-pointer whitespace-nowrap ${
              activeFilter === 'ALL'
                ? 'bg-white text-slate-900 shadow-2xs'
                : 'text-slate-600 hover:text-slate-900'
            }`}
          >
            All ({counts.ALL})
          </button>
          <button
            onClick={() => setActiveFilter('ADHERENCE')}
            className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-all cursor-pointer whitespace-nowrap ${
              activeFilter === 'ADHERENCE'
                ? 'bg-white text-slate-900 shadow-2xs'
                : 'text-slate-600 hover:text-slate-900'
            }`}
          >
            Adherence ({counts.ADHERENCE})
          </button>
          <button
            onClick={() => setActiveFilter('SKIPS')}
            className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-all cursor-pointer whitespace-nowrap ${
              activeFilter === 'SKIPS'
                ? 'bg-white text-slate-900 shadow-2xs'
                : 'text-slate-600 hover:text-slate-900'
            }`}
          >
            Missed Doses ({counts.SKIPS})
          </button>
          <button
            onClick={() => setActiveFilter('TIMING')}
            className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-all cursor-pointer whitespace-nowrap ${
              activeFilter === 'TIMING'
                ? 'bg-white text-slate-900 shadow-2xs'
                : 'text-slate-600 hover:text-slate-900'
            }`}
          >
            Timing ({counts.TIMING})
          </button>
        </div>
      </div>

      {/* Observation Cards */}
      {filtered.length > 0 ? (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {filtered.map((insight, idx) => {
            const style = getSeverityStyle(insight.severity)
            const IconComp = style.icon
            const isWhyOpen = !!expandedWhy[idx]

            return (
              <div
                key={idx}
                className={`p-5 rounded-2xl border transition-all duration-200 flex flex-col justify-between ${style.card} shadow-2xs`}
              >
                <div>
                  <div className="flex items-start gap-3.5">
                    <div className={`p-2.5 rounded-xl shrink-0 ${style.iconBg}`}>
                      <IconComp className="w-5 h-5" />
                    </div>

                    <div className="space-y-1.5 flex-1 min-w-0">
                      <div className="flex items-center justify-between gap-2">
                        <h4 className="text-sm font-bold text-slate-900 truncate">
                          {insight.title}
                        </h4>
                        <span
                          className={`px-2 py-0.5 rounded-md text-[10px] font-bold tracking-wider uppercase border shrink-0 ${style.badge}`}
                        >
                          {insight.severity}
                        </span>
                      </div>

                      <p className="text-xs text-slate-600 leading-relaxed">
                        {insight.message}
                      </p>

                      {/* Supporting Metric Chips */}
                      {insight.metrics && Object.keys(insight.metrics).length > 0 && (
                        <div className="pt-2 flex flex-wrap gap-1.5">
                          {Object.entries(insight.metrics).map(([key, val]) => (
                            <div
                              key={key}
                              className="inline-flex items-center gap-1 px-2.5 py-1 rounded-lg bg-white/90 border border-slate-200/80 text-[11px]"
                            >
                              <span className="text-slate-500 font-medium">
                                {formatMetricKey(key)}:
                              </span>
                              <span className="font-bold text-slate-900">
                                {formatMetricValue(key, val)}
                              </span>
                            </div>
                          ))}
                        </div>
                      )}
                    </div>
                  </div>
                </div>

                {/* Explainable "Why am I seeing this?" Drawer */}
                <div className="mt-4 pt-3 border-t border-slate-200/60">
                  <button
                    onClick={() => toggleWhy(idx)}
                    className="w-full flex items-center justify-between text-xs font-semibold text-slate-600 hover:text-slate-900 transition-colors cursor-pointer"
                  >
                    <span className="inline-flex items-center gap-1.5">
                      <HelpCircle className="w-3.5 h-3.5 text-teal-600" />
                      <span>Calculation Basis & Evidence</span>
                    </span>
                    {isWhyOpen ? (
                      <ChevronUp className="w-4 h-4 text-slate-400" />
                    ) : (
                      <ChevronDown className="w-4 h-4 text-slate-400" />
                    )}
                  </button>

                  {isWhyOpen && (
                    <div className="mt-2.5 p-3.5 bg-white/95 rounded-xl border border-slate-200 text-xs text-slate-600 leading-relaxed space-y-1 animate-in fade-in duration-150">
                      <p className="font-medium text-slate-800">
                        {insight.reason ||
                          'This pattern was triggered because recorded doses during the observation window departed from your baseline by ≥5%.'}
                      </p>
                      <p className="text-[10px] text-slate-400 italic pt-1">
                        Derived deterministically from your recorded intake logs without clinical or diagnostic profiling.
                      </p>
                    </div>
                  )}
                </div>
              </div>
            )
          })}
        </div>
      ) : (
        <div className="p-8 text-center bg-slate-50 rounded-2xl border border-dashed border-slate-200">
          <Info className="w-8 h-8 text-slate-400 mx-auto mb-2" />
          <h4 className="text-sm font-semibold text-slate-800">No active observations</h4>
          <p className="text-xs text-slate-500 mt-1 max-w-sm mx-auto">
            {activeFilter === 'ALL'
              ? 'Your recent medication history is steady with no behavioral deviations detected.'
              : 'No pattern observations match the selected filter category.'}
          </p>
        </div>
      )}
    </div>
  )
}

export default PatternObservationsFeed
