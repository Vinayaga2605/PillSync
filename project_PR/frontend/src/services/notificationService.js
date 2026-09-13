import api from './api'

export const notificationService = {
  /**
   * Fetch paginated notifications for the authenticated patient.
   * @param {Object} params
   * @param {boolean} [params.unread_only=false]
   * @param {number} [params.limit=50]
   * @param {number} [params.offset=0]
   * @returns {Promise<{total_count: number, unread_count: number, items: Array}>}
   */
  async getNotifications(params = {}) {
    const { unread_only = false, limit = 50, offset = 0 } = params
    const query = new URLSearchParams()
    if (unread_only) {
      query.append('unread_only', 'true')
    }
    query.append('limit', String(limit))
    query.append('offset', String(offset))

    const response = await api.get(`/patients/me/notifications?${query.toString()}`)
    return response.data
  },

  /**
   * Get unread notification count for the authenticated patient.
   * @returns {Promise<{unread_count: number}>}
   */
  async getUnreadCount() {
    const response = await api.get('/patients/me/notifications/unread-count')
    return response.data
  },

  /**
   * Mark a single notification as read.
   * @param {string} notificationId
   * @returns {Promise<Object>}
   */
  async markAsRead(notificationId) {
    const response = await api.patch(`/patients/me/notifications/${notificationId}/read`)
    return response.data
  },

  /**
   * Mark all notifications as read for the authenticated patient.
   * @returns {Promise<{unread_count: number}>}
   */
  async markAllAsRead() {
    const response = await api.patch('/patients/me/notifications/read-all')
    return response.data
  },
}

export default notificationService
