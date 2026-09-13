import api from './api'

export const historyService = {
  /**
   * Fetches chronological medication dose history for the authenticated patient.
   * Endpoint: GET /api/patients/me/medication-history
   * @param {Object} options
   * @param {string} [options.startDate] - YYYY-MM-DD
   * @param {string} [options.endDate] - YYYY-MM-DD
   * @param {string} [options.medicineId] - UUID
   * @param {string} [options.status] - 'TAKEN' | 'SKIPPED' | 'PENDING'
   * @param {number} [options.limit=20] - Max items per page
   * @param {number} [options.offset=0] - Offset for pagination
   */
  getMedicationHistory: async ({
    startDate = null,
    endDate = null,
    medicineId = null,
    status = null,
    limit = 20,
    offset = 0,
  } = {}) => {
    const params = {
      limit,
      offset,
    }

    if (startDate) params.start_date = startDate
    if (endDate) params.end_date = endDate
    if (medicineId) params.medicine_id = medicineId
    if (status && status !== 'ALL') params.status = status

    const response = await api.get('/patients/me/medication-history', { params })
    return response.data
  },
}
