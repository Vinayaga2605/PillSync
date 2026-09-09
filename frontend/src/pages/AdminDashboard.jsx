import { useEffect, useState } from "react";

import DashboardLayout from "../components/DashboardLayout";
import StatCard from "../components/StatCard";
import {
  fetchAdminDashboard,
  fetchMyAccount,
  fetchAdminOcr,
  fetchAdminSystemLogs,
} from "../services/api";
import { ADMIN_MENU } from "../utils/menus";

const statusClass = {
  Healthy: "status-pill--healthy",
  Warning: "status-pill--warning",
  Critical: "status-pill--critical",
};

const activityIcon = {
  login: "🔐",
  medicine_added: "💊",
  user_created: "👤",
  user_deleted: "🗑️",
  user_updated: "✏️",
  role_changed: "🔄",
  caregiver_assigned: "🤝",
  caregiver_removed: "🚫",
  report_generated: "📄",
  ocr_upload: "🔍",
  reminder: "⏰",
  refill: "♻️",
  notification_sent: "🔔",
  user_status: "🚦",
};

const logIcon = {
  user_created: "👤",
  user_updated: "✏️",
  user_deleted: "🗑️",
  user_status: "🚦",
  role_changed: "🔄",
  medicine_added: "💊",
  caregiver_assigned: "🤝",
  caregiver_removed: "🚫",
  report_generated: "📄",
};

const AdminDashboard = () => {
  const [data, setData] = useState(null);
  const [me, setMe] = useState(null);
  const [ocr, setOcr] = useState(null);
  const [logs, setLogs] = useState([]);
  const [error, setError] = useState("");

  useEffect(() => {
    fetchAdminDashboard()
      .then(setData)
      .catch((e) => setError(e.message));
    fetchMyAccount()
      .then(setMe)
      .catch(() => {});
    fetchAdminOcr()
      .then(setOcr)
      .catch(() => {});
    fetchAdminSystemLogs("")
      .then(setLogs)
      .catch(() => {});
  }, []);

  const s = data?.stats;
  const status = data?.status;

  return (
    <DashboardLayout
      role="Administrator"
      title="Dashboard"
      subtitle="Live platform metrics from PostgreSQL."
      menu={ADMIN_MENU}
    >
      {error && <p className="error-message">{error}</p>}
      {!data && !error && <p className="empty">Loading dashboard…</p>}

      {data && (
        <>
          <div className="stats">
            <StatCard icon="👥" label="Total users" value={s?.users ?? 0} tone="primary" />
            <StatCard icon="🧍" label="Patients" value={s?.patients ?? 0} tone="accent" />
            <StatCard icon="🤝" label="Caregivers" value={s?.caregivers ?? 0} tone="success" />
            <StatCard icon="🛡️" label="Admins" value={s?.admins ?? 0} tone="warning" />
          </div>

          <div className="stats">
            <StatCard icon="📅" label="Scheduled today" value={s?.scheduled_doses ?? 0} tone="primary" />
            <StatCard icon="✔️" label="Taken today" value={s?.taken_today ?? 0} tone="success" />
            <StatCard icon="❗" label="Missed today" value={s?.missed_today ?? 0} tone="warning" />
            <StatCard icon="🔔" label="Notifications today" value={s?.notifications_today ?? 0} tone="accent" />
          </div>

          <div className="stats">
            <StatCard icon="📦" label="Low stock meds" value={s?.low_stock_medicines?.length ?? 0} tone="primary" />
            <StatCard icon="✔️" label="Adherence (7d)" value={data?.adherence_7d != null ? `${data.adherence_7d}%` : "N/A"} tone="success" />
            <StatCard icon="🔍" label="OCR uploads" value={ocr?.total_uploads ?? 0} tone="warning" />
            <div className="stat">
              <div className="stat__head">
                <span className="stat__icon stat__icon--warning">⚙️</span>
              </div>
              <p className="stat__value">
                <span className={`status-pill ${statusClass[status?.status] || ""}`}>
                  {status?.status || "—"}
                </span>
              </p>
              <p className="stat__label">System health</p>
            </div>
          </div>

          <div className="grid">
            <section className="panel">
              <div className="panel__head">
                <h2 className="panel__title">Low stock medicines</h2>
              </div>
              {s?.low_stock_medicines?.length === 0 ? (
                <p className="empty">All medicines above reorder level.</p>
              ) : (
                <div className="list">
                  {s.low_stock_medicines.map((m) => (
                    <div className="list-item" key={m.id}>
                      <span className="list-item__icon">📦</span>
                      <div className="list-item__body">
                        <p className="list-item__name">{m.name}</p>
                        <p className="list-item__desc">
                          {m.stock_quantity} in stock · reorder at {m.reorder_level}
                        </p>
                      </div>
                      <span className="badge badge--danger">Low</span>
                    </div>
                  ))}
                </div>
              )}
            </section>

            <section className="panel">
              <div className="panel__head">
                <h2 className="panel__title">System status</h2>
              </div>
              <p className="stat__value">
                <span className={`status-pill ${statusClass[status?.status] || ""}`}>
                  {status?.status}
                </span>
              </p>
              <div className="list">
                <div className="list-item">
                  <span className="list-item__icon">🗄️</span>
                  <div className="list-item__body">
                    <p className="list-item__name">Database</p>
                    <p className="list-item__desc">Connectivity check</p>
                  </div>
                  <span className={`badge ${status?.db_connected ? "badge--success" : "badge--danger"}`}>
                    {status?.db_connected ? "Connected" : "Failed"}
                  </span>
                </div>
                <div className="list-item">
                  <span className="list-item__icon">📡</span>
                  <div className="list-item__body">
                    <p className="list-item__name">API</p>
                    <p className="list-item__desc">Availability</p>
                  </div>
                  <span className="badge badge--success">
                    {status?.api_available ? "Available" : "Degraded"}
                  </span>
                </div>
                <div className="list-item">
                  <span className="list-item__icon">🔔</span>
                  <div className="list-item__body">
                    <p className="list-item__name">Pending notifications</p>
                    <p className="list-item__desc">Unread items</p>
                  </div>
                  <span className="list-item__value">{status?.pending_notifications ?? 0}</span>
                </div>
                <div className="list-item">
                  <span className="list-item__icon">❗</span>
                  <div className="list-item__body">
                    <p className="list-item__name">Missed dose rate</p>
                    <p className="list-item__desc">Today</p>
                  </div>
                  <span className="list-item__value">{status?.missed_dose_pct ?? 0}%</span>
                </div>
              </div>
              {status?.reasons?.length > 0 && (
                <p className="list-item__desc mt16">{status.reasons.join(" · ")}</p>
              )}
            </section>
          </div>

          <div className="grid">
            <section className="panel">
              <div className="panel__head">
                <h2 className="panel__title">My profile</h2>
              </div>
              {me && (
                <div className="list">
                  <div className="list-item">
                    <span className="list-item__icon">👤</span>
                    <div className="list-item__body">
                      <p className="list-item__name">{me.full_name}</p>
                      <p className="list-item__desc">{me.email}</p>
                    </div>
                    <span className={`badge ${me.role === "admin" ? "badge--warning" : "badge--accent"}`}>
                      {me.role}
                    </span>
                  </div>
                  <div className="list-item">
                    <span className="list-item__icon">📞</span>
                    <div className="list-item__body">
                      <p className="list-item__name">Phone</p>
                      <p className="list-item__desc">{me.phone || "Not set"}</p>
                    </div>
                  </div>
                  <div className="list-item">
                    <span className="list-item__icon">🗓️</span>
                    <div className="list-item__body">
                      <p className="list-item__name">Member since</p>
                      <p className="list-item__desc">
                        {(me.created_at || "").slice(0, 10)}
                      </p>
                    </div>
                  </div>
                </div>
              )}
              {!me && <p className="empty">No profile data.</p>}
            </section>

            <section className="panel">
              <div className="panel__head">
                <h2 className="panel__title">OCR analysis</h2>
              </div>
              {ocr && (
                <div className="list">
                  <div className="list-item">
                    <span className="list-item__icon">📤</span>
                    <div className="list-item__body">
                      <p className="list-item__name">Total uploads</p>
                    </div>
                    <span className="list-item__value">{ocr.total_uploads}</span>
                  </div>
                  <div className="list-item">
                    <span className="list-item__icon">✅</span>
                    <div className="list-item__body">
                      <p className="list-item__name">Successful</p>
                    </div>
                    <span className="list-item__value">{ocr.successful}</span>
                  </div>
                  <div className="list-item">
                    <span className="list-item__icon">❌</span>
                    <div className="list-item__body">
                      <p className="list-item__name">Failed</p>
                    </div>
                    <span className="list-item__value">{ocr.failed}</span>
                  </div>
                  <div className="list-item">
                    <span className="list-item__icon">⏱️</span>
                    <div className="list-item__body">
                      <p className="list-item__name">Avg processing time</p>
                    </div>
                    <span className="list-item__value">{ocr.avg_processing_time_ms}ms</span>
                  </div>
                </div>
              )}
              {!ocr && <p className="empty">No OCR data.</p>}
            </section>
          </div>

          <section className="panel">
            <div className="panel__head">
              <h2 className="panel__title">Recent system logs</h2>
            </div>
            {logs.length === 0 ? (
              <p className="empty">No system logs yet.</p>
            ) : (
              <div className="list">
                {logs.slice(0, 6).map((l) => (
                  <div className="list-item" key={l.id}>
                    <span className="list-item__icon">{logIcon[l.action] || "⚙️"}</span>
                    <div className="list-item__body">
                      <p className="list-item__name">{l.details}</p>
                      <p className="list-item__desc">
                        {(l.created_at || "").slice(0, 16)} · {l.user_name || "System"}
                      </p>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </section>

          <section className="panel panel--compact">
            <div className="panel__head">
              <h2 className="panel__title">Recent activity</h2>
            </div>
            <div className="activity activity--compact">
              {(data.recent_activity || []).slice(0, 5).map((a, i) => (
                <div className="activity-item" key={i}>
                  <span className="list-item__icon">
                    {activityIcon[a.type] || "⚡"}
                  </span>
                  <div className="list-item__body">
                    <p className="list-item__desc">{a.details}</p>
                    <p className="list-item__desc list-item__desc--xs">
                      {(a.timestamp || "").slice(0, 16)}
                    </p>
                  </div>
                </div>
              ))}
              {(data.recent_activity || []).length === 0 && (
                <p className="empty">No recent activity.</p>
              )}
            </div>
          </section>
        </>
      )}
    </DashboardLayout>
  );
};

export default AdminDashboard;