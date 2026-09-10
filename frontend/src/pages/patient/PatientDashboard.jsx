import React, {
  useContext,
  useEffect,
  useState,
} from "react";
import { useNavigate } from "react-router-dom";
import {
  Activity,
  Bell,
  CheckCircle2,
  Clock3,
  FileText,
  Pill,
  RefreshCw,
  AlertTriangle,
  ArrowRight,
} from "lucide-react";

import { AuthContext } from "../../context/AuthContext";
import medicationService from "../../services/medicationService";
import reminderService from "../../services/reminderService";
import refillService from "../../services/refillService";

/* =========================================================
   HELPERS
========================================================= */

const unwrap = (response) => {
  const data = response?.data;

  if (Array.isArray(data)) {
    return data;
  }

  if (Array.isArray(data?.results)) {
    return data.results;
  }

  return data || [];
};

const getMedicineName = (item) =>
  item?.medicineName ||
  item?.medicine_name ||
  item?.medication_name ||
  item?.medication?.name ||
  "Medicine";

const getDosage = (item) =>
  item?.dosage ||
  item?.medication?.dosage ||
  "-";

const getTime = (item) =>
  item?.time ||
  item?.time_label ||
  "--:--";

const getStatus = (item) =>
  String(item?.status || "pending").toLowerCase();

/* =========================================================
   MAIN COMPONENT
========================================================= */

const PatientDashboard = () => {
  const { user } = useContext(AuthContext);
  const navigate = useNavigate();

  const [medicines, setMedicines] = useState([]);
  const [reminders, setReminders] = useState([]);
  const [refillAlerts, setRefillAlerts] = useState([]);

  const [adherence, setAdherence] = useState({
    percentage: 0,
    taken: 0,
    missed: 0,
    total: 0,
  });

  const [loading, setLoading] = useState(true);
  const [actionLoading, setActionLoading] =
    useState(null);
  const [error, setError] = useState("");
  const [activeTab, setActiveTab] = useState("today");

  const userName =
    user?.username ||
    user?.name ||
    user?.email ||
    "Patient";

  /* =======================================================
     LOAD DASHBOARD
  ======================================================= */

  const fetchDashboardData = async () => {
    try {
      setLoading(true);
      setError("");

      const [
        medicinesResponse,
        remindersResponse,
        refillResponse,
        adherenceResponse,
      ] = await Promise.all([
        medicationService.getActiveMedicines(),
        reminderService.getTodayReminders(),
        refillService.getRefillAlerts(),
        medicationService.getAdherenceSummary(),
      ]);

      setMedicines(unwrap(medicinesResponse));
      setReminders(unwrap(remindersResponse));
      setRefillAlerts(unwrap(refillResponse));

      const adherenceData =
        adherenceResponse?.data || {};

      setAdherence({
        percentage:
          Number(adherenceData.percentage) || 0,
        taken:
          Number(adherenceData.taken) || 0,
        missed:
          Number(adherenceData.missed) || 0,
        total:
          Number(adherenceData.total) || 0,
      });
    } catch (err) {
      console.error(
        "Patient dashboard load failed:",
        err
      );

      setError(
        "Unable to load your dashboard. Please try again."
      );
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchDashboardData();

    const handleScheduleUpdate = () => {
      fetchDashboardData();
    };

    window.addEventListener(
      "pillsync-schedule-updated",
      handleScheduleUpdate
    );

    return () => {
      window.removeEventListener(
        "pillsync-schedule-updated",
        handleScheduleUpdate
      );
    };
  }, []);

  /* =======================================================
     REMINDER ACTION
  ======================================================= */

  const handleReminderAction = async (
    reminderId,
    action
  ) => {
    try {
      setActionLoading(reminderId);
      setError("");

      await reminderService.updateReminderStatus(
        reminderId,
        action
      );

      await fetchDashboardData();

      window.dispatchEvent(
        new Event("pillsync-schedule-updated")
      );
    } catch (err) {
      console.error(
        "Failed to update reminder:",
        err
      );

      setError(
        "Unable to update the dose. Please try again."
      );
    } finally {
      setActionLoading(null);
    }
  };

  /* =======================================================
     DERIVED DATA
  ======================================================= */

  const pendingReminders = reminders.filter(
    (reminder) =>
      getStatus(reminder) === "pending"
  );

  const completedReminders = reminders.filter(
    (reminder) =>
      getStatus(reminder) !== "pending"
  );

  const takenToday = reminders.filter(
    (reminder) =>
      getStatus(reminder) === "taken"
  ).length;

  const nextDose =
    [...pendingReminders].sort((a, b) =>
      getTime(a).localeCompare(getTime(b))
    )[0] || null;

  /* =======================================================
     LOADING
  ======================================================= */

  if (loading) {
    return (
      <div className="patient-dashboard-page">
        <style>{dashboardStyles}</style>

        <div className="dashboard-state">
          <div className="loading-spinner" />
          <p>Loading your dashboard...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="patient-dashboard-page">
      <style>{dashboardStyles}</style>

      {/* HEADER */}

      <header className="dashboard-header">
        <div>
          <p className="dashboard-eyebrow">
            Patient Dashboard
          </p>

          <h1>
            Welcome back, {userName}
          </h1>

          <p className="dashboard-subtitle">
            Here is your medication overview for
            today.
          </p>
        </div>

        <button
          className="header-action"
          onClick={() =>
            navigate("/notifications")
          }
        >
          <Bell size={18} />
          Notifications
        </button>
      </header>

      {/* ERROR */}

      {error && (
        <div className="dashboard-error">
          <AlertTriangle size={18} />
          <span>{error}</span>

          <button
            onClick={fetchDashboardData}
          >
            Retry
          </button>
        </div>
      )}

      {/* SUMMARY CARDS */}

      <section className="summary-grid">
        <SummaryCard
          icon={<Pill size={21} />}
          label="Today's Doses"
          value={reminders.length}
          sub={`${pendingReminders.length} pending`}
          className="primary"
        />

        <SummaryCard
          icon={<CheckCircle2 size={21} />}
          label="Taken Today"
          value={takenToday}
          sub={`${Math.max(
            reminders.length - takenToday,
            0
          )} remaining`}
          className="success"
        />

        <SummaryCard
          icon={<Activity size={21} />}
          label="Adherence"
          value={`${adherence.percentage}%`}
          sub={`${adherence.taken}/${adherence.total} taken`}
          className={
            adherence.percentage >= 80
              ? "success"
              : "warning"
          }
        />

        <SummaryCard
          icon={<RefreshCw size={21} />}
          label="Refill Alerts"
          value={refillAlerts.length}
          sub={
            refillAlerts.length > 0
              ? "Need attention"
              : "Stock looks good"
          }
          className={
            refillAlerts.length > 0
              ? "danger"
              : "success"
          }
        />
      </section>

      {/* NEXT DOSE */}

      {nextDose && (
        <section className="dashboard-panel next-dose-panel">
          <div className="panel-header">
            <div>
              <p className="section-kicker">
                Up next
              </p>

              <h2>
                Next Dose
              </h2>

              <p>
                Your next scheduled medication
              </p>
            </div>

            <span className="status-pill pending">
              Pending
            </span>
          </div>

          <div className="next-dose-content">
            <div className="medicine-icon-large">
              <Pill size={26} />
            </div>

            <div className="next-dose-info">
              <h3>
                {getMedicineName(nextDose)}
              </h3>

              <p>
                {getDosage(nextDose)}
                <span> | </span>
                {getTime(nextDose)}
              </p>

              {nextDose.instructions && (
                <span className="instructions">
                  {nextDose.instructions}
                </span>
              )}
            </div>

            <button
              className="take-button"
              disabled={
                actionLoading === nextDose.id
              }
              onClick={() =>
                handleReminderAction(
                  nextDose.id,
                  "taken"
                )
              }
            >
              <CheckCircle2 size={17} />

              {actionLoading === nextDose.id
                ? "Updating..."
                : "Mark as taken"}
            </button>
          </div>
        </section>
      )}

      {/* REFILL ALERTS */}

      {refillAlerts.length > 0 && (
        <section className="refill-section">
          {refillAlerts.map((alert) => (
            <div
              className="refill-alert"
              key={alert.id}
            >
              <AlertTriangle size={19} />

              <p>
                Your{" "}
                <strong>
                  {alert.medicineName ||
                    alert.medicine_name ||
                    "medicine"}
                </strong>{" "}
                is expected to finish in{" "}
                <strong>
                  {alert.daysRemaining ??
                    alert.days_remaining ??
                    "-"}{" "}
                  days
                </strong>
                . Please arrange a refill.
              </p>
            </div>
          ))}
        </section>
      )}

      {/* TABS */}

      <div className="dashboard-tabs">
        <button
          className={
            activeTab === "today"
              ? "active"
              : ""
          }
          onClick={() =>
            setActiveTab("today")
          }
        >
          Today's Reminders
        </button>

        <button
          className={
            activeTab === "medicines"
              ? "active"
              : ""
          }
          onClick={() =>
            setActiveTab("medicines")
          }
        >
          My Medicines
        </button>

        <button
          className={
            activeTab === "history"
              ? "active"
              : ""
          }
          onClick={() =>
            setActiveTab("history")
          }
        >
          History
        </button>
      </div>

      {/* TODAY TAB */}

      {activeTab === "today" && (
        <section className="dashboard-panel">
          <div className="panel-header">
            <div>
              <p className="section-kicker">
                Medication plan
              </p>

              <h2>
                Today's Schedule
              </h2>

              <p>
                {takenToday} of {reminders.length}{" "}
                doses completed
              </p>
            </div>

            <button
              className="view-link"
              onClick={() =>
                navigate("/reminders")
              }
            >
              View reminders
              <ArrowRight size={16} />
            </button>
          </div>

          {reminders.length === 0 ? (
            <EmptyState
              icon={<Clock3 size={25} />}
              title="No medicines scheduled"
              description="You don't have any medication doses scheduled for today."
              action="Manage Medicines"
              onAction={() =>
                navigate("/medicines")
              }
            />
          ) : (
            <div className="reminder-list">
              {pendingReminders.length > 0 && (
                <>
                  <h3 className="list-heading">
                    Pending (
                    {pendingReminders.length})
                  </h3>

                  {pendingReminders.map(
                    (reminder) => (
                      <ReminderCard
                        key={reminder.id}
                        reminder={reminder}
                        actionLoading={
                          actionLoading
                        }
                        onAction={
                          handleReminderAction
                        }
                      />
                    )
                  )}
                </>
              )}

              {completedReminders.length > 0 && (
                <>
                  <h3 className="list-heading completed-heading">
                    Completed Today
                  </h3>

                  {completedReminders.map(
                    (reminder) => (
                      <ReminderCard
                        key={reminder.id}
                        reminder={reminder}
                        readOnly
                      />
                    )
                  )}
                </>
              )}
            </div>
          )}
        </section>
      )}

      {/* MEDICINES TAB */}

      {activeTab === "medicines" && (
        <section className="dashboard-panel">
          <div className="panel-header">
            <div>
              <p className="section-kicker">
                Medication inventory
              </p>

              <h2>
                Active Medicines
              </h2>

              <p>
                Medicines currently tracked in
                your account
              </p>
            </div>

            <button
              className="primary-button"
              onClick={() =>
                navigate("/medicines")
              }
            >
              Manage Medicines
              <ArrowRight size={16} />
            </button>
          </div>

          {medicines.length === 0 ? (
            <EmptyState
              icon={<Pill size={25} />}
              title="No medicines added"
              description="Add a medicine or upload a prescription to get started."
              action="Add Medicine"
              onAction={() =>
                navigate("/medicines/add")
              }
            />
          ) : (
            <div className="medicine-grid">
              {medicines.map((medicine) => (
                <MedicineCard
                  key={medicine.id}
                  medicine={medicine}
                />
              ))}
            </div>
          )}
        </section>
      )}

      {/* HISTORY TAB */}

      {activeTab === "history" && (
        <section className="dashboard-panel">
          <div className="panel-header">
            <div>
              <p className="section-kicker">
                Medication records
              </p>

              <h2>
                Medication History
              </h2>

              <p>
                Review your complete medication
                history.
              </p>
            </div>

            <button
              className="primary-button"
              onClick={() =>
                navigate("/medicine-history")
              }
            >
              View History
              <ArrowRight size={16} />
            </button>
          </div>

          <EmptyState
            icon={<FileText size={25} />}
            title="View detailed history"
            description="Open Medicine History to see previous doses and medication records."
            action="Open History"
            onAction={() =>
              navigate("/medicine-history")
            }
          />
        </section>
      )}
    </div>
  );
};

/* =========================================================
   SUMMARY CARD
========================================================= */

const SummaryCard = ({
  icon,
  label,
  value,
  sub,
  className,
}) => {
  return (
    <div
      className={`summary-card ${className}`}
    >
      <div className="summary-card-top">
        <div className="summary-icon">
          {icon}
        </div>
      </div>

      <p className="summary-label">
        {label}
      </p>

      <h3 className="summary-value">
        {value}
      </h3>

      <p className="summary-sub">
        {sub}
      </p>
    </div>
  );
};

/* =========================================================
   REMINDER CARD
========================================================= */

const ReminderCard = ({
  reminder,
  onAction,
  actionLoading,
  readOnly = false,
}) => {
  const status = getStatus(reminder);

  return (
    <div
      className={`reminder-card status-${status}`}
    >
      <div className="reminder-main">
        <div className="reminder-icon">
          <Pill size={20} />
        </div>

        <div className="reminder-info">
          <h3>
            {getMedicineName(reminder)}
          </h3>

          <p>
            {getDosage(reminder)}
            <span> | </span>
            {getTime(reminder)}
          </p>

          {reminder.instructions && (
            <span className="reminder-instructions">
              {reminder.instructions}
            </span>
          )}
        </div>
      </div>

      {!readOnly &&
        status === "pending" && (
          <div className="reminder-actions">
            <button
              className="action-taken"
              disabled={
                actionLoading ===
                reminder.id
              }
              onClick={() =>
                onAction(
                  reminder.id,
                  "taken"
                )
              }
            >
              <CheckCircle2 size={15} />

              {actionLoading === reminder.id
                ? "..."
                : "Taken"}
            </button>

            <button
              className="action-missed"
              disabled={
                actionLoading ===
                reminder.id
              }
              onClick={() =>
                onAction(
                  reminder.id,
                  "missed"
                )
              }
            >
              Missed
            </button>

            <button
              className="action-snooze"
              disabled={
                actionLoading ===
                reminder.id
              }
              onClick={() =>
                onAction(
                  reminder.id,
                  "snoozed"
                )
              }
            >
              Snooze
            </button>
          </div>
        )}

      {readOnly && (
        <span
          className={`status-pill ${status}`}
        >
          {status}
        </span>
      )}
    </div>
  );
};

/* =========================================================
   MEDICINE CARD
========================================================= */

const MedicineCard = ({ medicine }) => {
  const total =
    Number(medicine.total_stock) || 0;

  const remaining =
    Number(medicine.remaining_stock) || 0;

  const percentage =
    total > 0
      ? Math.min(
          100,
          (remaining / total) * 100
        )
      : 0;

  return (
    <div className="medicine-card">
      <div className="medicine-card-header">
        <div className="medicine-card-icon">
          <Pill size={20} />
        </div>

        <div>
          <h3>{medicine.name}</h3>

          <p>
            {medicine.dosage || "-"}
          </p>
        </div>
      </div>

      <div className="medicine-meta">
        <span>
          {medicine.frequency || "-"}
        </span>

        {medicine.condition && (
          <span>
            {medicine.condition}
          </span>
        )}
      </div>

      <div className="stock-area">
        <div className="stock-header">
          <span>
            Stock
          </span>

          <strong>
            {remaining}/{total}
          </strong>
        </div>

        <div className="stock-track">
          <div
            className={`stock-fill ${
              percentage <= 20
                ? "low"
                : ""
            }`}
            style={{
              width: `${percentage}%`,
            }}
          />
        </div>
      </div>
    </div>
  );
};

/* =========================================================
   EMPTY STATE
========================================================= */

const EmptyState = ({
  icon,
  title,
  description,
  action,
  onAction,
}) => {
  return (
    <div className="empty-state">
      <div className="empty-icon">
        {icon}
      </div>

      <h3>{title}</h3>

      <p>{description}</p>

      {action && (
        <button
          className="primary-button"
          onClick={onAction}
        >
          {action}
          <ArrowRight size={16} />
        </button>
      )}
    </div>
  );
};

/* =========================================================
   STYLES
========================================================= */

const dashboardStyles = `
  .patient-dashboard-page {
    padding: 28px;
    min-height: calc(100vh - 80px);
    background: #f7f9fc;
    color: #172033;
  }

  .dashboard-header {
    display: flex;
    align-items: flex-start;
    justify-content: space-between;
    gap: 20px;
    margin-bottom: 24px;
  }

  .dashboard-eyebrow,
  .section-kicker {
    margin: 0 0 6px;
    color: #14a899;
    font-size: 11px;
    font-weight: 700;
    text-transform: uppercase;
    letter-spacing: .08em;
  }

  .dashboard-header h1 {
    margin: 0;
    font-size: 30px;
    line-height: 1.15;
    font-weight: 750;
    color: #162033;
  }

  .dashboard-subtitle {
    margin: 8px 0 0;
    color: #697386;
    font-size: 14px;
  }

  .header-action {
    display: inline-flex;
    align-items: center;
    gap: 8px;
    border: 1px solid #dce3eb;
    border-radius: 10px;
    background: #fff;
    padding: 10px 14px;
    color: #344054;
    font-weight: 600;
    cursor: pointer;
  }

  .dashboard-error {
    display: flex;
    align-items: center;
    gap: 10px;
    margin-bottom: 20px;
    padding: 12px 14px;
    border: 1px solid #fecaca;
    border-radius: 10px;
    background: #fff5f5;
    color: #b42318;
    font-size: 13px;
  }

  .dashboard-error button {
    margin-left: auto;
    border: 0;
    background: transparent;
    color: inherit;
    font-weight: 700;
    cursor: pointer;
  }

  .summary-grid {
    display: grid;
    grid-template-columns: repeat(4, minmax(0, 1fr));
    gap: 16px;
    margin-bottom: 20px;
  }

  .summary-card {
    background: #fff;
    border: 1px solid #e7ebf0;
    border-radius: 14px;
    padding: 18px;
    box-shadow: 0 2px 8px rgba(15, 23, 42, .03);
  }

  .summary-card-top {
    margin-bottom: 15px;
  }

  .summary-icon {
    width: 42px;
    height: 42px;
    display: flex;
    align-items: center;
    justify-content: center;
    border-radius: 11px;
  }

  .summary-card.primary .summary-icon {
    background: #e7f8f5;
    color: #0f9488;
  }

  .summary-card.success .summary-icon {
    background: #ecfdf3;
    color: #079455;
  }

  .summary-card.warning .summary-icon {
    background: #fff8eb;
    color: #dc6803;
  }

  .summary-card.danger .summary-icon {
    background: #fff1f3;
    color: #d92d20;
  }

  .summary-label {
    margin: 0;
    color: #697386;
    font-size: 13px;
  }

  .summary-value {
    margin: 7px 0 3px;
    color: #162033;
    font-size: 29px;
    line-height: 1;
  }

  .summary-sub {
    margin: 0;
    color: #98a2b3;
    font-size: 12px;
  }

  .dashboard-panel {
    background: #fff;
    border: 1px solid #e7ebf0;
    border-radius: 14px;
    padding: 20px;
    margin-bottom: 20px;
    box-shadow: 0 2px 8px rgba(15, 23, 42, .03);
  }

  .panel-header {
    display: flex;
    align-items: flex-start;
    justify-content: space-between;
    gap: 15px;
    margin-bottom: 18px;
  }

  .panel-header h2 {
    margin: 0;
    color: #172033;
    font-size: 19px;
  }

  .panel-header > div > p:last-child {
    margin: 5px 0 0;
    color: #7b8495;
    font-size: 13px;
  }

  .status-pill {
    display: inline-flex;
    align-items: center;
    padding: 5px 10px;
    border-radius: 999px;
    font-size: 11px;
    font-weight: 700;
    text-transform: capitalize;
  }

  .status-pill.pending {
    background: #fff7ed;
    color: #c2410c;
  }

  .status-pill.taken {
    background: #ecfdf3;
    color: #087443;
  }

  .status-pill.missed {
    background: #fff1f3;
    color: #b42318;
  }

  .next-dose-content {
    display: flex;
    align-items: center;
    gap: 15px;
    padding: 15px;
    border: 1px solid #e8edf2;
    border-radius: 12px;
    background: #fbfdfd;
  }

  .medicine-icon-large {
    width: 52px;
    height: 52px;
    display: flex;
    align-items: center;
    justify-content: center;
    flex-shrink: 0;
    border-radius: 13px;
    background: #e6f7f4;
    color: #0f9488;
  }

  .next-dose-info {
    flex: 1;
    min-width: 0;
  }

  .next-dose-info h3 {
    margin: 0;
    color: #172033;
    font-size: 16px;
  }

  .next-dose-info p {
    margin: 5px 0 0;
    color: #697386;
    font-size: 13px;
  }

  .instructions,
  .reminder-instructions {
    display: inline-block;
    margin-top: 7px;
    color: #7b8495;
    font-size: 12px;
  }

  .take-button,
  .primary-button {
    display: inline-flex;
    align-items: center;
    justify-content: center;
    gap: 7px;
    border: 0;
    border-radius: 9px;
    background: #14b8a6;
    color: #fff;
    padding: 10px 14px;
    font-size: 13px;
    font-weight: 650;
    cursor: pointer;
  }

  .take-button:hover,
  .primary-button:hover {
    background: #0f9f90;
  }

  .take-button:disabled {
    opacity: .6;
    cursor: not-allowed;
  }

  .refill-section {
    display: flex;
    flex-direction: column;
    gap: 10px;
    margin-bottom: 20px;
  }

  .refill-alert {
    display: flex;
    align-items: center;
    gap: 10px;
    padding: 12px 14px;
    border: 1px solid #fedf89;
    border-radius: 10px;
    background: #fffaeb;
    color: #93370d;
    font-size: 13px;
  }

  .refill-alert p {
    margin: 0;
  }

  .dashboard-tabs {
    display: flex;
    gap: 5px;
    margin-bottom: 16px;
    padding: 5px;
    background: #edf2f6;
    border-radius: 11px;
    width: fit-content;
  }

  .dashboard-tabs button {
    border: 0;
    border-radius: 8px;
    background: transparent;
    color: #667085;
    padding: 9px 14px;
    font-size: 13px;
    font-weight: 600;
    cursor: pointer;
  }

  .dashboard-tabs button.active {
    background: #fff;
    color: #172033;
    box-shadow: 0 1px 4px rgba(15, 23, 42, .08);
  }

  .view-link {
    display: inline-flex;
    align-items: center;
    gap: 5px;
    border: 0;
    background: transparent;
    color: #0f9488;
    font-weight: 650;
    font-size: 13px;
    cursor: pointer;
  }

  .list-heading {
    margin: 0 0 10px;
    color: #344054;
    font-size: 13px;
  }

  .completed-heading {
    margin-top: 22px;
  }

  .reminder-list {
    display: flex;
    flex-direction: column;
  }

  .reminder-card {
    display: flex;
    align-items: center;
    justify-content: space-between;
    gap: 15px;
    padding: 14px 0;
    border-bottom: 1px solid #edf0f3;
  }

  .reminder-card:last-child {
    border-bottom: 0;
  }

  .reminder-main {
    display: flex;
    align-items: center;
    gap: 12px;
    min-width: 0;
  }

  .reminder-icon {
    width: 42px;
    height: 42px;
    flex-shrink: 0;
    display: flex;
    align-items: center;
    justify-content: center;
    border-radius: 11px;
    background: #eefaf8;
    color: #0f9488;
  }

  .reminder-info {
    min-width: 0;
  }

  .reminder-info h3 {
    margin: 0;
    color: #172033;
    font-size: 14px;
  }

  .reminder-info p {
    margin: 4px 0 0;
    color: #697386;
    font-size: 12px;
  }

  .reminder-actions {
    display: flex;
    gap: 7px;
    flex-wrap: wrap;
    justify-content: flex-end;
  }

  .reminder-actions button {
    display: inline-flex;
    align-items: center;
    gap: 5px;
    border-radius: 8px;
    padding: 7px 10px;
    font-size: 12px;
    font-weight: 600;
    cursor: pointer;
  }

  .action-taken {
    border: 1px solid #a6f4c5;
    background: #ecfdf3;
    color: #087443;
  }

  .action-missed {
    border: 1px solid #fecdca;
    background: #fff5f4;
    color: #b42318;
  }

  .action-snooze {
    border: 1px solid #d0d5dd;
    background: #fff;
    color: #475467;
  }

  .reminder-actions button:disabled {
    opacity: .55;
    cursor: not-allowed;
  }

  .medicine-grid {
    display: grid;
    grid-template-columns: repeat(3, minmax(0, 1fr));
    gap: 14px;
  }

  .medicine-card {
    border: 1px solid #e8edf2;
    border-radius: 12px;
    padding: 16px;
    background: #fff;
  }

  .medicine-card-header {
    display: flex;
    align-items: center;
    gap: 11px;
  }

  .medicine-card-icon {
    width: 40px;
    height: 40px;
    display: flex;
    align-items: center;
    justify-content: center;
    border-radius: 10px;
    background: #e8f8f6;
    color: #0f9488;
  }

  .medicine-card h3 {
    margin: 0;
    color: #172033;
    font-size: 14px;
  }

  .medicine-card-header p {
    margin: 3px 0 0;
    color: #7b8495;
    font-size: 12px;
  }

  .medicine-meta {
    display: flex;
    flex-wrap: wrap;
    gap: 7px;
    margin: 15px 0;
  }

  .medicine-meta span {
    padding: 5px 8px;
    border-radius: 6px;
    background: #f2f4f7;
    color: #667085;
    font-size: 11px;
  }

  .stock-header {
    display: flex;
    justify-content: space-between;
    margin-bottom: 6px;
    color: #667085;
    font-size: 11px;
  }

  .stock-header strong {
    color: #344054;
  }

  .stock-track {
    height: 7px;
    overflow: hidden;
    border-radius: 999px;
    background: #edf1f4;
  }

  .stock-fill {
    height: 100%;
    border-radius: inherit;
    background: #14b8a6;
  }

  .stock-fill.low {
    background: #f79009;
  }

  .empty-state,
  .dashboard-state {
    display: flex;
    align-items: center;
    justify-content: center;
    flex-direction: column;
    text-align: center;
    padding: 45px 20px;
  }

  .empty-icon {
    width: 50px;
    height: 50px;
    display: flex;
    align-items: center;
    justify-content: center;
    margin-bottom: 12px;
    border-radius: 13px;
    background: #eef8f7;
    color: #0f9488;
  }

  .empty-state h3 {
    margin: 0;
    color: #172033;
    font-size: 16px;
  }

  .empty-state p {
    max-width: 420px;
    margin: 7px 0 16px;
    color: #7b8495;
    font-size: 13px;
  }

  .loading-spinner {
    width: 28px;
    height: 28px;
    margin-bottom: 12px;
    border: 3px solid #dcefed;
    border-top-color: #14b8a6;
    border-radius: 50%;
    animation: patient-spin .75s linear infinite;
  }

  @keyframes patient-spin {
    to {
      transform: rotate(360deg);
    }
  }

  @media (max-width: 1050px) {
    .summary-grid {
      grid-template-columns: repeat(2, minmax(0, 1fr));
    }

    .medicine-grid {
      grid-template-columns: repeat(2, minmax(0, 1fr));
    }
  }

  @media (max-width: 750px) {
    .patient-dashboard-page {
      padding: 18px;
    }

    .dashboard-header {
      flex-direction: column;
    }

    .next-dose-content {
      align-items: flex-start;
      flex-direction: column;
    }

    .take-button {
      width: 100%;
    }

    .reminder-card {
      align-items: flex-start;
      flex-direction: column;
    }

    .reminder-actions {
      width: 100%;
      justify-content: flex-start;
    }

    .medicine-grid {
      grid-template-columns: 1fr;
    }

    .dashboard-tabs {
      width: 100%;
      overflow-x: auto;
    }

    .dashboard-tabs button {
      white-space: nowrap;
    }
  }

  @media (max-width: 520px) {
    .summary-grid {
      grid-template-columns: 1fr;
    }

    .dashboard-header h1 {
      font-size: 25px;
    }

    .panel-header {
      flex-direction: column;
    }

    .view-link {
      padding: 0;
    }
  }
`;

export default PatientDashboard;