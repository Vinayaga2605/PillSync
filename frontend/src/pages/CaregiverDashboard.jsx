import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";

import DashboardLayout from "../components/DashboardLayout";
import StatCard from "../components/StatCard";
import { fetchMyPatients, fetchCaregiverAlerts } from "../services/api";
import { CAREGIVER_MENU } from "../utils/menus";

const CaregiverDashboard = () => {
  const [patients, setPatients] = useState([]);
  const [alerts, setAlerts] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const navigate = useNavigate();

  const menu = CAREGIVER_MENU;

  useEffect(() => {
    Promise.all([fetchMyPatients(), fetchCaregiverAlerts()])
      .then(([p, a]) => {
        setPatients(p);
        setAlerts(a.filter((n) => n.type === "missed_dose"));
      })
      .catch((e) => setError(e.message))
      .finally(() => setLoading(false));
  }, []);

  const totalMedications = patients.reduce(
    (sum, p) => sum + (p.medications || []).length,
    0
  );
  const takenToday = patients.reduce(
    (sum, p) => sum + (p.taken_count || 0),
    0
  );
  const onTrack = patients.filter(
    (p) => p.adherence_percent != null && p.adherence_percent >= 80
  ).length;
  const missedToday = patients.reduce(
    (sum, p) => sum + (p.missed_count || 0),
    0
  );

  return (
    <DashboardLayout
      role="Caregiver"
      title="Caregiving overview"
      subtitle="Monitor and support your assigned patients."
      menu={menu}
    >
      {error && <p className="error-message">{error}</p>}
      {loading && <p className="empty">Loading dashboard…</p>}

      {!loading && (
        <>
          <div className="stats">
            <StatCard icon="👥" label="Assigned patients" value={patients.length} tone="primary" />
            <StatCard icon="💊" label="Doses taken today" value={takenToday} tone="accent" />
            <StatCard icon="📅" label="Scheduled daily doses" value={totalMedications} tone="warning" />
            <StatCard icon="✔️" label="On-track patients" value={onTrack} tone="success" />
          </div>

          <div className="grid">
            <section className="panel">
              <div className="panel__head">
                <h2 className="panel__title">Patients</h2>
                <span className="badge badge--success">{patients.length} active</span>
              </div>
              {patients.length === 0 ? (
                <p className="empty">No patients assigned yet. Click "Alerts" or "My Patients" to add patients to your care roster.</p>
              ) : (
                <div className="list">
                  {patients.map((p) => (
                    <div
                      className="list-item"
                      key={p.user_id}
                      style={{ cursor: "pointer" }}
                      onClick={() => navigate("/caregiver/patients")}
                    >
                      <span className="list-item__icon">👤</span>
                      <div className="list-item__body">
                        <p className="list-item__name">{p.full_name}</p>
                        <p className="list-item__desc">
                          {p.medications.length} med(s) · {p.taken_count}/{p.total_count} taken
                        </p>
                      </div>
                      <span
                        className={`badge ${p.adherence_percent != null && p.adherence_percent >= 80 ? "badge--success" : "badge--warning"}`}
                      >
                        {p.adherence_percent != null ? `${p.adherence_percent}%` : "N/A"}
                      </span>
                    </div>
                  ))}
                </div>
              )}
            </section>

            <section className="panel">
              <div className="panel__head">
                <h2 className="panel__title">Recent alerts</h2>
                <span className="badge badge--danger">{missedToday} missed</span>
              </div>
              {alerts.length === 0 ? (
                <p className="empty">No missed-dose alerts.</p>
              ) : (
                <div className="list">
                  {alerts.slice(0, 5).map((a) => (
                    <div
                      className="list-item"
                      key={a.id}
                      style={{ cursor: "pointer" }}
                      onClick={() => navigate("/caregiver/alerts")}
                    >
                      <span className="list-item__icon">❗</span>
                      <div className="list-item__body">
                        <p className="list-item__name">{a.message}</p>
                        <p className="list-item__desc">
                          {(a.created_at || "").slice(0, 16)}
                        </p>
                      </div>
                      <span className="badge badge--warning">Review & Add</span>
                    </div>
                  ))}
                </div>
              )}
            </section>
          </div>
        </>
      )}
    </DashboardLayout>
  );
};

export default CaregiverDashboard;