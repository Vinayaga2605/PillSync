import { useEffect, useState } from "react";

import DashboardLayout from "../components/DashboardLayout";
import StatCard from "../components/StatCard";
import Field from "../components/Field";
import ConfirmDialog from "../components/ConfirmDialog";
import Toast from "../components/Toast";
import Pagination from "../components/Pagination";
import {
  fetchAdminUsers,
  fetchAdminUserDetail,
  updateUserStatus,
  deleteAdminUser,
  updateAdminUser,
  createAdminUser,
  assignCaregiver,
  removeCaregiver,
} from "../services/api";
import { ADMIN_MENU } from "../utils/menus";

const roleBadge = (role) =>
  role === "admin"
    ? "badge--danger"
    : role === "caregiver"
      ? "badge--accent"
      : "badge--primary";

const statusBadge = (status) =>
  status === "Good"
    ? "badge--success"
    : status === "Warning"
      ? "badge--warning"
      : "badge--danger";

const AdminUserManagement = () => {
  const [users, setUsers] = useState([]);
  const [total, setTotal] = useState(0);
  const [page, setPage] = useState(1);
  const [pages, setPages] = useState(1);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  const [search, setSearch] = useState("");
  const [debounced, setDebounced] = useState("");
  const [roleFilter, setRoleFilter] = useState("");
  const [statusFilter, setStatusFilter] = useState("");
  const [genderFilter, setGenderFilter] = useState("");
  const [bloodFilter, setBloodFilter] = useState("");
  const [minAge, setMinAge] = useState("");
  const [maxAge, setMaxAge] = useState("");

  const [selected, setSelected] = useState(null);
  const [detail, setDetail] = useState(null);
  const [detailLoading, setDetailLoading] = useState(false);

  const [caregivers, setCaregivers] = useState([]);

  // modal state
  const [showEdit, setShowEdit] = useState(false);
  const [showAdd, setShowAdd] = useState(false);
  const [editData, setEditData] = useState({});
  const [addData, setAddData] = useState({});
  const [assignTarget, setAssignTarget] = useState(null);

  const [confirm, setConfirm] = useState(null);
  const [toast, setToast] = useState(null);

  const notify = (msg, type = "success") => {
    setToast({ message: msg, type });
    setTimeout(() => setToast(null), 3000);
  };

  useEffect(() => {
    const t = setTimeout(() => setDebounced(search), 400);
    return () => clearTimeout(t);
  }, [search]);

  const load = () => {
    const params = { page, page_size: 10 };
    if (debounced) params.search = debounced;
    if (roleFilter) params.role = roleFilter;
    if (statusFilter === "active") params.is_active = true;
    if (statusFilter === "inactive") params.is_active = false;
    if (genderFilter) params.gender = genderFilter;
    if (bloodFilter) params.blood_group = bloodFilter;
    if (minAge) params.min_age = minAge;
    if (maxAge) params.max_age = maxAge;

    fetchAdminUsers(params)
      .then((data) => {
        setUsers(data.users);
        setTotal(data.total);
        setPages(data.pages);
      })
      .catch((e) => setError(e.message))
      .finally(() => setLoading(false));
  };

  useEffect(load, [page, debounced, roleFilter, statusFilter, genderFilter, bloodFilter, minAge, maxAge]);

  // load caregivers for assignment dropdown
  useEffect(() => {
    fetchAdminUsers({ role: "caregiver", page_size: 100 })
      .then((d) => setCaregivers(d.users))
      .catch(() => {});
  }, []);

  const openUser = async (user) => {
    setSelected(user);
    setDetail(null);
    setDetailLoading(true);
    setError("");
    try {
      const d = await fetchAdminUserDetail(user.id);
      setDetail(d);
      if (user.role !== "patient") {
        setEditData({
          full_name: d.full_name,
          email: d.email,
          phone: d.phone || "",
          role: d.role,
        });
      }
    } catch (e) {
      setError(e.message);
    } finally {
      setDetailLoading(false);
    }
  };

  const toggleStatus = async (user) => {
    try {
      const r = await updateUserStatus(user.id, !user.is_active);
      notify(r.message);
      load();
      if (selected && selected.id === user.id) setSelected({ ...selected, is_active: !user.is_active });
    } catch (e) {
      notify(e.message, "error");
    }
  };

  const openEdit = (user) => {
    setSelected(user);
    setEditData({
      full_name: user.full_name,
      email: user.email,
      phone: user.phone || "",
      role: user.role,
    });
    setShowEdit(true);
  };

  const saveEdit = async () => {
    if (!editData.full_name?.trim()) {
      notify("Full name is required", "error");
      return;
    }
    try {
      await updateAdminUser(selected.id, editData);
      setShowEdit(false);
      notify("User updated successfully");
      load();
    } catch (e) {
      notify(e.message, "error");
    }
  };

  const addUser = (e) => {
    e.preventDefault();
    setShowAdd(true);
  };

  const saveAdd = async () => {
    if (!addData.full_name || !addData.email || !addData.password) {
      notify("All fields are required", "error");
      return;
    }
    if (addData.password.length < 8) {
      notify("Password must be at least 8 characters", "error");
      return;
    }
    try {
      const r = await createAdminUser({
        ...addData,
        phone: addData.phone || null,
        role: addData.role || "patient",
      });
      setShowAdd(false);
      setAddData({});
      notify(`Created ${r.full_name}`);
      load();
    } catch (e) {
      notify(e.message, "error");
    }
  };

  const requestDelete = (user) => {
    setConfirm({
      title: "Delete user",
      message: `Are you sure you want to delete ${user.full_name}? This cannot be undone.`,
      confirmText: "Delete",
      action: async () => {
        try {
          const r = await deleteAdminUser(user.id);
          setConfirm(null);
          notify(r.message);
          if (selected && selected.id === user.id) setSelected(null);
          load();
        } catch (e) {
          setConfirm(null);
          notify(e.message, "error");
        }
      },
    });
  };

  const openAssign = (patient) => {
    setAssignTarget(patient);
  };

  const doAssign = async () => {
    const caregiverId = document.getElementById("assign-caregiver").value;
    if (!caregiverId) {
      notify("Select a caregiver", "error");
      return;
    }
    try {
      const r = await assignCaregiver(assignTarget.id, Number(caregiverId));
      setAssignTarget(null);
      notify(r.message);
      if (selected?.id === assignTarget.id) openUser(selected);
      load();
    } catch (e) {
      notify(e.message, "error");
    }
  };

  const doRemoveCaregiver = async () => {
    try {
      const r = await removeCaregiver(selected.id);
      notify(r.message);
      openUser(selected);
      load();
    } catch (e) {
      notify(e.message, "error");
    }
  };

  const exportUsers = () => {
    const base = "http://localhost:8000/api/admin/users/export?fmt=csv";
    const params = new URLSearchParams();
    if (debounced) params.set("search", debounced);
    if (roleFilter) params.set("role", roleFilter);
    const query = params.toString();
    const path = `${base}${query ? `&${query}` : ""}`;
    const token = localStorage.getItem("pillsync_token");
    fetch(path, { headers: token ? { Authorization: `Bearer ${token}` } : {} })
      .then((res) => res.blob())
      .then((blob) => {
        const url = URL.createObjectURL(blob);
        const a = document.createElement("a");
        a.href = url;
        a.download = "pillsync_users.csv";
        a.click();
        URL.revokeObjectURL(url);
      })
      .catch((e) => notify(e.message, "error"));
  };

  const counts = {
    patient: users.filter((u) => u.role === "patient").length,
    caregiver: users.filter((u) => u.role === "caregiver").length,
    admin: users.filter((u) => u.role === "admin").length,
  };

  return (
    <DashboardLayout
      role="Administrator"
      title="User Management"
      subtitle={`${total} users · page ${page}/${pages}`}
      menu={ADMIN_MENU}
    >
      {error && <p className="error-message">{error}</p>}

      <div className="filter-bar">
        <input
          placeholder="Search by name or email…"
          value={search}
          onChange={(e) => {
            setSearch(e.target.value);
            setPage(1);
          }}
        />
        <select
          value={roleFilter}
          onChange={(e) => {
            setRoleFilter(e.target.value);
            setPage(1);
          }}
        >
          <option value="">All roles</option>
          <option value="patient">Patients ({counts.patient})</option>
          <option value="caregiver">Caregivers ({counts.caregiver})</option>
          <option value="admin">Admins ({counts.admin})</option>
        </select>
        <select
          value={statusFilter}
          onChange={(e) => {
            setStatusFilter(e.target.value);
            setPage(1);
          }}
        >
          <option value="">All status</option>
          <option value="active">Active</option>
          <option value="inactive">Inactive</option>
        </select>
        <select
          value={genderFilter}
          onChange={(e) => {
            setGenderFilter(e.target.value);
            setPage(1);
          }}
        >
          <option value="">All genders</option>
          <option value="Male">Male</option>
          <option value="Female">Female</option>
          <option value="Other">Other</option>
        </select>
        <select
          value={bloodFilter}
          onChange={(e) => {
            setBloodFilter(e.target.value);
            setPage(1);
          }}
        >
          <option value="">All blood groups</option>
          <option value="A+">A+</option>
          <option value="A-">A-</option>
          <option value="B+">B+</option>
          <option value="B-">B-</option>
          <option value="O+">O+</option>
          <option value="O-">O-</option>
          <option value="AB+">AB+</option>
          <option value="AB-">AB-</option>
        </select>
        <input
          type="number"
          className="input"
          placeholder="Min age"
          style={{ width: 90 }}
          value={minAge}
          onChange={(e) => {
            setMinAge(e.target.value);
            setPage(1);
          }}
        />
        <input
          type="number"
          className="input"
          placeholder="Max age"
          style={{ width: 90 }}
          value={maxAge}
          onChange={(e) => {
            setMaxAge(e.target.value);
            setPage(1);
          }}
        />
        <span style={{ flex: 1 }} />
        <button className="action-btn" onClick={exportUsers}>
          ⤓ Export CSV
        </button>
        <button className="action-btn" onClick={addUser}>
          + Add User
        </button>
      </div>

      {loading ? (
        <p className="empty">Loading users…</p>
      ) : users.length === 0 ? (
        <p className="empty">No users found.</p>
      ) : (
        <section className="table-wrap">
          <table className="table">
            <thead>
              <tr>
                <th>Name</th>
                <th>Email</th>
                <th>Phone</th>
                <th>Role</th>
                <th>Status</th>
                <th>Actions</th>
              </tr>
            </thead>
            <tbody>
              {users.map((u) => (
                <tr key={u.id}>
                  <td className="table__name">{u.full_name}</td>
                  <td>{u.email}</td>
                  <td>{u.phone || "—"}</td>
                  <td>
                    <span className={`badge ${roleBadge(u.role)}`}>{u.role}</span>
                  </td>
                  <td>
                    <span className={`badge ${u.is_active ? "badge--success" : "badge--danger"}`}>
                      {u.is_active ? "Active" : "Disabled"}
                    </span>
                  </td>
                  <td className="table__actions">
                    <button className="action-btn action-btn--ghost" onClick={() => openUser(u)}>
                      View
                    </button>
                    <button className="action-btn action-btn--ghost" onClick={() => openEdit(u)}>
                      Edit
                    </button>
                    {u.role === "patient" && (
                      <button className="action-btn action-btn--ghost" onClick={() => openAssign(u)}>
                        Caregiver
                      </button>
                    )}
                    <button className="action-btn action-btn--ghost" onClick={() => toggleStatus(u)}>
                      {u.is_active ? "Disable" : "Enable"}
                    </button>
                    <button className="action-btn action-btn--ghost action-btn--danger" onClick={() => requestDelete(u)}>
                      Delete
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </section>
      )}

      <Pagination page={page} pages={pages} onPage={setPage} />

      {selected && (
        <section className="panel mt24">
          <div className="panel__head">
            <h2 className="panel__title">{selected.full_name}</h2>
            <div className="panel__head-tools">
              {detail?.role === "patient" && detail.caregiver ? (
                <button className="action-btn action-btn--ghost" onClick={doRemoveCaregiver}>
                  Remove caregiver
                </button>
              ) : null}
              <button className="action-btn action-btn--ghost" onClick={() => setSelected(null)}>
                Close
              </button>
            </div>
          </div>

          {detailLoading ? (
            <p className="empty">Loading details…</p>
          ) : (
            detail && (
              <>
                {detail.role === "patient" && detail.stats && (
                  <>
                    <div className="stats">
                      <StatCard icon="💊" label="Scheduled" value={detail.stats.total_scheduled} tone="primary" />
                      <StatCard icon="✔️" label="Taken" value={detail.stats.taken} tone="success" />
                      <StatCard icon="❗" label="Missed" value={detail.stats.missed} tone="warning" />
                      <div className="stat">
                        <div className="stat__head">
                          <span className={`badge ${statusBadge(detail.stats.status)}`}>{detail.stats.status}</span>
                        </div>
                        <p className="stat__value">
                          {detail.stats.adherence_percent != null ? `${detail.stats.adherence_percent}%` : "N/A"}
                        </p>
                        <p className="stat__label">Adherence</p>
                      </div>
                    </div>

                    <div className="grid">
                      <section className="panel">
                        <div className="panel__head">
                          <h2 className="panel__title">Patient info</h2>
                        </div>
                        <div className="list">
                          {[["DOB", detail.profile.dob || "—"], ["Gender", detail.profile.gender || "—"], ["Blood group", detail.profile.blood_group || "—"], ["Emergency contact", detail.profile.emergency_contact || "—"], ["Phone", detail.phone || "—"]].map(([k, v]) => (
                            <div className="list-item" key={k}>
                              <span className="list-item__icon">📋</span>
                              <div className="list-item__body">
                                <p className="list-item__name">{k}</p>
                                <p className="list-item__desc">{v}</p>
                              </div>
                            </div>
                          ))}
                        </div>
                      </section>

                      <section className="panel">
                        <div className="panel__head">
                          <h2 className="panel__title">Current caregiver</h2>
                        </div>
                        {detail.caregiver ? (
                          <div className="list">
                            <div className="list-item">
                              <span className="list-item__icon">👨‍⚕️</span>
                              <div className="list-item__body">
                                <p className="list-item__name">{detail.caregiver.full_name}</p>
                                <p className="list-item__desc">
                                  {detail.caregiver.email}
                                  {detail.caregiver.phone ? ` · ${detail.caregiver.phone}` : ""}
                                </p>
                              </div>
                            </div>
                          </div>
                        ) : (
                          <p className="empty">No caregiver assigned.</p>
                        )}
                      </section>
                    </div>

                    <section className="panel">
                      <div className="panel__head">
                        <h2 className="panel__title">Medications</h2>
                      </div>
                      {detail.medications.length === 0 ? (
                        <p className="empty">No medications scheduled.</p>
                      ) : (
                        <div className="list">
                          {detail.medications.map((m) => (
                            <div className="med-card" key={m.id}>
                              <span className="med-card__icon">💊</span>
                              <div className="med-card__body">
                                <p className="med-card__name">{m.medicine_name}</p>
                                <p className="med-card__dosage">
                                  {m.dosage} · {m.time_label}
                                </p>
                              </div>
                              <span className={`badge ${m.taken ? "badge--success" : "badge--danger"}`}>
                                {m.taken ? "Taken" : "Missed"}
                              </span>
                            </div>
                          ))}
                        </div>
                      )}
                    </section>

                    {detail.conditions?.length > 0 && (
                      <section className="panel">
                        <div className="panel__head">
                          <h2 className="panel__title">Medical conditions</h2>
                        </div>
                        <div className="list">
                          {detail.conditions.map((c, i) => (
                            <div className="list-item" key={i}>
                              <span className="list-item__icon">🩺</span>
                              <div className="list-item__body">
                                <p className="list-item__name">{c.condition}</p>
                                <p className="list-item__desc">{c.severity}</p>
                              </div>
                            </div>
                          ))}
                        </div>
                      </section>
                    )}
                  </>
                )}

                {detail.role !== "patient" && (
                  <p className="empty">
                    {detail.role === "admin" || detail.role === "caregiver"
                      ? `${detail.role} account — no patient medical details.`
                      : "Select a patient to view stats, caregiver and medications."}
                  </p>
                )}
              </>
            )
          )}
        </section>
      )}

      {/* Edit modal */}
      {showEdit && (
        <div className="modal-overlay" onClick={() => setShowEdit(false)}>
          <div className="modal" onClick={(e) => e.stopPropagation()}>
            <h3 className="modal__title">Edit user</h3>
            <div className="form-grid">
              <Field label="Full name" value={editData.full_name || ""} onChange={(e) => setEditData({ ...editData, full_name: e.target.value })} />
              <Field label="Email" type="email" value={editData.email || ""} onChange={(e) => setEditData({ ...editData, email: e.target.value })} />
              <Field label="Phone" value={editData.phone || ""} onChange={(e) => setEditData({ ...editData, phone: e.target.value })} />
              <Field
                label="Role"
                options={["patient", "caregiver", "admin"]}
                value={editData.role || "patient"}
                onChange={(e) => setEditData({ ...editData, role: e.target.value })}
              />
            </div>
            <div className="modal__actions">
              <button className="action-btn action-btn--ghost" onClick={() => setShowEdit(false)}>
                Cancel
              </button>
              <button className="action-btn" onClick={saveEdit}>
                Save
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Add modal */}
      {showAdd && (
        <div className="modal-overlay" onClick={() => setShowAdd(false)}>
          <div className="modal" onClick={(e) => e.stopPropagation()}>
            <h3 className="modal__title">Add user</h3>
            <div className="form-grid">
              <Field label="Full name" value={addData.full_name || ""} onChange={(e) => setAddData({ ...addData, full_name: e.target.value })} />
              <Field label="Email" type="email" value={addData.email || ""} onChange={(e) => setAddData({ ...addData, email: e.target.value })} />
              <Field label="Password" type="password" value={addData.password || ""} onChange={(e) => setAddData({ ...addData, password: e.target.value })} />
              <Field label="Phone" value={addData.phone || ""} onChange={(e) => setAddData({ ...addData, phone: e.target.value })} />
              <Field label="Role" options={["patient", "caregiver", "admin"]} value={addData.role || "patient"} onChange={(e) => setAddData({ ...addData, role: e.target.value })} />
            </div>
            <div className="modal__actions">
              <button className="action-btn action-btn--ghost" onClick={() => setShowAdd(false)}>
                Cancel
              </button>
              <button className="action-btn" onClick={saveAdd}>
                Create
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Assign modal */}
      {assignTarget && (
        <div className="modal-overlay" onClick={() => setAssignTarget(null)}>
          <div className="modal modal--small" onClick={(e) => e.stopPropagation()}>
            <h3 className="modal__title">Assign caregiver</h3>
            <p className="modal__text">Assign a caregiver to {assignTarget.full_name}</p>
            <div className="field">
              <label className="field__label">Caregiver</label>
              <select id="assign-caregiver" className="input-field">
                <option value="">Select caregiver</option>
                {caregivers.map((c) => (
                  <option key={c.id} value={c.id}>
                    {c.full_name} ({c.email})
                  </option>
                ))}
              </select>
            </div>
            <div className="modal__actions">
              <button className="action-btn action-btn--ghost" onClick={() => setAssignTarget(null)}>
                Cancel
              </button>
              <button className="action-btn" onClick={doAssign}>
                Assign
              </button>
            </div>
          </div>
        </div>
      )}

      {confirm && (
        <ConfirmDialog
          title={confirm.title}
          message={confirm.message}
          confirmText={confirm.confirmText}
          onConfirm={confirm.action}
          onCancel={() => setConfirm(null)}
        />
      )}

      <Toast message={toast?.message} type={toast?.type} />
    </DashboardLayout>
  );
};

export default AdminUserManagement;