import api from "./api";

const caregiverService = {
  // Dashboard
  getDashboard: () =>
    api.get("/caregiver/dashboard/"),

  // Assigned patients
  getAssignedPatients: () =>
    api.get("/caregiver/patients/"),

  // Individual patient
  getPatientDetail: (patientId) =>
    api.get(`/caregiver/patients/${patientId}/`),

  // Medication monitoring
  getMedicationMonitoring: () =>
    api.get("/caregiver/medications/"),

  // Patient analytics
  getPatientAnalytics: (patientId) =>
    api.get(
      patientId
        ? `/caregiver/analytics/?patient_id=${patientId}`
        : "/caregiver/analytics/"
    ),

  // Missed doses
  getMissedDoseAlerts: () =>
    api.get("/caregiver/missed-dose-alerts/"),

  // All caregiver alerts
  getAlerts: () =>
    api.get("/caregiver/alerts/"),
};

export default caregiverService;