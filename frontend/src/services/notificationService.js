import api from "./api";

const notificationService = {
  getNotifications: () => api.get("/notifications/"),
  markAsRead: (id) => api.patch(`/notifications/${id}/read/`),
  markAllAsRead: () => api.post("/notifications/mark-all-read/"),
};

export default notificationService;