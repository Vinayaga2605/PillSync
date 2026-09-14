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
  CircleSlash2,
  AlarmClock,
  CalendarDays,
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
  "Dosage not specified";

const getTime = (item) =>
  item?.time ||
  item?.time_label ||
  "Time not specified";

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
  const [actionLoading, setActionLoading] = useState(null);
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
          <div className="loading-spinner">
            <RefreshCw size={21} />
          </div>

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
            Here is your medication overview for today.
          </p>
        </div>

        <button
          type="button"
          className="header-action"
          onClick={() =>
            navigate("/notifications")
          }
        >
          <Bell size={18} />
          <span>Notifications</span>
        </button>
      </header>

      {/* ERROR */}

      {error && (
        <div
          className="dashboard-error"
          role="alert"
        >
          <AlertTriangle size={18} />
          <span>{error}</span>

          <button
            type="button"
            onClick={fetchDashboardData}
          >
            <RefreshCw size={15} />
            <span>Retry</span>
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

              <h2>Next Dose</h2>

              <p>
                Your next scheduled medication
              </p>
            </div>

            <span className="status-pill pending">
              <Clock3 size={13} />
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

              <div className="dose-meta">
                <span>
                  <Pill size={13} />
                  {getDosage(nextDose)}
                </span>

                <span>
                  <Clock3 size={13} />
                  {getTime(nextDose)}
                </span>
              </div>

              {nextDose.instructions && (
                <span className="instructions">
                  {nextDose.instructions}
                </span>
              )}
            </div>

            <button
              type="button"
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

              <span>
                {actionLoading === nextDose.id
                  ? "Updating..."
                  : "Mark as taken"}
              </span>
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
                    "an unspecified number of"}{" "}
                  {(
                    alert.daysRemaining ??
                    alert.days_remaining
                  ) === 1
                    ? "day"
                    : "days"}
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
          type="button"
          className={
            activeTab === "today"
              ? "active"
              : ""
          }
          onClick={() =>
            setActiveTab("today")
          }
        >
          <CalendarDays size={15} />
          <span>Today's Reminders</span>
        </button>

        <button
          type="button"
          className={
            activeTab === "medicines"
              ? "active"
              : ""
          }
          onClick={() =>
            setActiveTab("medicines")
          }
        >
          <Pill size={15} />
          <span>My Medicines</span>
        </button>

        <button
          type="button"
          className={
            activeTab === "history"
              ? "active"
              : ""
          }
          onClick={() =>
            setActiveTab("history")
          }
        >
          <FileText size={15} />
          <span>History</span>
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

              <h2>Today's Schedule</h2>

              <p>
                {takenToday} of {reminders.length}{" "}
                doses completed
              </p>
            </div>

            <button
              type="button"
              className="view-link"
              onClick={() =>
                navigate("/reminders")
              }
            >
              <span>View reminders</span>
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
                    Pending
                    <span className="count-badge">
                      {pendingReminders.length}
                    </span>
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
                    <CheckCircle2 size={15} />
                    <span>Completed Today</span>
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

              <h2>Active Medicines</h2>

              <p>
                Medicines currently tracked in your
                account
              </p>
            </div>

            <button
              type="button"
              className="primary-button"
              onClick={() =>
                navigate("/medicines")
              }
            >
              <Pill size={15} />
              <span>Manage Medicines</span>
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

              <h2>Medication History</h2>

              <p>
                Review your complete medication
                history.
              </p>
            </div>

            <button
              type="button"
              className="primary-button"
              onClick={() =>
                navigate("/medicine-history")
              }
            >
              <FileText size={15} />
              <span>View History</span>
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
    <div className={`summary-card ${className}`}>
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

          <div className="reminder-meta">
            <span>
              <Pill size={13} />
              {getDosage(reminder)}
            </span>

            <span>
              <Clock3 size={13} />
              {getTime(reminder)}
            </span>
          </div>

          {reminder.instructions && (
            <span className="reminder-instructions">
              {reminder.instructions}
            </span>
          )}
        </div>
      </div>

      {!readOnly && status === "pending" && (
        <div className="reminder-actions">
          <button
            type="button"
            className="action-taken"
            disabled={
              actionLoading === reminder.id
            }
            onClick={() =>
              onAction(
                reminder.id,
                "taken"
              )
            }
          >
            <CheckCircle2 size={15} />
            <span>
              {actionLoading === reminder.id
                ? "Updating..."
                : "Taken"}
            </span>
          </button>

          <button
            type="button"
            className="action-missed"
            disabled={
              actionLoading === reminder.id
            }
            onClick={() =>
              onAction(
                reminder.id,
                "missed"
              )
            }
          >
            <CircleSlash2 size={15} />
            <span>Missed</span>
          </button>

          <button
            type="button"
            className="action-snooze"
            disabled={
              actionLoading === reminder.id
            }
            onClick={() =>
              onAction(
                reminder.id,
                "snoozed"
              )
            }
          >
            <AlarmClock size={15} />
            <span>Snooze</span>
          </button>
        </div>
      )}

      {readOnly && (
        <span
          className={`status-pill ${status}`}
        >
          {status === "taken" ? (
            <CheckCircle2 size={13} />
          ) : status === "missed" ? (
            <CircleSlash2 size={13} />
          ) : (
            <Clock3 size={13} />
          )}

          <span>
            {status}
          </span>
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
            {medicine.dosage ||
              "Dosage not specified"}
          </p>
        </div>
      </div>

      <div className="medicine-meta">
        <span>
          <Clock3 size={12} />
          {medicine.frequency ||
            "Frequency not specified"}
        </span>

        {medicine.condition && (
          <span>
            <Activity size={12} />
            {medicine.condition}
          </span>
        )}
      </div>

      <div className="stock-area">
        <div className="stock-header">
          <span>Stock</span>

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
          type="button"
          className="primary-button"
          onClick={onAction}
        >
          <span>{action}</span>
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
    background: var(--color-bg, #f7f9fc);
    color: var(--color-text, #172033);
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
    color: var(--color-primary, #2f8f7f);
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
    color: var(--color-text, #162033);
  }

  .dashboard-subtitle {
    margin: 8px 0 0;
    color: var(--color-text-muted, #697386);
    font-size: 14px;
  }

  .header-action {
    display: inline-flex;
    align-items: center;
    gap: 8px;
    border: 1px solid var(--color-border, #dce3eb);
    border-radius: 10px;
    background: var(--color-surface, #fff);
    padding: 10px 14px;
    color: var(--color-text, #344054);
    font-weight: 600;
    cursor: pointer;
    transition: .2s ease;
  }

  .header-action:hover {
    border-color: var(--color-primary, #2f8f7f);
    color: var(--color-primary, #2f8f7f);
    transform: translateY(-1px);
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

  .dashboard-error > button {
    display: inline-flex;
    align-items: center;
    gap: 6px;
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
    background: var(--color-surface, #fff);
    border: 1px solid var(--color-border, #e7ebf0);
    border-radius: 14px;
    padding: 18px;
    box-shadow: var(--shadow-soft, 0 2px 8px rgba(15, 23, 42, .03));
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
    color: var(--color-text-muted, #697386);
    font-size: 13px;
  }

  .summary-value {
    margin: 7px 0 3px;
    color: var(--color-text, #162033);
    font-size: 29px;
    line-height: 1;
  }

  .summary-sub {
    margin: 0;
    color: #98a2b3;
    font-size: 12px;
  }

  .dashboard-panel {
    background: var(--color-surface, #fff);
    border: 1px solid var(--color-border, #e7ebf0);
    border-radius: 14px;
    padding: 20px;
    margin-bottom: 20px;
    box-shadow: var(--shadow-soft, 0 2px 8px rgba(15, 23, 42, .03));
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
    color: var(--color-text, #172033);
    font-size: 19px;
  }

  .panel-header > div > p:last-child {
    margin: 5px 0 0;
    color: var(--color-text-muted, #7b8495);
    font-size: 13px;
  }

  .status-pill {
    display: inline-flex;
    align-items: center;
    gap: 5px;
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

  .status-pill.snoozed {
    background: #f2f4f7;
    color: #475467;
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
    color: var(--color-text, #172033);
    font-size: 16px;
  }

  .dose-meta,
  .reminder-meta {
    display: flex;
    align-items: center;
    flex-wrap: wrap;
    gap: 10px;
    margin-top: 6px;
    color: #697386;
    font-size: 12px;
  }

  .dose-meta span,
  .reminder-meta span {
    display: inline-flex;
    align-items: center;
    gap: 5px;
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
    background: var(--color-primary, #2f8f7f);
    color: #fff;
    padding: 10px 14px;
    font-size: 13px;
    font-weight: 650;
    cursor: pointer;
  }

  .take-button:hover,
  .primary-button:hover {
    background: var(--color-primary-dark, #26786a);
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
    display: inline-flex;
    align-items: center;
    gap: 7px;
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
    background: var(--color-surface, #fff);
    color: var(--color-primary, #2f8f7f);
    box-shadow: 0 1px 4px rgba(15, 23, 42, .08);
  }

  .view-link {
    display: inline-flex;
    align-items: center;
    gap: 5px;
    border: 0;
    background: transparent;
    color: var(--color-primary, #2f8f7f);
    font-weight: 650;
    font-size: 13px;
    cursor: pointer;
  }

  .list-heading {
    display: flex;
    align-items: center;
    gap: 7px;
    margin: 0 0 10px;
    color: #344054;
    font-size: 13px;
  }

  .count-badge {
    min-width: 20px;
    padding: 2px 6px;
    border-radius: 999px;
    background: #e8f5f1;
    color: #2f8f7f;
    font-size: 10px;
    text-align: center;
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
    color: var(--color-text, #172033);
    font-size: 14px;
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
    background: var(--color-surface, #fff);
    color: #475467;
  }

  .reminder-actions button:hover {
    transform: translateY(-1px);
  }

  .reminder-actions button:disabled {
    opacity: .55;
    cursor: not-allowed;
    transform: none;
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
    background: var(--color-surface, #fff);
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
    color: var(--color-text, #172033);
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
    display: inline-flex;
    align-items: center;
    gap: 5px;
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
    color: var(--color-text, #172033);
    font-size: 16px;
  }

  .empty-state p {
    max-width: 420px;
    margin: 7px 0 16px;
    color: #7b8495;
    font-size: 13px;
  }

  .loading-spinner {
    width: 46px;
    height: 46px;
    margin-bottom: 12px;
    display: flex;
    align-items: center;
    justify-content: center;
    border-radius: 13px;
    background: #e7f8f5;
    color: #2f8f7f;
    animation: patient-spin .9s linear infinite;
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

    .header-action {
      width: 100%;
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

    .reminder-actions button {
      flex: 1;
      justify-content: center;
    }
  }
`;

export default PatientDashboard;
