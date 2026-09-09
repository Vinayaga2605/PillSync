import { useEffect, useState } from "react";

import DashboardLayout from "../components/DashboardLayout";
import StatCard from "../components/StatCard";
import { fetchAdminOcr } from "../services/api";
import { ADMIN_MENU } from "../utils/menus";

const AdminOcr = () => {
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  useEffect(() => {
    fetchAdminOcr()
      .then(setData)
      .catch((e) => setError(e.message))
      .finally(() => setLoading(false));
  }, []);

  return (
    <DashboardLayout
      role="Administrator"
      title="OCR Analytics"
      subtitle="Prescription scan performance."
      menu={ADMIN_MENU}
    >
      {error && <p className="error-message">{error}</p>}

      {loading ? (
        <p className="empty">Loading OCR analytics…</p>
      ) : (
        data && (
          <>
            <div className="stats">
              <StatCard icon="🔍" label="Total uploads" value={data.total_uploads} tone="primary" />
              <StatCard icon="✔️" label="Successful" value={data.successful} tone="success" />
              <StatCard icon="❗" label="Failed" value={data.failed} tone="warning" />
              <StatCard icon="⏱️" label="Avg time (ms)" value={data.avg_processing_time_ms} tone="accent" />
            </div>

            <section className="panel">
              <div className="panel__head">
                <h2 className="panel__title">Recent OCR uploads</h2>
              </div>
              {data.recent.length === 0 ? (
                <p className="empty">No OCR uploads yet.</p>
              ) : (
                <div className="list">
                  {data.recent.map((u) => (
                    <div className="list-item" key={u.id}>
                      <span className="list-item__icon">📄</span>
                      <div className="list-item__body">
                        <p className="list-item__name">{u.filename}</p>
                        <p className="list-item__desc">
                          {u.items_detected} items · {u.processing_time_ms}ms · {(u.created_at || "").slice(0, 16)}
                        </p>
                      </div>
                      <span className={`badge ${u.status === "success" ? "badge--success" : "badge--danger"}`}>
                        {u.status}
                      </span>
                    </div>
                  ))}
                </div>
              )}
            </section>
          </>
        )
      )}
    </DashboardLayout>
  );
};

export default AdminOcr;