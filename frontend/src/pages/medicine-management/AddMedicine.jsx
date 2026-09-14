import React, { useState } from "react";
import { useNavigate } from "react-router-dom";
import {
  ArrowLeft,
  ArrowRight,
  Save,
  CheckCircle2,
  Pill,
  Clock3,
  Package,
} from "lucide-react";
import medicationService from "../../services/medicationService";

const steps = ["Medicine", "Dosage", "Stock", "Review"];

const AddMedicine = () => {
  const navigate = useNavigate();

  const [step, setStep] = useState(0);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");

  const [form, setForm] = useState({
    name: "",
    dosage: "",
    frequency: "",
    doses_per_day: 1,
    total_stock: 0,
    remaining_stock: 0,
    condition: "",
  });

  const handleChange = (e) => {
    const { name, value } = e.target;

    setForm((prev) => ({
      ...prev,
      [name]: value,
    }));
  };

  const nextStep = () => {
    setError("");

    if (step === 0 && !form.name.trim()) {
      setError("Please enter a medicine name.");
      return;
    }

    if (step === 1) {
      if (!form.dosage.trim()) {
        setError("Please enter the dosage.");
        return;
      }

      if (!form.frequency.trim()) {
        setError("Please enter the frequency.");
        return;
      }
    }

    setStep((prev) => Math.min(3, prev + 1));
  };

  const previousStep = () => {
    setError("");
    setStep((prev) => Math.max(0, prev - 1));
  };

  const handleSubmit = async (e) => {
    e.preventDefault();

    try {
      setSaving(true);
      setError("");

      await medicationService.createMedicine({
        name: form.name.trim(),
        dosage: form.dosage.trim(),
        frequency: form.frequency.trim(),
        doses_per_day: Number(form.doses_per_day),
        total_stock: Number(form.total_stock),
        remaining_stock: Number(form.remaining_stock),
        condition: form.condition.trim(),
      });

      navigate("/medicines");
    } catch (err) {
      console.error("Create medicine failed:", err);

      setError(
        err.response?.data?.detail ||
          "Could not add medicine."
      );
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="vin-medicine-page">
      <div className="vin-add-header">
        <button
          type="button"
          className="vin-back-button"
          onClick={() => navigate("/medicines")}
        >
          <ArrowLeft size={16} />
          <span>Back to medicines</span>
        </button>

        <h1>Add medicine</h1>

        <p>
          Add a new medication to your medicine list.
        </p>
      </div>

      <div className="vin-step-indicator">
        {steps.map((label, index) => (
          <React.Fragment key={label}>
            <div
              className={`vin-step ${
                index <= step ? "vin-step-active" : ""
              }`}
            >
              <span>{index + 1}</span>
              <label>{label}</label>
            </div>

            {index < steps.length - 1 && (
              <div
                className={`vin-step-line ${
                  index < step
                    ? "vin-step-line-active"
                    : ""
                }`}
              />
            )}
          </React.Fragment>
        ))}
      </div>

      {error && (
        <div className="vin-error" role="alert">
          {error}
        </div>
      )}

      <form
        className="vin-add-card"
        onSubmit={handleSubmit}
      >
        {step === 0 && (
          <div className="vin-step-content">
            <div className="vin-step-title">
              <div className="vin-step-icon">
                <Pill size={20} />
              </div>

              <div>
                <h2>Medicine information</h2>
                <p>
                  Enter the basic medicine details.
                </p>
              </div>
            </div>

            <div className="vin-form-grid">
              <label className="vin-full-field">
                Medicine name
                <input
                  name="name"
                  value={form.name}
                  onChange={handleChange}
                  placeholder="e.g. Paracetamol"
                  required
                />
              </label>

              <label>
                Condition
                <input
                  name="condition"
                  value={form.condition}
                  onChange={handleChange}
                  placeholder="e.g. Fever"
                />
              </label>
            </div>
          </div>
        )}

        {step === 1 && (
          <div className="vin-step-content">
            <div className="vin-step-title">
              <div className="vin-step-icon">
                <Clock3 size={20} />
              </div>

              <div>
                <h2>Dosage and schedule</h2>
                <p>
                  Define how the medicine should be taken.
                </p>
              </div>
            </div>

            <div className="vin-form-grid">
              <label>
                Dosage
                <input
                  name="dosage"
                  value={form.dosage}
                  onChange={handleChange}
                  placeholder="e.g. 500 mg"
                  required
                />
              </label>

              <label>
                Frequency
                <input
                  name="frequency"
                  value={form.frequency}
                  onChange={handleChange}
                  placeholder="e.g. Twice daily"
                  required
                />
              </label>

              <label>
                Doses per day
                <input
                  type="number"
                  name="doses_per_day"
                  min="1"
                  value={form.doses_per_day}
                  onChange={handleChange}
                  required
                />
              </label>
            </div>
          </div>
        )}

        {step === 2 && (
          <div className="vin-step-content">
            <div className="vin-step-title">
              <div className="vin-step-icon">
                <Package size={20} />
              </div>

              <div>
                <h2>Stock information</h2>
                <p>
                  Record your current medicine stock.
                </p>
              </div>
            </div>

            <div className="vin-form-grid">
              <label>
                Total stock
                <input
                  type="number"
                  name="total_stock"
                  min="0"
                  value={form.total_stock}
                  onChange={handleChange}
                  required
                />
              </label>

              <label>
                Remaining stock
                <input
                  type="number"
                  name="remaining_stock"
                  min="0"
                  value={form.remaining_stock}
                  onChange={handleChange}
                  required
                />
              </label>
            </div>
          </div>
        )}

        {step === 3 && (
          <div className="vin-step-content">
            <div className="vin-step-title">
              <div className="vin-step-icon">
                <CheckCircle2 size={20} />
              </div>

              <div>
                <h2>Review medicine</h2>
                <p>
                  Check the information before saving.
                </p>
              </div>
            </div>

            <div className="vin-review-grid">
              <div>
                <span>Medicine</span>
                <strong>
                  {form.name || "Not provided"}
                </strong>
              </div>

              <div>
                <span>Condition</span>
                <strong>
                  {form.condition || "Not provided"}
                </strong>
              </div>

              <div>
                <span>Dosage</span>
                <strong>
                  {form.dosage || "Not provided"}
                </strong>
              </div>

              <div>
                <span>Frequency</span>
                <strong>
                  {form.frequency || "Not provided"}
                </strong>
              </div>

              <div>
                <span>Doses per day</span>
                <strong>
                  {form.doses_per_day}
                </strong>
              </div>

              <div>
                <span>Stock</span>
                <strong>
                  {form.remaining_stock}/
                  {form.total_stock}
                </strong>
              </div>
            </div>
          </div>
        )}

        <div className="vin-step-actions">
          <button
            type="button"
            className="vin-secondary-btn"
            onClick={previousStep}
            disabled={step === 0 || saving}
          >
            <ArrowLeft size={16} />
            <span>Back</span>
          </button>

          {step < 3 ? (
            <button
              type="button"
              className="vin-primary-btn"
              onClick={nextStep}
            >
              <span>Continue</span>
              <ArrowRight size={16} />
            </button>
          ) : (
            <button
              type="submit"
              className="vin-primary-btn"
              disabled={saving}
            >
              <Save size={16} />
              <span>
                {saving ? "Saving..." : "Save medicine"}
              </span>
            </button>
          )}
        </div>
      </form>
    </div>
  );
};

export default AddMedicine;
