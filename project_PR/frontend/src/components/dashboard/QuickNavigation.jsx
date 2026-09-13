import React from 'react'
import { Link } from 'react-router-dom'
import { Pill, Activity, History, User, ArrowRight } from 'lucide-react'

export const QuickNavigation = () => {
  const links = [
    {
      title: 'My Medications',
      description: 'View active prescriptions and dosage instructions',
      path: '/app/medicines',
      icon: Pill,
      iconBg: 'bg-teal-50 text-teal-700 border-teal-200/80',
    },
    {
      title: 'Adherence Analytics',
      description: 'Review compliance scores and medication breakdowns',
      path: '/app/adherence',
      icon: Activity,
      iconBg: 'bg-emerald-50 text-emerald-700 border-emerald-200/80',
    },
    {
      title: 'Dose History',
      description: 'Review chronological intake records and notes',
      path: '/app/history',
      icon: History,
      iconBg: 'bg-sky-50 text-sky-700 border-sky-200/80',
    },
    {
      title: 'Patient Profile',
      description: 'Manage personal health profile and caregiver links',
      path: '/app/profile',
      icon: User,
      iconBg: 'bg-indigo-50 text-indigo-700 border-indigo-200/80',
    },
  ]

  return (
    <div className="bg-white border border-slate-200/80 rounded-2xl p-5 sm:p-6 shadow-xs">
      <div className="flex items-center justify-between pb-4 border-b border-slate-100 mb-5">
        <div>
          <h2 className="text-base font-bold text-slate-900 tracking-tight">Quick Navigation</h2>
          <p className="text-xs text-slate-500 mt-0.5">Direct shortcuts to key medication management features</p>
        </div>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3.5">
        {links.map((item, idx) => {
          const Icon = item.icon
          return (
            <Link
              key={idx}
              to={item.path}
              className="group bg-slate-50/70 hover:bg-white border border-slate-200/80 hover:border-teal-300 hover:shadow-xs rounded-xl p-4 transition-all duration-200 flex flex-col justify-between cursor-pointer"
            >
              <div>
                <div className="flex items-center justify-between mb-3">
                  <div className={`w-9 h-9 rounded-xl flex items-center justify-center border ${item.iconBg}`}>
                    <Icon className="w-4.5 h-4.5" />
                  </div>
                  <ArrowRight className="w-4 h-4 text-slate-400 group-hover:text-teal-600 group-hover:translate-x-0.5 transition-all" />
                </div>
                <h3 className="text-sm font-bold text-slate-800 group-hover:text-slate-900 transition-colors">
                  {item.title}
                </h3>
                <p className="text-xs text-slate-500 mt-1 leading-relaxed line-clamp-2">
                  {item.description}
                </p>
              </div>
            </Link>
          )
        })}
      </div>
    </div>
  )
}
export default QuickNavigation
