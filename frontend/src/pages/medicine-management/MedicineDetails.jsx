import React, { useEffect, useState } from "react";
import { useNavigate, useParams } from "react-router-dom";
import {
  ChevronLeft,
  Edit3,
  RefreshCw,
  Pill,
  Clock,
  Package,
  Activity,
} from "lucide-react";

import medicationService from "../../services/medicationService";

const MedicineDetails = () => {
  const { id } = useParams();
  const navigate = useNavigate();

  const [medicine, setMedicine] = useState(null);
  const [history, setHistory] = useState([]);
  const [loading, setLoading] = useState(true);
  const [historyLoading, setHistoryLoading] =
    useState(true);
  const [error, setError] = useState("");

  useEffect(() => {
    loadDetails();
  }, [id]);

  const loadDetails = async () => {
    try {
      setLoading(true);
      setHistoryLoading(true);

      const response =
        await medicationService.getMedicine(id);

      setMedicine(response.data);

      try {
        const historyResponse =
          await medicationService.getMedicineHistory(
            id
          );

        setHistory(
          Array.isArray(historyResponse.data)
            ? historyResponse.data
            : []
        );
      } catch (err) {
        console.error(
          "History loading failed:",
          err
        );
        setHistory([]);
      } finally {
        setHistoryLoading(false);
      }
    } catch (err) {
      console.error(
        "Details loading failed:",
        err
      );

      setError(
        "Unable to load medicine details."
      );
    } finally {
      setLoading(false);
    }
  };

  if (loading) {
    return (
      <div className="dashboard-loading">
        <div className="spinner" />
        <p>Loading medicine details...</p>
      </div>
    );
  }

  if (!medicine) {
    return (
      <div className="vin-empty-card">
        <Pill size={28} />

        <h3>Medicine not found</h3>

        <button
          className="vin-primary-btn"
          onClick={() =>
            navigate("/medicines")
          }
        >
          Go to medicines
        </button>
      </div>
    );
  }

  const total = Number(
    medicine.total_stock || 0
  );

  const remaining = Number(
    medicine.remaining_stock || 0
  );

  const percentage =
    total > 0
      ? Math.min(
          100,
          Math.max(
            0,
            (remaining / total) * 100
          )
        )
      : 0;

  const status =
    remaining <= 0
      ? "Out of stock"
      : total > 0 &&
        remaining <= total * 0.2
      ? "Low stock"
      : "Active";

  return (
    <div className="vin-medicine-page">
      <div className="vin-detail-toolbar">
        <button
          className="vin-back-button"
          onClick={() =>
            navigate("/medicines")
          }
        >
          <ChevronLeft size={16} />
          Back to medicine list
        </button>

        <div className="vin-edit-actions">
          <button
            className="vin-secondary-btn"
            onClick={() =>
              navigate(
                `/medicines/${medicine.id}/edit`
              )
            }
          >
            <Edit3 size={16} />
            Edit
          </button>

          <button
            className="vin-primary-btn"
            onClick={() =>
              navigate("/reminders")
            }
          >
            <RefreshCw size={16} />
            Manage reminder
          </button>
        </div>
      </div>

      {error && (
        <div className="vin-error">
          {error}
        </div>
      )}

      <div className="vin-detail-layout">
        <div className="vin-detail-main">
          <section className="vin-detail-card-large">
            <div className="vin-detail-identity">
              <div className="vin-detail-pill">
                <Pill size={30} />
              </div>

              <div>
                <div className="vin-detail-name-row">
                  <h1>{medicine.name}</h1>

                  <span
                    className={`vin-status ${
                      status === "Active"
                        ? "vin-status-green"
                        : status === "Low stock"
                        ? "vin-status-amber"
                        : "vin-status-red"
                    }`}
                  >
                    {status}
                  </span>
                </div>

                <p>
                  {medicine.dosage} â€¢{" "}
                  {medicine.frequency}
                </p>

                <span className="vin-category">
                  {medicine.condition ||
                    "General medication"}
                </span>
              </div>
            </div>
          </section>

          <section className="vin-detail-card-large">
            <h2>Dosage and usage</h2>

            <div className="vin-detail-stat-grid">
              <div>
                <small>Dosage</small>
                <strong>
                  {medicine.dosage}
                </strong>
              </div>

              <div>
                <small>Frequency</small>
                <strong>
                  {medicine.frequency}
                </strong>
              </div>

              <div>
                <small>Doses per day</small>
                <strong>
                  {medicine.doses_per_day || 1}
                </strong>
              </div>

              <div>
                <small>Condition</small>
                <strong>
                  {medicine.condition ||
                    "Not specified"}
                </strong>
              </div>
            </div>
          </section>

          <section className="vin-detail-card-large">
            <div className="vin-section-header">
              <div>
                <h2>Medicine timeline</h2>
                <p>
                  Recorded dose activity.
                </p>
              </div>

              <Activity size={18} />
            </div>

            {historyLoading ? (
              <p className="vin-muted">
                Loading history...
              </p>
            ) : history.length === 0 ? (
              <div className="vin-history-empty">
                No dose history recorded yet.
              </div>
            ) : (
              <div className="vin-history-list">
                {history.map((item) => (
                  <div
                    key={item.id}
                    className="vin-history-item"
                  >
                    <div>
                      <strong>
                        {item.date}
                      </strong>

                      <span>
                        {item.time}
                      </span>
                    </div>

                    <span
                      className={`vin-history-status ${
                        item.status === "taken"
                          ? "vin-history-taken"
                          : item.status ===
                            "missed"
                          ? "vin-history-missed"
                          : "vin-history-pending"
                      }`}
                    >
                      {item.status}
                    </span>
                  </div>
                ))}
              </div>
            )}
          </section>
        </div>

        <div className="vin-detail-side">
          <section className="vin-detail-card">
            <div className="vin-side-icon">
              <Package size={19} />
            </div>

            <h3>Remaining stock</h3>

            <div className="vin-stock-big">
              {remaining}
              <span>
                / {total}
              </span>
            </div>

            <div className="vin-progress">
              <div
                className={`vin-progress-fill ${
                  percentage <= 20
                    ? "vin-progress-red"
                    : percentage <= 50
                    ? "vin-progress-amber"
                    : "vin-progress-green"
                }`}
                style={{
                  width: `${percentage}%`,
                }}
              />
            </div>

            <p className="vin-muted">
              {Math.round(percentage)}% remaining
            </p>
          </section>

          <section className="vin-detail-card">
            <div className="vin-side-icon">
              <Clock size={19} />
            </div>

            <h3>Medication schedule</h3>

            <p className="vin-muted">
              {medicine.doses_per_day || 1} dose
              {(medicine.doses_per_day || 1) !==
              1
                ? "s"
                : ""}{" "}
              per day
            </p>

            <button
              className="vin-secondary-btn"
              onClick={() =>
                navigate("/reminders")
              }
            >
              View reminders
            </button>
          </section>
        </div>
      </div>
    </div>
  );
};

export default MedicineDetails;



