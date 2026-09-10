import React, { useEffect, useState } from "react";
import {
  getNotifications,
  markNotificationAsRead,
  deleteNotification,
  clearAllNotifications,
} from "../services/notificationService";

function NotificationPanel() {
  const [notifications, setNotifications] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  const loadNotifications = async () => {
    try {
      setLoading(true);
      setError("");

      const data = await getNotifications();
      setNotifications(Array.isArray(data) ? data : []);
    } catch (err) {
      console.error("Notification loading error:", err);
      setError("Unable to load notifications. Please login again.");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadNotifications();
  }, []);

  const markAsRead = async (id) => {
    try {
      await markNotificationAsRead(id);

      setNotifications((current) =>
        current.map((item) =>
          item.id === id
            ? { ...item, is_read: true }
            : item
        )
      );
    } catch (err) {
      console.error("Mark as read error:", err);
    }
  };

  const deleteOne = async (id) => {
    try {
      await deleteNotification(id);

      setNotifications((current) =>
        current.filter((item) => item.id !== id)
      );
    } catch (err) {
      console.error("Delete notification error:", err);
    }
  };

  const clearAll = async () => {
    try {
      await clearAllNotifications();
      setNotifications([]);
    } catch (err) {
      console.error("Clear all notifications error:", err);
    }
  };

  const getIcon = (type) => {
    switch (type) {
      case "medicine":
        return "💊";
      case "refill":
        return "🔄";
      case "missed":
        return "⚠️";
      case "appointment":
        return "📅";
      default:
        return "🔔";
    }
  };

  const unreadCount = notifications.filter(
    (item) => !item.is_read
  ).length;

  if (loading) {
    return (
      <div className="pavani-notification-panel">
        <div className="pavani-empty-notifications">
          <div className="pavani-empty-icon">🔔</div>
          <h3>Loading Notifications...</h3>
        </div>
      </div>
    );
  }

  return (
    <div className="pavani-notification-panel">
      <div className="pavani-panel-header">
        <div>
          <h2>Notification Panel</h2>
          <p className="pavani-panel-subtitle">
            Stay updated with your medication
          </p>
        </div>

        <div className="pavani-notification-count">
          {unreadCount} unread
        </div>
      </div>

      {error && (
        <div className="pavani-notification-error">
          {error}
        </div>
      )}

      {notifications.length > 0 && (
        <div className="pavani-clear-all-container">
          <button
            className="pavani-clear-all-btn"
            onClick={clearAll}
          >
            Clear All
          </button>
        </div>
      )}

      {notifications.length === 0 ? (
        <div className="pavani-empty-notifications">
          <div className="pavani-empty-icon">🔔</div>
          <h3>No Notifications</h3>
          <p>You are all caught up!</p>
        </div>
      ) : (
        <div>
          {notifications.map((notification) => (
            <div
              key={notification.id}
              className={`pavani-notification-card ${
                notification.is_read ? "read" : "unread"
              }`}
            >
              <div className="pavani-notification-icon">
                {getIcon(notification.notification_type)}
              </div>

              <div className="pavani-notification-content">
                <div className="pavani-notification-title-row">
                  <h3>{notification.title}</h3>

                  {!notification.is_read && (
                    <span className="pavani-new-badge">
                      NEW
                    </span>
                  )}
                </div>

                <p>{notification.message}</p>

                <small>
                  {notification.created_at
                    ? new Date(
                        notification.created_at
                      ).toLocaleString()
                    : ""}
                </small>

                <div className="pavani-notification-buttons">
                  {!notification.is_read && (
                    <button
                      className="pavani-read-btn"
                      onClick={() =>
                        markAsRead(notification.id)
                      }
                    >
                      ✓ Mark as Read
                    </button>
                  )}

                  <button
                    className="pavani-delete-btn"
                    onClick={() =>
                      deleteOne(notification.id)
                    }
                  >
                    Delete
                  </button>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

export default NotificationPanel;



