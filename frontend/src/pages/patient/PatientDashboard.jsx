import React, { useState, useEffect, useContext } from "react";
import { AuthContext } from "../../context/AuthContext";
import medicationService from "../../services/medicationService";
import reminderService from "../../services/reminderService";
import refillService from "../../services/refillService";

const PatientDashboard = () => {
  const { user } = useContext(AuthContext);

  const [medicines, setMedicines] = useState([]);
  const [reminders, setReminders] = useState([]);
  const [refillAlerts, setRefillAlerts] = useState([]);
  const [adherence, setAdherence] = useState({ percentage: 0, taken: 0, missed: 0, total: 0 });
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [activeTab, setActiveTab] = useState("today");

  useEffect(() => {
    fetchDashboardData();
  }, []);

  const fetchDashboardData = async () => {
    setLoading(true);
    setError(null);
    try {
      const [medsRes, remindersRes, refillsRes, adherenceRes] = await Promise.all([
        medicationService.getActiveMedicines(),
        reminderService.getTodayReminders(),
        refillService.getRefillAlerts(),
        medicationService.getAdherenceSummary(),
      ]);

      setMedicines(medsRes.data || []);
      setReminders(remindersRes.data || []);
      setRefillAlerts(refillsRes.data || []);
      setAdherence(adherenceRes.data || { percentage: 0, taken: 0, missed: 0, total: 0 });
    } catch (err) {
      console.error("Dashboard load failed:", err);
      setError("Unable to load your dashboard. Please try again.");
    } finally {
      setLoading(false);
    }
  };

  const handleReminderAction = async (reminderId, action) => {
    try {
      await reminderService.updateReminderStatus(reminderId, action);
      setReminders((prev) =>
        prev.map((r) => (r.id === reminderId ? { ...r, status: action } : r))
      );
      if (action === "taken" || action === "missed") {
        const summary = await medicationService.getAdherenceSummary();
        setAdherence(summary.data);
      }
    } catch (err) {
      console.error("Failed to update reminder:", err);
    }
  };

  const pendingReminders = reminders.filter((r) => r.status === "pending");
  const completedReminders = reminders.filter((r) => r.status !== "pending");

  if (loading) {
    return (
      <div className="dashboard-loading">
        <div className="spinner" />
        <p>Loading your dashboard…</p>
      </div>
    );
  }

  if (error) {
    return (
      <div className="dashboard-error">
        <p>{error}</p>
        <button onClick={fetchDashboardData}>Retry</button>
      </div>
    );
  }

  return (
    <div className="patient-dashboard">
      <header className="dashboard-header">
        <div>
          <h1>Welcome back, {user?.username || user?.name || "Patient"}</h1>
          <p className="subtitle">Here's your medication overview for today</p>
        </div>
      </header>

      <section className="summary-cards">
        <SummaryCard label="Today's Doses" value={`${reminders.length}`} sub={`${pendingReminders.length} pending`} tone="blue" />
        <SummaryCard label="Adherence" value={`${adherence.percentage}%`} sub={`${adherence.taken}/${adherence.total} taken`} tone={adherence.percentage >= 80 ? "green" : "amber"} />
        <SummaryCard label="Active Medicines" value={medicines.length} sub="currently tracked" tone="purple" />
        <SummaryCard label="Refill Alerts" value={refillAlerts.length} sub="need attention" tone={refillAlerts.length > 0 ? "red" : "green"} />
      </section>

      {refillAlerts.length > 0 && (
        <section className="refill-banner">
          {refillAlerts.map((alert) => (
            <div key={alert.id} className="refill-alert-item">
              ?? Your <strong>{alert.medicineName}</strong> is expected to finish in <strong>{alert.daysRemaining} days</strong>. Please arrange a refill.
            </div>
          ))}
        </section>
      )}

      <nav className="dashboard-tabs">
        <button className={activeTab === "today" ? "active" : ""} onClick={() => setActiveTab("today")}>Today's Reminders</button>
        <button className={activeTab === "medicines" ? "active" : ""} onClick={() => setActiveTab("medicines")}>My Medicines</button>
        <button className={activeTab === "history" ? "active" : ""} onClick={() => setActiveTab("history")}>History</button>
      </nav>

      {activeTab === "today" && (
        <section className="reminders-section">
          <h2>Pending ({pendingReminders.length})</h2>
          {pendingReminders.length === 0 ? (
            <p className="empty-state">No pending doses right now ??</p>
          ) : (
            <div className="reminder-list">
              {pendingReminders.map((r) => (
                <ReminderCard key={r.id} reminder={r} onAction={handleReminderAction} />
              ))}
            </div>
          )}

          {completedReminders.length > 0 && (
            <>
              <h2>Completed Today</h2>
              <div className="reminder-list">
                {completedReminders.map((r) => (
                  <ReminderCard key={r.id} reminder={r} onAction={handleReminderAction} readOnly />
                ))}
              </div>
            </>
          )}
        </section>
      )}

      {activeTab === "medicines" && (
        <section className="medicines-section">
          <div className="section-header">
            <h2>Active Medicines</h2>
            <a href="/medicines" className="btn-primary">+ Manage Medicines</a>
          </div>
          {medicines.length === 0 ? (
            <p className="empty-state">No medicines added yet. Upload a prescription to get started.</p>
          ) : (
            <div className="medicine-grid">
              {medicines.map((med) => (
                <MedicineCard key={med.id} medicine={med} />
              ))}
            </div>
          )}
        </section>
      )}

      {activeTab === "history" && (
        <section className="history-section">
          <h2>Medication History</h2>
          <p className="empty-state">Visit the Medicines page and open a medicine to see its dose history.</p>
        </section>
      )}
    </div>
  );
};

const SummaryCard = ({ label, value, sub, tone }) => (
  <div className={`summary-card tone-${tone}`}>
    <p className="summary-label">{label}</p>
    <h3 className="summary-value">{value}</h3>
    <p className="summary-sub">{sub}</p>
  </div>
);

const ReminderCard = ({ reminder, onAction, readOnly }) => (
  <div className={`reminder-card status-${reminder.status}`}>
    <div className="reminder-info">
      <h4>{reminder.medicineName}</h4>
      <p>{reminder.dosage} • {reminder.time}</p>
      {reminder.instructions && <p className="instructions">{reminder.instructions}</p>}
    </div>
    {!readOnly && (
      <div className="reminder-actions">
        <button className="btn-taken" onClick={() => onAction(reminder.id, "taken")}>Taken</button>
        <button className="btn-missed" onClick={() => onAction(reminder.id, "missed")}>Missed</button>
        <button className="btn-snooze" onClick={() => onAction(reminder.id, "snoozed")}>Snooze</button>
      </div>
    )}
    {readOnly && <span className={`status-badge ${reminder.status}`}>{reminder.status}</span>}
  </div>
);

const MedicineCard = ({ medicine }) => (
  <div className="medicine-card">
    <h4>{medicine.name}</h4>
    <p>{medicine.dosage}</p>
    <p className="medicine-freq">{medicine.frequency}</p>
    <div className="stock-bar">
      <div
        className="stock-fill"
        style={{ width: `${Math.min(100, (medicine.remaining_stock / (medicine.total_stock || 1)) * 100)}%` }}
      />
    </div>
    <p className="stock-text">{medicine.remaining_stock} of {medicine.total_stock} remaining</p>
  </div>
);

export default PatientDashboard;
