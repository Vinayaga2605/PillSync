import { useEffect, useState } from "react";
import DashboardLayout from "../components/DashboardLayout";
import {
  fetchCaregiverAlerts,
  fetchAllPatients,
  fetchMyPatients,
  addPatientToCaregiver,
} from "../services/api";
import { CAREGIVER_MENU } from "../utils/menus";

const CaregiverAlerts = () => {
  const [alerts, setAlerts] = useState([]);
  const [allPatients, setAllPatients] = useState([]);
  const [myPatients, setMyPatients] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [notice, setNotice] = useState("");
  const [busyId, setBusyId] = useState(null);

  const menu = CAREGIVER_MENU;

  const loadData = () => {
    Promise.all([
      fetchCaregiverAlerts().catch(() => []),
      fetchAllPatients().catch(() => []),
      fetchMyPatients().catch(() => []),
    ])
      .then(([a, allP, myP]) => {
        setAlerts(a);
        setAllPatients(allP);
        setMyPatients(myP);
      })
      .catch((e) => setError(e.message))
      .finally(() => setLoading(false));
  };

  useEffect(() => {
    loadData();
  }, []);

  const handleAddPatient = async (patientId, patientName) => {
    setBusyId(patientId);
    setError("");
    setNotice("");
    try {
      await addPatientToCaregiver(patientId);
      setNotice(`Patient "${patientName || "Patient"}" has been added to your care roster!`);
      loadData();
    } catch (e) {
      setError(e.message || "Failed to add patient");
    } finally {
      setBusyId(null);
    }
  };

  const myPatientIds = new Set((myPatients || []).map((p) => p.user_id || p.id));
  const unread = alerts.filter((a) => !a.is_read).length;

  return (
    <DashboardLayout
      role="Caregiver"
      title="Patient Alerts & Care Assignment"
      subtitle={
        unread > 0
          ? `${unread} unread alert(s) — Default view for patient alerts. Click any patient to add them to your care roster.`
          : "Default view for patient alerts. Click any patient alert to add them to your care roster."
      }
      menu={menu}
    >
      {error && <p className="error-message">{error}</p>}
      {notice && <p className="success-message">{notice}</p>}

      {loading ? (
        <p className="empty">Loading alerts and patient records…</p>
      ) : (
        <div style={{ display: "grid", gap: "24px" }}>
          {/* Default Patient Alerts List */}
          <section className="panel">
            <div className="panel__head">
              <h2 className="panel__title">🔔 Patient Missed Dose & Status Alerts</h2>
              <span className="badge badge--warning">{alerts.length} total</span>
            </div>
            {alerts.length === 0 ? (
              <p className="empty">
                No active alerts. All assigned patients are up to date on medications.
              </p>
            ) : (
              <div className="list">
                {alerts.map((a) => {
                  const isAssigned = a.patient_id && myPatientIds.has(a.patient_id);
                  return (
                    <div
                      key={a.id}
                      className={`alert-card${a.is_read ? "" : " alert-card--unread"}`}
                      style={{
                        display: "flex",
                        justify: "space-between",
                        alignItems: "center",
                        cursor: a.patient_id && !isAssigned ? "pointer" : "default",
                      }}
                      onClick={() => {
                        if (a.patient_id && !isAssigned && busyId !== a.patient_id) {
                          handleAddPatient(a.patient_id, "Patient #" + a.patient_id);
                        }
                      }}
                    >
                      <div style={{ display: "flex", gap: "12px", alignItems: "flex-start" }}>
                        <span className="alert-card__icon">❗</span>
                        <div>
                          <p className="alert-card__title">
                            {a.type === "missed_dose" ? "Missed Dose Alert" : "Patient Alert"}
                          </p>
                          <p className="alert-card__desc">{a.message}</p>
                          <p className="alert-card__time">
                            {new Date(a.created_at).toLocaleString()}
                          </p>
                        </div>
                      </div>

                      {a.patient_id && (
                        <div style={{ marginLeft: "16px", flexShrink: 0 }}>
                          {isAssigned ? (
                            <span className="badge badge--success" style={{ padding: "6px 12px" }}>
                              ✓ Active Patient
                            </span>
                          ) : (
                            <button
                              className="action-btn action-btn--sm"
                              disabled={busyId === a.patient_id}
                              onClick={(e) => {
                                e.stopPropagation();
                                handleAddPatient(a.patient_id, "Patient #" + a.patient_id);
                              }}
                            >
                              {busyId === a.patient_id ? "Adding…" : "➕ Click to Add Patient"}
                            </button>
                          )}
                        </div>
                      )}
                    </div>
                  );
                })}
              </div>
            )}
          </section>

          {/* Available System Patients - Click to Add */}
          <section className="panel">
            <div className="panel__head">
              <h2 className="panel__title">👥 Available Patients (Click to Add to My Patients)</h2>
              <span className="badge badge--primary">{allPatients.length} registered</span>
            </div>
            {allPatients.length === 0 ? (
              <p className="empty">No registered patients in system.</p>
            ) : (
              <div className="list">
                {allPatients.map((p) => {
                  const isAssigned = myPatientIds.has(p.id);
                  return (
                    <div
                      key={p.id}
                      className="list-item"
                      style={{
                        cursor: isAssigned ? "default" : "pointer",
                        transition: "background 0.2s ease",
                      }}
                      onClick={() => {
                        if (!isAssigned && busyId !== p.id) {
                          handleAddPatient(p.id, p.full_name);
                        }
                      }}
                    >
                      <span className="list-item__icon">👤</span>
                      <div className="list-item__body">
                        <p className="list-item__name">{p.full_name}</p>
                        <p className="list-item__desc">{p.email} · {p.phone || "No phone"}</p>
                      </div>
                      <div className="list-item__value">
                        {isAssigned ? (
                          <span className="badge badge--success">✓ Under Your Care</span>
                        ) : (
                          <button
                            className="action-btn action-btn--sm"
                            disabled={busyId === p.id}
                            onClick={(e) => {
                              e.stopPropagation();
                              handleAddPatient(p.id, p.full_name);
                            }}
                          >
                            {busyId === p.id ? "Adding…" : "➕ Add Patient"}
                          </button>
                        )}
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </section>
        </div>
      )}
    </DashboardLayout>
  );
};

export default CaregiverAlerts;