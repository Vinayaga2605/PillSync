import { useMemo, useState } from "react";
import { NavLink, useNavigate, useLocation } from "react-router-dom";
import { useAuth } from "../context/AuthContext";
import { useNotifications } from "../context/NotificationContext";

const DashboardLayout = ({ brand, role, title, subtitle, menu, children }) => {
  const navigate = useNavigate();
  const location = useLocation();
  const { user, logoutUser } = useAuth();
  const { unreadCount } = useNotifications();
  const [openGroup, setOpenGroup] = useState(null);

  const displayUser = user?.full_name || user?.email || role || "User";
  const displayRole = user?.role ? user.role.toUpperCase() : role;
  const avatarLetter = (displayUser || "U").charAt(0).toUpperCase();

  const activeGroup = useMemo(
    () =>
      (menu || []).find((item) =>
        (item.children || []).some((child) => child.to === location.pathname)
      )?.label || null,
    [location.pathname, menu]
  );

  const resolvedGroup = openGroup !== null ? openGroup : activeGroup;

  const handleLogout = () => {
    logoutUser();
    navigate("/");
  };

  return (
    <div className="shell">
      <aside className="side">
        <div className="side__brand">
          <span className="side__logo">{brand ? brand : "💊"}</span>
          <span className="side__name">PillSync</span>
        </div>

        <nav className="side__nav">
          <p className="side__label">Menu</p>
          {menu.map((item) =>
            item.children ? (
              <div className="side__group" key={item.label}>
                <div
                  className={`side__link side__link--group${
                    resolvedGroup === item.label ? " is-open" : ""
                  }`}
                  onClick={() => {
                    setOpenGroup(resolvedGroup === item.label ? null : item.label);
                    navigate(item.to);
                  }}
                >
                  <span className="side__icon">{item.icon}</span>
                  {item.label}
                  <span className="side__caret">▾</span>
                </div>
                {resolvedGroup === item.label && (
                  <div className="side__sub">
                    {item.children.map((child) => (
                      <NavLink
                        key={child.label}
                        to={child.to}
                        className={({ isActive }) =>
                          `side__link side__link--sub${
                            isActive ? " is-active" : ""
                          }`
                        }
                      >
                        <span className="side__icon">{child.icon}</span>
                        {child.label}
                      </NavLink>
                    ))}
                  </div>
                )}
              </div>
            ) : (
              <NavLink
                key={item.label}
                to={item.to}
                className={({ isActive }) =>
                  `side__link${isActive ? " is-active" : ""}`
                }
                end={item.to === "/"}
              >
                <span className="side__icon">{item.icon}</span>
                {item.label}
              </NavLink>
            )
          )}
        </nav>

        <div className="side__foot">
          <div className="side__user">
            <span className="side__avatar">{avatarLetter}</span>
            <div style={{ overflow: "hidden" }}>
              <p className="side__user-name" style={{ textOverflow: "ellipsis", overflow: "hidden", whiteSpace: "nowrap" }}>{displayUser}</p>
              <p className="side__user-role">{displayRole}</p>
            </div>
          </div>
          <button className="side__logout" onClick={handleLogout}>
            <span className="side__icon">⎋</span> Sign out
          </button>
        </div>
      </aside>

      <div className="main">
        <header className="topbar">
          <div>
            <h1 className="topbar__title">{title}</h1>
            <p className="topbar__subtitle">{subtitle}</p>
          </div>
          <div className="topbar__actions">
            <button
              className="icon-btn"
              aria-label="Notifications"
              onClick={() => navigate("/notifications")}
            >
              🔔
              {unreadCount > 0 && <span className="icon-btn__badge">{unreadCount}</span>}
            </button>
            <span className="topbar__avatar" onClick={() => navigate("/profile")} style={{ cursor: "pointer" }} title="View Profile">
              {avatarLetter}
            </span>
          </div>
        </header>

        <main className="content">{children}</main>
      </div>
    </div>
  );
};

export default DashboardLayout;