import React from 'react'
import { AlertTriangle, X, Loader2 } from 'lucide-react'

export const DeleteScheduleModal = ({
  isOpen,
  onClose,
  onConfirm,
  scheduleSummary = 'this schedule',
  isLoading = false,
}) => {
  if (!isOpen) return null

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      {/* Backdrop */}
      <div
        className="fixed inset-0 bg-slate-900/40 backdrop-blur-xs transition-opacity"
        onClick={!isLoading ? onClose : undefined}
      />

      {/* Modal Container */}
      <div className="relative w-full max-w-md rounded-2xl bg-white border border-slate-200 p-6 shadow-2xl animate-in fade-in zoom-in-95 duration-200">
        {/* Close Button */}
        <button
          onClick={onClose}
          disabled={isLoading}
          className="absolute right-4 top-4 rounded-lg p-1.5 text-slate-400 hover:bg-slate-100 hover:text-slate-700 transition-colors disabled:opacity-50 cursor-pointer"
        >
          <X className="w-5 h-5" />
        </button>

        {/* Warning Icon & Heading */}
        <div className="flex items-center space-x-3 mb-4">
          <div className="w-10 h-10 rounded-xl bg-rose-50 border border-rose-200 text-rose-600 flex items-center justify-center shrink-0">
            <AlertTriangle className="w-5 h-5" />
          </div>
          <div>
            <h3 className="text-base font-bold text-slate-900 tracking-tight">
              Delete Schedule
            </h3>
            <p className="text-xs text-slate-500">
              Confirm medication schedule removal
            </p>
          </div>
        </div>

        {/* Body Confirmation Text */}
        <div className="bg-slate-50 rounded-xl p-4 border border-slate-200/80 mb-6">
          <p className="text-xs text-slate-700 leading-relaxed">
            Are you sure you want to delete <strong className="text-rose-600 font-semibold">{scheduleSummary}</strong>?
          </p>
          <p className="text-[11px] text-slate-500 mt-2">
            This action will remove all configured dosing times and reminder alerts for this schedule.
          </p>
        </div>

        {/* Action Buttons */}
        <div className="flex items-center justify-end space-x-3">
          <button
            type="button"
            onClick={onClose}
            disabled={isLoading}
            className="px-4 py-2 rounded-xl text-xs font-semibold text-slate-600 bg-slate-100 hover:bg-slate-200 border border-slate-200 transition-colors disabled:opacity-50 cursor-pointer"
          >
            Cancel
          </button>

          <button
            type="button"
            onClick={onConfirm}
            disabled={isLoading}
            className="inline-flex items-center space-x-2 px-4 py-2 rounded-xl text-xs font-semibold text-white bg-rose-600 hover:bg-rose-700 shadow-sm shadow-rose-600/20 transition-all focus:outline-none focus:ring-4 focus:ring-rose-500/20 disabled:opacity-60 cursor-pointer"
          >
            {isLoading ? (
              <>
                <Loader2 className="w-3.5 h-3.5 animate-spin" />
                <span>Deleting...</span>
              </>
            ) : (
              <span>Delete Schedule</span>
            )}
          </button>
        </div>
      </div>
    </div>
  )
}
