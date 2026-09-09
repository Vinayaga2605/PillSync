import api from "./api";

const medicationService = {
  // Get all medicines for the logged-in patient
  getActiveMedicines: () => api.get("/medications/"),

  // Get one medicine
  getMedicine: (id) => api.get(`/medications/${id}/`),

  // Create medicine
  createMedicine: (data) => api.post("/medications/", data),

  // Update medicine
  updateMedicine: (id, data) => api.put(`/medications/${id}/`, data),

  // Delete medicine
  deleteMedicine: (id) => api.delete(`/medications/${id}/`),

  // Medicine history
  getMedicineHistory: (id) =>
    api.get(`/medications/${id}/history/`),

  // Low-stock medicines
  getLowStock: () =>
    api.get("/medications/low_stock/"),

  // Refill medicine
  refillMedicine: (id, quantity) =>
    api.post(`/medications/${id}/refill/`, {
      quantity,
    }),

  // Get adherence summary
  getAdherenceSummary: async () => {
    const res = await api.get("/analytics/weekly-report/");

    return {
      data: {
        percentage: res.data.adherenceRate,
        taken: res.data.taken,
        missed: res.data.missed,
        total: res.data.totalDoses,
      },
    };
  },
};

export default medicationService;