import { useEffect, useRef, useState } from "react";
import { useNavigate } from "react-router-dom";

import DashboardLayout from "../components/DashboardLayout";
import {
  confirmPrescriptionScan,
  fetchMedicines,
  scanPrescriptionCamera,
  scanPrescriptionFile,
  updateScanItem,
} from "../services/api";
import { PATIENT_MENU } from "../utils/menus";

const ScanPrescription = () => {
  const navigate = useNavigate();

  const videoRef = useRef(null);
  const canvasRef = useRef(null);
  const streamRef = useRef(null);
  const fileInputRef = useRef(null);

  // Input states
  const [activeMode, setActiveMode] = useState("upload"); // 'upload' | 'camera'
  const [selectedFile, setSelectedFile] = useState(null);
  const [filePreview, setFilePreview] = useState(null);

  // Camera states
  const [cameraOn, setCameraOn] = useState(false);
  const [cameraError, setCameraError] = useState("");
  const [capturedImage, setCapturedImage] = useState(null);

  // System catalog
  const [catalogMedicines, setCatalogMedicines] = useState([]);

  // Scan & Processing states
  const [isProcessing, setIsProcessing] = useState(false);
  const [processingStep, setProcessingStep] = useState(1);
  const [scanResult, setScanResult] = useState(null); // PrescriptionScan object
  const [scanItems, setScanItems] = useState([]); // Temporary items list

  // Editing state
  const [editingItemId, setEditingItemId] = useState(null);
  const [editForm, setEditForm] = useState({
    medicine_id: "",
    matched_name: "",
    strength: "",
    dosage_form: "",
    frequency: "",
    time_of_day: "morning",
    duration: "",
    instructions: "",
  });

  // Confirmation Modal state
  const [showConfirmModal, setShowConfirmModal] = useState(false);

  // Feedback states
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");

  const menu = PATIENT_MENU;

  useEffect(() => {
    fetchMedicines()
      .then(setCatalogMedicines)
      .catch(() => {});
  }, []);

  const stopCamera = () => {
    if (streamRef.current) {
      streamRef.current.getTracks().forEach((track) => track.stop());
      streamRef.current = null;
    }
    setCameraOn(false);
  };

  useEffect(() => {
    return () => stopCamera();
  }, []);

  const startCamera = async () => {
    setCameraError("");
    setCapturedImage(null);
    setSelectedFile(null);
    setFilePreview(null);

    try {
      const mediaStream = await navigator.mediaDevices.getUserMedia({
        video: { facingMode: "environment", width: { ideal: 1280 }, height: { ideal: 720 } },
        audio: false,
      });

      streamRef.current = mediaStream;
      setCameraOn(true);

      setTimeout(() => {
        if (videoRef.current) {
          videoRef.current.srcObject = mediaStream;
          videoRef.current.play().catch(() => {});
        }
      }, 100);
    } catch {
      setCameraError(
        "Camera access denied. Please allow camera permissions in your browser."
      );
    }
  };

  const capturePhoto = () => {
    if (!videoRef.current || !canvasRef.current) return;

    const video = videoRef.current;
    const canvas = canvasRef.current;

    canvas.width = video.videoWidth || 640;
    canvas.height = video.videoHeight || 480;
    const ctx = canvas.getContext("2d");
    ctx.drawImage(video, 0, 0, canvas.width, canvas.height);

    const dataUrl = canvas.toDataURL("image/png");
    setCapturedImage(dataUrl);
    stopCamera();
  };

  const handleFileChange = (e) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const validTypes = ["image/png", "image/jpeg", "image/jpg", "image/tiff"];
    if (!validTypes.includes(file.type.toLowerCase()) && !file.name.match(/\.(png|jpe?g|tiff?)$/i)) {
      setError("Unsupported image format. Please upload JPG, PNG, or TIFF.");
      return;
    }

    setError("");
    setSelectedFile(file);
    setFilePreview(URL.createObjectURL(file));
  };

  const runOcrPipeline = async () => {
    setError("");
    setSuccess("");

    if (!selectedFile && !capturedImage) {
      setError("Please upload or capture a prescription image first.");
      return;
    }

    setIsProcessing(true);
    setProcessingStep(1);

    const stepInterval = setInterval(() => {
      setProcessingStep((prev) => (prev < 4 ? prev + 1 : prev));
    }, 450);

    try {
      let resultScan;
      if (activeMode === "upload" && selectedFile) {
        resultScan = await scanPrescriptionFile(selectedFile);
      } else if (capturedImage) {
        resultScan = await scanPrescriptionCamera(capturedImage);
      } else {
        throw new Error("No prescription image available to scan.");
      }

      clearInterval(stepInterval);
      setProcessingStep(4);
      setScanResult(resultScan);
      setScanItems(resultScan.items || []);
      setSuccess("Prescription scan completed! Review detected medicines below.");
    } catch (e) {
      clearInterval(stepInterval);
      setError(e.message || "Prescription OCR scan failed. Please try again.");
    } finally {
      setIsProcessing(false);
    }
  };

  // Toggle selection for an individual item
  const toggleItemSelection = async (itemId) => {
    const item = scanItems.find((i) => i.id === itemId);
    if (!item) return;

    const newSelected = !item.selected;
    setScanItems((prev) =>
      prev.map((i) => (i.id === itemId ? { ...i, selected: newSelected } : i))
    );

    if (scanResult?.id) {
      try {
        await updateScanItem(scanResult.id, itemId, { selected: newSelected });
      } catch (err) {
        console.error("Failed to update item selection on server:", err);
      }
    }
  };

  // Select All / Deselect All
  const handleSelectAll = (selectState) => {
    setScanItems((prev) => prev.map((i) => ({ ...i, selected: selectState })));
  };

  // Open Edit Form for an item
  const startEditing = (item) => {
    setEditingItemId(item.id);

    const matched = catalogMedicines.find(
      (m) => m.id === item.medicine_id || m.name.toLowerCase() === item.matched_name?.toLowerCase()
    );

    setEditForm({
      medicine_id: matched ? String(matched.id) : item.medicine_id ? String(item.medicine_id) : "",
      matched_name: item.matched_name || item.detected_name,
      strength: item.strength || "500 mg",
      dosage_form: item.dosage_form || "Tablet",
      frequency: item.frequency || "1-0-1",
      time_of_day: item.frequency?.includes("0-0-1") ? "night" : item.frequency?.includes("1-1-1") ? "afternoon" : "morning",
      duration: item.duration || "5 days",
      instructions: item.instructions || "After food",
    });
  };

  // Save Item Edits
  const saveItemEdits = async (itemId) => {
    const selectedMed = catalogMedicines.find((m) => String(m.id) === String(editForm.medicine_id));
    const matchedName = selectedMed ? selectedMed.name : editForm.matched_name;

    const updatedFields = {
      medicine_id: selectedMed ? selectedMed.id : null,
      matched_name: matchedName,
      strength: editForm.strength,
      dosage_form: editForm.dosage_form,
      frequency: editForm.frequency,
      duration: editForm.duration,
      instructions: editForm.instructions,
    };

    setScanItems((prev) =>
      prev.map((i) =>
        i.id === itemId
          ? {
              ...i,
              ...updatedFields,
              confidence_level: "User verified",
            }
          : i
      )
    );

    setEditingItemId(null);

    if (scanResult?.id) {
      try {
        await updateScanItem(scanResult.id, itemId, updatedFields);
      } catch (err) {
        console.error("Failed to persist item edits:", err);
      }
    }
  };

  // Confirm selected medicines and send to permanent backend schedule
  const handleConfirmAdd = async () => {
    const selectedItems = scanItems.filter((i) => i.selected);
    if (!selectedItems.length) {
      setError("Please select at least one medicine to add.");
      return;
    }

    setIsProcessing(true);
    try {
      const confirmPayload = selectedItems.map((item) => {
        let medId = item.medicine_id;
        if (!medId) {
          const match = catalogMedicines.find(
            (m) => m.name.toLowerCase() === (item.matched_name || item.detected_name).toLowerCase()
          );
          medId = match ? match.id : catalogMedicines[0]?.id || 1;
        }

        let tod = "morning";
        if (item.frequency?.includes("0-0-1") || item.instructions?.toLowerCase().includes("night")) {
          tod = "night";
        } else if (item.frequency?.includes("1-1-1") || item.instructions?.toLowerCase().includes("afternoon")) {
          tod = "afternoon";
        } else if (item.frequency?.includes("evening")) {
          tod = "evening";
        }

        return {
          scan_item_id: item.id,
          selected: true,
          medicine_id: medId,
          dosage: item.strength || "500 mg",
          time_of_day: tod,
          notes: item.instructions || `${item.dosage_form || "Tablet"} - ${item.duration || "5 days"}`,
        };
      });

      await confirmPrescriptionScan(scanResult.id, confirmPayload);

      setShowConfirmModal(false);
      navigate("/dashboard/patient/medicines", {
        state: { message: `Added ${selectedItems.length} prescription medicines to your schedule!` },
      });
    } catch (err) {
      setError(err.message || "Failed to confirm prescription items.");
    } finally {
      setIsProcessing(false);
    }
  };

  const selectedCount = scanItems.filter((i) => i.selected).length;

  return (
    <DashboardLayout
      role="Patient"
      title="Scan Prescription"
      subtitle="Upload or capture your prescription to automatically detect medicines."
      menu={menu}
    >
      <div className="prescription-scan-container" style={{ display: "grid", gap: "1.5rem" }}>
        
        {/* Mode Selector Tabs */}
        {!scanResult && (
          <section className="panel">
            <div className="panel__head" style={{ display: "flex", gap: "1rem", alignItems: "center", justifyContent: "space-between" }}>
              <h2 className="panel__title">Prescription Scanner</h2>
              <div className="tab-buttons" style={{ display: "flex", gap: "0.5rem" }}>
                <button
                  className={`action-btn ${activeMode === "upload" ? "" : "action-btn--ghost"}`}
                  onClick={() => {
                    setActiveMode("upload");
                    stopCamera();
                  }}
                >
                  📁 Upload Prescription
                </button>
                <button
                  className={`action-btn ${activeMode === "camera" ? "" : "action-btn--ghost"}`}
                  onClick={() => {
                    setActiveMode("camera");
                    startCamera();
                  }}
                >
                  📷 Take Photo with Camera
                </button>
              </div>
            </div>

            {/* Mode A: Upload File */}
            {activeMode === "upload" && (
              <div className="upload-zone" style={{ padding: "2rem", textAlign: "center", border: "2px dashed #0ea5e9", borderRadius: "12px", background: "rgba(14, 165, 233, 0.04)" }}>
                <input
                  type="file"
                  ref={fileInputRef}
                  accept="image/png, image/jpeg, image/jpg, image/tiff"
                  style={{ display: "none" }}
                  onChange={handleFileChange}
                />
                {!filePreview ? (
                  <div>
                    <div style={{ fontSize: "3rem", marginBottom: "0.5rem" }}>📜</div>
                    <p style={{ fontWeight: 600, fontSize: "1.1rem", marginBottom: "0.25rem" }}>
                      Upload Prescription File
                    </p>
                    <p style={{ color: "#94a3b8", fontSize: "0.9rem", marginBottom: "1rem" }}>
                      Supported formats: PNG, JPG, JPEG, TIFF
                    </p>
                    <button className="action-btn" onClick={() => fileInputRef.current?.click()}>
                      Choose File
                    </button>
                  </div>
                ) : (
                  <div>
                    <img
                      src={filePreview}
                      alt="Prescription preview"
                      style={{ maxHeight: "300px", maxWidth: "100%", borderRadius: "8px", border: "1px solid #334155", marginBottom: "1rem" }}
                    />
                    <div style={{ display: "flex", gap: "0.75rem", justifyContent: "center" }}>
                      <button className="action-btn" onClick={runOcrPipeline} disabled={isProcessing}>
                        {isProcessing ? "Processing..." : "🔍 Scan Prescription"}
                      </button>
                      <button
                        className="action-btn action-btn--ghost"
                        onClick={() => {
                          setSelectedFile(null);
                          setFilePreview(null);
                        }}
                      >
                        Remove Image
                      </button>
                    </div>
                  </div>
                )}
              </div>
            )}

            {/* Mode B: Live Camera */}
            {activeMode === "camera" && (
              <div className="camera-zone" style={{ padding: "1rem", textAlign: "center" }}>
                {!capturedImage && (
                  <div style={{ position: "relative", maxWidth: "640px", margin: "0 auto", overflow: "hidden", borderRadius: "12px", background: "#0f172a", border: "2px solid #0ea5e9" }}>
                    <video ref={videoRef} style={{ width: "100%", display: cameraOn ? "block" : "none" }} playsInline />
                    <canvas ref={canvasRef} style={{ display: "none" }} />
                    
                    {cameraOn && (
                      <div style={{ position: "absolute", top: "50%", left: "50%", transform: "translate(-50%, -50%)", border: "2px dashed rgba(56, 189, 248, 0.8)", width: "80%", height: "70%", borderRadius: "8px", pointerEvents: "none" }}>
                        <span style={{ position: "absolute", top: "8px", left: "50%", transform: "translateX(-50%)", background: "rgba(0,0,0,0.6)", color: "#38bdf8", padding: "2px 8px", borderRadius: "4px", fontSize: "0.8rem" }}>
                          Align prescription inside box
                        </span>
                      </div>
                    )}

                    {!cameraOn && !cameraError && (
                      <div style={{ padding: "3rem 1rem", color: "#94a3b8" }}>
                        <div style={{ fontSize: "3rem", marginBottom: "0.5rem" }}>📷</div>
                        <p>Opening device camera...</p>
                      </div>
                    )}
                  </div>
                )}

                {cameraError && (
                  <p style={{ color: "#f87171", background: "rgba(248, 113, 113, 0.1)", padding: "0.75rem", borderRadius: "6px", margin: "1rem 0" }}>
                    {cameraError}
                  </p>
                )}

                {!capturedImage && cameraOn && (
                  <div style={{ marginTop: "1rem", display: "flex", gap: "0.75rem", justifyContent: "center" }}>
                    <button className="action-btn" onClick={capturePhoto}>
                      📸 Capture Photo
                    </button>
                    <button className="action-btn action-btn--ghost" onClick={stopCamera}>
                      Cancel
                    </button>
                  </div>
                )}

                {capturedImage && (
                  <div>
                    <img
                      src={capturedImage}
                      alt="Captured preview"
                      style={{ maxHeight: "300px", maxWidth: "100%", borderRadius: "8px", border: "1px solid #334155", marginBottom: "1rem" }}
                    />
                    <div style={{ display: "flex", gap: "0.75rem", justifyContent: "center" }}>
                      <button className="action-btn" onClick={runOcrPipeline} disabled={isProcessing}>
                        {isProcessing ? "Processing..." : "🔍 Scan Captured Photo"}
                      </button>
                      <button className="action-btn action-btn--ghost" onClick={startCamera}>
                        🔄 Retake Photo
                      </button>
                    </div>
                  </div>
                )}
              </div>
            )}
          </section>
        )}

        {/* Processing Indicator */}
        {isProcessing && (
          <section className="panel" style={{ textAlign: "center", padding: "2rem" }}>
            <h3 style={{ fontSize: "1.25rem", marginBottom: "1rem", color: "#38bdf8" }}>
              Scanning Prescription...
            </h3>
            <div style={{ display: "flex", flexDirection: "column", gap: "0.5rem", maxWidth: "320px", margin: "0 auto", textAlign: "left" }}>
              <div style={{ color: processingStep >= 1 ? "#4ade80" : "#64748b" }}>
                {processingStep >= 1 ? "✓ Image uploaded" : "○ Uploading image"}
              </div>
              <div style={{ color: processingStep >= 2 ? "#4ade80" : processingStep === 1 ? "#38bdf8" : "#64748b" }}>
                {processingStep >= 2 ? "✓ Image processed (OpenCV)" : processingStep === 1 ? "● Enhancing contrast & reducing noise..." : "○ Image processing"}
              </div>
              <div style={{ color: processingStep >= 3 ? "#4ade80" : processingStep === 2 ? "#38bdf8" : "#64748b" }}>
                {processingStep >= 3 ? "✓ Reading prescription text (PyTesseract)" : processingStep === 2 ? "● Reading prescription text..." : "○ OCR Extraction"}
              </div>
              <div style={{ color: processingStep >= 4 ? "#4ade80" : processingStep === 3 ? "#38bdf8" : "#64748b" }}>
                {processingStep >= 4 ? "✓ Detecting medicines & catalog matching" : processingStep === 3 ? "● Matching with PillSync medicine catalog..." : "○ Medicine Detection"}
              </div>
            </div>
          </section>
        )}

        {error && <p className="error-message" style={{ color: "#f87171", background: "rgba(248,113,113,0.1)", padding: "0.75rem", borderRadius: "6px" }}>{error}</p>}
        {success && <p className="success-message" style={{ color: "#4ade80", background: "rgba(74,222,128,0.1)", padding: "0.75rem", borderRadius: "6px" }}>{success}</p>}

        {/* TEMPORARY MEDICINE REVIEW SCREEN */}
        {scanResult && !isProcessing && (
          <section className="panel" style={{ display: "grid", gap: "1rem" }}>
            <div className="panel__head" style={{ display: "flex", justifyContent: "space-between", alignItems: "center", flexWrap: "wrap", gap: "1rem" }}>
              <div>
                <h2 className="panel__title">Prescription Scan Complete</h2>
                <p style={{ color: "#94a3b8", fontSize: "0.9rem" }}>
                  We detected {scanItems.length} medicine{scanItems.length !== 1 ? "s" : ""}. All medicines are selected by default.
                </p>
              </div>
              <div style={{ display: "flex", gap: "0.5rem", alignItems: "center" }}>
                <button className="action-btn action-btn--ghost" onClick={() => handleSelectAll(true)}>
                  ☑ Select All
                </button>
                <button className="action-btn action-btn--ghost" onClick={() => handleSelectAll(false)}>
                  ☐ Deselect All
                </button>
                <button className="action-btn action-btn--ghost" onClick={() => { setScanResult(null); setScanItems([]); }}>
                  🔄 New Scan
                </button>
              </div>
            </div>

            {/* List of Detected Temporary Medicines */}
            <div style={{ display: "grid", gap: "1rem" }}>
              {scanItems.map((item) => {
                const isEditing = editingItemId === item.id;

                return (
                  <div
                    key={item.id}
                    style={{
                      background: item.selected ? "rgba(14, 165, 233, 0.06)" : "rgba(30, 41, 59, 0.4)",
                      border: `1px solid ${item.selected ? "#0ea5e9" : "#334155"}`,
                      borderRadius: "10px",
                      padding: "1.25rem",
                      display: "grid",
                      gap: "0.75rem",
                      transition: "all 0.2s ease",
                    }}
                  >
                    {!isEditing ? (
                      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", gap: "1rem" }}>
                        <div style={{ display: "flex", gap: "1rem", alignItems: "flex-start" }}>
                          <input
                            type="checkbox"
                            checked={item.selected}
                            onChange={() => toggleItemSelection(item.id)}
                            style={{ width: "20px", height: "20px", marginTop: "4px", cursor: "pointer", accentColor: "#0ea5e9" }}
                          />
                          <div>
                            <div style={{ display: "flex", alignItems: "center", gap: "0.75rem" }}>
                              <h3 style={{ fontSize: "1.15rem", fontWeight: 700, margin: 0, color: item.selected ? "#f8fafc" : "#94a3b8" }}>
                                {item.matched_name || item.detected_name}
                              </h3>
                              <span
                                style={{
                                  fontSize: "0.75rem",
                                  padding: "2px 8px",
                                  borderRadius: "12px",
                                  fontWeight: 600,
                                  background: item.confidence_level === "High confidence" ? "rgba(74, 222, 128, 0.2)" : "rgba(245, 158, 11, 0.2)",
                                  color: item.confidence_level === "High confidence" ? "#4ade80" : "#f59e0b",
                                }}
                              >
                                {item.confidence_level}
                              </span>
                            </div>
                            <p style={{ color: "#94a3b8", margin: "0.25rem 0 0 0", fontSize: "0.95rem" }}>
                              <strong>Strength:</strong> {item.strength || "500 mg"} | <strong>Form:</strong> {item.dosage_form || "Tablet"} | <strong>Schedule:</strong> {item.frequency || "1-0-1"}
                            </p>
                            <p style={{ color: "#64748b", margin: "0.25rem 0 0 0", fontSize: "0.85rem" }}>
                              Duration: {item.duration || "5 days"} | Instructions: {item.instructions || "After food"}
                            </p>
                          </div>
                        </div>

                        <button className="action-btn action-btn--ghost" style={{ padding: "4px 12px", fontSize: "0.85rem" }} onClick={() => startEditing(item)}>
                          ✏️ Edit
                        </button>
                      </div>
                    ) : (
                      /* Inline Edit Form */
                      <div style={{ display: "grid", gap: "0.75rem", background: "rgba(15, 23, 42, 0.6)", padding: "1rem", borderRadius: "8px" }}>
                        <h4 style={{ margin: 0, color: "#38bdf8" }}>Edit Medicine Details</h4>
                        
                        <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(200px, 1fr))", gap: "0.75rem" }}>
                          <div>
                            <label style={{ fontSize: "0.8rem", color: "#94a3b8" }}>Medicine Catalog Match</label>
                            <select
                              className="input"
                              value={editForm.medicine_id}
                              onChange={(e) => {
                                const selected = catalogMedicines.find((m) => String(m.id) === e.target.value);
                                setEditForm((prev) => ({
                                  ...prev,
                                  medicine_id: e.target.value,
                                  matched_name: selected ? selected.name : prev.matched_name,
                                  strength: selected?.default_dosage || prev.strength,
                                }));
                              }}
                            >
                              <option value="">-- Select from PillSync Catalog --</option>
                              {catalogMedicines.map((m) => (
                                <option key={m.id} value={m.id}>{m.name} ({m.category || "General"})</option>
                              ))}
                            </select>
                          </div>

                          <div>
                            <label style={{ fontSize: "0.8rem", color: "#94a3b8" }}>Strength</label>
                            <input
                              className="input"
                              value={editForm.strength}
                              onChange={(e) => setEditForm((prev) => ({ ...prev, strength: e.target.value }))}
                              placeholder="e.g. 500 mg"
                            />
                          </div>

                          <div>
                            <label style={{ fontSize: "0.8rem", color: "#94a3b8" }}>Dosage Form</label>
                            <input
                              className="input"
                              value={editForm.dosage_form}
                              onChange={(e) => setEditForm((prev) => ({ ...prev, dosage_form: e.target.value }))}
                              placeholder="e.g. Tablet, Capsule"
                            />
                          </div>

                          <div>
                            <label style={{ fontSize: "0.8rem", color: "#94a3b8" }}>Schedule Pattern</label>
                            <input
                              className="input"
                              value={editForm.frequency}
                              onChange={(e) => setEditForm((prev) => ({ ...prev, frequency: e.target.value }))}
                              placeholder="e.g. 1-0-1"
                            />
                          </div>

                          <div>
                            <label style={{ fontSize: "0.8rem", color: "#94a3b8" }}>Duration</label>
                            <input
                              className="input"
                              value={editForm.duration}
                              onChange={(e) => setEditForm((prev) => ({ ...prev, duration: e.target.value }))}
                              placeholder="e.g. 5 days"
                            />
                          </div>

                          <div>
                            <label style={{ fontSize: "0.8rem", color: "#94a3b8" }}>Instructions</label>
                            <input
                              className="input"
                              value={editForm.instructions}
                              onChange={(e) => setEditForm((prev) => ({ ...prev, instructions: e.target.value }))}
                              placeholder="e.g. After food"
                            />
                          </div>
                        </div>

                        <div style={{ display: "flex", gap: "0.5rem", justifyContent: "flex-end" }}>
                          <button className="action-btn" style={{ padding: "6px 14px" }} onClick={() => saveItemEdits(item.id)}>
                            Save Edits
                          </button>
                          <button className="action-btn action-btn--ghost" style={{ padding: "6px 14px" }} onClick={() => setEditingItemId(null)}>
                            Cancel
                          </button>
                        </div>
                      </div>
                    )}
                  </div>
                );
              })}
            </div>

            {/* Bottom Summary Bar & Confirm Action */}
            <div style={{ marginTop: "1rem", paddingTop: "1rem", borderTop: "1px solid #334155", display: "flex", justifyContent: "space-between", alignItems: "center" }}>
              <span style={{ fontWeight: 600, fontSize: "1.05rem", color: "#f8fafc" }}>
                {selectedCount} of {scanItems.length} medicine{scanItems.length !== 1 ? "s" : ""} selected
              </span>
              <button
                className="action-btn"
                disabled={selectedCount === 0 || isProcessing}
                onClick={() => setShowConfirmModal(true)}
                style={{ padding: "10px 24px", fontSize: "1rem" }}
              >
                ➕ Add Selected Medicines ({selectedCount})
              </button>
            </div>
          </section>
        )}

        {/* Confirmation Modal */}
        {showConfirmModal && (
          <div style={{ position: "fixed", inset: 0, background: "rgba(0,0,0,0.75)", display: "flex", alignItems: "center", justifyContent: "center", zIndex: 9999 }}>
            <div style={{ background: "#0f172a", border: "1px solid #0ea5e9", borderRadius: "12px", padding: "2rem", maxWidth: "480px", width: "90%", boxShadow: "0 20px 25px -5px rgba(0,0,0,0.5)" }}>
              <h3 style={{ margin: "0 0 1rem 0", color: "#38bdf8", fontSize: "1.3rem" }}>
                Confirm Adding Medicines
              </h3>
              <p style={{ color: "#cbd5e1", marginBottom: "1.5rem", lineHeight: "1.5" }}>
                You are about to add <strong>{selectedCount}</strong> detected medicine{selectedCount !== 1 ? "s" : ""} to your active medication schedule.
              </p>
              <div style={{ display: "flex", gap: "0.75rem", justifyContent: "flex-end" }}>
                <button className="action-btn action-btn--ghost" onClick={() => setShowConfirmModal(false)}>
                  Cancel
                </button>
                <button className="action-btn" onClick={handleConfirmAdd} disabled={isProcessing}>
                  {isProcessing ? "Adding..." : "✓ Confirm & Add"}
                </button>
              </div>
            </div>
          </div>
        )}

      </div>
    </DashboardLayout>
  );
};

export default ScanPrescription;