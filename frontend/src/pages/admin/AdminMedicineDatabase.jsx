import React, { useEffect, useState } from "react";
import {
  Pill,
  Plus,
  Search,
  RefreshCw,
  AlertTriangle,
  Package,
  FileText,
} from "lucide-react";

import {
  fetchMedicines,
  addMedicine,
} from "../../services/api";

const AdminMedicineDatabase = () => {
  const [medicines, setMedicines] = useState([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");
  const [search, setSearch] = useState("");

  const [form, setForm] = useState({
    name: "",
    brand: "",
    dosage: "",
    description: "",
  });

  const loadMedicines = async () => {
    try {
      setLoading(true);
      setError("");

      const data = await fetchMedicines();

      setMedicines(
        Array.isArray(data) ? data : []
      );
    } catch (err) {
      console.error(
        "Medicine database error:",
        err
      );

      setError(
        err?.response?.data?.detail ||
          err?.message ||
          "Unable to load medicines."
      );
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadMedicines();
  }, []);

  const handleChange = (e) => {
    const { name, value } = e.target;

    setForm((prev) => ({
      ...prev,
      [name]: value,
    }));
  };

  const handleAdd = async (e) => {
    e.preventDefault();

    if (!form.name.trim()) {
      setError("Medicine name is required.");
      return;
    }

    try {
      setSaving(true);
      setError("");

      await addMedicine({
        name: form.name.trim(),
        brand: form.brand.trim() || null,
        dosage:
          form.dosage.trim() || null,
        description:
          form.description.trim() || null,
      });

      setForm({
        name: "",
        brand: "",
        dosage: "",
        description: "",
      });

      await loadMedicines();
    } catch (err) {
      console.error(
        "Add medicine error:",
        err
      );

      setError(
        err?.response?.data?.detail ||
          err?.message ||
          "Unable to add medicine."
      );
    } finally {
      setSaving(false);
    }
  };

  const filteredMedicines = medicines.filter(
    (medicine) => {
      const searchText = search
        .toLowerCase()
        .trim();

      if (!searchText) {
        return true;
      }

      return (
        String(
          medicine.name || ""
        )
          .toLowerCase()
          .includes(searchText) ||
        String(
          medicine.brand || ""
        )
          .toLowerCase()
          .includes(searchText) ||
        String(
          medicine.dosage ||
            medicine.default_dosage ||
            ""
        )
          .toLowerCase()
          .includes(searchText) ||
        String(
          medicine.description || ""
        )
          .toLowerCase()
          .includes(searchText)
      );
    }
  );

  return (
    <div className="admin-medicine-page">
      <style>{styles}</style>

      {/* HEADER */}

      <header className="medicine-header">
        <div>
          <p className="medicine-eyebrow">
            Administration
          </p>

          <h1>Medicine Database</h1>

          <p>
            Manage the medicines available across
            the PillSync platform.
          </p>
        </div>

        <button
          className="medicine-refresh-btn"
          onClick={loadMedicines}
          type="button"
        >
          <RefreshCw size={17} />
          Refresh
        </button>
      </header>

      {/* ERROR */}

      {error && (
        <div className="medicine-error">
          <AlertTriangle size={18} />

          <span>{error}</span>

          <button
            type="button"
            onClick={() => setError("")}
          >
            Dismiss
          </button>
        </div>
      )}

      {/* ADD MEDICINE */}

      <section className="medicine-panel">
        <div className="medicine-panel-header">
          <div className="medicine-title-wrap">
            <div className="medicine-title-icon">
              <Plus size={20} />
            </div>

            <div>
              <h2>Add Medicine</h2>

              <p>
                Add a medicine to the shared
                database.
              </p>
            </div>
          </div>
        </div>

        <form onSubmit={handleAdd}>
          <div className="medicine-form-grid">
            <div className="medicine-field">
              <label htmlFor="name">
                Medicine Name
              </label>

              <div className="medicine-input-wrap">
                <Pill size={16} />

                <input
                  id="name"
                  name="name"
                  value={form.name}
                  onChange={handleChange}
                  placeholder="e.g. Metformin"
                  required
                />
              </div>
            </div>

            <div className="medicine-field">
              <label htmlFor="brand">
                Brand
              </label>

              <div className="medicine-input-wrap">
                <Package size={16} />

                <input
                  id="brand"
                  name="brand"
                  value={form.brand}
                  onChange={handleChange}
                  placeholder="e.g. Glucophage"
                />
              </div>
            </div>

            <div className="medicine-field">
              <label htmlFor="dosage">
                Default Dosage
              </label>

              <div className="medicine-input-wrap">
                <FileText size={16} />

                <input
                  id="dosage"
                  name="dosage"
                  value={form.dosage}
                  onChange={handleChange}
                  placeholder="e.g. 500 mg"
                />
              </div>
            </div>
          </div>

          <div className="medicine-field description-field">
            <label htmlFor="description">
              Description
            </label>

            <textarea
              id="description"
              name="description"
              value={form.description}
              onChange={handleChange}
              placeholder="Short description of the medicine"
              rows={3}
            />
          </div>

          <div className="medicine-form-actions">
            <button
              className="medicine-add-btn"
              type="submit"
              disabled={saving}
            >
              <Plus size={17} />

              {saving
                ? "Adding..."
                : "Add Medicine"}
            </button>
          </div>
        </form>
      </section>

      {/* DATABASE */}

      <section className="medicine-panel">
        <div className="medicine-panel-header database-header">
          <div className="medicine-title-wrap">
            <div className="medicine-title-icon">
              <Pill size={20} />
            </div>

            <div>
              <h2>
                Medicine Records
              </h2>

              <p>
                {medicines.length} medicines in
                the system.
              </p>
            </div>
          </div>

          <div className="medicine-search">
            <Search size={17} />

            <input
              value={search}
              onChange={(e) =>
                setSearch(e.target.value)
              }
              placeholder="Search medicines..."
            />
          </div>
        </div>

        {loading ? (
          <div className="medicine-loading">
            <div className="medicine-spinner" />

            <p>
              Loading medicine database...
            </p>
          </div>
        ) : filteredMedicines.length === 0 ? (
          <div className="medicine-empty">
            <Pill size={28} />

            <h3>
              {search
                ? "No medicines found"
                : "No medicines available"}
            </h3>

            <p>
              {search
                ? "Try a different search term."
                : "Add the first medicine using the form above."}
            </p>
          </div>
        ) : (
          <div className="medicine-table-wrap">
            <table className="medicine-table">
              <thead>
                <tr>
                  <th>Name</th>
                  <th>Brand</th>
                  <th>Default Dosage</th>
                  <th>Description</th>
                </tr>
              </thead>

              <tbody>
                {filteredMedicines.map(
                  (medicine) => (
                    <tr
                      key={medicine.id}
                    >
                      <td>
                        <div className="medicine-name-cell">
                          <div className="medicine-row-icon">
                            <Pill size={17} />
                          </div>

                          <div>
                            <strong>
                              {medicine.name}
                            </strong>

                            <span>
                              ID:{" "}
                              {medicine.id}
                            </span>
                          </div>
                        </div>
                      </td>

                      <td>
                        {medicine.brand ||
                          "-"}
                      </td>

                      <td>
                        {medicine.dosage ||
                          medicine.default_dosage ||
                          "-"}
                      </td>

                      <td>
                        <span className="description-cell">
                          {medicine.description ||
                            "-"}
                        </span>
                      </td>
                    </tr>
                  )
                )}
              </tbody>
            </table>
          </div>
        )}
      </section>
    </div>
  );
};

const styles = `
  .admin-medicine-page {
    min-height: calc(100vh - 80px);
    padding: 28px;
    background: #f7f9fc;
    color: #172033;
  }

  .medicine-header {
    display: flex;
    align-items: flex-start;
    justify-content: space-between;
    gap: 20px;
    margin-bottom: 24px;
  }

  .medicine-eyebrow {
    margin: 0 0 6px;
    color: #0f9488;
    font-size: 11px;
    font-weight: 700;
    text-transform: uppercase;
    letter-spacing: .08em;
  }

  .medicine-header h1 {
    margin: 0;
    color: #172033;
    font-size: 30px;
    font-weight: 750;
  }

  .medicine-header p:last-child {
    margin: 7px 0 0;
    color: #697386;
    font-size: 14px;
  }

  .medicine-refresh-btn,
  .medicine-add-btn {
    display: inline-flex;
    align-items: center;
    justify-content: center;
    gap: 7px;
    border-radius: 9px;
    padding: 10px 14px;
    font-size: 13px;
    font-weight: 650;
    cursor: pointer;
  }

  .medicine-refresh-btn {
    border: 1px solid #dce3eb;
    background: #fff;
    color: #344054;
  }

  .medicine-refresh-btn:hover {
    background: #f9fafb;
  }

  .medicine-add-btn {
    border: 0;
    background: #14b8a6;
    color: #fff;
  }

  .medicine-add-btn:hover {
    background: #0f9f90;
  }

  .medicine-add-btn:disabled {
    opacity: .6;
    cursor: not-allowed;
  }

  .medicine-error {
    display: flex;
    align-items: center;
    gap: 9px;
    margin-bottom: 18px;
    padding: 12px 14px;
    border: 1px solid #fecaca;
    border-radius: 10px;
    background: #fff5f5;
    color: #b42318;
    font-size: 13px;
  }

  .medicine-error button {
    margin-left: auto;
    border: 0;
    background: transparent;
    color: inherit;
    font-size: 12px;
    font-weight: 700;
    cursor: pointer;
  }

  .medicine-panel {
    margin-bottom: 18px;
    padding: 20px;
    border: 1px solid #e7ebf0;
    border-radius: 14px;
    background: #fff;
    box-shadow: 0 2px 8px rgba(15, 23, 42, .03);
  }

  .medicine-panel-header {
    margin-bottom: 18px;
  }

  .medicine-title-wrap {
    display: flex;
    align-items: center;
    gap: 11px;
  }

  .medicine-title-icon {
    width: 42px;
    height: 42px;
    display: flex;
    align-items: center;
    justify-content: center;
    flex-shrink: 0;
    border-radius: 11px;
    background: #e8f8f6;
    color: #0f9488;
  }

  .medicine-panel h2 {
    margin: 0;
    color: #172033;
    font-size: 18px;
  }

  .medicine-panel-header p {
    margin: 4px 0 0;
    color: #7b8495;
    font-size: 12px;
  }

  .medicine-form-grid {
    display: grid;
    grid-template-columns: repeat(3, minmax(0, 1fr));
    gap: 14px;
  }

  .medicine-field {
    margin-bottom: 14px;
  }

  .medicine-field label {
    display: block;
    margin-bottom: 7px;
    color: #475467;
    font-size: 12px;
    font-weight: 650;
  }

  .medicine-input-wrap {
    display: flex;
    align-items: center;
    gap: 8px;
    padding: 0 11px;
    border: 1px solid #dce2e9;
    border-radius: 9px;
    background: #fff;
    color: #98a2b3;
  }

  .medicine-input-wrap:focus-within {
    border-color: #14b8a6;
    box-shadow: 0 0 0 3px rgba(20, 184, 166, .1);
  }

  .medicine-input-wrap input {
    width: 100%;
    min-width: 0;
    border: 0;
    outline: 0;
    padding: 11px 0;
    background: transparent;
    color: #172033;
    font-size: 13px;
  }

  .medicine-input-wrap input::placeholder,
  .medicine-field textarea::placeholder {
    color: #98a2b3;
  }

  .medicine-field textarea {
    width: 100%;
    box-sizing: border-box;
    resize: vertical;
    border: 1px solid #dce2e9;
    border-radius: 9px;
    outline: 0;
    padding: 11px 12px;
    color: #172033;
    font-family: inherit;
    font-size: 13px;
  }

  .medicine-field textarea:focus {
    border-color: #14b8a6;
    box-shadow: 0 0 0 3px rgba(20, 184, 166, .1);
  }

  .medicine-form-actions {
    display: flex;
    justify-content: flex-end;
  }

  .database-header {
    display: flex;
    align-items: center;
    justify-content: space-between;
    gap: 15px;
  }

  .medicine-search {
    width: min(300px, 100%);
    display: flex;
    align-items: center;
    gap: 8px;
    padding: 0 11px;
    border: 1px solid #dce2e9;
    border-radius: 9px;
    color: #98a2b3;
  }

  .medicine-search input {
    width: 100%;
    min-width: 0;
    border: 0;
    outline: 0;
    padding: 10px 0;
    color: #172033;
    font-size: 13px;
  }

  .medicine-table-wrap {
    width: 100%;
    overflow-x: auto;
  }

  .medicine-table {
    width: 100%;
    border-collapse: collapse;
    min-width: 700px;
  }

  .medicine-table th {
    padding: 11px 12px;
    border-bottom: 1px solid #e7ebf0;
    background: #f8fafc;
    color: #667085;
    text-align: left;
    font-size: 11px;
    font-weight: 700;
    text-transform: uppercase;
    letter-spacing: .03em;
  }

  .medicine-table td {
    padding: 13px 12px;
    border-bottom: 1px solid #edf0f3;
    color: #475467;
    font-size: 13px;
    vertical-align: middle;
  }

  .medicine-table tbody tr:hover {
    background: #fbfdfd;
  }

  .medicine-name-cell {
    display: flex;
    align-items: center;
    gap: 10px;
  }

  .medicine-row-icon {
    width: 35px;
    height: 35px;
    min-width: 35px;
    display: flex;
    align-items: center;
    justify-content: center;
    border-radius: 9px;
    background: #eef8f7;
    color: #0f9488;
  }

  .medicine-name-cell strong {
    display: block;
    color: #172033;
    font-size: 13px;
  }

  .medicine-name-cell span {
    display: block;
    margin-top: 3px;
    color: #98a2b3;
    font-size: 10px;
  }

  .description-cell {
    display: block;
    max-width: 350px;
    line-height: 1.5;
  }

  .medicine-loading {
    min-height: 220px;
    display: flex;
    align-items: center;
    justify-content: center;
    flex-direction: column;
    color: #7b8495;
  }

  .medicine-loading p {
    margin: 10px 0 0;
    font-size: 13px;
  }

  .medicine-spinner {
    width: 28px;
    height: 28px;
    border: 3px solid #d8eeeb;
    border-top-color: #14b8a6;
    border-radius: 50%;
    animation: medicine-spin .7s linear infinite;
  }

  @keyframes medicine-spin {
    to {
      transform: rotate(360deg);
    }
  }

  .medicine-empty {
    min-height: 220px;
    display: flex;
    align-items: center;
    justify-content: center;
    flex-direction: column;
    text-align: center;
    color: #98a2b3;
  }

  .medicine-empty h3 {
    margin: 10px 0 5px;
    color: #344054;
    font-size: 15px;
  }

  .medicine-empty p {
    margin: 0;
    font-size: 12px;
  }

  @media (max-width: 900px) {
    .medicine-form-grid {
      grid-template-columns: 1fr;
    }

    .database-header {
      align-items: flex-start;
      flex-direction: column;
    }

    .medicine-search {
      width: 100%;
    }
  }

  @media (max-width: 650px) {
    .admin-medicine-page {
      padding: 18px;
    }

    .medicine-header {
      align-items: flex-start;
      flex-direction: column;
    }

    .medicine-header h1 {
      font-size: 25px;
    }

    .medicine-refresh-btn {
      width: 100%;
    }
  }
`;

export default AdminMedicineDatabase;