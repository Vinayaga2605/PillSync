import api from "./api";

const adminService = {
  getUsers: () => api.get("/admin/users/"),
  toggleUserActive: (userId) => api.patch(`/admin/users/${userId}/toggle-active/`),
  getSystemStats: () => api.get("/admin/stats/"),
};

export default adminService;