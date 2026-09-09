import { useEffect, useState } from "react";
import DashboardLayout from "../components/DashboardLayout";
import { fetchMyPatients, fetchAllPatients, addPatientToCaregiver } from "../services/api";
import { CAREGIVER_MENU } from "../utils/menus";

const CaregiverPatients = () => {
  const [patients, setPatients] = useState([]);
  const [allPatients, setAllPatients] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [notice, setNotice] = useState("");
  const [busyId, setBusyId] = useState(null);

  const menu = CAREGIVER_MENU;

  const loadData = () => {
    Promise.all([fetchMyPatients(), fetchAllPatients().catch(() => [])])
      .then(([myP, allP]) => {
        setPatients(myP);
        setAllPatients(allP);
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
      setNotice(`Patient "${patientName}" added to your care roster!`);
      loadData();
    } catch (e) {
      setError(e.message);
    } finally {
      setBusyId(null);
    }
  };

  const myPatientIds = new Set(patients.map((p) => p.user_id));
  const unassignedPatients = allPatients.filter((p) => !myPatientIds.has(p.id));

  return (
    <DashboardLayout
      role="Caregiver"
      title="My Patients"
      subtitle={`${patients.length} patient(s) actively assigned to you.`}
      menu={menu}
    >
      {error && <p className="error-message">{error}</p>}
      {notice && <p className="success-message">{notice}</p>}

      {loading ? (
        <p className="empty">Loading patients…</p>
      ) : (
        <div style={{ display: "grid", gap: "24px" }}>
          {/* Active Assigned Patients */}
          {patients.length === 0 ? (
            <section className="panel">
              <p className="empty">No active patients assigned yet. Select a patient from available patients below to add them!</p>
            </section>
          ) : (
            <div className="grid" style={{ gridTemplateColumns: "1fr" }}>
              {patients.map((p) => (
                <section key={p.user_id} className="panel">
                  <div className="panel__head">
                    <div>
                      <h2 className="panel__title">{p.full_name}</h2>
                      <p className="list-item__desc">
                        {p.email} · {p.phone || "no phone"} ·{" "}
                        {p.blood_group ? `Blood ${p.blood_group}` : "blood group not set"}
                      </p>
                    </div>
                    <div style={{ display: "flex", gap: "8px" }}>
                      <span className="badge badge--primary">
                        {p.taken_count}/{p.total_count} taken
                      </span>
                      <span
                        className={`badge ${
                          p.adherence_percent != null && p.adherence_percent >= 80
                            ? "badge--success"
                            : "badge--warning"
                        }`}
                      >
                        {p.adherence_percent != null ? `${p.adherence_percent}%` : "N/A"}
                      </span>
                    </div>
                  </div>

                  <div className="list">
                    {p.medications.length === 0 ? (
                      <p className="empty">No daily medications scheduled for this patient.</p>
                    ) : (
                      p.medications.map((m) => (
                        <div key={m.id} className="med-card">
                          <span className="med-card__icon">💊</span>
                          <div className="med-card__body">
                            <p className="med-card__name">{m.medicine_name}</p>
                            <p className="med-card__dosage">
                              {m.dosage} · {m.time_label} · {m.notes || "no note"}
                            </p>
                          </div>
                          <span
                            className={`badge ${
                              m.taken ? "badge--success" : "badge--danger"
                            }`}
                          >
                            {m.taken ? "Taken" : "Pending"}
                          </span>
                        </div>
                      ))
                    )}
                  </div>
                </section>
              ))}
            </div>
          )}

          {/* Additional Available Patients to Add */}
          {unassignedPatients.length > 0 && (
            <section className="panel">
              <div className="panel__head">
                <h2 className="panel__title">➕ Add Other System Patients to Your Roster</h2>
              </div>
              <div className="list">
                {unassignedPatients.map((p) => (
                  <div key={p.id} className="list-item">
                    <span className="list-item__icon">👤</span>
                    <div className="list-item__body">
                      <p className="list-item__name">{p.full_name}</p>
                      <p className="list-item__desc">{p.email} · {p.phone || "No phone"}</p>
                    </div>
                    <div className="list-item__value">
                      <button
                        className="action-btn action-btn--sm"
                        disabled={busyId === p.id}
                        onClick={() => handleAddPatient(p.id, p.full_name)}
                      >
                        {busyId === p.id ? "Adding…" : "➕ Add to My Patients"}
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            </section>
          )}
        </div>
      )}
    </DashboardLayout>
  );
};

export default CaregiverPatients;