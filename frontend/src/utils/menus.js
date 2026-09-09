export const ADMIN_MENU = [
  { label: "Dashboard", icon: "▤", to: "/dashboard/admin" },
  { label: "User Management", icon: "👥", to: "/dashboard/admin/users" },
  { label: "Reports", icon: "▦", to: "/dashboard/admin/reports" },
  { label: "System Analytics", icon: "📊", to: "/dashboard/admin/analytics" },
  { label: "Patients", icon: "◔", to: "/dashboard/admin/patients" },
  { label: "Refills", icon: "♻️", to: "/dashboard/admin/refills" },
  { label: "Medicine Database", icon: "💊", to: "/dashboard/admin/medicines" },
  { label: "Notifications", icon: "🔔", to: "/notifications" },
  {
    label: "My Profile",
    icon: "◉",
    to: "/profile",
    children: [
      { label: "System Logs", icon: "🗂️", to: "/dashboard/admin/logs" },
      { label: "OCR Analytics", icon: "🔍", to: "/dashboard/admin/ocr" },
    ],
  },
];

export const CAREGIVER_MENU = [
  { label: "Overview", icon: "▤", to: "/dashboard/caregiver" },
  { label: "My Patients", icon: "◔", to: "/dashboard/caregiver/patients" },
  { label: "Patient Requests", icon: "📥", to: "/dashboard/caregiver/requests" },
  { label: "Alerts", icon: "❗", to: "/dashboard/caregiver/alerts" },
  { label: "Notifications", icon: "🔔", to: "/notifications" },
  { label: "My Profile", icon: "◉", to: "/profile" },
];

export const PATIENT_MENU = [
  { label: "Overview", icon: "▤", to: "/dashboard/patient" },
  { label: "My Medicines", icon: "✚", to: "/dashboard/patient/medicines" },
  { label: "Scan Prescription", icon: "📷", to: "/dashboard/patient/scan" },
  { label: "Notifications", icon: "🔔", to: "/notifications" },
  { label: "My Profile", icon: "◉", to: "/profile" },
];

export const MENUS = {
  admin: ADMIN_MENU,
  caregiver: CAREGIVER_MENU,
  patient: PATIENT_MENU,
};

export const getMenu = (role) => MENUS[role] || ADMIN_MENU;
