import React from 'react'
import { AlertCircle, RefreshCw, CheckCircle2 } from 'lucide-react'

export const DashboardSection = ({
  title,
  subtitle,
  icon: Icon,
  iconBg = 'bg-teal-50 text-teal-700 border border-teal-200/80',
  badge,
  badgeColor = 'bg-slate-100 text-slate-600 border-slate-200',
  isLoading = false,
  error = null,
  onRetry = null,
  empty = false,
  emptyTitle = 'No data available',
  emptyMessage = 'There are no records to display at this time.',
  emptyIcon: EmptyIcon = CheckCircle2,
  headerAction = null,
  children,
}) => {
  return (
    <div className="bg-white border border-slate-200/80 rounded-2xl p-5 sm:p-6 shadow-xs flex flex-col">
      {/* Header */}
      <div className="flex items-center justify-between pb-4 border-b border-slate-100 mb-5">
        <div className="flex items-center space-x-3">
          {Icon && (
            <div className={`w-9 h-9 rounded-xl flex items-center justify-center ${iconBg}`}>
              <Icon className="w-5 h-5" />
            </div>
          )}
          <div>
            <h2 className="text-base font-bold text-slate-900 tracking-tight">{title}</h2>
            {subtitle && <p className="text-xs text-slate-500 mt-0.5">{subtitle}</p>}
          </div>
        </div>

        <div className="flex items-center space-x-2">
          {badge && (
            <span className={`text-xs font-semibold px-2.5 py-1 rounded-full border ${badgeColor}`}>
              {badge}
            </span>
          )}
          {headerAction}
        </div>
      </div>

      {/* Body */}
      <div className="flex-1 flex flex-col">
        {isLoading ? (
          <div className="space-y-3 py-2 animate-pulse">
            {[1, 2].map((i) => (
              <div
                key={i}
                className="bg-slate-50 border border-slate-200/60 rounded-xl p-4 flex items-center justify-between"
              >
                <div className="space-y-2 flex-1">
                  <div className="w-32 h-4 rounded bg-slate-200" />
                  <div className="w-48 h-3 rounded bg-slate-200" />
                </div>
                <div className="w-20 h-8 rounded-lg bg-slate-200" />
              </div>
            ))}
          </div>
        ) : error ? (
          <div className="flex-1 flex flex-col items-center justify-center py-8 text-center">
            <div className="w-12 h-12 rounded-full bg-rose-50 border border-rose-200 flex items-center justify-center mb-3 text-rose-600">
              <AlertCircle className="w-6 h-6" />
            </div>
            <p className="text-sm font-semibold text-slate-800">Unable to load data</p>
            <p className="text-xs text-slate-500 max-w-sm mt-1">{error}</p>
            {onRetry && (
              <button
                onClick={onRetry}
                className="mt-4 inline-flex items-center gap-1.5 px-3.5 py-1.5 text-xs font-semibold text-teal-700 bg-teal-50 hover:bg-teal-100 border border-teal-200 rounded-lg shadow-xs transition-colors cursor-pointer"
              >
                <RefreshCw className="w-3.5 h-3.5" />
                <span>Try Again</span>
              </button>
            )}
          </div>
        ) : empty ? (
          <div className="flex-1 flex flex-col items-center justify-center py-8 text-center">
            <div className="w-12 h-12 rounded-full bg-slate-50 border border-slate-200 flex items-center justify-center mb-3 text-slate-400">
              <EmptyIcon className="w-6 h-6" />
            </div>
            <p className="text-sm font-semibold text-slate-700">{emptyTitle}</p>
            <p className="text-xs text-slate-400 max-w-xs mt-1">{emptyMessage}</p>
          </div>
        ) : (
          children
        )}
      </div>
    </div>
  )
}
