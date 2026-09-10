import React, { useEffect, useState } from "react";
import {
  ClipboardList,
  LogIn,
  Bell,
  RefreshCw,
  AlertTriangle,
  CheckCircle2,
  XCircle,
  Activity,
} from "lucide-react";

import {
  fetchAdminSystemLogs,
  fetchAdminLoginHistory,
  fetchAdminNotificationLogs,
} from "../../services/api";

const getActionBadge = (action = "") => {
  const value = String(action).toLowerCase();

  if (
    value.includes("delete") ||
    value.includes("failed") ||
    value.includes("error")
  ) {
    return "danger";
  }

  if (
    value.includes("login") ||
    value.includes("created") ||
    value.includes("assigned") ||
    value.includes("updated")
  ) {
    return "success";
  }

  return "accent";
};

const AdminSystemLogs = () => {
  const [logs, setLogs] = useState([]);
  const [logins, setLogins] = useState([]);
  const [notificationLogs, setNotificationLogs] =
    useState([]);

  const [tab, setTab] = useState("system");
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  const loadLogs = async () => {
    try {
      setLoading(true);
      setError("");

      const [
        systemResponse,
        loginResponse,
        notificationResponse,
      ] = await Promise.all([
        fetchAdminSystemLogs(),
        fetchAdminLoginHistory(),
        fetchAdminNotificationLogs(),
      ]);

      setLogs(
        Array.isArray(systemResponse)
          ? systemResponse
          : []
      );

      setLogins(
        Array.isArray(loginResponse)
          ? loginResponse
          : []
      );

      setNotificationLogs(
        Array.isArray(notificationResponse)
          ? notificationResponse
          : []
      );
    } catch (err) {
      console.error(
        "Admin system logs error:",
        err
      );

      setError(
        err?.response?.data?.detail ||
          err?.message ||
          "Unable to load system logs."
      );
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadLogs();
  }, []);

  const renderSystemLogs = () => {
    if (logs.length === 0) {
      return (
        <EmptyState
          icon={<ClipboardList size={28} />}
          title="No system logs"
          description="There are no platform activity records to display."
        />
      );
    }

    return (
      <div className="logs-list">
        {logs.map((log, index) => {
          const action =
            log.action || "activity";

          const badge =
            getActionBadge(action);

          return (
            <div
              className="log-row"
              key={log.id || index}
            >
              <div className="log-icon system">
                <Activity size={18} />
              </div>

              <div className="log-content">
                <strong>
                  {log.details ||
                    action}
                </strong>

                <span>
                  {formatDate(log.created_at)}
                  {" | "}
                  by{" "}
                  {log.user_name ||
                    "System"}
                </span>
              </div>

              <span
                className={`log-badge ${badge}`}
              >
                {action}
              </span>
            </div>
          );
        })}
      </div>
    );
  };

  const renderLoginHistory = () => {
    if (logins.length === 0) {
      return (
        <EmptyState
          icon={<LogIn size={28} />}
          title="No login history"
          description="There are no login records to display."
        />
      );
    }

    return (
      <div className="logs-list">
        {logins.map((login, index) => {
          const success =
            Boolean(login.success);

          return (
            <div
              className="log-row"
              key={login.id || index}
            >
              <div className="log-icon login">
                <LogIn size={18} />
              </div>

              <div className="log-content">
                <strong>
                  {login.email ||
                    login.username ||
                    "User"}
                </strong>

                <span>
                  {formatDate(
                    login.created_at
                  )}
                  {" | "}
                  {login.role ||
                    "user"}
                  {login.ip_address
                    ? ` | ${login.ip_address}`
                    : ""}
                </span>
              </div>

              <span
                className={`log-badge ${
                  success
                    ? "success"
                    : "danger"
                }`}
              >
                {success ? (
                  <>
                    <CheckCircle2 size={13} />
                    Success
                  </>
                ) : (
                  <>
                    <XCircle size={13} />
                    Failed
                  </>
                )}
              </span>
            </div>
          );
        })}
      </div>
    );
  };

  const renderNotificationLogs = () => {
    if (notificationLogs.length === 0) {
      return (
        <EmptyState
          icon={<Bell size={28} />}
          title="No notification logs"
          description="There are no notification delivery records to display."
        />
      );
    }

    return (
      <div className="logs-list">
        {notificationLogs.map(
          (notification, index) => {
            const sent =
              String(
                notification.status ||
                  ""
              ).toLowerCase() === "sent";

            return (
              <div
                className="log-row"
                key={
                  notification.id ||
                  index
                }
              >
                <div className="log-icon notification">
                  <Bell size={18} />
                </div>

                <div className="log-content">
                  <strong>
                    {notification.message ||
                      notification.title ||
                      "Notification"}
                  </strong>

                  <span>
                    {formatDate(
                      notification.created_at
                    )}
                    {" | "}
                    {notification.channel ||
                      "System"}
                  </span>
                </div>

                <span
                  className={`log-badge ${
                    sent
                      ? "success"
                      : "danger"
                  }`}
                >
                  {sent ? (
                    <>
                      <CheckCircle2
                        size={13}
                      />
                      Sent
                    </>
                  ) : (
                    <>
                      <XCircle
                        size={13}
                      />
                      {notification.status ||
                        "Failed"}
                    </>
                  )}
                </span>
              </div>
            );
          }
        )}
      </div>
    );
  };

  return (
    <div className="admin-logs-page">
      <style>{styles}</style>

      <header className="logs-header">
        <div>
          <p className="logs-eyebrow">
            Administration
          </p>

          <h1>System Logs</h1>

          <p>
            Review platform activity, login
            history and notification delivery.
          </p>
        </div>

        <button
          className="logs-refresh-btn"
          type="button"
          onClick={loadLogs}
          disabled={loading}
        >
          <RefreshCw size={17} />
          Refresh
        </button>
      </header>

      {error && (
        <div className="logs-error">
          <AlertTriangle size={18} />
          <span>{error}</span>
        </div>
      )}

      <section className="logs-stats">
        <LogStat
          icon={<ClipboardList size={21} />}
          label="System Logs"
          value={logs.length}
          tone="blue"
        />

        <LogStat
          icon={<LogIn size={21} />}
          label="Login History"
          value={logins.length}
          tone="purple"
        />

        <LogStat
          icon={<Bell size={21} />}
          label="Notification Logs"
          value={notificationLogs.length}
          tone="teal"
        />
      </section>

      <section className="logs-panel">
        <div className="logs-tabs">
          <button
            type="button"
            className={
              tab === "system"
                ? "active"
                : ""
            }
            onClick={() =>
              setTab("system")
            }
          >
            <ClipboardList
              size={16}
            />
            System Logs
          </button>

          <button
            type="button"
            className={
              tab === "logins"
                ? "active"
                : ""
            }
            onClick={() =>
              setTab("logins")
            }
          >
            <LogIn size={16} />
            Login History
          </button>

          <button
            type="button"
            className={
              tab === "notifications"
                ? "active"
                : ""
            }
            onClick={() =>
              setTab("notifications")
            }
          >
            <Bell size={16} />
            Notification Logs
          </button>
        </div>

        <div className="logs-panel-header">
          <div>
            <p className="logs-kicker">
              Audit trail
            </p>

            <h2>
              {tab === "system"
                ? "System Activity"
                : tab === "logins"
                ? "Login Activity"
                : "Notification Activity"}
            </h2>

            <p>
              {tab === "system"
                ? `${logs.length} activity records`
                : tab === "logins"
                ? `${logins.length} login records`
                : `${notificationLogs.length} notification records`}
            </p>
          </div>
        </div>

        {loading ? (
          <div className="logs-state">
            <div className="logs-spinner" />
            <p>Loading logs...</p>
          </div>
        ) : (
          <div>
            {tab === "system" &&
              renderSystemLogs()}

            {tab === "logins" &&
              renderLoginHistory()}

            {tab === "notifications" &&
              renderNotificationLogs()}
          </div>
        )}
      </section>
    </div>
  );
};

const formatDate = (value) => {
  if (!value) {
    return "Unknown time";
  }

  try {
    return new Date(
      value
    ).toLocaleString();
  } catch {
    return String(value);
  }
};

const LogStat = ({
  icon,
  label,
  value,
  tone,
}) => {
  return (
    <div className="log-stat">
      <div
        className={`log-stat-icon ${tone}`}
      >
        {icon}
      </div>

      <div>
        <strong>{value}</strong>
        <span>{label}</span>
      </div>
    </div>
  );
};

const EmptyState = ({
  icon,
  title,
  description,
}) => {
  return (
    <div className="logs-empty">
      {icon}

      <h3>{title}</h3>

      <p>{description}</p>
    </div>
  );
};

const styles = `
  .admin-logs-page {
    min-height: calc(100vh - 80px);
    padding: 28px;
    background: #f7f9fc;
    color: #172033;
  }

  .logs-header {
    display: flex;
    align-items: flex-start;
    justify-content: space-between;
    gap: 20px;
    margin-bottom: 24px;
  }

  .logs-eyebrow,
  .logs-kicker {
    margin: 0 0 6px;
    color: #0f9488;
    font-size: 11px;
    font-weight: 700;
    text-transform: uppercase;
    letter-spacing: .08em;
  }

  .logs-header h1 {
    margin: 0;
    color: #172033;
    font-size: 30px;
    font-weight: 750;
  }

  .logs-header p:last-child {
    margin: 7px 0 0;
    color: #697386;
    font-size: 14px;
  }

  .logs-refresh-btn {
    display: inline-flex;
    align-items: center;
    gap: 7px;
    border: 1px solid #dce3eb;
    border-radius: 10px;
    padding: 10px 14px;
    background: #fff;
    color: #344054;
    font-size: 13px;
    font-weight: 650;
    cursor: pointer;
  }

  .logs-refresh-btn:hover {
    background: #f9fafb;
  }

  .logs-refresh-btn:disabled {
    opacity: .55;
    cursor: not-allowed;
  }

  .logs-error {
    display: flex;
    align-items: center;
    gap: 9px;
    margin-bottom: 18px;
    padding: 12px 14px;
    border: 1px solid #fecaca;
    border-radius: 10px;
    background: #fff5f5;
    color: #b42318;
    font-size: 13px;
  }

  .logs-stats {
    display: grid;
    grid-template-columns: repeat(3, minmax(0, 1fr));
    gap: 14px;
    margin-bottom: 18px;
  }

  .log-stat {
    display: flex;
    align-items: center;
    gap: 12px;
    padding: 16px;
    border: 1px solid #e7ebf0;
    border-radius: 12px;
    background: #fff;
    box-shadow: 0 2px 8px rgba(15, 23, 42, .03);
  }

  .log-stat-icon {
    width: 42px;
    height: 42px;
    min-width: 42px;
    display: flex;
    align-items: center;
    justify-content: center;
    border-radius: 11px;
  }

  .log-stat-icon.blue {
    background: #eff6ff;
    color: #2563eb;
  }

  .log-stat-icon.purple {
    background: #f5f3ff;
    color: #7c3aed;
  }

  .log-stat-icon.teal {
    background: #e8f8f6;
    color: #0f9488;
  }

  .log-stat strong {
    display: block;
    color: #172033;
    font-size: 21px;
  }

  .log-stat span {
    display: block;
    margin-top: 3px;
    color: #7b8495;
    font-size: 11px;
  }

  .logs-panel {
    padding: 20px;
    border: 1px solid #e7ebf0;
    border-radius: 14px;
    background: #fff;
    box-shadow: 0 2px 8px rgba(15, 23, 42, .03);
  }

  .logs-tabs {
    display: flex;
    gap: 6px;
    padding: 5px;
    margin-bottom: 20px;
    width: fit-content;
    border-radius: 10px;
    background: #edf2f6;
  }

  .logs-tabs button {
    display: inline-flex;
    align-items: center;
    gap: 7px;
    border: 0;
    border-radius: 8px;
    padding: 9px 12px;
    background: transparent;
    color: #667085;
    font-size: 12px;
    font-weight: 650;
    cursor: pointer;
  }

  .logs-tabs button:hover {
    color: #344054;
  }

  .logs-tabs button.active {
    background: #fff;
    color: #0f766e;
    box-shadow: 0 1px 4px rgba(15, 23, 42, .08);
  }

  .logs-panel-header {
    display: flex;
    align-items: flex-start;
    margin-bottom: 16px;
  }

  .logs-panel-header h2 {
    margin: 0;
    color: #172033;
    font-size: 18px;
  }

  .logs-panel-header p:last-child {
    margin: 4px 0 0;
    color: #7b8495;
    font-size: 12px;
  }

  .logs-list {
    display: flex;
    flex-direction: column;
  }

  .log-row {
    display: flex;
    align-items: center;
    gap: 12px;
    padding: 13px 0;
    border-bottom: 1px solid #edf0f3;
  }

  .log-row:last-child {
    border-bottom: 0;
  }

  .log-icon {
    width: 40px;
    height: 40px;
    min-width: 40px;
    display: flex;
    align-items: center;
    justify-content: center;
    border-radius: 10px;
  }

  .log-icon.system {
    background: #eff6ff;
    color: #2563eb;
  }

  .log-icon.login {
    background: #f5f3ff;
    color: #7c3aed;
  }

  .log-icon.notification {
    background: #e8f8f6;
    color: #0f9488;
  }

  .log-content {
    flex: 1;
    min-width: 0;
  }

  .log-content strong {
    display: block;
    overflow: hidden;
    color: #344054;
    font-size: 13px;
    font-weight: 650;
    text-overflow: ellipsis;
    white-space: nowrap;
  }

  .log-content span {
    display: block;
    margin-top: 4px;
    overflow: hidden;
    color: #98a2b3;
    font-size: 11px;
    text-overflow: ellipsis;
    white-space: nowrap;
  }

  .log-badge {
    display: inline-flex;
    align-items: center;
    gap: 5px;
    padding: 5px 9px;
    border-radius: 999px;
    font-size: 10px;
    font-weight: 700;
    white-space: nowrap;
  }

  .log-badge.success {
    background: #ecfdf3;
    color: #087443;
  }

  .log-badge.danger {
    background: #fff1f3;
    color: #b42318;
  }

  .log-badge.accent {
    background: #eff6ff;
    color: #2563eb;
  }

  .logs-state,
  .logs-empty {
    min-height: 260px;
    display: flex;
    align-items: center;
    justify-content: center;
    flex-direction: column;
    text-align: center;
    color: #98a2b3;
  }

  .logs-state p,
  .logs-empty p {
    margin: 9px 0 0;
    font-size: 12px;
  }

  .logs-empty h3 {
    margin: 10px 0 5px;
    color: #344054;
    font-size: 15px;
  }

  .logs-spinner {
    width: 28px;
    height: 28px;
    border: 3px solid #d8eeeb;
    border-top-color: #14b8a6;
    border-radius: 50%;
    animation: logs-spin .7s linear infinite;
  }

  @keyframes logs-spin {
    to {
      transform: rotate(360deg);
    }
  }

  @media (max-width: 800px) {
    .admin-logs-page {
      padding: 18px;
    }

    .logs-header {
      flex-direction: column;
    }

    .logs-stats {
      grid-template-columns: 1fr;
    }

    .logs-tabs {
      width: 100%;
      overflow-x: auto;
    }

    .logs-tabs button {
      flex-shrink: 0;
      white-space: nowrap;
    }
  }

  @media (max-width: 600px) {
    .logs-header h1 {
      font-size: 25px;
    }

    .logs-refresh-btn {
      width: 100%;
    }

    .log-row {
      align-items: flex-start;
    }

    .log-badge {
      margin-left: auto;
    }
  }
`;

export default AdminSystemLogs;