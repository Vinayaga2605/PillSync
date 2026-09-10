import React, { useEffect, useState } from "react";
import {
  Users,
  UserRound,
  UserCog,
  Pill,
  Settings,
  Bell,
  BarChart3,
  Database,
  Globe,
  CheckCircle2,
  Activity,
  ArrowRight,
  RefreshCw,
  AlertTriangle,
} from "lucide-react";

import adminService from "../../services/adminService";
import api from "../../services/api";

const AdminDashboard = () => {
  const [stats, setStats] = useState(null);
  const [notifications, setNotifications] = useState([]);
  const [users, setUsers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  const loadDashboard = async () => {
    try {
      setLoading(true);
      setError("");

      const [
        statsResponse,
        usersResponse,
        notificationResponse,
      ] = await Promise.all([
        adminService.getSystemStats(),
        adminService.getUsers(),
        api.get("/notifications/"),
      ]);

      setStats(statsResponse.data || {});

      const usersData =
        usersResponse.data?.results ||
        usersResponse.data ||
        [];

      setUsers(
        Array.isArray(usersData)
          ? usersData
          : []
      );

      const notificationData =
        notificationResponse.data?.notifications ||
        notificationResponse.data ||
        [];

      setNotifications(
        Array.isArray(notificationData)
          ? notificationData
          : []
      );
    } catch (err) {
      console.error(
        "Admin dashboard error:",
        err
      );

      setError(
        err?.response?.data?.detail ||
          "Unable to load admin dashboard."
      );
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadDashboard();
  }, []);

  const unreadNotifications =
    notifications.filter(
      (item) => !item.is_read
    ).length;

  const recentUsers = users.slice(0, 5);

  const overallAdherence = Math.min(
    Math.max(
      Number(stats?.overallAdherence || 0),
      0
    ),
    100
  );

  return (
    <div className="admin-dashboard-page">
      <style>{adminDashboardStyles}</style>

      <header className="admin-dashboard-header">
        <div>
          <p className="admin-eyebrow">
            Administration
          </p>

          <h1>Administrator Dashboard</h1>

          <p>
            Live PillSync platform overview and
            system status.
          </p>
        </div>

        <button
          className="admin-refresh-btn"
          onClick={loadDashboard}
          type="button"
        >
          <RefreshCw size={17} />
          Refresh
        </button>
      </header>

      {error && (
        <div className="admin-error">
          <AlertTriangle size={18} />
          <span>{error}</span>
        </div>
      )}

      {loading ? (
        <div className="admin-loading">
          <div className="admin-spinner" />
          <p>Loading dashboard...</p>
        </div>
      ) : (
        <>
          {/* MAIN STATISTICS */}

          <section className="admin-stats-grid">
            <AdminStat
              icon={<Users size={22} />}
              value={stats?.totalUsers ?? 0}
              label="Total Users"
              tone="blue"
            />

            <AdminStat
              icon={<UserRound size={22} />}
              value={stats?.totalPatients ?? 0}
              label="Patients"
              tone="green"
            />

            <AdminStat
              icon={<UserCog size={22} />}
              value={stats?.totalCaregivers ?? 0}
              label="Caregivers"
              tone="purple"
            />

            <AdminStat
              icon={<Pill size={22} />}
              value={
                stats?.totalMedications ?? 0
              }
              label="Medications"
              tone="orange"
            />
          </section>

          <section className="admin-stats-grid">
            <AdminStat
              icon={<Settings size={22} />}
              value={stats?.totalAdmins ?? 0}
              label="Administrators"
              tone="slate"
            />

            <AdminStat
              icon={<Bell size={22} />}
              value={unreadNotifications}
              label="Unread Notifications"
              tone="pink"
            />

            <AdminStat
              icon={<BarChart3 size={22} />}
              value={`${overallAdherence}%`}
              label="Overall Adherence"
              tone="teal"
            />

            <AdminStat
              icon={<CheckCircle2 size={22} />}
              value="Online"
              label="System Status"
              tone="green"
            />
          </section>

          {/* TWO COLUMN AREA */}

          <div className="admin-two-column">
            {/* SYSTEM OVERVIEW */}

            <section className="admin-panel">
              <div className="admin-panel-header">
                <div>
                  <p className="admin-section-kicker">
                    Platform health
                  </p>

                  <h2>System Overview</h2>
                </div>

                <Activity
                  size={21}
                  className="admin-panel-header-icon"
                />
              </div>

              <div className="admin-list">
                <SystemRow
                  icon={<Database size={19} />}
                  title="Database"
                  description="Django database connection"
                  badge="Connected"
                  success
                />

                <SystemRow
                  icon={<Globe size={19} />}
                  title="REST API"
                  description="Django REST Framework"
                  badge="Available"
                  success
                />

                <SystemRow
                  icon={<Bell size={19} />}
                  title="Notifications"
                  description="Unread notifications"
                  badge={unreadNotifications}
                />

                <div className="admin-system-row">
                  <div className="admin-system-icon">
                    <BarChart3 size={19} />
                  </div>

                  <div className="admin-system-content">
                    <strong>Adherence</strong>

                    <span>
                      Current system-wide adherence
                    </span>

                    <div className="admin-progress">
                      <div
                        className="admin-progress-fill"
                        style={{
                          width: `${overallAdherence}%`,
                        }}
                      />
                    </div>
                  </div>

                  <span className="admin-badge success">
                    {overallAdherence}%
                  </span>
                </div>
              </div>
            </section>

            {/* RECENT USERS */}

            <section className="admin-panel">
              <div className="admin-panel-header">
                <div>
                  <p className="admin-section-kicker">
                    User activity
                  </p>

                  <h2>Recent Users</h2>
                </div>

                <button
                  className="admin-view-btn"
                  onClick={() =>
                    (window.location.href =
                      "/admin-users")
                  }
                  type="button"
                >
                  View all
                  <ArrowRight size={15} />
                </button>
              </div>

              {recentUsers.length === 0 ? (
                <div className="admin-empty">
                  <Users size={24} />
                  <p>No users available.</p>
                </div>
              ) : (
                <div className="admin-list">
                  {recentUsers.map((user) => (
                    <div
                      className="admin-user-row"
                      key={user.id}
                    >
                      <div className="admin-user-avatar">
                        {(
                          user.username ||
                          user.name ||
                          "U"
                        )
                          .charAt(0)
                          .toUpperCase()}
                      </div>

                      <div className="admin-user-content">
                        <strong>
                          {user.username ||
                            user.name ||
                            "User"}
                        </strong>

                        <span>
                          {user.email ||
                            "No email"}
                        </span>
                      </div>

                      <span className="admin-badge">
                        {user.role ||
                          "patient"}
                      </span>
                    </div>
                  ))}
                </div>
              )}
            </section>
          </div>

          {/* PLATFORM SUMMARY */}

          <section className="admin-panel admin-summary-panel">
            <div className="admin-panel-header">
              <div>
                <p className="admin-section-kicker">
                  Overall statistics
                </p>

                <h2>Platform Summary</h2>
              </div>
            </div>

            <div className="admin-summary-grid">
              <SummaryItem
                icon={<Users size={20} />}
                title="Registered Users"
                description="Patients, caregivers and administrators"
                value={
                  stats?.totalUsers ?? 0
                }
              />

              <SummaryItem
                icon={<Pill size={20} />}
                title="Active Medication Records"
                description="Medicines currently registered in PillSync"
                value={
                  stats?.totalMedications ?? 0
                }
              />

              <SummaryItem
                icon={<BarChart3 size={20} />}
                title="Overall Adherence"
                description="Current system-wide adherence"
                value={`${overallAdherence}%`}
                success
              />
            </div>
          </section>

          {/* QUICK ACTIONS */}

          <section className="admin-panel">
            <div className="admin-panel-header">
              <div>
                <p className="admin-section-kicker">
                  Administration
                </p>

                <h2>Quick Actions</h2>
              </div>
            </div>

            <div className="admin-actions-grid">
              <QuickAction
                icon={<Users size={20} />}
                title="Manage Users"
                description="Create, edit or deactivate users"
                onClick={() =>
                  (window.location.href =
                    "/admin-users")
                }
              />

              <QuickAction
                icon={<Pill size={20} />}
                title="Medicine Database"
                description="View the medicine database"
                onClick={() =>
                  (window.location.href =
                    "/admin-medicines")
                }
              />

              <QuickAction
                icon={<UserRound size={20} />}
                title="Patients"
                description="Review registered patients"
                onClick={() =>
                  (window.location.href =
                    "/admin-patients")
                }
              />

              <QuickAction
                icon={<BarChart3 size={20} />}
                title="Analytics"
                description="View system analytics"
                onClick={() =>
                  (window.location.href =
                    "/admin-analytics")
                }
              />
            </div>
          </section>
        </>
      )}
    </div>
  );
};

/* =========================================================
   STAT CARD
========================================================= */

const AdminStat = ({
  icon,
  value,
  label,
  tone,
}) => {
  return (
    <div className="admin-stat-card">
      <div
        className={`admin-stat-icon ${tone}`}
      >
        {icon}
      </div>

      <div className="admin-stat-value">
        {value}
      </div>

      <div className="admin-stat-label">
        {label}
      </div>
    </div>
  );
};

/* =========================================================
   SYSTEM ROW
========================================================= */

const SystemRow = ({
  icon,
  title,
  description,
  badge,
  success = false,
}) => {
  return (
    <div className="admin-system-row">
      <div className="admin-system-icon">
        {icon}
      </div>

      <div className="admin-system-content">
        <strong>{title}</strong>

        <span>{description}</span>
      </div>

      <span
        className={`admin-badge ${
          success ? "success" : ""
        }`}
      >
        {badge}
      </span>
    </div>
  );
};

/* =========================================================
   SUMMARY ITEM
========================================================= */

const SummaryItem = ({
  icon,
  title,
  description,
  value,
  success = false,
}) => {
  return (
    <div className="admin-summary-item">
      <div className="admin-summary-icon">
        {icon}
      </div>

      <div className="admin-summary-content">
        <strong>{title}</strong>

        <span>{description}</span>
      </div>

      <span
        className={`admin-summary-value ${
          success ? "success-value" : ""
        }`}
      >
        {value}
      </span>
    </div>
  );
};

/* =========================================================
   QUICK ACTION
========================================================= */

const QuickAction = ({
  icon,
  title,
  description,
  onClick,
}) => {
  return (
    <button
      className="admin-quick-action"
      onClick={onClick}
      type="button"
    >
      <div className="admin-quick-icon">
        {icon}
      </div>

      <div>
        <strong>{title}</strong>
        <span>{description}</span>
      </div>

      <ArrowRight
        size={17}
        className="admin-quick-arrow"
      />
    </button>
  );
};

/* =========================================================
   STYLES
========================================================= */

const adminDashboardStyles = `
  .admin-dashboard-page {
    min-height: calc(100vh - 80px);
    padding: 28px;
    background: #f7f9fc;
    color: #172033;
  }

  .admin-dashboard-header {
    display: flex;
    align-items: flex-start;
    justify-content: space-between;
    gap: 20px;
    margin-bottom: 24px;
  }

  .admin-eyebrow,
  .admin-section-kicker {
    margin: 0 0 6px;
    color: #0f9488;
    font-size: 11px;
    font-weight: 700;
    text-transform: uppercase;
    letter-spacing: .08em;
  }

  .admin-dashboard-header h1 {
    margin: 0;
    color: #172033;
    font-size: 30px;
    font-weight: 750;
  }

  .admin-dashboard-header > div > p:last-child {
    margin: 7px 0 0;
    color: #697386;
    font-size: 14px;
  }

  .admin-refresh-btn {
    display: inline-flex;
    align-items: center;
    gap: 7px;
    border: 1px solid #dce3eb;
    border-radius: 10px;
    background: #fff;
    color: #344054;
    padding: 10px 14px;
    font-size: 13px;
    font-weight: 650;
    cursor: pointer;
  }

  .admin-refresh-btn:hover {
    background: #f9fafb;
  }

  .admin-error {
    display: flex;
    align-items: center;
    gap: 9px;
    margin-bottom: 20px;
    padding: 12px 14px;
    border: 1px solid #fecaca;
    border-radius: 10px;
    background: #fff5f5;
    color: #b42318;
    font-size: 13px;
  }

  .admin-stats-grid {
    display: grid;
    grid-template-columns: repeat(4, minmax(0, 1fr));
    gap: 16px;
    margin-bottom: 16px;
  }

  .admin-stat-card {
    background: #fff;
    border: 1px solid #e7ebf0;
    border-radius: 14px;
    padding: 18px;
    box-shadow: 0 2px 8px rgba(15, 23, 42, .03);
  }

  .admin-stat-icon {
    width: 43px;
    height: 43px;
    display: flex;
    align-items: center;
    justify-content: center;
    margin-bottom: 15px;
    border-radius: 11px;
  }

  .admin-stat-icon.blue {
    background: #eff6ff;
    color: #2563eb;
  }

  .admin-stat-icon.green {
    background: #ecfdf3;
    color: #039855;
  }

  .admin-stat-icon.purple {
    background: #f5f3ff;
    color: #7c3aed;
  }

  .admin-stat-icon.orange {
    background: #fff7ed;
    color: #ea580c;
  }

  .admin-stat-icon.slate {
    background: #f1f5f9;
    color: #475569;
  }

  .admin-stat-icon.pink {
    background: #fdf2f8;
    color: #db2777;
  }

  .admin-stat-icon.teal {
    background: #e8f8f6;
    color: #0f9488;
  }

  .admin-stat-value {
    color: #172033;
    font-size: 28px;
    line-height: 1;
    font-weight: 750;
  }

  .admin-stat-label {
    margin-top: 7px;
    color: #697386;
    font-size: 13px;
  }

  .admin-two-column {
    display: grid;
    grid-template-columns: repeat(2, minmax(0, 1fr));
    gap: 18px;
    margin-top: 18px;
    margin-bottom: 18px;
  }

  .admin-panel {
    background: #fff;
    border: 1px solid #e7ebf0;
    border-radius: 14px;
    padding: 20px;
    box-shadow: 0 2px 8px rgba(15, 23, 42, .03);
    margin-bottom: 18px;
  }

  .admin-summary-panel {
    margin-bottom: 18px;
  }

  .admin-panel-header {
    display: flex;
    align-items: flex-start;
    justify-content: space-between;
    gap: 15px;
    margin-bottom: 18px;
  }

  .admin-panel-header h2 {
    margin: 0;
    color: #172033;
    font-size: 19px;
  }

  .admin-panel-header-icon {
    color: #0f9488;
  }

  .admin-view-btn {
    display: inline-flex;
    align-items: center;
    gap: 5px;
    border: 0;
    background: transparent;
    color: #0f9488;
    font-size: 13px;
    font-weight: 650;
    cursor: pointer;
  }

  .admin-list {
    display: flex;
    flex-direction: column;
    gap: 10px;
  }

  .admin-system-row,
  .admin-user-row {
    display: flex;
    align-items: center;
    gap: 12px;
    padding: 12px;
    border: 1px solid #edf0f3;
    border-radius: 10px;
    background: #fbfcfd;
  }

  .admin-system-icon {
    width: 40px;
    height: 40px;
    min-width: 40px;
    display: flex;
    align-items: center;
    justify-content: center;
    border-radius: 10px;
    background: #eef8f7;
    color: #0f9488;
  }

  .admin-system-content,
  .admin-user-content,
  .admin-summary-content {
    flex: 1;
    min-width: 0;
  }

  .admin-system-content strong,
  .admin-user-content strong,
  .admin-summary-content strong {
    display: block;
    color: #344054;
    font-size: 13px;
  }

  .admin-system-content span,
  .admin-user-content span,
  .admin-summary-content span {
    display: block;
    margin-top: 3px;
    color: #7b8495;
    font-size: 11px;
  }

  .admin-progress {
    height: 7px;
    margin-top: 10px;
    overflow: hidden;
    border-radius: 999px;
    background: #edf1f4;
  }

  .admin-progress-fill {
    height: 100%;
    border-radius: inherit;
    background: #14b8a6;
  }

  .admin-badge {
    display: inline-flex;
    align-items: center;
    justify-content: center;
    min-width: 34px;
    padding: 5px 9px;
    border-radius: 999px;
    background: #eff6ff;
    color: #2563eb;
    font-size: 10px;
    font-weight: 700;
    white-space: nowrap;
  }

  .admin-badge.success {
    background: #ecfdf3;
    color: #087443;
  }

  .admin-user-avatar {
    width: 38px;
    height: 38px;
    min-width: 38px;
    display: flex;
    align-items: center;
    justify-content: center;
    border-radius: 50%;
    background: #e8f8f6;
    color: #0f766e;
    font-size: 13px;
    font-weight: 750;
  }

  .admin-summary-grid {
    display: grid;
    grid-template-columns: repeat(3, minmax(0, 1fr));
    gap: 12px;
  }

  .admin-summary-item {
    display: flex;
    align-items: center;
    gap: 12px;
    padding: 14px;
    border: 1px solid #edf0f3;
    border-radius: 11px;
  }

  .admin-summary-icon {
    width: 40px;
    height: 40px;
    min-width: 40px;
    display: flex;
    align-items: center;
    justify-content: center;
    border-radius: 10px;
    background: #f1f5f9;
    color: #475569;
  }

  .admin-summary-value {
    color: #344054;
    font-size: 17px;
    font-weight: 750;
  }

  .success-value {
    color: #087443;
  }

  .admin-actions-grid {
    display: grid;
    grid-template-columns: repeat(4, minmax(0, 1fr));
    gap: 12px;
  }

  .admin-quick-action {
    display: flex;
    align-items: center;
    gap: 11px;
    width: 100%;
    padding: 13px;
    border: 1px solid #e5eaf0;
    border-radius: 10px;
    background: #fff;
    text-align: left;
    cursor: pointer;
  }

  .admin-quick-action:hover {
    border-color: #b8ded9;
    background: #fbfefd;
  }

  .admin-quick-icon {
    width: 39px;
    height: 39px;
    min-width: 39px;
    display: flex;
    align-items: center;
    justify-content: center;
    border-radius: 10px;
    background: #e8f8f6;
    color: #0f9488;
  }

  .admin-quick-action strong {
    display: block;
    color: #344054;
    font-size: 13px;
  }

  .admin-quick-action span {
    display: block;
    margin-top: 3px;
    color: #7b8495;
    font-size: 10px;
  }

  .admin-quick-arrow {
    margin-left: auto;
    color: #98a2b3;
  }

  .admin-empty,
  .admin-loading {
    display: flex;
    align-items: center;
    justify-content: center;
    flex-direction: column;
    text-align: center;
    min-height: 180px;
    color: #98a2b3;
  }

  .admin-empty p,
  .admin-loading p {
    margin: 9px 0 0;
    font-size: 13px;
  }

  .admin-spinner {
    width: 28px;
    height: 28px;
    border: 3px solid #d8eeeb;
    border-top-color: #14b8a6;
    border-radius: 50%;
    animation: admin-spin .7s linear infinite;
  }

  @keyframes admin-spin {
    to {
      transform: rotate(360deg);
    }
  }

  @media (max-width: 1050px) {
    .admin-stats-grid {
      grid-template-columns: repeat(2, minmax(0, 1fr));
    }

    .admin-actions-grid {
      grid-template-columns: repeat(2, minmax(0, 1fr));
    }

    .admin-summary-grid {
      grid-template-columns: 1fr;
    }
  }

  @media (max-width: 800px) {
    .admin-dashboard-page {
      padding: 18px;
    }

    .admin-two-column {
      grid-template-columns: 1fr;
    }

    .admin-dashboard-header {
      flex-direction: column;
    }
  }

  @media (max-width: 560px) {
    .admin-stats-grid {
      grid-template-columns: 1fr;
    }

    .admin-actions-grid {
      grid-template-columns: 1fr;
    }

    .admin-system-row,
    .admin-user-row {
      align-items: flex-start;
    }

    .admin-dashboard-header h1 {
      font-size: 25px;
    }
  }
`;

export default AdminDashboard;