import React from 'react'
import { Sparkles, Calendar, RefreshCw } from 'lucide-react'

export const DashboardHeader = ({ user, onRefresh, isRefreshing }) => {
  const todayFormatted = new Intl.DateTimeFormat('en-US', {
    weekday: 'long',
    month: 'short',
    day: 'numeric',
    year: 'numeric',
  }).format(new Date())

  return (
    <div className="relative overflow-hidden rounded-2xl bg-gradient-to-r from-white via-teal-50/20 to-emerald-50/20 border border-slate-200/80 p-6 sm:p-7 shadow-xs">
      <div className="relative z-10 flex flex-col md:flex-row md:items-center md:justify-between gap-4">
        <div>
          <div className="inline-flex items-center space-x-2 px-3 py-1 rounded-full bg-teal-50 border border-teal-200/80 text-teal-700 text-xs font-semibold mb-2.5">
            <Sparkles className="w-3.5 h-3.5 text-teal-600" />
            <span>Medication Care Dashboard</span>
          </div>

          <h1 className="text-2xl sm:text-3xl font-bold text-slate-900 tracking-tight">
            Welcome back, {user?.first_name || 'Patient'}!
          </h1>

          <p className="text-sm text-slate-500 mt-1 flex items-center gap-2 font-medium">
            <Calendar className="w-4 h-4 text-teal-600 shrink-0" />
            <span>{todayFormatted}</span>
          </p>
        </div>

        <div className="flex items-center gap-3">
          <button
            onClick={onRefresh}
            disabled={isRefreshing}
            className="inline-flex items-center gap-2 px-4 py-2 text-sm font-medium text-slate-700 bg-white hover:bg-slate-50 border border-slate-200 hover:border-slate-300 rounded-xl shadow-xs transition-all cursor-pointer disabled:opacity-50"
            title="Refresh dashboard data"
          >
            <RefreshCw className={`w-4 h-4 text-teal-600 ${isRefreshing ? 'animate-spin' : ''}`} />
            <span>{isRefreshing ? 'Refreshing...' : 'Refresh Data'}</span>
          </button>
        </div>
      </div>
    </div>
  )
}
