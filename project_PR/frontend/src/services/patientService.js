import api from './api'

export const patientService = {
  async getMyProfile() {
    const response = await api.get('/patients/me/profile')
    return response.data
  },

  async updateMyProfile(data) {
    const response = await api.patch('/patients/me/profile', data)
    return response.data
  },
}
