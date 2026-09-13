import React from 'react'
import { Link } from 'react-router-dom'
import {
  Lightbulb,
  ShieldCheck,
  ArrowRight,
  Sparkles,
  Clock,
  RefreshCw,
  Info,
} from 'lucide-react'

export const SmartSuggestionsList = ({
  suggestionsData,
  suggestionsError,
  onRefresh,
}) => {
  const suggestions = suggestionsData?.suggestions ?? []

  const getPriorityBadge = (priority) => {
    switch (priority?.toUpperCase()) {
      case 'HIGH':
        return {
          label: 'High Priority',
          bg: 'bg-rose-50 text-rose-700 border-rose-200',
          dot: 'bg-rose-500',
          border: 'border-rose-200/80 hover:border-rose-300',
        }
      case 'MEDIUM':
        return {
          label: 'Medium Priority',
          bg: 'bg-amber-50 text-amber-800 border-amber-200',
          dot: 'bg-amber-500',
          border: 'border-amber-200/80 hover:border-amber-300',
        }
      default:
        return {
          label: 'Helpful Tip',
          bg: 'bg-sky-50 text-sky-700 border-sky-200',
          dot: 'bg-sky-500',
          border: 'border-sky-200/80 hover:border-sky-300',
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
        return 'Shift'
      case 'current_7d_taken':
        return 'Doses Taken'
      case 'current_7d_skipped':
        return 'Doses Missed'
      default:
        return key.replace(/_/g, ' ')
    }
  }

  const formatMetricValue = (key, val) => {
    if (typeof val === 'number') {
      if (key.includes('adherence') || key.includes('percentage') || key.includes('Shift')) {
        return `${val > 0 && key.includes('change') ? '+' : ''}${val}%`
      }
      return `${val}`
    }
    return String(val)
  }

  return (
    <div className="bg-white rounded-2xl border border-slate-200/80 p-6 shadow-xs">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 mb-5">
        <div className="flex items-center gap-3">
          <div className="p-2.5 rounded-xl bg-amber-50 text-amber-600 border border-amber-200/70">
            <Lightbulb className="w-5 h-5" />
          </div>
          <div>
            <h2 className="text-base font-bold text-slate-900">Actionable Suggestions</h2>
            <p className="text-xs text-slate-500 mt-0.5">
              Personalized routines and timing optimizations identified by AI.
            </p>
          </div>
        </div>

        <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-[11px] font-semibold bg-slate-100 text-slate-600 border border-slate-200/80 self-start sm:self-auto">
          <ShieldCheck className="w-3.5 h-3.5 text-teal-600" />
          <span>Non-clinical guidance</span>
        </span>
      </div>

      {/* Error state */}
      {suggestionsError && (
        <div className="p-4 rounded-xl bg-amber-50/70 border border-amber-200 text-xs text-amber-900 flex items-center justify-between">
          <span>{suggestionsError}</span>
          <button
            onClick={onRefresh}
            className="text-xs font-bold text-amber-950 underline hover:no-underline cursor-pointer"
          >
            Retry Loading Suggestions
          </button>
        </div>
      )}

      {/* Suggestion Cards */}
      {!suggestionsError && suggestions.length > 0 ? (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {suggestions.map((sug) => {
            const priorityBadge = getPriorityBadge(sug.priority)

            return (
              <div
                key={sug.id}
                className={`p-5 rounded-2xl border transition-all duration-200 flex flex-col justify-between bg-white shadow-2xs hover:shadow-xs ${priorityBadge.border}`}
              >
                <div className="space-y-3.5">
                  {/* Category & Priority Badge Row */}
                  <div className="flex items-center justify-between gap-2">
                    <span className="px-2.5 py-0.5 rounded-md text-[10px] font-bold uppercase tracking-wider bg-slate-100 text-slate-700 border border-slate-200/70">
                      {sug.category?.replace(/_/g, ' ') || 'ROUTINE REVIEW'}
                    </span>
                    <span
                      className={`inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-[11px] font-bold border ${priorityBadge.bg}`}
                    >
                      <span className={`w-1.5 h-1.5 rounded-full ${priorityBadge.dot}`} />
                      <span>{priorityBadge.label}</span>
                    </span>
                  </div>

                  {/* Title & Message */}
                  <div>
                    <h3 className="text-sm font-bold text-slate-900 leading-snug">
                      {sug.title}
                    </h3>
                    <p className="text-xs text-slate-600 mt-1.5 leading-relaxed">
                      {sug.message}
                    </p>
                  </div>

                  {/* Why You Are Seeing This - Clean Box */}
                  {sug.reason && (
                    <div className="p-3 rounded-xl bg-slate-50 border border-slate-200/60 text-xs text-slate-700">
                      <span className="font-bold text-slate-900 block mb-0.5">
                        Triggering Pattern:
                      </span>
                      <span className="leading-relaxed">{sug.reason}</span>
                    </div>
                  )}

                  {/* Supporting Metrics as Clean Chips */}
                  {sug.supporting_metrics && Object.keys(sug.supporting_metrics).length > 0 && (
                    <div className="flex flex-wrap gap-2 pt-0.5">
                      {Object.entries(sug.supporting_metrics).map(([mKey, mVal]) => (
                        <div
                          key={mKey}
                          className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg bg-slate-100/80 border border-slate-200/70 text-[11px]"
                        >
                          <span className="text-slate-500 font-medium">
                            {formatMetricKey(mKey)}:
                          </span>
                          <span className="font-bold text-slate-900">
                            {formatMetricValue(mKey, mVal)}
                          </span>
                        </div>
                      ))}
                    </div>
                  )}
                </div>

                {/* Safe Action Link */}
                {sug.action_url && sug.action_label && (
                  <div className="mt-5 pt-3.5 border-t border-slate-100 flex items-center justify-between">
                    <span className="text-[11px] text-slate-400 font-medium">
                      Suggested Action
                    </span>
                    <Link
                      to={sug.action_url}
                      className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-bold bg-slate-900 hover:bg-slate-800 text-white transition-colors cursor-pointer shadow-2xs"
                    >
                      <span>{sug.action_label}</span>
                      <ArrowRight className="w-3.5 h-3.5" />
                    </Link>
                  </div>
                )}
              </div>
            )
          })}
        </div>
      ) : !suggestionsError && (
        <div className="text-center py-8 px-4 bg-slate-50/70 rounded-2xl border border-dashed border-slate-200">
          <Sparkles className="w-6 h-6 text-teal-600 mx-auto mb-2" />
          <p className="text-xs font-bold text-slate-800">Your Routine Looks Consistent</p>
          <p className="text-[11px] text-slate-500 mt-0.5 max-w-sm mx-auto">
            No behavioral alerts or routine interventions are necessary at this time. Keep up the good work!
          </p>
        </div>
      )}

      {/* Safety Disclaimer */}
      <div className="mt-4 pt-3 border-t border-slate-100 flex items-center gap-2 text-[11px] text-slate-400">
        <Info className="w-3.5 h-3.5 text-slate-400 shrink-0" />
        <span>
          {suggestionsData?.disclaimer ||
            'These suggestions describe medication-taking patterns recorded in PillSync. They are not medical advice and do not replace guidance from a healthcare professional.'}
        </span>
      </div>
    </div>
  )
}

export default SmartSuggestionsList
