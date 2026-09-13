import api from './api'

export const intelligenceService = {
  /**
   * Fetches the patient's smart medication intelligence summary.
   * Endpoint: GET /api/patients/me/intelligence/summary
   */
  getPatientIntelligenceSummary: async () => {
    const response = await api.get('/patients/me/intelligence/summary')
    return response.data
  },

  /**
   * Fetches historical medication intelligence analytics over 7, 30, or 90 days.
   * Endpoint: GET /api/patients/me/intelligence/history?days={days}
   */
  getPatientIntelligenceHistory: async (days = 30) => {
    const response = await api.get('/patients/me/intelligence/history', {
      params: { days },
    })
    return response.data
  },

  /**
   * Fetches actionable, deterministic non-clinical medication management suggestions.
   * Endpoint: GET /api/patients/me/intelligence/suggestions
   */
  getPatientMedicationSuggestions: async () => {
    const response = await api.get('/patients/me/intelligence/suggestions')
    return response.data
  },
}

export default intelligenceService
