import React, { useState, useEffect } from 'react'
import {
  X,
  Sparkles,
  TrendingDown,
  Calendar,
  Clock,
  Boxes,
  AlertTriangle,
  AlertOctagon,
  CheckCircle2,
  HelpCircle,
  Loader2,
  RefreshCw,
  Plus,
  ArrowRight,
} from 'lucide-react'
import { refillService } from '../../services/refillService'

export const RefillPredictionModal = ({
  isOpen,
  onClose,
  medicine,
  onOpenStockModal,
  onOpenScheduleModal,
}) => {
  const [prediction, setPrediction] = useState(null)
  const [isLoading, setIsLoading] = useState(true)
  const [error, setError] = useState(null)

  const fetchPrediction = async () => {
    if (!medicine?.id) return
    setIsLoading(true)
    setError(null)
    try {
      const data = await refillService.getMedicineRefillPrediction(medicine.id)
      setPrediction(data)
    } catch (err) {
      if (err.response?.status === 401) {
        setError('Your login session has expired or credentials were not found. Please sign in again to continue.')
      } else {
        setError(
          err.response?.data?.detail || 'Unable to calculate refill prediction. Please try again.'
        )
      }
    } finally {
      setIsLoading(false)
    }
  }

  useEffect(() => {
    if (isOpen && medicine) {
      fetchPrediction()
    } else {
      setPrediction(null)
      setError(null)
    }
  }, [isOpen, medicine])

  if (!isOpen || !medicine) return null

  const formatDate = (dateStr) => {
    if (!dateStr) return 'N/A'
    try {
      const d = new Date(dateStr + 'T00:00:00')
      return d.toLocaleDateString('en-US', {
        month: 'short',
        day: 'numeric',
        year: 'numeric',
      })
    } catch {
      return dateStr
    }
  }

  const getStatusBadge = (status) => {
    switch (status) {
      case 'OUT_OF_STOCK':
        return {
          label: 'Out of Stock',
          bg: 'bg-rose-50 text-rose-700 border-rose-200',
          icon: AlertOctagon,
          dot: 'bg-rose-500',
        }
      case 'REFILL_RECOMMENDED':
        return {
          label: 'Refill Recommended',
          bg: 'bg-rose-50 text-rose-700 border-rose-200',
          icon: AlertOctagon,
          dot: 'bg-rose-500',
        }
      case 'REFILL_SOON':
        return {
          label: 'Refill Soon',
          bg: 'bg-amber-50 text-amber-700 border-amber-200',
          icon: AlertTriangle,
          dot: 'bg-amber-500',
        }
      case 'ON_TRACK':
        return {
          label: 'Stock On Track',
          bg: 'bg-emerald-50 text-emerald-700 border-emerald-200',
          icon: CheckCircle2,
          dot: 'bg-emerald-500',
        }
      case 'INSUFFICIENT_DATA':
      default:
        return {
          label: 'Insufficient Data (Schedule Needed)',
          bg: 'bg-slate-100 text-slate-700 border-slate-200',
          icon: HelpCircle,
          dot: 'bg-slate-400',
        }
    }
  }

  const statusInfo = prediction ? getStatusBadge(prediction.prediction_status) : null
  const isInsufficient = prediction?.prediction_status === 'INSUFFICIENT_DATA' || prediction?.average_daily_consumption === null

  return (
    <div className="fixed inset-0 z-50 overflow-y-auto">
      {/* Backdrop */}
      <div
        className="fixed inset-0 bg-slate-900/40 backdrop-blur-xs transition-opacity"
        onClick={onClose}
      />

      <div className="min-h-full flex items-center justify-center p-4 sm:p-6 text-center">
        <div
          className="relative w-full max-w-lg bg-white border border-slate-200 rounded-2xl text-left shadow-2xl overflow-hidden transform transition-all animate-in fade-in zoom-in-95 duration-150"
          onClick={(e) => e.stopPropagation()}
        >
          {/* Header */}
          <div className="flex items-center justify-between px-6 py-4 border-b border-slate-100 bg-slate-50/70">
            <div className="flex items-center space-x-3">
              <div className="w-9 h-9 rounded-xl bg-teal-50 border border-teal-200 text-teal-700 flex items-center justify-center">
                <Sparkles className="w-5 h-5 text-teal-600" />
              </div>
              <div>
                <h2 className="text-base font-bold text-slate-900 tracking-tight">
                  AI Refill Prediction
                </h2>
                <p className="text-xs text-slate-500 font-medium truncate max-w-[260px]">
                  {medicine.name} {medicine.generic_name ? `(${medicine.generic_name})` : ''}
                </p>
              </div>
            </div>

            <button
              onClick={onClose}
              className="p-1.5 text-slate-400 hover:text-slate-700 rounded-lg hover:bg-slate-100 transition-colors cursor-pointer"
            >
              <X className="w-5 h-5" />
            </button>
          </div>

          <div className="p-6 space-y-5">
            {isLoading ? (
              <div className="py-12 flex flex-col items-center justify-center space-y-3">
                <Loader2 className="w-8 h-8 animate-spin text-teal-600" />
                <p className="text-xs font-semibold text-slate-500">
                  Analyzing stock and dose intake history...
                </p>
              </div>
            ) : error ? (
              <div className="p-4 rounded-xl bg-rose-50 border border-rose-200 text-rose-800 space-y-2">
                <div className="flex items-center space-x-2 text-xs font-bold">
                  <AlertOctagon className="w-4 h-4 text-rose-600" />
                  <span>Failed to Load Refill Prediction</span>
                </div>
                <p className="text-xs text-rose-600 leading-relaxed">{error}</p>
                <div className="flex items-center space-x-2 pt-1">
                  <button
                    onClick={fetchPrediction}
                    className="inline-flex items-center space-x-1 px-3 py-1.5 rounded-lg text-xs font-semibold bg-white border border-rose-200 text-rose-700 hover:bg-rose-50 transition-colors cursor-pointer"
                  >
                    <RefreshCw className="w-3.5 h-3.5" />
                    <span>Retry Analysis</span>
                  </button>
                  {(error.includes('session') || error.includes('credentials')) && (
                    <a
                      href="/login"
                      className="inline-flex items-center space-x-1 px-3 py-1.5 rounded-lg text-xs font-semibold bg-rose-600 text-white hover:bg-rose-700 transition-colors"
                    >
                      <span>Sign In Again</span>
                    </a>
                  )}
                </div>
              </div>
            ) : prediction ? (
              <>
                {/* Status Hero Card */}
                <div className={`p-4 rounded-xl border flex items-center justify-between ${statusInfo.bg}`}>
                  <div className="flex items-center space-x-3">
                    <statusInfo.icon className="w-5 h-5 shrink-0" />
                    <div>
                      <span className="text-[11px] font-medium opacity-80 uppercase tracking-wider block">
                        Prediction Status
                      </span>
                      <span className="text-sm font-bold block">{statusInfo.label}</span>
                    </div>
                  </div>
                  <div className="text-right">
                    <span className="text-[11px] font-medium opacity-80 block">Confidence</span>
                    <span className="text-xs font-bold">
                      {Math.round((prediction.confidence_score || 0.5) * 100)}% ({prediction.data_quality})
                    </span>
                  </div>
                </div>

                {/* Helpful Callout for Newly Added Medicines without Schedule */}
                {isInsufficient && (
                  <div className="p-4 rounded-xl bg-sky-50 border border-sky-200 text-sky-900 space-y-2.5">
                    <div className="flex items-center space-x-2">
                      <Clock className="w-4 h-4 text-sky-700 shrink-0" />
                      <span className="text-xs font-bold">Why does this show "Insufficient Data"?</span>
                    </div>
                    <p className="text-xs text-sky-800/90 leading-relaxed font-medium">
                      You have <strong>{prediction.current_quantity} {prediction.stock_unit}</strong> in stock, but you haven't set a <strong>Dosing Schedule</strong> yet. The AI needs to know how many pills you take each day (e.g. 1 tablet daily) to predict your exact depletion and refill dates.
                    </p>
                    {onOpenScheduleModal && (
                      <button
                        onClick={() => {
                          onClose()
                          onOpenScheduleModal(medicine)
                        }}
                        className="inline-flex items-center space-x-1.5 px-3.5 py-1.5 rounded-lg bg-sky-700 hover:bg-sky-800 text-white text-xs font-bold shadow-xs transition-colors cursor-pointer"
                      >
                        <Clock className="w-3.5 h-3.5" />
                        <span>Create Dosing Schedule</span>
                        <ArrowRight className="w-3.5 h-3.5" />
                      </button>
                    )}
                  </div>
                )}

                {/* Key Refill Forecast Metrics Grid */}
                <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
                  <div className="p-3 rounded-xl bg-slate-50 border border-slate-200/80">
                    <span className="text-[11px] font-medium text-slate-500 block">Current Stock</span>
                    <span className="text-base font-extrabold text-slate-900 mt-0.5 block">
                      {prediction.current_quantity}{' '}
                      <span className="text-xs font-medium text-slate-500">{prediction.stock_unit}</span>
                    </span>
                  </div>

                  <div className="p-3 rounded-xl bg-slate-50 border border-slate-200/80">
                    <span className="text-[11px] font-medium text-slate-500 block">Avg. Daily Burn</span>
                    <span className="text-base font-extrabold text-teal-800 mt-0.5 block">
                      {prediction.average_daily_consumption !== null ? prediction.average_daily_consumption : '—'}{' '}
                      <span className="text-xs font-medium text-slate-500">
                        {prediction.average_daily_consumption !== null ? `${prediction.stock_unit}/day` : ''}
                      </span>
                    </span>
                  </div>

                  <div className="p-3 rounded-xl bg-slate-50 border border-slate-200/80">
                    <span className="text-[11px] font-medium text-slate-500 block">Days Remaining</span>
                    <span className="text-base font-extrabold text-slate-900 mt-0.5 block">
                      {prediction.estimated_days_remaining !== null ? `${prediction.estimated_days_remaining}d` : '—'}
                    </span>
                  </div>

                  <div className="p-3 rounded-xl bg-slate-50 border border-slate-200/80">
                    <span className="text-[11px] font-medium text-slate-500 block">Refill Date</span>
                    <span className="text-xs font-bold text-slate-800 mt-1 block truncate">
                      {formatDate(prediction.recommended_refill_date)}
                    </span>
                  </div>
                </div>

                {/* Depletion & Reorder Timeline */}
                <div className="p-3.5 rounded-xl bg-slate-50/80 border border-slate-200/80 space-y-2 text-xs">
                  <div className="flex items-center justify-between">
                    <span className="text-slate-500 flex items-center space-x-1.5">
                      <Calendar className="w-3.5 h-3.5 text-slate-400" />
                      <span>Estimated Depletion:</span>
                    </span>
                    <strong className="text-slate-900 font-semibold">
                      {formatDate(prediction.estimated_depletion_date)}
                    </strong>
                  </div>

                  <div className="flex items-center justify-between pt-1 border-t border-slate-200/60">
                    <span className="text-slate-500 flex items-center space-x-1.5">
                      <Clock className="w-3.5 h-3.5 text-teal-600" />
                      <span>Recommended Refill:</span>
                    </span>
                    <strong className="text-teal-800 font-bold bg-teal-50 px-2 py-0.5 rounded-md border border-teal-200/80">
                      {formatDate(prediction.recommended_refill_date)}
                    </strong>
                  </div>
                </div>

                {/* Natural Language Explanation */}
                <div className="p-3.5 rounded-xl bg-slate-50 border border-slate-200/80">
                  <span className="text-[11px] font-bold text-slate-700 block mb-1">
                    Analysis Summary:
                  </span>
                  <p className="text-xs text-slate-600 leading-relaxed font-medium">
                    {prediction.explanation}
                  </p>
                </div>

                {/* Medical Disclaimer */}
                <div className="p-2.5 rounded-lg bg-amber-50/60 border border-amber-200/70 text-[11px] text-amber-800/90 leading-relaxed italic">
                  {prediction.disclaimer || 'Refill estimates are based on recorded medication usage and are for planning purposes only.'}
                </div>
              </>
            ) : null}
          </div>

          {/* Modal Footer */}
          <div className="px-6 py-3.5 border-t border-slate-100 bg-slate-50/60 flex items-center justify-between flex-wrap gap-2">
            <div className="flex items-center space-x-2">
              {isInsufficient && onOpenScheduleModal && (
                <button
                  onClick={() => {
                    onClose()
                    onOpenScheduleModal(medicine)
                  }}
                  className="inline-flex items-center space-x-1.5 px-3 py-2 rounded-xl text-xs font-semibold text-teal-800 bg-teal-50 hover:bg-teal-100 border border-teal-200 shadow-xs transition-colors cursor-pointer"
                >
                  <Clock className="w-3.5 h-3.5 text-teal-600" />
                  <span>Set Schedule</span>
                </button>
              )}

              <button
                onClick={() => {
                  onClose()
                  onOpenStockModal?.(medicine)
                }}
                className="inline-flex items-center space-x-1.5 px-3 py-2 rounded-xl text-xs font-semibold text-slate-700 bg-white hover:bg-slate-50 border border-slate-200 shadow-xs transition-colors cursor-pointer"
              >
                <Plus className="w-3.5 h-3.5" />
                <span>Add Stock</span>
              </button>
            </div>

            <button
              onClick={onClose}
              className="px-4 py-2 rounded-xl text-xs font-semibold text-slate-600 bg-white hover:bg-slate-100 border border-slate-200 shadow-xs transition-colors cursor-pointer ml-auto"
            >
              Close
            </button>
          </div>
        </div>
      </div>
    </div>
  )
}

export default RefillPredictionModal
