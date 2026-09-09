import React, { useEffect, useState } from "react";
import {
  LineChart,
  Line,
  BarChart,
  Bar,
  PieChart,
  Pie,
  Cell,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  ResponsiveContainer,
} from "recharts";

import analyticsService from "../../services/analyticsService";

const PIE_COLORS = ["#2f8f7f", "#d1584f"];

const Analytics = () => {
  const [adherenceTrend, setAdherenceTrend] = useState([]);
  const [refillStats, setRefillStats] = useState([]);
  const [missedByMedicine, setMissedByMedicine] = useState([]);
  const [adherenceByMedicine, setAdherenceByMedicine] = useState([]);
  const [consistency, setConsistency] = useState([]);
  const [refillForecast, setRefillForecast] = useState([]);

  const [weeklyReport, setWeeklyReport] = useState(null);
  const [monthlyReport, setMonthlyReport] = useState(null);

  const [reportView, setReportView] = useState("weekly");

  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  useEffect(() => {
    fetchAnalytics();
  }, []);

  const fetchAnalytics = async () => {
    setLoading(true);
    setError(null);

    try {
      const [
        trendRes,
        refillRes,
        missedRes,
        adherenceMedicineRes,
        consistencyRes,
        weeklyRes,
        monthlyRes,
        forecastRes,
      ] = await Promise.all([
        analyticsService.getAdherenceTrend(),
        analyticsService.getRefillStats(),
        analyticsService.getMissedByMedicine(),
        analyticsService.getAdherenceByMedicine(),
        analyticsService.getConsistency(),
        analyticsService.getWeeklyReport(),
        analyticsService.getMonthlyReport(),
        analyticsService.getRefillForecast(),
      ]);

      setAdherenceTrend(
        Array.isArray(trendRes.data) ? trendRes.data : []
      );

      setRefillStats(
        Array.isArray(refillRes.data) ? refillRes.data : []
      );

      setMissedByMedicine(
        Array.isArray(missedRes.data) ? missedRes.data : []
      );

      setAdherenceByMedicine(
        Array.isArray(adherenceMedicineRes.data)
          ? adherenceMedicineRes.data
          : []
      );

      /*
       * Backend response:
       *
       * {
       *   last30Days: [
       *     {
       *       date: "2026-08-31",
       *       day: "Aug 31",
       *       value: 1,
       *       percentage: 100
       *     }
       *   ]
       * }
       */
      setConsistency(
        Array.isArray(consistencyRes.data?.last30Days)
          ? consistencyRes.data.last30Days
          : []
      );

      setWeeklyReport(weeklyRes.data || null);
      setMonthlyReport(monthlyRes.data || null);

      setRefillForecast(
        Array.isArray(forecastRes.data)
          ? forecastRes.data
          : []
      );
    } catch (err) {
      console.error("Analytics load failed:", err);

      setError(
        "Unable to load analytics. Please try again."
      );
    } finally {
      setLoading(false);
    }
  };

  if (loading) {
    return (
      <div className="dashboard-loading">
        <div className="spinner" />
        <p>Loading analytics...</p>
      </div>
    );
  }

  if (error) {
    return (
      <div className="dashboard-error">
        <p>{error}</p>

        <button onClick={fetchAnalytics}>
          Retry
        </button>
      </div>
    );
  }

  const activeReport =
    reportView === "weekly"
      ? weeklyReport
      : monthlyReport;

  /*
   * ================================
   * ADHERENCE BREAKDOWN
   * ================================
   */

  const adherenceBreakdown = activeReport
    ? [
        {
          name: "Taken",
          value: Number(activeReport.taken) || 0,
        },
        {
          name: "Missed",
          value: Number(activeReport.missed) || 0,
        },
      ]
    : [];

  /*
   * ================================
   * CONSISTENCY CHART DATA
   * ================================
   *
   * Backend returns:
   *
   * {
   *   date,
   *   day,
   *   value,
   *   percentage
   * }
   *
   * We use percentage directly.
   */

  const consistencyChartData = consistency.map((item) => ({
    day: item.day,
    date: item.date,
    consistency: Number(item.percentage) || 0,
  }));

  return (
    <div className="analytics-dashboard">

      {/* =========================================
          HEADER
      ========================================= */}

      <header className="dashboard-header">
        <div>
          <h1>Analytics & Reports</h1>

          <p className="subtitle">
            Medication adherence and refill insights
          </p>
        </div>

        <button
          className="btn-primary"
          onClick={fetchAnalytics}
        >
          Refresh
        </button>
      </header>


      {/* =========================================
          SUMMARY CARDS
      ========================================= */}

      <section className="stat-cards">

        <StatCard
          label="Overall Adherence"
          value={`${activeReport?.adherenceRate ?? 0}%`}
          tone="green"
        />

        <StatCard
          label="Doses Taken"
          value={activeReport?.taken ?? 0}
          tone="blue"
        />

        <StatCard
          label="Doses Missed"
          value={activeReport?.missed ?? 0}
          tone="red"
        />

        <StatCard
          label="Total Scheduled"
          value={activeReport?.totalDoses ?? 0}
          tone="purple"
        />

      </section>


      {/* =========================================
          WEEKLY / MONTHLY REPORT
      ========================================= */}

      <section className="report-section">

        <div className="report-toggle">

          <button
            className={
              reportView === "weekly"
                ? "active"
                : ""
            }
            onClick={() => setReportView("weekly")}
          >
            Weekly Report
          </button>

          <button
            className={
              reportView === "monthly"
                ? "active"
                : ""
            }
            onClick={() => setReportView("monthly")}
          >
            Monthly Report
          </button>

        </div>

        {activeReport && (
          <div className="report-info">

            <p className="report-period">
              Period: {activeReport.period}
            </p>

            <div className="report-details">

              <span>
                Taken: {activeReport.taken ?? 0}
              </span>

              <span>
                Missed: {activeReport.missed ?? 0}
              </span>

              <span>
                Pending: {activeReport.pending ?? 0}
              </span>

            </div>

          </div>
        )}

      </section>


      {/* =========================================
          CHARTS
      ========================================= */}

      <div className="charts-grid">


        {/* =========================================
            ADHERENCE TREND
        ========================================= */}

        <section className="chart-section">

          <h2>
            <span className="section-accent" />
            Adherence Trend (This Week)
          </h2>

          <div className="chart-wrapper">

            {adherenceTrend.length === 0 ? (
              <p className="empty-state">
                No adherence data available.
              </p>
            ) : (

              <ResponsiveContainer
                width="100%"
                height={280}
              >

                <LineChart
                  data={adherenceTrend}
                  margin={{
                    top: 10,
                    right: 20,
                    left: 0,
                    bottom: 5,
                  }}
                >

                  <CartesianGrid
                    strokeDasharray="3 3"
                    stroke="#e6efec"
                  />

                  <XAxis
                    dataKey="day"
                    stroke="#667572"
                    fontSize={12}
                  />

                  <YAxis
                    domain={[0, 100]}
                    stroke="#667572"
                    fontSize={12}
                    tickFormatter={(value) =>
                      `${value}%`
                    }
                  />

                  <Tooltip
                    formatter={(value) => [
                      `${value}%`,
                      "Adherence",
                    ]}
                  />

                  <Line
                    type="monotone"
                    dataKey="adherence"
                    stroke="#1f6b5e"
                    strokeWidth={3}
                    dot={{
                      r: 5,
                      fill: "#1f6b5e",
                    }}
                    activeDot={{
                      r: 7,
                    }}
                  />

                </LineChart>

              </ResponsiveContainer>

            )}

          </div>

        </section>


        {/* =========================================
            MISSED BY MEDICINE
        ========================================= */}

        <section className="chart-section">

          <h2>
            <span className="section-accent" />
            Missed Doses by Medicine
          </h2>

          <div className="chart-wrapper">

            {missedByMedicine.length === 0 ? (
              <p className="empty-state">
                No medication data available.
              </p>
            ) : (

              <ResponsiveContainer
                width="100%"
                height={280}
              >

                <BarChart
                  data={missedByMedicine}
                  margin={{
                    top: 10,
                    right: 20,
                    left: 0,
                    bottom: 5,
                  }}
                >

                  <CartesianGrid
                    strokeDasharray="3 3"
                    stroke="#e6efec"
                  />

                  <XAxis
                    dataKey="medicine"
                    stroke="#667572"
                    fontSize={12}
                  />

                  <YAxis
                    allowDecimals={false}
                    stroke="#667572"
                    fontSize={12}
                  />

                  <Tooltip />

                  <Bar
                    dataKey="missed"
                    fill="#d1584f"
                    radius={[
                      8,
                      8,
                      0,
                      0,
                    ]}
                  />

                </BarChart>

              </ResponsiveContainer>

            )}

          </div>

        </section>


        {/* =========================================
            ADHERENCE BREAKDOWN
        ========================================= */}

        <section className="chart-section">

          <h2>
            <span className="section-accent" />

            Adherence Breakdown (
            {reportView === "weekly"
              ? "This Week"
              : "This Month"}
            )

          </h2>

          <div className="chart-wrapper">

            {adherenceBreakdown.length === 0 ||
            (activeReport?.totalDoses ?? 0) === 0 ? (

              <p className="empty-state">
                No dose data available.
              </p>

            ) : (

              <ResponsiveContainer
                width="100%"
                height={280}
              >

                <PieChart>

                  <Pie
                    data={adherenceBreakdown}
                    dataKey="value"
                    nameKey="name"
                    cx="50%"
                    cy="50%"
                    innerRadius={65}
                    outerRadius={95}
                    paddingAngle={3}
                  >

                    {adherenceBreakdown.map(
                      (entry, index) => (

                        <Cell
                          key={entry.name}
                          fill={
                            PIE_COLORS[
                              index %
                              PIE_COLORS.length
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

          </div>

        </section>


        {/* =========================================
            REFILL FREQUENCY
        ========================================= */}

        <section className="chart-section">

          <h2>
            <span className="section-accent" />
            Refill Frequency by Medicine
          </h2>

          <div className="chart-wrapper">

            {refillStats.length === 0 ? (
              <p className="empty-state">
                No refill data available.
              </p>
            ) : (

              <ResponsiveContainer
                width="100%"
                height={280}
              >

                <BarChart
                  data={refillStats}
                  margin={{
                    top: 10,
                    right: 20,
                    left: 0,
                    bottom: 5,
                  }}
                >

                  <CartesianGrid
                    strokeDasharray="3 3"
                    stroke="#e6efec"
                  />

                  <XAxis
                    dataKey="medicine"
                    stroke="#667572"
                    fontSize={12}
                  />

                  <YAxis
                    allowDecimals={false}
                    stroke="#667572"
                    fontSize={12}
                  />

                  <Tooltip />

                  <Bar
                    dataKey="refillsThisMonth"
                    fill="#4a90c4"
                    radius={[
                      8,
                      8,
                      0,
                      0,
                    ]}
                  />

                </BarChart>

              </ResponsiveContainer>

            )}

          </div>

        </section>


        {/* =========================================
            ADHERENCE BY MEDICINE
        ========================================= */}

        <section className="chart-section">

          <h2>
            <span className="section-accent" />
            Adherence by Medicine
          </h2>

          <div className="chart-wrapper">

            {adherenceByMedicine.length === 0 ? (
              <p className="empty-state">
                No adherence data available.
              </p>
            ) : (

              <ResponsiveContainer
                width="100%"
                height={280}
              >

                <BarChart
                  data={adherenceByMedicine}
                  margin={{
                    top: 10,
                    right: 20,
                    left: 0,
                    bottom: 5,
                  }}
                >

                  <CartesianGrid
                    strokeDasharray="3 3"
                    stroke="#e6efec"
                  />

                  <XAxis
                    dataKey="medicine"
                    stroke="#667572"
                    fontSize={12}
                  />

                  <YAxis
                    domain={[0, 100]}
                    stroke="#667572"
                    fontSize={12}
                    tickFormatter={(value) =>
                      `${value}%`
                    }
                  />

                  <Tooltip
                    formatter={(value) => [
                      `${value}%`,
                      "Adherence",
                    ]}
                  />

                  <Bar
                    dataKey="adherence"
                    fill="#2f8f7f"
                    radius={[
                      8,
                      8,
                      0,
                      0,
                    ]}
                  />

                </BarChart>

              </ResponsiveContainer>

            )}

          </div>

        </section>


        {/* =========================================
            CONSISTENCY - LAST 30 DAYS
        ========================================= */}

        <section className="chart-section">

          <h2>
            <span className="section-accent" />
            Medication Consistency (Last 30 Days)
          </h2>

          <div className="chart-wrapper">

            {consistencyChartData.length === 0 ? (

              <p className="empty-state">
                No consistency data available.
              </p>

            ) : (

              <ResponsiveContainer
                width="100%"
                height={280}
              >

                <LineChart
                  data={consistencyChartData}
                  margin={{
                    top: 10,
                    right: 20,
                    left: 0,
                    bottom: 5,
                  }}
                >

                  <CartesianGrid
                    strokeDasharray="3 3"
                    stroke="#e6efec"
                  />

                  <XAxis
                    dataKey="day"
                    stroke="#667572"
                    fontSize={11}
                  />

                  <YAxis
                    domain={[0, 100]}
                    stroke="#667572"
                    fontSize={12}
                    tickFormatter={(value) =>
                      `${value}%`
                    }
                  />

                  <Tooltip
                    formatter={(value) => [
                      `${value}%`,
                      "Consistency",
                    ]}
                    labelFormatter={(label) =>
                      `Date: ${label}`
                    }
                  />

                  <Line
                    type="monotone"
                    dataKey="consistency"
                    stroke="#6b5ca5"
                    strokeWidth={2.5}
                    dot={false}
                    activeDot={{
                      r: 5,
                    }}
                  />

                </LineChart>

              </ResponsiveContainer>

            )}

          </div>

        </section>

      </div>


      {/* =========================================
          REFILL FORECAST
      ========================================= */}

      <section className="refill-forecast-section">

        <h2>Refill Forecast</h2>

        {refillForecast.length === 0 ? (

          <p className="empty-state">
            No refill forecast data available.
          </p>

        ) : (

          <div className="forecast-grid">

            {refillForecast.map((item) => (

              <div
                className={`forecast-card forecast-${item.status}`}
                key={item.medicationId}
              >

                <div className="forecast-card-header">

                  <div>
                    <h3>{item.medicineName}</h3>

                    <p>
                      {item.dosage}
                    </p>
                  </div>

                  <span className="forecast-status">
                    {item.status}
                  </span>

                </div>

                <div className="forecast-days">

                  <strong>
                    {item.daysRemaining}
                  </strong>

                  <span>
                    days remaining
                  </span>

                </div>

                <div className="forecast-details">

                  <div>
                    <span>Current Stock</span>
                    <strong>
                      {item.remainingStock}
                    </strong>
                  </div>

                  <div>
                    <span>Daily Requirement</span>
                    <strong>
                      {item.dailyRequirement}
                    </strong>
                  </div>

                  <div>
                    <span>Recommended Refill</span>
                    <strong>
                      {item.recommendedRefillQuantity}
                    </strong>
                  </div>

                </div>

                <p className="forecast-message">

                  {item.status === "critical"
                    ? "Refill urgently. Stock may run out within 3 days."
                    : item.status === "low"
                    ? "Consider refilling this medicine soon."
                    : "Current stock should be sufficient."}

                </p>

              </div>

            ))}

          </div>

        )}

      </section>

      {/* =========================================
          REFILL STATISTICS TABLE
      ========================================= */}

      <section className="refill-stats-section">

        <h2>Refill Statistics</h2>

        {refillStats.length === 0 ? (

          <p className="empty-state">
            No refill data available.
          </p>

        ) : (

          <div className="table-container">

            <table className="refill-table">

              <thead>

                <tr>
                  <th>Medicine</th>
                  <th>Refills This Month</th>
                  <th>
                    Avg. Days Between Refills
                  </th>
                  <th>Remaining Stock</th>
                  <th>Total Stock</th>
                </tr>

              </thead>

              <tbody>

                {refillStats.map((item) => (

                  <tr key={item.medicine}>

                    <td>{item.medicine}</td>

                    <td>
                      {item.refillsThisMonth ?? 0}
                    </td>

                    <td>
                      {item.avgDaysBetween ?? 0} days
                    </td>

                    <td>
                      {item.remainingStock ?? 0}
                    </td>

                    <td>
                      {item.totalStock ?? 0}
                    </td>

                  </tr>

                ))}

              </tbody>

            </table>

          </div>

        )}

      </section>

    </div>
  );
};


/* =========================================
   STAT CARD COMPONENT
========================================= */

const StatCard = ({
  label,
  value,
  tone,
}) => {

  return (
    <div
      className={`stat-card tone-${tone}`}
    >

      <p className="stat-card-label">
        {label}
      </p>

      <h3 className="stat-card-value">
        {value}
      </h3>

    </div>
  );
};


export default Analytics;
