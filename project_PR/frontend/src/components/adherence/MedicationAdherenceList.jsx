import React, { useState, useMemo } from 'react'
import { Pill, Search, CheckCircle2, XCircle, Clock, Sparkles } from 'lucide-react'

export const MedicationAdherenceList = ({ medications = [] }) => {
  const [searchTerm, setSearchTerm] = useState('')

  const filteredMeds = useMemo(() => {
    if (!searchTerm.trim()) return medications
    const term = searchTerm.toLowerCase().trim()
    return medications.filter(
      (m) =>
        m.medicine_name?.toLowerCase().includes(term) ||
        m.generic_name?.toLowerCase().includes(term)
    )
  }, [medications, searchTerm])

  const getScoreBadge = (pct) => {
    if (pct >= 85) return { text: 'text-emerald-700', bg: 'bg-emerald-50 border-emerald-200' }
    if (pct >= 60) return { text: 'text-sky-700', bg: 'bg-sky-50 border-sky-200' }
    if (pct >= 40) return { text: 'text-amber-800', bg: 'bg-amber-50 border-amber-200' }
    return { text: 'text-rose-700', bg: 'bg-rose-50 border-rose-200' }
  }

  return (
    <div className="bg-white border border-slate-200/80 rounded-2xl p-6 shadow-xs space-y-4">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-3 border-b border-slate-100">
        <div className="flex items-center space-x-3">
          <div className="w-10 h-10 rounded-xl bg-teal-50 border border-teal-200 text-teal-700 flex items-center justify-center shrink-0">
            <Pill className="w-5 h-5" />
          </div>
          <div>
            <h3 className="text-base font-bold text-slate-900 tracking-tight">
              Medication-wise Performance Comparison
            </h3>
            <p className="text-xs text-slate-500 font-medium">
              Individual compliance rates and dose distribution per medication
            </p>
          </div>
        </div>

        {/* Search Bar */}
        {medications.length > 3 && (
          <div className="relative max-w-xs w-full">
            <Search className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
            <input
              type="text"
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              placeholder="Search medication..."
              className="w-full pl-9 pr-3 py-1.5 rounded-xl bg-slate-50 border border-slate-200 text-xs text-slate-800 focus:outline-none focus:border-teal-500 focus:bg-white transition-all"
            />
          </div>
        )}
      </div>

      {filteredMeds.length === 0 ? (
        <div className="py-8 text-center text-xs text-slate-400 font-medium">
          No matching medications found.
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {filteredMeds.map((med) => {
            const pct = Math.round(med.adherence_percentage || 0)
            const badge = getScoreBadge(pct)
            const total = med.total_doses || 1
            const takenWidth = Math.min(100, Math.round((med.taken_doses / total) * 100))
            const skippedWidth = Math.min(100, Math.round((med.skipped_doses / total) * 100))
            const pendingWidth = Math.min(100, Math.round((med.pending_doses / total) * 100))

            return (
              <div
                key={med.patient_medication_id}
                className="bg-slate-50/70 border border-slate-200/80 hover:border-teal-300 rounded-2xl p-4.5 flex flex-col justify-between transition-all shadow-xs"
              >
                <div>
                  {/* Title & Badge */}
                  <div className="flex items-start justify-between gap-2 mb-2.5">
                    <div className="min-w-0 flex-1">
                      <h4 className="text-sm font-bold text-slate-900 truncate">
                        {med.medicine_name}
                      </h4>
                      {med.generic_name && (
                        <p className="text-[11px] text-slate-500 italic truncate -mt-0.5">
                          {med.generic_name}
                        </p>
                      )}
                    </div>
                    <span className={`inline-flex items-center gap-1 text-xs font-extrabold px-2.5 py-0.5 rounded-full border shrink-0 ${badge.bg} ${badge.text}`}>
                      <Sparkles className="w-3 h-3" />
                      <span>{pct}%</span>
                    </span>
                  </div>

                  {/* Multi-Segment Horizontal Stacked Bar Diagram */}
                  <div className="space-y-1.5 my-3">
                    <div className="w-full bg-slate-200 rounded-full h-3 p-0.5 overflow-hidden flex">
                      <div
                        style={{ width: `${takenWidth}%` }}
                        className="h-full bg-gradient-to-r from-emerald-600 to-teal-500 rounded-l-full transition-all duration-500"
                        title={`Taken: ${med.taken_doses}`}
                      />
                      <div
                        style={{ width: `${skippedWidth}%` }}
                        className="h-full bg-gradient-to-r from-rose-600 to-rose-400 transition-all duration-500"
                        title={`Skipped: ${med.skipped_doses}`}
                      />
                      <div
                        style={{ width: `${pendingWidth}%` }}
                        className="h-full bg-gradient-to-r from-amber-500 to-amber-400 rounded-r-full transition-all duration-500"
                        title={`Pending: ${med.pending_doses}`}
                      />
                    </div>
                  </div>
                </div>

                {/* Metrics Footer */}
                <div className="pt-2.5 border-t border-slate-200/60 grid grid-cols-3 gap-2 text-center text-xs">
                  <div className="bg-white/80 rounded-xl py-1.5 border border-slate-200/60">
                    <span className="block text-[10px] text-slate-400 font-medium">Taken</span>
                    <span className="font-extrabold text-emerald-700">{med.taken_doses}</span>
                  </div>
                  <div className="bg-white/80 rounded-xl py-1.5 border border-slate-200/60">
                    <span className="block text-[10px] text-slate-400 font-medium">Skipped</span>
                    <span className="font-extrabold text-rose-600">{med.skipped_doses}</span>
                  </div>
                  <div className="bg-white/80 rounded-xl py-1.5 border border-slate-200/60">
                    <span className="block text-[10px] text-slate-400 font-medium">Pending</span>
                    <span className="font-extrabold text-amber-700">{med.pending_doses}</span>
                  </div>
                </div>
              </div>
            )
          })}
        </div>
      )}
    </div>
  )
}

export default MedicationAdherenceList
