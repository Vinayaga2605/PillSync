import { useEffect, useState } from "react";

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

import DashboardLayout from "../components/DashboardLayout";
import StatCard from "../components/StatCard";
import { fetchAdminAnalytics } from "../services/api";
import { ADMIN_MENU } from "../utils/menus";

const COLORS = ["#0ea5e9", "#6366f1", "#10b981", "#f59e0b", "#ef4444", "#8b5cf6"];

const AdminAnalytics = () => {
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  useEffect(() => {
    fetchAdminAnalytics()
      .then(setData)
      .catch((e) => setError(e.message))
      .finally(() => setLoading(false));
  }, []);

  if (loading) {
    return (
      <DashboardLayout role="Administrator" title="System Analytics" subtitle="Live analytics from PostgreSQL." menu={ADMIN_MENU}>
        <p className="empty">Loading analytics…</p>
      </DashboardLayout>
    );
  }

  if (error) {
    return (
      <DashboardLayout role="Administrator" title="System Analytics" subtitle="Live analytics from PostgreSQL." menu={ADMIN_MENU}>
        <p className="error-message">{error}</p>
      </DashboardLayout>
    );
  }

  const daily = data.adherence_daily || [];
  const weekly = data.adherence_weekly || [];
  const monthly = data.adherence_monthly || [];
  const usage = (data.medicine_usage || []).slice(0, 8);
  const trend = data.notification_trend || [];
  const missedTrend = data.missed_dose_trend || [];
  const refillTrend = data.refill_prediction_trend || [];
  const reminder = data.reminder_success_rate || [];
  const diseases = data.patients_by_disease || [];

  return (
    <DashboardLayout
      role="Administrator"
      title="System Analytics"
      subtitle="Live analytics from PostgreSQL."
      menu={ADMIN_MENU}
    >
      <div className="stats">
        <StatCard icon="👥" label="Total users" value={data.users} tone="primary" />
        <StatCard icon="💊" label="Medicines" value={data.medicines} tone="accent" />
        <StatCard icon="📅" label="Active schedules" value={data.schedules} tone="success" />
        <StatCard icon="✔️" label="Doses taken today" value={data.taken_today} tone="warning" />
      </div>

      <div className="grid">
        <section className="panel">
          <div className="panel__head">
            <h2 className="panel__title">Daily adherence (last 7 days)</h2>
          </div>
          <div className="chart-wrap">
            <ResponsiveContainer width="100%" height="100%">
              <AreaChart data={daily}>
                <defs>
                  <linearGradient id="adherence" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="0%" stopColor="#0ea5e9" stopOpacity={0.35} />
                    <stop offset="100%" stopColor="#0ea5e9" stopOpacity={0} />
                  </linearGradient>
                </defs>
                <CartesianGrid strokeDasharray="3 3" stroke="#e2e8f0" />
                <XAxis dataKey="label" tick={{ fontSize: 12 }} />
                <YAxis tick={{ fontSize: 12 }} domain={[0, 100]} />
                <Tooltip />
                <Area type="monotone" dataKey="adherence" name="Adherence %" stroke="#0ea5e9" fill="url(#adherence)" strokeWidth={2} />
              </AreaChart>
            </ResponsiveContainer>
          </div>
        </section>

        <section className="panel">
          <div className="panel__head">
            <h2 className="panel__title">Patients by disease</h2>
          </div>
          <div className="chart-wrap">
            <ResponsiveContainer width="100%" height="100%">
              <PieChart>
                <Pie data={diseases} dataKey="patients" nameKey="disease" outerRadius={90} label>
                  {diseases.map((entry, i) => (
                    <Cell key={i} fill={COLORS[i % COLORS.length]} />
                  ))}
                </Pie>
                <Tooltip />
                <Legend />
              </PieChart>
            </ResponsiveContainer>
          </div>
        </section>
      </div>

      <div className="grid">
        <section className="panel">
          <div className="panel__head">
            <h2 className="panel__title">Medicine usage</h2>
          </div>
          <div className="chart-wrap">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={usage} layout="vertical" margin={{ left: 30 }}>
                <CartesianGrid strokeDasharray="3 3" stroke="#e2e8f0" />
                <XAxis type="number" tick={{ fontSize: 12 }} />
                <YAxis type="category" dataKey="medicine" width={100} tick={{ fontSize: 12 }} />
                <Tooltip />
                <Bar dataKey="uses" name="Doses logged" fill="#6366f1" radius={[0, 6, 6, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </section>

        <section className="panel">
          <div className="panel__head">
            <h2 className="panel__title">Notification trend</h2>
          </div>
          <div className="chart-wrap">
            <ResponsiveContainer width="100%" height="100%">
              <LineChart data={trend}>
                <CartesianGrid strokeDasharray="3 3" stroke="#e2e8f0" />
                <XAxis dataKey="label" tick={{ fontSize: 12 }} />
                <YAxis tick={{ fontSize: 12 }} />
                <Tooltip />
                <Legend />
                <Line type="monotone" dataKey="sent" name="Sent" stroke="#10b981" strokeWidth={2} />
                <Line type="monotone" dataKey="failed" name="Failed" stroke="#ef4444" strokeWidth={2} />
              </LineChart>
            </ResponsiveContainer>
          </div>
        </section>
      </div>

      <div className="grid">
        <section className="panel">
          <div className="panel__head">
            <h2 className="panel__title">Weekly & monthly adherence</h2>
          </div>
          <div className="chart-wrap">
            <ResponsiveContainer width="100%" height="100%">
              <AreaChart data={weekly}>
                <CartesianGrid strokeDasharray="3 3" stroke="#e2e8f0" />
                <XAxis dataKey="label" tick={{ fontSize: 12 }} />
                <YAxis tick={{ fontSize: 12 }} domain={[0, 100]} />
                <Tooltip />
                <Area type="monotone" dataKey="adherence" name="Weekly Adherence %" stroke="#8b5cf6" fill="#8b5cf6" fillOpacity={0.2} strokeWidth={2} />
              </AreaChart>
            </ResponsiveContainer>
          </div>
        </section>

        <section className="panel">
          <div className="panel__head">
            <h2 className="panel__title">Monthly adherence</h2>
          </div>
          <div className="chart-wrap">
            <ResponsiveContainer width="100%" height="100%">
              <LineChart data={monthly}>
                <CartesianGrid strokeDasharray="3 3" stroke="#e2e8f0" />
                <XAxis dataKey="label" tick={{ fontSize: 12 }} />
                <YAxis tick={{ fontSize: 12 }} domain={[0, 100]} />
                <Tooltip />
                <Line type="monotone" dataKey="adherence" name="Monthly Adherence %" stroke="#0ea5e9" strokeWidth={2} />
              </LineChart>
            </ResponsiveContainer>
          </div>
        </section>
      </div>

      <div className="grid">
        <section className="panel">
          <div className="panel__head">
            <h2 className="panel__title">Missed dose trend</h2>
          </div>
          <div className="chart-wrap">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={missedTrend}>
                <CartesianGrid strokeDasharray="3 3" stroke="#e2e8f0" />
                <XAxis dataKey="label" tick={{ fontSize: 12 }} />
                <YAxis tick={{ fontSize: 12 }} />
                <Tooltip />
                <Bar dataKey="missed" name="Missed doses" fill="#ef4444" radius={[6, 6, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </section>

        <section className="panel">
          <div className="panel__head">
            <h2 className="panel__title">Refill predictions</h2>
          </div>
          <div className="chart-wrap">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={refillTrend}>
                <CartesianGrid strokeDasharray="3 3" stroke="#e2e8f0" />
                <XAxis dataKey="label" tick={{ fontSize: 12 }} />
                <YAxis tick={{ fontSize: 12 }} />
                <Tooltip />
                <Legend />
                <Bar dataKey="predictions" name="Predictions" fill="#6366f1" radius={[6, 6, 0, 0]} />
                <Bar dataKey="critical" name="Critical" fill="#f59e0b" radius={[6, 6, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </section>
      </div>

      <div className="grid">
        <section className="panel">
          <div className="panel__head">
            <h2 className="panel__title">Reminder success rate</h2>
          </div>
          <div className="chart-wrap">
            <ResponsiveContainer width="100%" height="100%">
              <AreaChart data={reminder}>
                <CartesianGrid strokeDasharray="3 3" stroke="#e2e8f0" />
                <XAxis dataKey="label" tick={{ fontSize: 12 }} />
                <YAxis tick={{ fontSize: 12 }} domain={[0, 100]} />
                <Tooltip />
                <Area type="monotone" dataKey="success_rate" name="Success %" stroke="#10b981" fill="#10b981" fillOpacity={0.2} strokeWidth={2} />
              </AreaChart>
            </ResponsiveContainer>
          </div>
        </section>

        <section className="panel">
          <div className="panel__head">
            <h2 className="panel__title">Notification delivery</h2>
          </div>
          <div className="chart-wrap">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={refillTrend}>
                <CartesianGrid strokeDasharray="3 3" stroke="#e2e8f0" />
                <XAxis dataKey="label" tick={{ fontSize: 12 }} />
                <YAxis tick={{ fontSize: 12 }} />
                <Tooltip />
                <Legend />
                <Bar dataKey="sent" name="Sent" fill="#10b981" radius={[6, 6, 0, 0]} />
                <Bar dataKey="failed" name="Failed" fill="#ef4444" radius={[6, 6, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </section>
      </div>
    </DashboardLayout>
  );
};

export default AdminAnalytics;