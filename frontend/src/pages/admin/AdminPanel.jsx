import React, { useState, useEffect } from "react";
import adminService from "../../services/adminService";

const AdminPanel = () => {
  const [activeTab, setActiveTab] = useState("dashboard");
  const [stats, setStats] = useState(null);
  const [users, setUsers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
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
      setUsers(usersRes.data?.users || []);
    } catch (err) {
      console.error("Admin data load failed:", err);
      setError("Unable to load admin data. You may not have admin access.");
    } finally {
      setLoading(false);
    }
  };

  const handleRefresh = async () => {
    setRefreshing(true);
    setError("");

    try {
      const [statsRes, usersRes] = await Promise.all([
        adminService.getSystemStats(),
        adminService.getUsers(),
      ]);

      setStats(statsRes.data);
      setUsers(usersRes.data?.users || []);
    } catch (err) {
      console.error("Admin refresh failed:", err);
      setError("Failed to refresh admin data.");
    } finally {
      setRefreshing(false);
    }
  };

  const handleToggleActive = async (userId) => {
    try {
      const res = await adminService.toggleUserActive(userId);

      setUsers((prev) =>
        prev.map((user) =>
          user.id === userId
            ? { ...user, isActive: res.data.isActive }
            : user
        )
      );
    } catch (err) {
      console.error("Failed to toggle user:", err);
      setError("Could not update user status.");
    }
  };

  const getAdherenceLabel = (value) => {
    if (value >= 90) return "Excellent";
    if (value >= 75) return "Good";
    if (value >= 50) return "Needs attention";
    return "Critical";
  };

  if (loading) {
    return (
      <div className="dashboard-loading">
        <div className="spinner" />
        <p>Loading admin panel...</p>
      </div>
    );
  }

  if (error && !stats) {
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
        <div>
          <h1>Admin Panel</h1>
          <p className="subtitle">
            Manage users and monitor PillSync system activity.
          </p>
        </div>

        <button
          className="btn-primary"
          onClick={handleRefresh}
          disabled={refreshing}
        >
          {refreshing ? "Refreshing..." : "Refresh"}
        </button>
      </header>

      {error && (
        <div className="upload-error">
          {error}
        </div>
      )}

      <section className="report-section">
        <div className="report-toggle">
          <button
            className={activeTab === "dashboard" ? "active" : ""}
            onClick={() => setActiveTab("dashboard")}
          >
            Dashboard
          </button>

          <button
            className={activeTab === "users" ? "active" : ""}
            onClick={() => setActiveTab("users")}
          >
            Users
          </button>

          <button
            className={activeTab === "reports" ? "active" : ""}
            onClick={() => setActiveTab("reports")}
          >
            Reports
          </button>

          <button
            className={activeTab === "system" ? "active" : ""}
            onClick={() => setActiveTab("system")}
          >
            System Analytics
          </button>
        </div>
      </section>

      {/* DASHBOARD */}
      {activeTab === "dashboard" && stats && (
        <>
          <section className="stat-cards">
            <div className="stat-card tone-blue">
              <p className="stat-card-label">Total Users</p>
              <h3 className="stat-card-value">{stats.totalUsers}</h3>
              <p className="stat-card-helper">Registered accounts</p>
            </div>

            <div className="stat-card tone-green">
              <p className="stat-card-label">Patients</p>
              <h3 className="stat-card-value">{stats.totalPatients}</h3>
              <p className="stat-card-helper">Patient accounts</p>
            </div>

            <div className="stat-card tone-purple">
              <p className="stat-card-label">Caregivers</p>
              <h3 className="stat-card-value">{stats.totalCaregivers}</h3>
              <p className="stat-card-helper">Caregiver accounts</p>
            </div>
          </section>

          <section className="stat-cards">
            <div className="stat-card tone-blue">
              <p className="stat-card-label">Administrators</p>
              <h3 className="stat-card-value">{stats.totalAdmins}</h3>
              <p className="stat-card-helper">Admin accounts</p>
            </div>

            <div className="stat-card tone-green">
              <p className="stat-card-label">Medications</p>
              <h3 className="stat-card-value">
                {stats.totalMedications}
              </h3>
              <p className="stat-card-helper">Medicines tracked</p>
            </div>

            <div className="stat-card tone-green">
              <p className="stat-card-label">Overall Adherence</p>
              <h3 className="stat-card-value">
                {stats.overallAdherence}%
              </h3>
              <p className="stat-card-helper">
                {getAdherenceLabel(stats.overallAdherence)}
              </p>
            </div>
          </section>

          <section className="report-section">
            <h2>System Overview</h2>

            <div className="stat-cards">
              <div className="stat-card">
                <p className="stat-card-label">Patients / Users</p>
                <h3 className="stat-card-value">
                  {stats.totalUsers
                    ? Math.round(
                        (stats.totalPatients / stats.totalUsers) * 100
                      )
                    : 0}
                  %
                </h3>
                <p className="stat-card-helper">
                  Share of registered users
                </p>
              </div>

              <div className="stat-card">
                <p className="stat-card-label">Caregivers / Users</p>
                <h3 className="stat-card-value">
                  {stats.totalUsers
                    ? Math.round(
                        (stats.totalCaregivers / stats.totalUsers) * 100
                      )
                    : 0}
                  %
                </h3>
                <p className="stat-card-helper">
                  Caregiver account share
                </p>
              </div>

              <div className="stat-card">
                <p className="stat-card-label">Medication Coverage</p>
                <h3 className="stat-card-value">
                  {stats.totalPatients > 0
                    ? Math.round(
                        stats.totalMedications / stats.totalPatients
                      )
                    : 0}
                </h3>
                <p className="stat-card-helper">
                  Avg. medicines per patient
                </p>
              </div>
            </div>
          </section>
        </>
      )}

      {/* USERS */}
      {activeTab === "users" && (
        <section className="refill-stats-section">
          <div className="section-header-row">
            <div>
              <h2>All Users</h2>
              <p className="subtitle">
                Manage registered users and account status.
              </p>
            </div>

            <span className="badge badge--accent">
              {users.length} users
            </span>
          </div>

          {users.length === 0 ? (
            <p className="empty-state">No users found.</p>
          ) : (
            <div className="table-responsive">
              <table className="refill-table">
                <thead>
                  <tr>
                    <th>Username</th>
                    <th>Email</th>
                    <th>Role</th>
                    <th>Joined</th>
                    <th>Status</th>
                    <th>Action</th>
                  </tr>
                </thead>

                <tbody>
                  {users.map((user) => (
                    <tr key={user.id}>
                      <td>
                        <strong>{user.username}</strong>
                      </td>

                      <td>{user.email || "-"}</td>

                      <td style={{ textTransform: "capitalize" }}>
                        {user.role}
                      </td>

                      <td>{user.dateJoined}</td>

                      <td>
                        <span
                          className={`badge ${
                            user.isActive
                              ? "badge--success"
                              : "badge--danger"
                          }`}
                        >
                          {user.isActive ? "Active" : "Deactivated"}
                        </span>
                      </td>

                      <td>
                        <button
                          onClick={() => handleToggleActive(user.id)}
                        >
                          {user.isActive ? "Deactivate" : "Activate"}
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </section>
      )}

      {/* REPORTS */}
      {activeTab === "reports" && stats && (
        <section className="report-section">
          <h2>System Report</h2>

          <div className="stat-cards">
            <div className="stat-card">
              <p className="stat-card-label">Total Users</p>
              <h3 className="stat-card-value">
                {stats.totalUsers}
              </h3>
            </div>

            <div className="stat-card">
              <p className="stat-card-label">Patients</p>
              <h3 className="stat-card-value">
                {stats.totalPatients}
              </h3>
            </div>

            <div className="stat-card">
              <p className="stat-card-label">Caregivers</p>
              <h3 className="stat-card-value">
                {stats.totalCaregivers}
              </h3>
            </div>

            <div className="stat-card">
              <p className="stat-card-label">Medications</p>
              <h3 className="stat-card-value">
                {stats.totalMedications}
              </h3>
            </div>
          </div>

          <div className="report-section">
            <h3>Adherence Summary</h3>

            <div className="stat-card">
              <p className="stat-card-label">
                Overall medication adherence
              </p>

              <h3 className="stat-card-value">
                {stats.overallAdherence}%
              </h3>

              <p className="stat-card-helper">
                Current system-wide adherence based on recorded doses.
              </p>
            </div>
          </div>
        </section>
      )}

      {/* SYSTEM ANALYTICS */}
      {activeTab === "system" && stats && (
        <section className="report-section">
          <h2>System Analytics</h2>

          <div className="stat-cards">
            <div className="stat-card tone-blue">
              <p className="stat-card-label">
                Total Medications Tracked
              </p>
              <h3 className="stat-card-value">
                {stats.totalMedications}
              </h3>
            </div>

            <div className="stat-card tone-green">
              <p className="stat-card-label">
                System Adherence Rate
              </p>
              <h3 className="stat-card-value">
                {stats.overallAdherence}%
              </h3>
            </div>

            <div className="stat-card tone-purple">
              <p className="stat-card-label">
                Patients
              </p>
              <h3 className="stat-card-value">
                {stats.totalPatients}
              </h3>
            </div>

            <div className="stat-card tone-blue">
              <p className="stat-card-label">
                Caregivers
              </p>
              <h3 className="stat-card-value">
                {stats.totalCaregivers}
              </h3>
            </div>
          </div>

          <div className="report-section">
            <h3>Platform Health Summary</h3>

            <div className="list">
              <div className="list-item">
                <div className="list-item__body">
                  <p className="list-item__name">
                    User Management
                  </p>
                  <p className="list-item__desc">
                    {stats.totalUsers} registered accounts
                  </p>
                </div>

                <span className="badge badge--success">
                  Operational
                </span>
              </div>

              <div className="list-item">
                <div className="list-item__body">
                  <p className="list-item__name">
                    Medication Tracking
                  </p>
                  <p className="list-item__desc">
                    {stats.totalMedications} medicines tracked
                  </p>
                </div>

                <span className="badge badge--success">
                  Operational
                </span>
              </div>

              <div className="list-item">
                <div className="list-item__body">
                  <p className="list-item__name">
                    Adherence Monitoring
                  </p>
                  <p className="list-item__desc">
                    {stats.overallAdherence}% overall adherence
                  </p>
                </div>

                <span className="badge badge--success">
                  Monitoring
                </span>
              </div>
            </div>
          </div>
        </section>
      )}
    </div>
  );
};

export default AdminPanel;



