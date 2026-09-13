import React from 'react'
import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom'
import { AuthProvider, useAuth } from './context/AuthContext'
import { NotificationProvider } from './context/NotificationContext'
import { ProtectedRoute } from './components/ProtectedRoute'
import { AppLayout } from './components/layout/AppLayout'
import { LoginPage } from './pages/auth/LoginPage'
import { RegisterPage } from './pages/auth/RegisterPage'
import { DashboardPage } from './pages/app/DashboardPage'
import { ProfilePage } from './pages/app/ProfilePage'
import { MedicinesPage } from './pages/app/MedicinesPage'
import { AdherencePage } from './pages/app/AdherencePage'
import { PatientInsightsPage } from './pages/patient/PatientInsightsPage'
import { PatientInsightsHistoryPage } from './pages/patient/PatientInsightsHistoryPage'
import { MedicationHistoryPage } from './pages/app/MedicationHistoryPage'
import { NotificationsPage } from './pages/app/NotificationsPage'
import { CaregiverDashboardPage } from './pages/caregiver/CaregiverDashboardPage'
import { CaregiverPatientsPage } from './pages/caregiver/CaregiverPatientsPage'
import { CaregiverPatientDetailPage } from './pages/caregiver/CaregiverPatientDetailPage'
import { CaregiverNotificationsPage } from './pages/caregiver/CaregiverNotificationsPage'
import { AdminDashboardPage } from './pages/admin/AdminDashboardPage'
import { AdminAnalyticsPage } from './pages/admin/AdminAnalyticsPage'
import { AdminUsersPage } from './pages/admin/AdminUsersPage'
import { AdminUserDetailPage } from './pages/admin/AdminUserDetailPage'
import { AdminPatientsPage } from './pages/admin/AdminPatientsPage'
import { AdminPatientDetailPage } from './pages/admin/AdminPatientDetailPage'
import { AdminCaregiversPage } from './pages/admin/AdminCaregiversPage'
import { AdminCaregiverDetailPage } from './pages/admin/AdminCaregiverDetailPage'
import { AdminRelationshipsPage } from './pages/admin/AdminRelationshipsPage'

// Dynamic index redirection based on user role
const RoleBasedRedirect = () => {
  const { user } = useAuth()
  if (user?.role === 'ADMIN') {
    return <Navigate to="/app/admin/dashboard" replace />
  }
  if (user?.role === 'CAREGIVER') {
    return <Navigate to="/app/caregiver/dashboard" replace />
  }
  return <Navigate to="/app/dashboard" replace />
}

function App() {
  return (
    <BrowserRouter>
      <AuthProvider>
        <NotificationProvider>
          <Routes>
            {/* Public Authentication Routes */}
            <Route path="/login" element={<LoginPage />} />
            <Route path="/register" element={<RegisterPage />} />

            {/* Protected Application Area */}
            <Route
              path="/app"
              element={
                <ProtectedRoute>
                  <AppLayout />
                </ProtectedRoute>
              }
            >
              {/* Dynamic Root Redirection */}
              <Route index element={<RoleBasedRedirect />} />

              {/* Patient Portal Routes */}
              <Route
                path="dashboard"
                element={
                  <ProtectedRoute allowedRoles={['PATIENT', 'ADMIN']}>
                    <DashboardPage />
                  </ProtectedRoute>
                }
              />
              <Route
                path="medicines"
                element={
                  <ProtectedRoute allowedRoles={['PATIENT', 'ADMIN']}>
                    <MedicinesPage />
                  </ProtectedRoute>
                }
              />
              <Route
                path="adherence"
                element={
                  <ProtectedRoute allowedRoles={['PATIENT', 'ADMIN']}>
                    <AdherencePage />
                  </ProtectedRoute>
                }
              />
              <Route
                path="insights"
                element={
                  <ProtectedRoute allowedRoles={['PATIENT']}>
                    <PatientInsightsPage />
                  </ProtectedRoute>
                }
              />
              <Route
                path="insights/history"
                element={
                  <ProtectedRoute allowedRoles={['PATIENT']}>
                    <PatientInsightsHistoryPage />
                  </ProtectedRoute>
                }
              />
              <Route
                path="history"
                element={
                  <ProtectedRoute allowedRoles={['PATIENT', 'ADMIN']}>
                    <MedicationHistoryPage />
                  </ProtectedRoute>
                }
              />
              <Route
                path="notifications"
                element={
                  <ProtectedRoute allowedRoles={['PATIENT', 'ADMIN']}>
                    <NotificationsPage />
                  </ProtectedRoute>
                }
              />

              {/* Caregiver Portal Routes */}
              <Route
                path="caregiver/dashboard"
                element={
                  <ProtectedRoute allowedRoles={['CAREGIVER', 'ADMIN']}>
                    <CaregiverDashboardPage />
                  </ProtectedRoute>
                }
              />
              <Route
                path="caregiver/patients"
                element={
                  <ProtectedRoute allowedRoles={['CAREGIVER', 'ADMIN']}>
                    <CaregiverPatientsPage />
                  </ProtectedRoute>
                }
              />
              <Route
                path="caregiver/patients/:patientId"
                element={
                  <ProtectedRoute allowedRoles={['CAREGIVER', 'ADMIN']}>
                    <CaregiverPatientDetailPage />
                  </ProtectedRoute>
                }
              />
              <Route
                path="caregiver/notifications"
                element={
                  <ProtectedRoute allowedRoles={['CAREGIVER', 'ADMIN']}>
                    <CaregiverNotificationsPage />
                  </ProtectedRoute>
                }
              />
              {/* Admin Portal Routes */}
              <Route
                path="admin/dashboard"
                element={
                  <ProtectedRoute allowedRoles={['ADMIN']}>
                    <AdminDashboardPage />
                  </ProtectedRoute>
                }
              />
              <Route
                path="admin/analytics"
                element={
                  <ProtectedRoute allowedRoles={['ADMIN']}>
                    <AdminAnalyticsPage />
                  </ProtectedRoute>
                }
              />
              <Route
                path="admin/users"
                element={
                  <ProtectedRoute allowedRoles={['ADMIN']}>
                    <AdminUsersPage />
                  </ProtectedRoute>
                }
              />
              <Route
                path="admin/users/:userId"
                element={
                  <ProtectedRoute allowedRoles={['ADMIN']}>
                    <AdminUserDetailPage />
                  </ProtectedRoute>
                }
              />
              <Route
                path="admin/patients"
                element={
                  <ProtectedRoute allowedRoles={['ADMIN']}>
                    <AdminPatientsPage />
                  </ProtectedRoute>
                }
              />
              <Route
                path="admin/patients/:patientId"
                element={
                  <ProtectedRoute allowedRoles={['ADMIN']}>
                    <AdminPatientDetailPage />
                  </ProtectedRoute>
                }
              />
              <Route
                path="admin/caregivers"
                element={
                  <ProtectedRoute allowedRoles={['ADMIN']}>
                    <AdminCaregiversPage />
                  </ProtectedRoute>
                }
              />
              <Route
                path="admin/caregivers/:caregiverId"
                element={
                  <ProtectedRoute allowedRoles={['ADMIN']}>
                    <AdminCaregiverDetailPage />
                  </ProtectedRoute>
                }
              />
              <Route
                path="admin/relationships"
                element={
                  <ProtectedRoute allowedRoles={['ADMIN']}>
                    <AdminRelationshipsPage />
                  </ProtectedRoute>
                }
              />

              {/* Shared User Profile */}
              <Route path="profile" element={<ProfilePage />} />
            </Route>

            {/* Default Root & Fallback Redirection */}
            <Route
              path="/"
              element={
                <ProtectedRoute>
                  <RoleBasedRedirect />
                </ProtectedRoute>
              }
            />
            <Route
              path="*"
              element={
                <ProtectedRoute>
                  <RoleBasedRedirect />
                </ProtectedRoute>
              }
            />
          </Routes>
        </NotificationProvider>
      </AuthProvider>
    </BrowserRouter>
  )
}

export default App
