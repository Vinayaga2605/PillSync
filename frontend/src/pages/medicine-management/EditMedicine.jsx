import React, { useEffect, useState } from "react";
import { useNavigate, useParams } from "react-router-dom";
import {
  Save,
  Undo2,
  CheckCircle2,
  Edit3,
} from "lucide-react";

import medicationService from "../../services/medicationService";

const EditMedicine = () => {
  const { id } = useParams();
  const navigate = useNavigate();

  const [medicine, setMedicine] = useState(null);
  const [form, setForm] = useState({
    name: "",
    dosage: "",
    frequency: "",
    doses_per_day: 1,
    total_stock: 0,
    remaining_stock: 0,
    condition: "",
  });

  const [initialForm, setInitialForm] = useState(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [success, setSuccess] = useState(false);
  const [error, setError] = useState("");

  useEffect(() => {
    loadMedicine();
  }, [id]);

  const loadMedicine = async () => {
    try {
      setLoading(true);
      setError("");

      const response =
        await medicationService.getMedicine(id);

      const data = response.data;

      const values = {
        name: data.name || "",
        dosage: data.dosage || "",
        frequency: data.frequency || "",
        doses_per_day: data.doses_per_day || 1,
        total_stock: data.total_stock || 0,
        remaining_stock:
          data.remaining_stock || 0,
        condition: data.condition || "",
      };

      setMedicine(data);
      setForm(values);
      setInitialForm(values);
    } catch (err) {
      console.error(
        "Failed to load medicine:",
        err
      );
      setError("Unable to load medicine.");
    } finally {
      setLoading(false);
    }
  };

  const handleChange = (e) => {
    const { name, value } = e.target;

    setForm((previous) => ({
      ...previous,
      [name]: value,
    }));
  };

  const handleUndo = () => {
    if (initialForm) {
      setForm({ ...initialForm });
    }
  };

  const handleSave = async () => {
    try {
      setSaving(true);
      setError("");

      const response =
        await medicationService.updateMedicine(
          id,
          {
            name: form.name.trim(),
            dosage: form.dosage.trim(),
            frequency: form.frequency.trim(),
            doses_per_day: Number(
              form.doses_per_day
            ),
            total_stock: Number(
              form.total_stock
            ),
            remaining_stock: Number(
              form.remaining_stock
            ),
            condition: form.condition.trim(),
          }
        );

      setMedicine(response.data);
      setInitialForm({ ...form });
      setSuccess(true);

      setTimeout(() => {
        setSuccess(false);
      }, 1800);
    } catch (err) {
      console.error("Update failed:", err);

      setError(
        err.response?.data?.detail ||
          "Could not update medicine."
      );
    } finally {
      setSaving(false);
    }
  };

  if (loading) {
    return (
      <div className="dashboard-loading">
        <div className="spinner" />
        <p>Loading medicine...</p>
      </div>
    );
  }

  if (!medicine) {
    return (
      <div className="vin-empty-card">
        <Edit3 size={28} />

        <h3>Medicine not found</h3>

        <p>
          Choose a medicine from your medicine list.
        </p>

        <button
          className="vin-primary-btn"
          onClick={() => navigate("/medicines")}
        >
          Go to medicine list
        </button>
      </div>
    );
  }

  return (
    <div className="vin-medicine-page">
      <div className="vin-medicine-header">
        <div>
          <button
            className="vin-back-button"
            onClick={() =>
              navigate("/medicines")
            }
          >
            â† Back to medicines
          </button>

          <h1>
            Edit {medicine.name}
          </h1>

          <p>
            Update your medicine information.
          </p>
        </div>

        <div className="vin-edit-actions">
          <button
            className="vin-secondary-btn"
            onClick={handleUndo}
            disabled={saving}
          >
            <Undo2 size={16} />
            Undo
          </button>

          <button
            className="vin-primary-btn"
            onClick={handleSave}
            disabled={saving}
          >
            <Save size={16} />
            {saving ? "Saving..." : "Save changes"}
          </button>
        </div>
      </div>

      {success && (
        <div className="vin-success">
          <CheckCircle2 size={17} />
          Changes saved successfully.
        </div>
      )}

      {error && (
        <div className="vin-error">
          {error}
        </div>
      )}

      <div className="vin-edit-card">
        <div className="vin-form-grid">
          <label>
            Medicine name
            <input
              name="name"
              value={form.name}
              onChange={handleChange}
              required
            />
          </label>

          <label>
            Dosage
            <input
              name="dosage"
              value={form.dosage}
              onChange={handleChange}
              required
            />
          </label>

          <label>
            Frequency
            <input
              name="frequency"
              value={form.frequency}
              onChange={handleChange}
              required
            />
          </label>

          <label>
            Doses per day
            <input
              type="number"
              min="1"
              name="doses_per_day"
              value={form.doses_per_day}
              onChange={handleChange}
              required
            />
          </label>

          <label>
            Total stock
            <input
              type="number"
              min="0"
              name="total_stock"
              value={form.total_stock}
              onChange={handleChange}
              required
            />
          </label>

          <label>
            Remaining stock
            <input
              type="number"
              min="0"
              name="remaining_stock"
              value={form.remaining_stock}
              onChange={handleChange}
              required
            />
          </label>

          <label className="vin-full-field">
            Condition
            <input
              name="condition"
              value={form.condition}
              onChange={handleChange}
              placeholder="e.g. Hypertension"
            />
          </label>
        </div>
      </div>
    </div>
  );
};

export default EditMedicine;



