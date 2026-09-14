import React, { useEffect, useState } from "react";
import {
  Bell,
  CheckCircle2,
  Trash2,
  Pill,
  RefreshCw,
  AlertTriangle,
  CalendarDays,
  Info,
} from "lucide-react";

import {
  getNotifications,
  markNotificationAsRead,
  deleteNotification,
  clearAllNotifications,
} from "../../services/notificationService";

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

      setError(
        err?.response?.data?.detail ||
          "Unable to load notifications."
      );
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

  const getType = (notification) =>
    notification?.type ||
    notification?.notification_type ||
    "system";

  const getIcon = (type) => {
    switch (type) {
      case "medicine":
      case "reminder":
        return <Pill size={19} />;

      case "refill":
        return <RefreshCw size={19} />;

      case "missed":
        return <AlertTriangle size={19} />;

      case "appointment":
        return <CalendarDays size={19} />;

      default:
        return <Info size={19} />;
    }
  };

  const unreadCount = notifications.filter(
    (item) => !item.is_read
  ).length;

  if (loading) {
    return (
      <section className="pillsync-notification-section">
        <div className="pillsync-section-header">
          <div>
            <h2>Notification Center</h2>
            <p>Loading your latest medication alerts...</p>
          </div>
        </div>

        <div className="pillsync-section-body">
          <div className="pillsync-empty-state">
            <div className="pillsync-empty-icon">
              <Bell size={24} />
            </div>

            <h3>Loading notifications</h3>
            <p>Please wait while your alerts are loaded.</p>
          </div>
        </div>
      </section>
    );
  }

  return (
    <section className="pillsync-notification-section">
      <div className="pillsync-section-header">
        <div>
          <h2>Notification Center</h2>
          <p>Your latest medication reminders and alerts</p>
        </div>

        <span className="pillsync-count-badge">
          {unreadCount} unread
        </span>
      </div>

      <div className="pillsync-section-body">
        {error && (
          <div className="pillsync-error">
            {error}
          </div>
        )}

        {notifications.length > 0 && (
          <div
            style={{
              display: "flex",
              justifyContent: "flex-end",
              marginBottom: "14px",
            }}
          >
            <button
              type="button"
              className="pillsync-clear-btn"
              onClick={clearAll}
            >
              Clear all
            </button>
          </div>
        )}

        {notifications.length === 0 ? (
          <div className="pillsync-empty-state">
            <div className="pillsync-empty-icon">
              <Bell size={24} />
            </div>

            <h3>No notifications</h3>

            <p>
              You're all caught up. New medication alerts will
              appear here.
            </p>
          </div>
        ) : (
          <div className="pillsync-notification-list">
            {notifications.map((notification) => {
              const type = getType(notification);

              return (
                <div
                  key={notification.id}
                  className={`pillsync-notification-item ${
                    notification.is_read ? "" : "unread"
                  }`}
                >
                  <div className="pillsync-notification-icon">
                    {getIcon(type)}
                  </div>

                  <div className="pillsync-notification-content">
                    <div className="pillsync-notification-title-row">
                      <h3 className="pillsync-notification-title">
                        {notification.title || "Notification"}
                      </h3>

                      {!notification.is_read && (
                        <span className="pillsync-new-badge">
                          NEW
                        </span>
                      )}
                    </div>

                    <p className="pillsync-notification-message">
                      {notification.message ||
                        "No message available."}
                    </p>

                    <span className="pillsync-notification-time">
                      {notification.created_at
                        ? new Date(
                            notification.created_at
                          ).toLocaleString()
                        : ""}
                    </span>

                    <div className="pillsync-notification-actions">
                      {!notification.is_read && (
                        <button
                          type="button"
                          className="pillsync-action-btn pillsync-read-btn"
                          onClick={() =>
                            markAsRead(notification.id)
                          }
                        >
                          <CheckCircle2
                            size={13}
                            style={{
                              verticalAlign: "middle",
                              marginRight: 5,
                            }}
                          />
                          Mark as read
                        </button>
                      )}

                      <button
                        type="button"
                        className="pillsync-action-btn pillsync-delete-btn"
                        onClick={() =>
                          deleteOne(notification.id)
                        }
                      >
                        <Trash2
                          size={13}
                          style={{
                            verticalAlign: "middle",
                            marginRight: 5,
                          }}
                        />
                        Delete
                      </button>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>
    </section>
  );
}

export default NotificationPanel;
