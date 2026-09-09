import api from "./api";

const analyticsService = {
  getAdherenceTrend: () =>
    api.get("/analytics/adherence-trend/"),

  getMissedByMedicine: () =>
    api.get("/analytics/missed-by-medicine/"),

  getAdherenceByMedicine: () =>
    api.get("/analytics/adherence-by-medicine/"),

  getRefillStats: () =>
    api.get("/analytics/refill-stats/"),

  getWeeklyReport: () =>
    api.get("/analytics/weekly-report/"),

  getMonthlyReport: () =>
    api.get("/analytics/monthly-report/"),

  getConsistency: () =>
    api.get("/analytics/consistency/"),

  getRefillForecast: () =>
    api.get("/refill/forecast/"),
};

export default analyticsService;
