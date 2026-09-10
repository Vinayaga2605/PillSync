import React, {
  useState,
  useEffect,
  useContext,
  useRef,
} from "react";

import {
  Menu,
  Sun,
  Moon,
  Bell,
} from "lucide-react";

import { ThemeContext } from "../../context/ThemeContext";
import { AuthContext } from "../../context/AuthContext";
import notificationService from "../../services/notificationService";
import api from "../../services/api";

const TopBar = ({ onMenuClick }) => {
  const { theme, toggleTheme } =
    useContext(ThemeContext);

  const { user } = useContext(AuthContext);

  const [notifications, setNotifications] =
    useState([]);

  const [open, setOpen] = useState(false);

  const panelRef = useRef(null);

  useEffect(() => {
    const loadNotifications = async () => {
      try {
        const data =
          await notificationService.getNotifications();

        setNotifications(
          Array.isArray(data) ? data : []
        );
      } catch (err) {
        console.error(
          "Failed to load notifications:",
          err
        );

        setNotifications([]);
      }
    };

    loadNotifications();
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
      await api.patch(
        "/notifications/mark-all-read/"
      );

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
      await notificationService.markNotificationAsRead(
        id
      );

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

  const initials = (
    user?.username ||
    user?.name ||
    user?.email ||
    "U"
  )
    .charAt(0)
    .toUpperCase();

  return (
    <header className="top-bar">
      {/* Mobile menu */}
      <button
        className="menu-btn"
        onClick={onMenuClick}
        aria-label="Toggle menu"
        title="Menu"
        type="button"
      >
        <Menu size={22} strokeWidth={2} />
      </button>

      <div className="top-bar-actions">
        {/* Theme */}
        <button
          className="icon-btn"
          onClick={toggleTheme}
          aria-label="Toggle dark mode"
          title="Toggle dark mode"
          type="button"
        >
          {theme === "light" ? (
            <Moon size={20} strokeWidth={2} />
          ) : (
            <Sun size={20} strokeWidth={2} />
          )}
        </button>

        {/* Notifications */}
        <div
          className="notification-wrapper"
          ref={panelRef}
        >
          <button
            className="icon-btn notification-btn"
            onClick={() =>
              setOpen((current) => !current)
            }
            aria-label="Notifications"
            title="Notifications"
            type="button"
          >
            <Bell size={20} strokeWidth={2} />

            {unreadCount > 0 && (
              <span className="notif-badge">
                {unreadCount > 99
                  ? "99+"
                  : unreadCount}
              </span>
            )}
          </button>

          {open && (
            <div className="notification-panel">
              <div className="notification-panel-header">
                <div>
                  <h4>Notifications</h4>

                  {unreadCount > 0 && (
                    <small>
                      {unreadCount} unread
                    </small>
                  )}
                </div>

                {unreadCount > 0 && (
                  <button
                    onClick={handleMarkAllRead}
                    className="mark-all-btn"
                    type="button"
                  >
                    Mark all as read
                  </button>
                )}
              </div>

              <div className="notification-list">
                {notifications.length === 0 ? (
                  <div className="notif-empty">
                    <Bell
                      size={22}
                      strokeWidth={1.8}
                    />

                    <p>
                      No notifications yet.
                    </p>
                  </div>
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
                        role="button"
                        tabIndex={0}
                        onKeyDown={(e) => {
                          if (
                            e.key === "Enter" ||
                            e.key === " "
                          ) {
                            handleMarkOne(
                              notification.id
                            );
                          }
                        }}
                      >
                        <div className="notification-item-icon">
                          <Bell
                            size={16}
                            strokeWidth={2}
                          />
                        </div>

                        <div className="notification-item-content">
                          <p className="notif-title">
                            {notification.title ||
                              "Notification"}
                          </p>

                          <p className="notif-message">
                            {notification.message ||
                              ""}
                          </p>

                          {notification.created_at && (
                            <p className="notif-time">
                              {new Date(
                                notification.created_at
                              ).toLocaleString()}
                            </p>
                          )}
                        </div>

                        {!notification.is_read && (
                          <span className="unread-dot" />
                        )}
                      </div>
                    )
                  )
                )}
              </div>
            </div>
          )}
        </div>

        {/* User avatar */}
        <div
          className="topbar-user-avatar"
          title={
            user?.username ||
            user?.name ||
            "User"
          }
        >
          {initials}
        </div>
      </div>
    </header>
  );
};

export default TopBar;