import React from 'react'
import { Link } from 'react-router-dom'
import {
  TrendingUp,
  TrendingDown,
  Minus,
  ArrowRight,
  Calendar,
  Layers,
  Activity,
} from 'lucide-react'

export const AdherenceVelocityCard = ({ trend }) => {
  const cAdh = trend?.current_7d_adherence ?? 0
  const pAdh = trend?.previous_7d_adherence ?? 0
  const mAdh = trend?.last_30d_adherence ?? 0
  const changePct = trend?.change_percentage ?? 0
  const direction = trend?.trend_direction ?? 'STABLE'

  const cTaken = trend?.current_7d_taken ?? 0
  const cSkipped = trend?.current_7d_skipped ?? 0
  const pTaken = trend?.previous_7d_taken ?? 0
  const pSkipped = trend?.previous_7d_skipped ?? 0

  // 30-day totals: use backend values or fallback to sum
  const mTaken = trend?.last_30d_taken || (cTaken + pTaken)
  const mSkipped = trend?.last_30d_skipped || (cSkipped + pSkipped)
  const mTotal = mTaken + mSkipped

  const takenPct = mTotal > 0 ? Math.round((mTaken / mTotal) * 100) : 0
  const skippedPct = mTotal > 0 ? Math.round((mSkipped / mTotal) * 100) : 0

  return (
    <div className="bg-white rounded-2xl border border-slate-200/80 p-6 shadow-xs flex flex-col justify-between h-full">
      <div>
        {/* Card Header */}
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2">
          <div>
            <span className="text-[11px] font-bold text-slate-400 uppercase tracking-wider block">
              Adherence Velocity & Timeline
            </span>
            <h3 className="text-base font-bold text-slate-900 mt-0.5">
              Current Week vs. Historical Windows
            </h3>
          </div>

          {/* Trajectory Badge */}
          <div>
            {direction === 'IMPROVING' ? (
              <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-bold bg-emerald-50 text-emerald-700 border border-emerald-200">
                <TrendingUp className="w-3.5 h-3.5" />
                <span>Improving (+{Math.abs(changePct)}%)</span>
              </span>
            ) : direction === 'DECLINING' ? (
              <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-bold bg-rose-50 text-rose-700 border border-rose-200">
                <TrendingDown className="w-3.5 h-3.5" />
                <span>Declining (-{Math.abs(changePct)}%)</span>
              </span>
            ) : (
              <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-bold bg-sky-50 text-sky-700 border border-sky-200">
                <Minus className="w-3.5 h-3.5" />
                <span>Stable Consistency</span>
              </span>
            )}
          </div>
        </div>

        {/* 3 Window Comparison Cards */}
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-3.5 mt-5">
          {/* Current 7-Day Window */}
          <div className="bg-slate-50/80 rounded-2xl p-4 border border-slate-200/70 relative overflow-hidden flex flex-col justify-between">
            <div className="flex items-center justify-between">
              <span className="text-xs font-bold text-slate-600">Current 7 Days</span>
              <span className="text-[10px] px-2 py-0.5 rounded-md bg-teal-100/70 text-teal-800 font-bold">
                Recent
              </span>
            </div>
            <div className="my-2.5">
              <p className="text-2xl font-extrabold text-slate-900">
                {cAdh}%
              </p>
              <div className="w-full bg-slate-200/80 h-1.5 rounded-full overflow-hidden mt-2">
                <div
                  className={`h-full rounded-full transition-all duration-500 ${
                    cAdh >= 80 ? 'bg-emerald-500' : cAdh >= 50 ? 'bg-amber-500' : 'bg-rose-500'
                  }`}
                  style={{ width: `${Math.min(100, Math.max(4, cAdh))}%` }}
                />
              </div>
            </div>
            <div className="flex items-center justify-between text-[11px] font-medium pt-1 border-t border-slate-200/60">
              <span className="text-teal-700 font-semibold">{cTaken} taken</span>
              <span className="text-rose-600 font-semibold">{cSkipped} skipped</span>
            </div>
          </div>

          {/* Previous 7-Day Window */}
          <div className="bg-slate-50/80 rounded-2xl p-4 border border-slate-200/70 flex flex-col justify-between">
            <div className="flex items-center justify-between">
              <span className="text-xs font-bold text-slate-600">Previous 7 Days</span>
              <span className="text-[10px] px-2 py-0.5 rounded-md bg-slate-200/80 text-slate-600 font-semibold">
                Prior Week
              </span>
            </div>
            <div className="my-2.5">
              <p className="text-2xl font-extrabold text-slate-900">
                {pAdh}%
              </p>
              <div className="w-full bg-slate-200/80 h-1.5 rounded-full overflow-hidden mt-2">
                <div
                  className="h-full bg-slate-400 rounded-full transition-all duration-500"
                  style={{ width: `${Math.min(100, Math.max(4, pAdh))}%` }}
                />
              </div>
            </div>
            <div className="flex items-center justify-between text-[11px] font-medium pt-1 border-t border-slate-200/60">
              <span className="text-slate-600 font-semibold">{pTaken} taken</span>
              <span className="text-slate-400 font-semibold">{pSkipped} skipped</span>
            </div>
          </div>

          {/* 30-Day Benchmark Window */}
          <div className="bg-teal-50/40 rounded-2xl p-4 border border-teal-200/60 flex flex-col justify-between">
            <div className="flex items-center justify-between">
              <span className="text-xs font-bold text-teal-950">30-Day Total</span>
              <span className="text-[10px] px-2 py-0.5 rounded-md bg-teal-100 text-teal-800 font-bold">
                Monthly
              </span>
            </div>
            <div className="my-2.5">
              <p className="text-2xl font-extrabold text-teal-700">
                {mAdh}%
              </p>
              <div className="w-full bg-teal-100 h-1.5 rounded-full overflow-hidden mt-2">
                <div
                  className="h-full bg-teal-600 rounded-full transition-all duration-500"
                  style={{ width: `${Math.min(100, Math.max(4, mAdh))}%` }}
                />
              </div>
            </div>
            <div className="flex items-center justify-between text-[11px] font-medium pt-1 border-t border-teal-200/50">
              <span className="text-teal-800 font-semibold">{mTaken} taken</span>
              <span className="text-rose-600 font-semibold">{mSkipped} skipped</span>
            </div>
          </div>
        </div>

        {/* 30-Day Dose Intake Ratio Bar */}
        <div className="mt-5 p-4 rounded-xl bg-slate-50/80 border border-slate-200/70 space-y-2.5">
          <div className="flex items-center justify-between text-xs">
            <div className="flex items-center gap-1.5 font-bold text-slate-700">
              <Layers className="w-3.5 h-3.5 text-slate-500" />
              <span>30-Day Intake Distribution (Completed Doses)</span>
            </div>
            <span className="font-semibold text-slate-600">
              {mTotal} doses total
            </span>
          </div>

          {/* Dual Segment Progress Bar */}
          <div className="h-3 bg-slate-200/70 rounded-full overflow-hidden flex">
            <div
              className="bg-teal-500 h-full transition-all duration-500"
              style={{ width: `${mTotal > 0 ? (mTaken / mTotal) * 100 : 0}%` }}
              title={`Taken: ${mTaken} (${takenPct}%)`}
            />
            <div
              className="bg-rose-400 h-full transition-all duration-500"
              style={{ width: `${mTotal > 0 ? (mSkipped / mTotal) * 100 : 0}%` }}
              title={`Skipped: ${mSkipped} (${skippedPct}%)`}
            />
          </div>

          <div className="flex items-center justify-between text-[11px] text-slate-500 font-medium pt-0.5">
            <span className="flex items-center gap-1.5">
              <span className="w-2 h-2 rounded-full bg-teal-500" />
              <span>Taken: <strong className="text-slate-800">{mTaken}</strong> ({takenPct}%)</span>
            </span>
            <span className="flex items-center gap-1.5">
              <span className="w-2 h-2 rounded-full bg-rose-400" />
              <span>Skipped: <strong className="text-slate-800">{mSkipped}</strong> ({skippedPct}%)</span>
            </span>
          </div>
        </div>
      </div>

      {/* Footer Navigation */}
      <div className="mt-5 pt-3.5 border-t border-slate-100 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2 text-xs">
        <span className="text-slate-400 text-[11px]">
          Velocity Shift = Current 7-Day ({cAdh}%) − Prior 7-Day ({pAdh}%)
        </span>
        <Link
          to="/app/adherence"
          className="font-bold text-teal-600 hover:text-teal-700 inline-flex items-center gap-1 transition-colors self-start sm:self-auto"
        >
          <span>View Daily Adherence Logs</span>
          <ArrowRight className="w-3.5 h-3.5" />
        </Link>
      </div>
    </div>
  )
}

export default AdherenceVelocityCard
