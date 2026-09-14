import React, { useEffect, useMemo, useState } from "react";
import {
  Users,
  Activity,
  AlertTriangle,
  Pill,
  CheckCircle2,
  ArrowRight,
  TrendingUp,
  Package,
  RefreshCw,
  UserRound,
  Clock3,
  CircleAlert,
} from "lucide-react";
import { useNavigate } from "react-router-dom";
import caregiverService from "../../services/caregiverService";

const CaregiverDashboard = () => {
  const navigate = useNavigate();

  const [dashboard, setDashboard] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  const fetchDashboard = async () => {
    try {
      setLoading(true);
      setError("");

      const response =
        await caregiverService.getDashboard();

      setDashboard(response.data || {});
    } catch (err) {
      console.error(
        "Failed to load caregiver dashboard:",
        err
      );

      setError(
        "Unable to load caregiver dashboard. Please try again."
      );

      setDashboard(null);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchDashboard();
  }, []);

  const patients = useMemo(() => {
    if (!dashboard) return [];

    return Array.isArray(dashboard.patients)
      ? dashboard.patients
      : [];
  }, [dashboard]);

  const alerts = useMemo(() => {
    if (!dashboard) return [];

    return Array.isArray(dashboard.alerts)
      ? dashboard.alerts
      : [];
  }, [dashboard]);

  const totalPatients = Number(
    dashboard?.totalPatients ??
      dashboard?.total_patients ??
      patients.length
  );

  const averageAdherence = Number(
    dashboard?.overallAdherence ??
      dashboard?.overall_adherence ??
      dashboard?.averageAdherence ??
      dashboard?.average_adherence ??
      0
  );

  const missedDoses = Number(
    dashboard?.missedDoses ??
      dashboard?.missed_doses ??
      alerts.filter((alert) =>
        String(
          alert.type ||
            alert.alert_type ||
            ""
        )
          .toLowerCase()
          .includes("miss")
      ).length
  );

  const refillAlerts = Number(
    dashboard?.refillAlerts ??
      dashboard?.refill_alerts ??
      alerts.filter((alert) =>
        String(
          alert.type ||
            alert.alert_type ||
            ""
        )
          .toLowerCase()
          .match(/stock|refill|low/)
      ).length
  );

  return (
    <div className="caregiver-page">
      <style>{caregiverStyles}</style>

      <div className="caregiver-header">
        <div>
          <div className="caregiver-kicker">
            <Activity size={15} />
            <span>Caregiver Monitoring</span>
          </div>

          <h1>Caregiver Dashboard</h1>

          <p>
            Monitor assigned patients, medication adherence and
            important health alerts.
          </p>
        </div>

        <div className="cg-header-actions">
          <button
            type="button"
            className="cg-refresh-btn"
            onClick={fetchDashboard}
            disabled={loading}
          >
            <RefreshCw
              size={15}
              className={loading ? "cg-spin" : ""}
            />
            <span>Refresh</span>
          </button>

          <button
            type="button"
            className="cg-primary-btn"
            onClick={() =>
              navigate("/caregiver-patients")
            }
          >
            <Users size={17} />
            <span>View Patients</span>
          </button>
        </div>
      </div>

      {error && (
        <div className="cg-error" role="alert">
          <AlertTriangle size={16} />

          <span>{error}</span>

          <button
            type="button"
            onClick={fetchDashboard}
          >
            <RefreshCw size={14} />
            <span>Try Again</span>
          </button>
        </div>
      )}

      {loading ? (
        <div className="cg-loading">
          <RefreshCw
            size={30}
            className="cg-spin"
          />
          <span>Loading caregiver dashboard...</span>
        </div>
      ) : (
        <>
          <div className="cg-stat-grid">
            <StatCard
              icon={<Users size={21} />}
              label="My Patients"
              value={totalPatients}
              subtitle="Assigned patients"
              tone="green"
            />

            <StatCard
              icon={<TrendingUp size={21} />}
              label="Average Adherence"
              value={`${averageAdherence}%`}
              subtitle="Across all patients"
              tone="blue"
            />

            <StatCard
              icon={<AlertTriangle size={21} />}
              label="Missed Doses"
              value={missedDoses}
              subtitle="Needs attention"
              tone="red"
            />

            <StatCard
              icon={<Package size={21} />}
              label="Refill Alerts"
              value={refillAlerts}
              subtitle="Low or critical stock"
              tone="purple"
            />
          </div>

          <div className="cg-main-grid">
            <section className="cg-card">
              <div className="cg-card-header">
                <div className="cg-title">
                  <div className="cg-icon green">
                    <TrendingUp size={18} />
                  </div>

                  <div>
                    <h2>Patient Adherence</h2>
                    <p>Current medication performance</p>
                  </div>
                </div>

                <button
                  type="button"
                  className="cg-link-btn"
                  onClick={() =>
                    navigate("/caregiver-patients")
                  }
                >
                  <span>View all</span>
                  <ArrowRight size={15} />
                </button>
              </div>

              <div className="patient-list">
                {patients.length === 0 ? (
                  <div className="cg-empty">
                    <Users size={28} />
                    <strong>No patients assigned</strong>
                    <span>
                      Assigned patients will appear here.
                    </span>
                  </div>
                ) : (
                  patients
                    .slice(0, 6)
                    .map((patient, index) => {
                      const name =
                        patient.name ||
                        patient.patient_name ||
                        patient.username ||
                        "Patient";

                      const age =
                        patient.age ??
                        patient.patient_age ??
                        null;

                      const medicines = Number(
                        patient.medicines ??
                          patient.medicationCount ??
                          patient.medication_count ??
                          0
                      );

                      const adherence = Number(
                        patient.adherencePercentage ??
                          patient.adherence_percentage ??
                          patient.adherence ??
                          0
                      );

                      const status =
                        patient.status ||
                        getPatientStatus(adherence);

                      const patientId =
                        patient.id ??
                        patient.patient_id;

                      return (
                        <div
                          className="patient-row"
                          key={
                            patientId ??
                            `${name}-${index}`
                          }
                          onClick={() => {
                            if (patientId) {
                              navigate(
                                `/caregiver-patient-analytics?patient_id=${patientId}`
                              );
                            }
                          }}
                          style={{
                            cursor: patientId
                              ? "pointer"
                              : "default",
                          }}
                        >
                          <div className="patient-main">
                            <div className="patient-avatar">
                              {getInitials(name)}
                            </div>

                            <div>
                              <strong>{name}</strong>

                              <div className="patient-meta">
                                <span>
                                  <UserRound size={10} />
                                  {age !== null
                                    ? `${age} years`
                                    : "Age unavailable"}
                                </span>

                                <span className="patient-meta-separator" />

                                <span>
                                  <Pill size={10} />
                                  {medicines}{" "}
                                  {medicines === 1
                                    ? "medicine"
                                    : "medicines"}
                                </span>
                              </div>
                            </div>
                          </div>

                          <div className="patient-progress-area">
                            <div className="patient-progress-label">
                              <span>Adherence</span>

                              <strong>
                                {adherence}%
                              </strong>
                            </div>

                            <div className="progress-track">
                              <div
                                className={`progress-fill ${
                                  adherence < 80
                                    ? "critical"
                                    : adherence < 90
                                    ? "attention"
                                    : ""
                                }`}
                                style={{
                                  width: `${Math.max(
                                    0,
                                    Math.min(
                                      adherence,
                                      100
                                    )
                                  )}%`,
                                }}
                              />
                            </div>
                          </div>

                          <span
                            className={`cg-status ${String(
                              status
                            ).toLowerCase()}`}
                          >
                            {String(status).toLowerCase() === "good" ? (
                              <>
                                <CheckCircle2 size={12} />
                                <span>Good</span>
                              </>
                            ) : String(status).toLowerCase() ===
                              "attention" ? (
                              <>
                                <CircleAlert size={12} />
                                <span>Attention</span>
                              </>
                            ) : (
                              <>
                                <AlertTriangle size={12} />
                                <span>Critical</span>
                              </>
                            )}
                          </span>
                        </div>
                      );
                    })
                )}
              </div>
            </section>

            <section className="cg-card">
              <div className="cg-card-header">
                <div className="cg-title">
                  <div className="cg-icon red">
                    <AlertTriangle size={18} />
                  </div>

                  <div>
                    <h2>Today's Alerts</h2>
                    <p>Important patient updates</p>
                  </div>
                </div>

                <button
                  type="button"
                  className="cg-link-btn"
                  onClick={() =>
                    navigate("/caregiver-alerts")
                  }
                >
                  <span>See all</span>
                  <ArrowRight size={15} />
                </button>
              </div>

              <div className="alert-list">
                {alerts.length === 0 ? (
                  <div className="cg-empty">
                    <CheckCircle2 size={28} />
                    <strong>No active alerts</strong>
                    <span>
                      Everything is currently up to date.
                    </span>
                  </div>
                ) : (
                  alerts
                    .slice(0, 5)
                    .map((alert, index) => {
                      const type =
                        getAlertType(alert);

                      const title =
                        alert.title ||
                        alert.alert_title ||
                        alert.name ||
                        getAlertTitle(type);

                      const message =
                        alert.message ||
                        alert.description ||
                        "A patient medication update requires attention.";

                      const time =
                        alert.time ||
                        alert.time_ago ||
                        formatAlertTime(
                          alert.created_at ||
                            alert.timestamp
                        );

                      return (
                        <div
                          className="alert-row"
                          key={
                            alert.id ??
                            `alert-${index}`
                          }
                        >
                          <div
                            className={`alert-icon ${type}`}
                          >
                            {type === "danger" && (
                              <AlertTriangle size={16} />
                            )}

                            {type === "warning" && (
                              <Package size={16} />
                            )}

                            {type === "success" && (
                              <CheckCircle2 size={16} />
                            )}
                          </div>

                          <div className="alert-content">
                            <strong>{title}</strong>
                            <p>{message}</p>

                            <span className="alert-time">
                              <Clock3 size={10} />
                              {time}
                            </span>
                          </div>
                        </div>
                      );
                    })
                )}
              </div>
            </section>
          </div>

          <section className="cg-card">
            <div className="cg-card-header">
              <div className="cg-title">
                <div className="cg-icon blue">
                  <Pill size={18} />
                </div>

                <div>
                  <h2>Quick Actions</h2>
                  <p>Access caregiver tools</p>
                </div>
              </div>
            </div>

            <div className="quick-action-grid">
              <QuickAction
                icon={<Users size={21} />}
                title="My Patients"
                description="View assigned patients"
                onClick={() =>
                  navigate("/caregiver-patients")
                }
              />

              <QuickAction
                icon={<Pill size={21} />}
                title="Medication Monitoring"
                description="Track medications and doses"
                onClick={() =>
                  navigate(
                    "/caregiver-medication-monitoring"
                  )
                }
              />

              <QuickAction
                icon={<TrendingUp size={21} />}
                title="Patient Analytics"
                description="View adherence insights"
                onClick={() =>
                  navigate(
                    "/caregiver-patient-analytics"
                  )
                }
              />

              <QuickAction
                icon={<AlertTriangle size={21} />}
                title="Alerts"
                description="Review important alerts"
                onClick={() =>
                  navigate("/caregiver-alerts")
                }
              />
            </div>
          </section>
        </>
      )}
    </div>
  );
};

const QuickAction = ({
  icon,
  title,
  description,
  onClick,
}) => {
  return (
    <button
      type="button"
      onClick={onClick}
    >
      {icon}

      <span>
        <strong>{title}</strong>
        <small>{description}</small>
      </span>

      <ArrowRight size={15} />
    </button>
  );
};

const getInitials = (name) => {
  return String(name || "P")
    .split(" ")
    .filter(Boolean)
    .map((part) => part[0])
    .join("")
    .slice(0, 2)
    .toUpperCase();
};

const getPatientStatus = (adherence) => {
  if (adherence < 80) {
    return "Critical";
  }

  if (adherence < 90) {
    return "Attention";
  }

  return "Good";
};

const getAlertType = (alert) => {
  const value = String(
    alert.type ||
      alert.alert_type ||
      alert.category ||
      alert.title ||
      ""
  ).toLowerCase();

  if (
    value.includes("miss") ||
    value.includes("critical") ||
    value.includes("danger")
  ) {
    return "danger";
  }

  if (
    value.includes("stock") ||
    value.includes("refill") ||
    value.includes("low") ||
    value.includes("warning")
  ) {
    return "warning";
  }

  return "success";
};

const getAlertTitle = (type) => {
  if (type === "danger") {
    return "Missed dose";
  }

  if (type === "warning") {
    return "Low stock";
  }

  return "Medication completed";
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

const StatCard = ({
  icon,
  label,
  value,
  subtitle,
  tone,
}) => {
  return (
    <div className={`cg-stat-card ${tone}`}>
      <div className="cg-stat-icon">
        {icon}
      </div>

      <div>
        <span>{label}</span>
        <strong>{value}</strong>
        <small>{subtitle}</small>
      </div>
    </div>
  );
};

const caregiverStyles = `
.caregiver-page {
  min-height: 100%;
  padding: 28px 30px 40px;
  background: #f7faf9;
  color: #21362f;
}

.caregiver-header {
  display: flex;
  justify-content: space-between;
  align-items: flex-start;
  gap: 20px;
  margin-bottom: 27px;
}

.caregiver-kicker {
  display: flex;
  align-items: center;
  gap: 7px;
  color: #2f8f7f;
  font-size: 11px;
  font-weight: 800;
  letter-spacing: .12em;
  margin-bottom: 7px;
}

.caregiver-header h1 {
  margin: 0;
  color: #21362f;
  font-size: 29px;
  font-weight: 750;
}

.caregiver-header p {
  margin: 8px 0 0;
  color: #788681;
  font-size: 14px;
}

.cg-header-actions {
  display: flex;
  align-items: center;
  gap: 8px;
}

.cg-refresh-btn,
.cg-primary-btn {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  gap: 7px;
  border-radius: 10px;
  cursor: pointer;
  font-weight: 700;
  transition: .2s ease;
}

.cg-refresh-btn {
  border: 1px solid #dfe8e5;
  padding: 10px 13px;
  background: white;
  color: #2f8f7f;
  font-size: 10px;
}

.cg-refresh-btn:hover {
  background: #f3f9f7;
}

.cg-refresh-btn:disabled {
  opacity: .6;
  cursor: not-allowed;
}

.cg-primary-btn {
  border: 0;
  padding: 11px 16px;
  background: #2f8f7f;
  color: white;
  font-size: 12px;
  box-shadow: 0 5px 16px rgba(47,143,127,.16);
}

.cg-primary-btn:hover {
  background: #26796a;
}

.cg-error {
  display: flex;
  align-items: center;
  gap: 9px;
  margin-bottom: 18px;
  padding: 12px 14px;
  border: 1px solid #f1d3d0;
  border-radius: 11px;
  background: #fff7f6;
  color: #b14d45;
  font-size: 12px;
}

.cg-error > span {
  flex: 1;
}

.cg-error button {
  display: inline-flex;
  align-items: center;
  gap: 6px;
  border: 0;
  border-radius: 7px;
  padding: 7px 10px;
  background: #b14d45;
  color: #fff;
  cursor: pointer;
  font-size: 10px;
  font-weight: 700;
}

.cg-loading {
  min-height: 350px;
  display: flex;
  align-items: center;
  justify-content: center;
  flex-direction: column;
  gap: 10px;
  color: #8d9a95;
  font-size: 12px;
}

.cg-spin {
  animation: cg-spin 1s linear infinite;
}

@keyframes cg-spin {
  from {
    transform: rotate(0deg);
  }

  to {
    transform: rotate(360deg);
  }
}

.cg-stat-grid {
  display: grid;
  grid-template-columns: repeat(4, minmax(0,1fr));
  gap: 16px;
  margin-bottom: 18px;
}

.cg-stat-card {
  display: flex;
  align-items: center;
  gap: 14px;
  background: white;
  border: 1px solid #e4ece9;
  border-radius: 17px;
  padding: 19px;
  min-height: 112px;
  box-shadow: 0 5px 18px rgba(31,54,47,.045);
}

.cg-stat-icon {
  width: 45px;
  height: 45px;
  border-radius: 13px;
  display: flex;
  align-items: center;
  justify-content: center;
  flex-shrink: 0;
}

.cg-stat-card.green .cg-stat-icon {
  background: #e8f5f1;
  color: #2f8f7f;
}

.cg-stat-card.blue .cg-stat-icon {
  background: #eaf4fb;
  color: #4a90c4;
}

.cg-stat-card.red .cg-stat-icon {
  background: #fcebea;
  color: #d1584f;
}

.cg-stat-card.purple .cg-stat-icon {
  background: #f0edfa;
  color: #6b5ca5;
}

.cg-stat-card span,
.cg-stat-card small {
  display: block;
}

.cg-stat-card span {
  color: #75837f;
  font-size: 12px;
  font-weight: 600;
}

.cg-stat-card strong {
  display: block;
  color: #21372f;
  font-size: 25px;
  margin-top: 3px;
}

.cg-stat-card small {
  color: #99a49f;
  font-size: 11px;
  margin-top: 3px;
}

.cg-main-grid {
  display: grid;
  grid-template-columns: 1.4fr 1fr;
  gap: 18px;
  margin-bottom: 18px;
}

.cg-card {
  background: white;
  border: 1px solid #e4ece9;
  border-radius: 17px;
  padding: 20px 21px;
  box-shadow: 0 5px 18px rgba(31,54,47,.045);
}

.cg-card-header {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 15px;
  margin-bottom: 18px;
}

.cg-title {
  display: flex;
  align-items: center;
  gap: 11px;
}

.cg-icon {
  width: 38px;
  height: 38px;
  display: flex;
  align-items: center;
  justify-content: center;
  border-radius: 11px;
}

.cg-icon.green {
  background: #e8f5f1;
  color: #2f8f7f;
}

.cg-icon.red {
  background: #fcebea;
  color: #d1584f;
}

.cg-icon.blue {
  background: #eaf4fb;
  color: #4a90c4;
}

.cg-title h2 {
  margin: 0;
  color: #263b34;
  font-size: 15px;
}

.cg-title p {
  margin: 3px 0 0;
  color: #87938f;
  font-size: 11px;
}

.cg-link-btn {
  display: inline-flex;
  align-items: center;
  gap: 5px;
  border: 0;
  background: transparent;
  color: #2f8f7f;
  cursor: pointer;
  font-size: 11px;
  font-weight: 700;
}

.patient-list {
  display: flex;
  flex-direction: column;
}

.patient-row {
  display: grid;
  grid-template-columns: 1.15fr 1fr auto;
  gap: 15px;
  align-items: center;
  padding: 13px 0;
  border-bottom: 1px solid #edf2f0;
}

.patient-row:last-child {
  border-bottom: 0;
}

.patient-main {
  display: flex;
  align-items: center;
  gap: 10px;
  min-width: 0;
}

.patient-avatar {
  width: 34px;
  height: 34px;
  border-radius: 10px;
  background: #e8f5f1;
  color: #2f8f7f;
  display: flex;
  align-items: center;
  justify-content: center;
  font-size: 10px;
  font-weight: 800;
  flex-shrink: 0;
}

.patient-main > div:last-child {
  min-width: 0;
}

.patient-main strong {
  display: block;
  color: #31463f;
  font-size: 12px;
}

.patient-meta {
  display: flex;
  align-items: center;
  flex-wrap: wrap;
  gap: 7px;
  margin-top: 3px;
  color: #8a9692;
  font-size: 10px;
}

.patient-meta span {
  display: inline-flex;
  align-items: center;
  gap: 4px;
}

.patient-meta-separator {
  width: 3px;
  height: 3px;
  border-radius: 50%;
  background: #a6b0ac;
}

.patient-progress-label {
  display: flex;
  justify-content: space-between;
  font-size: 10px;
  color: #87938f;
  margin-bottom: 5px;
}

.patient-progress-label strong {
  color: #2f8f7f;
}

.progress-track {
  width: 100%;
  height: 6px;
  background: #edf2f0;
  border-radius: 10px;
  overflow: hidden;
}

.progress-fill {
  height: 100%;
  background: #2f8f7f;
  border-radius: inherit;
}

.progress-fill.attention {
  background: #c18a35;
}

.progress-fill.critical {
  background: #d1584f;
}

.cg-status {
  display: inline-flex;
  align-items: center;
  gap: 4px;
  padding: 5px 9px;
  border-radius: 8px;
  font-size: 9px;
  font-weight: 800;
  white-space: nowrap;
}

.cg-status.good {
  color: #277967;
  background: #e8f5f1;
}

.cg-status.attention {
  color: #9a7228;
  background: #fff4d9;
}

.cg-status.critical {
  color: #c14d45;
  background: #fcebea;
}

.alert-list {
  display: flex;
  flex-direction: column;
}

.alert-row {
  display: flex;
  align-items: flex-start;
  gap: 10px;
  padding: 13px 0;
  border-bottom: 1px solid #edf2f0;
}

.alert-row:last-child {
  border-bottom: 0;
}

.alert-icon {
  width: 33px;
  height: 33px;
  border-radius: 9px;
  display: flex;
  align-items: center;
  justify-content: center;
  flex-shrink: 0;
}

.alert-icon.danger {
  background: #fcebea;
  color: #d1584f;
}

.alert-icon.warning {
  background: #fff3d7;
  color: #bd852e;
}

.alert-icon.success {
  background: #e8f5f1;
  color: #2f8f7f;
}

.alert-content {
  min-width: 0;
}

.alert-content strong {
  display: block;
  color: #334940;
  font-size: 12px;
}

.alert-content p {
  margin: 3px 0;
  color: #7f8d88;
  font-size: 11px;
  line-height: 1.45;
}

.alert-time {
  display: inline-flex;
  align-items: center;
  gap: 4px;
  color: #a1aaa6;
  font-size: 9px;
}

.cg-empty {
  min-height: 180px;
  display: flex;
  align-items: center;
  justify-content: center;
  flex-direction: column;
  gap: 7px;
  color: #9aa6a1;
  text-align: center;
}

.cg-empty strong {
  color: #60716a;
  font-size: 12px;
}

.cg-empty span {
  color: #929d99;
  font-size: 10px;
}

.quick-action-grid {
  display: grid;
  grid-template-columns: repeat(4,1fr);
  gap: 12px;
}

.quick-action-grid button {
  display: grid;
  grid-template-columns: auto 1fr auto;
  align-items: center;
  gap: 11px;
  border: 1px solid #e6eeeb;
  background: #fbfcfc;
  border-radius: 13px;
  padding: 14px;
  text-align: left;
  cursor: pointer;
  transition: .2s ease;
}

.quick-action-grid button:hover {
  border-color: #bfded6;
  background: #f7fbfa;
  transform: translateY(-1px);
}

.quick-action-grid button > svg:first-child {
  color: #2f8f7f;
  flex-shrink: 0;
}

.quick-action-grid button > svg:last-child {
  color: #98a6a1;
}

.quick-action-grid strong {
  display: block;
  color: #334940;
  font-size: 11px;
}

.quick-action-grid small {
  display: block;
  color: #8b9793;
  font-size: 9px;
  margin-top: 3px;
}

@media (max-width: 1050px) {
  .cg-stat-grid {
    grid-template-columns: repeat(2,1fr);
  }

  .cg-main-grid {
    grid-template-columns: 1fr;
  }

  .quick-action-grid {
    grid-template-columns: repeat(2,1fr);
  }
}

@media (max-width: 700px) {
  .caregiver-page {
    padding: 22px 16px 30px;
  }

  .caregiver-header {
    flex-direction: column;
  }

  .cg-header-actions {
    width: 100%;
  }

  .cg-primary-btn,
  .cg-refresh-btn {
    flex: 1;
  }

  .cg-stat-grid {
    grid-template-columns: 1fr;
  }

  .patient-row {
    grid-template-columns: 1fr;
  }

  .cg-status {
    width: fit-content;
  }

  .quick-action-grid {
    grid-template-columns: 1fr;
  }

  .cg-error {
    align-items: flex-start;
    flex-direction: column;
  }
}
`;

export default CaregiverDashboard;
