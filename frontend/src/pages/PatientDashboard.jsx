import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";

import DashboardLayout from "../components/DashboardLayout";
import StatCard from "../components/StatCard";
import { fetchMySchedule } from "../services/api";
import { PATIENT_MENU } from "../utils/menus";

const PatientDashboard = () => {
  const navigate = useNavigate();

  const [schedule, setSchedule] = useState([]);
  const [error, setError] = useState("");

  const menu = PATIENT_MENU;

  const loadSchedule = () => {
    fetchMySchedule()
      .then(setSchedule)
      .catch((e) => setError(e.message));
  };

  useEffect(() => {
    loadSchedule();
    window.addEventListener("pillsync-schedule-updated", loadSchedule);
    return () => window.removeEventListener("pillsync-schedule-updated", loadSchedule);
  }, []);

  const taken = schedule.filter((m) => m.taken).length;
  const pending = schedule.filter((m) => !m.taken).length;
  const next = schedule.find((m) => !m.taken);

  return (
    <DashboardLayout
      role="Patient"
      title="Welcome back, Patient"
      subtitle="Here is your medication overview."
      menu={menu}
    >
      {error && <p className="error-message">{error}</p>}

      <div className="stats">
        <StatCard icon="💊" label="Today's medicines" value={schedule.length} tone="primary" />
        <StatCard icon="✔️" label="Taken" value={taken} tone="success" />
        <StatCard icon="⏰" label="Still pending" value={pending} tone="accent" />
        <StatCard icon="📷" label="Prescription" value="Scan" tone="warning" />
      </div>

      <div className="grid">
        <section className="panel">
          <div className="panel__head">
            <h2 className="panel__title">Today's schedule</h2>
            <button
              className="action-btn action-btn--ghost"
              onClick={() => navigate("/dashboard/patient/medicines")}
            >
              Open My Medicines
            </button>
          </div>

          <div className="list">
            {schedule.length === 0 && (
              <p className="empty">No medicines scheduled yet.</p>
            )}
            {schedule.map((m) => (
              <div
                key={m.id}
                className={`med-card${m.taken ? " med-card--taken" : ""}`}
              >
                <span className="med-card__icon">💊</span>
                <div className="med-card__body">
                  <p className="med-card__name">{m.medicine_name}</p>
                  <p className="med-card__dosage">
                    {m.dosage} · {m.time_label}
                  </p>
                </div>
                <span
                  className={`badge ${m.taken ? "badge--success" : "badge--primary"}`}
                >
                  {m.taken ? "Taken" : "Pending"}
                </span>
              </div>
            ))}
          </div>
        </section>

        <section className="panel">
          <div className="panel__head">
            <h2 className="panel__title">Next dose</h2>
          </div>
          {next ? (
            <>
              <p className="stat__value">{next.medicine_name}</p>
              <p className="stat__label">
                {next.dosage} · {next.time_label}
              </p>
              <button
                className="tick-btn mt16"
                onClick={() => navigate("/dashboard/patient/medicines")}
              >
                ✓ Mark as taken
              </button>
            </>
          ) : (
            <p className="empty">All doses completed. Well done! 🎉</p>
          )}
        </section>
      </div>
    </DashboardLayout>
  );
};

export default PatientDashboard;