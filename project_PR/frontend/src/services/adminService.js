import api from './api'

export const adminService = {
  /**
   * Fetches aggregate system overview metrics.
   * Endpoint: GET /api/admin/dashboard/summary
   */
  getDashboardSummary: async () => {
    const response = await api.get('/admin/dashboard/summary')
    return response.data
  },

  /**
   * Fetches comprehensive system analytics and monitoring metrics.
   * Endpoint: GET /api/admin/analytics/summary
   */
  getAnalyticsSummary: async ({ days = 30 } = {}) => {
    const params = { days }
    const response = await api.get('/admin/analytics/summary', { params })
    return response.data
  },

  /**
   * Fetches paginated directory of system users with optional filters.
   * Endpoint: GET /api/admin/users
   */
  getUsers: async ({ role = null, is_active = null, search = null, limit = 50, offset = 0 } = {}) => {
    const params = { limit, offset }
    if (role) params.role = role
    if (is_active !== null && is_active !== undefined) params.is_active = is_active
    if (search) params.search = search

    const response = await api.get('/admin/users', { params })
    return response.data
  },

  /**
   * Fetches safe detailed view for a single user by ID.
   * Endpoint: GET /api/admin/users/{user_id}
   */
  getUserDetail: async (userId) => {
    const response = await api.get(`/admin/users/${userId}`)
    return response.data
  },

  /**
   * Fetches paginated patient directory with optional search.
   * Endpoint: GET /api/admin/patients
   */
  getPatients: async ({ search = null, limit = 50, offset = 0 } = {}) => {
    const params = { limit, offset }
    if (search) params.search = search

    const response = await api.get('/admin/patients', { params })
    return response.data
  },

  /**
   * Fetches safe detailed view for a single patient by profile ID.
   * Endpoint: GET /api/admin/patients/{patient_id}
   */
  getPatientDetail: async (patientId) => {
    const response = await api.get(`/admin/patients/${patientId}`)
    return response.data
  },

  /**
   * Fetches paginated caregiver directory with optional search.
   * Endpoint: GET /api/admin/caregivers
   */
  getCaregivers: async ({ search = null, limit = 50, offset = 0 } = {}) => {
    const params = { limit, offset }
    if (search) params.search = search

    const response = await api.get('/admin/caregivers', { params })
    return response.data
  },

  /**
   * Fetches safe detailed view for a single caregiver by profile ID.
   * Endpoint: GET /api/admin/caregivers/{caregiver_id}
   */
  getCaregiverDetail: async (caregiverId) => {
    const response = await api.get(`/admin/caregivers/${caregiverId}`)
    return response.data
  },

  /**
   * Fetches paginated caregiver-patient assignments with optional filters.
   * Endpoint: GET /api/admin/relationships
   */
  getRelationships: async ({ caregiver_id = null, patient_id = null, is_active = null, limit = 50, offset = 0 } = {}) => {
    const params = { limit, offset }
    if (caregiver_id) params.caregiver_id = caregiver_id
    if (patient_id) params.patient_id = patient_id
    if (is_active !== null && is_active !== undefined) params.is_active = is_active

    const response = await api.get('/admin/relationships', { params })
    return response.data
  },
}

export default adminService
