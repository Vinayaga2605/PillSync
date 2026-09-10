export const ADMIN_MENU = [
  { label: "Dashboard", icon: "Γûñ", to: "/dashboard/admin" },
  { label: "User Management", icon: "≡ƒæÑ", to: "/dashboard/admin/users" },
  { label: "Reports", icon: "Γûª", to: "/dashboard/admin/reports" },
  { label: "System Analytics", icon: "≡ƒôè", to: "/dashboard/admin/analytics" },
  { label: "Patients", icon: "Γùö", to: "/dashboard/admin/patients" },
  { label: "Refills", icon: "ΓÖ╗∩╕Å", to: "/dashboard/admin/refills" },
  { label: "Medicine Database", icon: "≡ƒÆè", to: "/dashboard/admin/medicines" },
  { label: "Notifications", icon: "≡ƒöö", to: "/notifications" },
  {
    label: "My Profile",
    icon: "Γùë",
    to: "/profile",
    children: [
      { label: "System Logs", icon: "≡ƒùé∩╕Å", to: "/dashboard/admin/logs" },
      { label: "OCR Analytics", icon: "≡ƒöì", to: "/dashboard/admin/ocr" },
    ],
  },
];

export const CAREGIVER_MENU = [
  { label: "Overview", icon: "Γûñ", to: "/dashboard/caregiver" },
  { label: "My Patients", icon: "Γùö", to: "/dashboard/caregiver/patients" },
  { label: "Patient Requests", icon: "≡ƒôÑ", to: "/dashboard/caregiver/requests" },
  { label: "Alerts", icon: "Γ¥ù", to: "/dashboard/caregiver/alerts" },
  { label: "Notifications", icon: "≡ƒöö", to: "/notifications" },
  { label: "My Profile", icon: "Γùë", to: "/profile" },
];

export const PATIENT_MENU = [
  { label: "Overview", icon: "Γûñ", to: "/dashboard/patient" },
  { label: "My Medicines", icon: "Γ£Ü", to: "/dashboard/patient/medicines" },
  { label: "Scan Prescription", icon: "≡ƒô╖", to: "/dashboard/patient/scan" },
  { label: "Notifications", icon: "≡ƒöö", to: "/notifications" },
  { label: "My Profile", icon: "Γùë", to: "/profile" },
];

export const MENUS = {
  admin: ADMIN_MENU,
  caregiver: CAREGIVER_MENU,
  patient: PATIENT_MENU,
};

export const getMenu = (role) => MENUS[role] || ADMIN_MENU;




