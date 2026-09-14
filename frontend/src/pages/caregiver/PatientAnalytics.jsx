import React, { useEffect, useMemo, useState } from "react";

import {
  TrendingUp,
  CalendarDays,
  CheckCircle2,
  XCircle,
  Package,
  Pill,
  RefreshCw,
  Activity,
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
  PieChart,
  Pie,
  Cell,
  Legend,
} from "recharts";

import { useSearchParams } from "react-router-dom";
import caregiverService from "../../services/caregiverService";

const DOSE_COLORS = [
  "#10b981",
  "#ef4444",
  "#f59e0b",
];

const PatientAnalytics = () => {
  const [searchParams] = useSearchParams();

  const [patients, setPatients] = useState([]);
  const [patientId, setPatientId] = useState(
    searchParams.get("patient_id") || ""
  );

  const [analytics, setAnalytics] = useState(null);

  const [loadingPatients, setLoadingPatients] =
    useState(true);

  const [loadingAnalytics, setLoadingAnalytics] =
    useState(false);

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

      const urlPatientId =
        searchParams.get("patient_id");

      const requestedPatient = urlPatientId
        ? data.find(
            (patient) =>
              String(
                patient.id ??
                  patient.patient_id
              ) === String(urlPatientId)
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
      console.error(
        "Failed to load patients:",
        err
      );

      setError(
        "Unable to load assigned patients."
      );

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
      console.error(
        "Failed to load patient analytics:",
        err
      );

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
    analytics?.summary ||
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

  const pending = Number(
    statistics.pending ??
      statistics.dosesPending ??
      analytics?.pending ??
      analytics?.pendingDoses ??
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

  const normalizedWeeklyData =
    weeklyData.map(
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

  const normalizedMedicineData =
    medicineData.map(
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

  const doseOutcomeData = [
    {
      name: "Taken",
      value: taken,
    },
    {
      name: "Missed",
      value: missed,
    },
    {
      name: "Pending",
      value: pending,
    },
  ].filter(
    (item) => item.value > 0
  );

  const normalizedStockData =
    medicationSummary
      .map((medicine, index) => {
        const medicineName =
          medicine.name ||
          medicine.medicine ||
          medicine.medicineName ||
          `Medicine ${index + 1}`;

        const stockDays = Number(
          medicine.stockDays ??
            medicine.refillDays ??
            medicine.daysRemaining ??
            medicine.stock ??
            0
        );

        return {
          medicine: medicineName,
          days: stockDays,
        };
      })
      .filter(
        (item) => item.medicine
      );

  return (
    <div className="patient-analytics-page">
      <style>{styles}</style>

      {/* HEADER */}

      <header className="pa-header">
        <div>
          <div className="pa-kicker">
            <TrendingUp size={15} />
            PATIENT ANALYTICS
          </div>

          <h1>Patient Analytics</h1>

          <p>
            Detailed medication adherence
            and refill insights.
          </p>
        </div>

        <div className="pa-select-wrapper">
          <select
            className="pa-select"
            value={patientId}
            onChange={(e) =>
              setPatientId(
                e.target.value
              )
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
              patients.map(
                (patient) => (
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
                )
              )
            )}
          </select>

          <button
            className="pa-refresh"
            onClick={() =>
              patientId &&
              fetchAnalytics(
                patientId
              )
            }
            disabled={
              loadingAnalytics
            }
            type="button"
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
      </header>

      {/* ERROR */}

      {error && (
        <div className="pa-error">
          <XCircle size={18} />

          <div className="pa-error-content">
            <strong>
              Unable to load analytics
            </strong>

            <span>{error}</span>
          </div>

          <button
            onClick={() =>
              patientId &&
              fetchAnalytics(
                patientId
              )
            }
            type="button"
          >
            Try Again
          </button>
        </div>
      )}

      {/* LOADING */}

      {loadingPatients ||
      loadingAnalytics ? (
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
                .map(
                  (part) =>
                    part[0]
                )
                .join("")
                .slice(0, 2)
                .toUpperCase()}
            </div>

            <div>
              <strong>
                {patientName}
              </strong>

              <span>
                Medication analytics •
                Last 7 days
              </span>
            </div>
          </div>

          {/* STATS */}

          <section className="pa-stat-grid">
            <StatCard
              icon={
                <TrendingUp size={21} />
              }
              label="Adherence"
              value={`${adherence}%`}
              subtitle="Overall performance"
              tone="green"
            />

            <StatCard
              icon={
                <CheckCircle2 size={21} />
              }
              label="Doses Taken"
              value={taken}
              subtitle="Completed doses"
              tone="blue"
            />

            <StatCard
              icon={
                <XCircle size={21} />
              }
              label="Doses Missed"
              value={missed}
              subtitle="Needs attention"
              tone="red"
            />

            <StatCard
              icon={
                <Package size={21} />
              }
              label="Refill In"
              value={`${refill} days`}
              subtitle="Estimated remaining"
              tone="purple"
            />
          </section>

          {/* SECONDARY METRICS */}

          <section className="pa-mini-grid">
            <MiniMetric
              icon={
                <Activity size={18} />
              }
              label="Overall Adherence"
              value={`${adherence}%`}
            />

            <MiniMetric
              icon={
                <CheckCircle2 size={18} />
              }
              label="Taken Doses"
              value={taken}
            />

            <MiniMetric
              icon={
                <XCircle size={18} />
              }
              label="Missed Doses"
              value={missed}
            />

            <MiniMetric
              icon={
                <Package size={18} />
              }
              label="Refill Days"
              value={refill}
            />
          </section>

          {/* WEEKLY + MEDICINE */}

          <div className="pa-chart-grid">

            {/* WEEKLY ADHERENCE */}

            <AnalyticsPanel
              icon={
                <TrendingUp size={18} />
              }
              iconTone="blue"
              title="Weekly Adherence"
              subtitle="Daily medication adherence"
              rightIcon={
                <CalendarDays size={17} />
              }
            >
              <ChartContainer>
                {normalizedWeeklyData.length ===
                0 ? (
                  <ChartEmpty />
                ) : (
                  <ResponsiveContainer
                    width="100%"
                    height="100%"
                  >
                    <LineChart
                      data={
                        normalizedWeeklyData
                      }
                      margin={{
                        top: 10,
                        right: 10,
                        left: 0,
                        bottom: 5,
                      }}
                    >
                      <CartesianGrid
                        stroke="#e2e8f0"
                        strokeDasharray="3 3"
                      />

                      <XAxis
                        dataKey="day"
                        axisLine={false}
                        tickLine={false}
                        fontSize={11}
                        stroke="#697386"
                      />

                      <YAxis
                        domain={[
                          0,
                          100,
                        ]}
                        axisLine={false}
                        tickLine={false}
                        fontSize={11}
                        stroke="#697386"
                        tickFormatter={(
                          value
                        ) =>
                          `${value}%`
                        }
                      />

                      <Tooltip
                        contentStyle={{
                          border:
                            "1px solid #e7ebf0",
                          borderRadius:
                            "10px",
                          boxShadow:
                            "0 8px 20px rgba(15,23,42,.08)",
                        }}
                        formatter={(
                          value
                        ) => [
                          `${value}%`,
                          "Adherence",
                        ]}
                      />

                      <Line
                        type="monotone"
                        dataKey="adherence"
                        stroke="#0ea5e9"
                        strokeWidth={3}
                        dot={{
                          r: 4,
                          fill: "#0ea5e9",
                        }}
                        activeDot={{
                          r: 7,
                        }}
                      />
                    </LineChart>
                  </ResponsiveContainer>
                )}
              </ChartContainer>
            </AnalyticsPanel>

            {/* MEDICINE PERFORMANCE */}

            <AnalyticsPanel
              icon={
                <Pill size={18} />
              }
              iconTone="purple"
              title="Medicine Performance"
              subtitle="Adherence by medicine"
            >
              <ChartContainer>
                {normalizedMedicineData.length ===
                0 ? (
                  <ChartEmpty />
                ) : (
                  <ResponsiveContainer
                    width="100%"
                    height="100%"
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
                        stroke="#e2e8f0"
                        strokeDasharray="3 3"
                      />

                      <XAxis
                        dataKey="medicine"
                        axisLine={false}
                        tickLine={false}
                        fontSize={10}
                        stroke="#697386"
                      />

                      <YAxis
                        domain={[
                          0,
                          100,
                        ]}
                        axisLine={false}
                        tickLine={false}
                        fontSize={11}
                        stroke="#697386"
                        tickFormatter={(
                          value
                        ) =>
                          `${value}%`
                        }
                      />

                      <Tooltip
                        contentStyle={{
                          border:
                            "1px solid #e7ebf0",
                          borderRadius:
                            "10px",
                          boxShadow:
                            "0 8px 20px rgba(15,23,42,.08)",
                        }}
                        formatter={(
                          value
                        ) => [
                          `${value}%`,
                          "Adherence",
                        ]}
                      />

                      <Bar
                        dataKey="adherence"
                        name="Adherence"
                        fill="#6366f1"
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
              </ChartContainer>
            </AnalyticsPanel>
          </div>

          {/* DOSE OUTCOME + STOCK */}

          <div className="pa-chart-grid">

            {/* DOSE OUTCOME */}

            <AnalyticsPanel
              icon={
                <CheckCircle2 size={18} />
              }
              iconTone="green"
              title="Dose Outcome"
              subtitle="Taken, missed and pending doses"
            >
              <ChartContainer>
                {doseOutcomeData.length ===
                0 ? (
                  <ChartEmpty />
                ) : (
                  <ResponsiveContainer
                    width="100%"
                    height="100%"
                  >
                    <PieChart>
                      <Pie
                        data={
                          doseOutcomeData
                        }
                        dataKey="value"
                        nameKey="name"
                        cx="50%"
                        cy="45%"
                        outerRadius={90}
                        innerRadius={48}
                        paddingAngle={3}
                        label
                      >
                        {doseOutcomeData.map(
                          (
                            entry,
                            index
                          ) => (
                            <Cell
                              key={`${entry.name}-${index}`}
                              fill={
                                DOSE_COLORS[
                                  index %
                                    DOSE_COLORS.length
                                ]
                              }
                            />
                          )
                        )}
                      </Pie>

                      <Tooltip />

                      <Legend />
                    </PieChart>
                  </ResponsiveContainer>
                )}
              </ChartContainer>
            </AnalyticsPanel>

            {/* MEDICATION STOCK */}

            <AnalyticsPanel
              icon={
                <Package size={18} />
              }
              iconTone="purple"
              title="Medication Stock Outlook"
              subtitle="Estimated medicine days remaining"
            >
              <ChartContainer>
                {normalizedStockData.length ===
                0 ? (
                  <ChartEmpty />
                ) : (
                  <ResponsiveContainer
                    width="100%"
                    height="100%"
                  >
                    <BarChart
                      data={
                        normalizedStockData
                      }
                      margin={{
                        top: 10,
                        right: 10,
                        left: 5,
                        bottom: 5,
                      }}
                    >
                      <CartesianGrid
                        stroke="#e2e8f0"
                        strokeDasharray="3 3"
                      />

                      <XAxis
                        dataKey="medicine"
                        axisLine={false}
                        tickLine={false}
                        fontSize={10}
                        stroke="#697386"
                      />

                      <YAxis
                        axisLine={false}
                        tickLine={false}
                        fontSize={11}
                        stroke="#697386"
                        tickFormatter={(
                          value
                        ) =>
                          `${value}d`
                        }
                      />

                      <Tooltip
                        contentStyle={{
                          border:
                            "1px solid #e7ebf0",
                          borderRadius:
                            "10px",
                          boxShadow:
                            "0 8px 20px rgba(15,23,42,.08)",
                        }}
                        formatter={(
                          value
                        ) => [
                          `${value} days`,
                          "Remaining",
                        ]}
                      />

                      <Bar
                        dataKey="days"
                        name="Remaining days"
                        fill="#8b5cf6"
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
              </ChartContainer>
            </AnalyticsPanel>
          </div>

          {/* MEDICATION SUMMARY */}

          <section className="pa-card pa-medication-card">
            <div className="pa-card-header">
              <div className="pa-title">
                <div className="pa-icon blue">
                  <Pill size={18} />
                </div>

                <div>
                  <h2>
                    Medication Summary
                  </h2>

                  <p>
                    Current medication
                    performance for{" "}
                    {patientName}.
                  </p>
                </div>
              </div>

              <Activity
                size={17}
                className="pa-header-icon"
              />
            </div>

            {medicationSummary.length ===
            0 ? (
              <div className="pa-section-empty">
                No medication information
                available.
              </div>
            ) : (
              <div className="pa-medication-grid">
                {medicationSummary.map(
                  (
                    medicine,
                    index
                  ) => {
                    const medicineName =
                      medicine.name ||
                      medicine.medicine ||
                      medicine.medicineName ||
                      `Medicine ${
                        index + 1
                      }`;

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
                      (Number(
                        stockDays
                      ) <= 5
                        ? "Low Stock"
                        : "Good");

                    return (
                      <Medication
                        key={
                          medicine.id ??
                          `${medicineName}-${index}`
                        }
                        name={
                          medicineName
                        }
                        adherence={`${medicineAdherence}%`}
                        stock={`${stockDays} days`}
                        status={
                          status
                        }
                      />
                    );
                  }
                )}
              </div>
            )}
          </section>

          {/* REFILL STATUS */}

          <section className="pa-card">
            <div className="pa-card-header">
              <div className="pa-title">
                <div className="pa-icon purple">
                  <Package size={18} />
                </div>

                <div>
                  <h2>
                    Refill Status
                  </h2>

                  <p>
                    Current medicine stock
                    information.
                  </p>
                </div>
              </div>

              <Activity
                size={17}
                className="pa-header-icon"
              />
            </div>

            {refillStatus.length ===
            0 ? (
              <div className="pa-section-empty">
                No refill information
                available.
              </div>
            ) : (
              refillStatus.map(
                (item, index) => {
                  const medicineName =
                    item.name ||
                    item.medicine ||
                    item.medicineName ||
                    `Medicine ${
                      index + 1
                    }`;

                  const days =
                    item.daysRemaining ??
                    item.refillDays ??
                    item.stockDays ??
                    item.stock ??
                    0;

                  const status =
                    item.status ||
                    (Number(days) <=
                    5
                      ? "Refill Soon"
                      : "Sufficient");

                  const statusClass =
                    String(status)
                      .toLowerCase()
                      .includes(
                        "refill"
                      ) ||
                    String(status)
                      .toLowerCase()
                      .includes(
                        "low"
                      )
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
                            {
                              medicineName
                            }
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

                        <span>
                          remaining
                        </span>
                      </div>

                      <span
                        className={`pa-refill-status ${statusClass}`}
                      >
                        {status}
                      </span>
                    </div>
                  );
                }
              )
            )}
          </section>
        </>
      )}
    </div>
  );
};

/* =====================================================
   MINI METRIC
===================================================== */

const MiniMetric = ({
  icon,
  label,
  value,
}) => {
  return (
    <div className="pa-mini-card">
      <div className="pa-mini-icon">
        {icon}
      </div>

      <div>
        <p>{label}</p>
        <strong>{value}</strong>
      </div>
    </div>
  );
};

/* =====================================================
   ANALYTICS PANEL
===================================================== */

const AnalyticsPanel = ({
  icon,
  iconTone,
  title,
  subtitle,
  rightIcon,
  children,
}) => {
  return (
    <section className="pa-card">
      <div className="pa-card-header">
        <div className="pa-title">
          <div
            className={`pa-icon ${iconTone}`}
          >
            {icon}
          </div>

          <div>
            <h2>{title}</h2>

            <p>{subtitle}</p>
          </div>
        </div>

        {rightIcon || (
          <Activity
            size={17}
            className="pa-header-icon"
          />
        )}
      </div>

      {children}
    </section>
  );
};

/* =====================================================
   CHART CONTAINER
===================================================== */

const ChartContainer = ({
  children,
}) => {
  return (
    <div className="pa-chart">
      {children}
    </div>
  );
};

/* =====================================================
   EMPTY CHART
===================================================== */

const ChartEmpty = () => {
  return (
    <div className="pa-chart-empty">
      <TrendingUp size={25} />

      <span>
        No analytics data available.
      </span>
    </div>
  );
};

/* =====================================================
   STAT CARD
===================================================== */

const StatCard = ({
  icon,
  label,
  value,
  subtitle,
  tone,
}) => {
  return (
    <div
      className={`pa-stat-card ${tone}`}
    >
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

/* =====================================================
   MEDICATION
===================================================== */

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
          String(status)
            .toLowerCase()
            .includes("low")
            ? "low"
            : "good"
        }`}
      >
        {status}
      </span>
    </div>
  );
};

/* =====================================================
   STYLES
===================================================== */

const styles = `
.patient-analytics-page {
  min-height: 100%;
  padding: 28px 30px 40px;
  background: #f7f9fc;
  color: #172033;
}

/* HEADER */

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
  margin-bottom: 7px;
  color: #0f9488;
  font-size: 11px;
  font-weight: 800;
  letter-spacing: .12em;
}

.pa-header h1 {
  margin: 0;
  color: #172033;
  font-size: 30px;
  font-weight: 750;
}

.pa-header p {
  margin: 7px 0 0;
  color: #697386;
  font-size: 14px;
}

.pa-select-wrapper {
  display: flex;
  align-items: center;
  gap: 7px;
}

.pa-select {
  min-width: 185px;
  min-height: 37px;
  padding: 0 12px;
  border: 1px solid #dce3eb;
  border-radius: 10px;
  background: #fff;
  color: #344054;
  font-size: 11px;
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
  border: 1px solid #dce3eb;
  border-radius: 10px;
  background: #fff;
  color: #0f9488;
  cursor: pointer;
}

.pa-refresh:hover {
  background: #f9fafb;
}

.pa-refresh:disabled {
  opacity: .6;
  cursor: not-allowed;
}

/* PATIENT BANNER */

.pa-patient-banner {
  display: flex;
  align-items: center;
  gap: 12px;
  margin-bottom: 16px;
  padding: 15px 17px;
  border: 1px solid #e7ebf0;
  border-radius: 14px;
  background: #fff;
  box-shadow: 0 2px 8px rgba(15,23,42,.03);
}

.pa-patient-avatar {
  width: 43px;
  height: 43px;
  display: flex;
  align-items: center;
  justify-content: center;
  flex-shrink: 0;
  border-radius: 12px;
  background: #e8f8f6;
  color: #0f9488;
  font-size: 11px;
  font-weight: 800;
}

.pa-patient-banner strong {
  display: block;
  color: #172033;
  font-size: 13px;
}

.pa-patient-banner span {
  display: block;
  margin-top: 3px;
  color: #7b8495;
  font-size: 10px;
}

/* MAIN STATS */

.pa-stat-grid {
  display: grid;
  grid-template-columns: repeat(
    4,
    minmax(0, 1fr)
  );
  gap: 16px;
  margin-bottom: 16px;
}

.pa-stat-card {
  display: flex;
  align-items: center;
  gap: 14px;
  min-height: 112px;
  padding: 18px;
  border: 1px solid #e7ebf0;
  border-radius: 14px;
  background: #fff;
  box-shadow: 0 2px 8px rgba(15,23,42,.03);
}

.pa-stat-icon {
  width: 43px;
  height: 43px;
  display: flex;
  align-items: center;
  justify-content: center;
  flex-shrink: 0;
  border-radius: 11px;
}

.pa-stat-card.green .pa-stat-icon {
  background: #ecfdf3;
  color: #039855;
}

.pa-stat-card.blue .pa-stat-icon {
  background: #eff6ff;
  color: #2563eb;
}

.pa-stat-card.red .pa-stat-icon {
  background: #fef2f2;
  color: #ef4444;
}

.pa-stat-card.purple .pa-stat-icon {
  background: #f5f3ff;
  color: #7c3aed;
}

.pa-stat-card span {
  display: block;
  color: #697386;
  font-size: 12px;
  font-weight: 600;
}

.pa-stat-card strong {
  display: block;
  margin-top: 4px;
  color: #172033;
  font-size: 24px;
  line-height: 1;
}

.pa-stat-card small {
  display: block;
  margin-top: 5px;
  color: #7b8495;
  font-size: 10px;
}

/* SECONDARY METRICS */

.pa-mini-grid {
  display: grid;
  grid-template-columns: repeat(
    4,
    minmax(0, 1fr)
  );
  gap: 12px;
  margin-bottom: 18px;
}

.pa-mini-card {
  display: flex;
  align-items: center;
  gap: 11px;
  padding: 13px;
  border: 1px solid #e7ebf0;
  border-radius: 11px;
  background: #fff;
  box-shadow: 0 2px 8px rgba(15,23,42,.03);
}

.pa-mini-icon {
  width: 38px;
  height: 38px;
  min-width: 38px;
  display: flex;
  align-items: center;
  justify-content: center;
  border-radius: 10px;
  background: #e8f8f6;
  color: #0f9488;
}

.pa-mini-card p {
  margin: 0;
  color: #7b8495;
  font-size: 10px;
}

.pa-mini-card strong {
  display: block;
  margin-top: 3px;
  color: #172033;
  font-size: 16px;
}

/* CHART GRID */

.pa-chart-grid {
  display: grid;
  grid-template-columns: repeat(
    2,
    minmax(0, 1fr)
  );
  gap: 18px;
  margin-bottom: 18px;
}

/* CARDS */

.pa-card {
  min-width: 0;
  padding: 20px;
  border: 1px solid #e7ebf0;
  border-radius: 14px;
  background: #fff;
  box-shadow: 0 2px 8px rgba(15,23,42,.03);
}

.pa-medication-card {
  margin-bottom: 18px;
}

.pa-card-header {
  display: flex;
  align-items: flex-start;
  justify-content: space-between;
  gap: 15px;
  margin-bottom: 15px;
}

.pa-title {
  display: flex;
  align-items: center;
  gap: 11px;
}

.pa-icon {
  width: 38px;
  height: 38px;
  display: flex;
  align-items: center;
  justify-content: center;
  flex-shrink: 0;
  border-radius: 11px;
}

.pa-icon.green {
  background: #ecfdf3;
  color: #039855;
}

.pa-icon.blue {
  background: #eff6ff;
  color: #2563eb;
}

.pa-icon.red {
  background: #fef2f2;
  color: #ef4444;
}

.pa-icon.purple {
  background: #f5f3ff;
  color: #7c3aed;
}

.pa-title h2 {
  margin: 0;
  color: #172033;
  font-size: 15px;
  font-weight: 750;
}

.pa-title p {
  margin: 4px 0 0;
  color: #7b8495;
  font-size: 11px;
}

.pa-header-icon {
  color: #98a2b3;
}

/* CHART */

.pa-chart {
  width: 100%;
  height: 285px;
}

.pa-chart-empty {
  width: 100%;
  height: 100%;
  display: flex;
  align-items: center;
  justify-content: center;
  flex-direction: column;
  gap: 8px;
  color: #98a2b3;
  font-size: 11px;
}

/* MEDICATION */

.pa-medication-grid {
  display: grid;
  grid-template-columns: repeat(
    2,
    minmax(0, 1fr)
  );
  gap: 10px;
  margin-top: 16px;
}

.pa-medication {
  display: grid;
  grid-template-columns:
    auto 1fr auto auto;
  align-items: center;
  gap: 10px;
  padding: 13px;
  border: 1px solid #e7ebf0;
  border-radius: 11px;
  background: #f9fafb;
}

.pa-medication-icon {
  width: 34px;
  height: 34px;
  display: flex;
  align-items: center;
  justify-content: center;
  border-radius: 9px;
  background: #eff6ff;
  color: #2563eb;
}

.pa-medication-info {
  min-width: 110px;
}

.pa-medication-info strong {
  display: block;
  color: #344054;
  font-size: 11px;
}

.pa-medication-info span {
  display: block;
  margin-top: 3px;
  color: #7b8495;
  font-size: 9px;
}

.pa-mini-progress {
  height: 4px;
  margin-top: 5px;
  overflow: hidden;
  border-radius: 10px;
  background: #e7ebf0;
}

.pa-mini-progress div {
  height: 100%;
  border-radius: inherit;
  background: #10b981;
}

.pa-medication-stock {
  text-align: right;
}

.pa-medication-stock strong {
  display: block;
  color: #344054;
  font-size: 11px;
}

.pa-medication-stock span {
  color: #98a2b3;
  font-size: 8px;
}

/* STATUS */

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
  background: #ecfdf3;
  color: #039855;
}

.pa-medication-status.low,
.pa-refill-status.low {
  background: #fff7ed;
  color: #f59e0b;
}

/* REFILL */

.pa-refill-row {
  display: grid;
  grid-template-columns:
    1fr auto auto;
  align-items: center;
  gap: 18px;
  padding: 14px 0;
  border-bottom: 1px solid #e7ebf0;
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
  background: #e8f8f6;
  color: #0f9488;
}

.pa-refill-medicine strong {
  display: block;
  color: #344054;
  font-size: 11px;
}

.pa-refill-medicine span {
  display: block;
  margin-top: 2px;
  color: #98a2b3;
  font-size: 9px;
}

.pa-refill-stock {
  text-align: right;
}

.pa-refill-stock strong {
  display: block;
  color: #344054;
  font-size: 12px;
}

.pa-refill-stock span {
  color: #98a2b3;
  font-size: 9px;
}

/* EMPTY SECTION */

.pa-section-empty {
  padding: 30px;
  text-align: center;
  color: #98a2b3;
  font-size: 11px;
}

/* ERROR */

.pa-error {
  display: flex;
  align-items: center;
  gap: 10px;
  margin-bottom: 18px;
  padding: 13px 14px;
  border: 1px solid #fecaca;
  border-radius: 11px;
  background: #fff5f5;
  color: #b42318;
}

.pa-error-content {
  flex: 1;
  min-width: 0;
}

.pa-error strong {
  display: block;
  font-size: 12px;
}

.pa-error span {
  display: block;
  margin-top: 3px;
  font-size: 11px;
}

.pa-error button {
  border: 0;
  border-radius: 7px;
  padding: 7px 10px;
  background: #b42318;
  color: #fff;
  cursor: pointer;
  font-size: 10px;
  font-weight: 700;
}

/* LOADING */

.pa-loading {
  min-height: 55vh;
  display: flex;
  align-items: center;
  justify-content: center;
  flex-direction: column;
  gap: 10px;
  color: #7b8495;
  font-size: 12px;
}

/* SPINNER */

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

/* RESPONSIVE */

@media (max-width: 1100px) {
  .pa-stat-grid,
  .pa-mini-grid {
    grid-template-columns:
      repeat(
        2,
        minmax(0, 1fr)
      );
  }
}

@media (max-width: 900px) {
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
    flex: 1;
  }

  .pa-stat-grid,
  .pa-mini-grid {
    grid-template-columns: 1fr;
  }

  .pa-medication-grid {
    grid-template-columns: 1fr;
  }

  .pa-medication {
    grid-template-columns:
      auto 1fr;
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
  }
}

@media (max-width: 500px) {
  .pa-header h1 {
    font-size: 25px;
  }

  .pa-card {
    padding: 17px;
  }

  .pa-chart {
    height: 260px;
  }
}
`;

export default PatientAnalytics;