import React, { useState, useEffect } from 'react'
import {
  X,
  Boxes,
  Plus,
  Edit3,
  AlertCircle,
  Loader2,
  Check,
  TrendingDown,
  AlertTriangle,
  CheckCircle2,
} from 'lucide-react'
import { medicineService } from '../../services/medicineService'

export const StockManageModal = ({
  isOpen,
  onClose,
  medicine,
  onStockUpdated,
}) => {
  const [activeTab, setActiveTab] = useState('ADD') // 'ADD' | 'SET'
  const [addAmount, setAddAmount] = useState('')
  const [currentQty, setCurrentQty] = useState('')
  const [quantityPerDose, setQuantityPerDose] = useState('')
  const [stockUnit, setStockUnit] = useState('')
  const [lowStockThreshold, setLowStockThreshold] = useState('')
  const [isLoading, setIsLoading] = useState(false)
  const [error, setError] = useState(null)
  const [fieldErrors, setFieldErrors] = useState({})

  useEffect(() => {
    if (isOpen && medicine) {
      setCurrentQty(
        medicine.current_quantity !== undefined && medicine.current_quantity !== null
          ? String(medicine.current_quantity)
          : '0'
      )
      setQuantityPerDose(
        medicine.quantity_per_dose !== undefined && medicine.quantity_per_dose !== null
          ? String(medicine.quantity_per_dose)
          : '1'
      )
      setStockUnit(medicine.stock_unit || medicine.dosage_unit || 'tablet')
      setLowStockThreshold(
        medicine.low_stock_threshold !== undefined && medicine.low_stock_threshold !== null
          ? String(medicine.low_stock_threshold)
          : '5'
      )
      setAddAmount('')
      setError(null)
      setFieldErrors({})
      setActiveTab('ADD')
    }
  }, [isOpen, medicine])

  if (!isOpen || !medicine) return null

  const unit = stockUnit || medicine.stock_unit || medicine.dosage_unit || 'units'
  const currentNum = parseFloat(medicine.current_quantity ?? 0)

  // Calculate projected new stock
  const calculateProjectedStock = () => {
    if (activeTab === 'ADD') {
      const addNum = parseFloat(addAmount)
      if (isNaN(addNum) || addNum <= 0) return currentNum
      return currentNum + addNum
    } else {
      const setNum = parseFloat(currentQty)
      if (isNaN(setNum) || setNum < 0) return currentNum
      return setNum
    }
  }

  const projectedStock = calculateProjectedStock()
  const thresh = parseFloat(lowStockThreshold) || 5

  const getStatus = (qty) => {
    if (qty <= 0) return { label: 'Out of Stock', color: 'text-rose-700 bg-rose-50 border-rose-200' }
    if (qty <= thresh) return { label: 'Low Stock', color: 'text-amber-700 bg-amber-50 border-amber-200' }
    return { label: 'Available', color: 'text-emerald-700 bg-emerald-50 border-emerald-200' }
  }

  const projectedStatus = getStatus(projectedStock)

  const validate = () => {
    const errs = {}
    if (activeTab === 'ADD') {
      const addNum = parseFloat(addAmount)
      if (!addAmount || isNaN(addNum)) {
        errs.addAmount = 'Quantity to add is required'
      } else if (addNum <= 0) {
        errs.addAmount = 'Quantity must be greater than zero'
      }
    } else {
      const curNum = parseFloat(currentQty)
      if (currentQty === '' || isNaN(curNum)) {
        errs.currentQty = 'Current quantity is required'
      } else if (curNum < 0) {
        errs.currentQty = 'Current quantity cannot be negative'
      }

      const qpdNum = parseFloat(quantityPerDose)
      if (!quantityPerDose || isNaN(qpdNum)) {
        errs.quantityPerDose = 'Quantity per dose is required'
      } else if (qpdNum <= 0) {
        errs.quantityPerDose = 'Quantity per dose must be greater than zero'
      }

      const threshNum = parseFloat(lowStockThreshold)
      if (lowStockThreshold !== '' && (isNaN(threshNum) || threshNum < 0)) {
        errs.lowStockThreshold = 'Low stock threshold cannot be negative'
      }
    }
    setFieldErrors(errs)
    return Object.keys(errs).length === 0
  }

  const handleSubmit = async (e) => {
    e.preventDefault()
    if (!validate()) return

    setIsLoading(true)
    setError(null)
    try {
      if (activeTab === 'ADD') {
        const res = await medicineService.addStock(medicine.id, parseFloat(addAmount))
        onStockUpdated({
          ...medicine,
          current_quantity: res.current_quantity,
          stock_status: res.stock_status,
          stock_unit: res.stock_unit,
        })
      } else {
        const payload = {
          current_quantity: parseFloat(currentQty),
          quantity_per_dose: parseFloat(quantityPerDose),
          stock_unit: stockUnit.trim() || undefined,
          low_stock_threshold: lowStockThreshold !== '' ? parseFloat(lowStockThreshold) : undefined,
        }
        const res = await medicineService.updateStock(medicine.id, payload)
        onStockUpdated({
          ...medicine,
          current_quantity: res.current_quantity,
          quantity_per_dose: res.quantity_per_dose,
          stock_unit: res.stock_unit,
          low_stock_threshold: res.low_stock_threshold,
          stock_status: res.stock_status,
        })
      }
      onClose()
    } catch (err) {
      setError(
        err.response?.data?.detail || 'Failed to update stock. Please try again.'
      )
    } finally {
      setIsLoading(false)
    }
  }

  return (
    <div className="fixed inset-0 z-50 overflow-y-auto">
      {/* Backdrop */}
      <div
        className="fixed inset-0 bg-slate-900/40 backdrop-blur-xs transition-opacity"
        onClick={!isLoading ? onClose : undefined}
      />

      <div className="min-h-full flex items-center justify-center p-4 sm:p-6 text-center">
        <div
          className="relative w-full max-w-md bg-white border border-slate-200 rounded-2xl text-left shadow-2xl overflow-hidden transform transition-all animate-in fade-in zoom-in-95 duration-150"
          onClick={(e) => e.stopPropagation()}
        >
          {/* Header */}
          <div className="flex items-center justify-between px-6 py-4 border-b border-slate-100 bg-slate-50/60">
            <div className="flex items-center space-x-3">
              <div className="w-9 h-9 rounded-xl bg-teal-50 border border-teal-200 text-teal-700 flex items-center justify-center">
                <Boxes className="w-5 h-5" />
              </div>
              <div>
                <h2 className="text-base font-bold text-slate-900 tracking-tight">
                  Manage Inventory & Stock
                </h2>
                <p className="text-xs text-slate-500 font-medium truncate max-w-[220px]">
                  {medicine.name}
                </p>
              </div>
            </div>

            <button
              onClick={onClose}
              disabled={isLoading}
              className="p-1.5 text-slate-400 hover:text-slate-700 rounded-lg hover:bg-slate-100 transition-colors disabled:opacity-50 cursor-pointer"
            >
              <X className="w-5 h-5" />
            </button>
          </div>

          {/* Current Stock Banner */}
          <div className="px-6 pt-4 pb-2">
            <div className="p-3.5 rounded-xl bg-slate-50 border border-slate-200 flex items-center justify-between">
              <div>
                <span className="text-[11px] font-medium text-slate-500 uppercase tracking-wider block">
                  Current Balance
                </span>
                <span className="text-lg font-extrabold text-slate-900">
                  {currentNum} <span className="text-xs font-semibold text-slate-600">{unit}</span>
                </span>
              </div>
              <div className="text-right">
                <span className="text-[11px] font-medium text-slate-500 block">Dose Deduction</span>
                <span className="text-xs font-bold text-teal-800 bg-teal-50 border border-teal-200 px-2 py-0.5 rounded-md inline-block">
                  {medicine.quantity_per_dose ?? 1} {unit} / dose
                </span>
              </div>
            </div>
          </div>

          {/* Tab Selector */}
          <div className="px-6 pt-2">
            <div className="flex p-1 bg-slate-100 rounded-xl border border-slate-200/80">
              <button
                type="button"
                onClick={() => {
                  setActiveTab('ADD')
                  setFieldErrors({})
                  setError(null)
                }}
                className={`flex-1 py-1.5 text-xs font-bold rounded-lg transition-all cursor-pointer flex items-center justify-center space-x-1.5 ${
                  activeTab === 'ADD'
                    ? 'bg-white text-teal-800 shadow-xs border border-slate-200'
                    : 'text-slate-600 hover:text-slate-900'
                }`}
              >
                <Plus className="w-3.5 h-3.5" />
                <span>Add Stock (Refill)</span>
              </button>
              <button
                type="button"
                onClick={() => {
                  setActiveTab('SET')
                  setFieldErrors({})
                  setError(null)
                }}
                className={`flex-1 py-1.5 text-xs font-bold rounded-lg transition-all cursor-pointer flex items-center justify-center space-x-1.5 ${
                  activeTab === 'SET'
                    ? 'bg-white text-teal-800 shadow-xs border border-slate-200'
                    : 'text-slate-600 hover:text-slate-900'
                }`}
              >
                <Edit3 className="w-3.5 h-3.5" />
                <span>Update / Adjust</span>
              </button>
            </div>
          </div>

          {/* Form */}
          <form onSubmit={handleSubmit} className="p-6 space-y-4 pt-4">
            {error && (
              <div className="flex items-start space-x-2.5 p-3 rounded-xl bg-rose-50 border border-rose-200 text-rose-700 text-xs font-medium">
                <AlertCircle className="w-4 h-4 shrink-0 mt-0.5" />
                <span>{error}</span>
              </div>
            )}

            {activeTab === 'ADD' ? (
              /* ADD STOCK TAB */
              <div className="space-y-3.5">
                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1.5">
                    Quantity to Add ({unit}) <span className="text-teal-600">*</span>
                  </label>
                  <input
                    type="number"
                    value={addAmount}
                    onChange={(e) => setAddAmount(e.target.value)}
                    placeholder="e.g. 30"
                    step="any"
                    min="0.01"
                    className={`w-full px-3.5 py-2.5 rounded-xl bg-white border ${
                      fieldErrors.addAmount ? 'border-rose-400' : 'border-slate-200 focus:border-teal-500 focus:ring-teal-500/10'
                    } text-sm text-slate-900 placeholder-slate-400 focus:outline-none focus:ring-4 transition-all`}
                    disabled={isLoading}
                    autoFocus
                  />
                  {fieldErrors.addAmount && (
                    <p className="text-[11px] text-rose-600 mt-1 font-medium">{fieldErrors.addAmount}</p>
                  )}
                </div>

                {/* Quick Add Presets */}
                <div className="flex items-center space-x-2">
                  <span className="text-[10px] text-slate-400 font-medium">Quick add:</span>
                  {[10, 20, 30, 60, 100].map((amt) => (
                    <button
                      key={amt}
                      type="button"
                      onClick={() => setAddAmount(String(amt))}
                      className="px-2 py-0.5 rounded-md border border-slate-200 bg-slate-50 text-[10px] font-semibold text-slate-700 hover:bg-teal-50 hover:text-teal-800 hover:border-teal-200 transition-colors cursor-pointer"
                    >
                      +{amt}
                    </button>
                  ))}
                </div>
              </div>
            ) : (
              /* SET / UPDATE STOCK TAB */
              <div className="space-y-3.5">
                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1.5">
                    Current Stock Quantity <span className="text-teal-600">*</span>
                  </label>
                  <input
                    type="number"
                    value={currentQty}
                    onChange={(e) => setCurrentQty(e.target.value)}
                    placeholder="e.g. 50"
                    step="any"
                    min="0"
                    className={`w-full px-3.5 py-2.5 rounded-xl bg-white border ${
                      fieldErrors.currentQty ? 'border-rose-400' : 'border-slate-200 focus:border-teal-500 focus:ring-teal-500/10'
                    } text-sm text-slate-900 placeholder-slate-400 focus:outline-none focus:ring-4 transition-all`}
                    disabled={isLoading}
                  />
                  {fieldErrors.currentQty && (
                    <p className="text-[11px] text-rose-600 mt-1 font-medium">{fieldErrors.currentQty}</p>
                  )}
                </div>

                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="block text-xs font-bold text-slate-700 mb-1.5">
                      Quantity per Dose <span className="text-teal-600">*</span>
                    </label>
                    <input
                      type="number"
                      value={quantityPerDose}
                      onChange={(e) => setQuantityPerDose(e.target.value)}
                      step="any"
                      min="0.01"
                      className={`w-full px-3.5 py-2.5 rounded-xl bg-white border ${
                        fieldErrors.quantityPerDose ? 'border-rose-400' : 'border-slate-200 focus:border-teal-500 focus:ring-teal-500/10'
                      } text-sm text-slate-900 placeholder-slate-400 focus:outline-none focus:ring-4 transition-all`}
                      disabled={isLoading}
                    />
                    {fieldErrors.quantityPerDose && (
                      <p className="text-[11px] text-rose-600 mt-1 font-medium">{fieldErrors.quantityPerDose}</p>
                    )}
                  </div>

                  <div>
                    <label className="block text-xs font-bold text-slate-700 mb-1.5">
                      Stock Unit
                    </label>
                    <input
                      type="text"
                      value={stockUnit}
                      onChange={(e) => setStockUnit(e.target.value)}
                      placeholder="tablet, ml, etc."
                      maxLength={30}
                      className="w-full px-3.5 py-2.5 rounded-xl bg-white border border-slate-200 focus:border-teal-500 focus:ring-teal-500/10 text-sm text-slate-900 placeholder-slate-400 focus:outline-none focus:ring-4 transition-all"
                      disabled={isLoading}
                    />
                  </div>
                </div>

                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1.5">
                    Low Stock Threshold <span className="text-slate-400 text-[10px] font-normal">(Alert level)</span>
                  </label>
                  <input
                    type="number"
                    value={lowStockThreshold}
                    onChange={(e) => setLowStockThreshold(e.target.value)}
                    step="any"
                    min="0"
                    placeholder="e.g. 5"
                    className="w-full px-3.5 py-2.5 rounded-xl bg-white border border-slate-200 focus:border-teal-500 focus:ring-teal-500/10 text-sm text-slate-900 placeholder-slate-400 focus:outline-none focus:ring-4 transition-all"
                    disabled={isLoading}
                  />
                  {fieldErrors.lowStockThreshold && (
                    <p className="text-[11px] text-rose-600 mt-1 font-medium">{fieldErrors.lowStockThreshold}</p>
                  )}
                </div>
              </div>
            )}

            {/* Projected Stock Preview */}
            <div className="p-3 rounded-xl bg-teal-50/60 border border-teal-100 flex items-center justify-between text-xs">
              <span className="text-slate-600 font-medium flex items-center space-x-1.5">
                <span>Resulting Balance:</span>
                <strong className="text-slate-900 font-bold">{projectedStock} {unit}</strong>
              </span>
              <span className={`px-2 py-0.5 rounded-full text-[10px] font-bold border ${projectedStatus.color}`}>
                {projectedStatus.label}
              </span>
            </div>

            {/* Modal Actions */}
            <div className="pt-3 border-t border-slate-100 flex items-center justify-end space-x-3">
              <button
                type="button"
                onClick={onClose}
                disabled={isLoading}
                className="px-4 py-2 rounded-xl text-xs font-semibold text-slate-600 bg-slate-100 hover:bg-slate-200 border border-slate-200 transition-colors focus:outline-none cursor-pointer"
              >
                Cancel
              </button>

              <button
                type="submit"
                disabled={isLoading}
                className="inline-flex items-center space-x-2 px-5 py-2 rounded-xl text-xs font-semibold text-white bg-teal-600 hover:bg-teal-700 shadow-sm shadow-teal-600/20 transition-all focus:outline-none focus:ring-4 focus:ring-teal-500/20 disabled:opacity-60 cursor-pointer"
              >
                {isLoading ? (
                  <>
                    <Loader2 className="w-3.5 h-3.5 animate-spin" />
                    <span>Saving...</span>
                  </>
                ) : (
                  <>
                    <Check className="w-3.5 h-3.5 stroke-[2.4]" />
                    <span>{activeTab === 'ADD' ? 'Add to Stock' : 'Update Stock'}</span>
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
