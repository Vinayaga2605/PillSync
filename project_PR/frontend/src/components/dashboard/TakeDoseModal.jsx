import React, { useState, useEffect } from 'react'
import { CheckCircle2, Pill, Clock, X, Loader2, AlertCircle, FileText } from 'lucide-react'

const formatTime12h = (timeStr, isoTimestamp) => {
  if (timeStr) {
    const parts = timeStr.split(':')
    if (parts.length >= 2) {
      const h = parseInt(parts[0], 10)
      const m = parts[1]
      const ampm = h >= 12 ? 'PM' : 'AM'
      const formattedHours = h % 12 || 12
      return `${formattedHours}:${m} ${ampm}`
    }
  }
  if (isoTimestamp) {
    try {
      const d = new Date(isoTimestamp)
      if (!isNaN(d.getTime())) {
        return new Intl.DateTimeFormat('en-US', {
          hour: 'numeric',
          minute: '2-digit',
          hour12: true,
        }).format(d)
      }
    } catch {
      // Fallback
    }
  }
  return timeStr || 'Scheduled'
}

export const TakeDoseModal = ({
  isOpen,
  onClose,
  onConfirm,
  medication,
  isLoading = false,
  error = null,
}) => {
  const [doseQuantity, setDoseQuantity] = useState('1')
  const [notes, setNotes] = useState('')
  const [validationError, setValidationError] = useState(null)

  useEffect(() => {
    if (isOpen && medication) {
      const defaultQty = medication.dose_quantity ? String(Number(medication.dose_quantity)) : '1'
      setDoseQuantity(defaultQty)
      setNotes('')
      setValidationError(null)
    }
  }, [isOpen, medication])

  if (!isOpen || !medication) return null

  const handleSubmit = (e) => {
    e.preventDefault()
    const parsedQty = parseFloat(doseQuantity)
    if (isNaN(parsedQty) || parsedQty <= 0) {
      setValidationError('Dose quantity must be greater than 0.')
      return
    }
    setValidationError(null)
    onConfirm({
      doseQuantityTaken: parsedQty,
      notes: notes.trim() || undefined,
    })
  }

  const formattedTime = formatTime12h(medication.scheduled_time, medication.due_at)

  return (
    <div className="fixed inset-0 z-50 overflow-y-auto" role="dialog" aria-modal="true" aria-labelledby="take-dose-title">
      {/* Backdrop */}
      <div
        className="fixed inset-0 bg-slate-900/40 backdrop-blur-xs transition-opacity"
        onClick={!isLoading ? onClose : undefined}
      />

      <div className="min-h-full flex items-center justify-center p-4 text-center">
        {/* Modal Window */}
        <div
          className="relative w-full max-w-md bg-white border border-slate-200 rounded-2xl text-left shadow-2xl p-6 overflow-hidden max-h-[90vh] overflow-y-auto transform transition-all animate-in fade-in zoom-in-95 duration-150"
          onClick={(e) => e.stopPropagation()}
        >
          {/* Header */}
          <div className="flex items-start justify-between pb-4 border-b border-slate-100">
            <div className="flex items-center space-x-3">
              <div className="w-10 h-10 rounded-xl bg-teal-50 border border-teal-200 text-teal-700 flex items-center justify-center shrink-0">
                <CheckCircle2 className="w-5 h-5" />
              </div>
              <div>
                <h3 id="take-dose-title" className="text-base font-bold text-slate-900 tracking-tight">
                  Take Medication
                </h3>
                <p className="text-xs text-slate-500 mt-0.5">Confirm dose intake and record status</p>
              </div>
            </div>

            <button
              onClick={onClose}
              disabled={isLoading}
              className="text-slate-400 hover:text-slate-700 p-1.5 rounded-lg hover:bg-slate-100 transition-colors cursor-pointer disabled:opacity-50"
              aria-label="Close dialog"
            >
              <X className="w-4 h-4" />
            </button>
          </div>

          {/* Medication Summary Card */}
          <div className="mt-4 bg-slate-50 border border-slate-200/80 rounded-xl p-4">
            <div className="flex items-center space-x-3">
              <div className="w-9 h-9 rounded-lg bg-teal-50 text-teal-700 border border-teal-200 flex items-center justify-center shrink-0">
                <Pill className="w-4.5 h-4.5" />
              </div>
              <div className="min-w-0 flex-1">
                <h4 className="text-sm font-bold text-slate-900 truncate">
                  {medication.medicine_name || 'Medication'}
                </h4>
                {medication.generic_name && (
                  <p className="text-xs text-slate-500 italic truncate">
                    {medication.generic_name}
                  </p>
                )}
              </div>
            </div>

            <div className="mt-3 pt-3 border-t border-slate-200/60 flex items-center justify-between text-xs">
              <div className="flex items-center gap-1.5 text-slate-600">
                <Clock className="w-3.5 h-3.5 text-teal-600" />
                <span>Scheduled: <strong className="text-slate-900 font-semibold">{formattedTime}</strong></span>
              </div>
              <span className="text-slate-500">
                Prescribed: <strong className="text-slate-800 font-semibold">{Number(medication.dose_quantity || 1)} {medication.dosage_unit || 'dose'}</strong>
              </span>
            </div>
          </div>

          {/* Error Banner */}
          {(error || validationError) && (
            <div className="mt-4 p-3 rounded-xl bg-rose-50 border border-rose-200 text-rose-700 text-xs flex items-start space-x-2">
              <AlertCircle className="w-4 h-4 text-rose-600 shrink-0 mt-0.5" />
              <p className="leading-relaxed font-medium">{error || validationError}</p>
            </div>
          )}

          {/* Form */}
          <form onSubmit={handleSubmit} className="mt-4 space-y-4">
            <div>
              <label htmlFor="dose-quantity-input" className="block text-xs font-bold text-slate-700 mb-1.5">
                Dose Quantity Taken <span className="text-teal-600">*</span>
              </label>
              <div className="flex items-center space-x-2">
                <input
                  id="dose-quantity-input"
                  type="number"
                  step="any"
                  min="0.01"
                  required
                  disabled={isLoading}
                  value={doseQuantity}
                  onChange={(e) => setDoseQuantity(e.target.value)}
                  className="flex-1 px-3.5 py-2 bg-white border border-slate-200 rounded-xl text-sm text-slate-900 focus:outline-none focus:ring-4 focus:ring-teal-500/10 focus:border-teal-500 disabled:opacity-60"
                  placeholder="1.0"
                />
                <span className="text-xs font-semibold text-slate-600 px-3 py-2 bg-slate-100 rounded-xl border border-slate-200">
                  {medication.dosage_unit || 'dose'}
                </span>
              </div>
            </div>

            <div>
              <label htmlFor="intake-notes-input" className="block text-xs font-bold text-slate-700 mb-1.5 flex items-center justify-between">
                <span>Notes (optional)</span>
                <span className="text-[10px] text-slate-400 font-normal">Max 500 chars</span>
              </label>
              <div className="relative">
                <textarea
                  id="intake-notes-input"
                  rows={2}
                  maxLength={500}
                  disabled={isLoading}
                  value={notes}
                  onChange={(e) => setNotes(e.target.value)}
                  placeholder="e.g. Taken with breakfast and full glass of water"
                  className="w-full px-3.5 py-2 bg-white border border-slate-200 rounded-xl text-xs text-slate-900 placeholder-slate-400 focus:outline-none focus:ring-4 focus:ring-teal-500/10 focus:border-teal-500 disabled:opacity-60 resize-none"
                />
              </div>
            </div>

            {/* Actions */}
            <div className="pt-3 border-t border-slate-100 flex items-center justify-end space-x-3">
              <button
                type="button"
                onClick={onClose}
                disabled={isLoading}
                className="px-4 py-2 rounded-xl text-xs font-semibold text-slate-600 bg-slate-100 hover:bg-slate-200 border border-slate-200 transition-colors focus:outline-none disabled:opacity-50 cursor-pointer"
              >
                Cancel
              </button>

              <button
                type="submit"
                disabled={isLoading}
                className="inline-flex items-center space-x-1.5 px-5 py-2 rounded-xl text-xs font-semibold text-white bg-teal-600 hover:bg-teal-700 shadow-sm shadow-teal-600/20 transition-all focus:outline-none focus:ring-4 focus:ring-teal-500/20 disabled:opacity-60 cursor-pointer disabled:cursor-not-allowed"
              >
                {isLoading ? (
                  <>
                    <Loader2 className="w-3.5 h-3.5 animate-spin" />
                    <span>Taking Dose...</span>
                  </>
                ) : (
                  <>
                    <CheckCircle2 className="w-3.5 h-3.5 stroke-[2.4]" />
                    <span>Take Dose</span>
                  </>
                )}
              </button>
            </div>
          </form>
        </div>
      </div>
    </div>
  )
}
export default TakeDoseModal
