import React, { useEffect, useState } from "react";

import {
  ResponsiveContainer,
  AreaChart,
  Area,
  BarChart,
  Bar,
  LineChart,
  Line,
  PieChart,
  Pie,
  Cell,
  XAxis,
  YAxis,
  Tooltip,
  Legend,
  CartesianGrid,
} from "recharts";

import {
  Users,
  Pill,
  CalendarClock,
  CheckCircle2,
  RefreshCw,
  AlertTriangle,
  Activity,
  Bell,
  TrendingUp,
} from "lucide-react";

import { fetchAdminAnalytics } from "../../services/api";

const COLORS = [
  "#0ea5e9",
  "#6366f1",
  "#10b981",
  "#f59e0b",
  "#ef4444",
  "#8b5cf6",
];

const AdminAnalytics = () => {
  const [data, setData] = useState({});
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  const loadAnalytics = async () => {
    try {
      setLoading(true);
      setError("");

      const result = await fetchAdminAnalytics();

      setData(result || {});
    } catch (err) {
      console.error(
        "Admin analytics error:",
        err
      );

      setError(
        err?.response?.data?.detail ||
          err?.message ||
          "Unable to load analytics."
      );
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadAnalytics();
  }, []);

  const daily = Array.isArray(
    data?.adherence_daily
  )
    ? data.adherence_daily
    : [];

  const weekly = Array.isArray(
    data?.adherence_weekly
  )
    ? data.adherence_weekly
    : [];

  const monthly = Array.isArray(
    data?.adherence_monthly
  )
    ? data.adherence_monthly
    : [];

  const usage = Array.isArray(
    data?.medicine_usage
  )
    ? data.medicine_usage.slice(0, 8)
    : [];

  const notificationTrend =
    Array.isArray(data?.notification_trend)
      ? data.notification_trend
      : [];

  const missedTrend =
    Array.isArray(data?.missed_dose_trend)
      ? data.missed_dose_trend
      : [];

  const refillTrend =
    Array.isArray(data?.refill_prediction_trend)
      ? data.refill_prediction_trend
      : [];

  const reminder =
    Array.isArray(data?.reminder_success_rate)
      ? data.reminder_success_rate
      : [];

  const diseases =
    Array.isArray(data?.patients_by_disease)
      ? data.patients_by_disease
      : [];

  const overallAdherence = Math.min(
    100,
    Math.max(
      0,
      Number(
        data?.overall_adherence ??
          data?.overallAdherence ??
          0
      )
    )
  );

  if (loading) {
    return (
      <div className="admin-analytics-page">
        <style>{adminAnalyticsStyles}</style>

        <div className="analytics-loading">
          <div className="analytics-spinner" />
          <p>Loading analytics...</p>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="admin-analytics-page">
        <style>{adminAnalyticsStyles}</style>

        <div className="analytics-header">
          <div>
            <p className="analytics-eyebrow">
              Administration
            </p>

            <h1>System Analytics</h1>

            <p>
              Monitor medication usage, adherence,
              notifications and refill activity.
            </p>
          </div>

          <button
            className="analytics-refresh-btn"
            onClick={loadAnalytics}
            type="button"
          >
            <RefreshCw size={17} />
            Retry
          </button>
        </div>

        <div className="analytics-error">
          <AlertTriangle size={19} />

          <div>
            <strong>
              Unable to load analytics
            </strong>

            <p>{error}</p>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="admin-analytics-page">
      <style>{adminAnalyticsStyles}</style>

      {/* HEADER */}

      <header className="analytics-header">
        <div>
          <p className="analytics-eyebrow">
            Administration
          </p>

          <h1>System Analytics</h1>

          <p>
            Monitor medication usage, adherence,
            notifications and refill activity.
          </p>
        </div>

        <button
          className="analytics-refresh-btn"
          onClick={loadAnalytics}
          type="button"
        >
          <RefreshCw size={17} />
          Refresh
        </button>
      </header>

      {/* SUMMARY CARDS */}

      <section className="analytics-stats">
        <AnalyticsStat
          icon={<Users size={21} />}
          value={data?.users ?? 0}
          label="Total Users"
          tone="blue"
        />

        <AnalyticsStat
          icon={<Pill size={21} />}
          value={data?.medicines ?? 0}
          label="Medicines"
          tone="teal"
        />

        <AnalyticsStat
          icon={<CalendarClock size={21} />}
          value={data?.schedules ?? 0}
          label="Active Schedules"
          tone="purple"
        />

        <AnalyticsStat
          icon={<CheckCircle2 size={21} />}
          value={data?.taken_today ?? 0}
          label="Doses Taken Today"
          tone="green"
        />
      </section>

      {/* EXTRA SUMMARY */}

      <section className="analytics-mini-grid">
        <MiniMetric
          icon={<Activity size={18} />}
          label="Overall Adherence"
          value={`${overallAdherence}%`}
        />

        <MiniMetric
          icon={<Bell size={18} />}
          label="Notification Events"
          value={notificationTrend.length}
        />

        <MiniMetric
          icon={<AlertTriangle size={18} />}
          label="Missed Dose Records"
          value={missedTrend.length}
        />

        <MiniMetric
          icon={<TrendingUp size={18} />}
          label="Refill Trend Points"
          value={refillTrend.length}
        />
      </section>

      {/* DAILY + DISEASE */}

      <div className="analytics-grid">
        <AnalyticsPanel
          title="Daily Adherence"
          subtitle="Adherence over the latest available days"
        >
          <ChartContainer>
            {daily.length === 0 ? (
              <ChartEmpty />
            ) : (
              <ResponsiveContainer
                width="100%"
                height="100%"
              >
                <AreaChart data={daily}>
                  <defs>
                    <linearGradient
                      id="dailyAdherence"
                      x1="0"
                      y1="0"
                      x2="0"
                      y2="1"
                    >
                      <stop
                        offset="0%"
                        stopColor="#0ea5e9"
                        stopOpacity={0.35}
                      />

                      <stop
                        offset="100%"
                        stopColor="#0ea5e9"
                        stopOpacity={0}
                      />
                    </linearGradient>
                  </defs>

                  <CartesianGrid
                    strokeDasharray="3 3"
                    stroke="#e2e8f0"
                  />

                  <XAxis
                    dataKey="label"
                    tick={{ fontSize: 12 }}
                  />

                  <YAxis
                    tick={{ fontSize: 12 }}
                    domain={[0, 100]}
                  />

                  <Tooltip />

                  <Area
                    type="monotone"
                    dataKey="adherence"
                    name="Adherence %"
                    stroke="#0ea5e9"
                    fill="url(#dailyAdherence)"
                    strokeWidth={2}
                  />
                </AreaChart>
              </ResponsiveContainer>
            )}
          </ChartContainer>
        </AnalyticsPanel>

        <AnalyticsPanel
          title="Patients by Disease"
          subtitle="Distribution of patient records"
        >
          <ChartContainer>
            {diseases.length === 0 ? (
              <ChartEmpty />
            ) : (
              <ResponsiveContainer
                width="100%"
                height="100%"
              >
                <PieChart>
                  <Pie
                    data={diseases}
                    dataKey="patients"
                    nameKey="disease"
                    outerRadius={90}
                    label
                  >
                    {diseases.map(
                      (entry, index) => (
                        <Cell
                          key={`${entry.disease || "disease"}-${index}`}
                          fill={
                            COLORS[
                              index %
                                COLORS.length
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
      </div>

      {/* MEDICINE + NOTIFICATIONS */}

      <div className="analytics-grid">
        <AnalyticsPanel
          title="Medicine Usage"
          subtitle="Most frequently logged medicines"
        >
          <ChartContainer>
            {usage.length === 0 ? (
              <ChartEmpty />
            ) : (
              <ResponsiveContainer
                width="100%"
                height="100%"
              >
                <BarChart
                  data={usage}
                  layout="vertical"
                  margin={{
                    left: 30,
                    right: 15,
                  }}
                >
                  <CartesianGrid
                    strokeDasharray="3 3"
                    stroke="#e2e8f0"
                  />

                  <XAxis
                    type="number"
                    tick={{ fontSize: 12 }}
                  />

                  <YAxis
                    type="category"
                    dataKey="medicine"
                    width={110}
                    tick={{ fontSize: 12 }}
                  />

                  <Tooltip />

                  <Bar
                    dataKey="uses"
                    name="Doses logged"
                    fill="#6366f1"
                    radius={[
                      0,
                      6,
                      6,
                      0,
                    ]}
                  />
                </BarChart>
              </ResponsiveContainer>
            )}
          </ChartContainer>
        </AnalyticsPanel>

        <AnalyticsPanel
          title="Notification Trend"
          subtitle="Notification delivery activity"
        >
          <ChartContainer>
            {notificationTrend.length === 0 ? (
              <ChartEmpty />
            ) : (
              <ResponsiveContainer
                width="100%"
                height="100%"
              >
                <LineChart
                  data={notificationTrend}
                >
                  <CartesianGrid
                    strokeDasharray="3 3"
                    stroke="#e2e8f0"
                  />

                  <XAxis
                    dataKey="label"
                    tick={{ fontSize: 12 }}
                  />

                  <YAxis
                    tick={{ fontSize: 12 }}
                  />

                  <Tooltip />
                  <Legend />

                  <Line
                    type="monotone"
                    dataKey="sent"
                    name="Sent"
                    stroke="#10b981"
                    strokeWidth={2}
                  />

                  <Line
                    type="monotone"
                    dataKey="failed"
                    name="Failed"
                    stroke="#ef4444"
                    strokeWidth={2}
                  />
                </LineChart>
              </ResponsiveContainer>
            )}
          </ChartContainer>
        </AnalyticsPanel>
      </div>

      {/* WEEKLY + MONTHLY */}

      <div className="analytics-grid">
        <AnalyticsPanel
          title="Weekly Adherence"
          subtitle="Weekly adherence performance"
        >
          <ChartContainer>
            {weekly.length === 0 ? (
              <ChartEmpty />
            ) : (
              <ResponsiveContainer
                width="100%"
                height="100%"
              >
                <AreaChart data={weekly}>
                  <CartesianGrid
                    strokeDasharray="3 3"
                    stroke="#e2e8f0"
                  />

                  <XAxis
                    dataKey="label"
                    tick={{ fontSize: 12 }}
                  />

                  <YAxis
                    tick={{ fontSize: 12 }}
                    domain={[0, 100]}
                  />

                  <Tooltip />

                  <Area
                    type="monotone"
                    dataKey="adherence"
                    name="Weekly Adherence %"
                    stroke="#8b5cf6"
                    fill="#8b5cf6"
                    fillOpacity={0.2}
                    strokeWidth={2}
                  />
                </AreaChart>
              </ResponsiveContainer>
            )}
          </ChartContainer>
        </AnalyticsPanel>

        <AnalyticsPanel
          title="Monthly Adherence"
          subtitle="Monthly adherence performance"
        >
          <ChartContainer>
            {monthly.length === 0 ? (
              <ChartEmpty />
            ) : (
              <ResponsiveContainer
                width="100%"
                height="100%"
              >
                <LineChart data={monthly}>
                  <CartesianGrid
                    strokeDasharray="3 3"
                    stroke="#e2e8f0"
                  />

                  <XAxis
                    dataKey="label"
                    tick={{ fontSize: 12 }}
                  />

                  <YAxis
                    tick={{ fontSize: 12 }}
                    domain={[0, 100]}
                  />

                  <Tooltip />

                  <Line
                    type="monotone"
                    dataKey="adherence"
                    name="Monthly Adherence %"
                    stroke="#0ea5e9"
                    strokeWidth={2}
                  />
                </LineChart>
              </ResponsiveContainer>
            )}
          </ChartContainer>
        </AnalyticsPanel>
      </div>

      {/* MISSED + REFILL */}

      <div className="analytics-grid">
        <AnalyticsPanel
          title="Missed Dose Trend"
          subtitle="Missed doses over the reported period"
        >
          <ChartContainer>
            {missedTrend.length === 0 ? (
              <ChartEmpty />
            ) : (
              <ResponsiveContainer
                width="100%"
                height="100%"
              >
                <BarChart data={missedTrend}>
                  <CartesianGrid
                    strokeDasharray="3 3"
                    stroke="#e2e8f0"
                  />

                  <XAxis
                    dataKey="label"
                    tick={{ fontSize: 12 }}
                  />

                  <YAxis
                    tick={{ fontSize: 12 }}
                  />

                  <Tooltip />

                  <Bar
                    dataKey="missed"
                    name="Missed doses"
                    fill="#ef4444"
                    radius={[
                      6,
                      6,
                      0,
                      0,
                    ]}
                  />
                </BarChart>
              </ResponsiveContainer>
            )}
          </ChartContainer>
        </AnalyticsPanel>

        <AnalyticsPanel
          title="Refill Predictions"
          subtitle="Predicted refill activity"
        >
          <ChartContainer>
            {refillTrend.length === 0 ? (
              <ChartEmpty />
            ) : (
              <ResponsiveContainer
                width="100%"
                height="100%"
              >
                <BarChart
                  data={refillTrend}
                >
                  <CartesianGrid
                    strokeDasharray="3 3"
                    stroke="#e2e8f0"
                  />

                  <XAxis
                    dataKey="label"
                    tick={{ fontSize: 12 }}
                  />

                  <YAxis
                    tick={{ fontSize: 12 }}
                  />

                  <Tooltip />
                  <Legend />

                  <Bar
                    dataKey="predictions"
                    name="Predictions"
                    fill="#6366f1"
                    radius={[
                      6,
                      6,
                      0,
                      0,
                    ]}
                  />

                  <Bar
                    dataKey="critical"
                    name="Critical"
                    fill="#f59e0b"
                    radius={[
                      6,
                      6,
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

      {/* REMINDER + DELIVERY */}

      <div className="analytics-grid">
        <AnalyticsPanel
          title="Reminder Success Rate"
          subtitle="Successful reminder activity"
        >
          <ChartContainer>
            {reminder.length === 0 ? (
              <ChartEmpty />
            ) : (
              <ResponsiveContainer
                width="100%"
                height="100%"
              >
                <AreaChart data={reminder}>
                  <CartesianGrid
                    strokeDasharray="3 3"
                    stroke="#e2e8f0"
                  />

                  <XAxis
                    dataKey="label"
                    tick={{ fontSize: 12 }}
                  />

                  <YAxis
                    tick={{ fontSize: 12 }}
                    domain={[0, 100]}
                  />

                  <Tooltip />

                  <Area
                    type="monotone"
                    dataKey="success_rate"
                    name="Success %"
                    stroke="#10b981"
                    fill="#10b981"
                    fillOpacity={0.2}
                    strokeWidth={2}
                  />
                </AreaChart>
              </ResponsiveContainer>
            )}
          </ChartContainer>
        </AnalyticsPanel>

        <AnalyticsPanel
          title="Notification Delivery"
          subtitle="Sent versus failed notifications"
        >
          <ChartContainer>
            {notificationTrend.length === 0 ? (
              <ChartEmpty />
            ) : (
              <ResponsiveContainer
                width="100%"
                height="100%"
              >
                <BarChart
                  data={notificationTrend}
                >
                  <CartesianGrid
                    strokeDasharray="3 3"
                    stroke="#e2e8f0"
                  />

                  <XAxis
                    dataKey="label"
                    tick={{ fontSize: 12 }}
                  />

                  <YAxis
                    tick={{ fontSize: 12 }}
                  />

                  <Tooltip />
                  <Legend />

                  <Bar
                    dataKey="sent"
                    name="Sent"
                    fill="#10b981"
                    radius={[
                      6,
                      6,
                      0,
                      0,
                    ]}
                  />

                  <Bar
                    dataKey="failed"
                    name="Failed"
                    fill="#ef4444"
                    radius={[
                      6,
                      6,
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
    </div>
  );
};

/* =========================================================
   STAT CARD
========================================================= */

const AnalyticsStat = ({
  icon,
  value,
  label,
  tone,
}) => {
  return (
    <div className="analytics-stat-card">
      <div
        className={`analytics-stat-icon ${tone}`}
      >
        {icon}
      </div>

      <div className="analytics-stat-value">
        {value}
      </div>

      <div className="analytics-stat-label">
        {label}
      </div>
    </div>
  );
};

/* =========================================================
   MINI METRIC
========================================================= */

const MiniMetric = ({
  icon,
  label,
  value,
}) => {
  return (
    <div className="analytics-mini-card">
      <div className="analytics-mini-icon">
        {icon}
      </div>

      <div>
        <p>{label}</p>
        <strong>{value}</strong>
      </div>
    </div>
  );
};

/* =========================================================
   PANEL
========================================================= */

const AnalyticsPanel = ({
  title,
  subtitle,
  children,
}) => {
  return (
    <section className="analytics-panel">
      <div className="analytics-panel-header">
        <div>
          <p className="analytics-panel-kicker">
            Analytics
          </p>

          <h2>{title}</h2>

          <p>{subtitle}</p>
        </div>

        <Activity
          size={19}
          className="analytics-panel-icon"
        />
      </div>

      {children}
    </section>
  );
};

/* =========================================================
   CHART CONTAINER
========================================================= */

const ChartContainer = ({
  children,
}) => {
  return (
    <div className="analytics-chart">
      {children}
    </div>
  );
};

/* =========================================================
   EMPTY CHART
========================================================= */

const ChartEmpty = () => {
  return (
    <div className="chart-empty">
      <BarChart size={25} />

      <p>
        No analytics data available.
      </p>
    </div>
  );
};

/* =========================================================
   STYLES
========================================================= */

const adminAnalyticsStyles = `
  .admin-analytics-page {
    min-height: calc(100vh - 80px);
    padding: 28px;
    background: #f7f9fc;
    color: #172033;
  }

  .analytics-header {
    display: flex;
    align-items: flex-start;
    justify-content: space-between;
    gap: 20px;
    margin-bottom: 24px;
  }

  .analytics-eyebrow,
  .analytics-panel-kicker {
    margin: 0 0 6px;
    color: #0f9488;
    font-size: 11px;
    font-weight: 700;
    text-transform: uppercase;
    letter-spacing: .08em;
  }

  .analytics-header h1 {
    margin: 0;
    color: #172033;
    font-size: 30px;
    font-weight: 750;
  }

  .analytics-header p:last-child {
    margin: 7px 0 0;
    color: #697386;
    font-size: 14px;
  }

  .analytics-refresh-btn {
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

  .analytics-refresh-btn:hover {
    background: #f9fafb;
  }

  .analytics-stats {
    display: grid;
    grid-template-columns: repeat(4, minmax(0, 1fr));
    gap: 16px;
    margin-bottom: 16px;
  }

  .analytics-stat-card {
    padding: 18px;
    border: 1px solid #e7ebf0;
    border-radius: 14px;
    background: #fff;
    box-shadow: 0 2px 8px rgba(15, 23, 42, .03);
  }

  .analytics-stat-icon {
    display: flex;
    align-items: center;
    justify-content: center;
    width: 43px;
    height: 43px;
    margin-bottom: 15px;
    border-radius: 11px;
  }

  .analytics-stat-icon.blue {
    background: #eff6ff;
    color: #2563eb;
  }

  .analytics-stat-icon.teal {
    background: #e8f8f6;
    color: #0f9488;
  }

  .analytics-stat-icon.purple {
    background: #f5f3ff;
    color: #7c3aed;
  }

  .analytics-stat-icon.green {
    background: #ecfdf3;
    color: #039855;
  }

  .analytics-stat-value {
    font-size: 28px;
    line-height: 1;
    font-weight: 750;
    color: #172033;
  }

  .analytics-stat-label {
    margin-top: 7px;
    color: #697386;
    font-size: 13px;
  }

  .analytics-mini-grid {
    display: grid;
    grid-template-columns: repeat(4, minmax(0, 1fr));
    gap: 12px;
    margin-bottom: 18px;
  }

  .analytics-mini-card {
    display: flex;
    align-items: center;
    gap: 11px;
    padding: 13px;
    border: 1px solid #e7ebf0;
    border-radius: 11px;
    background: #fff;
  }

  .analytics-mini-icon {
    width: 38px;
    height: 38px;
    min-width: 38px;
    display: flex;
    align-items: center;
    justify-content: center;
    border-radius: 10px;
    background: #eef8f7;
    color: #0f9488;
  }

  .analytics-mini-card p {
    margin: 0;
    color: #7b8495;
    font-size: 11px;
  }

  .analytics-mini-card strong {
    display: block;
    margin-top: 3px;
    color: #172033;
    font-size: 16px;
  }

  .analytics-grid {
    display: grid;
    grid-template-columns: repeat(2, minmax(0, 1fr));
    gap: 18px;
    margin-bottom: 18px;
  }

  .analytics-panel {
    min-width: 0;
    padding: 20px;
    border: 1px solid #e7ebf0;
    border-radius: 14px;
    background: #fff;
    box-shadow: 0 2px 8px rgba(15, 23, 42, .03);
  }

  .analytics-panel-header {
    display: flex;
    align-items: flex-start;
    justify-content: space-between;
    gap: 15px;
    margin-bottom: 15px;
  }

  .analytics-panel-header h2 {
    margin: 0;
    color: #172033;
    font-size: 18px;
  }

  .analytics-panel-header > div > p:last-child {
    margin: 5px 0 0;
    color: #7b8495;
    font-size: 12px;
  }

  .analytics-panel-icon {
    color: #0f9488;
  }

  .analytics-chart {
    width: 100%;
    height: 285px;
  }

  .chart-empty {
    width: 100%;
    height: 100%;
    display: flex;
    align-items: center;
    justify-content: center;
    flex-direction: column;
    gap: 8px;
    color: #98a2b3;
  }

  .chart-empty p {
    margin: 0;
    font-size: 13px;
  }

  .analytics-error {
    display: flex;
    align-items: flex-start;
    gap: 10px;
    padding: 15px;
    border: 1px solid #fecaca;
    border-radius: 11px;
    background: #fff5f5;
    color: #b42318;
  }

  .analytics-error strong {
    font-size: 14px;
  }

  .analytics-error p {
    margin: 4px 0 0;
    font-size: 12px;
  }

  .analytics-loading {
    min-height: 60vh;
    display: flex;
    align-items: center;
    justify-content: center;
    flex-direction: column;
    color: #7b8495;
    font-size: 13px;
  }

  .analytics-spinner {
    width: 29px;
    height: 29px;
    margin-bottom: 12px;
    border: 3px solid #d8eeeb;
    border-top-color: #14b8a6;
    border-radius: 50%;
    animation: analytics-spin .7s linear infinite;
  }

  @keyframes analytics-spin {
    to {
      transform: rotate(360deg);
    }
  }

  @media (max-width: 1100px) {
    .analytics-stats,
    .analytics-mini-grid {
      grid-template-columns: repeat(2, minmax(0, 1fr));
    }
  }

  @media (max-width: 850px) {
    .admin-analytics-page {
      padding: 18px;
    }

    .analytics-grid {
      grid-template-columns: 1fr;
    }

    .analytics-header {
      flex-direction: column;
    }
  }

  @media (max-width: 560px) {
    .analytics-stats,
    .analytics-mini-grid {
      grid-template-columns: 1fr;
    }

    .analytics-header h1 {
      font-size: 25px;
    }

    .analytics-chart {
      height: 250px;
    }
  }
`;

export default AdminAnalytics;