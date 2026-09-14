import React, { useState, useRef } from "react";
import { useNavigate } from "react-router-dom";
import {
  Upload,
  Camera,
  FileText,
  Trash2,
  Plus,
  CheckCircle,
  RotateCcw,
  Loader2,
  Home,
} from "lucide-react";
import ocrService from "../../services/ocrService";

const STEPS = {
  SELECT: "select",
  PREVIEW: "preview",
  PROCESSING: "processing",
  REVIEW: "review",
  SAVED: "saved",
};

const MedicineUpload = () => {
  const navigate = useNavigate();
  const fileInputRef = useRef(null);
  const cameraInputRef = useRef(null);

  const [step, setStep] = useState(STEPS.SELECT);
  const [imageFile, setImageFile] = useState(null);
  const [imagePreviewUrl, setImagePreviewUrl] = useState(null);
  const [rawText, setRawText] = useState("");
  const [medicines, setMedicines] = useState([]);
  const [error, setError] = useState("");
  const [saving, setSaving] = useState(false);

  const resetAll = () => {
    setStep(STEPS.SELECT);
    setImageFile(null);
    setImagePreviewUrl(null);
    setRawText("");
    setMedicines([]);
    setError("");
  };

  const handleFileSelected = (file) => {
    if (!file) return;

    if (!file.type.startsWith("image/")) {
      setError("Please select a valid image file (JPG, PNG).");
      return;
    }

    if (file.size > 10 * 1024 * 1024) {
      setError("Image is too large. Please choose a file under 10MB.");
      return;
    }

    setError("");
    setImageFile(file);
    setImagePreviewUrl(URL.createObjectURL(file));
    setStep(STEPS.PREVIEW);
  };

  const handleFileInputChange = (e) => {
    handleFileSelected(e.target.files?.[0]);
  };

  const handleProcessImage = async () => {
    setStep(STEPS.PROCESSING);
    setError("");

    try {
      const res = await ocrService.scanPrescription(imageFile);

      setRawText(res.data.rawText);
      setMedicines(
        res.data.extractedMedicines.map((m, i) => ({
          ...m,
          id: i + 1,
        }))
      );

      setStep(STEPS.REVIEW);
    } catch (err) {
      console.error("OCR processing failed:", err);
      setError(
        err.message || "Something went wrong while processing the image."
      );
      setStep(STEPS.PREVIEW);
    }
  };

  const handleMedicineFieldChange = (id, field, value) => {
    setMedicines((prev) =>
      prev.map((m) => (m.id === id ? { ...m, [field]: value } : m))
    );
  };

  const handleRemoveMedicine = (id) => {
    setMedicines((prev) => prev.filter((m) => m.id !== id));
  };

  const handleAddMedicine = () => {
    setMedicines((prev) => [
      ...prev,
      {
        id: Date.now(),
        name: "",
        dosage: "",
        frequency: "",
        quantity: "",
      },
    ]);
  };

  const handleConfirmSave = async () => {
    setError("");

    const incomplete = medicines.some((m) => !m.name || !m.dosage);

    if (incomplete) {
      setError(
        "Please fill in at least the name and dosage for every medicine."
      );
      return;
    }

    if (medicines.length === 0) {
      setError("Add at least one medicine before saving.");
      return;
    }

    setSaving(true);

    try {
      await ocrService.saveMedicines(medicines);
      setStep(STEPS.SAVED);
    } catch (err) {
      console.error("Save failed:", err);
      setError("Could not save medicines. Please try again.");
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="upload-page">
      <header className="dashboard-header">
        <h1>Upload Prescription</h1>
        <p className="subtitle">
          Scan a prescription or medicine label to add it automatically
        </p>
      </header>

      {error && step !== STEPS.PROCESSING && (
        <div className="upload-error" role="alert">
          {error}
        </div>
      )}

      {/* Step 1: Select */}
      {step === STEPS.SELECT && (
        <div className="upload-dropzone">
          <div className="upload-icon">
            <Upload />
          </div>

          <h3>Add a prescription image</h3>
          <p>Take a photo or choose one from your device</p>

          <div className="upload-actions">
            <button
              type="button"
              className="upload-btn primary"
              onClick={() => cameraInputRef.current?.click()}
            >
              <Camera />
              <span>Use Camera</span>
            </button>

            <button
              type="button"
              className="upload-btn secondary"
              onClick={() => fileInputRef.current?.click()}
            >
              <FileText />
              <span>Choose from Files</span>
            </button>
          </div>

          <input
            ref={cameraInputRef}
            type="file"
            accept="image/*"
            capture="environment"
            onChange={handleFileInputChange}
            style={{ display: "none" }}
          />

          <input
            ref={fileInputRef}
            type="file"
            accept="image/*"
            onChange={handleFileInputChange}
            style={{ display: "none" }}
          />
        </div>
      )}

      {/* Step 2: Preview */}
      {step === STEPS.PREVIEW && imagePreviewUrl && (
        <div className="upload-preview-card">
          <h3>Review your image</h3>

          <img
            src={imagePreviewUrl}
            alt="Prescription preview"
            className="preview-image"
          />

          <div className="upload-actions">
            <button
              type="button"
              className="upload-btn secondary"
              onClick={resetAll}
            >
              <RotateCcw />
              <span>Choose Different Image</span>
            </button>

            <button
              type="button"
              className="upload-btn primary"
              onClick={handleProcessImage}
            >
              <FileText />
              <span>Process Image</span>
            </button>
          </div>
        </div>
      )}

      {/* Step 3: Processing */}
      {step === STEPS.PROCESSING && (
        <div className="upload-processing">
          <div className="spinner">
            <Loader2 />
          </div>

          <h3>Reading your prescription...</h3>
          <p>This usually takes a few seconds</p>
        </div>
      )}

      {/* Step 4: Review + Edit */}
      {step === STEPS.REVIEW && (
        <div className="upload-review">
          <div className="review-columns">
            <div className="review-image-col">
              <h3>Original Image</h3>

              <img
                src={imagePreviewUrl}
                alt="Prescription"
                className="preview-image"
              />
            </div>

            <div className="review-text-col">
              <h3>Extracted Text</h3>
              <pre className="raw-text-block">{rawText}</pre>
            </div>
          </div>

          <h3 className="section-title">Confirm Medicine Details</h3>

          <p className="section-hint">
            Review and correct any details before saving.
          </p>

          <div className="medicine-edit-list">
            {medicines.map((med) => (
              <div key={med.id} className="medicine-edit-row">
                <input
                  type="text"
                  placeholder="Medicine name"
                  value={med.name}
                  onChange={(e) =>
                    handleMedicineFieldChange(
                      med.id,
                      "name",
                      e.target.value
                    )
                  }
                />

                <input
                  type="text"
                  placeholder="Dosage (e.g. 500mg)"
                  value={med.dosage}
                  onChange={(e) =>
                    handleMedicineFieldChange(
                      med.id,
                      "dosage",
                      e.target.value
                    )
                  }
                />

                <input
                  type="text"
                  placeholder="Frequency"
                  value={med.frequency}
                  onChange={(e) =>
                    handleMedicineFieldChange(
                      med.id,
                      "frequency",
                      e.target.value
                    )
                  }
                />

                <input
                  type="number"
                  placeholder="Qty"
                  value={med.quantity}
                  onChange={(e) =>
                    handleMedicineFieldChange(
                      med.id,
                      "quantity",
                      e.target.value
                    )
                  }
                />

                <button
                  type="button"
                  className="remove-btn"
                  onClick={() => handleRemoveMedicine(med.id)}
                  title="Remove medicine"
                  aria-label="Remove medicine"
                >
                  <Trash2 />
                </button>
              </div>
            ))}
          </div>

          <button
            type="button"
            className="add-medicine-btn"
            onClick={handleAddMedicine}
          >
            <Plus />
            <span>Add another medicine</span>
          </button>

          <div className="upload-actions">
            <button
              type="button"
              className="upload-btn secondary"
              onClick={resetAll}
            >
              <RotateCcw />
              <span>Start Over</span>
            </button>

            <button
              type="button"
              className="upload-btn primary"
              onClick={handleConfirmSave}
              disabled={saving}
            >
              {saving ? (
                <>
                  <Loader2 className="spin" />
                  <span>Saving...</span>
                </>
              ) : (
                <>
                  <CheckCircle />
                  <span>Confirm & Save</span>
                </>
              )}
            </button>
          </div>
        </div>
      )}

      {/* Step 5: Saved */}
      {step === STEPS.SAVED && (
        <div className="upload-success">
          <div className="success-icon">
            <CheckCircle />
          </div>

          <h3>Medicines saved successfully</h3>

          <p>
            {medicines.length} medicine
            {medicines.length !== 1 ? "s" : ""} added to your list.
          </p>

          <div className="upload-actions">
            <button
              type="button"
              className="upload-btn secondary"
              onClick={resetAll}
            >
              <Upload />
              <span>Upload Another</span>
            </button>

            <button
              type="button"
              className="upload-btn primary"
              onClick={() => navigate("/patient-dashboard")}
            >
              <Home />
              <span>Go to Dashboard</span>
            </button>
          </div>
        </div>
      )}
    </div>
  );
};

export default MedicineUpload;
