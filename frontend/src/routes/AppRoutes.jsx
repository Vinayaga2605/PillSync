import { lazy, Suspense } from "react";
import { Routes, Route } from "react-router-dom";

const HomePage = lazy(() => import("../pages/HomePage"));
const LoginPage = lazy(() => import("../pages/LoginPage"));
const RegisterPage = lazy(() => import("../pages/RegisterPage"));
const ProfilePage = lazy(() => import("../pages/ProfilePage"));
const NotificationsPage = lazy(() => import("../pages/NotificationsPage"));

const PatientDashboard = lazy(() => import("../pages/PatientDashboard"));
const PatientMyMedicines = lazy(() => import("../pages/PatientMyMedicines"));
const ScanPrescription = lazy(() => import("../pages/ScanPrescription"));

const CaregiverDashboard = lazy(() => import("../pages/CaregiverDashboard"));
const CaregiverPatients = lazy(() => import("../pages/CaregiverPatients"));
const CaregiverRequests = lazy(() => import("../pages/CaregiverRequests"));
const CaregiverAlerts = lazy(() => import("../pages/CaregiverAlerts"));

const AdminDashboard = lazy(() => import("../pages/AdminDashboard"));
const AdminUserManagement = lazy(() => import("../pages/AdminUserManagement"));
const AdminReports = lazy(() => import("../pages/AdminReports"));
const AdminAnalytics = lazy(() => import("../pages/AdminAnalytics"));
const AdminOcr = lazy(() => import("../pages/AdminOcr"));
const AdminSystemLogs = lazy(() => import("../pages/AdminSystemLogs"));
const AdminPatients = lazy(() => import("../pages/AdminPatients"));
const AdminRefills = lazy(() => import("../pages/AdminRefills"));
const AdminMedicineDatabase = lazy(() => import("../pages/AdminMedicineDatabase"));

const fallback = (
  <div style={{ padding: 48, textAlign: "center", color: "var(--muted)" }}>
    Loading…
  </div>
);

const AppRoutes = () => {
  return (
    <Suspense fallback={fallback}>
      <Routes>
        <Route path="/" element={<HomePage />} />

        <Route path="/login/:role" element={<LoginPage />} />

        <Route path="/register/:role" element={<RegisterPage />} />

        <Route path="/dashboard/patient" element={<PatientDashboard />} />
        <Route path="/dashboard/patient/medicines" element={<PatientMyMedicines />} />
        <Route path="/dashboard/patient/scan" element={<ScanPrescription />} />

        <Route path="/dashboard/caregiver" element={<CaregiverDashboard />} />
        <Route path="/dashboard/caregiver/patients" element={<CaregiverPatients />} />
        <Route path="/dashboard/caregiver/requests" element={<CaregiverRequests />} />
        <Route path="/dashboard/caregiver/alerts" element={<CaregiverAlerts />} />

        <Route path="/dashboard/admin" element={<AdminDashboard />} />
        <Route path="/dashboard/admin/users" element={<AdminUserManagement />} />
        <Route path="/dashboard/admin/reports" element={<AdminReports />} />
        <Route path="/dashboard/admin/analytics" element={<AdminAnalytics />} />
        <Route path="/dashboard/admin/ocr" element={<AdminOcr />} />
        <Route path="/dashboard/admin/logs" element={<AdminSystemLogs />} />
        <Route path="/dashboard/admin/patients" element={<AdminPatients />} />
        <Route path="/dashboard/admin/refills" element={<AdminRefills />} />
        <Route path="/dashboard/admin/medicines" element={<AdminMedicineDatabase />} />

        <Route path="/profile" element={<ProfilePage />} />
        <Route path="/notifications" element={<NotificationsPage />} />
      </Routes>
    </Suspense>
  );
};

export default AppRoutes;