import React, { useState, useEffect } from "react";
import reminderService from "../../services/reminderService";
import medicationService from "../../services/medicationService";

const emptyForm = { medication: "", time: "08:00", label: "Morning", date: "" };

const Reminders = () => {
  const [reminders, setReminders] = useState([]);
  const [medicines, setMedicines] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [showForm, setShowForm] = useState(false);
  const [editingId, setEditingId] = useState(null);
  const [form, setForm] = useState(emptyForm);
  const [selectedReminder, setSelectedReminder] = useState(null);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    fetchAll();
  }, []);

  const fetchAll = async () => {
    setLoading(true);
    setError("");
    try {
      const [remRes, medRes] = await Promise.all([
        reminderService.getAllReminders(),
        medicationService.getActiveMedicines(),
      ]);
      setReminders(remRes.data || []);
      setMedicines(medRes.data || []);
    } catch (err) {
      console.error("Failed to load reminders:", err);
      setError("Unable to load reminders.");
    } finally {
      setLoading(false);
    }
  };

  const openAddForm = () => {
    setForm({ ...emptyForm, medication: medicines[0]?.id || "" });
    setEditingId(null);
    setShowForm(true);
  };

  const openEditForm = (rem) => {
    setForm({ medication: rem.medication, time: rem.time, label: rem.label || "", date: rem.date || "" });
    setEditingId(rem.id);
    setShowForm(true);
  };

  const handleChange = (e) => {
    const { name, value } = e.target;
    setForm((prev) => ({ ...prev, [name]: value }));
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setSaving(true);
    setError("");
    try {
      if (editingId) {
        await reminderService.updateReminder(editingId, form);
      } else {
        await reminderService.createReminder(form);
      }
      setShowForm(false);
      fetchAll();
    } catch (err) {
      console.error("Save failed:", err);
      setError("Could not save reminder.");
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = async (id) => {
    if (!window.confirm("Delete this reminder?")) return;
    try {
      await reminderService.deleteReminder(id);
      setReminders((prev) => prev.filter((r) => r.id !== id));
    } catch (err) {
      console.error("Delete failed:", err);
      setError("Could not delete reminder.");
    }
  };

  const handleMark = async (id, status) => {
    try {
      await reminderService.updateReminderStatus(id, status);
      setReminders((prev) => prev.map((r) => (r.id === id ? { ...r, status } : r)));
    } catch (err) {
      console.error("Failed to update status:", err);
    }
  };

  if (loading) {
    return (
      <div className="dashboard-loading">
        <div className="spinner" />
        <p>Loading reminders…</p>
      </div>
    );
  }

  return (
    <div className="reminders-page">
      <header className="dashboard-header">
        <div>
          <h1>Reminders</h1>
          <p className="subtitle">Manage your medication reminders</p>
        </div>
        <button className="btn-primary" onClick={openAddForm}>+ Add Reminder</button>
      </header>

      {error && <div className="upload-error">{error}</div>}

      {reminders.length === 0 ? (
        <p className="empty-state">No reminders set yet.</p>
      ) : (
        <div className="reminder-list">
          {reminders.map((r) => (
            <div key={r.id} className={`reminder-card status-${r.status}`}>
              <div className="reminder-info" onClick={() => setSelectedReminder(r)} style={{ cursor: "pointer" }}>
                <h4>{r.medicineName} {r.label && `(${r.label})`}</h4>
                <p>{r.dosage} • {r.time} {r.date && `• ${r.date}`}</p>
              </div>
              <div className="reminder-actions">
                <button onClick={() => handleMark(r.id, "taken")}>Taken</button>
                <button onClick={() => handleMark(r.id, "missed")}>Missed</button>
                <button onClick={() => handleMark(r.id, "snoozed")}>Snooze</button>
                <button onClick={() => openEditForm(r)}>Edit</button>
                <button className="danger" onClick={() => handleDelete(r.id)}>Delete</button>
              </div>
            </div>
          ))}
        </div>
      )}

      {showForm && (
        <div className="modal-overlay" onClick={() => setShowForm(false)}>
          <div className="modal-card" onClick={(e) => e.stopPropagation()}>
            <h3>{editingId ? "Edit Reminder" : "Add Reminder"}</h3>
            <form onSubmit={handleSubmit} className="medicine-form">
              <label>Medicine
                <select name="medication" value={form.medication} onChange={handleChange} required>
                  <option value="">Select medicine</option>
                  {medicines.map((m) => (
                    <option key={m.id} value={m.id}>{m.name}</option>
                  ))}
                </select>
              </label>
              <label>Time
                <input type="time" name="time" value={form.time} onChange={handleChange} required />
              </label>
              <label>Label
                <select name="label" value={form.label} onChange={handleChange}>
                  <option value="Morning">Morning</option>
                  <option value="Afternoon">Afternoon</option>
                  <option value="Night">Night</option>
                </select>
              </label>
              <label>Date (optional)
                <input type="date" name="date" value={form.date} onChange={handleChange} />
              </label>
              <div className="modal-actions">
                <button type="button" onClick={() => setShowForm(false)} className="upload-btn secondary">Cancel</button>
                <button type="submit" className="upload-btn primary" disabled={saving}>
                  {saving ? "Saving…" : "Save"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {selectedReminder && (
        <div className="modal-overlay" onClick={() => setSelectedReminder(null)}>
          <div className="modal-card" onClick={(e) => e.stopPropagation()}>
            <h3>{selectedReminder.medicineName}</h3>
            <p className="detail-sub">Dosage: {selectedReminder.dosage}</p>
            <p className="detail-sub">Time: {selectedReminder.time}</p>
            <p className="detail-sub">Label: {selectedReminder.label || "—"}</p>
            <p className="detail-sub">Status: {selectedReminder.status}</p>
            <div className="modal-actions">
              <button className="upload-btn secondary" onClick={() => setSelectedReminder(null)}>Close</button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default Reminders;
