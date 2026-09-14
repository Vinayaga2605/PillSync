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
  LogOut,
  ChevronDown,
  User,
  Settings,
} from "lucide-react";

import { useNavigate } from "react-router-dom";

import { ThemeContext } from "../../context/ThemeContext";
import { AuthContext } from "../../context/AuthContext";
import notificationService from "../../services/notificationService";

const TopBar = ({ onMenuClick }) => {
  const navigate = useNavigate();

  const { theme, toggleTheme } =
    useContext(ThemeContext);

  const { user, logout } =
    useContext(AuthContext);

  const [notifications, setNotifications] =
    useState([]);

  const [notificationOpen, setNotificationOpen] =
    useState(false);

  const [profileOpen, setProfileOpen] =
    useState(false);

  const notificationRef = useRef(null);
  const profileRef = useRef(null);

  useEffect(() => {
    const loadNotifications = async () => {
      try {
        const data =
          await notificationService.getNotifications();

        setNotifications(
          Array.isArray(data) ? data : []
        );
      } catch (error) {
        console.error(
          "Failed to load notifications:",
          error
        );

        setNotifications([]);
      }
    };

    loadNotifications();
  }, []);

  useEffect(() => {
    const handleOutsideClick = (event) => {
      if (
        notificationRef.current &&
        !notificationRef.current.contains(
          event.target
        )
      ) {
        setNotificationOpen(false);
      }

      if (
        profileRef.current &&
        !profileRef.current.contains(
          event.target
        )
      ) {
        setProfileOpen(false);
      }
    };

    document.addEventListener(
      "mousedown",
      handleOutsideClick
    );

    return () => {
      document.removeEventListener(
        "mousedown",
        handleOutsideClick
      );
    };
  }, []);

  const unreadCount = notifications.filter(
    (notification) =>
      !notification.is_read
  ).length;

  const handleMarkAllRead = async () => {
    try {
      await notificationService.markAllNotificationsAsRead();

      setNotifications((previous) =>
        previous.map((notification) => ({
          ...notification,
          is_read: true,
        }))
      );
    } catch (error) {
      console.error(
        "Failed to mark all notifications as read:",
        error
      );
    }
  };

  const handleMarkOne = async (id) => {
    try {
      await notificationService.markNotificationAsRead(
        id
      );

      setNotifications((previous) =>
        previous.map((notification) =>
          notification.id === id
            ? {
                ...notification,
                is_read: true,
              }
            : notification
        )
      );
    } catch (error) {
      console.error(
        "Failed to mark notification as read:",
        error
      );
    }
  };

  const handleLogout = () => {
    logout();

    setNotificationOpen(false);
    setProfileOpen(false);

    navigate("/login", {
      replace: true,
    });
  };

  const handleProfile = () => {
    setProfileOpen(false);
    navigate("/profile");
  };

  const handleSettings = () => {
    setProfileOpen(false);
    navigate("/settings");
  };

  const userName =
    user?.username ||
    user?.name ||
    user?.email ||
    "User";

  const userRole =
    user?.role?.toLowerCase() ||
    "patient";

  const initials = userName
    .charAt(0)
    .toUpperCase();

  return (
    <>
      <style>
        {`
          /* =====================================================
             PROFESSIONAL PILLSYNC TOPBAR
          ===================================================== */

          .pillsync-professional-topbar {
            width: 100%;
            height: 68px;
            display: flex;
            align-items: center;
            justify-content: space-between;
            padding: 0 28px;
            background: var(--color-surface, #ffffff);
            border-bottom: 1px solid var(--color-border, #e5eaea);
            box-sizing: border-box;
          }

          /* =====================================================
             MOBILE MENU
          ===================================================== */

          .pillsync-professional-menu {
            display: none;
            width: 38px;
            height: 38px;
            padding: 0;
            border: 1px solid #e1e8e8;
            border-radius: 9px;
            background: #ffffff;
            color: #506168;
            cursor: pointer;
            align-items: center;
            justify-content: center;
          }

          .pillsync-professional-menu:hover {
            background: #f7faf9;
          }

          /* =====================================================
             ACTION AREA
          ===================================================== */

          .pillsync-professional-actions {
            margin-left: auto;
            display: flex;
            align-items: center;
            gap: 8px;
          }

          /* =====================================================
             ICON BUTTONS
          ===================================================== */

          .pillsync-action-button {
            position: relative;
            width: 38px;
            height: 38px;
            padding: 0;
            border: 1px solid #e0e7e7;
            border-radius: 9px;
            background: #ffffff;
            color: #4d5e63;
            display: flex;
            align-items: center;
            justify-content: center;
            cursor: pointer;
            transition:
              background 0.15s ease,
              border-color 0.15s ease,
              color 0.15s ease;
          }

          .pillsync-action-button:hover {
            background: #f6f9f8;
            border-color: #d3dddd;
            color: #276e6b;
          }

          /* =====================================================
             NOTIFICATION BADGE
          ===================================================== */

          .pillsync-notification-badge {
            position: absolute;
            top: -5px;
            right: -5px;
            min-width: 16px;
            height: 16px;
            padding: 0 4px;
            border-radius: 999px;
            border: 2px solid #ffffff;
            background: #e5534b;
            color: #ffffff;
            font-size: 9px;
            line-height: 1;
            font-weight: 800;
            display: flex;
            align-items: center;
            justify-content: center;
            box-sizing: border-box;
          }

          /* =====================================================
             NOTIFICATION DROPDOWN
          ===================================================== */

          .pillsync-notification-wrapper {
            position: relative;
          }

          .pillsync-notification-dropdown {
            position: absolute;
            top: 47px;
            right: 0;
            width: 340px;
            max-height: 430px;
            background: #ffffff;
            border: 1px solid #e2e8e8;
            border-radius: 12px;
            box-shadow:
              0 14px 35px rgba(15, 23, 42, 0.13);
            overflow: hidden;
            z-index: 100;
          }

          .pillsync-notification-dropdown-header {
            display: flex;
            align-items: center;
            justify-content: space-between;
            gap: 12px;
            padding: 15px 16px;
            border-bottom: 1px solid #edf1f1;
          }

          .pillsync-notification-dropdown-header h4 {
            margin: 0;
            color: #26373b;
            font-size: 14px;
            font-weight: 700;
          }

          .pillsync-notification-dropdown-header small {
            display: block;
            margin-top: 3px;
            color: #849196;
            font-size: 10px;
          }

          .pillsync-mark-all {
            padding: 0;
            border: none;
            background: transparent;
            color: #287a77;
            font-size: 11px;
            font-weight: 700;
            cursor: pointer;
          }

          .pillsync-mark-all:hover {
            text-decoration: underline;
          }

          .pillsync-notification-list {
            max-height: 360px;
            overflow-y: auto;
          }

          .pillsync-notification-item {
            width: 100%;
            display: flex;
            align-items: flex-start;
            gap: 10px;
            padding: 12px 14px;
            border: none;
            border-bottom: 1px solid #f0f3f3;
            background: #ffffff;
            text-align: left;
            cursor: pointer;
            box-sizing: border-box;
          }

          .pillsync-notification-item:hover {
            background: #f7f9f9;
          }

          .pillsync-notification-item.unread {
            background: #eef7f6;
          }

          .pillsync-notification-item-icon {
            width: 30px;
            height: 30px;
            min-width: 30px;
            border-radius: 8px;
            background: #edf7f5;
            color: #287a77;
            display: flex;
            align-items: center;
            justify-content: center;
          }

          .pillsync-notification-item-content {
            flex: 1;
            min-width: 0;
          }

          .pillsync-notification-item-content strong {
            display: block;
            margin-bottom: 3px;
            color: #33464b;
            font-size: 12px;
            font-weight: 700;
          }

          .pillsync-notification-item-content p {
            margin: 0 0 4px;
            color: #718084;
            font-size: 11px;
            line-height: 1.4;
          }

          .pillsync-notification-item-content small {
            color: #9aa6a9;
            font-size: 9px;
          }

          .pillsync-unread-dot {
            width: 6px;
            height: 6px;
            min-width: 6px;
            margin-top: 8px;
            border-radius: 50%;
            background: #287a77;
          }

          .pillsync-notification-empty {
            padding: 30px 16px;
            text-align: center;
            color: #9aa6a9;
          }

          .pillsync-notification-empty p {
            margin: 8px 0 0;
            font-size: 12px;
          }

          /* =====================================================
             PROFILE
          ===================================================== */

          .pillsync-profile-wrapper {
            position: relative;
          }

          .pillsync-profile-button {
            height: 42px;
            display: flex;
            align-items: center;
            gap: 9px;
            padding: 3px 8px 3px 4px;
            border: 1px solid transparent;
            border-radius: 10px;
            background: transparent;
            cursor: pointer;
            transition:
              background 0.15s ease,
              border-color 0.15s ease;
          }

          .pillsync-profile-button:hover {
            background: #f7faf9;
            border-color: #e4ebeb;
          }

          .pillsync-profile-avatar {
            width: 34px;
            height: 34px;
            border-radius: 50%;
            background: #eaf5f3;
            color: #287a77;
            display: flex;
            align-items: center;
            justify-content: center;
            font-size: 13px;
            font-weight: 800;
            flex-shrink: 0;
          }

          .pillsync-profile-text {
            display: flex;
            flex-direction: column;
            align-items: flex-start;
            justify-content: center;
            line-height: 1.05;
          }

          .pillsync-profile-name {
            color: #33464b;
            font-size: 13px;
            font-weight: 700;
            white-space: nowrap;
          }

          .pillsync-profile-role {
            margin-top: 4px;
            color: #7c8b8f;
            font-size: 10px;
            font-weight: 500;
            text-transform: capitalize;
          }

          .pillsync-profile-chevron {
            color: #819095;
            margin-left: 1px;
          }

          /* =====================================================
             PROFILE DROPDOWN
          ===================================================== */

          .pillsync-profile-dropdown {
            position: absolute;
            right: 0;
            top: 50px;
            width: 220px;
            background: #ffffff;
            border: 1px solid #e2e8e8;
            border-radius: 11px;
            box-shadow:
              0 14px 35px rgba(15, 23, 42, 0.13);
            overflow: hidden;
            z-index: 110;
          }

          .pillsync-profile-dropdown-header {
            padding: 14px;
            border-bottom: 1px solid #edf1f1;
          }

          .pillsync-profile-dropdown-user {
            display: flex;
            align-items: center;
            gap: 9px;
          }

          .pillsync-profile-dropdown-user-avatar {
            width: 34px;
            height: 34px;
            border-radius: 50%;
            background: #eaf5f3;
            color: #287a77;
            display: flex;
            align-items: center;
            justify-content: center;
            font-size: 13px;
            font-weight: 800;
          }

          .pillsync-profile-dropdown-user-text {
            min-width: 0;
          }

          .pillsync-profile-dropdown-user-text strong {
            display: block;
            color: #33464b;
            font-size: 13px;
          }

          .pillsync-profile-dropdown-user-text span {
            display: block;
            margin-top: 3px;
            color: #849196;
            font-size: 10px;
            text-transform: capitalize;
          }

          .pillsync-profile-dropdown-item {
            width: 100%;
            min-height: 40px;
            display: flex;
            align-items: center;
            gap: 9px;
            padding: 9px 14px;
            border: none;
            background: #ffffff;
            color: #52646a;
            text-align: left;
            font-size: 12px;
            font-weight: 600;
            cursor: pointer;
          }

          .pillsync-profile-dropdown-item:hover {
            background: #f7f9f9;
          }

          .pillsync-profile-dropdown-logout {
            color: #df5048;
            border-top: 1px solid #edf1f1;
          }

          .pillsync-profile-dropdown-logout:hover {
            background: #fff4f3;
          }

          /* =====================================================
             MOBILE
          ===================================================== */

          @media (max-width: 860px) {
            .pillsync-professional-topbar {
              height: 60px;
              padding: 0 14px;
            }

            .pillsync-professional-menu {
              display: flex;
            }

            .pillsync-professional-actions {
              gap: 5px;
            }

            .pillsync-action-button {
              width: 36px;
              height: 36px;
            }

            .pillsync-profile-button {
              padding: 2px;
              border: none;
            }

            .pillsync-profile-text,
            .pillsync-profile-chevron {
              display: none;
            }

            .pillsync-profile-avatar {
              width: 35px;
              height: 35px;
            }

            .pillsync-notification-dropdown {
              right: -52px;
              width: min(
                340px,
                calc(100vw - 20px)
              );
            }

            .pillsync-profile-dropdown {
              right: 0;
            }
          }
        `}
      </style>

      <header className="pillsync-professional-topbar">

        {/* Mobile menu */}
        <button
          className="pillsync-professional-menu"
          onClick={onMenuClick}
          type="button"
          aria-label="Open navigation"
          title="Menu"
        >
          <Menu
            size={20}
            strokeWidth={1.9}
          />
        </button>

        <div className="pillsync-professional-actions">

          {/* Theme */}
          <button
            className="pillsync-action-button"
            onClick={toggleTheme}
            type="button"
            aria-label="Toggle theme"
            title="Toggle theme"
          >
            {theme === "light" ? (
              <Moon
                size={18}
                strokeWidth={1.8}
              />
            ) : (
              <Sun
                size={18}
                strokeWidth={1.8}
              />
            )}
          </button>

          {/* Notifications */}
          <div
            className="pillsync-notification-wrapper"
            ref={notificationRef}
          >
            <button
              className="pillsync-action-button"
              onClick={() => {
                setNotificationOpen(
                  (current) => !current
                );
                setProfileOpen(false);
              }}
              type="button"
              aria-label="Notifications"
              title="Notifications"
            >
              <Bell
                size={18}
                strokeWidth={1.8}
              />

              {unreadCount > 0 && (
                <span className="pillsync-notification-badge">
                  {unreadCount > 99
                    ? "99+"
                    : unreadCount}
                </span>
              )}
            </button>

            {notificationOpen && (
              <div className="pillsync-notification-dropdown">

                <div className="pillsync-notification-dropdown-header">
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
                      className="pillsync-mark-all"
                      onClick={handleMarkAllRead}
                      type="button"
                    >
                      Mark all as read
                    </button>
                  )}
                </div>

                <div className="pillsync-notification-list">

                  {notifications.length === 0 ? (
                    <div className="pillsync-notification-empty">
                      <Bell
                        size={20}
                        strokeWidth={1.6}
                      />

                      <p>
                        No notifications yet.
                      </p>
                    </div>
                  ) : (
                    notifications.map(
                      (notification) => (
                        <button
                          key={notification.id}
                          className={`pillsync-notification-item ${
                            notification.is_read
                              ? ""
                              : "unread"
                          }`}
                          onClick={() =>
                            handleMarkOne(
                              notification.id
                            )
                          }
                          type="button"
                        >
                          <div className="pillsync-notification-item-icon">
                            <Bell
                              size={14}
                              strokeWidth={1.8}
                            />
                          </div>

                          <div className="pillsync-notification-item-content">
                            <strong>
                              {notification.title ||
                                "Notification"}
                            </strong>

                            <p>
                              {notification.message ||
                                ""}
                            </p>

                            {notification.created_at && (
                              <small>
                                {new Date(
                                  notification.created_at
                                ).toLocaleString()}
                              </small>
                            )}
                          </div>

                          {!notification.is_read && (
                            <span className="pillsync-unread-dot" />
                          )}
                        </button>
                      )
                    )
                  )}

                </div>
              </div>
            )}
          </div>

          {/* User profile */}
          <div
            className="pillsync-profile-wrapper"
            ref={profileRef}
          >
            <button
              className="pillsync-profile-button"
              onClick={() => {
                setProfileOpen(
                  (current) => !current
                );

                setNotificationOpen(false);
              }}
              type="button"
              aria-label="Open profile menu"
              title="Profile"
            >
              <div className="pillsync-profile-avatar">
                {initials}
              </div>

              <div className="pillsync-profile-text">
                <span className="pillsync-profile-name">
                  {userName}
                </span>

                <span className="pillsync-profile-role">
                  {userRole}
                </span>
              </div>

              <ChevronDown
                className="pillsync-profile-chevron"
                size={15}
                strokeWidth={1.8}
              />
            </button>

            {profileOpen && (
              <div className="pillsync-profile-dropdown">

                <div className="pillsync-profile-dropdown-header">
                  <div className="pillsync-profile-dropdown-user">

                    <div className="pillsync-profile-dropdown-user-avatar">
                      {initials}
                    </div>

                    <div className="pillsync-profile-dropdown-user-text">
                      <strong>
                        {userName}
                      </strong>

                      <span>
                        {userRole}
                      </span>
                    </div>

                  </div>
                </div>

                {/* Profile */}
                <button
                  className="pillsync-profile-dropdown-item"
                  type="button"
                  onClick={handleProfile}
                >
                  <User
                    size={15}
                    strokeWidth={1.8}
                  />
                  Profile
                </button>

                {/* Settings */}
                <button
                  className="pillsync-profile-dropdown-item"
                  type="button"
                  onClick={handleSettings}
                >
                  <Settings
                    size={15}
                    strokeWidth={1.8}
                  />
                  Settings
                </button>

                {/* Logout */}
                <button
                  className="pillsync-profile-dropdown-item pillsync-profile-dropdown-logout"
                  type="button"
                  onClick={handleLogout}
                >
                  <LogOut
                    size={15}
                    strokeWidth={1.8}
                  />
                  Log Out
                </button>

              </div>
            )}
          </div>

        </div>
      </header>
    </>
  );
};

export default TopBar;