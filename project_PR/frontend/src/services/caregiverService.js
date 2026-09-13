import api from './api'

export const caregiverService = {
  /**
   * Fetches the list of active linked patients for the authenticated caregiver.
   * Endpoint: GET /api/caregivers/me/patients
   */
  getPatients: async () => {
    const response = await api.get('/caregivers/me/patients')
    return response.data
  },

  /**
   * Fetches aggregate summary metrics across all linked patients.
   * Endpoint: GET /api/caregivers/me/dashboard/summary
   */
  getDashboardSummary: async () => {
    const response = await api.get('/caregivers/me/dashboard/summary')
    return response.data
  },

  /**
   * Fetches detailed profile information for a single linked patient.
   * Endpoint: GET /api/caregivers/me/patients/{patient_id}
   */
  getPatientDetails: async (patientId) => {
    const response = await api.get(`/caregivers/me/patients/${patientId}`)
    return response.data
  },

  /**
   * Fetches medications belonging to the linked patient.
   * Endpoint: GET /api/caregivers/me/patients/{patient_id}/medications
   */
  getPatientMedications: async (patientId) => {
    const response = await api.get(`/caregivers/me/patients/${patientId}/medications`)
    return response.data
  },

  /**
   * Fetches medication schedules belonging to the linked patient.
   * Endpoint: GET /api/caregivers/me/patients/{patient_id}/schedules
   */
  getPatientSchedules: async (patientId) => {
    const response = await api.get(`/caregivers/me/patients/${patientId}/schedules`)
    return response.data
  },

  /**
   * Fetches currently due reminders for the linked patient.
   * Endpoint: GET /api/caregivers/me/patients/{patient_id}/reminders/due
   */
  getPatientRemindersDue: async (patientId, referenceTime = null) => {
    const params = referenceTime ? { reference_time: referenceTime } : {}
    const response = await api.get(`/caregivers/me/patients/${patientId}/reminders/due`, { params })
    return response.data
  },

  /**
   * Fetches upcoming reminders within lookahead window for the linked patient.
   * Endpoint: GET /api/caregivers/me/patients/{patient_id}/reminders/upcoming
   */
  getPatientRemindersUpcoming: async (patientId, referenceTime = null, hoursAhead = 24) => {
    const params = { hours_ahead: hoursAhead }
    if (referenceTime) {
      params.reference_time = referenceTime
    }
    const response = await api.get(`/caregivers/me/patients/${patientId}/reminders/upcoming`, { params })
    return response.data
  },

  /**
   * Fetches dose event history for the linked patient with optional filters.
   * Endpoint: GET /api/caregivers/me/patients/{patient_id}/doses
   */
  getPatientDoses: async (patientId, { targetDate = null, status = null } = {}) => {
    const params = {}
    if (targetDate) params.target_date = targetDate
    if (status) params.status = status
    const response = await api.get(`/caregivers/me/patients/${patientId}/doses`, { params })
    return response.data
  },

  /**
   * Fetches today's adherence summary for the linked patient.
   * Endpoint: GET /api/caregivers/me/patients/{patient_id}/adherence/today
   */
  getPatientAdherenceToday: async (patientId, medicineId = null) => {
    const params = medicineId ? { medicine_id: medicineId } : {}
    const response = await api.get(`/caregivers/me/patients/${patientId}/adherence/today`, { params })
    return response.data
  },

  /**
   * Fetches current week's adherence summary for the linked patient.
   * Endpoint: GET /api/caregivers/me/patients/{patient_id}/adherence/week
   */
  getPatientAdherenceWeek: async (patientId, medicineId = null) => {
    const params = medicineId ? { medicine_id: medicineId } : {}
    const response = await api.get(`/caregivers/me/patients/${patientId}/adherence/week`, { params })
    return response.data
  },

  /**
   * Fetches current month's adherence summary for the linked patient.
   * Endpoint: GET /api/caregivers/me/patients/{patient_id}/adherence/month
   */
  getPatientAdherenceMonth: async (patientId, medicineId = null) => {
    const params = medicineId ? { medicine_id: medicineId } : {}
    const response = await api.get(`/caregivers/me/patients/${patientId}/adherence/month`, { params })
    return response.data
  },

  /**
   * Fetches adherence over a custom date range for the linked patient.
   * Endpoint: GET /api/caregivers/me/patients/{patient_id}/adherence
   */
  getPatientAdherenceRange: async (patientId, { startDate = null, endDate = null, medicineId = null } = {}) => {
    const params = {}
    if (startDate) params.start_date = startDate
    if (endDate) params.end_date = endDate
    if (medicineId) params.medicine_id = medicineId
    const response = await api.get(`/caregivers/me/patients/${patientId}/adherence`, { params })
    return response.data
  },

  /**
   * Fetches paginated in-app alerts across all active linked patients.
   * Endpoint: GET /api/caregivers/me/notifications
   */
  getNotifications: async ({ unread_only = false, limit = 50, offset = 0 } = {}) => {
    const params = { limit, offset }
    if (unread_only) {
      params.unread_only = true
    }
    const response = await api.get('/caregivers/me/notifications', { params })
    return response.data
  },

  /**
   * Fetches total unread alerts count across all active linked patients.
   * Endpoint: GET /api/caregivers/me/notifications/unread-count
   */
  getUnreadCount: async () => {
    const response = await api.get('/caregivers/me/notifications/unread-count')
    return response.data
  },

  /**
   * Marks a single linked patient alert as read.
   * Endpoint: PATCH /api/caregivers/me/notifications/{notification_id}/read
   */
  markAsRead: async (notificationId) => {
    const response = await api.patch(`/caregivers/me/notifications/${notificationId}/read`)
    return response.data
  },

  /**
   * Marks all linked patient alerts as read across active linked patients.
   * Endpoint: PATCH /api/caregivers/me/notifications/read-all
   */
  markAllAsRead: async () => {
    const response = await api.patch('/caregivers/me/notifications/read-all')
    return response.data
  },

  /**
   * Feature 17F: Fetches smart medication intelligence summary for a linked patient.
   * Endpoint: GET /api/caregivers/me/patients/{patient_id}/intelligence/summary
   */
  getPatientIntelligenceSummary: async (patientId) => {
    const response = await api.get(`/caregivers/me/patients/${patientId}/intelligence/summary`)
    return response.data
  },

  /**
   * Feature 17F: Fetches historical adherence intelligence and timelines for a linked patient over 7, 30, or 90 days.
   * Endpoint: GET /api/caregivers/me/patients/{patient_id}/intelligence/history?days={days}
   */
  getPatientIntelligenceHistory: async (patientId, days = 30) => {
    const response = await api.get(`/caregivers/me/patients/${patientId}/intelligence/history`, {
      params: { days },
    })
    return response.data
  },

  /**
   * Feature 17F: Fetches deterministic smart medication management suggestions for a linked patient.
   * Endpoint: GET /api/caregivers/me/patients/{patient_id}/intelligence/suggestions
   */
  getPatientIntelligenceSuggestions: async (patientId) => {
    const response = await api.get(`/caregivers/me/patients/${patientId}/intelligence/suggestions`)
    return response.data
  },

  /**
   * Feature 17F: Fetches medication attention overview across all linked patients for caregiver dashboard.
   * Endpoint: GET /api/caregivers/me/dashboard/intelligence-overview
   */
  getCaregiverIntelligenceOverview: async () => {
    const response = await api.get('/caregivers/me/dashboard/intelligence-overview')
    return response.data
  },
}


