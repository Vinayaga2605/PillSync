import React, { useContext } from "react";
import { NavLink, useNavigate } from "react-router-dom";
import { AuthContext } from "../../context/AuthContext";


/* =========================================================
   SIDEBAR NAVIGATION
   ========================================================= */

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


  /* ================= ADMIN ================= */

  {
    to: "/admin-panel",
    label: "Admin Panel",
    icon: "🛠️",
    roles: ["admin"],
  },
];


const Sidebar = ({ open, onClose }) => {

  const { user, logout } = useContext(AuthContext);

  const navigate = useNavigate();


  /* =======================================================
     LOGOUT
     ======================================================= */

  const handleLogout = () => {
    logout();
    navigate("/login");
  };


  /* =======================================================
     USER ROLE
     ======================================================= */

  const role =
    user?.role?.toLowerCase() || "patient";


  /* =======================================================
     FILTER NAVIGATION BY ROLE
     ======================================================= */

  const navItems = BASE_NAV.filter((item) =>
    item.roles.includes(role)
  );


  /* =======================================================
     USER INITIAL
     ======================================================= */

  const initials = (
    user?.username ||
    user?.name ||
    "P"
  )
    .charAt(0)
    .toUpperCase();


  return (
    <>
      {/* ===================================================
          MOBILE BACKDROP
          =================================================== */}

      {open && (
        <div
          className="sidebar-backdrop show"
          onClick={onClose}
        />
      )}


      {/* ===================================================
          SIDEBAR
          =================================================== */}

      <aside
        className={`app-sidebar ${
          open ? "open" : ""
        }`}
      >

        {/* =================================================
            BRAND
            ================================================= */}

        <div className="sidebar-brand">

          <div className="sidebar-logo">
            💊
          </div>

          <span className="sidebar-brand-name">
            PillSync
          </span>

        </div>


        {/* =================================================
            NAVIGATION
            ================================================= */}

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

              <span>
                {item.label}
              </span>

            </NavLink>

          ))}

        </nav>


        {/* =================================================
            USER SECTION
            ================================================= */}

        <div className="sidebar-footer">

          <div className="sidebar-user">

            <div className="sidebar-avatar">
              {initials}
            </div>

            <div className="sidebar-user-info">

              <p className="sidebar-user-name">
                {user?.username ||
                  user?.name ||
                  "User"}
              </p>

              <p className="sidebar-user-role">
                {role}
              </p>

            </div>

          </div>


          {/* =================================================
              LOGOUT
              ================================================= */}

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
