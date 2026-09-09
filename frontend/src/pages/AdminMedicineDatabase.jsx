import { useEffect, useState } from "react";

import DashboardLayout from "../components/DashboardLayout";
import Field from "../components/Field";
import { fetchMedicines, addMedicine } from "../services/api";
import { ADMIN_MENU } from "../utils/menus";

const AdminMedicineDatabase = () => {
  const [medicines, setMedicines] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  const [name, setName] = useState("");
  const [brand, setBrand] = useState("");
  const [defaultDosage, setDefaultDosage] = useState("");
  const [description, setDescription] = useState("");

  const menu = ADMIN_MENU;

  const load = () => {
    fetchMedicines()
      .then(setMedicines)
      .catch((e) => setError(e.message))
      .finally(() => setLoading(false));
  };

  useEffect(load, []);

  const handleAdd = async () => {
    setError("");
    if (!name.trim()) {
      setError("Medicine name is required.");
      return;
    }

    try {
      await addMedicine({
        name,
        brand: brand || null,
        default_dosage: defaultDosage || null,
        description: description || null,
      });
      setName("");
      setBrand("");
      setDefaultDosage("");
      setDescription("");
      load();
    } catch (e) {
      setError(e.message);
    }
  };

  return (
    <DashboardLayout
      role="Administrator"
      title="Medicine Database"
      subtitle={`${medicines.length} medicines in the system.`}
      menu={menu}
    >
      {error && <p className="error-message">{error}</p>}

      <section className="panel">
        <div className="panel__head">
          <h2 className="panel__title">Add medicine</h2>
        </div>
        <div className="form-row">
          <Field
            label="Name"
            name="name"
            placeholder="e.g. Metformin"
            value={name}
            onChange={(e) => setName(e.target.value)}
            required
          />
          <Field
            label="Brand"
            name="brand"
            placeholder="e.g. Glucophage"
            value={brand}
            onChange={(e) => setBrand(e.target.value)}
          />
          <Field
            label="Default dosage"
            name="dosage"
            placeholder="e.g. 500 mg"
            value={defaultDosage}
            onChange={(e) => setDefaultDosage(e.target.value)}
          />
        </div>
        <Field
          label="Description"
          name="description"
          placeholder="Short description"
          value={description}
          onChange={(e) => setDescription(e.target.value)}
        />
        <button className="action-btn" onClick={handleAdd}>
          Add medicine
        </button>
      </section>

      <section className="table-wrap">
        <table className="table">
          <thead>
            <tr>
              <th>Name</th>
              <th>Brand</th>
              <th>Default dosage</th>
              <th>Description</th>
            </tr>
          </thead>
          <tbody>
            {loading ? (
              <tr>
                <td colSpan="4" className="empty">
                  Loading…
                </td>
              </tr>
            ) : (
              medicines.map((m) => (
                <tr key={m.id}>
                  <td className="table__name">{m.name}</td>
                  <td>{m.brand || "—"}</td>
                  <td>{m.default_dosage || "—"}</td>
                  <td>{m.description || "—"}</td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </section>
    </DashboardLayout>
  );
};

export default AdminMedicineDatabase;