import api from './api'

export const dashboardService = {
  /**
   * Fetches the reminder summary for today.
   * Endpoint: GET /api/patients/me/reminders/summary
   */
  getReminderSummary: async () => {
    const response = await api.get('/patients/me/reminders/summary')
    return response.data
  },

  /**
   * Fetches all medications that are currently due.
   * Endpoint: GET /api/patients/me/reminders/due
   */
  getDueReminders: async () => {
    const response = await api.get('/patients/me/reminders/due')
    return response.data
  },

  /**
   * Fetches upcoming scheduled medication reminders.
   * Endpoint: GET /api/patients/me/reminders/upcoming
   */
  getUpcomingReminders: async (limit = 10) => {
    const response = await api.get('/patients/me/reminders/upcoming', {
      params: { limit },
    })
    return response.data
  },

  /**
   * Fetches today's medication adherence statistics.
   * Endpoint: GET /api/patients/me/adherence/today
   */
  getTodayAdherence: async () => {
    const response = await api.get('/patients/me/adherence/today')
    return response.data
  },
}
