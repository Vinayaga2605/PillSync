import React from 'react'
import {
  Pill,
  Calendar,
  FileText,
  Edit2,
  Trash2,
  Clock,
  Sparkles,
  Boxes,
  AlertTriangle,
  AlertOctagon,
} from 'lucide-react'

export const MedicineCard = ({
  medicine,
  onEdit,
  onDelete,
  onManageSchedule,
  onManageStock,
  onViewRefillPrediction,
}) => {
  const {
    name,
    generic_name,
    dosage_amount,
    dosage_unit,
    instructions,
    start_date,
    end_date,
    is_active,
    current_quantity,
    quantity_per_dose,
    stock_unit,
    stock_status,
  } = medicine

  // Format dates for display
  const formatDate = (dateStr) => {
    if (!dateStr) return null
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

  // Format dosage representation
  const formatDosage = (amount, unit) => {
    const num = parseFloat(amount)
    const formattedNum = isNaN(num) ? amount : (num % 1 === 0 ? num.toString() : num.toFixed(2))
    return `${formattedNum} ${unit || ''}`.trim()
  }

  const sUnit = stock_unit || dosage_unit || 'units'
  const curStock = parseFloat(current_quantity ?? 0)
  const qPerDose = parseFloat(quantity_per_dose ?? 1)

  // Status mapping
  const getStockBadge = () => {
    if (stock_status === 'OUT_OF_STOCK' || (curStock <= 0 && current_quantity !== undefined && current_quantity !== null)) {
      return {
        label: 'Out of Stock',
        badgeClass: 'bg-rose-50 text-rose-700 border-rose-200 shadow-xs',
        dotClass: 'bg-rose-500',
      }
    }
    if (stock_status === 'LOW') {
      return {
        label: 'Low Stock',
        badgeClass: 'bg-amber-50 text-amber-700 border-amber-200 shadow-xs',
        dotClass: 'bg-amber-500',
      }
    }
    return {
      label: 'Available',
      badgeClass: 'bg-emerald-50 text-emerald-700 border-emerald-200/80 shadow-xs',
      dotClass: 'bg-emerald-500',
    }
  }

  const stockBadge = getStockBadge()

  return (
    <div
      className={`group relative flex flex-col justify-between rounded-2xl border overflow-hidden transition-all duration-200 ${
        is_active
          ? 'bg-white border-slate-200/80 hover:border-teal-300 hover:shadow-md'
          : 'bg-white/80 border-slate-200/60 opacity-85 hover:opacity-100 hover:border-slate-300'
      } p-5`}
    >
      <div>
        {/* Header: Name, Generic Name, Status Badge & Action Controls */}
        <div className="flex items-start justify-between gap-2.5 mb-3">
          <div className="flex items-start space-x-3 min-w-0 flex-1">
            <div
              className={`w-10 h-10 rounded-xl flex items-center justify-center shrink-0 ${
                is_active
                  ? 'bg-teal-50 text-teal-700 border border-teal-200/80'
                  : 'bg-slate-100 text-slate-500 border border-slate-200'
              }`}
            >
              <Pill className="w-5 h-5 stroke-[2.2]" />
            </div>

            <div className="min-w-0 flex-1">
              <h3 className="text-base font-bold text-slate-900 tracking-tight truncate group-hover:text-teal-700 transition-colors">
                {name}
              </h3>
              {generic_name ? (
                <p className="text-xs text-slate-500 truncate italic">
                  {generic_name}
                </p>
              ) : (
                <p className="text-xs text-slate-400">Prescription / OTC</p>
              )}
            </div>
          </div>

          {/* Top Right: Status Badge and Quick Edit / Delete */}
          <div className="flex items-center space-x-1.5 shrink-0">
            <span
              className={`inline-flex items-center space-x-1 px-2 py-0.5 rounded-full text-[10px] font-bold border ${
                is_active
                  ? 'bg-slate-50 text-slate-700 border-slate-200 shadow-xs'
                  : 'bg-slate-100 text-slate-500 border-slate-200'
              }`}
            >
              <span
                className={`w-1.5 h-1.5 rounded-full ${
                  is_active ? 'bg-teal-500' : 'bg-slate-400'
                }`}
              />
              <span>{is_active ? 'Active' : 'Inactive'}</span>
            </span>

            <button
              onClick={() => onEdit(medicine)}
              className="p-1.5 rounded-lg text-slate-400 hover:text-slate-700 hover:bg-slate-100 border border-transparent hover:border-slate-200 transition-colors cursor-pointer"
              title="Edit medication"
              aria-label="Edit medication"
            >
              <Edit2 className="w-3.5 h-3.5" />
            </button>

            <button
              onClick={() => onDelete(medicine)}
              className="p-1.5 rounded-lg text-slate-400 hover:text-rose-600 hover:bg-rose-50 border border-transparent hover:border-rose-200 transition-colors cursor-pointer"
              title="Delete medication"
              aria-label="Delete medication"
            >
              <Trash2 className="w-3.5 h-3.5" />
            </button>
          </div>
        </div>

        {/* Dosage & Administration Info */}
        <div className="mt-3 p-3 rounded-xl bg-slate-50 border border-slate-200/80 space-y-2">
          <div className="flex items-center justify-between text-xs">
            <span className="text-slate-500 flex items-center space-x-1.5 font-medium">
              <Sparkles className="w-3.5 h-3.5 text-teal-600" />
              <span>Dosage:</span>
            </span>
            <span className="font-bold text-teal-800 bg-teal-50 px-2 py-0.5 rounded-md border border-teal-200/80">
              {formatDosage(dosage_amount, dosage_unit)}
            </span>
          </div>

          {instructions && (
            <div className="text-xs flex items-start space-x-1.5 pt-1.5 border-t border-slate-200/60">
              <FileText className="w-3.5 h-3.5 text-slate-400 shrink-0 mt-0.5" />
              <p className="text-slate-600 line-clamp-2 leading-relaxed font-medium">
                {instructions}
              </p>
            </div>
          )}
        </div>

        {/* Stock & Inventory Status Section */}
        <div className="mt-3 p-3 rounded-xl bg-slate-50/80 border border-slate-200/80 space-y-2">
          <div className="flex items-center justify-between text-xs">
            <span className="text-slate-600 font-semibold flex items-center space-x-1.5">
              <Boxes className="w-3.5 h-3.5 text-slate-500" />
              <span>Current Stock:</span>
            </span>
            <div className="flex items-center space-x-2">
              <span className="font-extrabold text-slate-900">
                {curStock} <span className="font-medium text-[11px] text-slate-500">{sUnit}</span>
              </span>
              <span className={`inline-flex items-center space-x-1 px-2 py-0.5 rounded-full text-[10px] font-bold border ${stockBadge.badgeClass}`}>
                <span className={`w-1 h-1 rounded-full ${stockBadge.dotClass}`} />
                <span>{stockBadge.label}</span>
              </span>
            </div>
          </div>

          <div className="flex items-center justify-between text-[11px] text-slate-500 pt-1 border-t border-slate-200/50">
            <span>Dose consumption:</span>
            <span className="font-semibold text-slate-700">{qPerDose} {sUnit} / dose</span>
          </div>
        </div>

        {/* Low / Out of Stock Alert Warnings */}
        {stock_status === 'LOW' && (
          <div className="mt-2.5 flex items-center space-x-2 px-3 py-1.5 rounded-xl bg-amber-50/90 border border-amber-200 text-amber-800 text-xs font-medium animate-in fade-in duration-150">
            <AlertTriangle className="w-3.5 h-3.5 text-amber-600 shrink-0" />
            <span>Low stock: {curStock} {sUnit} remaining</span>
          </div>
        )}

        {(stock_status === 'OUT_OF_STOCK' || (curStock <= 0 && current_quantity !== undefined && current_quantity !== null)) && (
          <div className="mt-2.5 flex items-center space-x-2 px-3 py-1.5 rounded-xl bg-rose-50/90 border border-rose-200 text-rose-800 text-xs font-medium animate-in fade-in duration-150">
            <AlertOctagon className="w-3.5 h-3.5 text-rose-600 shrink-0" />
            <span>Out of stock: 0 {sUnit} remaining</span>
          </div>
        )}

        {/* Dates / Duration */}
        <div className="mt-3 flex flex-wrap items-center gap-y-1 gap-x-3 text-xs text-slate-500">
          <div className="flex items-center space-x-1.5">
            <Calendar className="w-3.5 h-3.5 text-slate-400" />
            <span>Started: <strong className="text-slate-700 font-semibold">{formatDate(start_date) || 'Today'}</strong></span>
          </div>

          {end_date ? (
            <div className="flex items-center space-x-1.5">
              <Clock className="w-3.5 h-3.5 text-slate-400" />
              <span>Ends: <strong className="text-slate-700 font-semibold">{formatDate(end_date)}</strong></span>
            </div>
          ) : (
            <div className="flex items-center space-x-1.5 text-slate-400">
              <span>• Ongoing</span>
            </div>
          )}
        </div>
      </div>

      {/* Action Footer: Perfectly balanced 3-button toolbar that never overflows */}
      <div className="mt-4 pt-3 border-t border-slate-100 grid grid-cols-3 gap-2">
        <button
          onClick={() => onViewRefillPrediction?.(medicine)}
          className="inline-flex items-center justify-center space-x-1 px-2 py-1.5 rounded-xl text-xs font-semibold text-teal-800 bg-teal-50 hover:bg-teal-100/80 border border-teal-200/80 shadow-xs transition-all cursor-pointer focus:outline-none focus:ring-2 focus:ring-teal-500/20 truncate"
          title="View AI refill forecast"
        >
          <Sparkles className="w-3.5 h-3.5 text-teal-600 shrink-0" />
          <span className="truncate">Refill AI</span>
        </button>

        <button
          onClick={() => onManageStock?.(medicine)}
          className="inline-flex items-center justify-center space-x-1 px-2 py-1.5 rounded-xl text-xs font-semibold text-slate-700 bg-white hover:bg-slate-50 border border-slate-200 shadow-xs transition-all cursor-pointer focus:outline-none focus:ring-2 focus:ring-teal-500/20 truncate"
          title="Update or add stock"
        >
          <Boxes className="w-3.5 h-3.5 text-slate-500 shrink-0" />
          <span className="truncate">Stock</span>
        </button>

        <button
          onClick={() => onManageSchedule?.(medicine)}
          className="inline-flex items-center justify-center space-x-1 px-2 py-1.5 rounded-xl text-xs font-semibold text-slate-700 bg-white hover:bg-slate-50 border border-slate-200 shadow-xs transition-all cursor-pointer focus:outline-none focus:ring-2 focus:ring-slate-300 truncate"
          title="Manage dosing schedules"
        >
          <Clock className="w-3.5 h-3.5 text-slate-500 shrink-0" />
          <span className="truncate">Schedules</span>
        </button>
      </div>
    </div>
  )
}

export default MedicineCard
