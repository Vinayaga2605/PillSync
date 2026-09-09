import React, { useState, useEffect, useContext } from "react";
import { useNavigate } from "react-router-dom";
import { AuthContext } from "../../context/AuthContext";
import caregiverService from "../../services/caregiverService";

const CaregiverDashboard = () => {
  
  const { user, logout } = useContext(AuthContext);
const navigate = useNavigate();

const handleLogout = () => {
  logout();
  navigate("/login");
};

  const [patients, setPatients] = useState([]);
  const [selectedPatientId, setSelectedPatientId] = useState(null);
  const [patientDetail, setPatientDetail] = useState(null);
  const [missedDoseAlerts, setMissedDoseAlerts] = useState([]);
  const [loading, setLoading] = useState(true);
  const [detailLoading, setDetailLoading] = useState(false);
  const [error, setError] = useState(null);
  const [sortBy, setSortBy] = useState("name");

  useEffect(() => {
    fetchOverview();
  }, []);

  useEffect(() => {
    if (selectedPatientId) {
      fetchPatientDetail(selectedPatientId);
    }
  }, [selectedPatientId]);

  const fetchOverview = async () => {
    setLoading(true);
    setError(null);
    try {
      const [patientsRes, alertsRes] = await Promise.all([
        caregiverService.getAssignedPatients(),
        caregiverService.getMissedDoseAlerts(),
      ]);
      setPatients(patientsRes.data || []);
      setMissedDoseAlerts(alertsRes.data || []);
      if ((patientsRes.data || []).length > 0) {
        setSelectedPatientId(patientsRes.data[0].id);
      }
    } catch (err) {
      console.error("Caregiver dashboard load failed:", err);
      setError("Unable to load your patients. Please try again.");
    } finally {
      setLoading(false);
    }
  };

  const fetchPatientDetail = async (patientId) => {
    setDetailLoading(true);
    try {
      const res = await caregiverService.getPatientDetail(patientId);
      setPatientDetail(res.data);
    } catch (err) {
      console.error("Failed to load patient detail:", err);
      setPatientDetail(null);
    } finally {
      setDetailLoading(false);
    }
  };

  if (loading) {
    return (
      <div className="dashboard-loading">
        <div className="spinner" />
        <p>Loading your patients…</p>
      </div>
    );
  }

  if (error) {
    return (
      <div className="dashboard-error">
        <p>{error}</p>
        <button onClick={fetchOverview}>Retry</button>
      </div>
    );
  }

  const sortedPatients = [...patients].sort((a, b) => {
    if (sortBy === "adherence") return a.adherencePercentage - b.adherencePercentage;
    return a.name.localeCompare(b.name);
  });

  return (
    <div className="caregiver-dashboard">
      <header className="dashboard-header">
      <div>
        <h1>Welcome back, {user?.name || "Caregiver"}</h1>
        <p className="subtitle">
          Monitoring {patients.length} patient{patients.length !== 1 ? "s" : ""}
        </p>
      </div>
      <button onClick={handleLogout} className="logout-btn">Log Out</button>
    </header>
      {missedDoseAlerts.length > 0 && (
        <section className="missed-dose-banner">
          <h3>Missed Dose Alerts ({missedDoseAlerts.length})</h3>
          <div className="alert-list">
            {missedDoseAlerts.map((alert) => (
              <div key={alert.id} className="alert-item">
                <strong>{alert.patientName}</strong> missed{" "}
                <strong>{alert.medicineName}</strong> ({alert.time})
              </div>
            ))}
          </div>
        </section>
      )}

      <div className="caregiver-layout">
        <aside className="patient-list-panel">
          <div className="panel-header">
            <h2>Patients</h2>
            <select
              value={sortBy}
              onChange={(e) => setSortBy(e.target.value)}
              className="sort-select"
            >
              <option value="name">Sort: Name</option>
              <option value="adherence">Sort: Adherence</option>
            </select>
          </div>

          {sortedPatients.length === 0 ? (
            <p className="empty-state">No patients assigned yet.</p>
          ) : (
            <ul className="patient-list">
              {sortedPatients.map((p) => (
                <li
                  key={p.id}
                  className={`patient-list-item ${p.id === selectedPatientId ? "active" : ""}`}
                  onClick={() => setSelectedPatientId(p.id)}
                >
                  <div className="patient-avatar">{p.name.charAt(0).toUpperCase()}</div>
                  <div className="patient-summary">
                    <p className="patient-name">{p.name}</p>
                    <p className="patient-condition">{p.condition}</p>
                  </div>
                  <AdherenceBadge value={p.adherencePercentage} />
                </li>
              ))}
            </ul>
          )}
        </aside>

        <main className="patient-detail-panel">
          {detailLoading && (
            <div className="dashboard-loading">
              <div className="spinner" />
              <p>Loading patient details…</p>
            </div>
          )}

          {!detailLoading && !patientDetail && (
            <p className="empty-state">Select a patient to view details.</p>
          )}

          {!detailLoading && patientDetail && (
            <>
              <div className="detail-header">
                <div>
                  <h2>{patientDetail.name}</h2>
                  <p className="detail-sub">
                    {patientDetail.age} yrs • {patientDetail.condition}
                  </p>
                </div>
                <AdherenceBadge value={patientDetail.adherencePercentage} large />
              </div>

              <section className="detail-section">
                <h3>Adherence Monitoring</h3>
                <div className="adherence-stats">
                  <div className="stat">
                    <p className="stat-value">{patientDetail.adherencePercentage}%</p>
                    <p className="stat-label">Overall Adherence</p>
                  </div>
                  <div className="stat">
                    <p className="stat-value">{patientDetail.dosesTaken}</p>
                    <p className="stat-label">Doses Taken</p>
                  </div>
                  <div className="stat">
                    <p className="stat-value">{patientDetail.dosesMissed}</p>
                    <p className="stat-label">Doses Missed</p>
                  </div>
                </div>
              </section>

              <section className="detail-section">
                <h3>Medication Status</h3>
                {(!patientDetail.medications || patientDetail.medications.length === 0) ? (
                  <p className="empty-state">No active medications.</p>
                ) : (
                  <div className="medication-status-list">
                    {patientDetail.medications.map((med) => (
                      <div key={med.id} className="medication-status-item">
                        <div>
                          <p className="med-name">{med.name}</p>
                          <p className="med-detail">{med.dosage} • {med.frequency}</p>
                        </div>
                        <div className="med-stock">
                          <div className="stock-bar">
                            <div
                              className="stock-fill"
                              style={{
                                width: `${Math.min(100, (med.remainingStock / med.totalStock) * 100)}%`,
                              }}
                            />
                          </div>
                          <p className="stock-text">
                            {med.remainingStock}/{med.totalStock} left
                          </p>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </section>

              <section className="detail-section">
                <h3>Recent Missed Doses</h3>
                {(!patientDetail.recentMissedDoses || patientDetail.recentMissedDoses.length === 0) ? (
                  <p className="empty-state">No missed doses recently.</p>
                ) : (
                  <ul className="missed-dose-history">
                    {patientDetail.recentMissedDoses.map((m) => (
                      <li key={m.id}>
                        {m.medicineName} — missed on {m.date} at {m.time}
                      </li>
                    ))}
                  </ul>
                )}
              </section>
            </>
          )}
        </main>
      </div>
    </div>
  );
};

const AdherenceBadge = ({ value, large }) => {
  let tone = "green";
  if (value < 60) tone = "red";
  else if (value < 85) tone = "amber";
  return (
    <span className={`adherence-badge tone-${tone} ${large ? "large" : ""}`}>
      {value}%
    </span>
  );
};

export default CaregiverDashboard;
