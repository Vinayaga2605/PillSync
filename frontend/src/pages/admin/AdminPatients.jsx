import React, { useEffect, useState } from "react";
import {
  Users,
  UserRound,
  Search,
  RefreshCw,
  AlertTriangle,
  Pill,
  Mail,
  Phone,
} from "lucide-react";

import { fetchPatientsWithMedications } from "../../services/api";

const AdminPatients = () => {
  const [patients, setPatients] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [search, setSearch] = useState("");

  const loadPatients = async () => {
    try {
      setLoading(true);
      setError("");

      const data =
        await fetchPatientsWithMedications();

      setPatients(
        Array.isArray(data) ? data : []
      );
    } catch (err) {
      console.error(
        "Admin patients error:",
        err
      );

      setError(
        err?.response?.data?.detail ||
          err?.message ||
          "Unable to load patients."
      );
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadPatients();
  }, []);

  const filteredPatients = patients.filter(
    (patient) => {
      const query = search
        .trim()
        .toLowerCase();

      if (!query) {
        return true;
      }

      return (
        String(
          patient.full_name ||
            patient.name ||
            patient.username ||
            ""
        )
          .toLowerCase()
          .includes(query) ||
        String(patient.email || "")
          .toLowerCase()
          .includes(query) ||
        String(patient.phone || "")
          .toLowerCase()
          .includes(query)
      );
    }
  );

  return (
    <div className="admin-patients-page">
      <style>{styles}</style>

      <header className="patients-header">
        <div>
          <p className="patients-eyebrow">
            Administration
          </p>

          <h1>Patients</h1>

          <p>
            View registered patients and their
            medication records.
          </p>
        </div>

        <button
          className="patients-refresh-btn"
          type="button"
          onClick={loadPatients}
        >
          <RefreshCw size={17} />
          Refresh
        </button>
      </header>

      {error && (
        <div className="patients-error">
          <AlertTriangle size={18} />
          <span>{error}</span>
        </div>
      )}

      <section className="patients-summary">
        <div className="patients-stat">
          <div className="patients-stat-icon blue">
            <Users size={21} />
          </div>

          <div>
            <span>Total Patients</span>
            <strong>{patients.length}</strong>
          </div>
        </div>

        <div className="patients-stat">
          <div className="patients-stat-icon teal">
            <Pill size={21} />
          </div>

          <div>
            <span>Total Medicines</span>
            <strong>
              {patients.reduce(
                (total, patient) =>
                  total +
                  (Array.isArray(
                    patient.medications
                  )
                    ? patient.medications.length
                    : 0),
                0
              )}
            </strong>
          </div>
        </div>

        <div className="patients-stat">
          <div className="patients-stat-icon green">
            <UserRound size={21} />
          </div>

          <div>
            <span>Displayed</span>
            <strong>
              {filteredPatients.length}
            </strong>
          </div>
        </div>
      </section>

      <section className="patients-panel">
        <div className="patients-panel-header">
          <div>
            <h2>Registered Patients</h2>
            <p>
              {patients.length} patient
              {patients.length === 1
                ? ""
                : "s"} in the system.
            </p>
          </div>

          <div className="patients-search">
            <Search size={17} />

            <input
              type="text"
              placeholder="Search patients..."
              value={search}
              onChange={(e) =>
                setSearch(e.target.value)
              }
            />
          </div>
        </div>

        {loading ? (
          <div className="patients-loading">
            <div className="patients-spinner" />
            <p>Loading patients...</p>
          </div>
        ) : filteredPatients.length === 0 ? (
          <div className="patients-empty">
            <Users size={30} />

            <h3>
              {search
                ? "No patients found"
                : "No patients registered"}
            </h3>

            <p>
              {search
                ? "Try a different search term."
                : "There are currently no patient records to display."}
            </p>
          </div>
        ) : (
          <div className="patients-table-wrap">
            <table className="patients-table">
              <thead>
                <tr>
                  <th>Patient</th>
                  <th>Contact</th>
                  <th>Gender</th>
                  <th>Blood Group</th>
                  <th>Medicines</th>
                </tr>
              </thead>

              <tbody>
                {filteredPatients.map(
                  (patient) => {
                    const patientName =
                      patient.full_name ||
                      patient.name ||
                      patient.username ||
                      "Patient";

                    const medicineCount =
                      Array.isArray(
                        patient.medications
                      )
                        ? patient.medications.length
                        : 0;

                    return (
                      <tr
                        key={
                          patient.user_id ||
                          patient.id
                        }
                      >
                        <td>
                          <div className="patient-name-cell">
                            <div className="patient-avatar">
                              {patientName
                                .charAt(0)
                                .toUpperCase()}
                            </div>

                            <div>
                              <strong>
                                {patientName}
                              </strong>

                              <span>
                                ID:{" "}
                                {patient.user_id ||
                                  patient.id ||
                                  "-"}
                              </span>
                            </div>
                          </div>
                        </td>

                        <td>
                          <div className="patient-contact">
                            <div>
                              <Mail
                                size={14}
                              />
                              <span>
                                {patient.email ||
                                  "-"}
                              </span>
                            </div>

                            <div>
                              <Phone
                                size={14}
                              />
                              <span>
                                {patient.phone ||
                                  "-"}
                              </span>
                            </div>
                          </div>
                        </td>

                        <td>
                          {patient.gender || "-"}
                        </td>

                        <td>
                          <span className="blood-badge">
                            {patient.blood_group ||
                              "-"}
                          </span>
                        </td>

                        <td>
                          <span className="medicine-count">
                            <Pill size={14} />
                            {medicineCount}
                          </span>
                        </td>
                      </tr>
                    );
                  }
                )}
              </tbody>
            </table>
          </div>
        )}
      </section>
    </div>
  );
};

const styles = `
  .admin-patients-page {
    min-height: calc(100vh - 80px);
    padding: 28px;
    background: #f7f9fc;
    color: #172033;
  }

  .patients-header {
    display: flex;
    align-items: flex-start;
    justify-content: space-between;
    gap: 20px;
    margin-bottom: 24px;
  }

  .patients-eyebrow {
    margin: 0 0 6px;
    color: #0f9488;
    font-size: 11px;
    font-weight: 700;
    text-transform: uppercase;
    letter-spacing: .08em;
  }

  .patients-header h1 {
    margin: 0;
    color: #172033;
    font-size: 30px;
    font-weight: 750;
  }

  .patients-header p:last-child {
    margin: 7px 0 0;
    color: #697386;
    font-size: 14px;
  }

  .patients-refresh-btn {
    display: inline-flex;
    align-items: center;
    gap: 7px;
    border: 1px solid #dce3eb;
    border-radius: 10px;
    padding: 10px 14px;
    background: #fff;
    color: #344054;
    font-size: 13px;
    font-weight: 650;
    cursor: pointer;
  }

  .patients-refresh-btn:hover {
    background: #f9fafb;
  }

  .patients-error {
    display: flex;
    align-items: center;
    gap: 9px;
    margin-bottom: 18px;
    padding: 12px 14px;
    border: 1px solid #fecaca;
    border-radius: 10px;
    background: #fff5f5;
    color: #b42318;
    font-size: 13px;
  }

  .patients-summary {
    display: grid;
    grid-template-columns: repeat(3, minmax(0, 1fr));
    gap: 14px;
    margin-bottom: 18px;
  }

  .patients-stat {
    display: flex;
    align-items: center;
    gap: 12px;
    padding: 16px;
    border: 1px solid #e7ebf0;
    border-radius: 12px;
    background: #fff;
    box-shadow: 0 2px 8px rgba(15, 23, 42, .03);
  }

  .patients-stat-icon {
    width: 42px;
    height: 42px;
    min-width: 42px;
    display: flex;
    align-items: center;
    justify-content: center;
    border-radius: 11px;
  }

  .patients-stat-icon.blue {
    background: #eff6ff;
    color: #2563eb;
  }

  .patients-stat-icon.teal {
    background: #e8f8f6;
    color: #0f9488;
  }

  .patients-stat-icon.green {
    background: #ecfdf3;
    color: #039855;
  }

  .patients-stat span {
    display: block;
    color: #7b8495;
    font-size: 11px;
  }

  .patients-stat strong {
    display: block;
    margin-top: 4px;
    color: #172033;
    font-size: 20px;
  }

  .patients-panel {
    padding: 20px;
    border: 1px solid #e7ebf0;
    border-radius: 14px;
    background: #fff;
    box-shadow: 0 2px 8px rgba(15, 23, 42, .03);
  }

  .patients-panel-header {
    display: flex;
    align-items: center;
    justify-content: space-between;
    gap: 15px;
    margin-bottom: 18px;
  }

  .patients-panel-header h2 {
    margin: 0;
    color: #172033;
    font-size: 19px;
  }

  .patients-panel-header p {
    margin: 4px 0 0;
    color: #7b8495;
    font-size: 12px;
  }

  .patients-search {
    width: min(300px, 100%);
    display: flex;
    align-items: center;
    gap: 8px;
    padding: 0 11px;
    border: 1px solid #dce2e9;
    border-radius: 9px;
    color: #98a2b3;
  }

  .patients-search:focus-within {
    border-color: #14b8a6;
    box-shadow: 0 0 0 3px rgba(20, 184, 166, .1);
  }

  .patients-search input {
    width: 100%;
    min-width: 0;
    border: 0;
    outline: 0;
    padding: 10px 0;
    background: transparent;
    color: #172033;
    font-size: 13px;
  }

  .patients-search input::placeholder {
    color: #98a2b3;
  }

  .patients-table-wrap {
    width: 100%;
    overflow-x: auto;
  }

  .patients-table {
    width: 100%;
    min-width: 850px;
    border-collapse: collapse;
  }

  .patients-table th {
    padding: 11px 12px;
    border-bottom: 1px solid #e7ebf0;
    background: #f8fafc;
    color: #667085;
    text-align: left;
    font-size: 11px;
    font-weight: 700;
    text-transform: uppercase;
  }

  .patients-table td {
    padding: 13px 12px;
    border-bottom: 1px solid #edf0f3;
    color: #475467;
    font-size: 13px;
    vertical-align: middle;
  }

  .patients-table tbody tr:hover {
    background: #fbfdfd;
  }

  .patient-name-cell {
    display: flex;
    align-items: center;
    gap: 10px;
  }

  .patient-avatar {
    width: 38px;
    height: 38px;
    min-width: 38px;
    display: flex;
    align-items: center;
    justify-content: center;
    border-radius: 50%;
    background: #e8f8f6;
    color: #0f766e;
    font-size: 13px;
    font-weight: 750;
  }

  .patient-name-cell strong {
    display: block;
    color: #172033;
    font-size: 13px;
  }

  .patient-name-cell span {
    display: block;
    margin-top: 3px;
    color: #98a2b3;
    font-size: 10px;
  }

  .patient-contact {
    display: flex;
    flex-direction: column;
    gap: 5px;
  }

  .patient-contact div {
    display: flex;
    align-items: center;
    gap: 6px;
    color: #667085;
  }

  .patient-contact svg {
    color: #98a2b3;
  }

  .blood-badge {
    display: inline-flex;
    align-items: center;
    justify-content: center;
    min-width: 35px;
    padding: 5px 8px;
    border-radius: 7px;
    background: #f2f4f7;
    color: #475467;
    font-size: 11px;
    font-weight: 650;
  }

  .medicine-count {
    display: inline-flex;
    align-items: center;
    gap: 5px;
    padding: 5px 9px;
    border-radius: 7px;
    background: #e8f8f6;
    color: #0f766e;
    font-size: 11px;
    font-weight: 650;
  }

  .patients-loading,
  .patients-empty {
    min-height: 260px;
    display: flex;
    align-items: center;
    justify-content: center;
    flex-direction: column;
    text-align: center;
    color: #98a2b3;
  }

  .patients-loading p {
    margin: 10px 0 0;
    font-size: 13px;
  }

  .patients-spinner {
    width: 28px;
    height: 28px;
    border: 3px solid #d8eeeb;
    border-top-color: #14b8a6;
    border-radius: 50%;
    animation: patients-spin .7s linear infinite;
  }

  .patients-empty h3 {
    margin: 10px 0 5px;
    color: #344054;
    font-size: 15px;
  }

  .patients-empty p {
    margin: 0;
    font-size: 12px;
  }

  @keyframes patients-spin {
    to {
      transform: rotate(360deg);
    }
  }

  @media (max-width: 850px) {
    .patients-summary {
      grid-template-columns: 1fr;
    }

    .patients-panel-header {
      align-items: flex-start;
      flex-direction: column;
    }

    .patients-search {
      width: 100%;
    }
  }

  @media (max-width: 600px) {
    .admin-patients-page {
      padding: 18px;
    }

    .patients-header {
      flex-direction: column;
    }

    .patients-header h1 {
      font-size: 25px;
    }

    .patients-refresh-btn {
      width: 100%;
    }
  }
`;

export default AdminPatients;