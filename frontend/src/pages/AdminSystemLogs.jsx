import { useEffect, useState } from "react";

import DashboardLayout from "../components/DashboardLayout";
import StatCard from "../components/StatCard";
import {
  fetchAdminSystemLogs,
  fetchAdminLoginHistory,
  fetchAdminNotificationLogs,
} from "../services/api";
import { ADMIN_MENU } from "../utils/menus";

const actionBadge = (action) =>
  action.includes("delete") || action.includes("failed")
    ? "badge--danger"
    : action.includes("login") || action.includes("created") || action.includes("assigned")
      ? "badge--success"
      : "badge--accent";

const AdminSystemLogs = () => {
  const [logs, setLogs] = useState([]);
  const [logins, setLogins] = useState([]);
  const [nlogs, setNlogs] = useState([]);
  const [tab, setTab] = useState("system");
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  useEffect(() => {
    Promise.all([
      fetchAdminSystemLogs(),
      fetchAdminLoginHistory(),
      fetchAdminNotificationLogs(),
    ])
      .then(([l, lh, nl]) => {
        setLogs(l);
        setLogins(lh);
        setNlogs(nl);
      })
      .catch((e) => setError(e.message))
      .finally(() => setLoading(false));
  }, []);

  const renderSystem = () => (
    <div className="list">
      {logs.length === 0 && <p className="empty">No system logs.</p>}
      {logs.map((log) => (
        <div className="list-item" key={log.id}>
          <span className="list-item__icon">🗂️</span>
          <div className="list-item__body">
            <p className="list-item__name">{log.details || log.action}</p>
            <p className="list-item__desc">
              {(log.created_at || "").slice(0, 16)} · by {log.user_name || "system"}
            </p>
          </div>
          <span className={`badge ${actionBadge(log.action)}`}>{log.action}</span>
        </div>
      ))}
    </div>
  );

  const renderLogins = () => (
    <div className="list">
      {logins.length === 0 && <p className="empty">No login history.</p>}
      {logins.map((l) => (
        <div className="list-item" key={l.id}>
          <span className="list-item__icon">🔐</span>
          <div className="list-item__body">
            <p className="list-item__name">{l.email}</p>
            <p className="list-item__desc">
              {(l.created_at || "").slice(0, 16)} · {l.role} · {l.ip_address}
            </p>
          </div>
          <span className={`badge ${l.success ? "badge--success" : "badge--danger"}`}>
            {l.success ? "Success" : "Failed"}
          </span>
        </div>
      ))}
    </div>
  );

  const renderNLogs = () => (
    <div className="list">
      {nlogs.length === 0 && <p className="empty">No notification logs.</p>}
      {nlogs.map((n) => (
        <div className="list-item" key={n.id}>
          <span className="list-item__icon">🔔</span>
          <div className="list-item__body">
            <p className="list-item__name">{n.message}</p>
            <p className="list-item__desc">
              {(n.created_at || "").slice(0, 16)} · {n.channel}
            </p>
          </div>
          <span className={`badge ${n.status === "sent" ? "badge--success" : "badge--danger"}`}>
            {n.status}
          </span>
        </div>
      ))}
    </div>
  );

  return (
    <DashboardLayout
      role="Administrator"
      title="System Logs"
      subtitle="Audit trail of platform activity."
      menu={ADMIN_MENU}
    >
      {error && <p className="error-message">{error}</p>}

      <div className="stats">
        <StatCard icon="🗂️" label="System logs" value={logs.length} tone="primary" />
        <StatCard icon="🔐" label="Login history" value={logins.length} tone="accent" />
        <StatCard icon="🔔" label="Notification logs" value={nlogs.length} tone="success" />
      </div>

      <div className="filter-row">
        {["system", "logins", "notifications"].map((t) => (
          <button
            key={t}
            className={`chip ${tab === t ? "is-active" : ""}`}
            onClick={() => setTab(t)}
          >
            {t === "system" ? "System logs" : t === "logins" ? "Login history" : "Notification logs"}
          </button>
        ))}
      </div>

      {loading ? (
        <p className="empty">Loading logs…</p>
      ) : (
        <section className="panel">
          {tab === "system" && renderSystem()}
          {tab === "logins" && renderLogins()}
          {tab === "notifications" && renderNLogs()}
        </section>
      )}
    </DashboardLayout>
  );
};

export default AdminSystemLogs;