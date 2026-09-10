import api from "./api";

const authService = {
  login: async (username, password) => {
    const res = await api.post("/auth/login/", { username, password });
    localStorage.setItem("access_token", res.data.access);
    localStorage.setItem("refresh_token", res.data.refresh);
    localStorage.setItem("user", JSON.stringify(res.data.user));
    return res.data;
  },

  register: async (payload) => {
    const res = await api.post("/auth/register/", payload);
    localStorage.setItem("access_token", res.data.access);
    localStorage.setItem("refresh_token", res.data.refresh);
    localStorage.setItem("user", JSON.stringify(res.data.user));
    return res.data;
  },

  logout: () => {
    localStorage.removeItem("access_token");
    localStorage.removeItem("refresh_token");
    localStorage.removeItem("user");
  },

  getCurrentUser: () => {
    const stored = localStorage.getItem("user");
    return stored ? JSON.parse(stored) : null;
  },

  fetchMe: async () => {
    const res = await api.get("/auth/me/");
    return res.data;
  },

  // Mocked until backend endpoints exist
  forgotPassword: async (email) => {
    console.log("Mock: password reset link requested for", email);
    return Promise.resolve({ message: "Reset link sent" });
  },

  resetPassword: async (token, newPassword) => {
    console.log("Mock: password reset with token", token, "new password set");
    return Promise.resolve({ message: "Password reset successful" });
  },
};

export default authService;



