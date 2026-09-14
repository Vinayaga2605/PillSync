import React, { useEffect, useMemo, useState } from "react";
import {
  AlertTriangle,
  CheckCircle2,
  Package,
  Bell,
  Clock3,
  Pill,
  RefreshCw,
  RotateCcw,
  Eye,
  MailOpen,
  CircleAlert,
  ShieldAlert,
} from "lucide-react";

import caregiverService from "../../services/caregiverService";

const CaregiverAlerts = () => {
  const [alerts, setAlerts] = useState([]);
  const [filter, setFilter] = useState("All");
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  const fetchAlerts = async () => {
    try {
      setLoading(true);
      setError("");

      const response = await caregiverService.getAlerts();

      const data = Array.isArray(response.data)
        ? response.data
        : response.data?.alerts || [];

      const normalizedAlerts = data.map((alert, index) =>
        normalizeAlert(alert, index)
      );

      setAlerts(normalizedAlerts);
    } catch (err) {
      console.error(
        "Failed to load caregiver alerts:",
        err
      );

      setError(
        "Unable to load caregiver alerts. Please try again."
      );

      setAlerts([]);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchAlerts();
  }, []);

  const unreadCount = alerts.filter(
    (alert) => alert.status === "Unread"
  ).length;

  const criticalCount = alerts.filter(
    (alert) => alert.type === "danger"
  ).length;

  const lowStockCount = alerts.filter(
    (alert) => alert.type === "warning"
  ).length;

  const readCount = alerts.filter(
    (alert) => alert.status === "Read"
  ).length;

  const filteredAlerts = useMemo(() => {
    if (filter === "All") {
      return alerts;
    }

    return alerts.filter(
      (alert) => alert.status === filter
    );
  }, [alerts, filter]);

  const markAsRead = (id) => {
    setAlerts((current) =>
      current.map((alert) =>
        alert.id === id
          ? { ...alert, status: "Read" }
          : alert
      )
    );
  };

  const markAllAsRead = () => {
    setAlerts((current) =>
      current.map((alert) => ({
        ...alert,
        status: "Read",
      }))
    );
  };

  const getFilterIcon = (item) => {
    if (item === "Unread") {
      return <MailOpen size={13} />;
    }

    if (item === "Read") {
      return <Eye size={13} />;
    }

    return <Bell size={13} />;
  };

  return (
    <div className="caregiver-alerts-page">
      <style>{styles}</style>

      <div className="caregiver-alerts-header">
        <div>
          <div className="caregiver-alerts-kicker">
            <Bell size={15} />
            <span>CAREGIVER ALERTS</span>
          </div>

          <h1>Alerts &amp; Notifications</h1>

          <p>
            Review missed doses, refill warnings and important
            patient updates.
          </p>
        </div>

        <div className="alerts-header-actions">
          <button
            type="button"
            className="alerts-refresh-btn"
            onClick={fetchAlerts}
            disabled={loading}
          >
            <RefreshCw
              size={14}
              className={loading ? "alerts-spin" : ""}
            />
            <span>Refresh</span>
          </button>

          {unreadCount > 0 && (
            <button
              type="button"
              className="alerts-primary-btn"
              onClick={markAllAsRead}
            >
              <CheckCircle2 size={16} />
              <span>Mark All Read</span>
            </button>
          )}
        </div>
      </div>

      {error && (
        <div className="alerts-error" role="alert">
          <div className="alerts-error-main">
            <CircleAlert size={16} />
            <span>{error}</span>
          </div>

          <button
            type="button"
            onClick={fetchAlerts}
          >
            <RotateCcw size={14} />
            <span>Try Again</span>
          </button>
        </div>
      )}

      <div className="alerts-summary">
        <AlertSummary
          icon={<ShieldAlert size={20} />}
          label="Critical Alerts"
          value={criticalCount}
          tone="danger"
        />

        <AlertSummary
          icon={<Package size={20} />}
          label="Low Stock"
          value={lowStockCount}
          tone="warning"
        />

        <AlertSummary
          icon={<Bell size={20} />}
          label="Unread"
          value={unreadCount}
          tone="blue"
        />

        <AlertSummary
          icon={<CheckCircle2 size={20} />}
          label="Resolved"
          value={readCount}
          tone="green"
        />
      </div>

      <section className="alerts-card">
        <div className="alerts-card-header">
          <div className="alerts-title">
            <div className="alerts-title-icon">
              <Bell size={18} />
            </div>

            <div>
              <h2>Patient Alerts</h2>
              <p>
                Latest medication and patient activity updates.
              </p>
            </div>
          </div>

          <div
            className="alerts-filter"
            aria-label="Alert filter"
          >
            {["All", "Unread", "Read"].map((item) => (
              <button
                type="button"
                key={item}
                className={
                  filter === item ? "active" : ""
                }
                onClick={() => setFilter(item)}
              >
                {getFilterIcon(item)}
                <span>{item}</span>
              </button>
            ))}
          </div>
        </div>

        <div className="alerts-list">
          {loading ? (
            <div className="alerts-empty">
              <RefreshCw
                size={34}
                className="alerts-spin"
              />

              <strong>Loading alerts...</strong>

              <span>
                Fetching the latest patient updates.
              </span>
            </div>
          ) : filteredAlerts.length === 0 ? (
            <div className="alerts-empty">
              <CheckCircle2 size={34} />

              <strong>No alerts found</strong>

              <span>
                Everything is up to date for the selected filter.
              </span>
            </div>
          ) : (
            filteredAlerts.map((alert) => (
              <div
                className={`care-alert ${alert.type} ${
                  alert.status === "Unread"
                    ? "unread"
                    : ""
                }`}
                key={alert.id}
              >
                <div className="care-alert-icon">
                  {alert.type === "danger" && (
                    <AlertTriangle size={18} />
                  )}

                  {alert.type === "warning" && (
                    <Package size={18} />
                  )}

                  {alert.type === "success" && (
                    <CheckCircle2 size={18} />
                  )}
                </div>

                <div className="care-alert-body">
                  <div className="care-alert-heading">
                    <div>
                      <span className="alert-patient">
                        {alert.patient}
                      </span>

                      <h3>{alert.title}</h3>
                    </div>

                    <small>
                      <Clock3 size={12} />
                      <span>{alert.time}</span>
                    </small>
                  </div>

                  <p>{alert.message}</p>

                  <div className="alert-meta">
                    <span
                      className={`alert-type ${alert.type}`}
                    >
                      {alert.type === "danger" ? (
                        <>
                          <AlertTriangle size={11} />
                          <span>Attention required</span>
                        </>
                      ) : alert.type === "warning" ? (
                        <>
                          <Package size={11} />
                          <span>Refill warning</span>
                        </>
                      ) : (
                        <>
                          <CheckCircle2 size={11} />
                          <span>Completed</span>
                        </>
                      )}
                    </span>

                    <span className="alert-status">
                      {alert.status === "Unread" ? (
                        <>
                          <Bell size={10} />
                          <span>Unread</span>
                        </>
                      ) : (
                        <>
                          <CheckCircle2 size={10} />
                          <span>Read</span>
                        </>
                      )}
                    </span>
                  </div>
                </div>

                {alert.status === "Unread" ? (
                  <button
                    type="button"
                    className="alert-action"
                    onClick={() =>
                      markAsRead(alert.id)
                    }
                    title="Mark alert as read"
                  >
                    <MailOpen size={13} />
                    <span>Mark Read</span>
                  </button>
                ) : (
                  <div
                    className="alert-read-icon"
                    title="Alert has been read"
                  >
                    <CheckCircle2 size={17} />
                  </div>
                )}
              </div>
            ))
          )}
        </div>
      </section>

      <section className="caregiver-alert-tip">
        <div className="tip-icon">
          <Pill size={18} />
        </div>

        <div>
          <strong>Caregiver tip</strong>

          <p>
            Pay special attention to repeated missed doses and
            medicines with low remaining stock.
          </p>
        </div>
      </section>
    </div>
  );
};

const normalizeAlert = (alert, index) => {
  const rawType = String(
    alert.type ||
      alert.alert_type ||
      alert.category ||
      ""
  ).toLowerCase();

  const rawStatus = String(
    alert.status ||
      alert.read_status ||
      ""
  ).toLowerCase();

  const title =
    alert.title ||
    alert.alert_title ||
    alert.name ||
    "Patient Alert";

  const message =
    alert.message ||
    alert.description ||
    "A patient medication update requires attention.";

  const patient =
    alert.patient ||
    alert.patient_name ||
    alert.patientName ||
    alert.username ||
    "Patient";

  const time =
    alert.time ||
    alert.time_ago ||
    alert.created_ago ||
    formatAlertTime(
      alert.created_at ||
        alert.timestamp ||
        alert.createdAt
    );

  let type = "success";

  if (
    rawType.includes("miss") ||
    rawType.includes("critical") ||
    rawType.includes("danger")
  ) {
    type = "danger";
  } else if (
    rawType.includes("stock") ||
    rawType.includes("refill") ||
    rawType.includes("warning") ||
    rawType.includes("low")
  ) {
    type = "warning";
  }

  const status =
    rawStatus === "read" ||
    alert.is_read === true ||
    alert.read === true
      ? "Read"
      : "Unread";

  return {
    id: alert.id ?? index + 1,
    patient,
    title,
    message,
    time,
    type,
    status,
  };
};

const formatAlertTime = (value) => {
  if (!value) {
    return "Recently";
  }

  const date = new Date(value);

  if (Number.isNaN(date.getTime())) {
    return "Recently";
  }

  const diff = Date.now() - date.getTime();

  const minutes = Math.floor(
    diff / (1000 * 60)
  );

  if (minutes < 1) {
    return "Just now";
  }

  if (minutes < 60) {
    return `${minutes} min ago`;
  }

  const hours = Math.floor(minutes / 60);

  if (hours < 24) {
    return `${hours} hr ago`;
  }

  const days = Math.floor(hours / 24);

  return `${days} day${days === 1 ? "" : "s"} ago`;
};

const AlertSummary = ({
  icon,
  label,
  value,
  tone,
}) => {
  return (
    <div className="alert-summary-card">
      <div
        className={`alert-summary-icon ${tone}`}
      >
        {icon}
      </div>

      <div>
        <span>{label}</span>
        <strong>{value}</strong>
      </div>
    </div>
  );
};

const styles = `
.caregiver-alerts-page {
  min-height: 100%;
  padding: 28px 30px 40px;
  background: #f7faf9;
  color: #21362f;
}

.caregiver-alerts-header {
  display: flex;
  align-items: flex-start;
  justify-content: space-between;
  gap: 20px;
  margin-bottom: 27px;
}

.caregiver-alerts-kicker {
  display: flex;
  align-items: center;
  gap: 7px;
  color: #2f8f7f;
  font-size: 11px;
  font-weight: 800;
  letter-spacing: .12em;
  margin-bottom: 7px;
}

.caregiver-alerts-header h1 {
  margin: 0;
  color: #21362f;
  font-size: 29px;
  font-weight: 750;
}

.caregiver-alerts-header p {
  margin: 8px 0 0;
  color: #788681;
  font-size: 14px;
}

.alerts-header-actions {
  display: flex;
  align-items: center;
  gap: 8px;
}

.alerts-refresh-btn,
.alerts-primary-btn {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  gap: 7px;
  border-radius: 10px;
  cursor: pointer;
  font-weight: 700;
}

.alerts-refresh-btn {
  border: 1px solid #dfe8e5;
  padding: 10px 13px;
  background: #fff;
  color: #2f8f7f;
  font-size: 10px;
}

.alerts-refresh-btn:hover {
  background: #f3f9f7;
}

.alerts-refresh-btn:disabled {
  opacity: .6;
  cursor: not-allowed;
}

.alerts-primary-btn {
  border: 0;
  border-radius: 11px;
  padding: 11px 16px;
  background: #2f8f7f;
  color: #fff;
  font-size: 11px;
  box-shadow: 0 5px 16px rgba(47,143,127,.15);
}

.alerts-primary-btn:hover {
  background: #26796a;
}

.alerts-error {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 12px;
  margin-bottom: 18px;
  padding: 12px 14px;
  border: 1px solid #f1d3d0;
  border-radius: 11px;
  background: #fff7f6;
  color: #b14d45;
  font-size: 12px;
}

.alerts-error-main {
  display: flex;
  align-items: center;
  gap: 8px;
  min-width: 0;
}

.alerts-error-main span {
  overflow-wrap: anywhere;
}

.alerts-error button {
  display: inline-flex;
  align-items: center;
  gap: 6px;
  flex-shrink: 0;
  border: 0;
  border-radius: 7px;
  padding: 7px 10px;
  background: #b14d45;
  color: #fff;
  cursor: pointer;
  font-size: 10px;
  font-weight: 700;
}

.alerts-error button:hover {
  background: #a3423b;
}

.alerts-summary {
  display: grid;
  grid-template-columns: repeat(4,1fr);
  gap: 16px;
  margin-bottom: 18px;
}

.alert-summary-card {
  display: flex;
  align-items: center;
  gap: 13px;
  min-height: 100px;
  padding: 17px;
  background: #fff;
  border: 1px solid #e4ece9;
  border-radius: 16px;
  box-shadow: 0 5px 18px rgba(31,54,47,.045);
}

.alert-summary-icon {
  width: 43px;
  height: 43px;
  border-radius: 12px;
  display: flex;
  align-items: center;
  justify-content: center;
  flex-shrink: 0;
}

.alert-summary-icon.danger {
  background: #fcebea;
  color: #d1584f;
}

.alert-summary-icon.warning {
  background: #fff3d7;
  color: #b67f22;
}

.alert-summary-icon.blue {
  background: #eaf4fb;
  color: #4a90c4;
}

.alert-summary-icon.green {
  background: #e8f5f1;
  color: #2f8f7f;
}

.alert-summary-card span {
  display: block;
  color: #788680;
  font-size: 11px;
  font-weight: 600;
}

.alert-summary-card strong {
  display: block;
  margin-top: 3px;
  color: #263b34;
  font-size: 24px;
}

.alerts-card {
  background: #fff;
  border: 1px solid #e4ece9;
  border-radius: 17px;
  padding: 20px 21px;
  box-shadow: 0 5px 18px rgba(31,54,47,.045);
}

.alerts-card-header {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 16px;
  margin-bottom: 17px;
}

.alerts-title {
  display: flex;
  align-items: center;
  gap: 11px;
}

.alerts-title-icon {
  width: 38px;
  height: 38px;
  border-radius: 11px;
  display: flex;
  align-items: center;
  justify-content: center;
  color: #2f8f7f;
  background: #e8f5f1;
}

.alerts-title h2 {
  margin: 0;
  color: #263b34;
  font-size: 15px;
}

.alerts-title p {
  margin: 4px 0 0;
  color: #87938f;
  font-size: 11px;
}

.alerts-filter {
  display: flex;
  gap: 4px;
  padding: 4px;
  border: 1px solid #e2ebe8;
  background: #f2f6f4;
  border-radius: 10px;
}

.alerts-filter button {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  gap: 5px;
  border: 0;
  border-radius: 7px;
  padding: 8px 12px;
  background: transparent;
  color: #77847f;
  cursor: pointer;
  font-size: 10px;
  font-weight: 650;
}

.alerts-filter button.active {
  background: #fff;
  color: #2f8f7f;
  box-shadow: 0 2px 6px rgba(30,50,44,.07);
}

.alerts-list {
  display: flex;
  flex-direction: column;
}

.care-alert {
  display: flex;
  align-items: flex-start;
  gap: 13px;
  padding: 16px 4px;
  border-bottom: 1px solid #edf2f0;
}

.care-alert:last-child {
  border-bottom: 0;
}

.care-alert.unread {
  background: #fbfdfc;
}

.care-alert-icon {
  width: 41px;
  height: 41px;
  border-radius: 11px;
  display: flex;
  align-items: center;
  justify-content: center;
  flex-shrink: 0;
}

.care-alert.danger .care-alert-icon {
  background: #fcebea;
  color: #d1584f;
}

.care-alert.warning .care-alert-icon {
  background: #fff3d7;
  color: #b67f22;
}

.care-alert.success .care-alert-icon {
  background: #e8f5f1;
  color: #2f8f7f;
}

.care-alert-body {
  flex: 1;
  min-width: 0;
}

.care-alert-heading {
  display: flex;
  align-items: flex-start;
  justify-content: space-between;
  gap: 15px;
}

.alert-patient {
  display: block;
  color: #2f8f7f;
  font-size: 9px;
  font-weight: 750;
}

.care-alert-heading h3 {
  margin: 3px 0 0;
  color: #344940;
  font-size: 12px;
}

.care-alert-heading small {
  display: flex;
  align-items: center;
  gap: 4px;
  color: #99a39f;
  font-size: 9px;
  white-space: nowrap;
}

.care-alert-body > p {
  margin: 7px 0 9px;
  color: #7f8d88;
  font-size: 11px;
  line-height: 1.45;
}

.alert-meta {
  display: flex;
  align-items: center;
  flex-wrap: wrap;
  gap: 8px;
}

.alert-type,
.alert-status {
  display: inline-flex;
  align-items: center;
  gap: 4px;
  padding: 4px 7px;
  border-radius: 7px;
  font-size: 8px;
  font-weight: 750;
}

.alert-type.danger {
  color: #c44f47;
  background: #fcebea;
}

.alert-type.warning {
  color: #a97821;
  background: #fff3d7;
}

.alert-type.success {
  color: #2f8f7f;
  background: #e8f5f1;
}

.alert-status {
  color: #83908b;
  background: #f1f4f3;
}

.alert-action {
  display: inline-flex;
  align-items: center;
  gap: 5px;
  flex-shrink: 0;
  border: 0;
  border-radius: 8px;
  padding: 7px 10px;
  background: #edf5f2;
  color: #2f8f7f;
  cursor: pointer;
  font-size: 9px;
  font-weight: 750;
  white-space: nowrap;
}

.alert-action:hover {
  background: #e2efeb;
}

.alert-read-icon {
  display: flex;
  align-items: center;
  justify-content: center;
  color: #2f8f7f;
  padding: 5px;
}

.alerts-empty {
  min-height: 240px;
  display: flex;
  align-items: center;
  justify-content: center;
  flex-direction: column;
  gap: 7px;
  color: #98a49f;
}

.alerts-empty strong {
  color: #60716a;
  font-size: 13px;
}

.alerts-empty span {
  font-size: 10px;
  text-align: center;
}

.caregiver-alert-tip {
  display: flex;
  align-items: center;
  gap: 12px;
  margin-top: 18px;
  padding: 15px 17px;
  background: #edf7f4;
  border: 1px solid #d9ebe6;
  border-radius: 14px;
}

.tip-icon {
  width: 38px;
  height: 38px;
  border-radius: 10px;
  display: flex;
  align-items: center;
  justify-content: center;
  background: #dff1ec;
  color: #2f8f7f;
  flex-shrink: 0;
}

.caregiver-alert-tip strong {
  display: block;
  color: #315148;
  font-size: 11px;
}

.caregiver-alert-tip p {
  margin: 3px 0 0;
  color: #71847d;
  font-size: 10px;
  line-height: 1.4;
}

.alerts-spin {
  animation: alerts-spin 1s linear infinite;
}

@keyframes alerts-spin {
  from {
    transform: rotate(0deg);
  }

  to {
    transform: rotate(360deg);
  }
}

@media (max-width: 900px) {
  .alerts-summary {
    grid-template-columns: repeat(2,1fr);
  }

  .alerts-card-header {
    align-items: flex-start;
    flex-direction: column;
  }

  .alerts-filter {
    width: 100%;
  }

  .alerts-filter button {
    flex: 1;
  }
}

@media (max-width: 600px) {
  .caregiver-alerts-page {
    padding: 22px 16px 30px;
  }

  .caregiver-alerts-header {
    flex-direction: column;
  }

  .alerts-header-actions {
    width: 100%;
  }

  .alerts-refresh-btn,
  .alerts-primary-btn {
    flex: 1;
  }

  .alerts-summary {
    grid-template-columns: 1fr;
  }

  .care-alert {
    flex-wrap: wrap;
  }

  .care-alert-heading {
    flex-direction: column;
    gap: 5px;
  }

  .care-alert-heading small {
    white-space: normal;
  }

  .alert-action {
    width: 100%;
    justify-content: center;
  }

  .alerts-error {
    align-items: flex-start;
    flex-direction: column;
  }

  .alerts-error button {
    width: 100%;
    justify-content: center;
  }
}
`;

export default CaregiverAlerts;
