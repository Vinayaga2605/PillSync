import React from "react";
import {
  BrowserRouter,
  Routes,
  Route,
  Navigate,
} from "react-router-dom";

import Login from "./pages/auth/Login";
import Register from "./pages/auth/Register";
import ForgotPassword from "./pages/auth/ForgotPassword";
import ResetPassword from "./pages/auth/ResetPassword";

import PatientDashboard from "./pages/patient/PatientDashboard";
import PatientMyMedicines from "./pages/patient/PatientMyMedicines";
import Medicines from "./pages/patient/Medicines";
import Reminders from "./pages/patient/Reminders";
import MedicineUpload from "./pages/patient/MedicineUpload";

import AddMedicine from "./pages/medicine-management/AddMedicine";
import EditMedicine from "./pages/medicine-management/EditMedicine";
import MedicineDetails from "./pages/medicine-management/MedicineDetails";
import MedicineHistory from "./pages/medicine-management/MedicineHistory";

import Analytics from "./pages/analytics/Analytics";

import CaregiverDashboard from "./pages/caregiver/CaregiverDashboard";
import MyPatients from "./pages/caregiver/MyPatients";
import MedicationMonitoring from "./pages/caregiver/MedicationMonitoring";
import PatientAnalytics from "./pages/caregiver/PatientAnalytics";
import CaregiverAlerts from "./pages/caregiver/CaregiverAlerts";

import AdminDashboard from "./pages/admin/AdminDashboard";
import AdminAnalytics from "./pages/admin/AdminAnalytics";
import AdminMedicineDatabase from "./pages/admin/AdminMedicineDatabase";
import AdminPatients from "./pages/admin/AdminPatients";
import AdminRefills from "./pages/admin/AdminRefills";
import AdminReports from "./pages/admin/AdminReports";
import AdminSystemLogs from "./pages/admin/AdminSystemLogs";
import AdminUserManagement from "./pages/admin/AdminUserManagement";

import Notifications from "./pages/notifications/Notifications";

import Profile from "./pages/account/Profile";
import Settings from "./pages/account/Settings";

import AppLayout from "./components/common/AppLayout";
import ProtectedRoute from "./components/common/ProtectedRoute";

function App() {
  return (
    <BrowserRouter>
      <Routes>
        {/* ================= PUBLIC ================= */}

        <Route
          path="/"
          element={<Navigate to="/login" replace />}
        />

        <Route
          path="/login"
          element={<Login />}
        />

        <Route
          path="/register"
          element={<Register />}
        />

        <Route
          path="/forgot-password"
          element={<ForgotPassword />}
        />

        <Route
          path="/reset-password"
          element={<ResetPassword />}
        />

        {/* ================= PROTECTED APP ================= */}

        <Route element={<AppLayout />}>
          {/* ================= PATIENT ================= */}

          <Route
            path="/patient-dashboard"
            element={
              <ProtectedRoute allowedRoles={["patient"]}>
                <PatientDashboard />
              </ProtectedRoute>
            }
          />

          <Route
            path="/patient-my-medicines"
            element={
              <ProtectedRoute allowedRoles={["patient"]}>
                <PatientMyMedicines />
              </ProtectedRoute>
            }
          />

          <Route
            path="/medicines"
            element={
              <ProtectedRoute allowedRoles={["patient"]}>
                <Medicines />
              </ProtectedRoute>
            }
          />

          <Route
            path="/medicines/add"
            element={
              <ProtectedRoute allowedRoles={["patient"]}>
                <AddMedicine />
              </ProtectedRoute>
            }
          />

          <Route
            path="/medicines/:id/edit"
            element={
              <ProtectedRoute allowedRoles={["patient"]}>
                <EditMedicine />
              </ProtectedRoute>
            }
          />

          <Route
            path="/medicines/:id"
            element={
              <ProtectedRoute allowedRoles={["patient"]}>
                <MedicineDetails />
              </ProtectedRoute>
            }
          />

          <Route
            path="/medicine-history"
            element={
              <ProtectedRoute allowedRoles={["patient"]}>
                <MedicineHistory />
              </ProtectedRoute>
            }
          />

          <Route
            path="/reminders"
            element={
              <ProtectedRoute allowedRoles={["patient"]}>
                <Reminders />
              </ProtectedRoute>
            }
          />

          <Route
            path="/medicine-upload"
            element={
              <ProtectedRoute allowedRoles={["patient"]}>
                <MedicineUpload />
              </ProtectedRoute>
            }
          />

          <Route
            path="/analytics"
            element={
              <ProtectedRoute allowedRoles={["patient"]}>
                <Analytics />
              </ProtectedRoute>
            }
          />

          {/* ================= CAREGIVER ================= */}

          <Route
            path="/caregiver-dashboard"
            element={
              <ProtectedRoute allowedRoles={["caregiver"]}>
                <CaregiverDashboard />
              </ProtectedRoute>
            }
          />

          <Route
            path="/caregiver-patients"
            element={
              <ProtectedRoute allowedRoles={["caregiver"]}>
                <MyPatients />
              </ProtectedRoute>
            }
          />

          <Route
            path="/caregiver-medication-monitoring"
            element={
              <ProtectedRoute allowedRoles={["caregiver"]}>
                <MedicationMonitoring />
              </ProtectedRoute>
            }
          />

          <Route
            path="/caregiver-patient-analytics"
            element={
              <ProtectedRoute allowedRoles={["caregiver"]}>
                <PatientAnalytics />
              </ProtectedRoute>
            }
          />

          <Route
            path="/caregiver-alerts"
            element={
              <ProtectedRoute allowedRoles={["caregiver"]}>
                <CaregiverAlerts />
              </ProtectedRoute>
            }
          />

          {/* ================= ADMIN ================= */}

          <Route
            path="/admin-panel"
            element={
              <ProtectedRoute allowedRoles={["admin"]}>
                <AdminDashboard />
              </ProtectedRoute>
            }
          />

          <Route
            path="/admin-analytics"
            element={
              <ProtectedRoute allowedRoles={["admin"]}>
                <AdminAnalytics />
              </ProtectedRoute>
            }
          />

          <Route
            path="/admin-medicines"
            element={
              <ProtectedRoute allowedRoles={["admin"]}>
                <AdminMedicineDatabase />
              </ProtectedRoute>
            }
          />

          <Route
            path="/admin-patients"
            element={
              <ProtectedRoute allowedRoles={["admin"]}>
                <AdminPatients />
              </ProtectedRoute>
            }
          />

          <Route
            path="/admin-refills"
            element={
              <ProtectedRoute allowedRoles={["admin"]}>
                <AdminRefills />
              </ProtectedRoute>
            }
          />

          <Route
            path="/admin-reports"
            element={
              <ProtectedRoute allowedRoles={["admin"]}>
                <AdminReports />
              </ProtectedRoute>
            }
          />

          <Route
            path="/admin-system-logs"
            element={
              <ProtectedRoute allowedRoles={["admin"]}>
                <AdminSystemLogs />
              </ProtectedRoute>
            }
          />

          <Route
            path="/admin-users"
            element={
              <ProtectedRoute allowedRoles={["admin"]}>
                <AdminUserManagement />
              </ProtectedRoute>
            }
          />

          {/* ================= COMMON NOTIFICATIONS ================= */}

          <Route
            path="/notifications"
            element={
              <ProtectedRoute
                allowedRoles={[
                  "patient",
                  "caregiver",
                  "admin",
                ]}
              >
                <Notifications />
              </ProtectedRoute>
            }
          />

          {/* ================= COMMON PROFILE ================= */}

          <Route
            path="/profile"
            element={
              <ProtectedRoute
                allowedRoles={[
                  "patient",
                  "caregiver",
                  "admin",
                ]}
              >
                <Profile />
              </ProtectedRoute>
            }
          />

          {/* ================= COMMON SETTINGS ================= */}

          <Route
            path="/settings"
            element={
              <ProtectedRoute
                allowedRoles={[
                  "patient",
                  "caregiver",
                  "admin",
                ]}
              >
                <Settings />
              </ProtectedRoute>
            }
          />
        </Route>

        {/* ================= FALLBACK ================= */}

        <Route
          path="*"
          element={<Navigate to="/login" replace />}
        />
      </Routes>
    </BrowserRouter>
  );
}

export default App;
