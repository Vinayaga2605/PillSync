import axios from "axios";
import adminService from "./adminService";
import medicationService from "./medicationService";
import reminderService from "./reminderService";

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
  const response = await api.get("/analytics/admin-report/");
  return response.data;
};

export const fetchMedicines = async () => {
  const response = await api.get("/medications/admin-catalog/");
  return response.data?.results || response.data || [];
};

export const addMedicine = async (data) => {
  const response = await api.post(
    "/medications/admin-catalog/",
    data
  );

  return response.data;
};

export const fetchPatientsWithMedications = async () => {
  const response = await adminService.getUsers({
    role: "patient",
  });

  const users =
    response.data?.users ||
    response.data?.results ||
    response.data ||
    [];

  if (!Array.isArray(users)) {
    return [];
  }

  const patients = await Promise.all(
    users.map(async (patient) => {
      try {
        const detailResponse =
          await adminService.getUserDetail(patient.id);

        const detail = detailResponse.data || {};

        return {
          ...patient,
          ...detail,
          medications: Array.isArray(detail.medications)
            ? detail.medications
            : [],
        };
      } catch (error) {
        console.error(
          `Unable to load patient details for ${patient.id}:`,
          error
        );

        return {
          ...patient,
          medications: [],
        };
      }
    })
  );

  return patients;
};

export const fetchAdminRefills = async () => {
  const response = await api.get(
    "/refill/admin-forecast/"
  );

  return response.data || [];
};

export const fetchAdminReports = async () => {
  const response = await api.get("/admin/reports/");
  return response.data;
};

export const fetchReport = async (
  reportType,
  params = {}
) => {
  const response = await api.get(
    `/admin/reports/${reportType}/`,
    { params }
  );

  return response.data;
};

export const exportReport = async (
  reportType,
  format,
  params = {}
) => {
  const response = await api.get(
    `/admin/reports/${reportType}/export/`,
    {
      params: {
        ...params,
        format,
      },
      responseType: "blob",
    }
  );

  const contentDisposition =
    response.headers["content-disposition"];

  let filename = `pillsync-${reportType}.${format}`;

  if (contentDisposition) {
    const match = contentDisposition.match(
      /filename="?([^"]+)"?/i
    );

    if (match?.[1]) {
      filename = match[1];
    }
  }

  const blob = new Blob([response.data], {
    type:
      response.headers["content-type"] ||
      "application/octet-stream",
  });

  const url = window.URL.createObjectURL(blob);

  const link = document.createElement("a");
  link.href = url;
  link.download = filename;

  document.body.appendChild(link);
  link.click();
  link.remove();

  window.URL.revokeObjectURL(url);

  return true;
};

export const fetchAdminSystemLogs = async () => {
  const response = await api.get(
    "/admin/system-logs/"
  );

  return response.data;
};

export const fetchAdminLoginHistory = async () => {
  const response = await api.get(
    "/admin/login-history/"
  );

  return response.data;
};

export const fetchAdminNotificationLogs = async () => {
  const response = await api.get(
    "/admin/notification-logs/"
  );

  return response.data;
};

export const fetchMyAccount = async () => {
  const response = await api.get("/auth/me/");
  return response.data;
};

export const fetchAdminOcr = async () => ({
  total_uploads: 0,
  successful: 0,
  failed: 0,
  avg_processing_time_ms: 0,
});

export const fetchMySchedule = async () => {
  const medicinesResponse =
    await medicationService.getActiveMedicines();

  const medicines =
    medicinesResponse.data?.results ||
    medicinesResponse.data ||
    [];

  if (!Array.isArray(medicines)) {
    return [];
  }

  const today = new Date();

  const todayString =
    `${today.getFullYear()}-${String(
      today.getMonth() + 1
    ).padStart(2, "0")}-${String(
      today.getDate()
    ).padStart(2, "0")}`;

  const jsDay = today.getDay();
  const weekday = jsDay === 0 ? 7 : jsDay;

  const schedulesByMedicine =
    await Promise.all(
      medicines.map(async (medicine) => {
        try {
          const response = await api.get(
            `/reminders/medications/${medicine.id}/schedules/`
          );

          const schedules =
            Array.isArray(response.data)
              ? response.data
              : response.data?.results || [];

          if (!Array.isArray(schedules)) {
            return [];
          }

          const todayItems = [];

          schedules.forEach((schedule) => {
            if (!schedule.is_active) {
              return;
            }

            if (
              schedule.start_date &&
              todayString < schedule.start_date
            ) {
              return;
            }

            if (
              schedule.end_date &&
              todayString > schedule.end_date
            ) {
              return;
            }

            let occursToday = false;

            switch (schedule.frequency_type) {
              case "DAILY":
                occursToday = true;
                break;

              case "WEEKLY":
              case "SPECIFIC_DAYS":
                occursToday =
                  Array.isArray(schedule.days_of_week) &&
                  schedule.days_of_week.includes(weekday);
                break;

              case "INTERVAL_DAYS": {
                if (!schedule.start_date) {
                  occursToday = false;
                  break;
                }

                const start = new Date(
                  `${schedule.start_date}T00:00:00`
                );

                const current = new Date(
                  `${todayString}T00:00:00`
                );

                const difference = Math.floor(
                  (current - start) /
                    (1000 * 60 * 60 * 24)
                );

                const interval =
                  Number(schedule.interval_days) || 1;

                occursToday =
                  difference >= 0 &&
                  difference % interval === 0;

                break;
              }

              case "AS_NEEDED":
                occursToday = true;
                break;

              case "CUSTOM":
                occursToday = true;
                break;

              default:
                occursToday = false;
            }

            if (!occursToday) {
              return;
            }

            const times =
              Array.isArray(schedule.times)
                ? schedule.times
                : [];

            if (times.length === 0) {
              todayItems.push({
                id: `schedule-${schedule.id}`,
                scheduleId: schedule.id,
                medicineId: medicine.id,
                medicineName: medicine.name,
                dosage:
                  schedule.dose_quantity
                    ? `${schedule.dose_quantity} ${
                        schedule.dosage_unit || ""
                      }`.trim()
                    : medicine.dosage || "-",
                time: "--:--",
                status: "pending",
                instructions:
                  schedule.instructions || "",
                frequencyType:
                  schedule.frequency_type,
              });

              return;
            }

            times.forEach((time) => {
              todayItems.push({
                id: `schedule-${schedule.id}-time-${time.id}`,
                scheduleId: schedule.id,
                scheduleTimeId: time.id,
                medicineId: medicine.id,
                medicineName: medicine.name,
                dosage:
                  time.dose_quantity
                    ? `${time.dose_quantity} ${
                        schedule.dosage_unit || ""
                      }`.trim()
                    : schedule.dose_quantity
                    ? `${schedule.dose_quantity} ${
                        schedule.dosage_unit || ""
                      }`.trim()
                    : medicine.dosage || "-",
                time: time.scheduled_time,
                status: "pending",
                instructions:
                  schedule.instructions || "",
                timeOfDay:
                  time.time_of_day_type || "",
                frequencyType:
                  schedule.frequency_type,
              });
            });
          });

          return todayItems;
        } catch (error) {
          console.error(
            `Unable to load schedule for medicine ${medicine.id}:`,
            error
          );

          return [];
        }
      })
    );

  return schedulesByMedicine
    .flat()
    .sort((a, b) =>
      String(a.time || "").localeCompare(
        String(b.time || "")
      )
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

export const fetchAvailableCaregivers = async () => {
  const response = await api.get(
    "/caregiver/available/"
  );

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

export const sendAssistantMessage = async (
  message,
  history = []
) => {
  const response = await api.post(
    "/analytics/ai-assistant/",
    {
      message,
      history,
    }
  );

  return response.data;
};

export default api;