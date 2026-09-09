import api from "./api";

const reminderService = {
  getTodayReminders: () => api.get("/reminders/?today=true"),
  getAllReminders: () => api.get("/reminders/"),
  getReminderDetail: (id) => api.get(`/reminders/${id}/`),
  createReminder: (payload) => api.post("/reminders/", payload),
  updateReminder: (id, payload) => api.put(`/reminders/${id}/`, payload),
  deleteReminder: (id) => api.delete(`/reminders/${id}/`),
  updateReminderStatus: (id, status) => api.patch(`/reminders/${id}/mark/`, { status }),
};

export default reminderService;