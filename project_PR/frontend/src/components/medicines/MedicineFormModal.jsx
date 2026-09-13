import React, { useState, useEffect } from 'react'
import {
  X,
  Pill,
  AlertCircle,
  Loader2,
  Check,
  Boxes,
} from 'lucide-react'

const COMMON_DOSAGE_UNITS = [
  'tablet',
  'capsule',
  'mg',
  'ml',
  'mcg',
  'g',
  'puff',
  'drops',
  'sachet',
  'patch',
]

export const MedicineFormModal = ({
  isOpen,
  onClose,
  onSubmit,
  initialData = null,
  isLoading = false,
}) => {
  const isEditMode = !!initialData

  const getTodayString = () => {
    const today = new Date()
    return today.toISOString().split('T')[0]
  }

  const [formData, setFormData] = useState({
    name: '',
    generic_name: '',
    dosage_amount: '1',
    dosage_unit: 'tablet',
    instructions: '',
    start_date: getTodayString(),
    end_date: '',
    is_active: true,
    initial_quantity: '60',
    current_quantity: '60',
    quantity_per_dose: '1',
    stock_unit: 'tablet',
    low_stock_threshold: '5',
  })

  const [errors, setErrors] = useState({})
  const [serverError, setServerError] = useState(null)

  // Sync initialData when editing or reset when adding
  useEffect(() => {
    if (isOpen) {
      if (initialData) {
        setFormData({
          name: initialData.name || '',
          generic_name: initialData.generic_name || '',
          dosage_amount: initialData.dosage_amount !== undefined ? String(initialData.dosage_amount) : '1',
          dosage_unit: initialData.dosage_unit || 'tablet',
          instructions: initialData.instructions || '',
          start_date: initialData.start_date || getTodayString(),
          end_date: initialData.end_date || '',
          is_active: initialData.is_active !== undefined ? initialData.is_active : true,
          initial_quantity: initialData.initial_quantity !== undefined && initialData.initial_quantity !== null ? String(initialData.initial_quantity) : '0',
          current_quantity: initialData.current_quantity !== undefined && initialData.current_quantity !== null ? String(initialData.current_quantity) : '0',
          quantity_per_dose: initialData.quantity_per_dose !== undefined && initialData.quantity_per_dose !== null ? String(initialData.quantity_per_dose) : '1',
          stock_unit: initialData.stock_unit || initialData.dosage_unit || 'tablet',
          low_stock_threshold: initialData.low_stock_threshold !== undefined && initialData.low_stock_threshold !== null ? String(initialData.low_stock_threshold) : '5',
        })
      } else {
        setFormData({
          name: '',
          generic_name: '',
          dosage_amount: '1',
          dosage_unit: 'tablet',
          instructions: '',
          start_date: getTodayString(),
          end_date: '',
          is_active: true,
          initial_quantity: '60',
          current_quantity: '60',
          quantity_per_dose: '1',
          stock_unit: 'tablet',
          low_stock_threshold: '5',
        })
      }
      setErrors({})
      setServerError(null)
    }
  }, [isOpen, initialData])

  if (!isOpen) return null

  const handleChange = (e) => {
    const { name, value, type, checked } = e.target
    setFormData((prev) => {
      const updated = {
        ...prev,
        [name]: type === 'checkbox' ? checked : value,
      }
      // If user updates dosage_unit on a new medicine and stock_unit was identical, sync stock_unit
      if (name === 'dosage_unit' && (!initialData || prev.stock_unit === prev.dosage_unit)) {
        updated.stock_unit = value
      }
      return updated
    })

    // Clear field-specific error upon modification
    if (errors[name]) {
      setErrors((prev) => ({ ...prev, [name]: null }))
    }
    if (serverError) setServerError(null)
  }

  const validate = () => {
    const newErrors = {}

    // Name validation
    const trimmedName = formData.name.trim()
    if (!trimmedName) {
      newErrors.name = 'Medicine name is required'
    } else if (trimmedName.length > 200) {
      newErrors.name = 'Medicine name cannot exceed 200 characters'
    }

    // Generic name validation
    if (formData.generic_name && formData.generic_name.trim().length > 200) {
      newErrors.generic_name = 'Generic name cannot exceed 200 characters'
    }

    // Dosage Amount validation
    const amountNum = parseFloat(formData.dosage_amount)
    if (!formData.dosage_amount || isNaN(amountNum)) {
      newErrors.dosage_amount = 'Dosage amount is required'
    } else if (amountNum <= 0) {
      newErrors.dosage_amount = 'Dosage amount must be greater than zero'
    }

    // Dosage Unit validation
    const trimmedUnit = formData.dosage_unit.trim()
    if (!trimmedUnit) {
      newErrors.dosage_unit = 'Dosage unit is required'
    } else if (trimmedUnit.length > 30) {
      newErrors.dosage_unit = 'Dosage unit cannot exceed 30 characters'
    }

    // Stock Validations
    if (formData.current_quantity !== '') {
      const curNum = parseFloat(formData.current_quantity)
      if (isNaN(curNum) || curNum < 0) {
        newErrors.current_quantity = 'Stock quantity cannot be negative'
      }
    }

    if (formData.quantity_per_dose !== '') {
      const qpdNum = parseFloat(formData.quantity_per_dose)
      if (isNaN(qpdNum) || qpdNum <= 0) {
        newErrors.quantity_per_dose = 'Quantity per dose must be greater than zero'
      }
    }

    // Instructions validation
    if (formData.instructions && formData.instructions.trim().length > 255) {
      newErrors.instructions = 'Instructions cannot exceed 255 characters'
    }

    // Date validation
    if (formData.start_date && formData.end_date) {
      if (formData.end_date < formData.start_date) {
        newErrors.end_date = 'End date cannot be earlier than start date'
      }
    }

    setErrors(newErrors)
    return Object.keys(newErrors).length === 0
  }

  const handleSubmit = async (e) => {
    e.preventDefault()
    if (!validate()) return

    try {
      const curQty = formData.current_quantity !== '' ? parseFloat(formData.current_quantity) : undefined
      const initQty = formData.initial_quantity !== '' ? parseFloat(formData.initial_quantity) : curQty
      const qpd = formData.quantity_per_dose !== '' ? parseFloat(formData.quantity_per_dose) : undefined
      const thresh = formData.low_stock_threshold !== '' ? parseFloat(formData.low_stock_threshold) : undefined

      const payload = {
        name: formData.name.trim(),
        generic_name: formData.generic_name?.trim() || null,
        dosage_amount: parseFloat(formData.dosage_amount),
        dosage_unit: formData.dosage_unit.trim(),
        instructions: formData.instructions?.trim() || null,
        start_date: formData.start_date || null,
        end_date: formData.end_date || null,
        is_active: formData.is_active,
        initial_quantity: initQty,
        current_quantity: curQty,
        quantity_per_dose: qpd,
        stock_unit: formData.stock_unit?.trim() || formData.dosage_unit.trim(),
        low_stock_threshold: thresh,
      }

      await onSubmit(payload)
    } catch (err) {
      if (err.response?.status === 422) {
        const detail = err.response.data?.detail
        if (Array.isArray(detail)) {
          const fieldErrs = {}
          detail.forEach((item) => {
            const field = item.loc?.[item.loc.length - 1]
            if (field) fieldErrs[field] = item.msg
          })
          setErrors(fieldErrs)
        } else if (typeof detail === 'string') {
          setServerError(detail)
        } else {
          setServerError('Invalid data submitted. Please review the form fields.')
        }
      } else if (err.response?.status === 403) {
        setServerError('Permission denied. Only patients can manage medications.')
      } else if (err.response?.status === 404) {
        setServerError('Medicine record not found.')
      } else {
        setServerError('Failed to save medicine record. Please try again.')
      }
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
        {/* Modal Box */}
        <div
          className="relative w-full max-w-lg bg-white border border-slate-200 rounded-2xl text-left shadow-2xl overflow-hidden transform transition-all animate-in fade-in zoom-in-95 duration-150"
          onClick={(e) => e.stopPropagation()}
        >
          {/* Modal Header */}
          <div className="flex items-center justify-between px-6 py-4 border-b border-slate-100 bg-slate-50/60">
            <div className="flex items-center space-x-3">
              <div className="w-9 h-9 rounded-xl bg-teal-50 border border-teal-200 text-teal-700 flex items-center justify-center">
                <Pill className="w-5 h-5" />
              </div>
              <div>
                <h2 className="text-lg font-bold text-slate-900 tracking-tight">
                  {isEditMode ? 'Edit Medicine' : 'Add New Medicine'}
                </h2>
                <p className="text-xs text-slate-500">
                  {isEditMode
                    ? 'Update your medication details, dosage, and stock'
                    : 'Enter medication details to track your prescriptions and stock'}
                </p>
              </div>
            </div>

            <button
              onClick={onClose}
              disabled={isLoading}
              className="p-1.5 text-slate-400 hover:text-slate-700 rounded-lg hover:bg-slate-100 transition-colors disabled:opacity-50 cursor-pointer"
              aria-label="Close modal"
            >
              <X className="w-5 h-5" />
            </button>
          </div>

          {/* Form Content */}
          <form onSubmit={handleSubmit} className="p-6 space-y-4">
            {/* Top Server Error Alert */}
            {serverError && (
              <div className="flex items-start space-x-3 p-3.5 rounded-xl bg-rose-50 border border-rose-200 text-rose-700 text-xs">
                <AlertCircle className="w-4 h-4 shrink-0 mt-0.5" />
                <div className="flex-1 font-medium">{serverError}</div>
              </div>
            )}

            {/* Medicine Name (Required) */}
            <div>
              <label htmlFor="medicine_name" className="block text-xs font-bold text-slate-700 mb-1.5">
                Medicine / Brand Name <span className="text-teal-600">*</span>
              </label>
              <input
                id="medicine_name"
                type="text"
                name="name"
                value={formData.name}
                onChange={handleChange}
                placeholder="e.g. Metformin HCL, Lipitor, Lisinopril"
                maxLength={200}
                className={`w-full px-3.5 py-2.5 rounded-xl bg-white border ${
                  errors.name ? 'border-rose-400 focus:ring-rose-500/20' : 'border-slate-200 focus:border-teal-500 focus:ring-teal-500/10'
                } text-sm text-slate-900 placeholder-slate-400 focus:outline-none focus:ring-4 transition-all`}
                disabled={isLoading}
              />
              {errors.name && (
                <p className="text-[11px] text-rose-600 mt-1 flex items-center space-x-1 font-medium">
                  <AlertCircle className="w-3 h-3 shrink-0" />
                  <span>{errors.name}</span>
                </p>
              )}
            </div>

            {/* Generic Name (Optional) */}
            <div>
              <label htmlFor="generic_name" className="block text-xs font-bold text-slate-700 mb-1.5">
                Generic Name / Active Ingredient <span className="text-slate-400 text-[10px] font-normal">(Optional)</span>
              </label>
              <input
                id="generic_name"
                type="text"
                name="generic_name"
                value={formData.generic_name}
                onChange={handleChange}
                placeholder="e.g. Metformin Hydrochloride, Atorvastatin"
                maxLength={200}
                className={`w-full px-3.5 py-2.5 rounded-xl bg-white border ${
                  errors.generic_name ? 'border-rose-400' : 'border-slate-200 focus:border-teal-500 focus:ring-teal-500/10'
                } text-sm text-slate-900 placeholder-slate-400 focus:outline-none focus:ring-4 transition-all`}
                disabled={isLoading}
              />
              {errors.generic_name && (
                <p className="text-[11px] text-rose-600 mt-1 font-medium">{errors.generic_name}</p>
              )}
            </div>

            {/* Dosage Row: Amount & Unit */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3.5">
              <div>
                <label htmlFor="dosage_amount" className="block text-xs font-bold text-slate-700 mb-1.5">
                  Dosage Amount <span className="text-teal-600">*</span>
                </label>
                <input
                  id="dosage_amount"
                  type="number"
                  name="dosage_amount"
                  value={formData.dosage_amount}
                  onChange={handleChange}
                  step="any"
                  min="0.01"
                  placeholder="e.g. 500 or 1"
                  className={`w-full px-3.5 py-2.5 rounded-xl bg-white border ${
                    errors.dosage_amount ? 'border-rose-400' : 'border-slate-200 focus:border-teal-500 focus:ring-teal-500/10'
                  } text-sm text-slate-900 placeholder-slate-400 focus:outline-none focus:ring-4 transition-all`}
                  disabled={isLoading}
                />
                {errors.dosage_amount && (
                  <p className="text-[11px] text-rose-600 mt-1 font-medium">{errors.dosage_amount}</p>
                )}
              </div>

              <div>
                <label htmlFor="dosage_unit" className="block text-xs font-bold text-slate-700 mb-1.5">
                  Unit <span className="text-teal-600">*</span>
                </label>
                <input
                  id="dosage_unit"
                  type="text"
                  name="dosage_unit"
                  value={formData.dosage_unit}
                  onChange={handleChange}
                  placeholder="e.g. tablet, mg, ml"
                  maxLength={30}
                  className={`w-full px-3.5 py-2.5 rounded-xl bg-white border ${
                    errors.dosage_unit ? 'border-rose-400' : 'border-slate-200 focus:border-teal-500 focus:ring-teal-500/10'
                  } text-sm text-slate-900 placeholder-slate-400 focus:outline-none focus:ring-4 transition-all`}
                  disabled={isLoading}
                />
                {errors.dosage_unit && (
                  <p className="text-[11px] text-rose-600 mt-1 font-medium">{errors.dosage_unit}</p>
                )}
              </div>
            </div>

            {/* Quick unit suggestion chips */}
            <div className="flex flex-wrap items-center gap-1.5 pt-0.5">
              <span className="text-[10px] text-slate-400 mr-1 font-medium">Suggestions:</span>
              {COMMON_DOSAGE_UNITS.map((unit) => (
                <button
                  key={unit}
                  type="button"
                  onClick={() => {
                    setFormData((prev) => ({
                      ...prev,
                      dosage_unit: unit,
                      stock_unit: prev.stock_unit === prev.dosage_unit ? unit : prev.stock_unit,
                    }))
                    if (errors.dosage_unit) {
                      setErrors((prev) => ({ ...prev, dosage_unit: null }))
                    }
                  }}
                  className={`text-[10px] px-2 py-0.5 rounded-md border font-medium transition-colors cursor-pointer ${
                    formData.dosage_unit === unit
                      ? 'bg-teal-50 text-teal-800 border-teal-300 font-semibold'
                      : 'bg-slate-100 text-slate-600 border-slate-200 hover:text-slate-900 hover:bg-slate-200'
                  }`}
                >
                  {unit}
                </button>
              ))}
            </div>

            {/* Feature 18: Stock & Inventory Management Fields */}
            <div className="p-3.5 rounded-2xl bg-slate-50 border border-slate-200 space-y-3">
              <div className="flex items-center space-x-2 text-xs font-bold text-slate-800">
                <Boxes className="w-4 h-4 text-teal-600" />
                <span>Stock & Inventory Settings</span>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                <div>
                  <label htmlFor="current_quantity" className="block text-[11px] font-bold text-slate-700 mb-1">
                    Initial / Current Stock
                  </label>
                  <input
                    id="current_quantity"
                    type="number"
                    name="current_quantity"
                    value={formData.current_quantity}
                    onChange={handleChange}
                    step="any"
                    min="0"
                    placeholder="e.g. 60"
                    className={`w-full px-3 py-2 rounded-xl bg-white border ${
                      errors.current_quantity ? 'border-rose-400' : 'border-slate-200 focus:border-teal-500'
                    } text-xs text-slate-900 focus:outline-none focus:ring-2 focus:ring-teal-500/10`}
                    disabled={isLoading}
                  />
                  {errors.current_quantity && (
                    <p className="text-[10px] text-rose-600 mt-1 font-medium">{errors.current_quantity}</p>
                  )}
                </div>

                <div>
                  <label htmlFor="quantity_per_dose" className="block text-[11px] font-bold text-slate-700 mb-1">
                    Qty Consumed / Dose
                  </label>
                  <input
                    id="quantity_per_dose"
                    type="number"
                    name="quantity_per_dose"
                    value={formData.quantity_per_dose}
                    onChange={handleChange}
                    step="any"
                    min="0.01"
                    placeholder="e.g. 1"
                    className={`w-full px-3 py-2 rounded-xl bg-white border ${
                      errors.quantity_per_dose ? 'border-rose-400' : 'border-slate-200 focus:border-teal-500'
                    } text-xs text-slate-900 focus:outline-none focus:ring-2 focus:ring-teal-500/10`}
                    disabled={isLoading}
                  />
                  {errors.quantity_per_dose && (
                    <p className="text-[10px] text-rose-600 mt-1 font-medium">{errors.quantity_per_dose}</p>
                  )}
                </div>

                <div>
                  <label htmlFor="low_stock_threshold" className="block text-[11px] font-bold text-slate-700 mb-1">
                    Low Stock Alert Level
                  </label>
                  <input
                    id="low_stock_threshold"
                    type="number"
                    name="low_stock_threshold"
                    value={formData.low_stock_threshold}
                    onChange={handleChange}
                    step="any"
                    min="0"
                    placeholder="e.g. 5"
                    className="w-full px-3 py-2 rounded-xl bg-white border border-slate-200 focus:border-teal-500 text-xs text-slate-900 focus:outline-none focus:ring-2 focus:ring-teal-500/10"
                    disabled={isLoading}
                  />
                </div>
              </div>
            </div>

            {/* Instructions (Optional) */}
            <div>
              <label htmlFor="instructions" className="block text-xs font-bold text-slate-700 mb-1.5">
                Intake Instructions <span className="text-slate-400 text-[10px] font-normal">(Optional)</span>
              </label>
              <textarea
                id="instructions"
                name="instructions"
                rows={2}
                value={formData.instructions}
                onChange={handleChange}
                placeholder="e.g. Take twice daily with morning and evening meals"
                maxLength={255}
                className={`w-full px-3.5 py-2.5 rounded-xl bg-white border ${
                  errors.instructions ? 'border-rose-400' : 'border-slate-200 focus:border-teal-500 focus:ring-teal-500/10'
                } text-sm text-slate-900 placeholder-slate-400 focus:outline-none focus:ring-4 transition-all resize-none`}
                disabled={isLoading}
              />
              {errors.instructions && (
                <p className="text-[11px] text-rose-600 mt-1 font-medium">{errors.instructions}</p>
              )}
            </div>

            {/* Dates Row: Start Date & End Date */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3.5">
              <div>
                <label htmlFor="start_date" className="block text-xs font-bold text-slate-700 mb-1.5">
                  Start Date
                </label>
                <div className="relative">
                  <input
                    id="start_date"
                    type="date"
                    name="start_date"
                    value={formData.start_date}
                    onChange={handleChange}
                    className="w-full px-3.5 py-2.5 rounded-xl bg-white border border-slate-200 text-sm text-slate-900 focus:border-teal-500 focus:ring-teal-500/10 focus:outline-none focus:ring-4 transition-all"
                    disabled={isLoading}
                  />
                </div>
              </div>

              <div>
                <label htmlFor="end_date" className="block text-xs font-bold text-slate-700 mb-1.5">
                  End Date <span className="text-slate-400 text-[10px] font-normal">(Leave blank if ongoing)</span>
                </label>
                <div className="relative">
                  <input
                    id="end_date"
                    type="date"
                    name="end_date"
                    value={formData.end_date}
                    onChange={handleChange}
                    className={`w-full px-3.5 py-2.5 rounded-xl bg-white border ${
                      errors.end_date ? 'border-rose-400' : 'border-slate-200 focus:border-teal-500 focus:ring-teal-500/10'
                    } text-sm text-slate-900 focus:outline-none focus:ring-4 transition-all`}
                    disabled={isLoading}
                  />
                </div>
                {errors.end_date && (
                  <p className="text-[11px] text-rose-600 mt-1 font-medium">{errors.end_date}</p>
                )}
              </div>
            </div>

            {/* Active Status Checkbox */}
            <div className="pt-1">
              <label className="flex items-center space-x-3 cursor-pointer select-none">
                <input
                  type="checkbox"
                  name="is_active"
                  checked={formData.is_active}
                  onChange={handleChange}
                  disabled={isLoading}
                  className="w-4 h-4 rounded border-slate-300 text-teal-600 focus:ring-teal-500/20 focus:ring-offset-0 transition-colors"
                />
                <div>
                  <span className="text-xs font-bold text-slate-800">Active Medication</span>
                  <p className="text-[11px] text-slate-500">
                    Uncheck if this prescription has been discontinued or completed.
                  </p>
                </div>
              </label>
            </div>

            {/* Modal Actions */}
            <div className="pt-4 border-t border-slate-100 flex items-center justify-end space-x-3">
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
                    <span>{isEditMode ? 'Update Medicine' : 'Save Medicine'}</span>
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
