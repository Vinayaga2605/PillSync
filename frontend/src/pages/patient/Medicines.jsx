import React, { useState, useEffect } from "react";
import medicationService from "../../services/medicationService";

const emptyForm = {
  name: "",
  dosage: "",
  frequency: "",
  doses_per_day: 1,
  total_stock: 0,
  remaining_stock: 0,
  condition: "",
};

const Medicines = () => {
  const [medicines, setMedicines] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  // Add/Edit medicine
  const [showForm, setShowForm] = useState(false);
  const [editingId, setEditingId] = useState(null);
  const [form, setForm] = useState(emptyForm);
  const [saving, setSaving] = useState(false);

  // Medicine details/history
  const [selectedMedicine, setSelectedMedicine] = useState(null);
  const [history, setHistory] = useState([]);
  const [historyLoading, setHistoryLoading] = useState(false);

  // Refill
  const [showRefillForm, setShowRefillForm] = useState(false);
  const [refillMedicine, setRefillMedicine] = useState(null);
  const [refillQuantity, setRefillQuantity] = useState("");
  const [refilling, setRefilling] = useState(false);

  useEffect(() => {
    fetchMedicines();
  }, []);

  // ------------------------------------------
  // FETCH MEDICINES
  // ------------------------------------------

  const fetchMedicines = async () => {
    setLoading(true);
    setError("");

    try {
      const res = await medicationService.getActiveMedicines();
      setMedicines(res.data || []);
    } catch (err) {
      console.error("Failed to load medicines:", err);
      setError("Unable to load medicines.");
    } finally {
      setLoading(false);
    }
  };

  // ------------------------------------------
  // ADD MEDICINE
  // ------------------------------------------

  const openAddForm = () => {
    setForm(emptyForm);
    setEditingId(null);
    setError("");
    setShowForm(true);
  };

  // ------------------------------------------
  // EDIT MEDICINE
  // ------------------------------------------

  const openEditForm = (med) => {
    setForm({
      name: med.name || "",
      dosage: med.dosage || "",
      frequency: med.frequency || "",
      doses_per_day: med.doses_per_day || 1,
      total_stock: med.total_stock || 0,
      remaining_stock: med.remaining_stock || 0,
      condition: med.condition || "",
    });

    setEditingId(med.id);
    setError("");
    setShowForm(true);
  };

  // ------------------------------------------
  // FORM CHANGE
  // ------------------------------------------

  const handleChange = (e) => {
    const { name, value } = e.target;

    setForm((prev) => ({
      ...prev,
      [name]: value,
    }));
  };

  // ------------------------------------------
  // SAVE MEDICINE
  // ------------------------------------------

  const handleSubmit = async (e) => {
    e.preventDefault();

    setSaving(true);
    setError("");

    try {
      const payload = {
        ...form,
        doses_per_day: Number(form.doses_per_day),
        total_stock: Number(form.total_stock),
        remaining_stock: Number(form.remaining_stock),
      };

      if (editingId) {
        await medicationService.updateMedicine(
          editingId,
          payload
        );
      } else {
        await medicationService.createMedicine(payload);
      }

      setShowForm(false);
      setEditingId(null);
      setForm(emptyForm);

      await fetchMedicines();
    } catch (err) {
      console.error("Save failed:", err);

      setError(
        err.response?.data?.detail ||
          "Could not save medicine. Check the fields and try again."
      );
    } finally {
      setSaving(false);
    }
  };

  // ------------------------------------------
  // DELETE MEDICINE
  // ------------------------------------------

  const handleDelete = async (id) => {
    if (
      !window.confirm(
        "Delete this medicine? This cannot be undone."
      )
    ) {
      return;
    }

    try {
      await medicationService.deleteMedicine(id);

      setMedicines((prev) =>
        prev.filter((med) => med.id !== id)
      );

      if (selectedMedicine?.id === id) {
        setSelectedMedicine(null);
      }
    } catch (err) {
      console.error("Delete failed:", err);

      setError(
        err.response?.data?.detail ||
          "Could not delete medicine."
      );
    }
  };

  // ------------------------------------------
  // OPEN MEDICINE DETAILS
  // ------------------------------------------

  const openDetails = async (med) => {
    setSelectedMedicine(med);
    setHistory([]);
    setHistoryLoading(true);

    try {
      const res =
        await medicationService.getMedicineHistory(med.id);

      setHistory(res.data || []);
    } catch (err) {
      console.error("Failed to load history:", err);
      setHistory([]);
    } finally {
      setHistoryLoading(false);
    }
  };

  // ------------------------------------------
  // OPEN REFILL FORM
  // ------------------------------------------

  const openRefillForm = (med) => {
    setRefillMedicine(med);
    setRefillQuantity("");
    setError("");
    setShowRefillForm(true);
  };

  // ------------------------------------------
  // HANDLE REFILL
  // ------------------------------------------

  const handleRefill = async (e) => {
    e.preventDefault();

    const quantity = Number(refillQuantity);

    if (!quantity || quantity <= 0) {
      setError("Please enter a valid refill quantity.");
      return;
    }

    setRefilling(true);
    setError("");

    try {
      const res =
        await medicationService.refillMedicine(
          refillMedicine.id,
          quantity
        );

      const updatedMedicine = res.data.medicine;

      // Update medicine in the UI immediately
      setMedicines((prev) =>
        prev.map((med) =>
          med.id === updatedMedicine.id
            ? {
                ...med,
                total_stock:
                  updatedMedicine.total_stock,
                remaining_stock:
                  updatedMedicine.remaining_stock,
              }
            : med
        )
      );

      // Also update selected medicine if applicable
      setSelectedMedicine((prev) => {
        if (!prev || prev.id !== updatedMedicine.id) {
          return prev;
        }

        return {
          ...prev,
          total_stock: updatedMedicine.total_stock,
          remaining_stock:
            updatedMedicine.remaining_stock,
        };
      });

      setShowRefillForm(false);
      setRefillMedicine(null);
      setRefillQuantity("");

    } catch (err) {
      console.error("Refill failed:", err);

      setError(
        err.response?.data?.detail ||
          err.response?.data?.message ||
          "Could not refill medicine. Please try again."
      );
    } finally {
      setRefilling(false);
    }
  };

  // ------------------------------------------
  // LOADING
  // ------------------------------------------

  if (loading) {
    return (
      <div className="dashboard-loading">
        <div className="spinner" />
        <p>Loading medicines...</p>
      </div>
    );
  }

  // ------------------------------------------
  // UI
  // ------------------------------------------

  return (
    <div className="medicines-page">

      {/* HEADER */}
      <header className="dashboard-header">
        <div>
          <h1>My Medicines</h1>
          <p className="subtitle">
            Manage your medications
          </p>
        </div>

        <button
          className="btn-primary"
          onClick={openAddForm}
        >
          + Add Medicine
        </button>
      </header>

      {/* ERROR */}
      {error && (
        <div className="upload-error">
          {error}
        </div>
      )}

      {/* MEDICINE LIST */}
      {medicines.length === 0 ? (
        <p className="empty-state">
          No medicines yet. Add one to get started.
        </p>
      ) : (
        <div className="medicine-grid">

          {medicines.map((med) => {

            const stockPercentage =
              med.total_stock > 0
                ? Math.min(
                    100,
                    Math.max(
                      0,
                      (med.remaining_stock /
                        med.total_stock) *
                        100
                    )
                  )
                : 0;

            return (
              <div
                key={med.id}
                className="medicine-card"
                onClick={() => openDetails(med)}
                style={{ cursor: "pointer" }}
              >

                {/* MEDICINE NAME */}
                <h4>{med.name}</h4>

                {/* DOSAGE + FREQUENCY */}
                <p>
                  {med.dosage} • {med.frequency}
                </p>

                {/* CONDITION */}
                <p className="medicine-freq">
                  {med.condition ||
                    "No condition noted"}
                </p>

                {/* STOCK BAR */}
                <div className="stock-bar">
                  <div
                    className="stock-fill"
                    style={{
                      width: `${stockPercentage}%`,
                    }}
                  />
                </div>

                {/* STOCK TEXT */}
                <p className="stock-text">
                  {med.remaining_stock}/
                  {med.total_stock} remaining
                </p>

                {/* ACTION BUTTONS */}
                <div
                  className="medicine-card-actions"
                  onClick={(e) =>
                    e.stopPropagation()
                  }
                >

                  <button
                    onClick={() =>
                      openRefillForm(med)
                    }
                  >
                    Refill
                  </button>

                  <button
                    onClick={() =>
                      openEditForm(med)
                    }
                  >
                    Edit
                  </button>

                  <button
                    onClick={() =>
                      handleDelete(med.id)
                    }
                    className="danger"
                  >
                    Delete
                  </button>

                </div>
              </div>
            );
          })}

        </div>
      )}

      {/* ==========================================
          ADD / EDIT MEDICINE MODAL
          ========================================== */}

      {showForm && (
        <div
          className="modal-overlay"
          onClick={() =>
            !saving && setShowForm(false)
          }
        >
          <div
            className="modal-card"
            onClick={(e) =>
              e.stopPropagation()
            }
          >

            <h3>
              {editingId
                ? "Edit Medicine"
                : "Add Medicine"}
            </h3>

            <form
              onSubmit={handleSubmit}
              className="medicine-form"
            >

              {/* NAME */}
              <label>
                Name

                <input
                  name="name"
                  value={form.name}
                  onChange={handleChange}
                  required
                  placeholder="e.g. Paracetamol"
                />
              </label>

              {/* DOSAGE */}
              <label>
                Dosage

                <input
                  name="dosage"
                  value={form.dosage}
                  onChange={handleChange}
                  required
                  placeholder="e.g. 500 mg"
                />
              </label>

              {/* FREQUENCY */}
              <label>
                Frequency

                <input
                  name="frequency"
                  value={form.frequency}
                  onChange={handleChange}
                  required
                  placeholder="e.g. Twice daily"
                />
              </label>

              {/* DOSES PER DAY */}
              <label>
                Doses per day

                <input
                  type="number"
                  name="doses_per_day"
                  value={form.doses_per_day}
                  onChange={handleChange}
                  min="1"
                  required
                />
              </label>

              {/* TOTAL STOCK */}
              <label>
                Total Stock

                <input
                  type="number"
                  name="total_stock"
                  value={form.total_stock}
                  onChange={handleChange}
                  min="0"
                  required
                />
              </label>

              {/* REMAINING STOCK */}
              <label>
                Remaining Stock

                <input
                  type="number"
                  name="remaining_stock"
                  value={form.remaining_stock}
                  onChange={handleChange}
                  min="0"
                  required
                />
              </label>

              {/* CONDITION */}
              <label>
                Condition

                <input
                  name="condition"
                  value={form.condition}
                  onChange={handleChange}
                  placeholder="e.g. Fever"
                />
              </label>

              {/* ACTIONS */}
              <div className="modal-actions">

                <button
                  type="button"
                  onClick={() =>
                    setShowForm(false)
                  }
                  className="upload-btn secondary"
                  disabled={saving}
                >
                  Cancel
                </button>

                <button
                  type="submit"
                  className="upload-btn primary"
                  disabled={saving}
                >
                  {saving
                    ? "Saving..."
                    : "Save"}
                </button>

              </div>

            </form>
          </div>
        </div>
      )}

      {/* ==========================================
          REFILL MODAL
          ========================================== */}

      {showRefillForm && refillMedicine && (
        <div
          className="modal-overlay"
          onClick={() =>
            !refilling &&
            setShowRefillForm(false)
          }
        >
          <div
            className="modal-card"
            onClick={(e) =>
              e.stopPropagation()
            }
          >

            <h3>Refill Medicine</h3>

            <p className="detail-sub">
              Medicine:{" "}
              <strong>
                {refillMedicine.name}
              </strong>
            </p>

            <p className="detail-sub">
              Current stock:{" "}
              <strong>
                {refillMedicine.remaining_stock}/
                {refillMedicine.total_stock}
              </strong>
            </p>

            <form
              onSubmit={handleRefill}
              className="medicine-form"
            >

              <label>
                Refill Quantity

                <input
                  type="number"
                  min="1"
                  value={refillQuantity}
                  onChange={(e) =>
                    setRefillQuantity(
                      e.target.value
                    )
                  }
                  placeholder="Enter quantity"
                  required
                  autoFocus
                />
              </label>

              <div className="modal-actions">

                <button
                  type="button"
                  onClick={() =>
                    setShowRefillForm(false)
                  }
                  className="upload-btn secondary"
                  disabled={refilling}
                >
                  Cancel
                </button>

                <button
                  type="submit"
                  className="upload-btn primary"
                  disabled={refilling}
                >
                  {refilling
                    ? "Refilling..."
                    : "Refill"}
                </button>

              </div>

            </form>

          </div>
        </div>
      )}

      {/* ==========================================
          MEDICINE DETAILS / HISTORY MODAL
          ========================================== */}

      {selectedMedicine && (
        <div
          className="modal-overlay"
          onClick={() =>
            setSelectedMedicine(null)
          }
        >
          <div
            className="modal-card"
            onClick={(e) =>
              e.stopPropagation()
            }
          >

            <h3>
              {selectedMedicine.name}
            </h3>

            <p className="detail-sub">
              {selectedMedicine.dosage} •{" "}
              {selectedMedicine.frequency}
            </p>

            <p className="detail-sub">
              Condition:{" "}
              {selectedMedicine.condition ||
                "—"}
            </p>

            <p className="detail-sub">
              Stock:{" "}
              {selectedMedicine.remaining_stock}/
              {selectedMedicine.total_stock}
            </p>

            <h4 className="section-title">
              Dose History
            </h4>

            {historyLoading ? (
              <p className="empty-state">
                Loading history...
              </p>
            ) : history.length === 0 ? (
              <p className="empty-state">
                No dose history yet.
              </p>
            ) : (
              <ul className="missed-dose-history">

                {history.map((h) => (
                  <li
                    key={h.id}
                    className={h.status}
                  >
                    {h.date} at {h.time} —{" "}
                    {h.status}
                  </li>
                ))}

              </ul>
            )}

            <div className="modal-actions">

              <button
                className="upload-btn secondary"
                onClick={() =>
                  setSelectedMedicine(null)
                }
              >
                Close
              </button>

            </div>

          </div>
        </div>
      )}

    </div>
  );
};

export default Medicines;
