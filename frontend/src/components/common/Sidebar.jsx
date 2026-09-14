import React from "react";
import { NavLink } from "react-router-dom";
import {
  LayoutDashboard,
  Pill,
  CalendarDays,
  BellRing,
  FileUp,
  BarChart3,
  Users,
  Activity,
  TriangleAlert,
  Settings,
  Database,
  RefreshCw,
  FileText,
  ClipboardList,
  UserCog,
} from "lucide-react";

const BASE_NAV = [
  // ================= PATIENT =================
  {
    to: "/patient-dashboard",
    label: "Dashboard",
    icon: LayoutDashboard,
    roles: ["patient"],
  },
  {
    to: "/medicines",
    label: "Medicines",
    icon: Pill,
    roles: ["patient"],
  },
  {
    to: "/patient-my-medicines",
    label: "My Schedule",
    icon: CalendarDays,
    roles: ["patient"],
  },
  {
    to: "/reminders",
    label: "Reminders",
    icon: BellRing,
    roles: ["patient"],
  },
  {
    to: "/medicine-upload",
    label: "Upload Prescription",
    icon: FileUp,
    roles: ["patient"],
  },
  {
    to: "/analytics",
    label: "Analytics",
    icon: BarChart3,
    roles: ["patient"],
  },

  // ================= CAREGIVER =================
  {
    to: "/caregiver-dashboard",
    label: "Dashboard",
    icon: LayoutDashboard,
    roles: ["caregiver"],
  },
  {
    to: "/caregiver-patients",
    label: "My Patients",
    icon: Users,
    roles: ["caregiver"],
  },
  {
    to: "/caregiver-medication-monitoring",
    label: "Medication Monitoring",
    icon: Activity,
    roles: ["caregiver"],
  },
  {
    to: "/caregiver-patient-analytics",
    label: "Patient Analytics",
    icon: BarChart3,
    roles: ["caregiver"],
  },
  {
    to: "/caregiver-alerts",
    label: "Alerts",
    icon: TriangleAlert,
    roles: ["caregiver"],
  },

  // ================= ADMIN =================
  {
    to: "/admin-panel",
    label: "Admin Panel",
    icon: Settings,
    roles: ["admin"],
  },
  {
    to: "/admin-analytics",
    label: "Analytics",
    icon: BarChart3,
    roles: ["admin"],
  },
  {
    to: "/admin-medicines",
    label: "Medicine Database",
    icon: Database,
    roles: ["admin"],
  },
  {
    to: "/admin-patients",
    label: "Patients",
    icon: Users,
    roles: ["admin"],
  },
  {
    to: "/admin-refills",
    label: "Refills",
    icon: RefreshCw,
    roles: ["admin"],
  },
  {
    to: "/admin-reports",
    label: "Reports",
    icon: FileText,
    roles: ["admin"],
  },
  {
    to: "/admin-system-logs",
    label: "System Logs",
    icon: ClipboardList,
    roles: ["admin"],
  },
  {
    to: "/admin-users",
    label: "User Management",
    icon: UserCog,
    roles: ["admin"],
  },
];

const Sidebar = ({ open, onClose }) => {
  const storedUser = localStorage.getItem("user");

  let user = null;

  try {
    user = storedUser ? JSON.parse(storedUser) : null;
  } catch {
    user = null;
  }

  const role = user?.role?.toLowerCase() || "patient";

  const navItems = BASE_NAV.filter((item) =>
    item.roles.includes(role)
  );

  return (
    <>
      {open && (
        <div
          className="sidebar-backdrop show"
          onClick={onClose}
          aria-hidden="true"
        />
      )}

      <style>
        {`
          .app-sidebar {
            width: 240px;
            min-height: 100vh;
            background: var(--color-surface);
            border-right: 1px solid var(--color-border);
            display: flex;
            flex-direction: column;
            padding: 24px 16px;
            position: sticky;
            top: 0;
            flex-shrink: 0;
            z-index: 50;
          }

          .sidebar-brand {
            display: flex;
            align-items: center;
            gap: 10px;
            padding: 0 8px;
            margin-bottom: 32px;
          }

          .sidebar-logo {
            width: 34px;
            height: 34px;
            border-radius: 10px;
            background: var(--color-primary-light);
            color: var(--color-primary);
            display: flex;
            align-items: center;
            justify-content: center;
            flex-shrink: 0;
          }

          .sidebar-brand-name {
            font-size: 17px;
            font-weight: 800;
            color: var(--color-primary-deep);
            letter-spacing: -0.02em;
          }

          .sidebar-nav {
            display: flex;
            flex-direction: column;
            gap: 4px;
            flex: 1;
          }

          .sidebar-link {
            display: flex;
            align-items: center;
            gap: 12px;
            min-height: 44px;
            padding: 10px 12px;
            border-radius: var(--radius-md);
            color: var(--color-text-muted);
            text-decoration: none;
            font-size: 14px;
            font-weight: 600;
            transition:
              background 0.15s ease,
              color 0.15s ease,
              transform 0.15s ease;
          }

          .sidebar-link:hover {
            background: var(--color-surface-alt);
            color: var(--color-text);
          }

          .sidebar-link.active {
            background: var(--color-primary-light);
            color: var(--color-primary-deep);
          }

          .sidebar-link svg {
            flex-shrink: 0;
          }

          .sidebar-backdrop {
            display: none;
          }

          @media (max-width: 860px) {
            .app-sidebar {
              position: fixed;
              left: -260px;
              top: 0;
              height: 100vh;
              transition: left 0.2s ease;
              box-shadow: var(--shadow-hover);
            }

            .app-sidebar.open {
              left: 0;
            }

            .sidebar-backdrop.show {
              display: block;
              position: fixed;
              inset: 0;
              background: rgba(0, 0, 0, 0.35);
              z-index: 40;
            }
          }

          @media (max-width: 480px) {
            .app-sidebar {
              width: 230px;
              padding: 20px 12px;
            }
          }
        `}
      </style>

      <aside className={`app-sidebar ${open ? "open" : ""}`}>
        <div className="sidebar-brand">
          <div className="sidebar-logo">
            <Pill size={19} strokeWidth={2} />
          </div>

          <span className="sidebar-brand-name">PillSync</span>
        </div>

        <nav className="sidebar-nav" aria-label="Main navigation">
          {navItems.map((item) => {
            const Icon = item.icon;

            return (
              <NavLink
                key={item.to}
                to={item.to}
                onClick={onClose}
                className={({ isActive }) =>
                  `sidebar-link ${isActive ? "active" : ""}`
                }
              >
                <Icon size={18} strokeWidth={1.9} />
                <span>{item.label}</span>
              </NavLink>
            );
          })}
        </nav>
      </aside>
    </>
  );
};

export default Sidebar;