import { useEffect, useState } from "react";
import {
    getMedications,
    addMedication,
    updateMedication,
    deleteMedication,
} from "../services/medicationService";

const emptyForm = {
    name: "",
    dosage: "",
    frequency: "once_daily",
    time: "",
    start_date: "",
    end_date: "",
    quantity: "",
    refill_threshold: 5,
    is_active: true,
};

function MedicationManagement() {
    const [medications, setMedications] = useState([]);
    const [form, setForm] = useState(emptyForm);
    const [editingId, setEditingId] = useState(null);
    const [loading, setLoading] = useState(true);
    const [message, setMessage] = useState("");
    const [error, setError] = useState("");

    const loadMedications = async () => {
        try {
            setLoading(true);
            const data = await getMedications();
            setMedications(data);
            setError("");
        } catch (err) {
            console.error(err);
            setError("Unable to load medications.");
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        loadMedications();
    }, []);

    const handleChange = (e) => {
        const { name, value, type, checked } = e.target;

        setForm({
            ...form,
            [name]: type === "checkbox" ? checked : value,
        });
    };

    const handleSubmit = async (e) => {
        e.preventDefault();

        try {
            setError("");
            setMessage("");

            const medicationData = {
                ...form,
                quantity: Number(form.quantity),
                refill_threshold: Number(form.refill_threshold),
            };

            if (editingId) {
                await updateMedication(editingId, medicationData);
                setMessage("Medication updated successfully.");
            } else {
                await addMedication(medicationData);
                setMessage("Medication added successfully.");
            }

            setForm(emptyForm);
            setEditingId(null);
            await loadMedications();
        } catch (err) {
            console.error(err);
            setError("Unable to save medication.");
        }
    };

    const handleEdit = (medication) => {
        setEditingId(medication.id);

        setForm({
            name: medication.name,
            dosage: medication.dosage,
            frequency: medication.frequency,
            time: medication.time,
            start_date: medication.start_date,
            end_date: medication.end_date || "",
            quantity: medication.quantity,
            refill_threshold: medication.refill_threshold,
            is_active: medication.is_active,
        });

        window.scrollTo({
            top: 0,
            behavior: "smooth",
        });
    };

    const handleDelete = async (id) => {
        const confirmed = window.confirm(
            "Are you sure you want to delete this medication?"
        );

        if (!confirmed) {
            return;
        }

        try {
            await deleteMedication(id);

            setMessage("Medication deleted successfully.");
            setError("");

            if (editingId === id) {
                setEditingId(null);
                setForm(emptyForm);
            }

            await loadMedications();
        } catch (err) {
            console.error(err);
            setError("Unable to delete medication.");
        }
    };

    const handleCancelEdit = () => {
        setEditingId(null);
        setForm(emptyForm);
        setMessage("");
        setError("");
    };

    return (
        <div style={{ padding: "30px", maxWidth: "1100px", margin: "auto" }}>
            <h1>💊 Medication Management</h1>

            <p>
                Add, view, update and delete your medicines.
            </p>

            {message && (
                <div
                    style={{
                        padding: "10px",
                        marginBottom: "15px",
                        background: "#e8f5e9",
                    }}
                >
                    {message}
                </div>
            )}

            {error && (
                <div
                    style={{
                        padding: "10px",
                        marginBottom: "15px",
                        background: "#ffebee",
                    }}
                >
                    {error}
                </div>
            )}

            <div
                style={{
                    border: "1px solid #ddd",
                    borderRadius: "10px",
                    padding: "20px",
                    marginBottom: "30px",
                }}
            >
                <h2>
                    {editingId
                        ? "✏️ Edit Medication"
                        : "➕ Add Medication"}
                </h2>

                <form onSubmit={handleSubmit}>
                    <div style={{ display: "grid", gap: "12px" }}>
                        <input
                            type="text"
                            name="name"
                            placeholder="Medicine name"
                            value={form.name}
                            onChange={handleChange}
                            required
                        />

                        <input
                            type="text"
                            name="dosage"
                            placeholder="Dosage (e.g. 500 mg)"
                            value={form.dosage}
                            onChange={handleChange}
                            required
                        />

                        <select
                            name="frequency"
                            value={form.frequency}
                            onChange={handleChange}
                        >
                            <option value="once_daily">
                                Once Daily
                            </option>
                            <option value="twice_daily">
                                Twice Daily
                            </option>
                            <option value="three_times_daily">
                                Three Times Daily
                            </option>
                            <option value="as_needed">
                                As Needed
                            </option>
                        </select>

                        <label>
                            Time
                            <input
                                type="time"
                                name="time"
                                value={form.time}
                                onChange={handleChange}
                                required
                            />
                        </label>

                        <label>
                            Start Date
                            <input
                                type="date"
                                name="start_date"
                                value={form.start_date}
                                onChange={handleChange}
                                required
                            />
                        </label>

                        <label>
                            End Date
                            <input
                                type="date"
                                name="end_date"
                                value={form.end_date}
                                onChange={handleChange}
                            />
                        </label>

                        <input
                            type="number"
                            name="quantity"
                            placeholder="Quantity"
                            value={form.quantity}
                            onChange={handleChange}
                            min="0"
                            required
                        />

                        <input
                            type="number"
                            name="refill_threshold"
                            placeholder="Refill threshold"
                            value={form.refill_threshold}
                            onChange={handleChange}
                            min="0"
                            required
                        />

                        <label>
                            <input
                                type="checkbox"
                                name="is_active"
                                checked={form.is_active}
                                onChange={handleChange}
                            />{" "}
                            Active medication
                        </label>

                        <div>
                            <button type="submit">
                                {editingId
                                    ? "Update Medication"
                                    : "Add Medication"}
                            </button>

                            {editingId && (
                                <button
                                    type="button"
                                    onClick={handleCancelEdit}
                                    style={{ marginLeft: "10px" }}
                                >
                                    Cancel
                                </button>
                            )}
                        </div>
                    </div>
                </form>
            </div>

            <h2>📋 My Medications</h2>

            {loading ? (
                <p>Loading medications...</p>
            ) : medications.length === 0 ? (
                <p>No medications available.</p>
            ) : (
                <div style={{ display: "grid", gap: "15px" }}>
                    {medications.map((medication) => (
                        <div
                            key={medication.id}
                            style={{
                                border: "1px solid #ddd",
                                borderRadius: "10px",
                                padding: "20px",
                            }}
                        >
                            <h3>{medication.name}</h3>

                            <p>
                                
                                <strong>Dosage:</strong>{" "}
                                {medication.dosage}
                            </p>

                            <p>
                                <strong>Frequency:</strong>{" "}
                                {medication.frequency}
                            </p>

                            <p>
                                <strong>Time:</strong>{" "}
                                {medication.time}
                            </p>

                            <p>
                                <strong>Start:</strong>{" "}
                                {medication.start_date}
                            </p>

                            <p>
                                <strong>End:</strong>{" "}
                                {medication.end_date || "No end date"}
                            </p>

                            <p>
                                <strong>Quantity:</strong>{" "}
                                {medication.quantity}
                            </p>

                            <p>
                                <strong>Refill at:</strong>{" "}
                                {medication.refill_threshold}
                            </p>

                            <p>
                                <strong>Status:</strong>{" "}
                                {medication.is_active
                                    ? "Active"
                                    : "Inactive"}
                            </p>

                            <button
                                onClick={() =>
                                    handleEdit(medication)
                                }
                            >
                                ✏️ Edit
                            </button>

                            <button
                                onClick={() =>
                                    handleDelete(medication.id)
                                }
                                style={{ marginLeft: "10px" }}
                            >
                                🗑️ Delete
                            </button>
                        </div>
                    ))}
                </div>
            )}
        </div>
    );
}

export default MedicationManagement;