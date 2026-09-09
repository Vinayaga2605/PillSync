/**
 * PillSync Clean API Client Module
 * Features:
 * - Automated JWT token storage and Authorization header injection
 * - 3-4 essential, high-priority endpoints per folder/module
 */

const API_BASE = import.meta.env?.VITE_API_BASE_URL || "http://127.0.0.1:8004";

// --- Token Management (Automatic Storage) ---
export const tokenStorage = {
  get: () => localStorage.getItem("pillsync_token"),
  set: (token) => {
    if (token) localStorage.setItem("pillsync_token", token);
    else localStorage.removeItem("pillsync_token");
  },
  clear: () => localStorage.removeItem("pillsync_token"),
};

// Generic HTTP Request Wrapper
async function request(endpoint, options = {}) {
  const headers = {
    "Content-Type": "application/json",
    ...options.headers,
  };

  // If body is FormData (e.g. OCR file upload), browser sets boundary header automatically
  if (options.body instanceof FormData) {
    delete headers["Content-Type"];
  }

  const token = tokenStorage.get();
  if (token) {
    headers["Authorization"] = `Bearer ${token}`;
  }

  const response = await fetch(`${API_BASE}${endpoint}`, {
    ...options,
    headers,
  });

  const data = await response.json().catch(() => ({}));

  if (!response.ok) {
    if (response.status === 401) {
      tokenStorage.clear();
    }
    const message = data.detail || data.message || "An API error occurred";
    throw new Error(typeof message === "object" ? JSON.stringify(message) : message);
  }

  return data;
}

// ==========================================
// 1. Authentication & Role Logins (Folder 1)
// ==========================================
export const AuthAPI = {
  /** Automated Token Storage upon Login */
  login: async ({ email, password, role }) => {
    const data = await request("/api/auth/login", {
      method: "POST",
      body: JSON.stringify({ email, password, role }),
    });
    if (data.access_token) {
      tokenStorage.set(data.access_token);
    }
    return data;
  },

  register: (payload) =>
    request("/api/auth/register", {
      method: "POST",
      body: JSON.stringify(payload),
    }),

  logout: () => {
    tokenStorage.clear();
  },
};

// ==========================================
// 2. Admin Module APIs (Folder 2)
// ==========================================
export const AdminAPI = {
  getDashboardStats: () => request("/api/admin/dashboard"),
  listUsers: (page = 1, pageSize = 10) =>
    request(`/api/admin/users?page=${page}&page_size=${pageSize}`),
  getPatientDetail: (userId) => request(`/api/admin/users/${userId}`),
  getRefillAnalytics: () => request("/api/admin/refills"),
};

// ==========================================
// 3. Caregiver Module APIs (Folder 3)
// ==========================================
export const CaregiverAPI = {
  getAssignedPatients: () => request("/api/caregiver/patients"),
  getPatientSchedule: (patientId) =>
    request(`/api/caregiver/patients/${patientId}/medications`),
  acceptLinkRequest: (requestId) =>
    request(`/api/caregiver/requests/${requestId}/accept`, { method: "POST" }),
  getMissedDoseAlerts: () => request("/api/caregiver/alerts"),
};

// ==========================================
// 4. Patient Module APIs (Folder 4)
// ==========================================
export const PatientAPI = {
  getSchedules: () => request("/api/medication/schedules"),
  markDoseTaken: (scheduleId) =>
    request(`/api/medication/take-dose/${scheduleId}`, { method: "POST" }),
  uploadPrescriptionOCR: (file) => {
    const formData = new FormData();
    formData.append("file", file);
    return request("/api/prescriptions/upload", {
      method: "POST",
      body: formData,
    });
  },
  requestCaregiver: (caregiverId) =>
    request(`/api/patients/request-caregiver?caregiver_id=${caregiverId}`, {
      method: "POST",
    }),
};

// ==========================================
// 5. Notifications Inbox APIs (Folder 5)
// ==========================================
export const NotificationsAPI = {
  getInbox: () => request("/api/notifications"),
  markAsRead: (notificationId) =>
    request(`/api/notifications/${notificationId}/read`, { method: "POST" }),
  markAllAsRead: () => request("/api/notifications/read-all", { method: "POST" }),
};

// ==========================================
// 6. AI Assistant API (Folder 6)
// ==========================================
export const AIAssistantAPI = {
  chat: (message, conversationHistory = []) =>
    request("/api/assistant/chat", {
      method: "POST",
      body: JSON.stringify({ message, conversation_history: conversationHistory }),
    }),
};

// Default Combined Export
const pillsyncApi = {
  tokenStorage,
  Auth: AuthAPI,
  Admin: AdminAPI,
  Caregiver: CaregiverAPI,
  Patient: PatientAPI,
  Notifications: NotificationsAPI,
  AIAssistant: AIAssistantAPI,
};

export default pillsyncApi;
