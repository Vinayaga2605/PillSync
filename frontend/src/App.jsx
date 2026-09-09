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
import Medicines from "./pages/patient/Medicines";
import Reminders from "./pages/patient/Reminders";
import MedicineUpload from "./pages/patient/MedicineUpload";
import Analytics from "./pages/analytics/Analytics";
import CaregiverDashboard from "./pages/caregiver/CaregiverDashboard";
import AdminPanel from "./pages/admin/AdminPanel";

import AppLayout from "./components/common/AppLayout";
import ProtectedRoute from "./components/common/ProtectedRoute";


function App() {
  return (
    <BrowserRouter>

      <Routes>

        {/* =================================================
            PUBLIC ROUTES
        ================================================= */}

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


        {/* =================================================
            PROTECTED APPLICATION
        ================================================= */}

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
            path="/medicines"
            element={
              <ProtectedRoute allowedRoles={["patient"]}>
                <Medicines />
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


          {/* ================= ADMIN ================= */}

          <Route
            path="/admin-panel"
            element={
              <ProtectedRoute allowedRoles={["admin"]}>
                <AdminPanel />
              </ProtectedRoute>
            }
          />

        </Route>

      </Routes>

    </BrowserRouter>
  );
}

export default App;