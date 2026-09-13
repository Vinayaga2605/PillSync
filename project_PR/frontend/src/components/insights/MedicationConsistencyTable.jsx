import React, { useState, useMemo } from 'react'
import {
  Pill,
  Search,
  ChevronDown,
  ChevronUp,
  CheckCircle2,
  AlertTriangle,
  HelpCircle,
  Clock,
  Layers,
  Calendar,
} from 'lucide-react'

export const MedicationConsistencyTable = ({ medications = [] }) => {
  const [searchQuery, setSearchQuery] = useState('')
  const [statusFilter, setStatusFilter] = useState('ALL') // 'ALL' | 'GOOD' | 'NEEDS_ATTENTION' | 'INSUFFICIENT_DATA'
  const [expandedMeds, setExpandedMeds] = useState({})

  const toggleExpand = (id) => {
    setExpandedMeds((prev) => ({ ...prev, [id]: !prev[id] }))
  }

  // Filtered medications
  const filteredMeds = useMemo(() => {
    return medications.filter((med) => {
      const matchesSearch =
        med.medicine_name.toLowerCase().includes(searchQuery.toLowerCase()) ||
        (med.dosage && med.dosage.toLowerCase().includes(searchQuery.toLowerCase()))

      const matchesStatus =
        statusFilter === 'ALL' || med.status === statusFilter

      return matchesSearch && matchesStatus
    })
  }, [medications, searchQuery, statusFilter])

  // Count per status
  const counts = useMemo(() => {
    return {
      ALL: medications.length,
      GOOD: medications.filter((m) => m.status === 'GOOD').length,
      NEEDS_ATTENTION: medications.filter((m) => m.status === 'NEEDS_ATTENTION').length,
      INSUFFICIENT_DATA: medications.filter((m) => m.status === 'INSUFFICIENT_DATA').length,
    }
  }, [medications])

  const formatTimestamp = (ts) => {
    if (!ts) return 'No dose recorded'
    try {
      const d = new Date(ts)
      return d.toLocaleDateString(undefined, {
        month: 'short',
        day: 'numeric',
        hour: '2-digit',
        minute: '2-digit',
      })
    } catch {
      return String(ts)
    }
  }

  return (
    <div className="bg-white rounded-2xl border border-slate-200/80 p-6 shadow-xs space-y-5">
      {/* Header & Search */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h2 className="text-base font-bold text-slate-900">
            Medication Consistency Breakdown
          </h2>
          <p className="text-xs text-slate-500 mt-0.5">
            Adherence metrics and recent intake performance per prescribed medicine.
          </p>
        </div>

        <div className="flex items-center gap-2.5 flex-wrap sm:flex-nowrap">
          {/* Search Input */}
          <div className="relative w-full sm:w-60">
            <Search className="w-3.5 h-3.5 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
            <input
              type="text"
              placeholder="Search medication..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full pl-9 pr-3 py-1.5 rounded-xl border border-slate-200 text-xs text-slate-800 placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-teal-500/20 focus:border-teal-500 transition-all"
            />
          </div>
        </div>
      </div>

      {/* Filter Tabs */}
      <div className="flex items-center gap-1.5 overflow-x-auto pb-1">
        <button
          onClick={() => setStatusFilter('ALL')}
          className={`px-3 py-1.5 rounded-xl text-xs font-bold transition-all cursor-pointer whitespace-nowrap ${
            statusFilter === 'ALL'
              ? 'bg-slate-900 text-white shadow-2xs'
              : 'bg-slate-100 text-slate-600 hover:bg-slate-200/70'
          }`}
        >
          All ({counts.ALL})
        </button>
        <button
          onClick={() => setStatusFilter('GOOD')}
          className={`px-3 py-1.5 rounded-xl text-xs font-bold transition-all cursor-pointer whitespace-nowrap ${
            statusFilter === 'GOOD'
              ? 'bg-emerald-700 text-white shadow-2xs'
              : 'bg-emerald-50 text-emerald-800 hover:bg-emerald-100/70'
          }`}
        >
          Consistent ({counts.GOOD})
        </button>
        {counts.NEEDS_ATTENTION > 0 && (
          <button
            onClick={() => setStatusFilter('NEEDS_ATTENTION')}
            className={`px-3 py-1.5 rounded-xl text-xs font-bold transition-all cursor-pointer whitespace-nowrap ${
              statusFilter === 'NEEDS_ATTENTION'
                ? 'bg-rose-700 text-white shadow-2xs'
                : 'bg-rose-50 text-rose-800 hover:bg-rose-100/70'
            }`}
          >
            Needs Focus ({counts.NEEDS_ATTENTION})
          </button>
        )}
        <button
          onClick={() => setStatusFilter('INSUFFICIENT_DATA')}
          className={`px-3 py-1.5 rounded-xl text-xs font-bold transition-all cursor-pointer whitespace-nowrap ${
            statusFilter === 'INSUFFICIENT_DATA'
              ? 'bg-sky-700 text-white shadow-2xs'
              : 'bg-sky-50 text-sky-800 hover:bg-sky-100/70'
          }`}
        >
          Building Baseline ({counts.INSUFFICIENT_DATA})
        </button>
      </div>

      {/* Medications List */}
      {filteredMeds.length > 0 ? (
        <div className="space-y-3">
          {filteredMeds.map((med) => {
            const isExpanded = !!expandedMeds[med.patient_medication_id]
            const isInsufficient = med.status === 'INSUFFICIENT_DATA'
            const completed = (med.taken_doses || 0) + (med.skipped_doses || 0)

            return (
              <div
                key={med.patient_medication_id}
                className={`border rounded-2xl overflow-hidden transition-all duration-200 bg-white ${
                  isExpanded
                    ? 'border-teal-300 shadow-xs'
                    : 'border-slate-200/80 hover:border-slate-300'
                }`}
              >
                {/* Summary Row */}
                <div
                  onClick={() => toggleExpand(med.patient_medication_id)}
                  className="p-4 flex flex-col sm:flex-row sm:items-center justify-between gap-4 cursor-pointer hover:bg-slate-50/60 transition-colors"
                >
                  {/* Left: Pill & Info */}
                  <div className="flex items-center gap-3.5">
                    <div
                      className={`p-2.5 rounded-xl border shrink-0 ${
                        isInsufficient
                          ? 'bg-sky-50 text-sky-600 border-sky-200'
                          : med.adherence_percentage >= 80
                          ? 'bg-emerald-50 text-emerald-600 border-emerald-200'
                          : 'bg-rose-50 text-rose-600 border-rose-200'
                      }`}
                    >
                      <Pill className="w-5 h-5" />
                    </div>

                    <div>
                      <div className="flex items-center gap-2 flex-wrap">
                        <h4 className="font-bold text-slate-900 text-sm">
                          {med.medicine_name}
                        </h4>

                        {/* Status Badge */}
                        {isInsufficient ? (
                          <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-md text-[10px] font-bold bg-sky-50 text-sky-700 border border-sky-200">
                            <HelpCircle className="w-3 h-3" />
                            <span>Building Baseline</span>
                          </span>
                        ) : med.status === 'GOOD' ? (
                          <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-md text-[10px] font-bold bg-emerald-50 text-emerald-700 border border-emerald-200">
                            <CheckCircle2 className="w-3 h-3" />
                            <span>Consistent (≥80%)</span>
                          </span>
                        ) : (
                          <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-md text-[10px] font-bold bg-rose-50 text-rose-700 border border-rose-200">
                            <AlertTriangle className="w-3 h-3" />
                            <span>Needs Attention (&lt;80%)</span>
                          </span>
                        )}
                      </div>

                      <div className="flex items-center gap-3 text-xs text-slate-400 mt-0.5">
                        {med.dosage && <span>{med.dosage}</span>}
                        {completed > 0 ? (
                          <span>
                            • <strong className="text-slate-600 font-semibold">{completed}</strong> doses logged
                          </span>
                        ) : (
                          <span>• No dose activity yet</span>
                        )}
                      </div>
                    </div>
                  </div>

                  {/* Right: Progress Meter & Value */}
                  <div className="flex items-center gap-5 self-end sm:self-auto">
                    <div className="text-right">
                      {isInsufficient ? (
                        <>
                          <div className="flex items-center justify-end gap-1.5">
                            <span className="text-xs font-bold text-sky-700">
                              -- / --
                            </span>
                          </div>
                          {/* Muted neutral bar */}
                          <div className="w-32 h-2 bg-slate-100 rounded-full overflow-hidden mt-1 border border-dashed border-slate-300 flex items-center justify-center">
                            <span className="text-[8px] font-bold text-slate-400">
                              {completed}/2 DOSES
                            </span>
                          </div>
                        </>
                      ) : (
                        <>
                          <div className="flex items-center justify-end gap-1">
                            <span className="text-base font-extrabold text-slate-900">
                              {med.adherence_percentage}%
                            </span>
                          </div>

                          {/* Dual progress bar */}
                          <div className="w-32 h-2 bg-slate-100 rounded-full overflow-hidden mt-1 flex">
                            <div
                              className="bg-emerald-500 h-full transition-all duration-500"
                              style={{
                                width: `${
                                  completed > 0
                                    ? ((med.taken_doses || 0) / completed) * 100
                                    : 0
                                }%`,
                              }}
                              title={`Taken: ${med.taken_doses || 0}`}
                            />
                            <div
                              className="bg-rose-400 h-full transition-all duration-500"
                              style={{
                                width: `${
                                  completed > 0
                                    ? ((med.skipped_doses || 0) / completed) * 100
                                    : 0
                                }%`,
                              }}
                              title={`Skipped: ${med.skipped_doses || 0}`}
                            />
                          </div>
                        </>
                      )}
                    </div>

                    <div className="p-1 rounded-lg text-slate-400 hover:text-slate-700 hover:bg-slate-100 transition-colors">
                      {isExpanded ? (
                        <ChevronUp className="w-4 h-4" />
                      ) : (
                        <ChevronDown className="w-4 h-4" />
                      )}
                    </div>
                  </div>
                </div>

                {/* Expandable Details Drawer */}
                {isExpanded && (
                  <div className="px-5 py-4 bg-slate-50/80 border-t border-slate-100 animate-in fade-in duration-150">
                    <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                      {/* Dose Activity */}
                      <div className="bg-white p-3.5 rounded-xl border border-slate-200/70">
                        <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block">
                          30-Day Activity
                        </span>
                        <p className="text-xs text-slate-800 font-semibold mt-1">
                          <span className="text-emerald-600 font-bold">{med.taken_doses || 0} Taken</span>
                          {'  •  '}
                          <span className="text-rose-600 font-bold">{med.skipped_doses || 0} Skipped</span>
                        </p>
                        {med.pending_doses > 0 && (
                          <p className="text-[11px] text-amber-600 font-medium mt-0.5">
                            {med.pending_doses} dose{med.pending_doses > 1 ? 's' : ''} currently pending
                          </p>
                        )}
                      </div>

                      {/* Last Dose Status */}
                      <div className="bg-white p-3.5 rounded-xl border border-slate-200/70">
                        <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block">
                          Last Recorded Dose
                        </span>
                        <div className="flex items-center gap-1.5 mt-1">
                          {med.last_dose_status ? (
                            <span
                              className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-md text-[11px] font-bold ${
                                med.last_dose_status === 'TAKEN'
                                  ? 'bg-emerald-50 text-emerald-700'
                                  : 'bg-rose-50 text-rose-700'
                              }`}
                            >
                              {med.last_dose_status}
                            </span>
                          ) : (
                            <span className="text-xs text-slate-400 italic">None logged</span>
                          )}
                        </div>
                        {med.last_dose_timestamp && (
                          <p className="text-[10px] text-slate-400 mt-1">
                            {formatTimestamp(med.last_dose_timestamp)}
                          </p>
                        )}
                      </div>

                      {/* Recommendation / Assessment */}
                      <div className="bg-white p-3.5 rounded-xl border border-slate-200/70">
                        <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block">
                          AI Assessment
                        </span>
                        <p className="text-xs text-slate-700 mt-1 leading-relaxed">
                          {isInsufficient
                            ? 'Dosing history is being gathered. Record at least 2 completed doses to establish an adherence percentage.'
                            : med.status === 'GOOD'
                            ? 'Excellent adherence! Keep up this regular schedule.'
                            : 'Missed doses detected. Consider enabling audible reminders or reviewing scheduled intake times.'}
                        </p>
                      </div>
                    </div>
                  </div>
                )}
              </div>
            )
          })}
        </div>
      ) : (
        <div className="p-8 text-center bg-slate-50 rounded-2xl border border-dashed border-slate-200">
          <Pill className="w-8 h-8 text-slate-400 mx-auto mb-2" />
          <h4 className="text-sm font-semibold text-slate-800">No matching medications</h4>
          <p className="text-xs text-slate-500 mt-1">
            Try adjusting your search query or filter options above.
          </p>
        </div>
      )}
    </div>
  )
}

export default MedicationConsistencyTable
