import React, { useEffect, useMemo, useState } from "react";
import {
  Pill,
  Clock,
  Eye,
  Edit3,
  Trash2,
  ChevronUp,
  ChevronDown,
  Search,
  Filter,
  Grid3X3,
  List,
  Plus,
  X,
  RefreshCw,
  AlertTriangle,
  Stethoscope,
  Package,
} from "lucide-react";

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

const getStockPercent = (remaining, total) => {
  if (!total || total <= 0) return 0;

  return Math.min(
    100,
    Math.max(0, (remaining / total) * 100)
  );
};

const getStatus = (medicine) => {
  const remaining = Number(medicine.remaining_stock || 0);
  const total = Number(medicine.total_stock || 0);

  if (remaining <= 0) return "Out of stock";
  if (total > 0 && remaining <= total * 0.2) {
    return "Low stock";
  }

  return "Active";
};

const getStatusClass = (status) => {
  if (status === "Out of stock") return "vin-status-red";
  if (status === "Low stock") return "vin-status-amber";
  return "vin-status-green";
};

const Medicines = () => {
  const [medicines, setMedicines] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  const [search, setSearch] = useState("");
  const [showFilters, setShowFilters] = useState(false);
  const [layout, setLayout] = useState("grid");

  const [filters, setFilters] = useState({
    status: "",
    frequency: "",
    condition: "",
  });

  const [sort, setSort] = useState({
    key: "name",
    direction: "asc",
  });

  const [showForm, setShowForm] = useState(false);
  const [editingId, setEditingId] = useState(null);
  const [form, setForm] = useState(emptyForm);
  const [saving, setSaving] = useState(false);

  const [selectedMedicine, setSelectedMedicine] = useState(null);
  const [history, setHistory] = useState([]);
  const [historyLoading, setHistoryLoading] = useState(false);

  const [showRefill, setShowRefill] = useState(false);
  const [refillMedicine, setRefillMedicine] = useState(null);
  const [refillQuantity, setRefillQuantity] = useState("");
  const [refilling, setRefilling] = useState(false);

  const [deleteMedicine, setDeleteMedicine] = useState(null);
  const [deleting, setDeleting] = useState(false);

  useEffect(() => {
    loadMedicines();
  }, []);

  const loadMedicines = async () => {
    try {
      setLoading(true);
      setError("");

      const response =
        await medicationService.getActiveMedicines();

      setMedicines(
        Array.isArray(response.data)
          ? response.data
          : []
      );
    } catch (err) {
      console.error("Failed to load medicines:", err);
      setError("Unable to load medicines.");
    } finally {
      setLoading(false);
    }
  };

  const filteredMedicines = useMemo(() => {
    let rows = [...medicines];

    if (search.trim()) {
      const query = search.toLowerCase();

      rows = rows.filter((medicine) =>
        [
          medicine.name,
          medicine.dosage,
          medicine.frequency,
          medicine.condition,
        ]
          .filter(Boolean)
          .some((value) =>
            String(value)
              .toLowerCase()
              .includes(query)
          )
      );
    }

    if (filters.status) {
      rows = rows.filter(
        (medicine) =>
          getStatus(medicine) === filters.status
      );
    }

    if (filters.frequency) {
      rows = rows.filter(
        (medicine) =>
          medicine.frequency === filters.frequency
      );
    }

    if (filters.condition) {
      rows = rows.filter(
        (medicine) =>
          medicine.condition === filters.condition
      );
    }

    rows.sort((a, b) => {
      let first = a[sort.key];
      let second = b[sort.key];

      if (sort.key === "remaining_stock") {
        first = Number(first || 0);
        second = Number(second || 0);
      }

      first = String(first || "").toLowerCase();
      second = String(second || "").toLowerCase();

      if (first < second) {
        return sort.direction === "asc" ? -1 : 1;
      }

      if (first > second) {
        return sort.direction === "asc" ? 1 : -1;
      }

      return 0;
    });

    return rows;
  }, [medicines, search, filters, sort]);

  const frequencyOptions = useMemo(() => {
    return [
      ...new Set(
        medicines
          .map((medicine) => medicine.frequency)
          .filter(Boolean)
      ),
    ];
  }, [medicines]);

  const conditionOptions = useMemo(() => {
    return [
      ...new Set(
        medicines
          .map((medicine) => medicine.condition)
          .filter(Boolean)
      ),
    ];
  }, [medicines]);

  const updateSort = (key) => {
    setSort((previous) => ({
      key,
      direction:
        previous.key === key &&
        previous.direction === "asc"
          ? "desc"
          : "asc",
    }));
  };

  const openAdd = () => {
    setForm(emptyForm);
    setEditingId(null);
    setError("");
    setShowForm(true);
  };

  const openEdit = (medicine) => {
    setForm({
      name: medicine.name || "",
      dosage: medicine.dosage || "",
      frequency: medicine.frequency || "",
      doses_per_day: medicine.doses_per_day || 1,
      total_stock: medicine.total_stock || 0,
      remaining_stock:
        medicine.remaining_stock || 0,
      condition: medicine.condition || "",
    });

    setEditingId(medicine.id);
    setError("");
    setShowForm(true);
  };

  const handleChange = (event) => {
    const { name, value } = event.target;

    setForm((previous) => ({
      ...previous,
      [name]: value,
    }));
  };

  const handleSubmit = async (event) => {
    event.preventDefault();

    if (!form.name.trim()) {
      setError("Medicine name is required.");
      return;
    }

    setSaving(true);
    setError("");

    try {
      const payload = {
        name: form.name.trim(),
        dosage: form.dosage.trim(),
        frequency: form.frequency.trim(),
        doses_per_day: Number(form.doses_per_day),
        total_stock: Number(form.total_stock),
        remaining_stock: Number(
          form.remaining_stock
        ),
        condition: form.condition.trim(),
      };

      if (editingId) {
        await medicationService.updateMedicine(
          editingId,
          payload
        );
      } else {
        await medicationService.createMedicine(
          payload
        );
      }

      setShowForm(false);
      setEditingId(null);
      setForm(emptyForm);

      await loadMedicines();
    } catch (err) {
      console.error("Save failed:", err);

      setError(
        err.response?.data?.detail ||
          "Could not save medicine."
      );
    } finally {
      setSaving(false);
    }
  };

  const confirmDelete = async () => {
    if (!deleteMedicine) return;

    try {
      setDeleting(true);

      await medicationService.deleteMedicine(
        deleteMedicine.id
      );

      setMedicines((previous) =>
        previous.filter(
          (medicine) =>
            medicine.id !== deleteMedicine.id
        )
      );

      if (
        selectedMedicine?.id ===
        deleteMedicine.id
      ) {
        setSelectedMedicine(null);
      }

      setDeleteMedicine(null);
    } catch (err) {
      console.error("Delete failed:", err);

      setError(
        err.response?.data?.detail ||
          "Could not delete medicine."
      );
    } finally {
      setDeleting(false);
    }
  };

  const openDetails = async (medicine) => {
    setSelectedMedicine(medicine);
    setHistory([]);
    setHistoryLoading(true);

    try {
      const response =
        await medicationService.getMedicineHistory(
          medicine.id
        );

      setHistory(
        Array.isArray(response.data)
          ? response.data
          : []
      );
    } catch (err) {
      console.error(
        "Failed to load medicine history:",
        err
      );
    } finally {
      setHistoryLoading(false);
    }
  };

  const openRefill = (medicine) => {
    setRefillMedicine(medicine);
    setRefillQuantity("");
    setError("");
    setShowRefill(true);
  };

  const handleRefill = async (event) => {
    event.preventDefault();

    const quantity = Number(refillQuantity);

    if (!quantity || quantity <= 0) {
      setError(
        "Please enter a valid refill quantity."
      );
      return;
    }

    try {
      setRefilling(true);
      setError("");

      const response =
        await medicationService.refillMedicine(
          refillMedicine.id,
          quantity
        );

      const updated =
        response.data.medicine;

      setMedicines((previous) =>
        previous.map((medicine) =>
          medicine.id === updated.id
            ? {
                ...medicine,
                total_stock:
                  updated.total_stock,
                remaining_stock:
                  updated.remaining_stock,
              }
            : medicine
        )
      );

      setSelectedMedicine((previous) =>
        previous?.id === updated.id
          ? {
              ...previous,
              total_stock:
                updated.total_stock,
              remaining_stock:
                updated.remaining_stock,
            }
          : previous
      );

      setShowRefill(false);
      setRefillMedicine(null);
      setRefillQuantity("");
    } catch (err) {
      console.error("Refill failed:", err);

      setError(
        err.response?.data?.detail ||
          "Could not refill medicine."
      );
    } finally {
      setRefilling(false);
    }
  };

  const clearFilters = () => {
    setFilters({
      status: "",
      frequency: "",
      condition: "",
    });
  };

  if (loading) {
    return (
      <div className="dashboard-loading">
        <div className="spinner" />
        <p>Loading medicines...</p>
      </div>
    );
  }

  return (
    <div className="vin-medicine-page">
      {/* HEADER */}
      <div className="vin-medicine-header">
        <div>
          <h1>Medicine Management</h1>
          <p>
            {filteredMedicines.length} medicines found
          </p>
        </div>

        <button
          className="vin-primary-btn"
          onClick={openAdd}
        >
          <Plus size={17} />
          Add medicine
        </button>
      </div>

      {error && (
        <div className="vin-error">
          {error}
        </div>
      )}

      {/* SEARCH / FILTER / VIEW */}
      <div className="vin-toolbar">
        <div className="vin-search">
          <Search size={16} />
          <input
            value={search}
            onChange={(event) =>
              setSearch(event.target.value)
            }
            placeholder="Search by medicine name..."
          />
        </div>

        <button
          className={`vin-secondary-btn ${
            showFilters ? "vin-active-control" : ""
          }`}
          onClick={() =>
            setShowFilters((previous) => !previous)
          }
        >
          <Filter size={16} />
          Filters
        </button>

        <div className="vin-view-toggle">
          <button
            className={
              layout === "grid"
                ? "vin-view-active"
                : ""
            }
            onClick={() => setLayout("grid")}
          >
            <Grid3X3 size={16} />
          </button>

          <button
            className={
              layout === "table"
                ? "vin-view-active"
                : ""
            }
            onClick={() => setLayout("table")}
          >
            <List size={16} />
          </button>
        </div>
      </div>

      {/* FILTERS */}
      {showFilters && (
        <div className="vin-filter-panel">
          <div className="vin-filter-header">
            <strong>Advanced filters</strong>

            <button
              onClick={() => setShowFilters(false)}
              className="vin-icon-button"
            >
              <X size={16} />
            </button>
          </div>

          <div className="vin-filter-grid">
            <div>
              <label>Status</label>

              <select
                value={filters.status}
                onChange={(event) =>
                  setFilters((previous) => ({
                    ...previous,
                    status:
                      event.target.value,
                  }))
                }
              >
                <option value="">
                  All statuses
                </option>
                <option value="Active">
                  Active
                </option>
                <option value="Low stock">
                  Low stock
                </option>
                <option value="Out of stock">
                  Out of stock
                </option>
              </select>
            </div>

            <div>
              <label>Frequency</label>

              <select
                value={filters.frequency}
                onChange={(event) =>
                  setFilters((previous) => ({
                    ...previous,
                    frequency:
                      event.target.value,
                  }))
                }
              >
                <option value="">
                  All frequencies
                </option>

                {frequencyOptions.map(
                  (frequency) => (
                    <option
                      key={frequency}
                      value={frequency}
                    >
                      {frequency}
                    </option>
                  )
                )}
              </select>
            </div>

            <div>
              <label>Condition</label>

              <select
                value={filters.condition}
                onChange={(event) =>
                  setFilters((previous) => ({
                    ...previous,
                    condition:
                      event.target.value,
                  }))
                }
              >
                <option value="">
                  All conditions
                </option>

                {conditionOptions.map(
                  (condition) => (
                    <option
                      key={condition}
                      value={condition}
                    >
                      {condition}
                    </option>
                  )
                )}
              </select>
            </div>
          </div>

          <button
            className="vin-clear-filters"
            onClick={clearFilters}
          >
            Clear all filters
          </button>
        </div>
      )}

      {/* EMPTY STATE */}
      {filteredMedicines.length === 0 && (
        <div className="vin-empty-card">
          <div className="vin-empty-icon">
            <Package size={26} />
          </div>

          <h3>No medicines found</h3>

          <p>
            Try adjusting your search or filters,
            or add a new medicine.
          </p>

          <button
            className="vin-primary-btn"
            onClick={openAdd}
          >
            <Plus size={17} />
            Add medicine
          </button>
        </div>
      )}

      {/* GRID */}
      {layout === "grid" &&
        filteredMedicines.length > 0 && (
          <div className="vin-medicine-grid">
            {filteredMedicines.map((medicine) => {
              const percentage =
                getStockPercent(
                  medicine.remaining_stock,
                  medicine.total_stock
                );

              const status =
                getStatus(medicine);

              return (
                <div
                  key={medicine.id}
                  className="vin-medicine-card"
                >
                  <div className="vin-card-top">
                    <div className="vin-pill-icon">
                      <Pill size={20} />
                    </div>

                    <div className="vin-card-title">
                      <h3>{medicine.name}</h3>
                      <p>
                        {medicine.condition ||
                          "General medication"}
                      </p>
                    </div>

                    <span
                      className={`vin-status ${getStatusClass(
                        status
                      )}`}
                    >
                      {status}
                    </span>
                  </div>

                  <div className="vin-card-meta">
                    <span className="vin-category">
                      {medicine.condition ||
                        "Medication"}
                    </span>

                    <span>
                      {medicine.dosage}
                    </span>

                    <span>â€¢</span>

                    <span>
                      {medicine.frequency}
                    </span>
                  </div>

                  <div className="vin-stock-section">
                    <div className="vin-stock-label">
                      <span>
                        {medicine.remaining_stock} of{" "}
                        {medicine.total_stock} left
                      </span>

                      <span>
                        {Math.round(percentage)}%
                      </span>
                    </div>

                    <div className="vin-progress">
                      <div
                        className={`vin-progress-fill ${
                          percentage <= 20
                            ? "vin-progress-red"
                            : percentage <= 50
                            ? "vin-progress-amber"
                            : "vin-progress-green"
                        }`}
                        style={{
                          width: `${percentage}%`,
                        }}
                      />
                    </div>
                  </div>

                  <div className="vin-card-footer">
                    <span className="vin-reminder">
                      <Clock size={13} />
                      {medicine.doses_per_day || 1} dose
                      {medicine.doses_per_day === 1
                        ? ""
                        : "s"}
                      /day
                    </span>

                    <div className="vin-actions">
                      <button
                        title="View"
                        onClick={() =>
                          openDetails(medicine)
                        }
                      >
                        <Eye size={15} />
                      </button>

                      <button
                        title="Edit"
                        onClick={() =>
                          openEdit(medicine)
                        }
                      >
                        <Edit3 size={15} />
                      </button>

                      <button
                        title="Refill"
                        onClick={() =>
                          openRefill(medicine)
                        }
                      >
                        <RefreshCw size={15} />
                      </button>

                      <button
                        title="Delete"
                        className="vin-delete-action"
                        onClick={() =>
                          setDeleteMedicine(
                            medicine
                          )
                        }
                      >
                        <Trash2 size={15} />
                      </button>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        )}

      {/* TABLE */}
      {layout === "table" &&
        filteredMedicines.length > 0 && (
          <div className="vin-table-card">
            <div className="vin-table-scroll">
              <table className="vin-table">
                <thead>
                  <tr>
                    {[
                      ["name", "Medicine"],
                      [
                        "condition",
                        "Condition",
                      ],
                      [
                        "dosage",
                        "Dosage",
                      ],
                      [
                        "remaining_stock",
                        "Remaining",
                      ],
                      [
                        "frequency",
                        "Frequency",
                      ],
                    ].map(([key, label]) => (
                      <th
                        key={key}
                        onClick={() =>
                          updateSort(key)
                        }
                      >
                        <span>
                          {label}

                          {sort.key === key &&
                            (sort.direction ===
                            "asc" ? (
                              <ChevronUp
                                size={12}
                              />
                            ) : (
                              <ChevronDown
                                size={12}
                              />
                            ))}
                        </span>
                      </th>
                    ))}

                    <th>Status</th>
                    <th>Actions</th>
                  </tr>
                </thead>

                <tbody>
                  {filteredMedicines.map(
                    (medicine) => {
                      const percentage =
                        getStockPercent(
                          medicine.remaining_stock,
                          medicine.total_stock
                        );

                      const status =
                        getStatus(medicine);

                      return (
                        <tr
                          key={medicine.id}
                        >
                          <td>
                            <div className="vin-table-med">
                              <div className="vin-table-icon">
                                <Pill size={14} />
                              </div>

                              <div>
                                <strong>
                                  {medicine.name}
                                </strong>

                                <small>
                                  {medicine.condition ||
                                    "General medication"}
                                </small>
                              </div>
                            </div>
                          </td>

                          <td>
                            {medicine.condition ||
                              "â€”"}
                          </td>

                          <td>
                            {medicine.dosage}
                          </td>

                          <td>
                            <div className="vin-table-stock">
                              <span>
                                {
                                  medicine.remaining_stock
                                }
                                /
                                {
                                  medicine.total_stock
                                }
                              </span>

                              <div className="vin-mini-progress">
                                <div
                                  className="vin-progress-fill vin-progress-green"
                                  style={{
                                    width: `${percentage}%`,
                                  }}
                                />
                              </div>
                            </div>
                          </td>

                          <td>
                            {medicine.frequency}
                          </td>

                          <td>
                            <span
                              className={`vin-status ${getStatusClass(
                                status
                              )}`}
                            >
                              {status}
                            </span>
                          </td>

                          <td>
                            <div className="vin-table-actions">
                              <button
                                onClick={() =>
                                  openDetails(
                                    medicine
                                  )
                                }
                              >
                                <Eye size={15} />
                              </button>

                              <button
                                onClick={() =>
                                  openEdit(
                                    medicine
                                  )
                                }
                              >
                                <Edit3 size={15} />
                              </button>

                              <button
                                onClick={() =>
                                  setDeleteMedicine(
                                    medicine
                                  )
                                }
                              >
                                <Trash2
                                  size={15}
                                />
                              </button>
                            </div>
                          </td>
                        </tr>
                      );
                    }
                  )}
                </tbody>
              </table>
            </div>
          </div>
        )}

      {/* ADD / EDIT MODAL */}
      {showForm && (
        <div
          className="vin-modal-overlay"
          onClick={() =>
            !saving && setShowForm(false)
          }
        >
          <div
            className="vin-modal"
            onClick={(event) =>
              event.stopPropagation()
            }
          >
            <div className="vin-modal-header">
              <div>
                <h2>
                  {editingId
                    ? "Edit medicine"
                    : "Add medicine"}
                </h2>

                <p>
                  Enter your medicine information.
                </p>
              </div>

              <button
                className="vin-icon-button"
                onClick={() =>
                  !saving &&
                  setShowForm(false)
                }
              >
                <X size={18} />
              </button>
            </div>

            <form onSubmit={handleSubmit}>
              <div className="vin-form-grid">
                <label>
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
                    placeholder="e.g. Once daily"
                    required
                  />
                </label>

                <label>
                  Doses per day
                  <input
                    type="number"
                    name="doses_per_day"
                    min="1"
                    value={
                      form.doses_per_day
                    }
                    onChange={handleChange}
                    required
                  />
                </label>

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
                    value={
                      form.remaining_stock
                    }
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

              <div className="vin-modal-actions">
                <button
                  type="button"
                  className="vin-secondary-btn"
                  onClick={() =>
                    setShowForm(false)
                  }
                  disabled={saving}
                >
                  Cancel
                </button>

                <button
                  type="submit"
                  className="vin-primary-btn"
                  disabled={saving}
                >
                  {saving
                    ? "Saving..."
                    : editingId
                    ? "Save changes"
                    : "Save medicine"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* DETAILS MODAL */}
      {selectedMedicine && (
        <div
          className="vin-modal-overlay"
          onClick={() =>
            setSelectedMedicine(null)
          }
        >
          <div
            className="vin-detail-modal"
            onClick={(event) =>
              event.stopPropagation()
            }
          >
            <div className="vin-detail-header">
              <div className="vin-detail-title">
                <div className="vin-detail-pill">
                  <Pill size={25} />
                </div>

                <div>
                  <h2>
                    {selectedMedicine.name}
                  </h2>

                  <p>
                    {selectedMedicine.dosage} â€¢{" "}
                    {selectedMedicine.frequency}
                  </p>
                </div>
              </div>

              <button
                className="vin-icon-button"
                onClick={() =>
                  setSelectedMedicine(null)
                }
              >
                <X size={18} />
              </button>
            </div>

            <div className="vin-detail-grid">
              <div className="vin-detail-card">
                <div className="vin-detail-card-icon">
                  <Package size={18} />
                </div>

                <div>
                  <small>Remaining stock</small>
                  <strong>
                    {
                      selectedMedicine.remaining_stock
                    }{" "}
                    /{" "}
                    {
                      selectedMedicine.total_stock
                    }
                  </strong>
                </div>
              </div>

              <div className="vin-detail-card">
                <div className="vin-detail-card-icon">
                  <Clock size={18} />
                </div>

                <div>
                  <small>Doses per day</small>
                  <strong>
                    {selectedMedicine.doses_per_day ||
                      1}
                  </strong>
                </div>
              </div>

              <div className="vin-detail-card">
                <div className="vin-detail-card-icon">
                  <Stethoscope size={18} />
                </div>

                <div>
                  <small>Condition</small>
                  <strong>
                    {selectedMedicine.condition ||
                      "Not specified"}
                  </strong>
                </div>
              </div>
            </div>

            <div className="vin-history">
              <div className="vin-section-header">
                <div>
                  <h3>Medicine history</h3>
                  <p>
                    Recorded dose activity for this
                    medicine.
                  </p>
                </div>
              </div>

              {historyLoading ? (
                <p className="vin-muted">
                  Loading history...
                </p>
              ) : history.length === 0 ? (
                <div className="vin-history-empty">
                  No dose history yet.
                </div>
              ) : (
                <div className="vin-history-list">
                  {history.map((item) => (
                    <div
                      key={item.id}
                      className="vin-history-item"
                    >
                      <div>
                        <strong>
                          {item.date}
                        </strong>

                        <span>
                          {item.time}
                        </span>
                      </div>

                      <span
                        className={`vin-history-status ${
                          item.status ===
                          "taken"
                            ? "vin-history-taken"
                            : item.status ===
                              "missed"
                            ? "vin-history-missed"
                            : "vin-history-pending"
                        }`}
                      >
                        {item.status}
                      </span>
                    </div>
                  ))}
                </div>
              )}
            </div>

            <div className="vin-modal-actions">
              <button
                className="vin-secondary-btn"
                onClick={() =>
                  setSelectedMedicine(null)
                }
              >
                Close
              </button>

              <button
                className="vin-primary-btn"
                onClick={() => {
                  setSelectedMedicine(null);
                  openRefill(
                    selectedMedicine
                  );
                }}
              >
                <RefreshCw size={16} />
                Refill
              </button>
            </div>
          </div>
        </div>
      )}

      {/* REFILL MODAL */}
      {showRefill && refillMedicine && (
        <div
          className="vin-modal-overlay"
          onClick={() =>
            !refilling && setShowRefill(false)
          }
        >
          <div
            className="vin-modal vin-small-modal"
            onClick={(event) =>
              event.stopPropagation()
            }
          >
            <div className="vin-modal-header">
              <div>
                <h2>Refill medicine</h2>
                <p>
                  Add stock for{" "}
                  <strong>
                    {refillMedicine.name}
                  </strong>
                  .
                </p>
              </div>

              <button
                className="vin-icon-button"
                onClick={() =>
                  !refilling &&
                  setShowRefill(false)
                }
              >
                <X size={18} />
              </button>
            </div>

            <form onSubmit={handleRefill}>
              <label>
                Refill quantity
                <input
                  type="number"
                  min="1"
                  value={refillQuantity}
                  onChange={(event) =>
                    setRefillQuantity(
                      event.target.value
                    )
                  }
                  placeholder="Enter quantity"
                  required
                  autoFocus
                />
              </label>

              <div className="vin-refill-summary">
                Current stock:{" "}
                <strong>
                  {
                    refillMedicine.remaining_stock
                  }
                </strong>
              </div>

              <div className="vin-modal-actions">
                <button
                  type="button"
                  className="vin-secondary-btn"
                  onClick={() =>
                    setShowRefill(false)
                  }
                  disabled={refilling}
                >
                  Cancel
                </button>

                <button
                  type="submit"
                  className="vin-primary-btn"
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

      {/* DELETE CONFIRMATION */}
      {deleteMedicine && (
        <div className="vin-modal-overlay">
          <div className="vin-modal vin-small-modal">
            <div className="vin-delete-icon">
              <AlertTriangle size={22} />
            </div>

            <h2>
              Delete {deleteMedicine.name}?
            </h2>

            <p className="vin-delete-text">
              This action will remove this medicine
              from your medicine list.
            </p>

            <div className="vin-modal-actions">
              <button
                className="vin-secondary-btn"
                onClick={() =>
                  setDeleteMedicine(null)
                }
                disabled={deleting}
              >
                Cancel
              </button>

              <button
                className="vin-danger-btn"
                onClick={confirmDelete}
                disabled={deleting}
              >
                {deleting
                  ? "Deleting..."
                  : "Delete"}
              </button>
            </div>
          </div>
        </div>
      )}

      <style>{`
        .vin-medicine-page {
          width: 100%;
          max-width: 1180px;
          margin: 0 auto;
          padding: 4px 2px 40px;
          color: #334155;
        }

        .vin-medicine-header {
          display: flex;
          align-items: center;
          justify-content: space-between;
          gap: 20px;
          margin-bottom: 22px;
        }

        .vin-medicine-header h1 {
          margin: 0;
          font-size: 28px;
          font-weight: 700;
          color: #1e293b;
        }

        .vin-medicine-header p {
          margin: 5px 0 0;
          color: #94a3b8;
          font-size: 14px;
        }

        .vin-primary-btn,
        .vin-secondary-btn,
        .vin-danger-btn {
          border: none;
          min-height: 42px;
          padding: 0 16px;
          border-radius: 12px;
          display: inline-flex;
          align-items: center;
          justify-content: center;
          gap: 8px;
          font-weight: 600;
          cursor: pointer;
          transition: 0.2s ease;
        }

        .vin-primary-btn {
          color: white;
          background: linear-gradient(
            135deg,
            #2563eb,
            #3b82f6
          );
          box-shadow:
            0 8px 20px rgba(37, 99, 235, 0.18);
        }

        .vin-primary-btn:hover {
          transform: translateY(-1px);
        }

        .vin-secondary-btn {
          color: #64748b;
          background: white;
          border: 1px solid #e2e8f0;
        }

        .vin-secondary-btn:hover {
          border-color: #cbd5e1;
          color: #334155;
        }

        .vin-toolbar {
          display: flex;
          align-items: center;
          gap: 10px;
          margin-bottom: 16px;
        }

        .vin-search {
          flex: 1;
          min-height: 42px;
          display: flex;
          align-items: center;
          gap: 9px;
          padding: 0 14px;
          background: white;
          border: 1px solid #e2e8f0;
          border-radius: 14px;
        }

        .vin-search svg {
          color: #94a3b8;
          flex-shrink: 0;
        }

        .vin-search input {
          width: 100%;
          border: none;
          outline: none;
          background: transparent;
          color: #334155;
          font-size: 14px;
        }

        .vin-search input::placeholder {
          color: #94a3b8;
        }

        .vin-view-toggle {
          display: flex;
          align-items: center;
          gap: 3px;
          padding: 4px;
          border-radius: 13px;
          background: #f1f5f9;
        }

        .vin-view-toggle button {
          width: 38px;
          height: 34px;
          border: 0;
          border-radius: 10px;
          background: transparent;
          color: #94a3b8;
          display: flex;
          align-items: center;
          justify-content: center;
          cursor: pointer;
        }

        .vin-view-toggle button.vin-view-active {
          background: white;
          color: #2563eb;
          box-shadow: 0 2px 7px rgba(15, 23, 42, 0.08);
        }

        .vin-active-control {
          color: #2563eb;
          border-color: #93c5fd;
          background: #eff6ff;
        }

        .vin-filter-panel {
          padding: 20px;
          margin-bottom: 18px;
          background: white;
          border: 1px solid #e2e8f0;
          border-radius: 18px;
          box-shadow: 0 6px 18px rgba(15, 23, 42, 0.05);
        }

        .vin-filter-header {
          display: flex;
          align-items: center;
          justify-content: space-between;
          margin-bottom: 16px;
          color: #334155;
          font-size: 14px;
        }

        .vin-icon-button {
          width: 36px;
          height: 36px;
          border: 1px solid #e2e8f0;
          background: white;
          color: #94a3b8;
          border-radius: 10px;
          cursor: pointer;
          display: inline-flex;
          align-items: center;
          justify-content: center;
        }

        .vin-filter-grid {
          display: grid;
          grid-template-columns: repeat(3, 1fr);
          gap: 15px;
        }

        .vin-filter-grid label,
        .vin-form-grid label,
        .vin-small-modal label {
          display: flex;
          flex-direction: column;
          gap: 7px;
          color: #64748b;
          font-size: 13px;
          font-weight: 600;
        }

        .vin-filter-grid select,
        .vin-form-grid input,
        .vin-small-modal input {
          width: 100%;
          box-sizing: border-box;
          min-height: 42px;
          padding: 0 12px;
          border-radius: 12px;
          border: 1px solid #e2e8f0;
          background: white;
          outline: none;
          color: #334155;
          font-size: 14px;
        }

        .vin-filter-grid select:focus,
        .vin-form-grid input:focus,
        .vin-small-modal input:focus {
          border-color: #93c5fd;
          box-shadow: 0 0 0 3px rgba(59, 130, 246, 0.08);
        }

        .vin-clear-filters {
          margin-top: 15px;
          padding: 0;
          background: none;
          border: 0;
          color: #94a3b8;
          font-size: 12px;
          font-weight: 700;
          cursor: pointer;
        }

        .vin-clear-filters:hover {
          color: #ef4444;
        }

        .vin-medicine-grid {
          display: grid;
          grid-template-columns: repeat(
            3,
            minmax(0, 1fr)
          );
          gap: 18px;
        }

        .vin-medicine-card {
          padding: 20px;
          background: white;
          border: 1px solid #e2e8f0;
          border-radius: 18px;
          box-shadow: 0 5px 17px rgba(15, 23, 42, 0.05);
        }

        .vin-card-top {
          display: flex;
          align-items: flex-start;
          gap: 11px;
        }

        .vin-pill-icon,
        .vin-detail-pill {
          width: 46px;
          height: 46px;
          min-width: 46px;
          display: flex;
          align-items: center;
          justify-content: center;
          border-radius: 14px;
          background: #eff6ff;
          color: #2563eb;
        }

        .vin-card-title {
          min-width: 0;
          flex: 1;
        }

        .vin-card-title h3 {
          margin: 0;
          font-size: 15px;
          color: #334155;
          font-weight: 700;
          white-space: nowrap;
          overflow: hidden;
          text-overflow: ellipsis;
        }

        .vin-card-title p {
          margin: 4px 0 0;
          color: #94a3b8;
          font-size: 12px;
          white-space: nowrap;
          overflow: hidden;
          text-overflow: ellipsis;
        }

        .vin-status {
          display: inline-flex;
          align-items: center;
          justify-content: center;
          padding: 5px 9px;
          border-radius: 999px;
          font-size: 10px;
          font-weight: 700;
          white-space: nowrap;
        }

        .vin-status-green {
          background: #ecfdf5;
          color: #059669;
        }

        .vin-status-amber {
          background: #fffbeb;
          color: #d97706;
        }

        .vin-status-red {
          background: #fef2f2;
          color: #dc2626;
        }

        .vin-card-meta {
          display: flex;
          align-items: center;
          flex-wrap: wrap;
          gap: 6px;
          margin: 15px 0;
          color: #64748b;
          font-size: 12px;
        }

        .vin-category {
          padding: 4px 8px;
          border-radius: 999px;
          background: #eff6ff;
          color: #2563eb;
          font-weight: 600;
        }

        .vin-stock-section {
          margin-bottom: 17px;
        }

        .vin-stock-label {
          display: flex;
          justify-content: space-between;
          margin-bottom: 6px;
          color: #94a3b8;
          font-size: 11px;
        }

        .vin-progress {
          height: 7px;
          overflow: hidden;
          border-radius: 999px;
          background: #f1f5f9;
        }

        .vin-progress-fill {
          height: 100%;
          border-radius: inherit;
        }

        .vin-progress-green {
          background: #10b981;
        }

        .vin-progress-amber {
          background: #f59e0b;
        }

        .vin-progress-red {
          background: #ef4444;
        }

        .vin-card-footer {
          display: flex;
          align-items: center;
          justify-content: space-between;
          gap: 10px;
        }

        .vin-reminder {
          display: inline-flex;
          align-items: center;
          gap: 5px;
          color: #94a3b8;
          font-size: 11px;
        }

        .vin-actions,
        .vin-table-actions {
          display: flex;
          align-items: center;
          gap: 5px;
        }

        .vin-actions button,
        .vin-table-actions button {
          width: 31px;
          height: 31px;
          display: inline-flex;
          align-items: center;
          justify-content: center;
          border-radius: 9px;
          border: 1px solid #e2e8f0;
          background: white;
          color: #64748b;
          cursor: pointer;
        }

        .vin-actions button:hover,
        .vin-table-actions button:hover {
          color: #2563eb;
          border-color: #bfdbfe;
          background: #eff6ff;
        }

        .vin-actions .vin-delete-action:hover {
          color: #dc2626;
          border-color: #fecaca;
          background: #fef2f2;
        }

        .vin-table-card {
          overflow: hidden;
          background: white;
          border: 1px solid #e2e8f0;
          border-radius: 18px;
          box-shadow: 0 5px 17px rgba(15, 23, 42, 0.05);
        }

        .vin-table-scroll {
          overflow-x: auto;
        }

        .vin-table {
          width: 100%;
          border-collapse: collapse;
          font-size: 13px;
        }

        .vin-table th {
          padding: 15px 16px;
          text-align: left;
          color: #94a3b8;
          font-size: 11px;
          font-weight: 600;
          border-bottom: 1px solid #f1f5f9;
          cursor: pointer;
          white-space: nowrap;
        }

        .vin-table th span {
          display: inline-flex;
          align-items: center;
          gap: 4px;
        }

        .vin-table td {
          padding: 14px 16px;
          color: #64748b;
          border-bottom: 1px solid #f8fafc;
          white-space: nowrap;
        }

        .vin-table tbody tr:hover {
          background: #f8fafc;
        }

        .vin-table-med {
          display: flex;
          align-items: center;
          gap: 10px;
        }

        .vin-table-icon {
          width: 32px;
          height: 32px;
          display: flex;
          align-items: center;
          justify-content: center;
          border-radius: 9px;
          background: #eff6ff;
          color: #2563eb;
        }

        .vin-table-med strong {
          display: block;
          color: #475569;
          font-weight: 600;
        }

        .vin-table-med small {
          display: block;
          margin-top: 2px;
          color: #94a3b8;
          font-size: 10px;
        }

        .vin-table-stock {
          display: flex;
          align-items: center;
          gap: 8px;
        }

        .vin-table-stock > span {
          width: 45px;
          font-size: 11px;
        }

        .vin-mini-progress {
          width: 65px;
          height: 5px;
          overflow: hidden;
          border-radius: 999px;
          background: #f1f5f9;
        }

        .vin-empty-card {
          min-height: 300px;
          padding: 40px;
          display: flex;
          flex-direction: column;
          align-items: center;
          justify-content: center;
          text-align: center;
          background: white;
          border: 1px solid #e2e8f0;
          border-radius: 18px;
        }

        .vin-empty-icon {
          width: 58px;
          height: 58px;
          display: flex;
          align-items: center;
          justify-content: center;
          margin-bottom: 14px;
          border-radius: 18px;
          background: #eff6ff;
          color: #2563eb;
        }

        .vin-empty-card h3 {
          margin: 0;
          color: #334155;
        }

        .vin-empty-card p {
          margin: 7px 0 18px;
          max-width: 420px;
          color: #94a3b8;
          font-size: 13px;
        }

        .vin-error {
          margin-bottom: 16px;
          padding: 12px 15px;
          border-radius: 12px;
          color: #dc2626;
          background: #fef2f2;
          border: 1px solid #fecaca;
          font-size: 13px;
        }

        .vin-modal-overlay {
          position: fixed;
          inset: 0;
          z-index: 1000;
          display: flex;
          align-items: center;
          justify-content: center;
          padding: 20px;
          background: rgba(15, 23, 42, 0.45);
        }

        .vin-modal,
        .vin-detail-modal {
          width: min(700px, 100%);
          max-height: 90vh;
          overflow-y: auto;
          background: white;
          border-radius: 20px;
          padding: 25px;
          box-shadow: 0 25px 70px rgba(15, 23, 42, 0.18);
        }

        .vin-detail-modal {
          width: min(760px, 100%);
        }

        .vin-small-modal {
          width: min(430px, 100%);
        }

        .vin-modal-header,
        .vin-detail-header {
          display: flex;
          justify-content: space-between;
          align-items: flex-start;
          gap: 15px;
          margin-bottom: 20px;
        }

        .vin-modal-header h2,
        .vin-detail-header h2 {
          margin: 0;
          color: #334155;
          font-size: 20px;
        }

        .vin-modal-header p {
          margin: 5px 0 0;
          color: #94a3b8;
          font-size: 13px;
        }

        .vin-form-grid {
          display: grid;
          grid-template-columns: repeat(2, 1fr);
          gap: 16px;
        }

        .vin-full-field {
          grid-column: span 2;
        }

        .vin-modal-actions {
          display: flex;
          justify-content: flex-end;
          gap: 10px;
          margin-top: 24px;
          padding-top: 18px;
          border-top: 1px solid #f1f5f9;
        }

        .vin-detail-title {
          display: flex;
          align-items: center;
          gap: 14px;
        }

        .vin-detail-header h2 {
          font-size: 22px;
        }

        .vin-detail-header p {
          margin: 5px 0 0;
          color: #94a3b8;
          font-size: 13px;
        }

        .vin-detail-grid {
          display: grid;
          grid-template-columns: repeat(3, 1fr);
          gap: 12px;
          margin-bottom: 24px;
        }

        .vin-detail-card {
          display: flex;
          align-items: center;
          gap: 10px;
          padding: 14px;
          border: 1px solid #e2e8f0;
          border-radius: 14px;
          background: #f8fafc;
        }

        .vin-detail-card-icon {
          width: 34px;
          height: 34px;
          display: flex;
          align-items: center;
          justify-content: center;
          border-radius: 10px;
          background: white;
          color: #2563eb;
        }

        .vin-detail-card small,
        .vin-detail-card strong {
          display: block;
        }

        .vin-detail-card small {
          color: #94a3b8;
          font-size: 10px;
        }

        .vin-detail-card strong {
          margin-top: 3px;
          color: #475569;
          font-size: 13px;
        }

        .vin-section-header h3 {
          margin: 0;
          color: #334155;
          font-size: 16px;
        }

        .vin-section-header p {
          margin: 5px 0 14px;
          color: #94a3b8;
          font-size: 12px;
        }

        .vin-history-list {
          border: 1px solid #e2e8f0;
          border-radius: 14px;
          overflow: hidden;
        }

        .vin-history-item {
          display: flex;
          align-items: center;
          justify-content: space-between;
          padding: 13px 15px;
          border-bottom: 1px solid #f1f5f9;
        }

        .vin-history-item:last-child {
          border-bottom: none;
        }

        .vin-history-item strong {
          color: #475569;
          font-size: 13px;
        }

        .vin-history-item span {
          margin-left: 10px;
          color: #94a3b8;
          font-size: 11px;
        }

        .vin-history-status {
          margin-left: 0 !important;
          padding: 5px 8px;
          border-radius: 999px;
          font-size: 10px !important;
          font-weight: 700;
        }

        .vin-history-taken {
          background: #ecfdf5;
          color: #059669 !important;
        }

        .vin-history-missed {
          background: #fef2f2;
          color: #dc2626 !important;
        }

        .vin-history-pending {
          background: #fffbeb;
          color: #d97706 !important;
        }

        .vin-history-empty {
          padding: 30px;
          text-align: center;
          color: #94a3b8;
          border: 1px solid #e2e8f0;
          border-radius: 14px;
          font-size: 13px;
        }

        .vin-muted {
          color: #94a3b8;
          font-size: 13px;
        }

        .vin-delete-icon {
          width: 48px;
          height: 48px;
          margin-bottom: 15px;
          display: flex;
          align-items: center;
          justify-content: center;
          border-radius: 14px;
          background: #fef2f2;
          color: #ef4444;
        }

        .vin-small-modal h2 {
          color: #334155;
        }

        .vin-delete-text {
          margin: 8px 0 20px;
          color: #94a3b8;
          font-size: 13px;
          line-height: 1.5;
        }

        .vin-danger-btn {
          color: white;
          background: #ef4444;
        }

        .vin-refill-summary {
          margin-top: 12px;
          padding: 11px 13px;
          border-radius: 11px;
          background: #f8fafc;
          color: #64748b;
          font-size: 12px;
        }

        @media (max-width: 1050px) {
          .vin-medicine-grid {
            grid-template-columns: repeat(2, 1fr);
          }

          .vin-filter-grid {
            grid-template-columns: 1fr;
          }
        }

        @media (max-width: 760px) {
          .vin-medicine-header,
          .vin-toolbar {
            align-items: stretch;
            flex-direction: column;
          }

          .vin-medicine-grid {
            grid-template-columns: 1fr;
          }

          .vin-form-grid,
          .vin-detail-grid {
            grid-template-columns: 1fr;
          }

          .vin-full-field {
            grid-column: span 1;
          }

          .vin-medicine-header .vin-primary-btn {
            width: 100%;
          }
        }
      `}</style>
    </div>
  );
};

export default Medicines;



