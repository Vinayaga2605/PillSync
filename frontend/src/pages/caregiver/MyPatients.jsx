import React, { useEffect, useMemo, useState } from "react";
import {
  Users,
  Search,
  Eye,
  TrendingUp,
  Pill,
  AlertTriangle,
  RefreshCw,
} from "lucide-react";
import { useNavigate } from "react-router-dom";
import caregiverService from "../../services/caregiverService";

const MyPatients = () => {
  const [patients, setPatients] = useState([]);
  const [search, setSearch] = useState("");
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  const navigate = useNavigate();

  const fetchPatients = async () => {
    try {
      setLoading(true);
      setError("");

      const response =
        await caregiverService.getAssignedPatients();

      const data = Array.isArray(response.data)
        ? response.data
        : [];

      setPatients(data);
    } catch (err) {
      console.error("Failed to load patients:", err);

      setError(
        "Unable to load assigned patients. Please try again."
      );

      setPatients([]);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchPatients();
  }, []);

  const filteredPatients = useMemo(() => {
    return patients.filter((patient) => {
      const name = (
        patient.name ||
        patient.username ||
        ""
      ).toLowerCase();

      return name.includes(search.toLowerCase());
    });
  }, [patients, search]);

  const totalPatients = patients.length;

  const goodAdherence = patients.filter(
    (patient) =>
      Number(patient.adherencePercentage || 0) >= 90
  ).length;

  const needsAttention = patients.filter(
    (patient) =>
      Number(patient.adherencePercentage || 0) < 90
  ).length;

  const totalMedicines = patients.reduce(
    (sum, patient) =>
      sum +
      Number(
        patient.medicationCount ??
          patient.medicines ??
          0
      ),
    0
  );

  const getStatus = (adherence) => {
    const value = Number(adherence || 0);

    if (value >= 90) return "Good";
    if (value >= 80) return "Attention";
    return "Critical";
  };

  const getInitials = (name) => {
    if (!name) return "P";

    return name
      .split(" ")
      .filter(Boolean)
      .map((part) => part[0])
      .join("")
      .slice(0, 2)
      .toUpperCase();
  };

  return (
    <div className="caregiver-page">
      <style>{styles}</style>

      {/* HEADER */}
      <div className="caregiver-header">
        <div>
          <div className="caregiver-kicker">
            <Users size={15} />
            PATIENT MANAGEMENT
          </div>

          <h1>My Patients</h1>

          <p>
            View and monitor all patients assigned to you.
          </p>
        </div>

        <button
          className="refresh-patients-btn"
          onClick={fetchPatients}
          disabled={loading}
        >
          <RefreshCw
            size={16}
            className={loading ? "spin" : ""}
          />
          Refresh
        </button>
      </div>

      {/* SUMMARY */}
      <div className="patients-summary">
        <Summary
          icon={<Users size={20} />}
          label="Total Patients"
          value={totalPatients}
        />

        <Summary
          icon={<TrendingUp size={20} />}
          label="Good Adherence"
          value={goodAdherence}
        />

        <Summary
          icon={<AlertTriangle size={20} />}
          label="Needs Attention"
          value={needsAttention}
        />

        <Summary
          icon={<Pill size={20} />}
          label="Total Medicines"
          value={totalMedicines}
        />
      </div>

      {/* MAIN CARD */}
      <section className="cg-card">
        <div className="patients-toolbar">
          <div>
            <h2>Assigned Patients</h2>

            <p>
              Search and view patient medication details.
            </p>
          </div>

          <div className="search-box">
            <Search size={16} />

            <input
              type="text"
              placeholder="Search patient..."
              value={search}
              onChange={(e) =>
                setSearch(e.target.value)
              }
            />
          </div>
        </div>

        {/* ERROR */}
        {error && (
          <div className="patients-error">
            <AlertTriangle size={17} />
            <span>{error}</span>

            <button onClick={fetchPatients}>
              Retry
            </button>
          </div>
        )}

        {/* TABLE */}
        <div className="patients-table-wrap">
          <table className="patients-table">
            <thead>
              <tr>
                <th>Patient</th>
                <th>Age</th>
                <th>Medicines</th>
                <th>Adherence</th>
                <th>Doses Missed</th>
                <th>Status</th>
                <th>Action</th>
              </tr>
            </thead>

            <tbody>
              {loading ? (
                <tr>
                  <td colSpan="7">
                    <div className="empty-state">
                      <RefreshCw
                        size={22}
                        className="spin"
                      />

                      <span>
                        Loading assigned patients...
                      </span>
                    </div>
                  </td>
                </tr>
              ) : filteredPatients.length === 0 ? (
                <tr>
                  <td colSpan="7">
                    <div className="empty-state">
                      <Users size={28} />

                      <span>
                        {search
                          ? "No patients match your search."
                          : "No patients are assigned to you."}
                      </span>
                    </div>
                  </td>
                </tr>
              ) : (
                filteredPatients.map((patient) => {
                  const name =
                    patient.name ||
                    patient.username ||
                    "Unknown Patient";

                  const adherence =
                    Number(
                      patient.adherencePercentage
                    ) || 0;

                  const medicines =
                    Number(
                      patient.medicationCount ??
                        patient.medicines ??
                        0
                    ) || 0;

                  const missed =
                    Number(
                      patient.dosesMissed ?? 0
                    ) || 0;

                  const status = getStatus(adherence);

                  return (
                    <tr key={patient.id}>
                      {/* PATIENT */}
                      <td>
                        <div className="patient-cell">
                          <div className="patient-avatar">
                            {getInitials(name)}
                          </div>

                          <div>
                            <strong>{name}</strong>

                            {patient.email && (
                              <small>
                                {patient.email}
                              </small>
                            )}
                          </div>
                        </div>
                      </td>

                      {/* AGE */}
                      <td>
                        {patient.age ?? "-"}
                      </td>

                      {/* MEDICINES */}
                      <td>{medicines}</td>

                      {/* ADHERENCE */}
                      <td>
                        <div className="table-progress">
                          <div className="progress-label">
                            <span>{adherence}%</span>
                          </div>

                          <div className="progress-track">
                            <i
                              className={
                                adherence < 80
                                  ? "critical"
                                  : adherence < 90
                                  ? "attention"
                                  : ""
                              }
                              style={{
                                width: `${adherence}%`,
                              }}
                            />
                          </div>
                        </div>
                      </td>

                      {/* MISSED */}
                      <td>
                        <span
                          className={
                            missed > 0
                              ? "missed-value"
                              : "no-missed"
                          }
                        >
                          {missed}
                        </span>
                      </td>

                      {/* STATUS */}
                      <td>
                        <span
                          className={`cg-status ${status.toLowerCase()}`}
                        >
                          {status}
                        </span>
                      </td>

                      {/* ACTION */}
                      <td>
                        <button
                          className="view-btn"
                          onClick={() =>
                            navigate(
                              `/caregiver-patient-analytics?patient_id=${patient.id}`
                            )
                          }
                        >
                          <Eye size={15} />
                          View
                        </button>
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>
      </section>
    </div>
  );
};

const Summary = ({ icon, label, value }) => {
  return (
    <div className="patients-summary-card">
      <div>{icon}</div>

      <span>{label}</span>

      <strong>{value}</strong>
    </div>
  );
};

const styles = `
.caregiver-page {
  min-height: 100%;
  padding: 28px 30px 40px;
  background: #f7faf9;
  color: #21362f;
}

.caregiver-header {
  display: flex;
  justify-content: space-between;
  align-items: flex-start;
  gap: 20px;
  margin-bottom: 27px;
}

.caregiver-kicker {
  display: flex;
  align-items: center;
  gap: 7px;
  color: #2f8f7f;
  font-size: 11px;
  font-weight: 800;
  letter-spacing: .12em;
  margin-bottom: 7px;
}

.caregiver-header h1 {
  margin: 0;
  color: #21362f;
  font-size: 29px;
  font-weight: 750;
}

.caregiver-header p {
  margin: 8px 0 0;
  color: #788681;
  font-size: 14px;
}

.refresh-patients-btn {
  display: inline-flex;
  align-items: center;
  gap: 7px;
  border: 1px solid #dce8e4;
  border-radius: 10px;
  padding: 10px 14px;
  background: #fff;
  color: #2f8f7f;
  cursor: pointer;
  font-size: 11px;
  font-weight: 700;
}

.refresh-patients-btn:hover {
  background: #f2f8f6;
}

.refresh-patients-btn:disabled {
  opacity: .6;
  cursor: default;
}

.patients-summary {
  display: grid;
  grid-template-columns: repeat(4, 1fr);
  gap: 16px;
  margin-bottom: 18px;
}

.patients-summary-card {
  background: #fff;
  border: 1px solid #e4ece9;
  border-radius: 17px;
  padding: 18px;
  box-shadow: 0 5px 18px rgba(31, 54, 47, .045);
}

.patients-summary-card > div {
  width: 40px;
  height: 40px;
  border-radius: 11px;
  display: flex;
  align-items: center;
  justify-content: center;
  background: #e8f5f1;
  color: #2f8f7f;
  margin-bottom: 12px;
}

.patients-summary-card span {
  display: block;
  color: #7c8985;
  font-size: 11px;
}

.patients-summary-card strong {
  display: block;
  margin-top: 3px;
  color: #263b34;
  font-size: 24px;
}

.cg-card {
  background: white;
  border: 1px solid #e4ece9;
  border-radius: 17px;
  padding: 20px 21px;
  box-shadow: 0 5px 18px rgba(31, 54, 47, .045);
}

.patients-toolbar {
  display: flex;
  justify-content: space-between;
  align-items: center;
  gap: 16px;
  margin-bottom: 18px;
}

.patients-toolbar h2 {
  margin: 0;
  color: #263b34;
  font-size: 15px;
}

.patients-toolbar p {
  margin: 4px 0 0;
  color: #87938f;
  font-size: 11px;
}

.search-box {
  display: flex;
  align-items: center;
  gap: 8px;
  width: 250px;
  background: #f7faf9;
  border: 1px solid #e2eae7;
  border-radius: 10px;
  padding: 9px 11px;
  color: #899691;
}

.search-box input {
  width: 100%;
  outline: none;
  border: 0;
  background: transparent;
  color: #344940;
  font-size: 12px;
}

.patients-error {
  display: flex;
  align-items: center;
  gap: 9px;
  margin-bottom: 15px;
  padding: 11px 13px;
  border-radius: 10px;
  border: 1px solid #f0d2cf;
  background: #fff8f7;
  color: #c04f47;
  font-size: 11px;
}

.patients-error span {
  flex: 1;
}

.patients-error button {
  border: 0;
  background: transparent;
  color: #c04f47;
  cursor: pointer;
  font-size: 10px;
  font-weight: 750;
}

.patients-table-wrap {
  width: 100%;
  overflow-x: auto;
}

.patients-table {
  width: 100%;
  min-width: 900px;
  border-collapse: collapse;
}

.patients-table th {
  padding: 11px;
  text-align: left;
  background: #f7faf9;
  color: #7c8985;
  font-size: 10px;
  font-weight: 800;
  text-transform: uppercase;
  letter-spacing: .04em;
  border-bottom: 1px solid #e7efec;
}

.patients-table td {
  padding: 13px 11px;
  color: #53645e;
  font-size: 11px;
  border-bottom: 1px solid #edf2f0;
}

.patients-table tbody tr:hover {
  background: #fbfcfc;
}

.patient-cell {
  display: flex;
  align-items: center;
  gap: 9px;
}

.patient-avatar {
  width: 34px;
  height: 34px;
  border-radius: 10px;
  background: #e8f5f1;
  color: #2f8f7f;
  display: flex;
  align-items: center;
  justify-content: center;
  font-size: 10px;
  font-weight: 800;
  flex-shrink: 0;
}

.patient-cell strong {
  display: block;
  color: #334940;
  font-size: 11px;
}

.patient-cell small {
  display: block;
  margin-top: 2px;
  color: #9aa5a1;
  font-size: 9px;
}

.table-progress {
  min-width: 110px;
}

.progress-label {
  margin-bottom: 4px;
}

.progress-label span {
  color: #2f8f7f;
  font-size: 10px;
  font-weight: 700;
}

.progress-track {
  width: 100%;
  height: 5px;
  background: #edf2f0;
  border-radius: 8px;
  overflow: hidden;
}

.progress-track i {
  display: block;
  height: 100%;
  background: #2f8f7f;
  border-radius: inherit;
  transition: width .3s ease;
}

.progress-track i.attention {
  background: #c18a35;
}

.progress-track i.critical {
  background: #d1584f;
}

.missed-value {
  display: inline-flex;
  min-width: 24px;
  justify-content: center;
  padding: 4px 7px;
  border-radius: 7px;
  background: #fcebea;
  color: #c65048;
  font-weight: 750;
}

.no-missed {
  color: #2f8f7f;
  font-weight: 700;
}

.cg-status {
  display: inline-block;
  padding: 5px 9px;
  border-radius: 8px;
  font-size: 9px;
  font-weight: 800;
}

.cg-status.good {
  color: #277967;
  background: #e8f5f1;
}

.cg-status.attention {
  color: #9a7228;
  background: #fff4d9;
}

.cg-status.critical {
  color: #c14d45;
  background: #fcebea;
}

.view-btn {
  display: inline-flex;
  align-items: center;
  gap: 5px;
  border: 0;
  background: #e8f5f1;
  color: #2f8f7f;
  border-radius: 8px;
  padding: 7px 10px;
  cursor: pointer;
  font-size: 10px;
  font-weight: 700;
}

.view-btn:hover {
  background: #dcefe9;
}

.empty-state {
  min-height: 180px;
  display: flex;
  align-items: center;
  justify-content: center;
  flex-direction: column;
  gap: 8px;
  color: #9aa6a2;
}

.empty-state span {
  font-size: 11px;
}

.spin {
  animation: patient-spin 1s linear infinite;
}

@keyframes patient-spin {
  from {
    transform: rotate(0deg);
  }
  to {
    transform: rotate(360deg);
  }
}

@media (max-width: 900px) {
  .patients-summary {
    grid-template-columns: repeat(2, 1fr);
  }

  .patients-toolbar {
    align-items: flex-start;
    flex-direction: column;
  }

  .search-box {
    width: 100%;
  }
}

@media (max-width: 600px) {
  .caregiver-page {
    padding: 22px 16px 30px;
  }

  .caregiver-header {
    flex-direction: column;
  }

  .refresh-patients-btn {
    width: 100%;
    justify-content: center;
  }

  .patients-summary {
    grid-template-columns: 1fr;
  }

  .caregiver-header h1 {
    font-size: 24px;
  }
}
`;

export default MyPatients;