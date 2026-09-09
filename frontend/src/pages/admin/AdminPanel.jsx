import React, { useState, useEffect } from "react";
import adminService from "../../services/adminService";

const AdminPanel = () => {
  const [activeTab, setActiveTab] = useState("dashboard");
  const [stats, setStats] = useState(null);
  const [users, setUsers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  useEffect(() => {
    fetchAll();
  }, []);

  const fetchAll = async () => {
    setLoading(true);
    setError("");
    try {
      const [statsRes, usersRes] = await Promise.all([
        adminService.getSystemStats(),
        adminService.getUsers(),
      ]);
      setStats(statsRes.data);
      setUsers(usersRes.data || []);
    } catch (err) {
      console.error("Admin data load failed:", err);
      setError("Unable to load admin data. You may not have admin access.");
    } finally {
      setLoading(false);
    }
  };

  const handleToggleActive = async (userId) => {
    try {
      const res = await adminService.toggleUserActive(userId);
      setUsers((prev) =>
        prev.map((u) => (u.id === userId ? { ...u, isActive: res.data.isActive } : u))
      );
    } catch (err) {
      console.error("Failed to toggle user:", err);
    }
  };

  if (loading) {
    return (
      <div className="dashboard-loading">
        <div className="spinner" />
        <p>Loading admin panel…</p>
      </div>
    );
  }

  if (error) {
    return (
      <div className="dashboard-error">
        <p>{error}</p>
        <button onClick={fetchAll}>Retry</button>
      </div>
    );
  }

  return (
    <div className="analytics-dashboard">
      <header className="dashboard-header">
        <h1>Admin Panel</h1>
        <p className="subtitle">Manage users and monitor system health</p>
      </header>

      <section className="report-section">
        <div className="report-toggle">
          <button className={activeTab === "dashboard" ? "active" : ""} onClick={() => setActiveTab("dashboard")}>Dashboard</button>
          <button className={activeTab === "users" ? "active" : ""} onClick={() => setActiveTab("users")}>Users</button>
          <button className={activeTab === "reports" ? "active" : ""} onClick={() => setActiveTab("reports")}>Reports</button>
          <button className={activeTab === "system" ? "active" : ""} onClick={() => setActiveTab("system")}>System Analytics</button>
        </div>
      </section>

      {activeTab === "dashboard" && stats && (
        <section className="stat-cards">
          <div className="stat-card tone-blue"><p className="stat-card-label">Total Users</p><h3 className="stat-card-value">{stats.totalUsers}</h3></div>
          <div className="stat-card tone-green"><p className="stat-card-label">Patients</p><h3 className="stat-card-value">{stats.totalPatients}</h3></div>
          <div className="stat-card tone-purple"><p className="stat-card-label">Caregivers</p><h3 className="stat-card-value">{stats.totalCaregivers}</h3></div>
          <div className="stat-card tone-green"><p className="stat-card-label">Overall Adherence</p><h3 className="stat-card-value">{stats.overallAdherence}%</h3></div>
        </section>
      )}

      {activeTab === "users" && (
        <section className="refill-stats-section">
          <h2>All Users</h2>
          <table className="refill-table">
            <thead>
              <tr><th>Username</th><th>Email</th><th>Role</th><th>Joined</th><th>Status</th><th>Action</th></tr>
            </thead>
            <tbody>
              {users.map((u) => (
                <tr key={u.id}>
                  <td>{u.username}</td>
                  <td>{u.email || "—"}</td>
                  <td style={{ textTransform: "capitalize" }}>{u.role}</td>
                  <td>{u.dateJoined}</td>
                  <td>{u.isActive ? "Active" : "Deactivated"}</td>
                  <td>
                    <button onClick={() => handleToggleActive(u.id)}>
                      {u.isActive ? "Deactivate" : "Activate"}
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </section>
      )}

      {activeTab === "reports" && (
        <section className="refill-stats-section">
          <h2>Reports</h2>
          <p className="empty-state">
            Detailed adherence and refill reports are available per-patient in the Analytics module.
          </p>
        </section>
      )}

      {activeTab === "system" && stats && (
        <section className="stat-cards">
          <div className="stat-card tone-blue"><p className="stat-card-label">Total Medications Tracked</p><h3 className="stat-card-value">{stats.totalMedications}</h3></div>
          <div className="stat-card tone-green"><p className="stat-card-label">System Adherence Rate</p><h3 className="stat-card-value">{stats.overallAdherence}%</h3></div>
        </section>
      )}
    </div>
  );
};

export default AdminPanel;
