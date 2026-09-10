import React, { useEffect, useMemo, useState } from "react";
import {
  TrendingUp,
  CalendarDays,
  CheckCircle2,
  XCircle,
  Package,
  Pill,
  RefreshCw,
} from "lucide-react";

import {
  ResponsiveContainer,
  LineChart,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  BarChart,
  Bar,
} from "recharts";

import { useSearchParams } from "react-router-dom";
import caregiverService from "../../services/caregiverService";

const PatientAnalytics = () => {
  const [searchParams] = useSearchParams();

  const [patients, setPatients] = useState([]);
  const [patientId, setPatientId] = useState(
    searchParams.get("patient_id") || ""
  );

  const [analytics, setAnalytics] = useState(null);

  const [loadingPatients, setLoadingPatients] = useState(true);
  const [loadingAnalytics, setLoadingAnalytics] = useState(false);

  const [error, setError] = useState("");

  const fetchPatients = async () => {
    try {
      setLoadingPatients(true);
      setError("");

      const response =
        await caregiverService.getAssignedPatients();

      const data = Array.isArray(response.data)
        ? response.data
        : response.data?.patients || [];

      setPatients(data);

      if (data.length === 0) {
        setPatientId("");
        return;
      }

      const urlPatientId = searchParams.get("patient_id");

      const requestedPatient = urlPatientId
        ? data.find(
            (patient) =>
              String(patient.id ?? patient.patient_id) ===
              String(urlPatientId)
          )
        : null;

      if (requestedPatient) {
        setPatientId(
          String(
            requestedPatient.id ??
              requestedPatient.patient_id
          )
        );
      } else if (!patientId) {
        setPatientId(
          String(
            data[0].id ??
              data[0].patient_id
          )
        );
      }
    } catch (err) {
      console.error("Failed to load patients:", err);
      setError("Unable to load assigned patients.");
      setPatients([]);
    } finally {
      setLoadingPatients(false);
    }
  };

  const fetchAnalytics = async (id) => {
    if (!id) {
      setAnalytics(null);
      return;
    }

    try {
      setLoadingAnalytics(true);
      setError("");

      const response =
        await caregiverService.getPatientAnalytics(id);

      setAnalytics(response.data || {});
    } catch (err) {
      console.error("Failed to load patient analytics:", err);

      setError(
        "Unable to load analytics for this patient."
      );

      setAnalytics(null);
    } finally {
      setLoadingAnalytics(false);
    }
  };

  useEffect(() => {
    fetchPatients();
  }, []);

  useEffect(() => {
    if (patientId) {
      fetchAnalytics(patientId);
    }
  }, [patientId]);

  const selectedPatient = useMemo(() => {
    return (
      patients.find(
        (patient) =>
          String(
            patient.id ??
              patient.patient_id
          ) === String(patientId)
      ) || null
    );
  }, [patients, patientId]);

  const patientName =
    analytics?.patient?.name ||
    analytics?.patient_name ||
    selectedPatient?.name ||
    selectedPatient?.username ||
    "Patient";

  const weeklyData =
    analytics?.weeklyAdherence ||
    analytics?.weekly_adherence ||
    analytics?.weekly ||
    analytics?.last_7_days ||
    [];

  const medicineData =
    analytics?.medicinePerformance ||
    analytics?.medicine_performance ||
    analytics?.medicines ||
    [];

  const statistics =
    analytics?.statistics ||
    analytics?.stats ||
    {};

  const adherence = Number(
    statistics.adherence ??
      analytics?.adherence ??
      analytics?.adherencePercentage ??
      selectedPatient?.adherencePercentage ??
      selectedPatient?.adherence ??
      0
  );

  const taken = Number(
    statistics.taken ??
      statistics.dosesTaken ??
      analytics?.taken ??
      analytics?.dosesTaken ??
      0
  );

  const missed = Number(
    statistics.missed ??
      statistics.dosesMissed ??
      analytics?.missed ??
      analytics?.dosesMissed ??
      0
  );

  const refill =
    statistics.refillDays ??
    statistics.refill ??
    analytics?.refillDays ??
    analytics?.refill ??
    0;

  const medicationSummary =
    analytics?.medicationSummary ||
    analytics?.medication_summary ||
    analytics?.medications ||
    medicineData;

  const refillStatus =
    analytics?.refillStatus ||
    analytics?.refill_status ||
    [];

  const normalizedWeeklyData = weeklyData.map(
    (item, index) => ({
      day:
        item.day ||
        item.date ||
        item.label ||
        `Day ${index + 1}`,
      adherence: Number(
        item.adherence ??
          item.adherencePercentage ??
          item.value ??
          0
      ),
    })
  );

  const normalizedMedicineData = medicineData.map(
    (item) => ({
      medicine:
        item.medicine ||
        item.medicineName ||
        item.name ||
        "Medicine",
      adherence: Number(
        item.adherence ??
          item.adherencePercentage ??
          0
      ),
    })
  );

  return (
    <div className="patient-analytics-page">
      <style>{styles}</style>

      {/* HEADER */}
      <div className="pa-header">
        <div>
          <div className="pa-kicker">
            <TrendingUp size={15} />
            PATIENT ANALYTICS
          </div>

          <h1>Patient Analytics</h1>

          <p>
            Detailed medication adherence and refill insights.
          </p>
        </div>

        <div className="pa-select-wrapper">
          <select
            className="pa-select"
            value={patientId}
            onChange={(e) =>
              setPatientId(e.target.value)
            }
            disabled={
              loadingPatients ||
              patients.length === 0
            }
          >
            {patients.length === 0 ? (
              <option value="">
                No patients available
              </option>
            ) : (
              patients.map((patient) => (
                <option
                  key={
                    patient.id ??
                    patient.patient_id
                  }
                  value={
                    patient.id ??
                    patient.patient_id
                  }
                >
                  {patient.name ||
                    patient.username ||
                    "Patient"}
                </option>
              ))
            )}
          </select>

          <button
            className="pa-refresh"
            onClick={() =>
              patientId &&
              fetchAnalytics(patientId)
            }
            disabled={loadingAnalytics}
          >
            <RefreshCw
              size={14}
              className={
                loadingAnalytics
                  ? "pa-spin"
                  : ""
              }
            />
          </button>
        </div>
      </div>

      {/* ERROR */}
      {error && (
        <div className="pa-error">
          <span>{error}</span>

          <button
            onClick={() =>
              patientId &&
              fetchAnalytics(patientId)
            }
          >
            Try Again
          </button>
        </div>
      )}

      {/* LOADING */}
      {loadingPatients || loadingAnalytics ? (
        <div className="pa-loading">
          <RefreshCw
            size={28}
            className="pa-spin"
          />
          <span>
            Loading patient analytics...
          </span>
        </div>
      ) : (
        <>
          {/* PATIENT BANNER */}
          <div className="pa-patient-banner">
            <div className="pa-patient-avatar">
              {patientName
                .split(" ")
                .filter(Boolean)
                .map((part) => part[0])
                .join("")
                .slice(0, 2)
                .toUpperCase()}
            </div>

            <div>
              <strong>{patientName}</strong>

              <span>
                Medication analytics • Last 7 days
              </span>
            </div>
          </div>

          {/* STATS */}
          <div className="pa-stat-grid">
            <StatCard
              icon={<TrendingUp size={21} />}
              label="Adherence"
              value={`${adherence}%`}
              subtitle="Overall performance"
              tone="green"
            />

            <StatCard
              icon={<CheckCircle2 size={21} />}
              label="Doses Taken"
              value={taken}
              subtitle="Completed doses"
              tone="blue"
            />

            <StatCard
              icon={<XCircle size={21} />}
              label="Doses Missed"
              value={missed}
              subtitle="Needs attention"
              tone="red"
            />

            <StatCard
              icon={<Package size={21} />}
              label="Refill In"
              value={`${refill} days`}
              subtitle="Estimated remaining"
              tone="purple"
            />
          </div>

          {/* CHARTS */}
          <div className="pa-chart-grid">
            {/* WEEKLY */}
            <section className="pa-card">
              <div className="pa-card-header">
                <div className="pa-title">
                  <div className="pa-icon green">
                    <TrendingUp size={18} />
                  </div>

                  <div>
                    <h2>Weekly Adherence</h2>
                    <p>Daily medication adherence</p>
                  </div>
                </div>

                <CalendarDays
                  size={17}
                  color="#91a09a"
                />
              </div>

              {normalizedWeeklyData.length === 0 ? (
                <ChartEmpty />
              ) : (
                <ResponsiveContainer
                  width="100%"
                  height={300}
                >
                  <LineChart
                    data={normalizedWeeklyData}
                    margin={{
                      top: 10,
                      right: 10,
                      left: 0,
                      bottom: 5,
                    }}
                  >
                    <CartesianGrid
                      stroke="#edf2f0"
                      strokeDasharray="3 3"
                    />

                    <XAxis
                      dataKey="day"
                      axisLine={false}
                      tickLine={false}
                      fontSize={11}
                      stroke="#84918d"
                    />

                    <YAxis
                      domain={[0, 100]}
                      axisLine={false}
                      tickLine={false}
                      fontSize={11}
                      stroke="#84918d"
                      tickFormatter={(value) =>
                        `${value}%`
                      }
                    />

                    <Tooltip
                      contentStyle={{
                        border:
                          "1px solid #e3ebe8",
                        borderRadius: "10px",
                        boxShadow:
                          "0 8px 20px rgba(31,54,47,.08)",
                      }}
                      formatter={(value) => [
                        `${value}%`,
                        "Adherence",
                      ]}
                    />

                    <Line
                      type="monotone"
                      dataKey="adherence"
                      stroke="#2f8f7f"
                      strokeWidth={3}
                      dot={{
                        r: 4,
                        fill: "#2f8f7f",
                      }}
                      activeDot={{
                        r: 7,
                      }}
                    />
                  </LineChart>
                </ResponsiveContainer>
              )}
            </section>

            {/* MEDICINE PERFORMANCE */}
            <section className="pa-card">
              <div className="pa-card-header">
                <div className="pa-title">
                  <div className="pa-icon blue">
                    <Pill size={18} />
                  </div>

                  <div>
                    <h2>Medicine Performance</h2>
                    <p>Adherence by medicine</p>
                  </div>
                </div>
              </div>

              {normalizedMedicineData.length ===
              0 ? (
                <ChartEmpty />
              ) : (
                <ResponsiveContainer
                  width="100%"
                  height={300}
                >
                  <BarChart
                    data={
                      normalizedMedicineData
                    }
                    margin={{
                      top: 10,
                      right: 10,
                      left: 0,
                      bottom: 5,
                    }}
                  >
                    <CartesianGrid
                      stroke="#edf2f0"
                      strokeDasharray="3 3"
                    />

                    <XAxis
                      dataKey="medicine"
                      axisLine={false}
                      tickLine={false}
                      fontSize={10}
                      stroke="#84918d"
                    />

                    <YAxis
                      domain={[0, 100]}
                      axisLine={false}
                      tickLine={false}
                      fontSize={11}
                      stroke="#84918d"
                      tickFormatter={(value) =>
                        `${value}%`
                      }
                    />

                    <Tooltip
                      contentStyle={{
                        border:
                          "1px solid #e3ebe8",
                        borderRadius: "10px",
                      }}
                      formatter={(value) => [
                        `${value}%`,
                        "Adherence",
                      ]}
                    />

                    <Bar
                      dataKey="adherence"
                      fill="#2f8f7f"
                      radius={[
                        7,
                        7,
                        0,
                        0,
                      ]}
                    />
                  </BarChart>
                </ResponsiveContainer>
              )}
            </section>
          </div>

          {/* MEDICATION SUMMARY */}
          <section className="pa-card pa-medication-card">
            <div className="pa-card-header">
              <div className="pa-title">
                <div className="pa-icon red">
                  <Pill size={18} />
                </div>

                <div>
                  <h2>Medication Summary</h2>
                  <p>
                    Current medication performance
                    for {patientName}.
                  </p>
                </div>
              </div>
            </div>

            {medicationSummary.length === 0 ? (
              <div className="pa-section-empty">
                No medication information available.
              </div>
            ) : (
              <div className="pa-medication-grid">
                {medicationSummary.map(
                  (medicine, index) => {
                    const medicineName =
                      medicine.name ||
                      medicine.medicine ||
                      medicine.medicineName ||
                      `Medicine ${index + 1}`;

                    const medicineAdherence =
                      Number(
                        medicine.adherence ??
                          medicine.adherencePercentage ??
                          0
                      );

                    const stockDays =
                      medicine.stockDays ??
                      medicine.refillDays ??
                      medicine.daysRemaining ??
                      medicine.stock ??
                      0;

                    const status =
                      medicine.status ||
                      (Number(stockDays) <= 5
                        ? "Low Stock"
                        : "Good");

                    return (
                      <Medication
                        key={
                          medicine.id ??
                          `${medicineName}-${index}`
                        }
                        name={medicineName}
                        adherence={`${medicineAdherence}%`}
                        stock={`${stockDays} days`}
                        status={status}
                      />
                    );
                  }
                )}
              </div>
            )}
          </section>

          {/* REFILL */}
          <section className="pa-card">
            <div className="pa-card-header">
              <div className="pa-title">
                <div className="pa-icon purple">
                  <Package size={18} />
                </div>

                <div>
                  <h2>Refill Status</h2>
                  <p>
                    Current medicine stock information.
                  </p>
                </div>
              </div>
            </div>

            {refillStatus.length === 0 ? (
              <div className="pa-section-empty">
                No refill information available.
              </div>
            ) : (
              refillStatus.map((item, index) => {
                const medicineName =
                  item.name ||
                  item.medicine ||
                  item.medicineName ||
                  `Medicine ${index + 1}`;

                const days =
                  item.daysRemaining ??
                  item.refillDays ??
                  item.stockDays ??
                  item.stock ??
                  0;

                const status =
                  item.status ||
                  (Number(days) <= 5
                    ? "Refill Soon"
                    : "Sufficient");

                const statusClass =
                  String(status)
                    .toLowerCase()
                    .includes("refill") ||
                  String(status)
                    .toLowerCase()
                    .includes("low")
                    ? "low"
                    : "good";

                return (
                  <div
                    className="pa-refill-row"
                    key={
                      item.id ??
                      `${medicineName}-${index}`
                    }
                  >
                    <div className="pa-refill-medicine">
                      <div className="pa-refill-icon">
                        <Pill size={17} />
                      </div>

                      <div>
                        <strong>
                          {medicineName}
                        </strong>

                        <span>
                          Current stock
                        </span>
                      </div>
                    </div>

                    <div className="pa-refill-stock">
                      <strong>
                        {days} days
                      </strong>

                      <span>remaining</span>
                    </div>

                    <span
                      className={`pa-refill-status ${statusClass}`}
                    >
                      {status}
                    </span>
                  </div>
                );
              })
            )}
          </section>
        </>
      )}
    </div>
  );
};

const ChartEmpty = () => {
  return (
    <div className="pa-chart-empty">
      <TrendingUp size={26} />
      <span>No analytics data available.</span>
    </div>
  );
};

const StatCard = ({
  icon,
  label,
  value,
  subtitle,
  tone,
}) => {
  return (
    <div className={`pa-stat-card ${tone}`}>
      <div className="pa-stat-icon">
        {icon}
      </div>

      <div>
        <span>{label}</span>
        <strong>{value}</strong>
        <small>{subtitle}</small>
      </div>
    </div>
  );
};

const Medication = ({
  name,
  adherence,
  stock,
  status,
}) => {
  return (
    <div className="pa-medication">
      <div className="pa-medication-icon">
        <Pill size={17} />
      </div>

      <div className="pa-medication-info">
        <strong>{name}</strong>

        <span>
          Adherence: {adherence}
        </span>

        <div className="pa-mini-progress">
          <div
            style={{
              width: adherence,
            }}
          />
        </div>
      </div>

      <div className="pa-medication-stock">
        <strong>{stock}</strong>
        <span>stock</span>
      </div>

      <span
        className={`pa-medication-status ${
          String(status).toLowerCase().includes("low")
            ? "low"
            : "good"
        }`}
      >
        {status}
      </span>
    </div>
  );
};

const styles = `
.patient-analytics-page {
  min-height: 100%;
  padding: 28px 30px 40px;
  background: #f7faf9;
  color: #21362f;
}

.pa-header {
  display: flex;
  align-items: flex-start;
  justify-content: space-between;
  gap: 20px;
  margin-bottom: 24px;
}

.pa-kicker {
  display: flex;
  align-items: center;
  gap: 7px;
  color: #2f8f7f;
  font-size: 11px;
  font-weight: 800;
  letter-spacing: .12em;
  margin-bottom: 7px;
}

.pa-header h1 {
  margin: 0;
  color: #21362f;
  font-size: 29px;
  font-weight: 750;
}

.pa-header p {
  margin: 8px 0 0;
  color: #788681;
  font-size: 14px;
}

.pa-select-wrapper {
  display: flex;
  align-items: center;
  gap: 7px;
}

.pa-select {
  min-width: 180px;
  padding: 10px 12px;
  border: 1px solid #dfe8e5;
  border-radius: 10px;
  background: white;
  color: #3d514a;
  font-size: 12px;
  outline: none;
}

.pa-select:focus {
  border-color: #a7d2c9;
}

.pa-refresh {
  width: 37px;
  height: 37px;
  display: flex;
  align-items: center;
  justify-content: center;
  border: 1px solid #dfe8e5;
  border-radius: 10px;
  background: white;
  color: #2f8f7f;
  cursor: pointer;
}

.pa-refresh:disabled {
  opacity: .6;
  cursor: not-allowed;
}

.pa-error {
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

.pa-error button {
  border: 0;
  border-radius: 7px;
  padding: 7px 10px;
  background: #b14d45;
  color: white;
  cursor: pointer;
  font-size: 10px;
  font-weight: 700;
}

.pa-loading {
  min-height: 350px;
  display: flex;
  align-items: center;
  justify-content: center;
  flex-direction: column;
  gap: 10px;
  color: #8e9b96;
  font-size: 12px;
}

.pa-spin {
  animation: pa-spin 1s linear infinite;
}

@keyframes pa-spin {
  from {
    transform: rotate(0deg);
  }

  to {
    transform: rotate(360deg);
  }
}

.pa-patient-banner {
  display: flex;
  align-items: center;
  gap: 12px;
  padding: 15px 17px;
  margin-bottom: 18px;
  background: white;
  border: 1px solid #e4ece9;
  border-radius: 15px;
  box-shadow: 0 5px 18px rgba(31,54,47,.04);
}

.pa-patient-avatar {
  width: 43px;
  height: 43px;
  display: flex;
  align-items: center;
  justify-content: center;
  border-radius: 12px;
  background: #e8f5f1;
  color: #2f8f7f;
  font-size: 11px;
  font-weight: 800;
}

.pa-patient-banner strong {
  display: block;
  color: #2c433a;
  font-size: 13px;
}

.pa-patient-banner span {
  display: block;
  margin-top: 3px;
  color: #87938f;
  font-size: 10px;
}

.pa-stat-grid {
  display: grid;
  grid-template-columns: repeat(4, minmax(0,1fr));
  gap: 16px;
  margin-bottom: 18px;
}

.pa-stat-card {
  display: flex;
  align-items: center;
  gap: 14px;
  min-height: 112px;
  padding: 19px;
  background: white;
  border: 1px solid #e4ece9;
  border-radius: 17px;
  box-shadow: 0 5px 18px rgba(31,54,47,.045);
}

.pa-stat-icon {
  width: 45px;
  height: 45px;
  display: flex;
  align-items: center;
  justify-content: center;
  border-radius: 13px;
  flex-shrink: 0;
}

.pa-stat-card.green .pa-stat-icon {
  background: #e8f5f1;
  color: #2f8f7f;
}

.pa-stat-card.blue .pa-stat-icon {
  background: #eaf4fb;
  color: #4a90c4;
}

.pa-stat-card.red .pa-stat-icon {
  background: #fcebea;
  color: #d1584f;
}

.pa-stat-card.purple .pa-stat-icon {
  background: #f0edfa;
  color: #6b5ca5;
}

.pa-stat-card span {
  display: block;
  color: #75837f;
  font-size: 12px;
  font-weight: 600;
}

.pa-stat-card strong {
  display: block;
  margin-top: 3px;
  color: #21372f;
  font-size: 24px;
}

.pa-stat-card small {
  display: block;
  margin-top: 3px;
  color: #9aa5a1;
  font-size: 10px;
}

.pa-chart-grid {
  display: grid;
  grid-template-columns: 1.15fr 1fr;
  gap: 18px;
  margin-bottom: 18px;
}

.pa-card {
  background: white;
  border: 1px solid #e4ece9;
  border-radius: 17px;
  padding: 20px 21px;
  box-shadow: 0 5px 18px rgba(31,54,47,.045);
}

.pa-card-header {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 15px;
  margin-bottom: 10px;
}

.pa-title {
  display: flex;
  align-items: center;
  gap: 11px;
}

.pa-icon {
  width: 38px;
  height: 38px;
  border-radius: 11px;
  display: flex;
  align-items: center;
  justify-content: center;
  flex-shrink: 0;
}

.pa-icon.green {
  background: #e8f5f1;
  color: #2f8f7f;
}

.pa-icon.blue {
  background: #eaf4fb;
  color: #4a90c4;
}

.pa-icon.red {
  background: #fcebea;
  color: #d1584f;
}

.pa-icon.purple {
  background: #f0edfa;
  color: #6b5ca5;
}

.pa-title h2 {
  margin: 0;
  color: #263b34;
  font-size: 15px;
  font-weight: 750;
}

.pa-title p {
  margin: 4px 0 0;
  color: #87938f;
  font-size: 11px;
}

.pa-chart-empty {
  min-height: 250px;
  display: flex;
  align-items: center;
  justify-content: center;
  flex-direction: column;
  gap: 8px;
  color: #9ba6a2;
  font-size: 11px;
}

.pa-medication-card {
  margin-bottom: 18px;
}

.pa-medication-grid {
  display: grid;
  grid-template-columns: repeat(2,1fr);
  gap: 10px;
  margin-top: 16px;
}

.pa-medication {
  display: grid;
  grid-template-columns: auto 1fr auto auto;
  align-items: center;
  gap: 10px;
  padding: 13px;
  border: 1px solid #e8efed;
  border-radius: 12px;
  background: #fbfcfc;
}

.pa-medication-icon {
  width: 34px;
  height: 34px;
  display: flex;
  align-items: center;
  justify-content: center;
  border-radius: 9px;
  color: #2f8f7f;
  background: #e8f5f1;
}

.pa-medication-info {
  min-width: 110px;
}

.pa-medication-info strong {
  display: block;
  color: #334940;
  font-size: 11px;
}

.pa-medication-info span {
  display: block;
  color: #899591;
  font-size: 9px;
  margin-top: 3px;
}

.pa-mini-progress {
  height: 4px;
  margin-top: 5px;
  background: #e8efed;
  border-radius: 10px;
  overflow: hidden;
}

.pa-mini-progress div {
  height: 100%;
  background: #2f8f7f;
  border-radius: inherit;
}

.pa-medication-stock {
  text-align: right;
}

.pa-medication-stock strong {
  display: block;
  color: #344940;
  font-size: 11px;
}

.pa-medication-stock span {
  color: #929d99;
  font-size: 8px;
}

.pa-medication-status,
.pa-refill-status {
  padding: 5px 8px;
  border-radius: 8px;
  font-size: 9px;
  font-weight: 750;
  white-space: nowrap;
}

.pa-medication-status.good,
.pa-refill-status.good {
  background: #e8f5f1;
  color: #2f8f7f;
}

.pa-medication-status.low,
.pa-refill-status.low {
  background: #fff3d7;
  color: #aa7923;
}

.pa-refill-row {
  display: grid;
  grid-template-columns: 1fr auto auto;
  align-items: center;
  gap: 18px;
  padding: 14px 0;
  border-bottom: 1px solid #edf2f0;
}

.pa-refill-row:last-child {
  border-bottom: 0;
}

.pa-refill-medicine {
  display: flex;
  align-items: center;
  gap: 10px;
}

.pa-refill-icon {
  width: 35px;
  height: 35px;
  display: flex;
  align-items: center;
  justify-content: center;
  border-radius: 9px;
  background: #e8f5f1;
  color: #2f8f7f;
}

.pa-refill-medicine strong {
  display: block;
  color: #344940;
  font-size: 11px;
}

.pa-refill-medicine span {
  display: block;
  margin-top: 2px;
  color: #929d99;
  font-size: 9px;
}

.pa-refill-stock {
  text-align: right;
}

.pa-refill-stock strong {
  display: block;
  color: #344940;
  font-size: 12px;
}

.pa-refill-stock span {
  color: #929d99;
  font-size: 9px;
}

.pa-section-empty {
  padding: 30px;
  text-align: center;
  color: #9ba6a2;
  font-size: 11px;
}

@media (max-width: 1000px) {
  .pa-stat-grid {
    grid-template-columns: repeat(2,1fr);
  }

  .pa-chart-grid {
    grid-template-columns: 1fr;
  }
}

@media (max-width: 700px) {
  .patient-analytics-page {
    padding: 22px 16px 30px;
  }

  .pa-header {
    flex-direction: column;
  }

  .pa-select-wrapper {
    width: 100%;
  }

  .pa-select {
    width: 100%;
  }

  .pa-stat-grid {
    grid-template-columns: 1fr;
  }

  .pa-medication-grid {
    grid-template-columns: 1fr;
  }

  .pa-medication {
    grid-template-columns: auto 1fr;
  }

  .pa-medication-stock,
  .pa-medication-status {
    grid-column: 2;
    justify-self: start;
    text-align: left;
  }

  .pa-refill-row {
    grid-template-columns: 1fr;
    gap: 9px;
  }

  .pa-refill-stock {
    text-align: left;
  }

  .pa-error {
    align-items: flex-start;
    flex-direction: column;
  }
}
`;

export default PatientAnalytics;