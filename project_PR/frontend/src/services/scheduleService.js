import api from './api'

export const scheduleService = {
  /**
   * Fetches all dosing schedules belonging to a patient's medicine.
   * Uses GET /api/patients/me/medicines/{medicine_id}/schedules
   */
  async getSchedules(medicineId) {
    const response = await api.get(`/patients/me/medicines/${medicineId}/schedules`)
    return response.data
  },

  /**
   * Retrieves a single schedule for a patient's medicine.
   * Uses GET /api/patients/me/medicines/{medicine_id}/schedules/{schedule_id}
   */
  async getScheduleById(medicineId, scheduleId) {
    const response = await api.get(`/patients/me/medicines/${medicineId}/schedules/${scheduleId}`)
    return response.data
  },

  /**
   * Creates a new dosing schedule for a patient's medicine.
   * Uses POST /api/patients/me/medicines/{medicine_id}/schedules
   */
  async createSchedule(medicineId, data) {
    const response = await api.post(`/patients/me/medicines/${medicineId}/schedules`, data)
    return response.data
  },

  /**
   * Partially updates an existing dosing schedule.
   * Uses PATCH /api/patients/me/medicines/{medicine_id}/schedules/{schedule_id}
   */
  async updateSchedule(medicineId, scheduleId, data) {
    const response = await api.patch(`/patients/me/medicines/${medicineId}/schedules/${scheduleId}`, data)
    return response.data
  },

  /**
   * Deletes a dosing schedule.
   * Uses DELETE /api/patients/me/medicines/{medicine_id}/schedules/{schedule_id}
   */
  async deleteSchedule(medicineId, scheduleId) {
    const response = await api.delete(`/patients/me/medicines/${medicineId}/schedules/${scheduleId}`)
    return response.data
  },
}
