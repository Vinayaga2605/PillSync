import api from "./api";

export const getNotifications = async () => {
  const response = await api.get("/notifications/");
  return response.data?.notifications || response.data || [];
};

export const markNotificationAsRead = async (id) => {
  const response = await api.patch(`/notifications/${id}/read/`);
  return response.data;
};

export const deleteNotification = async (id) => {
  const response = await api.delete(`/notifications/${id}/`);
  return response.data;
};

export const clearAllNotifications = async () => {
  const response = await api.delete("/notifications/clear/");
  return response.data;
};

const notificationService = {
  getNotifications,
  markNotificationAsRead,
  deleteNotification,
  clearAllNotifications,
};

export default notificationService;



