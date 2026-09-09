const envBase = import.meta.env.VITE_API_BASE_URL;
const currentHost = typeof window !== "undefined" && window.location ? window.location.hostname : "localhost";
const API_BASE = envBase || (currentHost ? `http://${currentHost}:8004` : "http://localhost:8004");


function getToken() {
  return localStorage.getItem("pillsync_token");
}

export function setToken(token) {
  if (token) localStorage.setItem("pillsync_token", token);
  else localStorage.removeItem("pillsync_token");
}

async function request(path, options = {}) {
  const headers = {
    "Content-Type": "application/json",
  };

  const token = getToken();
  if (token) headers.Authorization = `Bearer ${token}`;

  const res = await fetch(`${API_BASE}${path}`, {
    headers,
    ...options,
  });

  const data = await res.json().catch(() => ({}));

  if (!res.ok) {
    if (res.status === 401) {
      setToken(null);
      localStorage.removeItem("pillsync_user");
      window.dispatchEvent(new Event("pillsync-unauthorized"));
    }
    const message =
      (data && typeof data.detail === "string" && data.detail) ||
      (Array.isArray(data?.detail) && data.detail.map((d) => d.msg).join(", ")) ||
      "Something went wrong";
    throw new Error(message);
  }

  return data;
}

/* ---------------- Auth ---------------- */
export const login = async ({ email, password, role }) => {
  const data = await request("/api/auth/login", {
    method: "POST",
    body: JSON.stringify({ email, password, role }),
  });
  setToken(data.access_token);
  localStorage.setItem("pillsync_user", JSON.stringify(data));
  return data;
};

export const register = ({ full_name, email, password, phone, role }) =>
  request("/api/auth/register", {
    method: "POST",
    body: JSON.stringify({ full_name, email, password, phone, role }),
  });

export const logout = () => {
  setToken(null);
  localStorage.removeItem("pillsync_user");
};

/* ---------------- My Account / Profile ---------------- */
export const fetchMyAccount = () => request("/api/users/me");

export const updateMyAccount = (payload) =>
  request("/api/users/me", {
    method: "PATCH",
    body: JSON.stringify(payload),
  });

/* ---------------- Medicines ---------------- */
export const fetchMedicines = () => request("/api/medicines");

export const addMedicine = (payload) =>
  request("/api/medicines", {
    method: "POST",
    body: JSON.stringify(payload),
  });

/* ---------------- Patient medication schedule ---------------- */
export const fetchMySchedule = () => request("/api/medications/schedule");

export const takeMedicine = (scheduleId) =>
  request(`/api/medications/${scheduleId}/take`, { method: "POST" });

export const addSchedule = (payload) =>
  request("/api/medications/schedules", {
    method: "POST",
    body: JSON.stringify(payload),
  });

/* ---------------- Reminders ---------------- */
export const fetchTodayReminders = () => request("/api/reminders");

/* ---------------- Patients / Profile ---------------- */
export const fetchMyProfile = () => request("/api/patients/me");

export const saveMyProfile = (payload) =>
  request("/api/patients/me", {
    method: "POST",
    body: JSON.stringify(payload),
  });

export const fetchAllPatients = () => request("/api/patients");

export const fetchPatientsWithMedications = () =>
  request("/api/patients/with-medications");

export const fetchAvailableCaregivers = () =>
  request("/api/patients/caregivers");

export const requestCaregiver = (caregiverId) =>
  request(`/api/patients/request-caregiver?caregiver_id=${caregiverId}`, {
    method: "POST",
  });

/* ---------------- Admin Panel ---------------- */
export const fetchAdminUsers = (params) =>
  request(`/api/admin/users?${new URLSearchParams(params).toString()}`);

export const createAdminUser = (payload) =>
  request("/api/admin/users", {
    method: "POST",
    body: JSON.stringify(payload),
  });

export const updateAdminUser = (userId, payload) =>
  request(`/api/admin/users/${userId}`, {
    method: "PATCH",
    body: JSON.stringify(payload),
  });

export const deleteAdminUser = (userId) =>
  request(`/api/admin/users/${userId}`, { method: "DELETE" });

export const fetchAdminUserDetail = (userId) =>
  request(`/api/admin/users/${userId}`);

export const updateUserStatus = (userId, is_active) =>
  request(`/api/admin/users/${userId}/status`, {
    method: "PATCH",
    body: JSON.stringify({ is_active }),
  });

export const assignCaregiver = (patientId, caregiverId) =>
  request(`/api/admin/users/${patientId}/assign-caregiver`, {
    method: "POST",
    body: JSON.stringify({ caregiver_id: caregiverId }),
  });

export const removeCaregiver = (patientId) =>
  request(`/api/admin/users/${patientId}/assign-caregiver`, {
    method: "DELETE",
  });

export const fetchAdminReports = () => request("/api/admin/reports");

export const fetchReport = (reportType, { startDate, endDate } = {}) => {
  const params = new URLSearchParams();
  if (startDate) params.set("start_date", startDate);
  if (endDate) params.set("end_date", endDate);
  const qs = params.toString();
  return request(`/api/admin/reports/${reportType}${qs ? `?${qs}` : ""}`);
};

export const exportReport = (reportType, fmt, { startDate, endDate } = {}) => {
  const params = new URLSearchParams({ fmt });
  if (startDate) params.set("start_date", startDate);
  if (endDate) params.set("end_date", endDate);
  return downloadExport(
    `/api/admin/reports/${reportType}/export?${params.toString()}`,
    `pillsync_${reportType}_report.${fmt}`
  );
};

export const fetchAdminAnalytics = () => request("/api/admin/analytics");

export const fetchAdminDashboard = () => request("/api/admin/dashboard");

export const fetchAdminRefills = () => request("/api/admin/refills");

export const fetchAdminSystemLogs = (action) =>
  request(`/api/admin/system-logs${action ? `?action=${action}` : ""}`);

export const fetchAdminLoginHistory = () =>
  request("/api/admin/login-history");

export const fetchAdminNotificationLogs = () =>
  request("/api/admin/notification-logs");

export const fetchAdminOcr = () => request("/api/admin/ocr");

export const globalSearch = (q) =>
  request(`/api/admin/search?q=${encodeURIComponent(q)}`);

export const downloadExport = async (path, filename) => {
  const token = getToken();
  const res = await fetch(`${API_BASE}${path}`, {
    headers: token ? { Authorization: `Bearer ${token}` } : {},
  });
  if (!res.ok) throw new Error("Export failed");
  const blob = await res.blob();
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = filename;
  a.click();
  URL.revokeObjectURL(url);
};

/* ---------------- Caregiver ---------------- */
export const fetchMyPatients = () => request("/api/caregiver/patients");

export const fetchCaregiverAlerts = () => request("/api/caregiver/alerts");

export const fetchCaregiverRequests = () => request("/api/caregiver/requests");

export const acceptCaregiverRequest = (patientId) =>
  request(`/api/caregiver/requests/${patientId}/accept`, { method: "POST" });

export const declineCaregiverRequest = (patientId) =>
  request(`/api/caregiver/requests/${patientId}/decline`, { method: "POST" });

export const addPatientToCaregiver = (patientId) =>
  request(`/api/caregiver/patients/${patientId}/add`, { method: "POST" });

export const fetchNotifications = () => request("/api/notifications");

export const markNotificationsRead = () =>
  request("/api/notifications/read", { method: "POST" });

export const markNotificationRead = (id) =>
  request(`/api/notifications/${id}/read`, { method: "POST" });

export const deleteNotification = (id) =>
  request(`/api/notifications/${id}`, { method: "DELETE" });

export const broadcastNotification = (message) =>
  request(`/api/notifications/broadcast?message=${encodeURIComponent(message)}`, {
    method: "POST",
  });

/* ---------------- AI Assistant ---------------- */
export const sendAssistantMessage = (message, conversation_history = []) =>
  request("/api/assistant/chat", {
    method: "POST",
    body: JSON.stringify({ message, conversation_history }),
  });

/* ---------------- Prescription OCR ---------------- */
export const scanPrescriptionFile = async (file) => {
  const token = getToken();
  const formData = new FormData();
  formData.append("file", file);

  const res = await fetch(`${API_BASE}/api/prescriptions/upload`, {
    method: "POST",
    headers: token ? { Authorization: `Bearer ${token}` } : {},
    body: formData,
  });

  const data = await res.json().catch(() => ({}));
  if (!res.ok) {
    const msg = data.detail || "Prescription scan failed";
    throw new Error(msg);
  }
  return data;
};

export const scanPrescriptionCamera = (imageData) =>
  request("/api/prescriptions/camera", {
    method: "POST",
    body: JSON.stringify({ image_data: imageData }),
  });

export const fetchPrescriptionScan = (scanId) =>
  request(`/api/prescriptions/${scanId}`);

export const updateScanItem = (scanId, itemId, payload) =>
  request(`/api/prescriptions/${scanId}/items/${itemId}`, {
    method: "PATCH",
    body: JSON.stringify(payload),
  });

export const confirmPrescriptionScan = (scanId, items) =>
  request(`/api/prescriptions/${scanId}/confirm`, {
    method: "POST",
    body: JSON.stringify({ items }),
  });

export default request;