import React, { useEffect, useMemo, useState } from "react";
import {
  AlertTriangle,
  CheckCircle2,
  Pill,
  RefreshCw,
  Clock3,
  Package,
} from "lucide-react";

import { fetchAdminRefills } from "../../services/api";

const AdminRefills = () => {
  const [refills, setRefills] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  const loadRefills = async () => {
    try {
      setLoading(true);
      setError("");

      const data = await fetchAdminRefills();

      setRefills(
        Array.isArray(data) ? data : []
      );
    } catch (err) {
      console.error(
        "Admin refills error:",
        err
      );

      setError(
        err?.response?.data?.detail ||
          err?.message ||
          "Unable to load refill predictions."
      );
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadRefills();
  }, []);

  const critical = refills.filter(
    (item) =>
      String(item.status).toLowerCase() ===
      "critical"
  ).length;

  const warning = refills.filter(
    (item) =>
      String(item.status).toLowerCase() ===
      "warning"
  ).length;

  const healthy = refills.filter(
    (item) =>
      String(item.status).toLowerCase() ===
      "healthy"
  ).length;

  const maxDays = useMemo(() => {
    const values = refills
      .map((item) =>
        Number(item.remaining_days)
      )
      .filter((value) => Number.isFinite(value));

    return Math.max(...values, 1);
  }, [refills]);

  const getStatusClass = (status) => {
    const value = String(
      status || "healthy"
    ).toLowerCase();

    if (value === "critical") {
      return "critical";
    }

    if (value === "warning") {
      return "warning";
    }

    return "healthy";
  };

  const getStatusIcon = (status) => {
    const type = getStatusClass(status);

    if (type === "critical") {
      return <AlertTriangle size={19} />;
    }

    if (type === "warning") {
      return <Clock3 size={19} />;
    }

    return <CheckCircle2 size={19} />;
  };

  return (
    <div className="admin-refills-page">
      <style>{styles}</style>

      {/* HEADER */}

      <header className="refills-header">
        <div>
          <p className="refills-eyebrow">
            Administration
          </p>

          <h1>Refill Analytics</h1>

          <p>
            Monitor medicine inventory and refill
            predictions across PillSync.
          </p>
        </div>

        <button
          className="refills-refresh-btn"
          onClick={loadRefills}
          type="button"
        >
          <RefreshCw size={17} />
          Refresh
        </button>
      </header>

      {/* ERROR */}

      {error && (
        <div className="refills-error">
          <AlertTriangle size={18} />
          <span>{error}</span>
        </div>
      )}

      {/* SUMMARY */}

      <section className="refills-stats">
        <RefillStat
          icon={<AlertTriangle size={21} />}
          value={critical}
          label="Critical"
          tone="critical"
        />

        <RefillStat
          icon={<Clock3 size={21} />}
          value={warning}
          label="Warning"
          tone="warning"
        />

        <RefillStat
          icon={<CheckCircle2 size={21} />}
          value={healthy}
          label="Healthy"
          tone="healthy"
        />

        <RefillStat
          icon={<Package size={21} />}
          value={refills.length}
          label="Medicines Tracked"
          tone="teal"
        />
      </section>

      {/* CONTENT */}

      <section className="refills-panel">
        <div className="refills-panel-header">
          <div>
            <p className="refills-kicker">
              Inventory monitoring
            </p>

            <h2>
              Medicine Refill Predictions
            </h2>

            <p>
              Predicted stock depletion and
              recommended refill timing.
            </p>
          </div>

          <div className="refills-total">
            {refills.length} records
          </div>
        </div>

        {loading ? (
          <div className="refills-state">
            <div className="refills-spinner" />
            <p>
              Calculating refill predictions...
            </p>
          </div>
        ) : refills.length === 0 ? (
          <div className="refills-state">
            <Package size={30} />

            <h3>
              No refill predictions available
            </h3>

            <p>
              There are currently no medicine
              refill records to display.
            </p>
          </div>
        ) : (
          <div className="refills-list">
            {refills.map((item, index) => {
              const status =
                getStatusClass(item.status);

              const remainingDays = Number(
                item.remaining_days || 0
              );

              const progress = Math.max(
                Math.min(
                  (remainingDays / maxDays) * 100,
                  100
                ),
                4
              );

              const medicineName =
                item.medicine_name ||
                item.medicineName ||
                "Medicine";

              const availableQty =
                item.available_qty ??
                item.availableQty ??
                0;

              const dailyConsumption =
                item.daily_consumption ??
                item.dailyConsumption ??
                0;

              const reorderLevel =
                item.reorder_level ??
                item.reorderLevel ??
                0;

              const predictedDate =
                item.predicted_refill_date ||
                item.predictedRefillDate ||
                "-";

              return (
                <div
                  className="refill-item"
                  key={
                    item.medicine_id ||
                    item.id ||
                    index
                  }
                >
                  <div
                    className={`refill-status-icon ${status}`}
                  >
                    {getStatusIcon(
                      item.status
                    )}
                  </div>

                  <div className="refill-main">
                    <div className="refill-title-row">
                      <div className="refill-name">
                        <Pill size={17} />

                        <div>
                          <h3>
                            {medicineName}
                          </h3>

                          <p>
                            {item.brand
                              ? `${item.brand} | `
                              : ""}
                            {item.category ||
                              "General"}
                          </p>
                        </div>
                      </div>

                      <span
                        className={`refill-status-badge ${status}`}
                      >
                        {item.status ||
                          "Healthy"}
                      </span>
                    </div>

                    <div className="refill-details">
                      <div>
                        <span>
                          Available
                        </span>

                        <strong>
                          {availableQty}
                        </strong>
                      </div>

                      <div>
                        <span>
                          Daily use
                        </span>

                        <strong>
                          {dailyConsumption}
                          /day
                        </strong>
                      </div>

                      <div>
                        <span>
                          Reorder level
                        </span>

                        <strong>
                          {reorderLevel}
                        </strong>
                      </div>

                      <div>
                        <span>
                          Refill by
                        </span>

                        <strong>
                          {predictedDate}
                        </strong>
                      </div>
                    </div>

                    <div className="refill-progress-area">
                      <div className="refill-progress-header">
                        <span>
                          Estimated stock
                        </span>

                        <strong>
                          {remainingDays} days
                          remaining
                        </strong>
                      </div>

                      <div className="refill-progress">
                        <div
                          className={`refill-progress-fill ${status}`}
                          style={{
                            width: `${progress}%`,
                          }}
                        />
                      </div>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </section>
    </div>
  );
};

const RefillStat = ({
  icon,
  value,
  label,
  tone,
}) => {
  return (
    <div className="refill-stat">
      <div
        className={`refill-stat-icon ${tone}`}
      >
        {icon}
      </div>

      <div>
        <strong>{value}</strong>
        <span>{label}</span>
      </div>
    </div>
  );
};

const styles = `
  .admin-refills-page {
    min-height: calc(100vh - 80px);
    padding: 28px;
    background: #f7f9fc;
    color: #172033;
  }

  .refills-header {
    display: flex;
    align-items: flex-start;
    justify-content: space-between;
    gap: 20px;
    margin-bottom: 24px;
  }

  .refills-eyebrow,
  .refills-kicker {
    margin: 0 0 6px;
    color: #0f9488;
    font-size: 11px;
    font-weight: 700;
    text-transform: uppercase;
    letter-spacing: .08em;
  }

  .refills-header h1 {
    margin: 0;
    color: #172033;
    font-size: 30px;
    font-weight: 750;
  }

  .refills-header > div > p:last-child {
    margin: 7px 0 0;
    color: #697386;
    font-size: 14px;
  }

  .refills-refresh-btn {
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

  .refills-refresh-btn:hover {
    background: #f9fafb;
  }

  .refills-error {
    display: flex;
    align-items: center;
    gap: 9px;
    margin-bottom: 18px;
    padding: 12px 14px;
    border: 1px solid #fecaca;
    border-radius: 10px;
    background: #fff5f5;
    color: #b42318;
    font-size: 13px;
  }

  .refills-stats {
    display: grid;
    grid-template-columns: repeat(4, minmax(0, 1fr));
    gap: 14px;
    margin-bottom: 18px;
  }

  .refill-stat {
    display: flex;
    align-items: center;
    gap: 12px;
    padding: 16px;
    border: 1px solid #e7ebf0;
    border-radius: 12px;
    background: #fff;
    box-shadow: 0 2px 8px rgba(15, 23, 42, .03);
  }

  .refill-stat-icon {
    width: 42px;
    height: 42px;
    min-width: 42px;
    display: flex;
    align-items: center;
    justify-content: center;
    border-radius: 11px;
  }

  .refill-stat-icon.critical {
    background: #fff1f3;
    color: #d92d20;
  }

  .refill-stat-icon.warning {
    background: #fff8eb;
    color: #dc6803;
  }

  .refill-stat-icon.healthy {
    background: #ecfdf3;
    color: #039855;
  }

  .refill-stat-icon.teal {
    background: #e8f8f6;
    color: #0f9488;
  }

  .refill-stat strong {
    display: block;
    color: #172033;
    font-size: 21px;
  }

  .refill-stat span {
    display: block;
    margin-top: 3px;
    color: #7b8495;
    font-size: 11px;
  }

  .refills-panel {
    padding: 20px;
    border: 1px solid #e7ebf0;
    border-radius: 14px;
    background: #fff;
    box-shadow: 0 2px 8px rgba(15, 23, 42, .03);
  }

  .refills-panel-header {
    display: flex;
    align-items: flex-start;
    justify-content: space-between;
    gap: 15px;
    margin-bottom: 20px;
  }

  .refills-panel-header h2 {
    margin: 0;
    color: #172033;
    font-size: 19px;
  }

  .refills-panel-header p:last-child {
    margin: 4px 0 0;
    color: #7b8495;
    font-size: 12px;
  }

  .refills-total {
    padding: 6px 10px;
    border-radius: 999px;
    background: #eef8f7;
    color: #0f766e;
    font-size: 11px;
    font-weight: 700;
    white-space: nowrap;
  }

  .refills-list {
    display: flex;
    flex-direction: column;
    gap: 12px;
  }

  .refill-item {
    display: flex;
    gap: 13px;
    padding: 16px;
    border: 1px solid #edf0f3;
    border-radius: 12px;
    background: #fbfcfd;
  }

  .refill-status-icon {
    width: 40px;
    height: 40px;
    min-width: 40px;
    display: flex;
    align-items: center;
    justify-content: center;
    border-radius: 10px;
  }

  .refill-status-icon.critical {
    background: #fff1f3;
    color: #d92d20;
  }

  .refill-status-icon.warning {
    background: #fff8eb;
    color: #dc6803;
  }

  .refill-status-icon.healthy {
    background: #ecfdf3;
    color: #039855;
  }

  .refill-main {
    flex: 1;
    min-width: 0;
  }

  .refill-title-row {
    display: flex;
    align-items: flex-start;
    justify-content: space-between;
    gap: 12px;
  }

  .refill-name {
    display: flex;
    align-items: center;
    gap: 9px;
    color: #0f9488;
  }

  .refill-name h3 {
    margin: 0;
    color: #172033;
    font-size: 14px;
  }

  .refill-name p {
    margin: 3px 0 0;
    color: #7b8495;
    font-size: 11px;
  }

  .refill-status-badge {
    display: inline-flex;
    padding: 5px 9px;
    border-radius: 999px;
    font-size: 10px;
    font-weight: 700;
    text-transform: capitalize;
    white-space: nowrap;
  }

  .refill-status-badge.critical {
    background: #fff1f3;
    color: #b42318;
  }

  .refill-status-badge.warning {
    background: #fff7ed;
    color: #c2410c;
  }

  .refill-status-badge.healthy {
    background: #ecfdf3;
    color: #087443;
  }

  .refill-details {
    display: grid;
    grid-template-columns: repeat(4, minmax(0, 1fr));
    gap: 10px;
    margin: 15px 0;
  }

  .refill-details div {
    padding: 9px 10px;
    border-radius: 8px;
    background: #f4f6f8;
  }

  .refill-details span {
    display: block;
    color: #98a2b3;
    font-size: 10px;
  }

  .refill-details strong {
    display: block;
    margin-top: 3px;
    color: #344054;
    font-size: 12px;
  }

  .refill-progress-header {
    display: flex;
    align-items: center;
    justify-content: space-between;
    margin-bottom: 6px;
    color: #7b8495;
    font-size: 10px;
  }

  .refill-progress-header strong {
    color: #475467;
  }

  .refill-progress {
    height: 7px;
    overflow: hidden;
    border-radius: 999px;
    background: #e9eef2;
  }

  .refill-progress-fill {
    height: 100%;
    min-width: 4px;
    border-radius: inherit;
  }

  .refill-progress-fill.critical {
    background: #ef4444;
  }

  .refill-progress-fill.warning {
    background: #f59e0b;
  }

  .refill-progress-fill.healthy {
    background: #22c55e;
  }

  .refills-state {
    min-height: 260px;
    display: flex;
    align-items: center;
    justify-content: center;
    flex-direction: column;
    text-align: center;
    color: #98a2b3;
  }

  .refills-state p {
    margin: 10px 0 0;
    font-size: 13px;
  }

  .refills-state h3 {
    margin: 10px 0 5px;
    color: #344054;
    font-size: 15px;
  }

  .refills-spinner {
    width: 28px;
    height: 28px;
    border: 3px solid #d8eeeb;
    border-top-color: #14b8a6;
    border-radius: 50%;
    animation: refills-spin .7s linear infinite;
  }

  @keyframes refills-spin {
    to {
      transform: rotate(360deg);
    }
  }

  @media (max-width: 1000px) {
    .refills-stats {
      grid-template-columns: repeat(2, minmax(0, 1fr));
    }

    .refill-details {
      grid-template-columns: repeat(2, minmax(0, 1fr));
    }
  }

  @media (max-width: 700px) {
    .admin-refills-page {
      padding: 18px;
    }

    .refills-header {
      flex-direction: column;
    }

    .refills-header h1 {
      font-size: 25px;
    }

    .refills-refresh-btn {
      width: 100%;
    }

    .refills-panel-header {
      flex-direction: column;
    }

    .refill-title-row {
      align-items: flex-start;
      flex-direction: column;
    }
  }

  @media (max-width: 500px) {
    .refills-stats,
    .refill-details {
      grid-template-columns: 1fr;
    }

    .refill-item {
      align-items: flex-start;
    }
  }
`;

export default AdminRefills;