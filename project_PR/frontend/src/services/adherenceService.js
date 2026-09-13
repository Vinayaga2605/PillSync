import api from './api'

export const adherenceService = {
  /**
   * Fetches today's adherence summary.
   * Endpoint: GET /api/patients/me/adherence/today
   */
  getTodayAdherence: async (medicineId = null) => {
    const params = medicineId ? { medicine_id: medicineId } : {}
    const response = await api.get('/patients/me/adherence/today', { params })
    return response.data
  },

  /**
   * Fetches current week's adherence summary.
   * Endpoint: GET /api/patients/me/adherence/week
   */
  getWeekAdherence: async (medicineId = null) => {
    const params = medicineId ? { medicine_id: medicineId } : {}
    const response = await api.get('/patients/me/adherence/week', { params })
    return response.data
  },

  /**
   * Fetches current month's adherence summary.
   * Endpoint: GET /api/patients/me/adherence/month
   */
  getMonthAdherence: async (medicineId = null) => {
    const params = medicineId ? { medicine_id: medicineId } : {}
    const response = await api.get('/patients/me/adherence/month', { params })
    return response.data
  },

  /**
   * Fetches custom date range adherence summary.
   * Endpoint: GET /api/patients/me/adherence
   * @param {string} startDate - YYYY-MM-DD
   * @param {string} endDate - YYYY-MM-DD
   * @param {string} medicineId - optional UUID
   */
  getCustomRangeAdherence: async (startDate, endDate, medicineId = null) => {
    const params = {
      start_date: startDate,
      end_date: endDate,
    }
    if (medicineId) {
      params.medicine_id = medicineId
    }
    const response = await api.get('/patients/me/adherence', { params })
    return response.data
  },

  /**
   * Fetches medication-specific adherence breakdown for a date period.
   * Endpoint: GET /api/patients/me/adherence/medications
   * @param {string} startDate - optional YYYY-MM-DD
   * @param {string} endDate - optional YYYY-MM-DD
   * @param {string} medicineId - optional UUID
   */
  getMedicationAdherence: async (startDate = null, endDate = null, medicineId = null) => {
    const params = {}
    if (startDate) params.start_date = startDate
    if (endDate) params.end_date = endDate
    if (medicineId) params.medicine_id = medicineId

    const response = await api.get('/patients/me/adherence/medications', { params })
    return response.data
  },
}
