import React from 'react'
import { AlertCircle, Clock, CheckCircle2, TrendingUp } from 'lucide-react'

export const DashboardSummary = ({ summary, adherence, isLoading }) => {
  if (isLoading) {
    return (
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        {[1, 2, 3, 4].map((i) => (
          <div
            key={i}
            className="bg-white border border-slate-200/80 rounded-2xl p-5 shadow-xs animate-pulse"
          >
            <div className="flex items-center justify-between mb-3">
              <div className="w-10 h-10 rounded-xl bg-slate-100" />
              <div className="w-12 h-4 rounded bg-slate-100" />
            </div>
            <div className="w-16 h-7 rounded bg-slate-100 mb-2" />
            <div className="w-24 h-3.5 rounded bg-slate-100" />
          </div>
        ))}
      </div>
    )
  }

  const dueCount = summary?.due_count ?? summary?.due_now_count ?? 0
  const upcomingCount = summary?.upcoming_count ?? summary?.upcoming_today_count ?? 0
  const completedCount = summary?.completed_or_logged_count ?? (adherence ? adherence.taken_doses + adherence.skipped_doses : 0)
  const adherencePct = adherence?.adherence_percentage ?? 0

  const metrics = [
    {
      title: 'Due Right Now',
      value: dueCount,
      subtitle: dueCount === 1 ? '1 dose pending' : `${dueCount} doses pending`,
      icon: AlertCircle,
      iconBg: 'bg-rose-50 text-rose-600 border border-rose-200/80',
      valueColor: dueCount > 0 ? 'text-rose-600' : 'text-slate-900',
      badge: dueCount > 0 ? 'Action Needed' : 'All Clear',
      badgeColor: dueCount > 0 ? 'bg-rose-50 text-rose-700 border-rose-200/80' : 'bg-slate-100 text-slate-600 border-slate-200',
    },
    {
      title: 'Upcoming Today',
      value: upcomingCount,
      subtitle: upcomingCount === 1 ? '1 scheduled dose' : `${upcomingCount} scheduled doses`,
      icon: Clock,
      iconBg: 'bg-amber-50 text-amber-600 border border-amber-200/80',
      valueColor: 'text-slate-900',
      badge: 'Scheduled',
      badgeColor: 'bg-amber-50 text-amber-800 border-amber-200/80',
    },
    {
      title: 'Completed / Logged',
      value: completedCount,
      subtitle: `${adherence?.taken_doses ?? 0} taken, ${adherence?.skipped_doses ?? 0} skipped`,
      icon: CheckCircle2,
      iconBg: 'bg-teal-50 text-teal-600 border border-teal-200/80',
      valueColor: 'text-slate-900',
      badge: 'Today',
      badgeColor: 'bg-teal-50 text-teal-700 border-teal-200/80',
    },
    {
      title: "Today's Adherence",
      value: `${adherencePct}%`,
      subtitle: adherence?.total_doses ? `${adherence.taken_doses}/${adherence.taken_doses + adherence.skipped_doses} completed taken` : 'No doses logged yet',
      icon: TrendingUp,
      iconBg: 'bg-emerald-50 text-emerald-600 border border-emerald-200/80',
      valueColor: adherencePct >= 80 ? 'text-emerald-600' : adherencePct > 0 ? 'text-amber-600' : 'text-slate-700',
      badge: 'Score',
      badgeColor: 'bg-emerald-50 text-emerald-700 border-emerald-200/80',
    },
  ]

  return (
    <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
      {metrics.map((m, idx) => {
        const Icon = m.icon
        return (
          <div
            key={idx}
            className="bg-white border border-slate-200/80 rounded-2xl p-5 shadow-xs flex flex-col justify-between hover:shadow-sm hover:border-slate-300 transition-all"
          >
            <div className="flex items-center justify-between mb-3">
              <div className={`w-10 h-10 rounded-xl flex items-center justify-center ${m.iconBg}`}>
                <Icon className="w-5 h-5" />
              </div>
              <span className={`text-[11px] font-semibold px-2 py-0.5 rounded-full border ${m.badgeColor}`}>
                {m.badge}
              </span>
            </div>

            <div>
              <div className={`text-2xl font-bold tracking-tight ${m.valueColor}`}>
                {m.value}
              </div>
              <div className="text-xs font-semibold text-slate-800 mt-1">
                {m.title}
              </div>
              <div className="text-[11px] text-slate-500 mt-0.5 truncate">
                {m.subtitle}
              </div>
            </div>
          </div>
        )
      })}
    </div>
  )
}
