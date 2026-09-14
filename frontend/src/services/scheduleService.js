import api from "./api";

export const scheduleService = {
  async getSchedules(medicineId) {
    const response = await api.get(
      `/reminders/medications/${medicineId}/schedules/`
    );
    return response.data;
  },

  async getScheduleById(medicineId, scheduleId) {
    const response = await api.get(
      `/reminders/medications/${medicineId}/schedules/${scheduleId}/`
    );
    return response.data;
  },

  async createSchedule(medicineId, data) {
    const response = await api.post(
      `/reminders/medications/${medicineId}/schedules/`,
      data
    );
    return response.data;
  },

  async updateSchedule(medicineId, scheduleId, data) {
    const response = await api.patch(
      `/reminders/medications/${medicineId}/schedules/${scheduleId}/`,
      data
    );
    return response.data;
  },

  async deleteSchedule(medicineId, scheduleId) {
    const response = await api.delete(
      `/reminders/medications/${medicineId}/schedules/${scheduleId}/`
    );
    return response.data;
  },
};

export default scheduleService;