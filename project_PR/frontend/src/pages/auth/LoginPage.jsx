import React, { useState } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { useAuth } from '../../context/AuthContext'
import {
  Eye,
  EyeOff,
  Lock,
  Mail,
  Pill,
  AlertCircle,
  ArrowRight,
  HeartHandshake,
  Sparkles,
  CheckCircle2,
  Clock,
  Activity,
  ShieldCheck,
  TrendingUp,
} from 'lucide-react'

export const LoginPage = () => {
  const navigate = useNavigate()
  const { login } = useAuth()

  const [formData, setFormData] = useState({
    email: '',
    password: '',
  })
  const [showPassword, setShowPassword] = useState(false)
  const [errors, setErrors] = useState({})
  const [apiError, setApiError] = useState(null)
  const [isSubmitting, setIsSubmitting] = useState(false)

  // Check if session just expired
  const isExpired = new URLSearchParams(window.location.search).get('expired') === '1'

  const validateForm = () => {
    const newErrors = {}
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/

    if (!formData.email.trim()) {
      newErrors.email = 'Email address is required'
    } else if (!emailRegex.test(formData.email.trim())) {
      newErrors.email = 'Please enter a valid email address'
    }

    if (!formData.password) {
      newErrors.password = 'Password is required'
    }

    setErrors(newErrors)
    return Object.keys(newErrors).length === 0
  }

  const handleChange = (e) => {
    const { name, value } = e.target
    setFormData((prev) => ({ ...prev, [name]: value }))
    if (errors[name]) {
      setErrors((prev) => ({ ...prev, [name]: null }))
    }
    if (apiError) setApiError(null)
  }

  const handleLoginWithCredentials = async (email, password) => {
    setIsSubmitting(true)
    setApiError(null)

    try {
      const loggedUser = await login(email.trim(), password)
      if (loggedUser?.role === 'ADMIN') {
        navigate('/app/admin/dashboard', { replace: true })
      } else if (loggedUser?.role === 'CAREGIVER') {
        navigate('/app/caregiver/dashboard', { replace: true })
      } else {
        navigate('/app/dashboard', { replace: true })
      }
    } catch (err) {
      if (err.response) {
        if (err.response.status === 401) {
          setApiError(err.response.data?.detail || 'Invalid email or password')
        } else if (err.response.status === 422) {
          setApiError('Please verify your input fields.')
        } else {
          setApiError('Authentication failed. Please check your connection.')
        }
      } else {
        setApiError('Unable to connect to the server. Please ensure the backend is running.')
      }
    } finally {
      setIsSubmitting(false)
    }
  }

  const handleSubmit = async (e) => {
    e.preventDefault()
    if (!validateForm()) return
    await handleLoginWithCredentials(formData.email, formData.password)
  }

  return (
    <div className="min-h-screen w-full flex flex-col lg:flex-row bg-slate-50">
      {/* ── LEFT SIDE: Brand Showcase & Intelligent Platform Highlights ── */}
      <div className="lg:w-7/12 xl:w-3/5 bg-gradient-to-br from-slate-950 via-teal-950 to-slate-900 text-white p-8 sm:p-12 lg:p-16 flex flex-col justify-between relative overflow-hidden">
        {/* Ambient Decorative Background Glows */}
        <div className="absolute top-0 right-0 w-96 h-96 bg-teal-500/10 rounded-full blur-3xl pointer-events-none" />
        <div className="absolute bottom-10 left-10 w-96 h-96 bg-emerald-500/10 rounded-full blur-3xl pointer-events-none" />

        {/* Top: Brand Header */}
        <div className="relative z-10">
          <div className="flex items-center space-x-3 mb-2">
            <div className="w-11 h-11 rounded-2xl bg-gradient-to-tr from-teal-500 to-emerald-400 p-0.5 shadow-lg shadow-teal-500/20">
              <div className="w-full h-full bg-slate-950/80 rounded-[14px] flex items-center justify-center">
                <Pill className="w-6 h-6 text-teal-300 stroke-[2.2]" />
              </div>
            </div>
            <div>
              <span className="text-2xl font-extrabold tracking-tight text-white">
                Pill<span className="text-teal-400">Sync</span>
              </span>
              <span className="text-[10px] uppercase font-bold tracking-widest px-2 py-0.5 ml-2 rounded-full bg-teal-500/20 text-teal-300 border border-teal-500/30">
                Healthcare AI
              </span>
            </div>
          </div>
          <p className="text-xs text-teal-200/70 font-medium tracking-wide">
            Intelligent Medication Management & Adherence Platform
          </p>
        </div>

        {/* Middle: Value Proposition & Interactive Feature Cards */}
        <div className="my-10 lg:my-0 relative z-10 space-y-8">
          <div>
            <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-white/10 backdrop-blur-md border border-white/15 text-xs text-teal-300 font-semibold mb-4">
              <Sparkles className="w-3.5 h-3.5 text-teal-400" />
              <span>Medication Management Platform</span>
            </div>
            <h2 className="text-3xl sm:text-4xl lg:text-5xl font-extrabold tracking-tight text-white leading-tight">
              Smart Medication Care, <br />
              <span className="bg-gradient-to-r from-teal-300 via-emerald-300 to-teal-100 bg-clip-text text-transparent">
                Made Simple.
              </span>
            </h2>
            <p className="text-sm sm:text-base text-slate-300 mt-4 max-w-xl leading-relaxed">
              Stay on schedule with your daily prescriptions, track your health routine, and keep caregivers connected effortlessly.
            </p>
          </div>

          {/* Clean, Simple Feature Highlights */}
          <div className="space-y-4 max-w-lg">
            <div className="flex items-start space-x-3.5">
              <div className="w-9 h-9 rounded-xl bg-teal-500/20 border border-teal-500/30 flex items-center justify-center text-teal-300 shrink-0 mt-0.5">
                <Clock className="w-4 h-4 text-teal-300" />
              </div>
              <div>
                <h4 className="text-sm font-bold text-white">Timely Dose Reminders</h4>
                <p className="text-xs text-slate-300 mt-0.5 leading-relaxed">
                  Automatic schedules and gentle alerts to keep your daily prescriptions on track.
                </p>
              </div>
            </div>

            <div className="flex items-start space-x-3.5">
              <div className="w-9 h-9 rounded-xl bg-emerald-500/20 border border-emerald-500/30 flex items-center justify-center text-emerald-300 shrink-0 mt-0.5">
                <CheckCircle2 className="w-4 h-4 text-emerald-300" />
              </div>
              <div>
                <h4 className="text-sm font-bold text-white">Effortless Tracking</h4>
                <p className="text-xs text-slate-300 mt-0.5 leading-relaxed">
                  Log your medications in a single tap and monitor your weekly consistency.
                </p>
              </div>
            </div>

            <div className="flex items-start space-x-3.5">
              <div className="w-9 h-9 rounded-xl bg-sky-500/20 border border-sky-500/30 flex items-center justify-center text-sky-300 shrink-0 mt-0.5">
                <HeartHandshake className="w-4 h-4 text-sky-300" />
              </div>
              <div>
                <h4 className="text-sm font-bold text-white">Family & Caregiver Support</h4>
                <p className="text-xs text-slate-300 mt-0.5 leading-relaxed">
                  Keep loved ones and care providers informed with secure role-based access.
                </p>
              </div>
            </div>
          </div>
        </div>

        {/* Bottom: Trust & Security Indicators */}
        <div className="relative z-10 pt-6 border-t border-white/10 flex flex-wrap items-center justify-between gap-4 text-xs text-slate-400 font-medium">
          <div className="flex items-center space-x-4">
            <span className="flex items-center gap-1.5">
              <ShieldCheck className="w-4 h-4 text-teal-400" />
              <span>Encrypted Authentication</span>
            </span>
            <span className="flex items-center gap-1.5">
              <CheckCircle2 className="w-4 h-4 text-teal-400" />
              <span>Multi-Role Isolation</span>
            </span>
          </div>
          <span className="text-[11px] text-slate-500">© 2026 PillSync Platform</span>
        </div>
      </div>

      {/* ── RIGHT SIDE: Sign In Form & 1-Click Demo Logins ── */}
      <div className="lg:w-5/12 xl:w-2/5 flex flex-col justify-center items-center p-6 sm:p-10 lg:p-12 xl:p-16">
        <div className="w-full max-w-md">
          {/* Mobile-Only Header */}
          <div className="lg:hidden flex items-center space-x-2 mb-6">
            <div className="w-9 h-9 rounded-xl bg-teal-600 flex items-center justify-center text-white">
              <Pill className="w-5 h-5" />
            </div>
            <span className="text-xl font-bold text-slate-900">PillSync</span>
          </div>

          <div className="mb-6">
            <h1 className="text-2xl sm:text-3xl font-extrabold text-slate-900 tracking-tight">
              Welcome back
            </h1>
            <p className="text-xs sm:text-sm text-slate-500 mt-1 font-medium">
              Enter your credentials to sign in to your dashboard
            </p>
          </div>

          {/* Session Expired Banner */}
          {isExpired && (
            <div className="mb-5 p-3.5 rounded-xl bg-amber-50 border border-amber-200 flex items-start space-x-3 text-amber-800 text-xs font-semibold">
              <AlertCircle className="w-4 h-4 text-amber-600 shrink-0 mt-0.5" />
              <span>Your session has expired. Please log in again to continue.</span>
            </div>
          )}

          {/* API Error Alert */}
          {apiError && (
            <div className="mb-5 p-3.5 rounded-xl bg-rose-50 border border-rose-200 flex items-start space-x-3 text-rose-700 text-xs font-medium">
              <AlertCircle className="w-4 h-4 text-rose-600 shrink-0 mt-0.5" />
              <span>{apiError}</span>
            </div>
          )}

          <form onSubmit={handleSubmit} className="space-y-4" noValidate>
            {/* Email Field */}
            <div>
              <label htmlFor="email" className="block text-xs font-bold text-slate-700 mb-1.5">
                Email address
              </label>
              <div className="relative">
                <div className="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none text-slate-400">
                  <Mail className="w-4 h-4" />
                </div>
                <input
                  id="email"
                  name="email"
                  type="email"
                  autoComplete="email"
                  value={formData.email}
                  onChange={handleChange}
                  placeholder="name@example.com"
                  className={`w-full pl-10 pr-3.5 py-2.5 bg-white border rounded-xl text-sm text-slate-900 placeholder:text-slate-400 focus:outline-none focus:ring-4 transition-all ${
                    errors.email
                      ? 'border-rose-400 focus:border-rose-500 focus:ring-rose-500/10'
                      : 'border-slate-200 focus:border-teal-500 focus:ring-teal-500/10'
                  }`}
                />
              </div>
              {errors.email && (
                <p className="text-xs text-rose-600 mt-1 font-medium">{errors.email}</p>
              )}
            </div>

            {/* Password Field */}
            <div>
              <div className="flex items-center justify-between mb-1.5">
                <label htmlFor="password" className="block text-xs font-bold text-slate-700">
                  Password
                </label>
              </div>
              <div className="relative">
                <div className="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none text-slate-400">
                  <Lock className="w-4 h-4" />
                </div>
                <input
                  id="password"
                  name="password"
                  type={showPassword ? 'text' : 'password'}
                  autoComplete="current-password"
                  value={formData.password}
                  onChange={handleChange}
                  placeholder="••••••••"
                  className={`w-full pl-10 pr-10 py-2.5 bg-white border rounded-xl text-sm text-slate-900 placeholder:text-slate-400 focus:outline-none focus:ring-4 transition-all ${
                    errors.password
                      ? 'border-rose-400 focus:border-rose-500 focus:ring-rose-500/10'
                      : 'border-slate-200 focus:border-teal-500 focus:ring-teal-500/10'
                  }`}
                />
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  className="absolute inset-y-0 right-0 pr-3 flex items-center text-slate-400 hover:text-slate-600 transition-colors cursor-pointer"
                  aria-label={showPassword ? 'Hide password' : 'Show password'}
                >
                  {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                </button>
              </div>
              {errors.password && (
                <p className="text-xs text-rose-600 mt-1 font-medium">{errors.password}</p>
              )}
            </div>

            {/* Submit Button */}
            <button
              type="submit"
              disabled={isSubmitting}
              className="w-full mt-2 py-2.5 px-4 rounded-xl bg-teal-600 hover:bg-teal-700 text-white font-bold text-sm shadow-sm shadow-teal-600/20 focus:outline-none focus:ring-4 focus:ring-teal-500/20 transition-all disabled:opacity-60 disabled:cursor-not-allowed flex items-center justify-center space-x-2 cursor-pointer"
            >
              {isSubmitting ? (
                <div className="w-5 h-5 border-2 border-white/20 border-t-white rounded-full animate-spin" />
              ) : (
                <>
                  <span>Sign In</span>
                  <ArrowRight className="w-4 h-4" />
                </>
              )}
            </button>
          </form>


          {/* Create Account Link */}
          <div className="mt-6 pt-5 border-t border-slate-200/80 text-center">
            <p className="text-xs text-slate-500 font-medium">
              Don't have an account?{' '}
              <Link
                to="/register"
                className="font-bold text-teal-700 hover:text-teal-800 transition-colors underline-offset-2 hover:underline"
              >
                Create an account
              </Link>
            </p>
          </div>
        </div>
      </div>
    </div>
  )
}

export default LoginPage
