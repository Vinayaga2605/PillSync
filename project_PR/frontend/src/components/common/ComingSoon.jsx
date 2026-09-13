import React from 'react'
import { Sparkles, ArrowLeft } from 'lucide-react'
import { Link } from 'react-router-dom'

export const ComingSoon = ({ title, description, featureIcon: Icon }) => {
  return (
    <div className="flex flex-col items-center justify-center min-h-[60vh] text-center p-6">
      <div className="w-16 h-16 rounded-2xl bg-teal-50 border border-teal-200 flex items-center justify-center mb-5 text-teal-600 shadow-xs">
        {Icon ? <Icon className="w-8 h-8 stroke-[1.8]" /> : <Sparkles className="w-8 h-8 stroke-[1.8]" />}
      </div>
      <h2 className="text-2xl font-bold text-slate-900 mb-2">{title}</h2>
      <p className="text-sm text-slate-500 max-w-md mb-6 font-medium">
        {description || 'This feature is currently under active development as part of the PillSync roadmap.'}
      </p>
      <div className="inline-flex items-center px-3.5 py-1 rounded-full bg-teal-50 border border-teal-200 text-teal-700 text-xs font-bold shadow-xs">
        Coming Soon
      </div>
      <div className="mt-8">
        <Link
          to="/app/dashboard"
          className="inline-flex items-center space-x-2 text-xs font-semibold text-slate-500 hover:text-teal-700 transition-colors"
        >
          <ArrowLeft className="w-4 h-4" />
          <span>Back to Dashboard</span>
        </Link>
      </div>
    </div>
  )
}
