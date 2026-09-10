import api from "./api";

const adminService = {
  getUsers: (params = {}) => api.get("/admin/users/", { params }),

  getUserDetail: (userId) =>
    api.get(`/admin/users/${userId}/`),

  createUser: (data) =>
    api.post("/admin/users/create/", data),

  updateUser: (userId, data) =>
    api.patch(`/admin/users/${userId}/update/`, data),

  deleteUser: (userId) =>
    api.delete(`/admin/users/${userId}/delete/`),

  toggleUserActive: (userId) =>
    api.patch(`/admin/users/${userId}/toggle-active/`),

  getCaregivers: () =>
    api.get("/admin/caregivers/"),

  assignCaregiver: (patientId, caregiverId) =>
    api.post(`/admin/patients/${patientId}/assign-caregiver/`, {
      caregiver_id: caregiverId,
    }),

  getSystemStats: () =>
    api.get("/admin/stats/"),
};

export default adminService;




