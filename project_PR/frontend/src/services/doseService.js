import api from './api'

export const doseService = {
  /**
   * Records or claims a persistent dose occurrence for a scheduled medication event.
   * Endpoint: POST /api/patients/me/doses
   * @param {Object} doseData - { schedule_id, scheduled_timestamp, status, dose_quantity_taken, notes, action_timestamp }
   */
  recordDoseEvent: async (doseData) => {
    const response = await api.post('/patients/me/doses', doseData)
    return response.data
  },

  /**
   * Updates an existing recorded dose event status to TAKEN.
   * Endpoint: PATCH /api/patients/me/doses/{dose_id}/taken
   * @param {string} doseId - UUID of the dose event
   * @param {Object} actionData - { action_timestamp, dose_quantity_taken, notes }
   */
  markDoseTaken: async (doseId, actionData = {}) => {
    const response = await api.patch(`/patients/me/doses/${doseId}/taken`, actionData)
    return response.data
  },

  /**
   * Updates an existing recorded dose event status to SKIPPED.
   * Endpoint: PATCH /api/patients/me/doses/{dose_id}/skipped
   * @param {string} doseId - UUID of the dose event
   * @param {Object} actionData - { action_timestamp, notes }
   */
  markDoseSkipped: async (doseId, actionData = {}) => {
    const response = await api.patch(`/patients/me/doses/${doseId}/skipped`, actionData)
    return response.data
  },

  /**
   * Postpones/snoozes a dose event by specified minutes (default 10).
   * Endpoint: PATCH /api/patients/me/doses/{dose_id}/snooze
   * @param {string} doseId - UUID of the dose event
   * @param {Object} actionData - { snooze_minutes, action_timestamp, notes }
   */
  markDoseSnoozed: async (doseId, actionData = { snooze_minutes: 10 }) => {
    const response = await api.patch(`/patients/me/doses/${doseId}/snooze`, actionData)
    return response.data
  },

  /**
   * Lists recorded dose events for the authenticated patient.
   * Endpoint: GET /api/patients/me/doses
   * @param {Object} params - { date, status }
   */
  getPatientDoses: async (params = {}) => {
    const response = await api.get('/patients/me/doses', { params })
    return response.data
  },

  /**
   * Retrieves a specific dose event by ID.
   * Endpoint: GET /api/patients/me/doses/{dose_id}
   * @param {string} doseId - UUID of the dose event
   */
  getDoseById: async (doseId) => {
    const response = await api.get(`/patients/me/doses/${doseId}`)
    return response.data
  },
}
