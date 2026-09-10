import React, { useEffect, useMemo, useState } from "react";
import {
  Pill,
  Search,
  CheckCircle2,
  XCircle,
  Clock3,
  Package,
  RefreshCw,
} from "lucide-react";
import caregiverService from "../../services/caregiverService";

const MedicationMonitoring = () => {
  const [medicines, setMedicines] = useState([]);
  const [search, setSearch] = useState("");
  const [filter, setFilter] = useState("All");
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  const fetchMedicines = async () => {
    try {
      setLoading(true);
      setError("");

      const response = await caregiverService.getMedicationMonitoring();
      const data = Array.isArray(response.data) ? response.data : [];

      setMedicines(data);
    } catch (err) {
      console.error("Failed to load medication monitoring:", err);
      setError("Unable to load medication data. Please try again.");
      setMedicines([]);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchMedicines();
  }, []);

  const stats = useMemo(() => {
    const total = medicines.length;

    const taken = medicines.filter(
      (item) => String(item.status || "").toLowerCase() === "taken"
    ).length;

    const missed = medicines.filter(
      (item) => String(item.status || "").toLowerCase() === "missed"
    ).length;

    const lowStock = medicines.filter((item) => {
      const stock = Number(item.stock ?? item.currentStock ?? 0);
      return stock <= 15;
    }).length;

    return {
      total,
      taken,
      missed,
      lowStock,
    };
  }, [medicines]);

  const filteredMedicines = useMemo(() => {
    return medicines.filter((item) => {
      const patientName = (
        item.patient ||
        item.patientName ||
        item.username ||
        ""
      ).toLowerCase();

      const medicineName = (
        item.medicine ||
        item.medicineName ||
        ""
      ).toLowerCase();

      const searchValue = search.toLowerCase();

      const matchesSearch =
        patientName.includes(searchValue) ||
        medicineName.includes(searchValue);

      const status = String(item.status || "").trim();

      const matchesFilter =
        filter === "All" ||
        status.toLowerCase() === filter.toLowerCase();

      return matchesSearch && matchesFilter;
    });
  }, [medicines, search, filter]);

  return (
    <div className="caregiver-monitor-page">
      <style>{styles}</style>

      {/* HEADER */}
      <div className="caregiver-monitor-header">
        <div>
          <div className="caregiver-monitor-kicker">
            <Pill size={15} />
            MEDICATION MONITORING
          </div>

          <h1>Medication Monitoring</h1>

          <p>
            Track patient medication schedules, adherence and stock
            levels.
          </p>
        </div>

        <button
          className="monitor-refresh"
          onClick={fetchMedicines}
          disabled={loading}
        >
          <RefreshCw
            size={15}
            className={loading ? "spin" : ""}
          />
          Refresh
        </button>
      </div>

      {/* ERROR */}
      {error && (
        <div className="monitor-error">
          <span>{error}</span>

          <button onClick={fetchMedicines}>
            Try Again
          </button>
        </div>
      )}

      {/* SUMMARY */}
      <div className="monitor-stat-grid">
        <MonitorStat
          icon={<Pill size={20} />}
          label="Medicines Tracked"
          value={stats.total}
          detail="Across assigned patients"
        />

        <MonitorStat
          icon={<CheckCircle2 size={20} />}
          label="Taken Today"
          value={stats.taken}
          detail="Completed doses"
        />

        <MonitorStat
          icon={<XCircle size={20} />}
          label="Missed Today"
          value={stats.missed}
          detail="Needs attention"
        />

        <MonitorStat
          icon={<Package size={20} />}
          label="Low Stock"
          value={stats.lowStock}
          detail="Refill soon"
        />
      </div>

      {/* MAIN CARD */}
      <section className="monitor-card">
        <div className="monitor-toolbar">
          <div>
            <h2>Medication Status</h2>
            <p>
              View current medication activity for assigned patients.
            </p>
          </div>

          <div className="monitor-search">
            <Search size={16} />

            <input
              type="text"
              placeholder="Search patient or medicine..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
            />
          </div>
        </div>

        {/* FILTERS */}
        <div className="monitor-filters">
          {["All", "Taken", "Missed", "Low Stock"].map((item) => (
            <button
              key={item}
              className={filter === item ? "active" : ""}
              onClick={() => setFilter(item)}
            >
              {item}
            </button>
          ))}
        </div>

        {/* TABLE */}
        <div className="monitor-table-wrapper">
          <table className="monitor-table">
            <thead>
              <tr>
                <th>Patient</th>
                <th>Medicine</th>
                <th>Dosage</th>
                <th>Schedule</th>
                <th>Adherence</th>
                <th>Stock</th>
                <th>Status</th>
              </tr>
            </thead>

            <tbody>
              {loading ? (
                <tr>
                  <td colSpan="7">
                    <div className="monitor-empty">
                      <RefreshCw size={28} className="spin" />
                      <span>Loading medication records...</span>
                    </div>
                  </td>
                </tr>
              ) : filteredMedicines.length === 0 ? (
                <tr>
                  <td colSpan="7">
                    <div className="monitor-empty">
                      <Pill size={28} />
                      <span>No medication records found.</span>
                    </div>
                  </td>
                </tr>
              ) : (
                filteredMedicines.map((item, index) => {
                  const patientName =
                    item.patient ||
                    item.patientName ||
                    item.username ||
                    "Unknown Patient";

                  const medicineName =
                    item.medicine ||
                    item.medicineName ||
                    "Unknown Medicine";

                  const dosage =
                    item.dosage ||
                    item.dose ||
                    "-";

                  const schedule =
                    item.schedule ||
                    item.frequency ||
                    "-";

                  const adherence = Number(
                    item.adherencePercentage ??
                      item.adherence ??
                      0
                  );

                  const stock = Number(
                    item.stock ??
                      item.currentStock ??
                      item.remainingStock ??
                      0
                  );

                  const status = item.status || "Missed";

                  return (
                    <tr key={item.id ?? `${patientName}-${medicineName}-${index}`}>
                      <td>
                        <div className="monitor-patient">
                          <div className="monitor-avatar">
                            {patientName
                              .split(" ")
                              .filter(Boolean)
                              .map((part) => part[0])
                              .join("")
                              .slice(0, 2)
                              .toUpperCase()}
                          </div>

                          <strong>{patientName}</strong>
                        </div>
                      </td>

                      <td>
                        <div className="monitor-medicine">
                          <div className="monitor-pill-icon">
                            <Pill size={14} />
                          </div>

                          <span>{medicineName}</span>
                        </div>
                      </td>

                      <td>{dosage}</td>

                      <td>
                        <div className="monitor-schedule">
                          <Clock3 size={13} />
                          <span>{schedule}</span>
                        </div>
                      </td>

                      <td>
                        <div className="monitor-adherence">
                          <strong>{adherence}%</strong>

                          <div className="monitor-progress">
                            <div
                              style={{
                                width: `${Math.max(
                                  0,
                                  Math.min(adherence, 100)
                                )}%`,
                              }}
                            />
                          </div>
                        </div>
                      </td>

                      <td>
                        <div
                          className={`monitor-stock ${
                            stock <= 5
                              ? "critical"
                              : stock <= 15
                              ? "low"
                              : ""
                          }`}
                        >
                          <Package size={13} />
                          <span>{stock}</span>
                        </div>
                      </td>

                      <td>
                        <MedicationStatus
                          status={
                            stock <= 5
                              ? "Low Stock"
                              : status
                          }
                        />
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

const MonitorStat = ({
  icon,
  label,
  value,
  detail,
}) => {
  return (
    <div className="monitor-stat-card">
      <div className="monitor-stat-icon">
        {icon}
      </div>

      <div>
        <span>{label}</span>
        <strong>{value}</strong>
        <small>{detail}</small>
      </div>
    </div>
  );
};

const MedicationStatus = ({ status }) => {
  const normalized = String(status || "").toLowerCase();

  if (normalized === "taken") {
    return (
      <span className="medication-status taken">
        <CheckCircle2 size={13} />
        Taken
      </span>
    );
  }

  if (normalized === "missed") {
    return (
      <span className="medication-status missed">
        <XCircle size={13} />
        Missed
      </span>
    );
  }

  return (
    <span className="medication-status low">
      <Package size={13} />
      Low Stock
    </span>
  );
};

const styles = `
.caregiver-monitor-page {
  min-height: 100%;
  padding: 28px 30px 40px;
  background: #f7faf9;
  color: #21362f;
}

.caregiver-monitor-header {
  margin-bottom: 27px;
  display: flex;
  align-items: flex-start;
  justify-content: space-between;
  gap: 20px;
}

.caregiver-monitor-kicker {
  display: flex;
  align-items: center;
  gap: 7px;
  color: #2f8f7f;
  font-size: 11px;
  font-weight: 800;
  letter-spacing: .12em;
  margin-bottom: 7px;
}

.caregiver-monitor-header h1 {
  margin: 0;
  color: #21362f;
  font-size: 29px;
  font-weight: 750;
}

.caregiver-monitor-header p {
  margin: 8px 0 0;
  color: #788681;
  font-size: 14px;
}

.monitor-refresh {
  display: inline-flex;
  align-items: center;
  gap: 7px;
  border: 1px solid #dce8e4;
  border-radius: 10px;
  padding: 9px 13px;
  background: #fff;
  color: #2f8f7f;
  cursor: pointer;
  font-size: 11px;
  font-weight: 700;
}

.monitor-refresh:hover {
  background: #f3f9f7;
}

.monitor-refresh:disabled {
  opacity: .7;
  cursor: not-allowed;
}

.monitor-error {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 12px;
  margin-bottom: 18px;
  padding: 12px 14px;
  border: 1px solid #f1d3d0;
  border-radius: 11px;
  background: #fff7f6;
  color: #b14d45;
  font-size: 12px;
}

.monitor-error button {
  border: 0;
  border-radius: 7px;
  padding: 7px 10px;
  background: #b14d45;
  color: #fff;
  cursor: pointer;
  font-size: 10px;
  font-weight: 700;
}

.monitor-stat-grid {
  display: grid;
  grid-template-columns: repeat(4, 1fr);
  gap: 16px;
  margin-bottom: 18px;
}

.monitor-stat-card {
  display: flex;
  align-items: center;
  gap: 14px;
  min-height: 112px;
  padding: 19px;
  background: #fff;
  border: 1px solid #e4ece9;
  border-radius: 17px;
  box-shadow: 0 5px 18px rgba(31,54,47,.045);
}

.monitor-stat-icon {
  width: 45px;
  height: 45px;
  border-radius: 13px;
  display: flex;
  align-items: center;
  justify-content: center;
  flex-shrink: 0;
  background: #e8f5f1;
  color: #2f8f7f;
}

.monitor-stat-card span,
.monitor-stat-card small {
  display: block;
}

.monitor-stat-card span {
  color: #75837f;
  font-size: 12px;
  font-weight: 600;
}

.monitor-stat-card strong {
  display: block;
  margin-top: 3px;
  color: #21372f;
  font-size: 25px;
}

.monitor-stat-card small {
  margin-top: 3px;
  color: #9aa5a1;
  font-size: 10px;
}

.monitor-card {
  background: #fff;
  border: 1px solid #e4ece9;
  border-radius: 17px;
  padding: 20px 21px;
  box-shadow: 0 5px 18px rgba(31,54,47,.045);
}

.monitor-toolbar {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 18px;
}

.monitor-toolbar h2 {
  margin: 0;
  color: #263b34;
  font-size: 15px;
}

.monitor-toolbar p {
  margin: 4px 0 0;
  color: #87938f;
  font-size: 11px;
}

.monitor-search {
  display: flex;
  align-items: center;
  gap: 8px;
  width: 280px;
  padding: 9px 11px;
  border: 1px solid #e2eae7;
  border-radius: 10px;
  background: #f7faf9;
  color: #899691;
}

.monitor-search input {
  width: 100%;
  border: 0;
  outline: 0;
  background: transparent;
  color: #344940;
  font-size: 12px;
}

.monitor-filters {
  display: flex;
  gap: 5px;
  margin: 18px 0;
  padding: 4px;
  width: fit-content;
  border: 1px solid #e2ebe8;
  border-radius: 10px;
  background: #f2f6f4;
}

.monitor-filters button {
  border: 0;
  border-radius: 7px;
  padding: 8px 12px;
  background: transparent;
  color: #77847f;
  cursor: pointer;
  font-size: 10px;
  font-weight: 650;
}

.monitor-filters button.active {
  background: #fff;
  color: #2f8f7f;
  box-shadow: 0 2px 6px rgba(30,50,44,.07);
}

.monitor-table-wrapper {
  width: 100%;
  overflow-x: auto;
}

.monitor-table {
  width: 100%;
  min-width: 950px;
  border-collapse: collapse;
}

.monitor-table th {
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

.monitor-table td {
  padding: 13px 11px;
  color: #53645e;
  font-size: 11px;
  border-bottom: 1px solid #edf2f0;
}

.monitor-table tbody tr:hover {
  background: #fbfcfc;
}

.monitor-patient {
  display: flex;
  align-items: center;
  gap: 9px;
}

.monitor-avatar {
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
}

.monitor-patient strong {
  color: #334940;
  font-size: 11px;
}

.monitor-medicine {
  display: flex;
  align-items: center;
  gap: 7px;
  color: #334940;
  font-weight: 650;
}

.monitor-pill-icon {
  width: 27px;
  height: 27px;
  border-radius: 8px;
  display: flex;
  align-items: center;
  justify-content: center;
  background: #e8f5f1;
  color: #2f8f7f;
}

.monitor-schedule {
  display: flex;
  align-items: center;
  gap: 5px;
  color: #75837e;
}

.monitor-adherence {
  min-width: 100px;
}

.monitor-adherence strong {
  display: block;
  color: #2f8f7f;
  font-size: 10px;
  margin-bottom: 5px;
}

.monitor-progress {
  width: 100%;
  height: 5px;
  background: #edf2f0;
  border-radius: 8px;
  overflow: hidden;
}

.monitor-progress div {
  height: 100%;
  background: #2f8f7f;
  border-radius: inherit;
}

.monitor-stock {
  display: inline-flex;
  align-items: center;
  gap: 5px;
  color: #566760;
}

.monitor-stock.low {
  color: #b27d23;
}

.monitor-stock.critical {
  color: #d1584f;
}

.medication-status {
  display: inline-flex;
  align-items: center;
  gap: 5px;
  border-radius: 8px;
  padding: 5px 8px;
  font-size: 9px;
  font-weight: 750;
}

.medication-status.taken {
  color: #2f8f7f;
  background: #e8f5f1;
}

.medication-status.missed {
  color: #d1584f;
  background: #fcebea;
}

.medication-status.low {
  color: #ae7c27;
  background: #fff3d7;
}

.monitor-empty {
  min-height: 180px;
  display: flex;
  align-items: center;
  justify-content: center;
  flex-direction: column;
  gap: 8px;
  color: #9ba6a2;
}

.spin {
  animation: monitor-spin 1s linear infinite;
}

@keyframes monitor-spin {
  from {
    transform: rotate(0deg);
  }

  to {
    transform: rotate(360deg);
  }
}

@media (max-width: 950px) {
  .monitor-stat-grid {
    grid-template-columns: repeat(2, 1fr);
  }

  .monitor-toolbar {
    flex-direction: column;
    align-items: stretch;
  }

  .monitor-search {
    width: auto;
  }
}

@media (max-width: 600px) {
  .caregiver-monitor-page {
    padding: 22px 16px 30px;
  }

  .caregiver-monitor-header {
    flex-direction: column;
  }

  .monitor-stat-grid {
    grid-template-columns: 1fr;
  }

  .monitor-filters {
    width: 100%;
    overflow-x: auto;
  }

  .monitor-filters button {
    white-space: nowrap;
  }

  .monitor-error {
    align-items: flex-start;
    flex-direction: column;
  }
}
`;

export default MedicationMonitoring;