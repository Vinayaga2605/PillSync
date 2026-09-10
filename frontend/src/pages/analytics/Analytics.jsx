import React, { useEffect, useMemo, useState } from "react";
import {
  Activity,
  BarChart3,
  CalendarDays,
  CheckCircle2,
  Clock3,
  Download,
  LineChart as LineChartIcon,
  Package,
  Pill,
  RefreshCw,
  TrendingUp,
  AlertTriangle,
  XCircle,
} from "lucide-react";

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

      setAdherenceTrend(Array.isArray(trendRes.data) ? trendRes.data : []);
      setRefillStats(Array.isArray(refillRes.data) ? refillRes.data : []);
      setMissedByMedicine(
        Array.isArray(missedRes.data) ? missedRes.data : []
      );
      setAdherenceByMedicine(
        Array.isArray(adherenceMedicineRes.data)
          ? adherenceMedicineRes.data
          : []
      );

      setConsistency(
        Array.isArray(consistencyRes.data?.last30Days)
          ? consistencyRes.data.last30Days
          : []
      );

      setWeeklyReport(weeklyRes.data || null);
      setMonthlyReport(monthlyRes.data || null);

      setRefillForecast(
        Array.isArray(forecastRes.data) ? forecastRes.data : []
      );
    } catch (err) {
      console.error("Analytics load failed:", err);
      setError("Unable to load analytics. Please try again.");
    } finally {
      setLoading(false);
    }
  };

  const activeReport =
    reportView === "weekly" ? weeklyReport : monthlyReport;

  const adherenceBreakdown = useMemo(() => {
    if (!activeReport) return [];

    return [
      {
        name: "Taken",
        value: Number(activeReport.taken) || 0,
      },
      {
        name: "Missed",
        value: Number(activeReport.missed) || 0,
      },
    ];
  }, [activeReport]);

  const consistencyChartData = useMemo(
    () =>
      consistency.map((item) => ({
        day: item.day,
        date: item.date,
        consistency: Number(item.percentage) || 0,
      })),
    [consistency]
  );

  if (loading) {
    return (
      <div className="analytics-page">
        <style>{analyticsStyles}</style>

        <div className="analytics-loading">
          <div className="analytics-spinner">
            <RefreshCw size={24} />
          </div>
          <h3>Loading analytics</h3>
          <p>Preparing your medication insights...</p>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="analytics-page">
        <style>{analyticsStyles}</style>

        <div className="analytics-error">
          <div className="analytics-error-icon">
            <AlertTriangle size={26} />
          </div>

          <h3>Unable to load analytics</h3>
          <p>{error}</p>

          <button className="analytics-primary-btn" onClick={fetchAnalytics}>
            <RefreshCw size={17} />
            Retry
          </button>
        </div>
      </div>
    );
  }

  const totalScheduled = Number(activeReport?.totalDoses) || 0;
  const taken = Number(activeReport?.taken) || 0;
  const missed = Number(activeReport?.missed) || 0;
  const adherenceRate = Number(activeReport?.adherenceRate) || 0;

  const criticalRefills = refillForecast.filter(
    (item) => item.status === "critical"
  ).length;

  const lowRefills = refillForecast.filter(
    (item) => item.status === "low"
  ).length;

  return (
    <div className="analytics-page">
      <style>{analyticsStyles}</style>

      {/* HEADER */}
      <div className="analytics-header">
        <div>
          <div className="analytics-kicker">
            <Activity size={15} />
            HEALTH INSIGHTS
          </div>

          <h1>Analytics & Reports</h1>

          <p>
            Track medication adherence, consistency and refill
            requirements in one place.
          </p>
        </div>

        <button
          className="analytics-refresh-btn"
          onClick={fetchAnalytics}
        >
          <RefreshCw size={17} />
          Refresh
        </button>
      </div>

      {/* SUMMARY CARDS */}
      <section className="analytics-stat-grid">
        <StatCard
          icon={<TrendingUp size={21} />}
          label="Overall Adherence"
          value={`${adherenceRate}%`}
          description={
            reportView === "weekly"
              ? "This week"
              : "This month"
          }
          tone="green"
        />

        <StatCard
          icon={<CheckCircle2 size={21} />}
          label="Doses Taken"
          value={taken}
          description="Completed doses"
          tone="blue"
        />

        <StatCard
          icon={<XCircle size={21} />}
          label="Doses Missed"
          value={missed}
          description="Needs attention"
          tone="red"
        />

        <StatCard
          icon={<CalendarDays size={21} />}
          label="Total Scheduled"
          value={totalScheduled}
          description={
            reportView === "weekly"
              ? "Weekly schedule"
              : "Monthly schedule"
          }
          tone="purple"
        />
      </section>

      {/* REPORT SWITCHER */}
      <section className="analytics-section-card report-card">
        <div className="section-top">
          <div>
            <div className="section-icon">
              <BarChart3 size={18} />
            </div>

            <div>
              <h2>Medication Report</h2>
              <p>Compare your current medication performance.</p>
            </div>
          </div>

          <div className="report-toggle">
            <button
              className={reportView === "weekly" ? "active" : ""}
              onClick={() => setReportView("weekly")}
            >
              Weekly
            </button>

            <button
              className={reportView === "monthly" ? "active" : ""}
              onClick={() => setReportView("monthly")}
            >
              Monthly
            </button>
          </div>
        </div>

        {activeReport ? (
          <div className="report-summary">
            <div>
              <span>Period</span>
              <strong>{activeReport.period || "Current period"}</strong>
            </div>

            <div>
              <span>Taken</span>
              <strong className="success-text">
                {activeReport.taken ?? 0}
              </strong>
            </div>

            <div>
              <span>Missed</span>
              <strong className="danger-text">
                {activeReport.missed ?? 0}
              </strong>
            </div>

            <div>
              <span>Pending</span>
              <strong className="warning-text">
                {activeReport.pending ?? 0}
              </strong>
            </div>
          </div>
        ) : (
          <div className="empty-state-box">
            No report data available for this period.
          </div>
        )}
      </section>

      {/* MAIN CHART GRID */}
      <div className="analytics-chart-grid">
        <ChartCard
          icon={<LineChartIcon size={18} />}
          title="Adherence Trend"
          subtitle="Medication adherence throughout the week"
          wide
        >
          {adherenceTrend.length === 0 ? (
            <EmptyChart />
          ) : (
            <ResponsiveContainer width="100%" height={300}>
              <LineChart
                data={adherenceTrend}
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
                  stroke="#84918e"
                  fontSize={12}
                  tickLine={false}
                  axisLine={false}
                />

                <YAxis
                  domain={[0, 100]}
                  stroke="#84918e"
                  fontSize={12}
                  tickFormatter={(value) => `${value}%`}
                  tickLine={false}
                  axisLine={false}
                />

                <Tooltip
                  contentStyle={{
                    border: "1px solid #e5ece9",
                    borderRadius: "12px",
                    boxShadow: "0 8px 24px rgba(31, 54, 47, 0.08)",
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
                    strokeWidth: 2,
                    stroke: "#ffffff",
                  }}
                  activeDot={{ r: 7 }}
                />
              </LineChart>
            </ResponsiveContainer>
          )}
        </ChartCard>

        <ChartCard
          icon={<XCircle size={18} />}
          title="Missed Doses"
          subtitle="Missed doses by medicine"
        >
          {missedByMedicine.length === 0 ? (
            <EmptyChart />
          ) : (
            <ResponsiveContainer width="100%" height={300}>
              <BarChart
                data={missedByMedicine}
                margin={{
                  top: 10,
                  right: 5,
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
                  stroke="#84918e"
                  fontSize={11}
                  tickLine={false}
                  axisLine={false}
                />

                <YAxis
                  allowDecimals={false}
                  stroke="#84918e"
                  fontSize={12}
                  tickLine={false}
                  axisLine={false}
                />

                <Tooltip
                  contentStyle={{
                    border: "1px solid #e5ece9",
                    borderRadius: "12px",
                  }}
                />

                <Bar
                  dataKey="missed"
                  fill="#d1584f"
                  radius={[7, 7, 0, 0]}
                />
              </BarChart>
            </ResponsiveContainer>
          )}
        </ChartCard>

        <ChartCard
          icon={<Activity size={18} />}
          title={`Adherence Breakdown`}
          subtitle={
            reportView === "weekly"
              ? "Taken vs missed doses this week"
              : "Taken vs missed doses this month"
          }
        >
          {adherenceBreakdown.length === 0 ||
          totalScheduled === 0 ? (
            <EmptyChart />
          ) : (
            <div className="pie-chart-wrapper">
              <ResponsiveContainer width="100%" height={280}>
                <PieChart>
                  <Pie
                    data={adherenceBreakdown}
                    dataKey="value"
                    nameKey="name"
                    cx="50%"
                    cy="45%"
                    innerRadius={65}
                    outerRadius={92}
                    paddingAngle={3}
                  >
                    {adherenceBreakdown.map((entry, index) => (
                      <Cell
                        key={entry.name}
                        fill={
                          PIE_COLORS[index % PIE_COLORS.length]
                        }
                      />
                    ))}
                  </Pie>

                  <Tooltip />

                  <Legend
                    verticalAlign="bottom"
                    height={30}
                  />
                </PieChart>
              </ResponsiveContainer>
            </div>
          )}
        </ChartCard>

        <ChartCard
          icon={<Package size={18} />}
          title="Refill Frequency"
          subtitle="Refills recorded this month"
        >
          {refillStats.length === 0 ? (
            <EmptyChart />
          ) : (
            <ResponsiveContainer width="100%" height={300}>
              <BarChart
                data={refillStats}
                margin={{
                  top: 10,
                  right: 5,
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
                  stroke="#84918e"
                  fontSize={11}
                  tickLine={false}
                  axisLine={false}
                />

                <YAxis
                  allowDecimals={false}
                  stroke="#84918e"
                  fontSize={12}
                  tickLine={false}
                  axisLine={false}
                />

                <Tooltip
                  contentStyle={{
                    border: "1px solid #e5ece9",
                    borderRadius: "12px",
                  }}
                />

                <Bar
                  dataKey="refillsThisMonth"
                  fill="#4a90c4"
                  radius={[7, 7, 0, 0]}
                />
              </BarChart>
            </ResponsiveContainer>
          )}
        </ChartCard>

        <ChartCard
          icon={<Pill size={18} />}
          title="Adherence by Medicine"
          subtitle="Medicine-level adherence performance"
          wide
        >
          {adherenceByMedicine.length === 0 ? (
            <EmptyChart />
          ) : (
            <ResponsiveContainer width="100%" height={300}>
              <BarChart
                data={adherenceByMedicine}
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
                  stroke="#84918e"
                  fontSize={11}
                  tickLine={false}
                  axisLine={false}
                />

                <YAxis
                  domain={[0, 100]}
                  stroke="#84918e"
                  fontSize={12}
                  tickFormatter={(value) => `${value}%`}
                  tickLine={false}
                  axisLine={false}
                />

                <Tooltip
                  formatter={(value) => [
                    `${value}%`,
                    "Adherence",
                  ]}
                  contentStyle={{
                    border: "1px solid #e5ece9",
                    borderRadius: "12px",
                  }}
                />

                <Bar
                  dataKey="adherence"
                  fill="#2f8f7f"
                  radius={[7, 7, 0, 0]}
                />
              </BarChart>
            </ResponsiveContainer>
          )}
        </ChartCard>

        <ChartCard
          icon={<Clock3 size={18} />}
          title="Medication Consistency"
          subtitle="Last 30 days"
          wide
        >
          {consistencyChartData.length === 0 ? (
            <EmptyChart />
          ) : (
            <ResponsiveContainer width="100%" height={300}>
              <LineChart
                data={consistencyChartData}
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
                  stroke="#84918e"
                  fontSize={10}
                  tickLine={false}
                  axisLine={false}
                />

                <YAxis
                  domain={[0, 100]}
                  stroke="#84918e"
                  fontSize={12}
                  tickFormatter={(value) => `${value}%`}
                  tickLine={false}
                  axisLine={false}
                />

                <Tooltip
                  formatter={(value) => [
                    `${value}%`,
                    "Consistency",
                  ]}
                  labelFormatter={(label) => `Date: ${label}`}
                  contentStyle={{
                    border: "1px solid #e5ece9",
                    borderRadius: "12px",
                  }}
                />

                <Line
                  type="monotone"
                  dataKey="consistency"
                  stroke="#6b5ca5"
                  strokeWidth={3}
                  dot={false}
                  activeDot={{ r: 6 }}
                />
              </LineChart>
            </ResponsiveContainer>
          )}
        </ChartCard>
      </div>

      {/* REFILL OVERVIEW */}
      <section className="analytics-section-card">
        <div className="section-top">
          <div>
            <div className="section-icon refill-icon">
              <Package size={18} />
            </div>

            <div>
              <h2>Refill Forecast</h2>
              <p>Current stock levels and recommended refills.</p>
            </div>
          </div>

          <div className="forecast-summary">
            <span className="critical-pill">
              {criticalRefills} Critical
            </span>

            <span className="low-pill">
              {lowRefills} Low
            </span>
          </div>
        </div>

        {refillForecast.length === 0 ? (
          <div className="empty-state-box">
            No refill forecast data available.
          </div>
        ) : (
          <div className="forecast-grid">
            {refillForecast.map((item) => (
              <div
                className={`forecast-card forecast-${item.status}`}
                key={item.medicationId}
              >
                <div className="forecast-top">
                  <div className="forecast-medicine">
                    <div className="medicine-icon">
                      <Pill size={18} />
                    </div>

                    <div>
                      <h3>{item.medicineName}</h3>
                      <p>{item.dosage}</p>
                    </div>
                  </div>

                  <span className="forecast-status">
                    {item.status}
                  </span>
                </div>

                <div className="forecast-days">
                  <strong>{item.daysRemaining ?? 0}</strong>
                  <span>days remaining</span>
                </div>

                <div className="forecast-detail-grid">
                  <div>
                    <span>Current Stock</span>
                    <strong>{item.remainingStock ?? 0}</strong>
                  </div>

                  <div>
                    <span>Daily Need</span>
                    <strong>{item.dailyRequirement ?? 0}</strong>
                  </div>

                  <div>
                    <span>Recommended</span>
                    <strong>
                      {item.recommendedRefillQuantity ?? 0}
                    </strong>
                  </div>
                </div>

                <div className="forecast-message">
                  {item.status === "critical"
                    ? "Refill urgently. Stock may run out soon."
                    : item.status === "low"
                    ? "Consider refilling this medicine soon."
                    : "Current stock should be sufficient."}
                </div>
              </div>
            ))}
          </div>
        )}
      </section>

      {/* REFILL TABLE */}
      <section className="analytics-section-card">
        <div className="section-top">
          <div>
            <div className="section-icon">
              <Package size={18} />
            </div>

            <div>
              <h2>Refill Statistics</h2>
              <p>Medicine refill activity and current stock.</p>
            </div>
          </div>

          <button className="analytics-secondary-btn">
            <Download size={16} />
            Export
          </button>
        </div>

        {refillStats.length === 0 ? (
          <div className="empty-state-box">
            No refill statistics available.
          </div>
        ) : (
          <div className="analytics-table-wrap">
            <table className="analytics-table">
              <thead>
                <tr>
                  <th>Medicine</th>
                  <th>Refills</th>
                  <th>Avg. Days</th>
                  <th>Remaining</th>
                  <th>Total Stock</th>
                </tr>
              </thead>

              <tbody>
                {refillStats.map((item) => (
                  <tr key={item.medicine}>
                    <td>
                      <div className="table-medicine">
                        <div className="table-medicine-icon">
                          <Pill size={15} />
                        </div>

                        <span>{item.medicine}</span>
                      </div>
                    </td>

                    <td>{item.refillsThisMonth ?? 0}</td>

                    <td>
                      {item.avgDaysBetween ?? 0} days
                    </td>

                    <td>
                      <span className="stock-value">
                        {item.remainingStock ?? 0}
                      </span>
                    </td>

                    <td>{item.totalStock ?? 0}</td>
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

const StatCard = ({
  icon,
  label,
  value,
  description,
  tone,
}) => {
  return (
    <div className={`analytics-stat-card stat-${tone}`}>
      <div className="stat-icon">{icon}</div>

      <div className="stat-content">
        <span>{label}</span>
        <strong>{value}</strong>
        <small>{description}</small>
      </div>
    </div>
  );
};

const ChartCard = ({
  icon,
  title,
  subtitle,
  children,
  wide = false,
}) => {
  return (
    <section
      className={`analytics-section-card chart-card ${
        wide ? "chart-card-wide" : ""
      }`}
    >
      <div className="chart-card-header">
        <div className="chart-title-row">
          <div className="section-icon">{icon}</div>

          <div>
            <h2>{title}</h2>
            <p>{subtitle}</p>
          </div>
        </div>
      </div>

      <div className="chart-content">{children}</div>
    </section>
  );
};

const EmptyChart = () => {
  return (
    <div className="empty-chart">
      <BarChart3 size={30} />
      <span>No data available</span>
    </div>
  );
};

const analyticsStyles = `
.analytics-page {
  min-height: 100%;
  padding: 28px 30px 40px;
  background: #f7faf9;
  color: #1f332d;
}

.analytics-header {
  display: flex;
  align-items: flex-start;
  justify-content: space-between;
  gap: 24px;
  margin-bottom: 28px;
}

.analytics-kicker {
  display: flex;
  align-items: center;
  gap: 7px;
  color: #2f8f7f;
  font-size: 11px;
  font-weight: 800;
  letter-spacing: 0.12em;
  margin-bottom: 7px;
}

.analytics-header h1 {
  margin: 0;
  font-size: 29px;
  line-height: 1.2;
  font-weight: 750;
  color: #20352f;
}

.analytics-header p {
  margin: 8px 0 0;
  color: #74827e;
  font-size: 14px;
}

.analytics-refresh-btn,
.analytics-primary-btn,
.analytics-secondary-btn {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  gap: 8px;
  border: 0;
  cursor: pointer;
  border-radius: 11px;
  font-weight: 650;
  transition: all 0.2s ease;
}

.analytics-refresh-btn {
  padding: 11px 17px;
  background: #2f8f7f;
  color: white;
  box-shadow: 0 5px 16px rgba(47, 143, 127, 0.18);
}

.analytics-refresh-btn:hover {
  background: #26786a;
  transform: translateY(-1px);
}

.analytics-primary-btn {
  padding: 11px 18px;
  background: #2f8f7f;
  color: #fff;
}

.analytics-secondary-btn {
  padding: 10px 14px;
  background: #f4f7f6;
  color: #39534b;
  border: 1px solid #dfe8e5;
}

.analytics-secondary-btn:hover {
  background: #eaf2ef;
}

.analytics-stat-grid {
  display: grid;
  grid-template-columns: repeat(4, minmax(0, 1fr));
  gap: 16px;
  margin-bottom: 18px;
}

.analytics-stat-card {
  position: relative;
  display: flex;
  align-items: center;
  gap: 14px;
  min-height: 116px;
  padding: 19px;
  background: #fff;
  border: 1px solid #e4ece9;
  border-radius: 17px;
  box-shadow: 0 5px 18px rgba(31, 54, 47, 0.045);
  overflow: hidden;
}

.analytics-stat-card::after {
  content: "";
  position: absolute;
  width: 70px;
  height: 70px;
  right: -26px;
  bottom: -26px;
  border-radius: 50%;
  opacity: 0.18;
}

.stat-green::after {
  background: #2f8f7f;
}

.stat-blue::after {
  background: #4a90c4;
}

.stat-red::after {
  background: #d1584f;
}

.stat-purple::after {
  background: #6b5ca5;
}

.stat-icon {
  width: 45px;
  height: 45px;
  border-radius: 13px;
  display: flex;
  align-items: center;
  justify-content: center;
  flex-shrink: 0;
}

.stat-green .stat-icon {
  background: #e8f5f1;
  color: #2f8f7f;
}

.stat-blue .stat-icon {
  background: #eaf4fb;
  color: #4a90c4;
}

.stat-red .stat-icon {
  background: #fcebea;
  color: #d1584f;
}

.stat-purple .stat-icon {
  background: #f0edfa;
  color: #6b5ca5;
}

.stat-content {
  min-width: 0;
}

.stat-content span {
  display: block;
  color: #75837f;
  font-size: 12px;
  font-weight: 600;
}

.stat-content strong {
  display: block;
  margin-top: 3px;
  color: #21372f;
  font-size: 25px;
  line-height: 1.15;
}

.stat-content small {
  display: block;
  margin-top: 4px;
  color: #9aa6a2;
  font-size: 11px;
}

.analytics-section-card {
  background: #fff;
  border: 1px solid #e4ece9;
  border-radius: 17px;
  box-shadow: 0 5px 18px rgba(31, 54, 47, 0.045);
}

.report-card {
  padding: 19px 21px;
  margin-bottom: 18px;
}

.section-top {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 18px;
}

.section-top > div:first-child,
.chart-title-row {
  display: flex;
  align-items: center;
  gap: 12px;
}

.section-icon {
  width: 38px;
  height: 38px;
  display: flex;
  align-items: center;
  justify-content: center;
  border-radius: 11px;
  background: #e8f5f1;
  color: #2f8f7f;
  flex-shrink: 0;
}

.refill-icon {
  background: #eef6fb;
  color: #4a90c4;
}

.analytics-section-card h2 {
  margin: 0;
  color: #243a33;
  font-size: 15px;
  font-weight: 750;
}

.analytics-section-card p {
  margin: 4px 0 0;
  color: #84908c;
  font-size: 12px;
}

.report-toggle {
  display: inline-flex;
  padding: 4px;
  background: #f2f6f4;
  border: 1px solid #e2ebe8;
  border-radius: 11px;
}

.report-toggle button {
  border: 0;
  background: transparent;
  color: #75827e;
  padding: 8px 13px;
  border-radius: 8px;
  cursor: pointer;
  font-size: 12px;
  font-weight: 650;
}

.report-toggle button.active {
  background: #fff;
  color: #2f8f7f;
  box-shadow: 0 2px 7px rgba(35, 57, 50, 0.08);
}

.report-summary {
  display: grid;
  grid-template-columns: repeat(4, minmax(0, 1fr));
  gap: 10px;
  margin-top: 17px;
}

.report-summary > div {
  padding: 12px 14px;
  border: 1px solid #edf1ef;
  border-radius: 11px;
  background: #fbfcfc;
}

.report-summary span {
  display: block;
  color: #8a9692;
  font-size: 10px;
  font-weight: 700;
  text-transform: uppercase;
  letter-spacing: 0.04em;
}

.report-summary strong {
  display: block;
  margin-top: 5px;
  color: #263b34;
  font-size: 16px;
}

.success-text {
  color: #2f8f7f !important;
}

.danger-text {
  color: #d1584f !important;
}

.warning-text {
  color: #c18a35 !important;
}

.analytics-chart-grid {
  display: grid;
  grid-template-columns: repeat(2, minmax(0, 1fr));
  gap: 18px;
  margin-bottom: 18px;
}

.chart-card-wide {
  grid-column: span 2;
}

.chart-card {
  padding: 19px 21px 16px;
}

.chart-card-header {
  margin-bottom: 6px;
}

.chart-title-row .section-icon {
  width: 36px;
  height: 36px;
}

.chart-content {
  min-height: 280px;
}

.empty-chart {
  min-height: 280px;
  display: flex;
  align-items: center;
  justify-content: center;
  flex-direction: column;
  gap: 9px;
  color: #a0aaa7;
  font-size: 13px;
}

.pie-chart-wrapper {
  width: 100%;
}

.forecast-summary {
  display: flex;
  align-items: center;
  gap: 8px;
}

.critical-pill,
.low-pill {
  border-radius: 20px;
  padding: 6px 10px;
  font-size: 11px;
  font-weight: 700;
}

.critical-pill {
  background: #fcebea;
  color: #c34e45;
}

.low-pill {
  background: #fff6df;
  color: #a87820;
}

.analytics-section-card:has(.forecast-grid),
.analytics-section-card:has(.analytics-table-wrap) {
  padding: 20px 21px;
  margin-bottom: 18px;
}

.forecast-grid {
  display: grid;
  grid-template-columns: repeat(3, minmax(0, 1fr));
  gap: 14px;
  margin-top: 18px;
}

.forecast-card {
  border: 1px solid #e7eeeb;
  border-radius: 14px;
  padding: 16px;
  background: #fbfcfc;
}

.forecast-card.forecast-critical {
  border-color: #f3d1ce;
  background: #fffaf9;
}

.forecast-card.forecast-low {
  border-color: #f2e2bd;
  background: #fffdf7;
}

.forecast-top {
  display: flex;
  align-items: flex-start;
  justify-content: space-between;
  gap: 10px;
}

.forecast-medicine {
  display: flex;
  align-items: center;
  gap: 10px;
  min-width: 0;
}

.medicine-icon {
  width: 36px;
  height: 36px;
  border-radius: 10px;
  background: #e8f5f1;
  color: #2f8f7f;
  display: flex;
  align-items: center;
  justify-content: center;
  flex-shrink: 0;
}

.forecast-medicine h3 {
  margin: 0;
  color: #2b4038;
  font-size: 13px;
}

.forecast-medicine p {
  margin: 3px 0 0;
  font-size: 11px;
  color: #8a9692;
}

.forecast-status {
  padding: 5px 9px;
  border-radius: 8px;
  background: #edf5f2;
  color: #2f8f7f;
  font-size: 9px;
  text-transform: uppercase;
  font-weight: 800;
}

.forecast-critical .forecast-status {
  background: #fcebea;
  color: #c34e45;
}

.forecast-low .forecast-status {
  background: #fff2cf;
  color: #9e731f;
}

.forecast-days {
  margin-top: 16px;
}

.forecast-days strong {
  display: block;
  font-size: 28px;
  line-height: 1;
  color: #223830;
}

.forecast-days span {
  display: block;
  margin-top: 4px;
  color: #87938f;
  font-size: 11px;
}

.forecast-detail-grid {
  display: grid;
  grid-template-columns: repeat(3, 1fr);
  gap: 8px;
  margin-top: 16px;
}

.forecast-detail-grid div {
  padding: 8px;
  border-radius: 9px;
  background: #fff;
  border: 1px solid #edf1ef;
}

.forecast-detail-grid span {
  display: block;
  color: #919c98;
  font-size: 9px;
}

.forecast-detail-grid strong {
  display: block;
  margin-top: 3px;
  color: #344a42;
  font-size: 13px;
}

.forecast-message {
  margin-top: 13px !important;
  padding-top: 11px;
  border-top: 1px solid #e9efed;
  line-height: 1.45;
}

.analytics-table-wrap {
  width: 100%;
  overflow-x: auto;
  margin-top: 17px;
}

.analytics-table {
  width: 100%;
  min-width: 680px;
  border-collapse: collapse;
}

.analytics-table th {
  padding: 11px 12px;
  text-align: left;
  background: #f7faf9;
  color: #7c8985;
  font-size: 10px;
  font-weight: 800;
  text-transform: uppercase;
  letter-spacing: 0.05em;
  border-bottom: 1px solid #e6eeeb;
}

.analytics-table td {
  padding: 13px 12px;
  color: #42554e;
  font-size: 12px;
  border-bottom: 1px solid #edf2f0;
}

.analytics-table tbody tr:hover {
  background: #fbfcfc;
}

.table-medicine {
  display: flex;
  align-items: center;
  gap: 9px;
  font-weight: 650;
  color: #2e463d;
}

.table-medicine-icon {
  width: 28px;
  height: 28px;
  display: flex;
  align-items: center;
  justify-content: center;
  border-radius: 8px;
  background: #e8f5f1;
  color: #2f8f7f;
}

.stock-value {
  padding: 4px 8px;
  border-radius: 7px;
  background: #edf6f3;
  color: #2f8f7f;
  font-weight: 750;
}

.empty-state-box {
  margin-top: 16px;
  padding: 28px;
  border-radius: 12px;
  background: #f8fbfa;
  border: 1px dashed #dce7e3;
  color: #8a9792;
  text-align: center;
  font-size: 13px;
}

.analytics-loading,
.analytics-error {
  min-height: 65vh;
  display: flex;
  align-items: center;
  justify-content: center;
  flex-direction: column;
  text-align: center;
}

.analytics-spinner,
.analytics-error-icon {
  width: 54px;
  height: 54px;
  border-radius: 15px;
  display: flex;
  align-items: center;
  justify-content: center;
}

.analytics-spinner {
  background: #e8f5f1;
  color: #2f8f7f;
  animation: analytics-spin 1.4s linear infinite;
}

.analytics-error-icon {
  background: #fcebea;
  color: #d1584f;
}

.analytics-loading h3,
.analytics-error h3 {
  margin: 15px 0 4px;
  color: #293f37;
  font-size: 17px;
}

.analytics-loading p,
.analytics-error p {
  margin: 0 0 16px;
  color: #899691;
  font-size: 13px;
}

@keyframes analytics-spin {
  from {
    transform: rotate(0deg);
  }

  to {
    transform: rotate(360deg);
  }
}

@media (max-width: 1100px) {
  .analytics-stat-grid {
    grid-template-columns: repeat(2, minmax(0, 1fr));
  }

  .forecast-grid {
    grid-template-columns: repeat(2, minmax(0, 1fr));
  }
}

@media (max-width: 820px) {
  .analytics-page {
    padding: 22px 17px 30px;
  }

  .analytics-header {
    flex-direction: column;
  }

  .analytics-refresh-btn {
    width: 100%;
  }

  .analytics-chart-grid {
    grid-template-columns: 1fr;
  }

  .chart-card-wide {
    grid-column: span 1;
  }

  .report-summary {
    grid-template-columns: repeat(2, minmax(0, 1fr));
  }

  .forecast-grid {
    grid-template-columns: 1fr;
  }
}

@media (max-width: 560px) {
  .analytics-stat-grid {
    grid-template-columns: 1fr;
  }

  .analytics-header h1 {
    font-size: 24px;
  }

  .section-top {
    flex-direction: column;
    align-items: flex-start;
  }

  .report-toggle {
    width: 100%;
  }

  .report-toggle button {
    flex: 1;
  }

  .report-summary {
    grid-template-columns: 1fr 1fr;
  }
}
`;

export default Analytics;