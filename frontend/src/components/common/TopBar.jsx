import React, {
  useState,
  useEffect,
  useContext,
  useRef,
} from "react";

import { ThemeContext } from "../../context/ThemeContext";
import notificationService from "../../services/notificationService";


const TopBar = ({ onMenuClick }) => {
  const { theme, toggleTheme } =
    useContext(ThemeContext);

  const [notifications, setNotifications] =
    useState([]);

  const [open, setOpen] = useState(false);

  const panelRef = useRef(null);

  useEffect(() => {
    notificationService
      .getNotifications()
      .then((res) => {
        setNotifications(res.data || []);
      })
      .catch((err) => {
        console.error(
          "Failed to load notifications:",
          err
        );

        setNotifications([]);
      });
  }, []);

  useEffect(() => {
    const handler = (e) => {
      if (
        panelRef.current &&
        !panelRef.current.contains(e.target)
      ) {
        setOpen(false);
      }
    };

    document.addEventListener(
      "mousedown",
      handler
    );

    return () => {
      document.removeEventListener(
        "mousedown",
        handler
      );
    };
  }, []);

  const unreadCount = notifications.filter(
    (notification) => !notification.is_read
  ).length;

  const handleMarkAllRead = async () => {
    try {
      await notificationService.markAllAsRead();

      setNotifications((prev) =>
        prev.map((notification) => ({
          ...notification,
          is_read: true,
        }))
      );
    } catch (err) {
      console.error(
        "Failed to mark all as read:",
        err
      );
    }
  };

  const handleMarkOne = async (id) => {
    try {
      await notificationService.markAsRead(id);

      setNotifications((prev) =>
        prev.map((notification) =>
          notification.id === id
            ? {
                ...notification,
                is_read: true,
              }
            : notification
        )
      );
    } catch (err) {
      console.error(
        "Failed to mark notification as read:",
        err
      );
    }
  };

  return (
    <header className="top-bar">
      {/* Mobile menu */}
      <button
        className="menu-btn"
        onClick={onMenuClick}
        aria-label="Toggle menu"
      >
        ☰
      </button>

      <div className="top-bar-actions">
        {/* Theme */}
        <button
          className="icon-btn"
          onClick={toggleTheme}
          aria-label="Toggle dark mode"
          title="Toggle dark mode"
        >
          {theme === "light" ? "🌙" : "☀️"}
        </button>

        {/* Notifications */}
        <div
          className="notification-wrapper"
          ref={panelRef}
        >
          <button
            className="icon-btn"
            onClick={() =>
              setOpen((current) => !current)
            }
            aria-label="Notifications"
            title="Notifications"
          >
            🔔

            {unreadCount > 0 && (
              <span className="notif-badge">
                {unreadCount}
              </span>
            )}
          </button>

          {open && (
            <div className="notification-panel">
              <div className="notification-panel-header">
                <h4>Notifications</h4>

                {unreadCount > 0 && (
                  <button
                    onClick={handleMarkAllRead}
                    className="mark-all-btn"
                  >
                    Mark all as read
                  </button>
                )}
              </div>

              <div className="notification-list">
                {notifications.length === 0 ? (
                  <p className="notif-empty">
                    No notifications yet.
                  </p>
                ) : (
                  notifications.map(
                    (notification) => (
                      <div
                        key={notification.id}
                        className={`notification-item ${
                          notification.is_read
                            ? ""
                            : "unread"
                        }`}
                        onClick={() =>
                          handleMarkOne(
                            notification.id
                          )
                        }
                      >
                        <p className="notif-title">
                          {notification.title}
                        </p>

                        <p className="notif-message">
                          {notification.message}
                        </p>

                        <p className="notif-time">
                          {new Date(
                            notification.created_at
                          ).toLocaleString()}
                        </p>
                      </div>
                    )
                  )
                )}
              </div>
            </div>
          )}
        </div>
      </div>
    </header>
  );
};

export default TopBar;
