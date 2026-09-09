import { useEffect, useState } from "react";

import DashboardLayout from "../components/DashboardLayout";
import { fetchPatientsWithMedications } from "../services/api";
import { ADMIN_MENU } from "../utils/menus";

const AdminPatients = () => {
  const [patients, setPatients] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  const menu = ADMIN_MENU;

  useEffect(() => {
    fetchPatientsWithMedications()
      .then(setPatients)
      .catch((e) => setError(e.message))
      .finally(() => setLoading(false));
  }, []);

  return (
    <DashboardLayout
      role="Administrator"
      title="Patients"
      subtitle={`${patients.length} registered patients.`}
      menu={menu}
    >
      {error && <p className="error-message">{error}</p>}

      {loading ? (
        <p className="empty">Loading patients…</p>
      ) : (
        <section className="table-wrap">
          <table className="table">
            <thead>
              <tr>
                <th>Name</th>
                <th>Email</th>
                <th>Phone</th>
                <th>Gender</th>
                <th>Blood group</th>
                <th>Medicines</th>
              </tr>
            </thead>
            <tbody>
              {patients.length === 0 && (
                <tr>
                  <td colSpan="6" className="empty">
                    No patients registered.
                  </td>
                </tr>
              )}
              {patients.map((p) => (
                <tr key={p.user_id}>
                  <td className="table__name">{p.full_name}</td>
                  <td>{p.email}</td>
                  <td>{p.phone || "—"}</td>
                  <td>{p.gender || "—"}</td>
                  <td>{p.blood_group || "—"}</td>
                  <td>{p.medications ? p.medications.length : 0}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </section>
      )}
    </DashboardLayout>
  );
};

export default AdminPatients;