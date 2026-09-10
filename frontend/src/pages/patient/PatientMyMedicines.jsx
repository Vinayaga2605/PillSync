import React, { useEffect, useState } from "react";
import {
  fetchMySchedule,
  takeMedicine,
  fetchMedicines,
  addSchedule,
  fetchAvailableCaregivers,
  requestCaregiver,
} from "../../services/api";

const PatientMyMedicines = () => {
  const [schedule, setSchedule] = useState([]);
  const [medicines, setMedicines] = useState([]);
  const [caregivers, setCaregivers] = useState([]);

  const [loading, setLoading] = useState(true);
  const [message, setMessage] = useState("");
  const [showAdd, setShowAdd] = useState(false);

  const [form, setForm] = useState({
    medicine_id: "",
    dosage: "",
    time: "",
    label: "",
  });

  const loadData = async () => {
    try {
      setLoading(true);

      const [scheduleData, medicineData, caregiverData] =
        await Promise.all([
          fetchMySchedule(),
          fetchMedicines(),
          fetchAvailableCaregivers(),
        ]);

      setSchedule(
        Array.isArray(scheduleData) ? scheduleData : []
      );

      setMedicines(
        Array.isArray(medicineData) ? medicineData : []
      );

      setCaregivers(
        Array.isArray(caregiverData)
          ? caregiverData
          : []
      );
    } catch (error) {
      console.error("My Schedule error:", error);
      setMessage("Unable to load your medication schedule.");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadData();
  }, []);

  const handleTake = async (id) => {
    try {
      await takeMedicine(id);
      setMessage("Medicine marked as taken.");
      await loadData();
    } catch (error) {
      console.error(error);
      setMessage("Unable to mark medicine as taken.");
    }
  };

  const handleAddSchedule = async (e) => {
    e.preventDefault();

    if (!form.medicine_id || !form.time) {
      setMessage("Please select a medicine and time.");
      return;
    }

    try {
      await addSchedule({
        medication: Number(form.medicine_id),
        time: form.time,
        label: form.label,
        status: "pending",
      });

      setMessage("Medication schedule added.");
      setShowAdd(false);

      setForm({
        medicine_id: "",
        dosage: "",
        time: "",
        label: "",
      });

      await loadData();
    } catch (error) {
      console.error("Add schedule error:", error);
      setMessage("Unable to add the schedule.");
    }
  };

  const handleRequestCaregiver = async (caregiverId) => {
    try {
      await requestCaregiver(caregiverId);
      setMessage("Caregiver request sent.");
    } catch (error) {
      console.error(error);
      setMessage("Unable to send caregiver request.");
    }
  };

  const getMedicineName = (item) => {
    return (
      item.medicineName ||
      item.medicine_name ||
      item.medication_name ||
      item.medication?.name ||
      "Medicine"
    );
  };

  const getDosage = (item) => {
    return (
      item.dosage ||
      item.medication?.dosage ||
      "-"
    );
  };

  const getTime = (item) => {
    return item.time || "--:--";
  };

  const getStatus = (item) => {
    return (
      item.status ||
      (item.taken ? "taken" : "pending")
    ).toLowerCase();
  };

  const completedCount = schedule.filter(
    (item) => getStatus(item) === "taken"
  ).length;

  return (
    <div className="schedule-page">
      <style>{`
        .schedule-page {
          padding: 28px;
          min-height: calc(100vh - 80px);
          background: #f6f8fb;
        }

        .schedule-header {
          display: flex;
          justify-content: space-between;
          align-items: center;
          gap: 20px;
          margin-bottom: 24px;
        }

        .schedule-title {
          margin: 0;
          font-size: 28px;
          font-weight: 700;
          color: #172033;
        }

        .schedule-subtitle {
          margin: 6px 0 0;
          color: #697386;
          font-size: 14px;
        }

        .schedule-add-btn {
          border: none;
          border-radius: 10px;
          padding: 12px 18px;
          background: #14b8a6;
          color: white;
          font-size: 14px;
          font-weight: 600;
          cursor: pointer;
        }

        .schedule-add-btn:hover {
          background: #0f9f90;
        }

        .schedule-message {
          background: #ecfdf5;
          border: 1px solid #a7f3d0;
          color: #047857;
          border-radius: 10px;
          padding: 12px 14px;
          margin-bottom: 20px;
          font-size: 14px;
        }

        .schedule-grid {
          display: grid;
          grid-template-columns: minmax(0, 2fr) minmax(280px, 1fr);
          gap: 20px;
        }

        .schedule-card {
          background: white;
          border: 1px solid #e6eaf0;
          border-radius: 14px;
          padding: 20px;
        }

        .schedule-card-title {
          margin: 0 0 5px;
          font-size: 18px;
          color: #172033;
        }

        .schedule-card-subtitle {
          margin: 0 0 18px;
          font-size: 13px;
          color: #7b8495;
        }

        .dose-list {
          display: flex;
          flex-direction: column;
          gap: 12px;
        }

        .dose-item {
          display: flex;
          align-items: center;
          justify-content: space-between;
          gap: 16px;
          border: 1px solid #edf0f4;
          border-radius: 11px;
          padding: 15px;
        }

        .dose-left {
          display: flex;
          align-items: center;
          gap: 14px;
          min-width: 0;
        }

        .dose-icon {
          width: 42px;
          height: 42px;
          border-radius: 11px;
          display: flex;
          align-items: center;
          justify-content: center;
          background: #e8f8f6;
          font-size: 21px;
        }

        .dose-name {
          margin: 0;
          color: #172033;
          font-size: 15px;
          font-weight: 600;
        }

        .dose-detail {
          margin: 4px 0 0;
          color: #7b8495;
          font-size: 12px;
        }

        .dose-right {
          display: flex;
          align-items: center;
          gap: 12px;
        }

        .dose-time {
          font-weight: 600;
          font-size: 13px;
          color: #334155;
          white-space: nowrap;
        }

        .status-badge {
          padding: 5px 9px;
          border-radius: 999px;
          font-size: 11px;
          font-weight: 700;
          text-transform: capitalize;
        }

        .status-pending {
          background: #fff7ed;
          color: #c2410c;
        }

        .status-taken {
          background: #ecfdf5;
          color: #047857;
        }

        .status-missed {
          background: #fef2f2;
          color: #b91c1c;
        }

        .take-btn {
          border: none;
          border-radius: 8px;
          padding: 8px 11px;
          background: #172033;
          color: white;
          font-size: 12px;
          cursor: pointer;
        }

        .take-btn:hover {
          background: #273247;
        }

        .empty-state {
          padding: 35px 15px;
          text-align: center;
          color: #7b8495;
          font-size: 14px;
        }

        .summary-number {
          font-size: 36px;
          font-weight: 700;
          color: #172033;
          margin: 8px 0;
        }

        .summary-text {
          color: #7b8495;
          font-size: 13px;
        }

        .progress-track {
          width: 100%;
          height: 8px;
          background: #edf1f5;
          border-radius: 99px;
          overflow: hidden;
          margin-top: 14px;
        }

        .progress-bar {
          height: 100%;
          background: #14b8a6;
          border-radius: 99px;
          transition: width .2s ease;
        }

        .caregiver-list {
          display: flex;
          flex-direction: column;
          gap: 10px;
        }

        .caregiver-item {
          border: 1px solid #edf0f4;
          border-radius: 10px;
          padding: 12px;
        }

        .caregiver-name {
          margin: 0;
          font-size: 14px;
          font-weight: 600;
          color: #172033;
        }

        .caregiver-email {
          margin: 4px 0 10px;
          color: #7b8495;
          font-size: 12px;
        }

        .caregiver-btn {
          border: 1px solid #d8dee7;
          background: white;
          border-radius: 8px;
          padding: 7px 10px;
          font-size: 12px;
          cursor: pointer;
        }

        .caregiver-btn:hover {
          background: #f8fafc;
        }

        .modal-overlay {
          position: fixed;
          inset: 0;
          background: rgba(15, 23, 42, .45);
          display: flex;
          align-items: center;
          justify-content: center;
          z-index: 1000;
          padding: 20px;
        }

        .modal {
          background: white;
          width: min(500px, 100%);
          border-radius: 16px;
          padding: 24px;
        }

        .modal-title {
          margin: 0 0 20px;
          font-size: 20px;
          color: #172033;
        }

        .form-group {
          margin-bottom: 15px;
        }

        .form-label {
          display: block;
          margin-bottom: 6px;
          font-size: 13px;
          color: #475569;
          font-weight: 600;
        }

        .form-input,
        .form-select {
          width: 100%;
          box-sizing: border-box;
          border: 1px solid #dbe1e8;
          border-radius: 9px;
          padding: 10px 12px;
          outline: none;
          font-size: 14px;
        }

        .form-input:focus,
        .form-select:focus {
          border-color: #14b8a6;
        }

        .modal-actions {
          display: flex;
          justify-content: flex-end;
          gap: 10px;
          margin-top: 20px;
        }

        .cancel-btn {
          border: 1px solid #dbe1e8;
          background: white;
          border-radius: 9px;
          padding: 10px 14px;
          cursor: pointer;
        }

        .save-btn {
          border: none;
          background: #14b8a6;
          color: white;
          border-radius: 9px;
          padding: 10px 14px;
          cursor: pointer;
          font-weight: 600;
        }

        @media (max-width: 900px) {
          .schedule-grid {
            grid-template-columns: 1fr;
          }
        }

        @media (max-width: 650px) {
          .schedule-page {
            padding: 18px;
          }

          .schedule-header {
            align-items: flex-start;
            flex-direction: column;
          }

          .dose-item {
            align-items: flex-start;
            flex-direction: column;
          }

          .dose-right {
            width: 100%;
            justify-content: space-between;
          }
        }
      `}</style>

      <div className="schedule-header">
        <div>
          <h1 className="schedule-title">
            My Medicines
          </h1>

          <p className="schedule-subtitle">
            {completedCount} of {schedule.length} doses
            taken today
          </p>
        </div>

        <button
          className="schedule-add-btn"
          onClick={() => setShowAdd(true)}
        >
          + Add Medicine
        </button>
      </div>

      {message && (
        <div className="schedule-message">
          {message}
        </div>
      )}

      <div className="schedule-grid">
        <section className="schedule-card">
          <h2 className="schedule-card-title">
            Daily Medication Plan
          </h2>

          <p className="schedule-card-subtitle">
            Your scheduled medicines for today
          </p>

          {loading ? (
            <div className="empty-state">
              Loading your medication schedule...
            </div>
          ) : schedule.length === 0 ? (
            <div className="empty-state">
              No medicines scheduled yet.
              <br />
              Click <strong>+ Add Medicine</strong> to
              create a schedule.
            </div>
          ) : (
            <div className="dose-list">
              {schedule.map((item) => {
                const status = getStatus(item);

                return (
                  <div
                    className="dose-item"
                    key={item.id}
                  >
                    <div className="dose-left">
                      <div className="dose-icon">
                        💊
                      </div>

                      <div>
                        <p className="dose-name">
                          {getMedicineName(item)}
                        </p>

                        <p className="dose-detail">
                          {getDosage(item)}
                        </p>
                      </div>
                    </div>

                    <div className="dose-right">
                      <span className="dose-time">
                        {getTime(item)}
                      </span>

                      <span
                        className={`status-badge status-${status}`}
                      >
                        {status}
                      </span>

                      {status === "pending" && (
                        <button
                          className="take-btn"
                          onClick={() =>
                            handleTake(item.id)
                          }
                        >
                          Mark Taken
                        </button>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </section>

        <div>
          <section className="schedule-card">
            <h2 className="schedule-card-title">
              Adherence Summary
            </h2>

            <p className="summary-number">
              {completedCount}/{schedule.length}
            </p>

            <p className="summary-text">
              doses completed today
            </p>

            <div className="progress-track">
              <div
                className="progress-bar"
                style={{
                  width:
                    schedule.length === 0
                      ? "0%"
                      : `${
                          (completedCount /
                            schedule.length) *
                          100
                        }%`,
                }}
              />
            </div>
          </section>

          <section
            className="schedule-card"
            style={{ marginTop: 20 }}
          >
            <h2 className="schedule-card-title">
              Connect Caregiver
            </h2>

            <p className="schedule-card-subtitle">
              Choose a caregiver to monitor your
              medication adherence.
            </p>

            {caregivers.length === 0 ? (
              <div className="empty-state">
                No caregivers available in system.
              </div>
            ) : (
              <div className="caregiver-list">
                {caregivers.map((caregiver) => (
                  <div
                    className="caregiver-item"
                    key={
                      caregiver.id ||
                      caregiver.user_id
                    }
                  >
                    <p className="caregiver-name">
                      {caregiver.full_name ||
                        caregiver.name ||
                        caregiver.username ||
                        "Caregiver"}
                    </p>

                    <p className="caregiver-email">
                      {caregiver.email || ""}
                    </p>

                    <button
                      className="caregiver-btn"
                      onClick={() =>
                        handleRequestCaregiver(
                          caregiver.id ||
                            caregiver.user_id
                        )
                      }
                    >
                      Request Caregiver
                    </button>
                  </div>
                ))}
              </div>
            )}
          </section>
        </div>
      </div>

      {showAdd && (
        <div
          className="modal-overlay"
          onClick={() => setShowAdd(false)}
        >
          <div
            className="modal"
            onClick={(e) =>
              e.stopPropagation()
            }
          >
            <h2 className="modal-title">
              Add Medication Schedule
            </h2>

            <form onSubmit={handleAddSchedule}>
              <div className="form-group">
                <label className="form-label">
                  Medicine
                </label>

                <select
                  className="form-select"
                  value={form.medicine_id}
                  onChange={(e) =>
                    setForm({
                      ...form,
                      medicine_id:
                        e.target.value,
                    })
                  }
                >
                  <option value="">
                    Select medicine
                  </option>

                  {medicines.map((medicine) => (
                    <option
                      key={medicine.id}
                      value={medicine.id}
                    >
                      {medicine.name}
                    </option>
                  ))}
                </select>
              </div>

              <div className="form-group">
                <label className="form-label">
                  Time
                </label>

                <input
                  className="form-input"
                  type="time"
                  value={form.time}
                  onChange={(e) =>
                    setForm({
                      ...form,
                      time: e.target.value,
                    })
                  }
                />
              </div>

              <div className="form-group">
                <label className="form-label">
                  Instructions
                </label>

                <input
                  className="form-input"
                  type="text"
                  placeholder="After food"
                  value={form.label}
                  onChange={(e) =>
                    setForm({
                      ...form,
                      label: e.target.value,
                    })
                  }
                />
              </div>

              <div className="modal-actions">
                <button
                  type="button"
                  className="cancel-btn"
                  onClick={() =>
                    setShowAdd(false)
                  }
                >
                  Cancel
                </button>

                <button
                  type="submit"
                  className="save-btn"
                >
                  Add Schedule
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};

export default PatientMyMedicines;