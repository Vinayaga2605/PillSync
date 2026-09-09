import { useEffect, useState } from "react";

import DashboardLayout from "../components/DashboardLayout";
import StatCard from "../components/StatCard";
import { fetchAdminRefills } from "../services/api";
import { ADMIN_MENU } from "../utils/menus";

const refillBadge = (status) =>
  status === "critical"
    ? "badge--danger"
    : status === "warning"
      ? "badge--warning"
      : "badge--success";

const AdminRefills = () => {
  const [refills, setRefills] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  useEffect(() => {
    fetchAdminRefills()
      .then(setRefills)
      .catch((e) => setError(e.message))
      .finally(() => setLoading(false));
  }, []);

  const critical = refills.filter((r) => r.status === "critical").length;
  const warning = refills.filter((r) => r.status === "warning").length;
  const healthy = refills.filter((r) => r.status === "healthy").length;

  const maxDays = Math.max(...refills.map((r) => r.remaining_days), 1);

  return (
    <DashboardLayout
      role="Administrator"
      title="Refill Analytics"
      subtitle="Medicine inventory and refill predictions — no patient data."
      menu={ADMIN_MENU}
    >
      {error && <p className="error-message">{error}</p>}

      <div className="stats">
        <StatCard icon="❗" label="Critical" value={critical} tone="primary" />
        <StatCard icon="⚠️" label="Warning" value={warning} tone="warning" />
        <StatCard icon="✔️" label="Healthy" value={healthy} tone="success" />
        <StatCard icon="♻️" label="Medicines tracked" value={refills.length} tone="accent" />
      </div>

      {loading ? (
        <p className="empty">Calculating refill predictions…</p>
      ) : refills.length === 0 ? (
        <p className="empty">No refill predictions available.</p>
      ) : (
        <section className="panel">
          <div className="panel__head">
            <h2 className="panel__title">Medicine refill predictions</h2>
          </div>
          <div className="list">
            {refills.map((r) => (
              <div className="list-item" key={r.medicine_id}>
                <span className="list-item__icon">💊</span>
                <div className="list-item__body">
                  <p className="list-item__name">
                    {r.medicine_name}
                    {r.brand ? ` (${r.brand})` : ""} — {r.category || "General"}
                  </p>
                  <p className="list-item__desc">
                    {r.available_qty} available · consume {r.daily_consumption}/day ·
                    reorder at {r.reorder_level} · refill by {r.predicted_refill_date}
                  </p>
                  <div className="mini-bar" style={{ marginTop: 6 }}>
                    <div
                      className="mini-bar__fill"
                      style={{
                        width: `${Math.max((r.remaining_days / maxDays) * 100, 4)}%`,
                        background:
                          r.status === "critical"
                            ? "var(--danger, #ef4444)"
                            : r.status === "warning"
                              ? "#f59e0b"
                              : "var(--success, #22c55e)",
                      }}
                    />
                  </div>
                </div>
                <span className={`badge ${refillBadge(r.status)}`}>
                  {r.remaining_days} days
                </span>
              </div>
            ))}
          </div>
        </section>
      )}
    </DashboardLayout>
  );
};

export default AdminRefills;