import React, { useState, useEffect, useMemo } from 'react'
import { useAuth } from '../../context/AuthContext'
import { medicineService } from '../../services/medicineService'
import { MedicineCard } from '../../components/medicines/MedicineCard'
import { MedicineFormModal } from '../../components/medicines/MedicineFormModal'
import { DeleteConfirmModal } from '../../components/medicines/DeleteConfirmModal'
import { MedicineScheduleModal } from '../../components/schedules/MedicineScheduleModal'
import { StockManageModal } from '../../components/medicines/StockManageModal'
import { RefillPredictionModal } from '../../components/medicines/RefillPredictionModal'
import {
  Pill,
  Plus,
  Search,
  AlertCircle,
  CheckCircle2,
  X,
  RotateCw,
  Sparkles,
  ShieldAlert,
} from 'lucide-react'

export const MedicinesPage = () => {
  const { user } = useAuth()
  const isPatient = user?.role === 'PATIENT'

  const [medicines, setMedicines] = useState([])
  const [isLoading, setIsLoading] = useState(true)
  const [error, setError] = useState(null)
  const [searchQuery, setSearchQuery] = useState('')
  const [statusFilter, setStatusFilter] = useState('ALL') // 'ALL' | 'ACTIVE' | 'INACTIVE'
  const [feedback, setFeedback] = useState(null) // { type: 'success' | 'error', message: string }

  // Modal States
  const [isFormOpen, setIsFormOpen] = useState(false)
  const [editingMedicine, setEditingMedicine] = useState(null)
  const [isSubmitting, setIsSubmitting] = useState(false)

  const [isDeleteOpen, setIsDeleteOpen] = useState(false)
  const [deletingMedicine, setDeletingMedicine] = useState(null)
  const [isDeleting, setIsDeleting] = useState(false)

  // Schedule Modal State
  const [scheduleModalMedicine, setScheduleModalMedicine] = useState(null)

  // Feature 18: Stock Management Modal State
  const [stockModalMedicine, setStockModalMedicine] = useState(null)

  // Feature 19: AI Refill Prediction Modal State
  const [refillModalMedicine, setRefillModalMedicine] = useState(null)

  // Fetch medicines on mount
  const fetchMedicines = async () => {
    if (!isPatient) {
      setIsLoading(false)
      return
    }

    setIsLoading(true)
    setError(null)
    try {
      const data = await medicineService.getMedicines()
      setMedicines(Array.isArray(data) ? data : [])
    } catch (err) {
      if (err.response?.status === 403) {
        setError('Access denied: Medicine management is currently available only for patient accounts.')
      } else if (err.response?.status === 401) {
        setError('Session expired. Please log in again.')
      } else {
        setError('Unable to load medications from server. Please check your connection and retry.')
      }
    } finally {
      setIsLoading(false)
    }
  }

  useEffect(() => {
    fetchMedicines()
  }, [isPatient])

  // Clear feedback banner after 5 seconds
  useEffect(() => {
    if (feedback) {
      const timer = setTimeout(() => setFeedback(null), 5000)
      return () => clearTimeout(timer)
    }
  }, [feedback])

  // Filter and search logic
  const filteredMedicines = useMemo(() => {
    return medicines.filter((med) => {
      // Status filter
      if (statusFilter === 'ACTIVE' && !med.is_active) return false
      if (statusFilter === 'INACTIVE' && med.is_active) return false

      // Search filter
      if (searchQuery.trim()) {
        const q = searchQuery.toLowerCase().trim()
        const matchName = med.name?.toLowerCase().includes(q)
        const matchGeneric = med.generic_name?.toLowerCase().includes(q)
        const matchInstructions = med.instructions?.toLowerCase().includes(q)
        if (!matchName && !matchGeneric && !matchInstructions) return false
      }

      return true
    })
  }, [medicines, statusFilter, searchQuery])

  // Counts
  const counts = useMemo(() => {
    const total = medicines.length
    const active = medicines.filter((m) => m.is_active).length
    const inactive = total - active
    return { total, active, inactive }
  }, [medicines])

  // Handlers for Add / Edit
  const handleOpenAdd = () => {
    setEditingMedicine(null)
    setIsFormOpen(true)
  }

  const handleOpenEdit = (medicine) => {
    setEditingMedicine(medicine)
    setIsFormOpen(true)
  }

  const handleFormSubmit = async (payload) => {
    setIsSubmitting(true)
    try {
      if (editingMedicine) {
        // Update existing medicine
        const updated = await medicineService.updateMedicine(editingMedicine.id, payload)
        setMedicines((prev) =>
          prev.map((m) => (m.id === updated.id ? updated : m))
        )
        setFeedback({
          type: 'success',
          message: `Updated "${updated.name}" successfully.`,
        })
      } else {
        // Create new medicine
        const created = await medicineService.createMedicine(payload)
        setMedicines((prev) => [created, ...prev])
        setFeedback({
          type: 'success',
          message: `Added "${created.name}" to your medications.`,
        })
      }
      setIsFormOpen(false)
      setEditingMedicine(null)
    } finally {
      setIsSubmitting(false)
    }
  }

  // Handlers for Stock Management
  const handleOpenStock = (medicine) => {
    setStockModalMedicine(medicine)
  }

  const handleStockUpdated = (updatedMed) => {
    setMedicines((prev) =>
      prev.map((m) => (m.id === updatedMed.id ? { ...m, ...updatedMed } : m))
    )
    setFeedback({
      type: 'success',
      message: `Updated stock balance for "${updatedMed.name}".`,
    })
    setStockModalMedicine(null)
  }

  // Handlers for Delete
  const handleOpenDelete = (medicine) => {
    setDeletingMedicine(medicine)
    setIsDeleteOpen(true)
  }

  const handleConfirmDelete = async () => {
    if (!deletingMedicine) return
    setIsDeleting(true)
    try {
      await medicineService.deleteMedicine(deletingMedicine.id)
      setMedicines((prev) => prev.filter((m) => m.id !== deletingMedicine.id))
      setFeedback({
        type: 'success',
        message: `"${deletingMedicine.name}" has been removed.`,
      })
      setIsDeleteOpen(false)
      setDeletingMedicine(null)
    } catch (err) {
      setFeedback({
        type: 'error',
        message: err.response?.data?.detail || 'Failed to delete medication. Please try again.',
      })
      setIsDeleteOpen(false)
    } finally {
      setIsDeleting(false)
    }
  }

  // If user is a Caregiver / Non-Patient account
  if (!isPatient && !isLoading) {
    return (
      <div className="max-w-2xl mx-auto py-12 px-4 text-center">
        <div className="w-16 h-16 rounded-2xl bg-white border border-slate-200 text-sky-600 flex items-center justify-center mx-auto mb-4 shadow-xs">
          <ShieldAlert className="w-8 h-8" />
        </div>
        <h1 className="text-xl font-bold text-slate-900 tracking-tight">Patient Medicine Management</h1>
        <p className="text-sm text-slate-500 mt-2 leading-relaxed">
          You are currently logged in as <span className="font-semibold text-slate-800 capitalize">{user?.role?.toLowerCase() || 'Caregiver'}</span>.
          Medicine management is directly associated with individual Patient accounts. Caregiver multi-patient assignment access will be available in upcoming features.
        </p>
      </div>
    )
  }

  return (
    <div className="space-y-6 pb-12">
      {/* Page Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <div className="inline-flex items-center space-x-2 px-3 py-1 rounded-full bg-teal-50 border border-teal-200/80 text-teal-700 text-xs font-semibold mb-2">
            <Sparkles className="w-3.5 h-3.5 text-teal-600" />
            <span>Prescription & Stock Catalog</span>
          </div>
          <h1 className="text-2xl sm:text-3xl font-bold text-slate-900 tracking-tight">
            Medicines & Inventory
          </h1>
          <p className="text-sm text-slate-500 mt-1 font-medium">
            Manage prescriptions, track stock levels, record refills, and configure dosing schedules.
          </p>
        </div>

        {/* Add Medicine Button */}
        <button
          onClick={handleOpenAdd}
          disabled={isLoading}
          className="inline-flex items-center justify-center space-x-2 px-5 py-2.5 rounded-xl text-xs font-semibold text-white bg-teal-600 hover:bg-teal-700 shadow-sm shadow-teal-600/20 transition-all focus:outline-none focus:ring-4 focus:ring-teal-500/20 shrink-0 disabled:opacity-60 cursor-pointer"
        >
          <Plus className="w-4 h-4 stroke-[2.4]" />
          <span>Add Medicine</span>
        </button>
      </div>

      {/* Feedback Toast / Alert Banner */}
      {feedback && (
        <div
          className={`flex items-center justify-between p-4 rounded-xl border animate-in fade-in duration-200 ${
            feedback.type === 'success'
              ? 'bg-emerald-50 border-emerald-200 text-emerald-800'
              : 'bg-rose-50 border-rose-200 text-rose-800'
          }`}
        >
          <div className="flex items-center space-x-3 text-xs font-semibold">
            {feedback.type === 'success' ? (
              <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0" />
            ) : (
              <AlertCircle className="w-4 h-4 text-rose-600 shrink-0" />
            )}
            <span>{feedback.message}</span>
          </div>
          <button
            onClick={() => setFeedback(null)}
            className="p-1 rounded-lg hover:bg-black/5 text-slate-400 hover:text-slate-700 transition-colors cursor-pointer"
          >
            <X className="w-4 h-4" />
          </button>
        </div>
      )}

      {/* Search & Filter Controls (When medicines exist) */}
      {!isLoading && medicines.length > 0 && (
        <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-3 bg-white border border-slate-200/80 p-3 rounded-2xl shadow-xs">
          {/* Search Bar */}
          <div className="relative flex-1 max-w-md">
            <Search className="w-4 h-4 text-slate-400 absolute left-3.5 top-1/2 -translate-y-1/2" />
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Search by name, generic, or instructions..."
              className="w-full pl-9 pr-8 py-2 rounded-xl bg-slate-50 border border-slate-200 text-xs text-slate-900 placeholder-slate-400 focus:bg-white focus:outline-none focus:border-teal-500 focus:ring-4 focus:ring-teal-500/10 transition-all"
            />
            {searchQuery && (
              <button
                onClick={() => setSearchQuery('')}
                className="absolute right-2.5 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600 cursor-pointer"
              >
                <X className="w-3.5 h-3.5" />
              </button>
            )}
          </div>

          {/* Status Tabs */}
          <div className="flex items-center space-x-1 p-1 bg-slate-100/80 rounded-xl border border-slate-200/80 shrink-0">
            <button
              onClick={() => setStatusFilter('ALL')}
              className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition-all cursor-pointer ${
                statusFilter === 'ALL'
                  ? 'bg-white text-teal-800 border border-slate-200 shadow-xs'
                  : 'text-slate-600 hover:text-slate-900'
              }`}
            >
              All ({counts.total})
            </button>
            <button
              onClick={() => setStatusFilter('ACTIVE')}
              className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition-all cursor-pointer ${
                statusFilter === 'ACTIVE'
                  ? 'bg-white text-teal-800 border border-slate-200 shadow-xs'
                  : 'text-slate-600 hover:text-slate-900'
              }`}
            >
              Active ({counts.active})
            </button>
            <button
              onClick={() => setStatusFilter('INACTIVE')}
              className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition-all cursor-pointer ${
                statusFilter === 'INACTIVE'
                  ? 'bg-white text-teal-800 border border-slate-200 shadow-xs'
                  : 'text-slate-600 hover:text-slate-900'
              }`}
            >
              Inactive ({counts.inactive})
            </button>
          </div>
        </div>
      )}

      {/* Main Content Area */}
      {isLoading ? (
        /* Loading Skeleton State */
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
          {[1, 2, 3].map((i) => (
            <div
              key={i}
              className="bg-white border border-slate-200/80 rounded-2xl p-6 space-y-4 animate-pulse shadow-xs"
            >
              <div className="flex items-center justify-between">
                <div className="flex items-center space-x-3">
                  <div className="w-10 h-10 rounded-xl bg-slate-100"></div>
                  <div className="space-y-1.5">
                    <div className="w-28 h-4 bg-slate-200 rounded"></div>
                    <div className="w-20 h-3 bg-slate-100 rounded"></div>
                  </div>
                </div>
                <div className="w-14 h-5 bg-slate-100 rounded-full"></div>
              </div>
              <div className="h-16 bg-slate-50 rounded-xl border border-slate-100"></div>
              <div className="flex justify-between items-center pt-2">
                <div className="w-24 h-3 bg-slate-200 rounded"></div>
                <div className="w-16 h-7 bg-slate-100 rounded-lg"></div>
              </div>
            </div>
          ))}
        </div>
      ) : error ? (
        /* Error State with Retry */
        <div className="bg-white border border-slate-200 rounded-2xl p-8 text-center max-w-lg mx-auto shadow-xs">
          <div className="w-12 h-12 rounded-full bg-rose-50 border border-rose-200 text-rose-600 flex items-center justify-center mx-auto mb-3">
            <AlertCircle className="w-6 h-6" />
          </div>
          <h3 className="text-base font-bold text-slate-900">Error Loading Medications</h3>
          <p className="text-xs text-slate-500 mt-1 mb-5">{error}</p>
          <button
            onClick={fetchMedicines}
            className="inline-flex items-center space-x-2 px-4 py-2 rounded-xl text-xs font-semibold text-slate-700 bg-slate-100 hover:bg-slate-200 border border-slate-200 transition-colors cursor-pointer"
          >
            <RotateCw className="w-3.5 h-3.5" />
            <span>Retry Connection</span>
          </button>
        </div>
      ) : medicines.length === 0 ? (
        /* Honest Empty State */
        <div className="bg-white border border-slate-200/80 rounded-2xl p-8 sm:p-12 text-center shadow-xs">
          <div className="w-16 h-16 rounded-2xl bg-teal-50 border border-teal-200 text-teal-600 flex items-center justify-center mx-auto mb-4">
            <Pill className="w-8 h-8 stroke-[1.8]" />
          </div>
          <h3 className="text-lg font-bold text-slate-900 tracking-tight">No medicines added yet</h3>
          <p className="text-xs text-slate-500 max-w-sm mx-auto mt-1.5 mb-6 leading-relaxed">
            Start keeping track of your prescriptions, stock quantities, dosages, and schedules by adding your first medicine.
          </p>
          <button
            onClick={handleOpenAdd}
            className="inline-flex items-center space-x-2 px-5 py-2.5 rounded-xl text-xs font-semibold text-white bg-teal-600 hover:bg-teal-700 shadow-sm shadow-teal-600/20 transition-all focus:outline-none focus:ring-4 focus:ring-teal-500/20 cursor-pointer"
          >
            <Plus className="w-4 h-4 stroke-[2.4]" />
            <span>Add Medicine</span>
          </button>
        </div>
      ) : filteredMedicines.length === 0 ? (
        /* No Search / Filter Results */
        <div className="bg-white border border-slate-200/80 rounded-2xl p-8 text-center shadow-xs">
          <p className="text-sm font-semibold text-slate-800">No matching medicines found</p>
          <p className="text-xs text-slate-500 mt-1">
            Try adjusting your search query or status filter.
          </p>
          <button
            onClick={() => {
              setSearchQuery('')
              setStatusFilter('ALL')
            }}
            className="mt-4 text-xs font-semibold text-teal-600 hover:text-teal-700 hover:underline cursor-pointer"
          >
            Reset Filters
          </button>
        </div>
      ) : (
        /* Grid of Medicine Cards */
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
          {filteredMedicines.map((medicine) => (
            <MedicineCard
              key={medicine.id}
              medicine={medicine}
              onEdit={handleOpenEdit}
              onDelete={handleOpenDelete}
              onManageSchedule={(med) => setScheduleModalMedicine(med)}
              onManageStock={(med) => handleOpenStock(med)}
              onViewRefillPrediction={(med) => setRefillModalMedicine(med)}
            />
          ))}
        </div>
      )}

      {/* Add / Edit Medicine Modal */}
      <MedicineFormModal
        isOpen={isFormOpen}
        onClose={() => {
          setIsFormOpen(false)
          setEditingMedicine(null)
        }}
        onSubmit={handleFormSubmit}
        initialData={editingMedicine}
        isLoading={isSubmitting}
      />

      {/* Feature 18: Stock / Inventory Modal */}
      <StockManageModal
        isOpen={Boolean(stockModalMedicine)}
        onClose={() => setStockModalMedicine(null)}
        medicine={stockModalMedicine}
        onStockUpdated={handleStockUpdated}
      />

      {/* Feature 19: AI Refill Prediction Modal */}
      <RefillPredictionModal
        isOpen={Boolean(refillModalMedicine)}
        onClose={() => setRefillModalMedicine(null)}
        medicine={refillModalMedicine}
        onOpenStockModal={(med) => setStockModalMedicine(med)}
        onOpenScheduleModal={(med) => setScheduleModalMedicine(med)}
      />

      {/* Delete Medicine Confirmation Modal */}
      <DeleteConfirmModal
        isOpen={isDeleteOpen}
        onClose={() => {
          setIsDeleteOpen(false)
          setDeletingMedicine(null)
        }}
        onConfirm={handleConfirmDelete}
        medicineName={deletingMedicine?.name || 'this medicine'}
        isLoading={isDeleting}
      />

      {/* Medication Schedule Management Modal */}
      <MedicineScheduleModal
        isOpen={Boolean(scheduleModalMedicine)}
        onClose={() => setScheduleModalMedicine(null)}
        medicine={scheduleModalMedicine}
      />
    </div>
  )
}
