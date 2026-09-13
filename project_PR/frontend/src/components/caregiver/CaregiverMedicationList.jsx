import React from 'react'
import { Pill, Calendar, AlertCircle, FileText, CheckCircle2, Clock } from 'lucide-react'

export const CaregiverMedicationList = ({ medications = [], isLoading = false, error = null, onRetry }) => {
  if (isLoading) {
    return (
      <div className="space-y-3">
        {[1, 2, 3].map((i) => (
          <div key={i} className="bg-white p-4 rounded-2xl border border-slate-200/80 animate-pulse flex items-center justify-between">
            <div className="space-y-2 flex-1">
              <div className="h-4 bg-slate-200 rounded w-1/3"></div>
              <div className="h-3 bg-slate-100 rounded w-1/2"></div>
            </div>
            <div className="h-6 bg-slate-200 rounded-full w-16"></div>
          </div>
        ))}
      </div>
    )
  }

  if (error) {
    return (
      <div className="p-6 rounded-2xl bg-rose-50 border border-rose-200 text-center">
        <AlertCircle className="w-8 h-8 text-rose-500 mx-auto mb-2" />
        <p className="text-sm font-semibold text-rose-800 mb-1">Failed to load medications</p>
        <p className="text-xs text-rose-600 mb-3">{error}</p>
        {onRetry && (
          <button
            onClick={onRetry}
            className="px-3.5 py-1.5 bg-white text-rose-700 hover:bg-rose-100 border border-rose-200 rounded-xl text-xs font-semibold shadow-2xs transition-colors cursor-pointer"
          >
            Retry
          </button>
        )}
      </div>
    )
  }

  if (!medications || medications.length === 0) {
    return (
      <div className="p-8 rounded-2xl bg-slate-50 border border-slate-200/80 text-center">
        <Pill className="w-9 h-9 text-slate-400 mx-auto mb-2" />
        <p className="text-sm font-semibold text-slate-700 mb-1">No Medications Recorded</p>
        <p className="text-xs text-slate-500">This patient currently has no active or historical medications assigned.</p>
      </div>
    )
  }

  return (
    <div className="space-y-3">
      {medications.map((med) => {
        const medName = med.custom_medicine_name || med.name || 'Unnamed Medication'
        const isActive = med.is_active !== false

        return (
          <div
            key={med.id}
            className="bg-white rounded-2xl border border-slate-200/80 p-4 sm:p-5 shadow-xs hover:border-slate-300 transition-all flex flex-col sm:flex-row sm:items-center justify-between gap-4"
          >
            <div className="flex items-start space-x-3.5 min-w-0">
              <div className="w-10 h-10 rounded-xl bg-teal-50 border border-teal-100 flex items-center justify-center text-teal-600 shrink-0 mt-0.5">
                <Pill className="w-5 h-5" />
              </div>
              <div className="min-w-0">
                <div className="flex items-center space-x-2 flex-wrap gap-y-1">
                  <h4 className="text-sm sm:text-base font-bold text-slate-900 truncate">{medName}</h4>
                  <span
                    className={`inline-flex items-center px-2 py-0.5 rounded-full text-[10px] font-bold uppercase tracking-wider ${
                      isActive
                        ? 'bg-emerald-50 text-emerald-700 border border-emerald-200'
                        : 'bg-slate-100 text-slate-500 border border-slate-200'
                    }`}
                  >
                    {isActive ? 'Active' : 'Inactive'}
                  </span>
                </div>

                <div className="flex items-center space-x-4 mt-1.5 text-xs text-slate-600 flex-wrap gap-y-1">
                  {med.dosage_amount && (
                    <span className="font-medium text-slate-700">
                      Dosage: <span className="font-semibold text-slate-900">{med.dosage_amount} {med.dosage_unit || ''}</span>
                    </span>
                  )}
                  {med.start_date && (
                    <span className="inline-flex items-center text-slate-500">
                      <Calendar className="w-3 h-3 mr-1 text-slate-400" />
                      {med.start_date} {med.end_date ? `to ${med.end_date}` : '(Ongoing)'}
                    </span>
                  )}
                </div>

                {med.instructions && (
                  <div className="flex items-start space-x-1.5 mt-2 text-xs text-slate-500 bg-slate-50 p-2 rounded-xl border border-slate-100">
                    <FileText className="w-3.5 h-3.5 text-slate-400 shrink-0 mt-0.5" />
                    <span className="italic">{med.instructions}</span>
                  </div>
                )}
              </div>
            </div>

            {/* Read-only tag */}
            <div className="sm:self-center shrink-0">
              <span className="inline-flex items-center text-[11px] font-medium text-slate-400 bg-slate-50 px-2.5 py-1 rounded-lg border border-slate-200/60">
                Read-Only Record
              </span>
            </div>
          </div>
        )
      })}
    </div>
  )
}

export default CaregiverMedicationList
