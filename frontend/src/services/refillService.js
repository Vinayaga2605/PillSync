import api from "./api";

const refillService = {
  getRefillAlerts: () => api.get("/medications/low_stock/"),
};

export default refillService;