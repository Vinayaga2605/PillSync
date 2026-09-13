import React from 'react'
import { AlertTriangle, Trash2, X, Loader2 } from 'lucide-react'

export const DeleteConfirmModal = ({
  isOpen,
  onClose,
  onConfirm,
  medicineName,
  isLoading = false,
}) => {
  if (!isOpen) return null

  return (
    <div className="fixed inset-0 z-50 overflow-y-auto">
      {/* Backdrop */}
      <div
        className="fixed inset-0 bg-slate-900/40 backdrop-blur-xs transition-opacity"
        onClick={!isLoading ? onClose : undefined}
      />

      <div className="min-h-full flex items-center justify-center p-4 text-center">
        {/* Dialog Box */}
        <div
          className="relative w-full max-w-md bg-white border border-slate-200 rounded-2xl text-left shadow-2xl p-6 overflow-hidden transform transition-all animate-in fade-in zoom-in-95 duration-150"
          onClick={(e) => e.stopPropagation()}
        >
          <div className="flex items-start space-x-4">
            <div className="w-11 h-11 rounded-2xl bg-rose-50 border border-rose-200 text-rose-600 flex items-center justify-center shrink-0">
              <AlertTriangle className="w-6 h-6" />
            </div>

            <div className="flex-1 min-w-0">
              <h3 className="text-base font-bold text-slate-900 tracking-tight">
                Delete Medicine
              </h3>
              <p className="text-xs text-slate-500 mt-1.5 leading-relaxed">
                Are you sure you want to delete{' '}
                <span className="font-semibold text-slate-800">"{medicineName}"</span>?
                This action cannot be undone and will permanently remove this record from your profile.
              </p>
            </div>

            <button
              onClick={onClose}
              disabled={isLoading}
              className="text-slate-400 hover:text-slate-700 p-1.5 rounded-lg hover:bg-slate-100 transition-colors cursor-pointer disabled:opacity-50"
            >
              <X className="w-4 h-4" />
            </button>
          </div>

          <div className="mt-6 pt-4 border-t border-slate-100 flex items-center justify-end space-x-3">
            <button
              type="button"
              onClick={onClose}
              disabled={isLoading}
              className="px-4 py-2 rounded-xl text-xs font-semibold text-slate-600 bg-slate-100 hover:bg-slate-200 border border-slate-200 transition-colors focus:outline-none cursor-pointer"
            >
              Cancel
            </button>

            <button
              type="button"
              onClick={onConfirm}
              disabled={isLoading}
              className="inline-flex items-center space-x-1.5 px-4 py-2 rounded-xl text-xs font-semibold text-white bg-rose-600 hover:bg-rose-700 shadow-sm shadow-rose-600/20 transition-all focus:outline-none focus:ring-4 focus:ring-rose-500/20 disabled:opacity-60 cursor-pointer"
            >
              {isLoading ? (
                <>
                  <Loader2 className="w-3.5 h-3.5 animate-spin" />
                  <span>Deleting...</span>
                </>
              ) : (
                <>
                  <Trash2 className="w-3.5 h-3.5" />
                  <span>Delete Medicine</span>
                </>
              )}
            </button>
          </div>
        </div>
      </div>
    </div>
  )
}
