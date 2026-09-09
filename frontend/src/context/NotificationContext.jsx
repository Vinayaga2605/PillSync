import { createContext, useContext, useState, useEffect, useCallback } from "react";
import {
  fetchNotifications,
  markNotificationsRead as apiMarkAllRead,
  markNotificationRead as apiMarkOneRead,
  deleteNotification as apiDeleteOne,
  broadcastNotification as apiBroadcast,
} from "../services/api";
import { useAuth } from "./AuthContext";

const NotificationContext = createContext(null);

export const NotificationProvider = ({ children }) => {
  const { isAuthenticated } = useAuth();
  const [notifications, setNotifications] = useState([]);
  const [loading, setLoading] = useState(false);

  const syncNotifications = useCallback(async () => {
    if (!isAuthenticated) {
      setNotifications([]);
      return;
    }
    try {
      const data = await fetchNotifications();
      if (Array.isArray(data)) {
        setNotifications(data);
      }
    } catch (err) {
      console.warn("Could not sync notifications:", err.message);
    }
  }, [isAuthenticated]);

  useEffect(() => {
    if (isAuthenticated) {
      syncNotifications();
      const interval = setInterval(syncNotifications, 25000);
      return () => clearInterval(interval);
    } else {
      setNotifications([]);
    }
  }, [isAuthenticated, syncNotifications]);

  const markAllRead = async () => {
    try {
      await apiMarkAllRead();
      setNotifications((prev) =>
        prev.map((n) => ({ ...n, is_read: true }))
      );
    } catch (err) {
      console.error("Failed to mark all notifications as read:", err);
    }
  };

  const markRead = async (id) => {
    try {
      await apiMarkOneRead(id);
      setNotifications((prev) =>
        prev.map((n) => (n.id === id ? { ...n, is_read: true } : n))
      );
    } catch (err) {
      console.error("Failed to mark notification read:", err);
    }
  };

  const deleteNotif = async (id) => {
    try {
      await apiDeleteOne(id);
      setNotifications((prev) => prev.filter((n) => n.id !== id));
    } catch (err) {
      console.error("Failed to delete notification:", err);
    }
  };

  const broadcast = async (message) => {
    const res = await apiBroadcast(message);
    await syncNotifications();
    return res;
  };

  const unreadCount = notifications.filter((n) => !n.is_read).length;

  return (
    <NotificationContext.Provider
      value={{
        notifications,
        unreadCount,
        loading,
        syncNotifications,
        markAllRead,
        markRead,
        deleteNotif,
        broadcast,
      }}
    >
      {children}
    </NotificationContext.Provider>
  );
};

export const useNotifications = () => {
  const context = useContext(NotificationContext);
  if (!context) {
    throw new Error("useNotifications must be used within a NotificationProvider");
  }
  return context;
};
