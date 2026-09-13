import React, { useState, useEffect, useCallback } from 'react'
import { Link } from 'react-router-dom'
import { useAuth } from '../../context/AuthContext'
import { dashboardService } from '../../services/dashboardService'
import { doseService } from '../../services/doseService'
import { intelligenceService } from '../../services/intelligenceService'
import { refillService } from '../../services/refillService'
import { DashboardHeader } from '../../components/dashboard/DashboardHeader'
import { DashboardSummary } from '../../components/dashboard/DashboardSummary'
import { DashboardSection } from '../../components/dashboard/DashboardSection'
import { DueMedicationCard } from '../../components/dashboard/DueMedicationCard'
import { UpcomingMedicationCard } from '../../components/dashboard/UpcomingMedicationCard'
import { TakeDoseModal } from '../../components/dashboard/TakeDoseModal'
import { SkipDoseModal } from '../../components/dashboard/SkipDoseModal'
import { SnoozeDoseModal } from '../../components/dashboard/SnoozeDoseModal'
import { QuickNavigation } from '../../components/dashboard/QuickNavigation'
import {
  AlertCircle,
  Clock,
  Activity,
  CheckCircle2,
  X,
  ArrowRight,
  Sparkles,
  Lightbulb,
  Boxes,
  AlertTriangle,
  AlertOctagon,
} from 'lucide-react'

export const DashboardPage = () => {
  const { user } = useAuth()

  // State for data
  const [summary, setSummary] = useState(null)
  const [dueReminders, setDueReminders] = useState([])
  const [upcomingReminders, setUpcomingReminders] = useState([])
  const [adherence, setAdherence] = useState(null)
  const [intelligence, setIntelligence] = useState(null)
  const [refillSummary, setRefillSummary] = useState(null)

  // Loading and error states
  const [isLoading, setIsLoading] = useState(true)
  const [isRefreshing, setIsRefreshing] = useState(false)
  const [errors, setErrors] = useState({
    summary: null,
    due: null,
    upcoming: null,
    adherence: null,
    intelligence: null,
    refill: null,
  })

  // Feedback Banner State
  const [feedback, setFeedback] = useState(null) // { type: 'success' | 'error', message: string }

  // Action Modals State
  const [doseModal, setDoseModal] = useState(null) // { type: 'TAKE' | 'SKIP', medication: object } | null
  const [isSubmittingDose, setIsSubmittingDose] = useState(false)
  const [doseModalError, setDoseModalError] = useState(null)

  // Fetch all dashboard data concurrently
  const loadDashboardData = useCallback(async (isSilentRefresh = false) => {
    if (isSilentRefresh) {
      setIsRefreshing(true)
    } else {
      setIsLoading(true)
    }

    const newErrors = { summary: null, due: null, upcoming: null, adherence: null, intelligence: null, refill: null }

    // 1. Fetch Summary
    try {
      const summaryData = await dashboardService.getReminderSummary()
      setSummary(summaryData)
    } catch {
      newErrors.summary = 'Unable to load today’s medication summary.'
    }

    // 2. Fetch Due Reminders
    try {
      const dueData = await dashboardService.getDueReminders()
      setDueReminders(Array.isArray(dueData) ? dueData : [])
    } catch {
      newErrors.due = 'Unable to load due reminders at this time.'
    }

    // 3. Fetch Upcoming Reminders
    try {
      const upcomingData = await dashboardService.getUpcomingReminders(10)
      setUpcomingReminders(Array.isArray(upcomingData) ? upcomingData : [])
    } catch {
      newErrors.upcoming = 'Unable to load upcoming reminders at this time.'
    }

    // 4. Fetch Today's Adherence
    try {
      const adherenceData = await dashboardService.getTodayAdherence()
      setAdherence(adherenceData)
    } catch {
      newErrors.adherence = 'Unable to load today’s adherence statistics.'
    }

    // 5. Fetch Smart Intelligence (Non-blocking)
    try {
      const intelligenceData = await intelligenceService.getPatientIntelligenceSummary()
      setIntelligence(intelligenceData)
    } catch {
      newErrors.intelligence = 'Unable to load smart insights overview.'
    }

    // 6. Fetch Feature 19 Refill Predictions (Non-blocking)
    try {
      const refillData = await refillService.getRefillPredictions()
      setRefillSummary(refillData)
    } catch {
      newErrors.refill = 'Unable to load refill forecasts.'
    }

    setErrors(newErrors)
    setIsLoading(false)
    setIsRefreshing(false)
  }, [])

  useEffect(() => {
    loadDashboardData()
  }, [loadDashboardData])

  // Open Take Dose Modal
  const handleOpenTake = (medication) => {
    setDoseModalError(null)
    setDoseModal({ type: 'TAKE', medication })
  }

  // Open Skip Dose Modal
  const handleOpenSkip = (medication) => {
    setDoseModalError(null)
    setDoseModal({ type: 'SKIP', medication })
  }

  // Open Snooze Dose Modal
  const handleOpenSnooze = (medication) => {
    setDoseModalError(null)
    setDoseModal({ type: 'SNOOZE', medication })
  }

  // Close Active Modal
  const handleCloseModal = () => {
    if (!isSubmittingDose) {
      setDoseModal(null)
      setDoseModalError(null)
    }
  }

  // Confirm Take Action
  const handleConfirmTake = async ({ doseQuantityTaken, notes }) => {
    if (!doseModal || !doseModal.medication) return

    const { medication } = doseModal
    setIsSubmittingDose(true)
    setDoseModalError(null)

    try {
      await doseService.recordDoseEvent({
        schedule_id: medication.schedule_id,
        scheduled_timestamp: medication.due_at,
        status: 'TAKEN',
        dose_quantity_taken: doseQuantityTaken,
        notes: notes || undefined,
      })

      setDoseModal(null)
      setFeedback({
        type: 'success',
        message: `${medication.medicine_name || 'Medication'} marked as taken.`,
      })

      // Refresh dashboard data without full page reload
      await loadDashboardData(true)
    } catch (err) {
      const detail = err.response?.data?.detail
      setDoseModalError(
        typeof detail === 'string'
          ? detail
          : 'Unable to record this dose. Please try again.'
      )
    } finally {
      setIsSubmittingDose(false)
    }
  }

  // Confirm Skip Action
  const handleConfirmSkip = async ({ notes }) => {
    if (!doseModal || !doseModal.medication) return

    const { medication } = doseModal
    setIsSubmittingDose(true)
    setDoseModalError(null)

    try {
      await doseService.recordDoseEvent({
        schedule_id: medication.schedule_id,
        scheduled_timestamp: medication.due_at,
        status: 'SKIPPED',
        notes: notes || undefined,
      })

      setDoseModal(null)
      setFeedback({
        type: 'success',
        message: `${medication.medicine_name || 'Medication'} marked as skipped.`,
      })

      // Refresh dashboard data without full page reload
      await loadDashboardData(true)
    } catch (err) {
      const detail = err.response?.data?.detail
      setDoseModalError(
        typeof detail === 'string'
          ? detail
          : 'Unable to skip this dose. Please try again.'
      )
    } finally {
      setIsSubmittingDose(false)
    }
  }

  // Confirm Snooze Action
  const handleConfirmSnooze = async ({ snoozeMinutes, notes }) => {
    if (!doseModal || !doseModal.medication) return

    const { medication } = doseModal
    setIsSubmittingDose(true)
    setDoseModalError(null)

    try {
      await doseService.recordDoseEvent({
        schedule_id: medication.schedule_id,
        scheduled_timestamp: medication.due_at,
        status: 'SNOOZED',
        snooze_minutes: snoozeMinutes,
        notes: notes || undefined,
      })

      setDoseModal(null)
      setFeedback({
        type: 'success',
        message: `${medication.medicine_name || 'Medication'} reminder snoozed for ${snoozeMinutes} minutes.`,
      })

      // Refresh dashboard data without full page reload
      await loadDashboardData(true)
    } catch (err) {
      const detail = err.response?.data?.detail
      setDoseModalError(
        typeof detail === 'string'
          ? detail
          : 'Unable to snooze this reminder. Please try again.'
      )
    } finally {
      setIsSubmittingDose(false)
    }
  }

  return (
    <div className="space-y-6">
      {/* 1. Header / Greeting */}
      <DashboardHeader
        user={user}
        onRefresh={() => loadDashboardData(true)}
        isRefreshing={isRefreshing}
      />

      {/* Success / Error Feedback Alert */}
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
            aria-label="Dismiss message"
          >
            <X className="w-4 h-4" />
          </button>
        </div>
      )}

      {/* 2. Today's Medication Summary */}
      <DashboardSummary
        summary={summary}
        adherence={adherence}
        isLoading={isLoading}
      />

      {/* 3 & 4. Due Medications and Upcoming Medications */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Section 3: Due Medications */}
        <DashboardSection
          title="Due Medications"
          subtitle="Doses scheduled for intake right now"
          icon={AlertCircle}
          iconBg="bg-rose-50 text-rose-600 border border-rose-200/80"
          badge={dueReminders.length > 0 ? `${dueReminders.length} Due` : '0 Due'}
          badgeColor={
            dueReminders.length > 0
              ? 'bg-rose-50 text-rose-700 border-rose-200/80'
              : 'bg-slate-100 text-slate-600 border-slate-200'
          }
          isLoading={isLoading}
          error={errors.due}
          onRetry={() => loadDashboardData(false)}
          empty={!isLoading && !errors.due && dueReminders.length === 0}
          emptyTitle="No medications are due right now."
          emptyMessage="You are completely caught up on your scheduled doses."
          emptyIcon={CheckCircle2}
        >
          <div className="space-y-3">
            {dueReminders.map((item, idx) => (
              <DueMedicationCard
                key={item.id || item.schedule_id || idx}
                medication={item}
                onTake={handleOpenTake}
                onSkip={handleOpenSkip}
                onSnooze={handleOpenSnooze}
              />
            ))}
          </div>
        </DashboardSection>

        {/* Section 4: Upcoming Medications */}
        <DashboardSection
          title="Upcoming Medications"
          subtitle="Scheduled later today and this week"
          icon={Clock}
          iconBg="bg-amber-50 text-amber-600 border border-amber-200/80"
          badge={upcomingReminders.length > 0 ? `${upcomingReminders.length} Scheduled` : '0 Scheduled'}
          badgeColor="bg-amber-50 text-amber-800 border-amber-200/80"
          isLoading={isLoading}
          error={errors.upcoming}
          onRetry={() => loadDashboardData(false)}
          empty={!isLoading && !errors.upcoming && upcomingReminders.length === 0}
          emptyTitle="No upcoming medications scheduled for today."
          emptyMessage="New schedules will automatically show up when configured."
          emptyIcon={Clock}
        >
          <div className="space-y-3">
            {upcomingReminders.map((item, idx) => (
              <UpcomingMedicationCard
                key={item.id || item.schedule_id || idx}
                medication={item}
              />
            ))}
          </div>
        </DashboardSection>
      </div>

      {/* Section 5: Adherence Summary */}
      <DashboardSection
        title="Adherence Summary"
        subtitle="Intake performance and tracking overview"
        icon={Activity}
        iconBg="bg-emerald-50 text-emerald-600 border border-emerald-200/80"
        badge={adherence ? `${adherence.adherence_percentage}% Score` : 'No Data'}
        badgeColor={
          adherence && adherence.adherence_percentage >= 80
            ? 'bg-emerald-50 text-emerald-700 border-emerald-200/80'
            : 'bg-slate-100 text-slate-600 border-slate-200'
        }
        headerAction={
          <Link
            to="/app/adherence"
            className="text-xs text-teal-600 hover:text-teal-700 font-semibold inline-flex items-center gap-1 transition-colors"
          >
            <span>View Analytics</span>
            <ArrowRight className="w-3.5 h-3.5" />
          </Link>
        }
        isLoading={isLoading}
        error={errors.adherence}
        onRetry={() => loadDashboardData(false)}
        empty={!isLoading && !errors.adherence && (!adherence || adherence.total_doses === 0)}
        emptyTitle="No adherence data recorded for today yet."
        emptyMessage="Logged doses will automatically update your daily compliance rate."
        emptyIcon={Activity}
      >
        {adherence && (
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
            <div className="bg-slate-50 border border-slate-200/80 rounded-xl p-4">
              <span className="text-xs font-semibold text-slate-500">Total Doses Tracked</span>
              <p className="text-2xl font-bold text-slate-900 mt-1">{adherence.total_doses}</p>
              <p className="text-[11px] text-slate-400 mt-0.5">Dose events scheduled today</p>
            </div>

            <div className="bg-slate-50 border border-slate-200/80 rounded-xl p-4">
              <span className="text-xs font-semibold text-slate-500">Taken vs Skipped</span>
              <p className="text-2xl font-bold text-teal-600 mt-1">
                {adherence.taken_doses}{' '}
                <span className="text-xs font-normal text-slate-400">taken /</span>{' '}
                <span className="text-rose-600">{adherence.skipped_doses}</span>{' '}
                <span className="text-xs font-normal text-slate-400">skipped</span>
              </p>
              <p className="text-[11px] text-slate-400 mt-0.5">
                {adherence.pending_doses} pending completion
              </p>
            </div>

            <div className="bg-slate-50 border border-slate-200/80 rounded-xl p-4">
              <span className="text-xs font-semibold text-slate-500">Compliance Rate</span>
              <p className="text-2xl font-bold text-emerald-600 mt-1">
                {adherence.adherence_percentage}%
              </p>
              <p className="text-[11px] text-slate-400 mt-0.5">Excludes pending doses</p>
            </div>
          </div>
        )}
      </DashboardSection>

      {/* Section 6: Smart Insights Overview */}
      <DashboardSection
        title="Smart Insights"
        subtitle="Medication-taking consistency & patterns"
        icon={Sparkles}
        iconBg="bg-teal-50 text-teal-600 border border-teal-200/80"
        badge={intelligence?.trend?.trend_direction ? intelligence.trend.trend_direction.replace('_', ' ') : 'Overview'}
        badgeColor={
          intelligence?.trend?.trend_direction === 'IMPROVING'
            ? 'bg-emerald-50 text-emerald-700 border-emerald-200/80'
            : intelligence?.trend?.trend_direction === 'DECLINING'
            ? 'bg-rose-50 text-rose-700 border-rose-200/80'
            : 'bg-slate-100 text-slate-600 border-slate-200'
        }
        headerAction={
          <div className="flex items-center gap-3">
            <Link
              to="/app/insights/history"
              className="text-xs text-slate-600 hover:text-slate-800 font-semibold inline-flex items-center gap-1 transition-colors"
            >
              <span>View History</span>
            </Link>
            <span className="text-slate-300">|</span>
            <Link
              to="/app/insights"
              className="text-xs text-teal-600 hover:text-teal-700 font-semibold inline-flex items-center gap-1 transition-colors"
            >
              <span>Smart Insights</span>
              <ArrowRight className="w-3.5 h-3.5" />
            </Link>
          </div>
        }
        isLoading={isLoading}
        error={errors.intelligence}
        onRetry={() => loadDashboardData(false)}
        empty={!isLoading && !errors.intelligence && !intelligence}
        emptyTitle="No insights available yet."
        emptyMessage="Continue taking your medications to unlock automated pattern insights."
        emptyIcon={Sparkles}
      >
        {intelligence && (
          <>
            <div className="grid grid-cols-1 sm:grid-cols-4 gap-4">
              <div className="bg-slate-50 border border-slate-200/80 rounded-xl p-4">
                <span className="text-xs font-semibold text-slate-500">7-Day Adherence</span>
                <p className="text-2xl font-bold text-slate-900 mt-1">
                  {intelligence.trend?.current_7d_adherence ?? 0}%
                </p>
                <p className="text-[11px] text-slate-400 mt-0.5">Past 7 days adherence</p>
              </div>

              <div className="bg-slate-50 border border-slate-200/80 rounded-xl p-4">
                <span className="text-xs font-semibold text-slate-500">Velocity Trend</span>
                <p
                  className={`text-xl font-bold mt-1 ${
                    intelligence.trend?.trend_direction === 'IMPROVING'
                      ? 'text-emerald-600'
                      : intelligence.trend?.trend_direction === 'DECLINING'
                      ? 'text-rose-600'
                      : 'text-slate-800'
                  }`}
                >
                  {intelligence.trend?.trend_direction?.replace('_', ' ') ?? 'N/A'}
                </p>
                <p className="text-[11px] text-slate-400 mt-0.5">
                  {intelligence.trend?.change_percentage !== undefined
                    ? `${intelligence.trend.change_percentage > 0 ? '+' : ''}${intelligence.trend.change_percentage}% vs prev week`
                    : 'Compared to prior week'}
                </p>
              </div>

              <div className="bg-slate-50 border border-slate-200/80 rounded-xl p-4">
                <span className="text-xs font-semibold text-slate-500">Attention Level</span>
                <p
                  className={`text-xl font-bold mt-1 ${
                    intelligence.attention_score?.level === 'HIGH_ATTENTION'
                      ? 'text-rose-600'
                      : intelligence.attention_score?.level === 'MODERATE'
                      ? 'text-amber-600'
                      : 'text-teal-600'
                  }`}
                >
                  {intelligence.attention_score?.level?.replace('_', ' ') ?? 'LOW'}
                </p>
                <p className="text-[11px] text-slate-400 mt-0.5">
                  Score: {intelligence.attention_score?.score ?? 0}/100
                </p>
              </div>

              <div className="bg-slate-50 border border-slate-200/80 rounded-xl p-4">
                <span className="text-xs font-semibold text-slate-500">Active Patterns</span>
                <p className="text-2xl font-bold text-teal-700 mt-1">
                  {intelligence.insights?.length ?? 0}
                </p>
                <p className="text-[11px] text-slate-400 mt-0.5">Observations detected</p>
              </div>
            </div>

            {/* Feature 17E: Compact Suggestion Preview Banner */}
            <div className="mt-4 flex flex-col sm:flex-row sm:items-center justify-between gap-3 bg-gradient-to-r from-amber-500/10 via-amber-500/5 to-transparent p-3.5 rounded-xl border border-amber-200/80">
              <div className="flex items-center gap-2.5">
                <div className="p-1.5 rounded-lg bg-amber-100 text-amber-800 shrink-0">
                  <Lightbulb className="w-4 h-4" />
                </div>
                <div>
                  <span className="text-xs font-bold text-slate-900">Smart Suggestions Available</span>
                  <p className="text-[11px] text-slate-600 mt-0.5">
                    Actionable, non-clinical routine ideas derived from your intake history.
                  </p>
                </div>
              </div>
              <Link
                to="/app/insights"
                className="text-xs font-semibold text-teal-700 hover:text-teal-900 inline-flex items-center gap-1 shrink-0"
              >
                <span>View Suggestions</span>
                <ArrowRight className="w-3.5 h-3.5" />
              </Link>
            </div>
          </>
        )}
      </DashboardSection>

      {/* Feature 19: Refill Planning Section */}
      <DashboardSection
        title="Refill Planning"
        subtitle="AI-estimated depletion & recommended refill schedule"
        icon={Boxes}
        iconBg="bg-teal-50 text-teal-700 border border-teal-200/80"
        badge={
          refillSummary
            ? `${(refillSummary.out_of_stock_count || 0) + (refillSummary.refill_recommended_count || 0) + (refillSummary.refill_soon_count || 0)} Need Refill`
            : 'Forecast'
        }
        badgeColor={
          refillSummary && ((refillSummary.out_of_stock_count || 0) > 0 || (refillSummary.refill_recommended_count || 0) > 0)
            ? 'bg-rose-50 text-rose-700 border-rose-200/80'
            : refillSummary && (refillSummary.refill_soon_count || 0) > 0
            ? 'bg-amber-50 text-amber-800 border-amber-200/80'
            : 'bg-teal-50 text-teal-700 border-teal-200/80'
        }
        headerAction={
          <Link
            to="/app/medicines"
            className="text-xs text-teal-600 hover:text-teal-700 font-semibold inline-flex items-center gap-1 transition-colors"
          >
            <span>Manage Stock</span>
            <ArrowRight className="w-3.5 h-3.5" />
          </Link>
        }
        isLoading={isLoading}
        error={errors.refill}
        onRetry={() => loadDashboardData(false)}
        empty={!isLoading && !errors.refill && (!refillSummary || !refillSummary.items || refillSummary.items.length === 0)}
        emptyTitle="No medications tracked for refill predictions."
        emptyMessage="Add medications in the catalog to generate intelligent refill forecasts."
        emptyIcon={Boxes}
      >
        {refillSummary && refillSummary.items && refillSummary.items.length > 0 && (
          <div className="space-y-3">
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
              {refillSummary.items.slice(0, 3).map((item) => (
                <div
                  key={item.medication_id}
                  className="p-3.5 rounded-xl bg-slate-50 border border-slate-200/80 flex flex-col justify-between"
                >
                  <div>
                    <div className="flex items-start justify-between gap-2">
                      <span className="text-xs font-bold text-slate-900 truncate">
                        {item.medication_name}
                      </span>
                      <span
                        className={`inline-flex items-center px-2 py-0.5 rounded-full text-[10px] font-bold border ${
                          item.prediction_status === 'OUT_OF_STOCK' || item.prediction_status === 'REFILL_RECOMMENDED'
                            ? 'bg-rose-50 text-rose-700 border-rose-200'
                            : item.prediction_status === 'REFILL_SOON'
                            ? 'bg-amber-50 text-amber-700 border-amber-200'
                            : item.prediction_status === 'ON_TRACK'
                            ? 'bg-emerald-50 text-emerald-700 border-emerald-200'
                            : 'bg-slate-100 text-slate-600 border-slate-200'
                        }`}
                      >
                        {item.prediction_status === 'OUT_OF_STOCK'
                          ? 'Out of Stock'
                          : item.prediction_status === 'REFILL_RECOMMENDED'
                          ? 'Refill Soon'
                          : item.prediction_status === 'REFILL_SOON'
                          ? 'Refill Soon'
                          : item.prediction_status === 'ON_TRACK'
                          ? 'On Track'
                          : 'No Data'}
                      </span>
                    </div>

                    <p className="text-xs text-slate-500 mt-1.5">
                      Stock: <strong className="text-slate-800 font-semibold">{item.current_quantity} {item.stock_unit}</strong>
                    </p>
                    <p className="text-[11px] text-slate-500 mt-0.5">
                      Daily use: {item.average_daily_consumption !== null ? `${item.average_daily_consumption} ${item.stock_unit}/day` : '—'}
                    </p>
                  </div>

                  <div className="mt-2.5 pt-2 border-t border-slate-200/60 flex items-center justify-between text-[11px]">
                    <span className="text-slate-400">
                      {item.estimated_days_remaining !== null ? `${item.estimated_days_remaining} days left` : 'Schedule needed'}
                    </span>
                    <Link
                      to="/app/medicines"
                      className="text-teal-600 hover:text-teal-700 font-semibold inline-flex items-center gap-0.5"
                    >
                      <span>Refill</span>
                      <ArrowRight className="w-3 h-3" />
                    </Link>
                  </div>
                </div>
              ))}
            </div>

            <p className="text-[11px] text-slate-400 italic text-center pt-1">
              Refill estimates are based on recorded medication usage and are for planning purposes only.
            </p>
          </div>
        )}
      </DashboardSection>

      {/* Section 7: Quick Navigation */}
      <QuickNavigation />

      {/* Take Dose Confirmation Modal */}
      <TakeDoseModal
        isOpen={doseModal?.type === 'TAKE'}
        onClose={handleCloseModal}
        onConfirm={handleConfirmTake}
        medication={doseModal?.medication}
        isLoading={isSubmittingDose}
        error={doseModalError}
      />

      {/* Skip Dose Confirmation Modal */}
      <SkipDoseModal
        isOpen={doseModal?.type === 'SKIP'}
        onClose={handleCloseModal}
        onConfirm={handleConfirmSkip}
        medication={doseModal?.medication}
        isLoading={isSubmittingDose}
        error={doseModalError}
      />

      {/* Snooze Dose Confirmation Modal */}
      <SnoozeDoseModal
        isOpen={doseModal?.type === 'SNOOZE'}
        onClose={handleCloseModal}
        onConfirm={handleConfirmSnooze}
        medication={doseModal?.medication}
        isLoading={isSubmittingDose}
        error={doseModalError}
      />
    </div>
  )
}
export default DashboardPage
