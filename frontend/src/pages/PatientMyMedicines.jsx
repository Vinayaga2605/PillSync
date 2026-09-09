import { useEffect, useState } from "react";
import { useLocation } from "react-router-dom";
import DashboardLayout from "../components/DashboardLayout";
import {
  fetchMySchedule,
  takeMedicine,
  fetchMedicines,
  addSchedule,
  fetchAvailableCaregivers,
  requestCaregiver,
} from "../services/api";
import { PATIENT_MENU } from "../utils/menus";

const TIMESLOTS = [
  { key: "morning", icon: "🌅", desc: "Early day dose" },
  { key: "afternoon", icon: "☀️", desc: "Mid-day dose" },
  { key: "evening", icon: "🌇", desc: "Late day dose" },

  { key: "night", icon: "🌙", desc: "Before sleep" },
];

const PatientMyMedicines = () => {
  const location = useLocation();
  const [schedule, setSchedule] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [notice, setNotice] = useState(location.state?.message || "");


  // Modal State
  const [isAddModalOpen, setIsAddModalOpen] = useState(false);
  const [dbMedicines, setDbMedicines] = useState([]);
  const [selectedMedId, setSelectedMedId] = useState("");
  const [dosageInput, setDosageInput] = useState("");
  const [timeSlotInput, setTimeSlotInput] = useState("morning");
  const [notesInput, setNotesInput] = useState("");
  const [adding, setAdding] = useState(false);

  // Caregiver Selection State
  const [caregivers, setCaregivers] = useState([]);
  const [selectedCaregiverId, setSelectedCaregiverId] = useState("");
  const [caregiverNotice, setCaregiverNotice] = useState("");

  const menu = PATIENT_MENU;

  const loadSchedule = () => {
    fetchMySchedule()
      .then(setSchedule)
      .catch((e) => setError(e.message))
      .finally(() => setLoading(false));
  };

  useEffect(() => {
    loadSchedule();
    window.addEventListener("pillsync-schedule-updated", loadSchedule);
    return () => window.removeEventListener("pillsync-schedule-updated", loadSchedule);
  }, []);

  useEffect(() => {
    fetchMedicines()
      .then(setDbMedicines)
      .catch(() => {});
    fetchAvailableCaregivers()
      .then((data) => {
        setCaregivers(data || []);
        if (data && data.length > 0) setSelectedCaregiverId(data[0].user_id);
      })
      .catch(() => {});
  }, []);

  const handleTake = async (id) => {
    try {
      await takeMedicine(id);
      setSchedule((prev) =>
        prev.map((m) => (m.id === id ? { ...m, taken: true } : m))
      );
    } catch (e) {
      setError(e.message);
    }
  };

  const handleMedSelect = (medId) => {
    setSelectedMedId(medId);
    const med = dbMedicines.find((m) => String(m.id) === String(medId));
    if (med && med.default_dosage) {
      setDosageInput(med.default_dosage);
    }
  };

  const handleAddScheduleSubmit = async (e) => {
    e.preventDefault();
    if (!selectedMedId) {
      setError("Please select a medicine from the database.");
      return;
    }
    setAdding(true);
    setError("");
    setNotice("");
    try {
      await addSchedule({
        medicine_id: Number(selectedMedId),
        dosage: dosageInput || "500 mg",
        time_of_day: timeSlotInput,
        notes: notesInput || "Scheduled by patient",
      });
      setNotice("Medicine successfully added to your schedule!");
      setIsAddModalOpen(false);
      setSelectedMedId("");
      setDosageInput("");
      setNotesInput("");
      loadSchedule();
    } catch (err) {
      setError(err.message);
    } finally {
      setAdding(false);
    }
  };

  const handleSendCaregiverRequest = async () => {
    if (!selectedCaregiverId) return;
    setCaregiverNotice("");
    try {
      await requestCaregiver(selectedCaregiverId);
      setCaregiverNotice("Caregiver request sent! Waiting for acceptance.");
    } catch (err) {
      setCaregiverNotice(`Notice: ${err.message}`);
    }
  };

  const takenCount = schedule.filter((m) => m.taken).length;

  return (
    <DashboardLayout
      role="Patient"
      title="My Medicines"
      subtitle={`${takenCount} of ${schedule.length} doses taken today`}
      menu={menu}
    >
      {error && <p className="error-message">{error}</p>}
      {notice && <p className="success-message">{notice}</p>}

      {/* Header Bar Actions */}
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 20 }}>
        <h2 style={{ fontSize: 18, color: "var(--ink)" }}>Daily Medication Plan</h2>
        <button
          className="action-btn"
          onClick={() => {
            setIsAddModalOpen(true);
            if (dbMedicines.length > 0 && !selectedMedId) {
              handleMedSelect(dbMedicines[0].id);
            }
          }}
        >
          ➕ Add Medicine
        </button>
      </div>

      {loading && <p className="empty">Loading your medicines…</p>}

      {!loading && schedule.length === 0 && (
        <section className="panel">
          <p className="empty">
            No medicines scheduled yet. Click <strong>"+ Add Medicine"</strong> above to select a medicine from our database!
          </p>
        </section>
      )}

      <div className="grid">
        <div style={{ display: "flex", flexDirection: "column", gap: "24px" }}>
          {TIMESLOTS.map((slot) => {
            const items = schedule.filter((m) => m.time_of_day === slot.key);
            if (items.length === 0) return null;

            return (
              <section key={slot.key} className="panel">
                <div className="timeslot__head">
                  <span style={{ fontSize: 18 }}>{slot.icon}</span>
                  <span className="timeslot__name">{slot.key}</span>
                  <span className="timeslot__count">
                    {items.filter((m) => m.taken).length}/{items.length} done
                  </span>
                </div>
                <div className="list mt16">
                  {items.map((m) => (
                    <div
                      key={m.id}
                      className={`med-card${m.taken ? " med-card--taken" : ""}`}
                    >
                      <span className="med-card__icon">💊</span>
                      <div className="med-card__body">
                        <p className="med-card__name">{m.medicine_name}</p>
                        <p className="med-card__dosage">
                          {m.dosage}
                          {m.medicine_brand ? ` · ${m.medicine_brand}` : ""}
                        </p>
                        {m.notes && <p className="med-card__notes">{m.notes}</p>}
                      </div>
                      {m.taken ? (
                        <span className="tick-btn tick-btn--done">✓ Taken</span>
                      ) : (
                        <button
                          className="tick-btn"
                          onClick={() => handleTake(m.id)}
                        >
                          ✓ Mark as taken
                        </button>
                      )}
                    </div>
                  ))}
                </div>
              </section>
            );
          })}
        </div>

        <div style={{ display: "flex", flexDirection: "column", gap: 20 }}>
          {/* Summary Panel */}
          <section className="panel">
            <div className="panel__head">
              <h2 className="panel__title">Adherence Summary</h2>
            </div>
            <p className="stat__value">
              {takenCount}/{schedule.length}
            </p>
            <p className="stat__label">doses completed today</p>
            <p className="list-item__desc mt16">
              Mark doses as taken when ingested. Caregivers monitor compliance and alerts automatically.
            </p>
          </section>

          {/* Caregiver Connection Panel */}
          <section className="panel">
            <div className="panel__head">
              <h2 className="panel__title">Connect Caregiver</h2>
            </div>
            {caregivers.length > 0 ? (
              <div style={{ display: "flex", flexDirection: "column", gap: 10, marginTop: 10 }}>
                <p className="list-item__desc">Select a caregiver to monitor your medication schedule:</p>
                <select
                  className="input-field"
                  value={selectedCaregiverId}
                  onChange={(e) => setSelectedCaregiverId(e.target.value)}
                >
                  {caregivers.map((c) => (
                    <option key={c.user_id} value={c.user_id}>
                      {c.full_name} ({c.email})
                    </option>
                  ))}
                </select>
                <button
                  className="action-btn action-btn--ghost"
                  onClick={handleSendCaregiverRequest}
                >
                  📩 Send Caregiver Request
                </button>
                {caregiverNotice && (
                  <p className="list-item__desc" style={{ color: "var(--primary)", marginTop: 4 }}>
                    {caregiverNotice}
                  </p>
                )}
              </div>
            ) : (
              <p className="list-item__desc mt16">No caregivers available in system.</p>
            )}
          </section>
        </div>
      </div>

      {/* Add Medicine Modal */}
      {isAddModalOpen && (
        <div className="modal-overlay">
          <div className="modal">
            <h3 className="modal__title">➕ Add Medicine to Schedule</h3>
            <p className="modal__text">Select a medicine from the official PillSync database:</p>

            <form onSubmit={handleAddScheduleSubmit}>
              <div className="field">
                <label className="field__label">Available Database Medicine</label>
                <select
                  className="input-field"
                  value={selectedMedId}
                  onChange={(e) => handleMedSelect(e.target.value)}
                  required
                >
                  {dbMedicines.map((m) => (
                    <option key={m.id} value={m.id}>
                      {m.name} ({m.category}) {m.brand ? `— ${m.brand}` : ""}
                    </option>
                  ))}
                </select>
              </div>

              <div className="field">
                <label className="field__label">Dosage</label>
                <input
                  type="text"
                  className="input-field"
                  placeholder="e.g. 500 mg or 1 tablet"
                  value={dosageInput}
                  onChange={(e) => setDosageInput(e.target.value)}
                  required
                />
              </div>

              <div className="field">
                <label className="field__label">Time Slot</label>
                <select
                  className="input-field"
                  value={timeSlotInput}
                  onChange={(e) => setTimeSlotInput(e.target.value)}
                >
                  <option value="morning">Morning (After breakfast)</option>
                  <option value="afternoon">Afternoon (After lunch)</option>
                  <option value="evening">Evening (After dinner)</option>
                  <option value="night">Night (Before sleep)</option>
                </select>
              </div>

              <div className="field">
                <label className="field__label">Instructions / Notes</label>
                <input
                  type="text"
                  className="input-field"
                  placeholder="e.g. Take with water"
                  value={notesInput}
                  onChange={(e) => setNotesInput(e.target.value)}
                />
              </div>

              <div className="modal__actions">
                <button
                  type="button"
                  className="action-btn action-btn--ghost"
                  onClick={() => setIsAddModalOpen(false)}
                >
                  Cancel
                </button>
                <button type="submit" className="action-btn" disabled={adding}>
                  {adding ? "Saving…" : "Add to Schedule"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </DashboardLayout>
  );
};

export default PatientMyMedicines;