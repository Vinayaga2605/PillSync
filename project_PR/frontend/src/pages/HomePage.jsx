import React from 'react'
import { useAuth } from '../context/AuthContext'
import { Pill, User, Mail, ShieldCheck, LogOut, CheckCircle, Activity, Calendar } from 'lucide-react'

export const HomePage = () => {
  const { user, logout } = useAuth()

  return (
    <div className="min-h-screen bg-slate-50 flex flex-col items-center justify-center p-4 sm:p-6 lg:p-8 relative overflow-hidden">
      {/* Background ambient glow */}
      <div className="absolute top-1/3 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[500px] h-[500px] bg-teal-500/5 rounded-full blur-3xl pointer-events-none"></div>

      <div className="w-full max-w-lg relative z-10">
        {/* Main Card */}
        <div className="bg-white border border-slate-200/80 rounded-2xl p-6 sm:p-8 shadow-xs">
          {/* Header */}
          <div className="flex items-center justify-between border-b border-slate-100 pb-5 mb-6">
            <div className="flex items-center space-x-3">
              <div className="w-11 h-11 rounded-xl bg-teal-600 flex items-center justify-center text-white shadow-sm shadow-teal-600/20">
                <Pill className="w-6 h-6 text-white stroke-[2.2]" />
              </div>
              <div>
                <h1 className="text-lg font-bold text-slate-900">PillSync</h1>
                <p className="text-[11px] text-slate-500 font-medium">Authenticated Session</p>
              </div>
            </div>

            <button
              onClick={logout}
              className="inline-flex items-center space-x-1.5 px-3 py-1.5 rounded-xl bg-slate-100 hover:bg-rose-50 text-slate-600 hover:text-rose-600 border border-slate-200 hover:border-rose-200 text-xs font-semibold transition-all cursor-pointer shadow-xs"
            >
              <LogOut className="w-3.5 h-3.5" />
              <span>Log out</span>
            </button>
          </div>

          {/* User Profile Overview */}
          <div className="space-y-4">
            <div className="p-4 rounded-xl bg-slate-50 border border-slate-200/80 flex items-center space-x-4 shadow-xs">
              <div className="w-12 h-12 rounded-full bg-teal-50 border border-teal-200 flex items-center justify-center text-teal-700 font-bold text-lg">
                {user?.first_name ? user.first_name[0].toUpperCase() : 'U'}
              </div>
              <div className="flex-1 min-w-0">
                <div className="flex items-center space-x-2">
                  <h2 className="text-base font-bold text-slate-900 truncate">
                    {user?.first_name} {user?.last_name}
                  </h2>
                  <span className="inline-flex items-center px-2 py-0.5 rounded-full text-[10px] font-bold uppercase tracking-wider bg-teal-50 text-teal-700 border border-teal-200">
                    {user?.role}
                  </span>
                </div>
                <p className="text-xs text-slate-500 font-medium truncate flex items-center space-x-1 mt-0.5">
                  <Mail className="w-3.5 h-3.5 text-slate-400 shrink-0" />
                  <span>{user?.email}</span>
                </p>
              </div>
            </div>

            {/* Session Verification Badges */}
            <div className="grid grid-cols-2 gap-3 pt-2">
              <div className="p-3 rounded-xl bg-slate-50 border border-slate-200/80 flex items-center space-x-3 shadow-xs">
                <ShieldCheck className="w-5 h-5 text-emerald-600 shrink-0" />
                <div>
                  <p className="text-[11px] font-semibold text-slate-500">JWT Token</p>
                  <p className="text-xs font-bold text-slate-800">Verified & Active</p>
                </div>
              </div>

              <div className="p-3 rounded-xl bg-slate-50 border border-slate-200/80 flex items-center space-x-3 shadow-xs">
                <Activity className="w-5 h-5 text-teal-600 shrink-0" />
                <div>
                  <p className="text-[11px] font-semibold text-slate-500">Database</p>
                  <p className="text-xs font-bold text-slate-800">PostgreSQL (pillsync_db)</p>
                </div>
              </div>
            </div>
          </div>

          {/* Next Steps Notification */}
          <div className="mt-6 p-4 rounded-xl bg-teal-50 border border-teal-200 text-center shadow-xs">
            <p className="text-xs font-bold text-teal-800">
              Authentication setup complete!
            </p>
            <p className="text-[11px] text-teal-700/80 mt-1 font-medium">
              Your session is securely verified with the PillSync FastAPI backend.
            </p>
          </div>
        </div>
      </div>
    </div>
  )
}
