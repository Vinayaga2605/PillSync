import { createContext, useContext, useState, useEffect, useCallback } from "react";
import { login as apiLogin, logout as apiLogout, fetchMyAccount } from "../services/api";

const AuthContext = createContext(null);

export const AuthProvider = ({ children }) => {
  const [user, setUser] = useState(() => {
    try {
      const stored = localStorage.getItem("pillsync_user");
      return stored ? JSON.parse(stored) : null;
    } catch {
      return null;
    }
  });

  const [token, setTokenState] = useState(() => localStorage.getItem("pillsync_token"));
  const [loading, setLoading] = useState(false);

  const refreshAccount = useCallback(async () => {
    if (!localStorage.getItem("pillsync_token")) return;
    try {
      const acc = await fetchMyAccount();
      if (acc && acc.id) {
        setUser((prev) => {
          const updated = { ...prev, ...acc };
          localStorage.setItem("pillsync_user", JSON.stringify(updated));
          return updated;
        });
      }
    } catch (err) {
      console.warn("Failed to sync account info:", err.message);
    }
  }, []);

  const loginUser = async (credentials) => {
    setLoading(true);
    try {
      const data = await apiLogin(credentials);
      setUser(data);
      setTokenState(data.access_token);
      await refreshAccount();
      return data;
    } finally {
      setLoading(false);
    }
  };

  const logoutUser = useCallback(() => {
    apiLogout();
    setUser(null);
    setTokenState(null);
  }, []);

  useEffect(() => {
    const handleUnauthorized = () => {
      logoutUser();
    };

    window.addEventListener("pillsync-unauthorized", handleUnauthorized);
    if (token) {
      refreshAccount();
    }

    return () => {
      window.removeEventListener("pillsync-unauthorized", handleUnauthorized);
    };
  }, [token, refreshAccount, logoutUser]);

  return (
    <AuthContext.Provider
      value={{
        user,
        token,
        loading,
        loginUser,
        logoutUser,
        refreshAccount,
        isAuthenticated: !!token,
      }}
    >
      {children}
    </AuthContext.Provider>
  );
};

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error("useAuth must be used within an AuthProvider");
  }
  return context;
};
