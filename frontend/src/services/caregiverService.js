import api from "./api";

const caregiverService = {
  getAssignedPatients: () => api.get("/caregiver/patients/"),
  getPatientDetail: (patientId) => api.get(`/caregiver/patients/${patientId}/`),
  getMissedDoseAlerts: () => api.get("/caregiver/missed-dose-alerts/"),
};

export default caregiverService;