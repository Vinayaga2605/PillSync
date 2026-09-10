import React, { useContext } from "react";
import { NavLink, useNavigate } from "react-router-dom";
import { AuthContext } from "../../context/AuthContext";

const BASE_NAV = [
  /* ================= PATIENT ================= */

  {
    to: "/patient-dashboard",
    label: "Dashboard",
    icon: "🏠",
    roles: ["patient"],
  },
  {
    to: "/medicines",
    label: "Medicines",
    icon: "💊",
    roles: ["patient"],
  },
  {
    to: "/patient-my-medicines",
    label: "My Schedule",
    icon: "📅",
    roles: ["patient"],
  },
  {
    to: "/reminders",
    label: "Reminders",
    icon: "⏰",
    roles: ["patient"],
  },
  {
    to: "/medicine-upload",
    label: "Upload Prescription",
    icon: "📄",
    roles: ["patient"],
  },
  {
    to: "/analytics",
    label: "Analytics",
    icon: "📊",
    roles: ["patient"],
  },

  /* ================= CAREGIVER ================= */

  {
    to: "/caregiver-dashboard",
    label: "Dashboard",
    icon: "🏠",
    roles: ["caregiver"],
  },
  {
    to: "/caregiver-patients",
    label: "My Patients",
    icon: "👥",
    roles: ["caregiver"],
  },
  {
    to: "/caregiver-medication-monitoring",
    label: "Medication Monitoring",
    icon: "💊",
    roles: ["caregiver"],
  },
  {
    to: "/caregiver-patient-analytics",
    label: "Patient Analytics",
    icon: "📊",
    roles: ["caregiver"],
  },
  {
    to: "/caregiver-alerts",
    label: "Alerts",
    icon: "⚠️",
    roles: ["caregiver"],
  },

  /* ================= ADMIN ================= */

  {
    to: "/admin-panel",
    label: "Admin Panel",
    icon: "⚙️",
    roles: ["admin"],
  },
  {
    to: "/admin-analytics",
    label: "Analytics",
    icon: "📊",
    roles: ["admin"],
  },
  {
    to: "/admin-medicines",
    label: "Medicine Database",
    icon: "💊",
    roles: ["admin"],
  },
  {
    to: "/admin-patients",
    label: "Patients",
    icon: "👥",
    roles: ["admin"],
  },
  {
    to: "/admin-refills",
    label: "Refills",
    icon: "🔄",
    roles: ["admin"],
  },
  {
    to: "/admin-reports",
    label: "Reports",
    icon: "📄",
    roles: ["admin"],
  },
  {
    to: "/admin-system-logs",
    label: "System Logs",
    icon: "📝",
    roles: ["admin"],
  },
  {
    to: "/admin-users",
    label: "User Management",
    icon: "👤",
    roles: ["admin"],
  },
];

const Sidebar = ({ open, onClose }) => {
  const { user, logout } = useContext(AuthContext);
  const navigate = useNavigate();

  const handleLogout = () => {
    logout();
    navigate("/login");
  };

  const role = user?.role?.toLowerCase() || "patient";

  const navItems = BASE_NAV.filter((item) =>
    item.roles.includes(role)
  );

  const initials = (
    user?.username ||
    user?.name ||
    user?.email ||
    "P"
  )
    .charAt(0)
    .toUpperCase();

  return (
    <>
      {open && (
        <div
          className="sidebar-backdrop show"
          onClick={onClose}
        />
      )}

      <aside
        className={`app-sidebar ${
          open ? "open" : ""
        }`}
      >
        <div className="sidebar-brand">
          <div className="sidebar-logo">
            💊
          </div>

          <span className="sidebar-brand-name">
            PillSync
          </span>
        </div>

        <nav className="sidebar-nav">
          {navItems.map((item) => (
            <NavLink
              key={item.to}
              to={item.to}
              onClick={onClose}
              className={({ isActive }) =>
                `sidebar-link ${
                  isActive ? "active" : ""
                }`
              }
            >
              <span className="sidebar-icon">
                {item.icon}
              </span>

              <span>{item.label}</span>
            </NavLink>
          ))}
        </nav>

        <div className="sidebar-footer">
          <div className="sidebar-user">
            <div className="sidebar-avatar">
              {initials}
            </div>

            <div className="sidebar-user-info">
              <p className="sidebar-user-name">
                {user?.username ||
                  user?.name ||
                  user?.email ||
                  "User"}
              </p>

              <p className="sidebar-user-role">
                {role}
              </p>
            </div>
          </div>

          <button
            className="sidebar-logout"
            onClick={handleLogout}
          >
            Log Out
          </button>
        </div>
      </aside>
    </>
  );
};

export default Sidebar;