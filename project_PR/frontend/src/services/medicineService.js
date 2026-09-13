import api from './api'

export const medicineService = {
  /**
   * Fetches all medications belonging to the authenticated patient.
   * Uses GET /api/patients/me/medicines
   */
  async getMedicines() {
    const response = await api.get('/patients/me/medicines')
    return response.data
  },

  /**
   * Retrieves a single medication by ID.
   * Uses GET /api/patients/me/medicines/{medicine_id}
   */
  async getMedicineById(medicineId) {
    const response = await api.get(`/patients/me/medicines/${medicineId}`)
    return response.data
  },

  /**
   * Adds a new medication record for the authenticated patient.
   * Uses POST /api/patients/me/medicines
   */
  async createMedicine(data) {
    const response = await api.post('/patients/me/medicines', data)
    return response.data
  },

  /**
   * Partially updates an existing medication.
   * Uses PATCH /api/patients/me/medicines/{medicine_id}
   */
  async updateMedicine(medicineId, data) {
    const response = await api.patch(`/patients/me/medicines/${medicineId}`, data)
    return response.data
  },

  /**
   * Deletes a medication belonging to the authenticated patient.
   * Uses DELETE /api/patients/me/medicines/{medicine_id}
   */
  async deleteMedicine(medicineId) {
    const response = await api.delete(`/patients/me/medicines/${medicineId}`)
    return response.data
  },

  // =========================================================================
  // Feature 18: Stock & Inventory Management APIs
  // =========================================================================

  /**
   * Retrieves inventory stock for a medication.
   * Uses GET /api/patients/me/medicines/{medicine_id}/stock
   */
  async getStock(medicineId) {
    const response = await api.get(`/patients/me/medicines/${medicineId}/stock`)
    return response.data
  },

  /**
   * Manually updates stock levels for a medication.
   * Uses PATCH /api/patients/me/medicines/{medicine_id}/stock
   */
  async updateStock(medicineId, data) {
    const response = await api.patch(`/patients/me/medicines/${medicineId}/stock`, data)
    return response.data
  },

  /**
   * Adds quantity to the current stock.
   * Uses POST /api/patients/me/medicines/{medicine_id}/stock/add
   */
  async addStock(medicineId, quantity) {
    const response = await api.post(`/patients/me/medicines/${medicineId}/stock/add`, { quantity })
    return response.data
  },

  /**
   * Manually consumes quantity from current stock.
   * Uses POST /api/patients/me/medicines/{medicine_id}/stock/consume
   */
  async consumeStock(medicineId, quantity = null) {
    const payload = quantity !== null ? { quantity } : {}
    const response = await api.post(`/patients/me/medicines/${medicineId}/stock/consume`, payload)
    return response.data
  },

  // =========================================================================
  // Feature 19: AI Refill Prediction APIs
  // =========================================================================

  /**
   * Fetches deterministic AI refill predictions for all medications.
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
