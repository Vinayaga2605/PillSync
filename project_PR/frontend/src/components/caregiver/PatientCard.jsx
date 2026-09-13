import React from 'react'
import { Link } from 'react-router-dom'
import {
  User,
  Mail,
  Phone,
  ArrowRight,
  ShieldCheck,
  HeartHandshake,
  Activity,
  AlertTriangle,
  XCircle,
  CheckCircle2,
} from 'lucide-react'

export const PatientCard = ({
  patient,
  dueCount = 0,
  skippedCount = 0,
  adherenceRate = null,
}) => {
  const hasDueDoses = dueCount > 0
  const hasSkippedDoses = skippedCount > 0
  const isLowAdherence = adherenceRate !== null && adherenceRate < 70
  const needsAttention = hasDueDoses || hasSkippedDoses || isLowAdherence

  return (
    <div className="bg-white rounded-2xl border border-slate-200/80 p-5 shadow-xs hover:shadow-md hover:border-slate-300 transition-all flex flex-col justify-between group">
      <div>
        {/* Header: Avatar, Name, Relationship */}
        <div className="flex items-start justify-between gap-3 mb-3.5">
          <div className="flex items-center space-x-3.5 min-w-0">
            <div className="w-11 h-11 rounded-2xl bg-gradient-to-tr from-sky-500 to-teal-500 flex items-center justify-center text-white font-bold text-base shadow-xs shrink-0">
              {patient.first_name ? patient.first_name[0].toUpperCase() : 'P'}
            </div>
            <div className="min-w-0">
              <h3 className="text-base font-bold text-slate-900 group-hover:text-sky-600 transition-colors truncate">
                {patient.first_name} {patient.last_name}
              </h3>
              <div className="flex items-center space-x-1.5 mt-0.5">
                <span className="inline-flex items-center px-2 py-0.5 rounded-md text-[11px] font-semibold bg-sky-50 text-sky-700 border border-sky-200/70">
                  <HeartHandshake className="w-3 h-3 mr-1" />
                  {patient.relationship_type || 'Patient'}
                </span>
                {patient.permission_level && (
                  <span className="inline-flex items-center px-2 py-0.5 rounded-md text-[10px] font-medium bg-slate-100 text-slate-600 border border-slate-200">
                    <ShieldCheck className="w-3 h-3 mr-1 text-slate-500" />
                    {patient.permission_level.replace('_', ' ')}
                  </span>
                )}
              </div>
            </div>
          </div>

          {/* Attention / Status badge */}
          {needsAttention ? (
            <span className="inline-flex items-center px-2.5 py-1 rounded-full text-xs font-bold bg-amber-50 text-amber-700 border border-amber-200 shrink-0">
              <AlertTriangle className="w-3.5 h-3.5 mr-1 text-amber-600" />
              Needs Attention
            </span>
          ) : (
            <span className="inline-flex items-center px-2.5 py-1 rounded-full text-xs font-medium bg-emerald-50 text-emerald-700 border border-emerald-200 shrink-0">
              <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 mr-1.5"></span>
              On Track
            </span>
          )}
        </div>

        {/* Status Indicators Pill Row */}
        <div className="flex items-center space-x-1.5 flex-wrap gap-y-1 mb-3">
          {hasDueDoses && (
            <span className="inline-flex items-center px-2 py-0.5 rounded-md text-[10px] font-bold bg-amber-100 text-amber-800 border border-amber-200">
              <AlertTriangle className="w-3 h-3 mr-1 text-amber-600" />
              {dueCount} Due Now
            </span>
          )}
          {hasSkippedDoses && (
            <span className="inline-flex items-center px-2 py-0.5 rounded-md text-[10px] font-bold bg-rose-100 text-rose-800 border border-rose-200">
              <XCircle className="w-3 h-3 mr-1 text-rose-600" />
              {skippedCount} Skipped Today
            </span>
          )}
          {!hasDueDoses && !hasSkippedDoses && (
            <span className="inline-flex items-center px-2 py-0.5 rounded-md text-[10px] font-medium bg-slate-50 text-slate-600 border border-slate-200/80">
              <CheckCircle2 className="w-3 h-3 mr-1 text-emerald-500" />
              Doses Up to Date
            </span>
          )}
        </div>

        {/* Contact info */}
        <div className="space-y-1.5 py-2.5 border-y border-slate-100 text-xs text-slate-600">
          <div className="flex items-center space-x-2 truncate">
            <Mail className="w-3.5 h-3.5 text-slate-400 shrink-0" />
            <span className="truncate">{patient.email}</span>
          </div>
          {patient.phone_number && (
            <div className="flex items-center space-x-2 truncate">
              <Phone className="w-3.5 h-3.5 text-slate-400 shrink-0" />
              <span className="truncate">{patient.phone_number}</span>
            </div>
          )}
        </div>

        {/* Adherence / Quick Stats */}
        {adherenceRate !== null && (
          <div className="mt-3 pt-1">
            <div className="flex items-center justify-between text-xs mb-1.5">
              <span className="font-medium text-slate-500 flex items-center">
                <Activity className="w-3.5 h-3.5 mr-1 text-teal-600" />
                Today's Adherence
              </span>
              <span
                className={`font-bold ${
                  adherenceRate >= 80
                    ? 'text-emerald-700'
                    : adherenceRate >= 50
                    ? 'text-amber-700'
                    : 'text-rose-700'
                }`}
              >
                {adherenceRate}%
              </span>
            </div>
            <div className="w-full bg-slate-100 h-2 rounded-full overflow-hidden">
              <div
                className={`h-full rounded-full transition-all duration-500 ${
                  adherenceRate >= 80
                    ? 'bg-emerald-500'
                    : adherenceRate >= 50
                    ? 'bg-amber-500'
                    : 'bg-rose-500'
                }`}
                style={{ width: `${Math.min(100, Math.max(0, adherenceRate))}%` }}
              />
            </div>
          </div>
        )}
      </div>

      {/* Footer: View Details Action */}
      <div className="mt-4 pt-2">
        <Link
          to={`/app/caregiver/patients/${patient.id}`}
          className="w-full inline-flex items-center justify-center space-x-2 px-4 py-2.5 rounded-xl bg-slate-50 hover:bg-sky-50 text-slate-700 hover:text-sky-700 border border-slate-200/90 hover:border-sky-200 font-semibold text-xs shadow-2xs transition-all group-hover:bg-sky-600 group-hover:text-white group-hover:border-transparent cursor-pointer"
        >
          <span>View Patient Monitoring</span>
          <ArrowRight className="w-3.5 h-3.5 group-hover:translate-x-0.5 transition-transform" />
        </Link>
      </div>
    </div>
  )
}

export default PatientCard
