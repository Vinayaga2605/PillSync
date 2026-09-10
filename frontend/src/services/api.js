import axios from "axios";
import adminService from "./adminService";
import medicationService from "./medicationService";
import reminderService from "./reminderService";
import refillService from "./refillService";

const api = axios.create({
  baseURL: "http://localhost:8000/api",
});

api.interceptors.request.use((config) => {
  const token = localStorage.getItem("access_token");

  if (token) {
    config.headers.Authorization = `Bearer ${token}`;
  }

  return config;
});

api.interceptors.response.use(
  (response) => response,
  (error) => {
    if (error.response?.status === 401) {
      localStorage.removeItem("access_token");
      localStorage.removeItem("refresh_token");
      localStorage.removeItem("user");

      if (window.location.pathname !== "/login") {
        window.location.href = "/login";
      }
    }

    return Promise.reject(error);
  }
);

/* =====================================================
   ADMIN
===================================================== */

export const fetchAdminDashboard = async () => {
  const response = await adminService.getSystemStats();
  const data = response.data || {};

  return {
    stats: {
      users: data.totalUsers || 0,
      patients: data.totalPatients || 0,
      caregivers: data.totalCaregivers || 0,
      admins: data.totalAdmins || 0,
      medications: data.totalMedications || 0,
      scheduled_doses: 0,
      taken_today: 0,
      missed_today: 0,
      notifications_today: 0,
      low_stock_medicines: [],
    },

    adherence_7d: data.overallAdherence || 0,

    status: {
      status: "Healthy",
      db_connected: true,
      api_available: true,
      pending_notifications: 0,
      missed_dose_pct: 0,
      reasons: [],
    },

    recent_activity: [],
  };
};

export const fetchAdminAnalytics = async () => {
  const response = await api.get("/analytics/weekly-report/");
  return response.data;
};

export const fetchMedicines = async () => {
  const response = await medicationService.getActiveMedicines();

  return (
    response.data?.results ||
    response.data ||
    []
  );
};

export const addMedicine = async (data) => {
  const response =
    await medicationService.createMedicine(data);

  return response.data;
};

export const fetchPatientsWithMedications = async () => {
  const response = await adminService.getUsers({
    role: "patient",
  });

  return (
    response.data?.results ||
    response.data ||
    []
  );
};

export const fetchAdminRefills = async () => {
  try {
    const response =
      await refillService.getRefillAlerts();

    return (
      response.data?.results ||
      response.data ||
      []
    );
  } catch {
    return [];
  }
};

export const fetchAdminReports = async () => {
  return [];
};

export const fetchReport = async () => {
  return {};
};

export const exportReport = async () => {
  return null;
};

/* =====================================================
   SYSTEM LOGS
===================================================== */

export const fetchAdminSystemLogs = async () => {
  return [];
};

export const fetchAdminLoginHistory = async () => {
  return [];
};

export const fetchAdminNotificationLogs = async () => {
  return [];
};

/* =====================================================
   PROFILE
===================================================== */

export const fetchMyAccount = async () => {
  const response = await api.get("/auth/me/");
  return response.data;
};

/* =====================================================
   OCR
===================================================== */

export const fetchAdminOcr = async () => {
  return {
    total_uploads: 0,
    successful: 0,
    failed: 0,
    avg_processing_time_ms: 0,
  };
};

/* =====================================================
   PATIENT
===================================================== */

export const fetchMySchedule = async () => {
  const response =
    await reminderService.getTodayReminders();

  return (
    response.data?.results ||
    response.data ||
    []
  );
};

export const takeMedicine = async (id) => {
  const response =
    await reminderService.updateReminderStatus(
      id,
      "taken"
    );

  return response.data;
};

export const addSchedule = async (data) => {
  const response =
    await reminderService.createReminder(data);

  return response.data;
};

/* =====================================================
   CAREGIVER
===================================================== */

export const fetchAvailableCaregivers = async () => {
  const response =
    await adminService.getCaregivers();

  return (
    response.data?.results ||
    response.data ||
    []
  );
};

export const requestCaregiver = async (
  caregiverId
) => {
  const response = await api.post(
    "/caregiver/request/",
    {
      caregiver_id: caregiverId,
    }
  );

  return response.data;
};

/* =====================================================
   AI ASSISTANT
===================================================== */

export const sendAssistantMessage = async (message) => {
  return {
    message:
      "AI assistant backend integration will be connected later.",
    input: message,
  };
};

export default api;