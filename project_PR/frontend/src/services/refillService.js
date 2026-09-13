import api from './api'

export const refillService = {
  /**
   * Fetches deterministic AI refill predictions for all patient medications.
   * Uses GET /api/patients/me/refill-predictions
   */
  async getRefillPredictions() {
    const response = await api.get('/patients/me/refill-predictions')
    return response.data
  },

  /**
   * Retrieves refill prediction for a specific medication.
   * Uses GET /api/patients/me/refills/medicines/{medicine_id}
   */
  async getMedicineRefillPrediction(medicineId) {
    const response = await api.get(`/patients/me/refills/medicines/${medicineId}`)
    return response.data
  },
}
