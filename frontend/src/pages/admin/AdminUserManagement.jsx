import React, { useEffect, useState } from "react";
import {
  Users,
  UserRound,
  UserPlus,
  Search,
  Edit3,
  Trash2,
  UserCheck,
  UserX,
  UserCog,
  Eye,
  X,
  Save,
  ShieldCheck,
  Mail,
  Phone,
  Pill,
  RefreshCw,
  AlertTriangle,
  CheckCircle2,
} from "lucide-react";

import adminService from "../../services/adminService";

const emptyUser = {
  username: "",
  full_name: "",
  email: "",
  password: "",
  phone: "",
  role: "patient",
};

const AdminUserManagement = () => {
  const [users, setUsers] = useState([]);
  const [caregivers, setCaregivers] = useState([]);

  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [message, setMessage] = useState("");
  const [messageType, setMessageType] =
    useState("success");

  const [search, setSearch] = useState("");
  const [role, setRole] = useState("");
  const [active, setActive] = useState("");

  const [selectedUser, setSelectedUser] =
    useState(null);

  const [showForm, setShowForm] =
    useState(false);

  const [editingUser, setEditingUser] =
    useState(null);

  const [form, setForm] =
    useState(emptyUser);

  const [assigning, setAssigning] =
    useState(null);

  const [selectedCaregiver, setSelectedCaregiver] =
    useState("");

  const [saving, setSaving] =
    useState(false);

  const loadUsers = async () => {
    try {
      setLoading(true);
      setError("");

      const params = {};

      if (search.trim()) {
        params.search = search.trim();
      }

      if (role) {
        params.role = role;
      }

      if (active !== "") {
        params.active = active;
      }

      const response =
        await adminService.getUsers(params);

      const data =
        response.data?.users ||
        response.data?.results ||
        response.data ||
        [];

      setUsers(
        Array.isArray(data) ? data : []
      );
    } catch (err) {
      console.error(
        "Unable to load users:",
        err
      );

      setError(
        err?.response?.data?.detail ||
          "Unable to load users."
      );
    } finally {
      setLoading(false);
    }
  };

  const loadCaregivers = async () => {
    try {
      const response =
        await adminService.getCaregivers();

      const data =
        response.data?.results ||
        response.data ||
        [];

      setCaregivers(
        Array.isArray(data) ? data : []
      );
    } catch (err) {
      console.error(
        "Unable to load caregivers:",
        err
      );
    }
  };

  useEffect(() => {
    loadUsers();
    loadCaregivers();
  }, []);

  const showMessage = (
    text,
    type = "success"
  ) => {
    setMessage(text);
    setMessageType(type);

    window.setTimeout(() => {
      setMessage("");
    }, 3500);
  };

  const handleSearch = (e) => {
    e.preventDefault();
    loadUsers();
  };

  const openAdd = () => {
    setEditingUser(null);
    setForm({
      ...emptyUser,
    });
    setShowForm(true);
    setError("");
    setMessage("");
  };

  const openEdit = (user) => {
    setEditingUser(user);

    setForm({
      username:
        user.username || "",
      full_name:
        user.full_name || "",
      email:
        user.email || "",
      password: "",
      phone:
        user.phone || "",
      role:
        user.role || "patient",
    });

    setShowForm(true);
    setError("");
    setMessage("");
  };

  const handleFormChange = (e) => {
    const {
      name,
      value,
    } = e.target;

    setForm((prev) => ({
      ...prev,
      [name]: value,
    }));
  };

  const saveUser = async (e) => {
    e.preventDefault();

    try {
      setSaving(true);
      setError("");
      setMessage("");

      if (editingUser) {
        await adminService.updateUser(
          editingUser.id,
          {
            full_name:
              form.full_name,
            email:
              form.email,
            phone:
              form.phone,
            role:
              form.role,
          }
        );

        showMessage(
          "User updated successfully."
        );
      } else {
        await adminService.createUser({
          username:
            form.username,
          full_name:
            form.full_name,
          email:
            form.email,
          password:
            form.password,
          phone:
            form.phone,
          role:
            form.role,
        });

        showMessage(
          "User created successfully."
        );
      }

      setShowForm(false);

      await loadUsers();
    } catch (err) {
      console.error(
        "Unable to save user:",
        err
      );

      showMessage(
        err?.response?.data?.detail ||
          "Unable to save user.",
        "error"
      );
    } finally {
      setSaving(false);
    }
  };

  const toggleUser = async (user) => {
    try {
      const response =
        await adminService.toggleUserActive(
          user.id
        );

      const isActive =
        response.data?.isActive ??
        response.data?.is_active ??
        !user.isActive;

      setUsers((prev) =>
        prev.map((item) =>
          item.id === user.id
            ? {
                ...item,
                isActive,
                is_active: isActive,
              }
            : item
        )
      );

      showMessage(
        isActive
          ? "User activated."
          : "User deactivated."
      );
    } catch (err) {
      console.error(
        "Unable to change user status:",
        err
      );

      showMessage(
        err?.response?.data?.detail ||
          "Unable to change user status.",
        "error"
      );
    }
  };

  const deleteUser = async (user) => {
    const confirmed =
      window.confirm(
        `Delete user "${user.username}"? This cannot be undone.`
      );

    if (!confirmed) {
      return;
    }

    try {
      await adminService.deleteUser(
        user.id
      );

      setUsers((prev) =>
        prev.filter(
          (item) =>
            item.id !== user.id
        )
      );

      setSelectedUser(null);

      showMessage(
        "User deleted successfully."
      );
    } catch (err) {
      console.error(
        "Unable to delete user:",
        err
      );

      showMessage(
        err?.response?.data?.detail ||
          "Unable to delete user.",
        "error"
      );
    }
  };

  const openAssign = (user) => {
    setAssigning(user);
    setSelectedCaregiver("");
    setError("");
  };

  const assignCaregiver = async () => {
    if (!selectedCaregiver) {
      showMessage(
        "Please select a caregiver.",
        "error"
      );
      return;
    }

    try {
      await adminService.assignCaregiver(
        assigning.id,
        selectedCaregiver
      );

      showMessage(
        "Caregiver assigned successfully."
      );

      setAssigning(null);
    } catch (err) {
      console.error(
        "Unable to assign caregiver:",
        err
      );

      showMessage(
        err?.response?.data?.detail ||
          "Unable to assign caregiver.",
        "error"
      );
    }
  };

  const viewDetails = async (user) => {
    try {
      setError("");

      const response =
        await adminService.getUserDetail(
          user.id
        );

      setSelectedUser(
        response.data || null
      );
    } catch (err) {
      console.error(
        "Unable to load user details:",
        err
      );

      showMessage(
        "Unable to load user details.",
        "error"
      );
    }
  };

  const getIsActive = (user) =>
    user.isActive ??
    user.is_active ??
    false;

  const roleCounts = {
    patient: users.filter(
      (user) =>
        String(user.role).toLowerCase() ===
        "patient"
    ).length,

    caregiver: users.filter(
      (user) =>
        String(user.role).toLowerCase() ===
        "caregiver"
    ).length,

    admin: users.filter(
      (user) =>
        String(user.role).toLowerCase() ===
        "admin"
    ).length,
  };

  return (
    <div className="admin-users-page">
      <style>{styles}</style>

      {/* HEADER */}

      <header className="users-header">
        <div>
          <p className="users-eyebrow">
            Administration
          </p>

          <h1>User Management</h1>

          <p>
            Manage patients, caregivers and
            administrators across PillSync.
          </p>
        </div>

        <div className="users-header-actions">
          <button
            className="users-refresh-btn"
            type="button"
            onClick={loadUsers}
            disabled={loading}
          >
            <RefreshCw size={17} />
            Refresh
          </button>

          <button
            className="users-add-btn"
            type="button"
            onClick={openAdd}
          >
            <UserPlus size={17} />
            Add User
          </button>
        </div>
      </header>

      {/* MESSAGE */}

      {message && (
        <div
          className={`users-message ${
            messageType === "error"
              ? "error"
              : "success"
          }`}
        >
          {messageType === "error" ? (
            <AlertTriangle size={17} />
          ) : (
            <CheckCircle2 size={17} />
          )}

          <span>{message}</span>
        </div>
      )}

      {/* ERROR */}

      {error && (
        <div className="users-error">
          <AlertTriangle size={18} />
          <span>{error}</span>
        </div>
      )}

      {/* SUMMARY */}

      <section className="users-summary">
        <UserStat
          icon={<Users size={21} />}
          label="Total Users"
          value={users.length}
          tone="blue"
        />

        <UserStat
          icon={<UserRound size={21} />}
          label="Patients"
          value={roleCounts.patient}
          tone="teal"
        />

        <UserStat
          icon={<UserCog size={21} />}
          label="Caregivers"
          value={roleCounts.caregiver}
          tone="purple"
        />

        <UserStat
          icon={<ShieldCheck size={21} />}
          label="Administrators"
          value={roleCounts.admin}
          tone="orange"
        />
      </section>

      {/* FILTERS */}

      <section className="users-panel">
        <div className="users-panel-header">
          <div>
            <p className="users-kicker">
              Directory
            </p>

            <h2>
              Registered Users
            </h2>

            <p>
              Search and filter users by role
              or account status.
            </p>
          </div>
        </div>

        <div className="users-filters">
          <form
            className="users-search"
            onSubmit={handleSearch}
          >
            <Search size={17} />

            <input
              type="text"
              placeholder="Search users..."
              value={search}
              onChange={(e) =>
                setSearch(
                  e.target.value
                )
              }
            />

            <button type="submit">
              Search
            </button>
          </form>

          <select
            value={role}
            onChange={(e) =>
              setRole(e.target.value)
            }
          >
            <option value="">
              All Roles
            </option>

            <option value="patient">
              Patient
            </option>

            <option value="caregiver">
              Caregiver
            </option>

            <option value="admin">
              Admin
            </option>
          </select>

          <select
            value={active}
            onChange={(e) =>
              setActive(e.target.value)
            }
          >
            <option value="">
              All Status
            </option>

            <option value="true">
              Active
            </option>

            <option value="false">
              Inactive
            </option>
          </select>

          <button
            className="filter-apply-btn"
            type="button"
            onClick={loadUsers}
          >
            Apply
          </button>
        </div>
      </section>

      {/* USERS TABLE */}

      <section className="users-panel">
        <div className="users-table-header">
          <div>
            <h2>
              Users ({users.length})
            </h2>

            <p>
              View, edit, activate, assign or
              remove accounts.
            </p>
          </div>
        </div>

        {loading ? (
          <div className="users-state">
            <div className="users-spinner" />
            <p>
              Loading users...
            </p>
          </div>
        ) : users.length === 0 ? (
          <div className="users-state">
            <Users size={30} />

            <h3>
              No users found
            </h3>

            <p>
              Try changing your search or
              filters.
            </p>
          </div>
        ) : (
          <div className="users-table-wrap">
            <table className="users-table">
              <thead>
                <tr>
                  <th>User</th>
                  <th>Contact</th>
                  <th>Role</th>
                  <th>Status</th>
                  <th>Joined</th>
                  <th>Actions</th>
                </tr>
              </thead>

              <tbody>
                {users.map((user) => {
                  const userName =
                    user.full_name ||
                    user.name ||
                    user.username ||
                    "User";

                  const isActive =
                    getIsActive(user);

                  const normalizedRole =
                    String(
                      user.role ||
                        "patient"
                    ).toLowerCase();

                  return (
                    <tr key={user.id}>
                      <td>
                        <div className="user-cell">
                          <div className="user-avatar">
                            {userName
                              .charAt(0)
                              .toUpperCase()}
                          </div>

                          <div>
                            <strong>
                              {userName}
                            </strong>

                            <span>
                              @{user.username ||
                                "-"}
                            </span>
                          </div>
                        </div>
                      </td>

                      <td>
                        <div className="contact-cell">
                          <span>
                            <Mail
                              size={13}
                            />
                            {user.email ||
                              "-"}
                          </span>

                          <span>
                            <Phone
                              size={13}
                            />
                            {user.phone ||
                              "-"}
                          </span>
                        </div>
                      </td>

                      <td>
                        <span
                          className={`role-badge ${normalizedRole}`}
                        >
                          {normalizedRole}
                        </span>
                      </td>

                      <td>
                        <span
                          className={`status-badge ${
                            isActive
                              ? "active"
                              : "inactive"
                          }`}
                        >
                          {isActive ? (
                            <CheckCircle2
                              size={12}
                            />
                          ) : (
                            <UserX
                              size={12}
                            />
                          )}

                          {isActive
                            ? "Active"
                            : "Inactive"}
                        </span>
                      </td>

                      <td>
                        <span className="joined-date">
                          {user.dateJoined ||
                            user.date_joined ||
                            "-"}
                        </span>
                      </td>

                      <td>
                        <div className="action-buttons">
                          <button
                            className="table-action view"
                            type="button"
                            title="View user"
                            onClick={() =>
                              viewDetails(
                                user
                              )
                            }
                          >
                            <Eye
                              size={14}
                            />
                          </button>

                          <button
                            className="table-action edit"
                            type="button"
                            title="Edit user"
                            onClick={() =>
                              openEdit(
                                user
                              )
                            }
                          >
                            <Edit3
                              size={14}
                            />
                          </button>

                          <button
                            className="table-action status"
                            type="button"
                            title={
                              isActive
                                ? "Deactivate"
                                : "Activate"
                            }
                            onClick={() =>
                              toggleUser(
                                user
                              )
                            }
                          >
                            {isActive ? (
                              <UserX
                                size={14}
                              />
                            ) : (
                              <UserCheck
                                size={14}
                              />
                            )}
                          </button>

                          {normalizedRole ===
                            "patient" && (
                            <button
                              className="table-action assign"
                              type="button"
                              title="Assign caregiver"
                              onClick={() =>
                                openAssign(
                                  user
                                )
                              }
                            >
                              <UserCog
                                size={14}
                              />
                            </button>
                          )}

                          <button
                            className="table-action delete"
                            type="button"
                            title="Delete user"
                            onClick={() =>
                              deleteUser(
                                user
                              )
                            }
                          >
                            <Trash2
                              size={14}
                            />
                          </button>
                        </div>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </section>

      {/* ADD / EDIT MODAL */}

      {showForm && (
        <div
          className="users-modal-overlay"
          onClick={() =>
            setShowForm(false)
          }
        >
          <div
            className="users-modal"
            onClick={(e) =>
              e.stopPropagation()
            }
          >
            <div className="modal-header">
              <div>
                <p className="users-kicker">
                  Account
                </p>

                <h2>
                  {editingUser
                    ? "Edit User"
                    : "Add User"}
                </h2>
              </div>

              <button
                className="modal-close"
                type="button"
                onClick={() =>
                  setShowForm(false)
                }
              >
                <X size={19} />
              </button>
            </div>

            <form onSubmit={saveUser}>
              <div className="modal-form-grid">
                {!editingUser && (
                  <div className="modal-field">
                    <label>
                      Username
                    </label>

                    <input
                      name="username"
                      value={
                        form.username
                      }
                      onChange={
                        handleFormChange
                      }
                      required
                    />
                  </div>
                )}

                <div className="modal-field">
                  <label>
                    Full Name
                  </label>

                  <input
                    name="full_name"
                    value={
                      form.full_name
                    }
                    onChange={
                      handleFormChange
                    }
                  />
                </div>

                <div className="modal-field">
                  <label>
                    Email
                  </label>

                  <input
                    type="email"
                    name="email"
                    value={
                      form.email
                    }
                    onChange={
                      handleFormChange
                    }
                  />
                </div>

                {!editingUser && (
                  <div className="modal-field">
                    <label>
                      Password
                    </label>

                    <input
                      type="password"
                      name="password"
                      value={
                        form.password
                      }
                      onChange={
                        handleFormChange
                      }
                      minLength={6}
                      required
                    />
                  </div>
                )}

                <div className="modal-field">
                  <label>
                    Phone
                  </label>

                  <input
                    name="phone"
                    value={
                      form.phone
                    }
                    onChange={
                      handleFormChange
                    }
                  />
                </div>

                <div className="modal-field">
                  <label>
                    Role
                  </label>

                  <select
                    name="role"
                    value={
                      form.role
                    }
                    onChange={
                      handleFormChange
                    }
                  >
                    <option value="patient">
                      Patient
                    </option>

                    <option value="caregiver">
                      Caregiver
                    </option>

                    <option value="admin">
                      Admin
                    </option>
                  </select>
                </div>
              </div>

              <div className="modal-actions">
                <button
                  type="button"
                  className="modal-cancel"
                  onClick={() =>
                    setShowForm(false)
                  }
                >
                  Cancel
                </button>

                <button
                  type="submit"
                  className="modal-save"
                  disabled={saving}
                >
                  <Save size={16} />

                  {saving
                    ? "Saving..."
                    : editingUser
                    ? "Save Changes"
                    : "Create User"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* USER DETAILS MODAL */}

      {selectedUser && (
        <div
          className="users-modal-overlay"
          onClick={() =>
            setSelectedUser(null)
          }
        >
          <div
            className="users-modal details-modal"
            onClick={(e) =>
              e.stopPropagation()
            }
          >
            <div className="modal-header">
              <div>
                <p className="users-kicker">
                  Account information
                </p>

                <h2>User Details</h2>
              </div>

              <button
                className="modal-close"
                type="button"
                onClick={() =>
                  setSelectedUser(
                    null
                  )
                }
              >
                <X size={19} />
              </button>
            </div>

            <div className="detail-profile">
              <div className="detail-avatar">
                {(
                  selectedUser.full_name ||
                  selectedUser.username ||
                  "U"
                )
                  .charAt(0)
                  .toUpperCase()}
              </div>

              <div>
                <h3>
                  {selectedUser.full_name ||
                    selectedUser.username}
                </h3>

                <p>
                  @
                  {
                    selectedUser.username
                  }
                </p>
              </div>
            </div>

            <div className="detail-grid">
              <DetailItem
                icon={<Mail size={16} />}
                label="Email"
                value={
                  selectedUser.email ||
                  "-"
                }
              />

              <DetailItem
                icon={<Phone size={16} />}
                label="Phone"
                value={
                  selectedUser.phone ||
                  "-"
                }
              />

              <DetailItem
                icon={<ShieldCheck size={16} />}
                label="Role"
                value={
                  selectedUser.role ||
                  "-"
                }
              />

              <DetailItem
                icon={<UserCheck size={16} />}
                label="Status"
                value={
                  getIsActive(
                    selectedUser
                  )
                    ? "Active"
                    : "Inactive"
                }
              />
            </div>

            <div className="details-medications">
              <div className="details-section-header">
                <div>
                  <h3>
                    Medications
                  </h3>

                  <p>
                    Medicines associated with
                    this account.
                  </p>
                </div>

                <Pill size={20} />
              </div>

              {Array.isArray(
                selectedUser.medications
              ) &&
              selectedUser.medications
                .length > 0 ? (
                <div className="details-med-list">
                  {selectedUser.medications.map(
                    (medication) => (
                      <div
                        className="details-med-item"
                        key={
                          medication.id
                        }
                      >
                        <Pill size={16} />

                        <div>
                          <strong>
                            {
                              medication.name
                            }
                          </strong>

                          <span>
                            {
                              medication.dosage
                            }
                          </span>
                        </div>
                      </div>
                    )
                  )}
                </div>
              ) : (
                <p className="details-empty">
                  No medications associated
                  with this user.
                </p>
              )}
            </div>

            <div className="modal-actions">
              <button
                className="modal-cancel"
                type="button"
                onClick={() =>
                  setSelectedUser(
                    null
                  )
                }
              >
                Close
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ASSIGN CAREGIVER MODAL */}

      {assigning && (
        <div
          className="users-modal-overlay"
          onClick={() =>
            setAssigning(null)
          }
        >
          <div
            className="users-modal assign-modal"
            onClick={(e) =>
              e.stopPropagation()
            }
          >
            <div className="modal-header">
              <div>
                <p className="users-kicker">
                  Patient assignment
                </p>

                <h2>
                  Assign Caregiver
                </h2>
              </div>

              <button
                className="modal-close"
                type="button"
                onClick={() =>
                  setAssigning(null)
                }
              >
                <X size={19} />
              </button>
            </div>

            <div className="assignment-patient">
              <div className="assignment-avatar">
                {(
                  assigning.full_name ||
                  assigning.username ||
                  "P"
                )
                  .charAt(0)
                  .toUpperCase()}
              </div>

              <div>
                <span>
                  Patient
                </span>

                <strong>
                  {assigning.full_name ||
                    assigning.username}
                </strong>
              </div>
            </div>

            <div className="modal-field">
              <label>
                Select Caregiver
              </label>

              <select
                value={
                  selectedCaregiver
                }
                onChange={(e) =>
                  setSelectedCaregiver(
                    e.target.value
                  )
                }
              >
                <option value="">
                  Select caregiver
                </option>

                {caregivers.map(
                  (caregiver) => (
                    <option
                      key={
                        caregiver.id
                      }
                      value={
                        caregiver.id
                      }
                    >
                      {caregiver.full_name ||
                        caregiver.name ||
                        caregiver.username}
                    </option>
                  )
                )}
              </select>
            </div>

            <div className="modal-actions">
              <button
                className="modal-cancel"
                type="button"
                onClick={() =>
                  setAssigning(null)
                }
              >
                Cancel
              </button>

              <button
                className="modal-save"
                type="button"
                onClick={
                  assignCaregiver
                }
              >
                <UserCheck
                  size={16}
                />
                Assign Caregiver
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

const UserStat = ({
  icon,
  label,
  value,
  tone,
}) => (
  <div className="user-stat">
    <div
      className={`user-stat-icon ${tone}`}
    >
      {icon}
    </div>

    <div>
      <strong>{value}</strong>
      <span>{label}</span>
    </div>
  </div>
);

const DetailItem = ({
  icon,
  label,
  value,
}) => (
  <div className="detail-item">
    <div className="detail-item-icon">
      {icon}
    </div>

    <div>
      <span>{label}</span>
      <strong>{value}</strong>
    </div>
  </div>
);

const styles = `
  .admin-users-page {
    min-height: calc(100vh - 80px);
    padding: 28px;
    background: #f7f9fc;
    color: #172033;
  }

  .users-header {
    display: flex;
    align-items: flex-start;
    justify-content: space-between;
    gap: 20px;
    margin-bottom: 24px;
  }

  .users-eyebrow,
  .users-kicker {
    margin: 0 0 6px;
    color: #0f9488;
    font-size: 11px;
    font-weight: 700;
    text-transform: uppercase;
    letter-spacing: .08em;
  }

  .users-header h1 {
    margin: 0;
    color: #172033;
    font-size: 30px;
    font-weight: 750;
  }

  .users-header > div:first-child > p:last-child {
    margin: 7px 0 0;
    color: #697386;
    font-size: 14px;
  }

  .users-header-actions {
    display: flex;
    gap: 8px;
  }

  .users-refresh-btn,
  .users-add-btn {
    display: inline-flex;
    align-items: center;
    gap: 7px;
    border-radius: 9px;
    padding: 10px 14px;
    font-size: 13px;
    font-weight: 650;
    cursor: pointer;
  }

  .users-refresh-btn {
    border: 1px solid #dce3eb;
    background: #fff;
    color: #344054;
  }

  .users-add-btn {
    border: 0;
    background: #14b8a6;
    color: #fff;
  }

  .users-add-btn:hover {
    background: #0f9f90;
  }

  .users-refresh-btn:hover {
    background: #f9fafb;
  }

  .users-refresh-btn:disabled {
    opacity: .55;
    cursor: not-allowed;
  }

  .users-message,
  .users-error {
    display: flex;
    align-items: center;
    gap: 9px;
    margin-bottom: 18px;
    padding: 12px 14px;
    border-radius: 10px;
    font-size: 13px;
  }

  .users-message.success {
    border: 1px solid #a6f4c5;
    background: #ecfdf3;
    color: #087443;
  }

  .users-message.error,
  .users-error {
    border: 1px solid #fecaca;
    background: #fff5f5;
    color: #b42318;
  }

  .users-summary {
    display: grid;
    grid-template-columns: repeat(4, minmax(0, 1fr));
    gap: 14px;
    margin-bottom: 18px;
  }

  .user-stat {
    display: flex;
    align-items: center;
    gap: 12px;
    padding: 16px;
    border: 1px solid #e7ebf0;
    border-radius: 12px;
    background: #fff;
    box-shadow: 0 2px 8px rgba(15, 23, 42, .03);
  }

  .user-stat-icon {
    width: 42px;
    height: 42px;
    min-width: 42px;
    display: flex;
    align-items: center;
    justify-content: center;
    border-radius: 11px;
  }

  .user-stat-icon.blue {
    background: #eff6ff;
    color: #2563eb;
  }

  .user-stat-icon.teal {
    background: #e8f8f6;
    color: #0f9488;
  }

  .user-stat-icon.purple {
    background: #f5f3ff;
    color: #7c3aed;
  }

  .user-stat-icon.orange {
    background: #fff7ed;
    color: #ea580c;
  }

  .user-stat strong {
    display: block;
    color: #172033;
    font-size: 21px;
  }

  .user-stat span {
    display: block;
    margin-top: 3px;
    color: #7b8495;
    font-size: 11px;
  }

  .users-panel {
    margin-bottom: 18px;
    padding: 20px;
    border: 1px solid #e7ebf0;
    border-radius: 14px;
    background: #fff;
    box-shadow: 0 2px 8px rgba(15, 23, 42, .03);
  }

  .users-panel-header {
    margin-bottom: 18px;
  }

  .users-panel h2,
  .users-table-header h2 {
    margin: 0;
    color: #172033;
    font-size: 19px;
  }

  .users-panel-header p:last-child,
  .users-table-header p {
    margin: 4px 0 0;
    color: #7b8495;
    font-size: 12px;
  }

  .users-filters {
    display: grid;
    grid-template-columns: minmax(250px, 1fr) 170px 170px auto;
    gap: 9px;
  }

  .users-search {
    display: flex;
    align-items: center;
    gap: 8px;
    min-width: 0;
    padding-left: 11px;
    border: 1px solid #dce2e9;
    border-radius: 9px;
    color: #98a2b3;
  }

  .users-search:focus-within {
    border-color: #14b8a6;
    box-shadow: 0 0 0 3px rgba(20, 184, 166, .1);
  }

  .users-search input {
    width: 100%;
    min-width: 0;
    border: 0;
    outline: 0;
    padding: 10px 0;
    color: #172033;
    font-size: 13px;
  }

  .users-search button,
  .filter-apply-btn {
    border: 0;
    border-radius: 7px;
    background: #172033;
    color: #fff;
    padding: 8px 12px;
    font-size: 12px;
    font-weight: 650;
    cursor: pointer;
  }

  .users-filters select {
    border: 1px solid #dce2e9;
    border-radius: 9px;
    outline: 0;
    padding: 10px 11px;
    background: #fff;
    color: #344054;
    font-size: 12px;
  }

  .users-filters select:focus {
    border-color: #14b8a6;
  }

  .filter-apply-btn {
    background: #14b8a6;
  }

  .users-table-header {
    margin-bottom: 15px;
  }

  .users-table-wrap {
    width: 100%;
    overflow-x: auto;
  }

  .users-table {
    width: 100%;
    min-width: 1050px;
    border-collapse: collapse;
  }

  .users-table th {
    padding: 11px 12px;
    border-bottom: 1px solid #e7ebf0;
    background: #f8fafc;
    color: #667085;
    text-align: left;
    font-size: 10px;
    font-weight: 700;
    text-transform: uppercase;
  }

  .users-table td {
    padding: 13px 12px;
    border-bottom: 1px solid #edf0f3;
    color: #475467;
    font-size: 12px;
    vertical-align: middle;
  }

  .users-table tbody tr:hover {
    background: #fbfdfd;
  }

  .user-cell {
    display: flex;
    align-items: center;
    gap: 10px;
  }

  .user-avatar {
    width: 38px;
    height: 38px;
    min-width: 38px;
    display: flex;
    align-items: center;
    justify-content: center;
    border-radius: 50%;
    background: #e8f8f6;
    color: #0f766e;
    font-size: 13px;
    font-weight: 750;
  }

  .user-cell strong {
    display: block;
    color: #172033;
    font-size: 12px;
  }

  .user-cell span {
    display: block;
    margin-top: 3px;
    color: #98a2b3;
    font-size: 10px;
  }

  .contact-cell {
    display: flex;
    flex-direction: column;
    gap: 5px;
  }

  .contact-cell span {
    display: inline-flex;
    align-items: center;
    gap: 5px;
    color: #667085;
  }

  .contact-cell svg {
    color: #98a2b3;
  }

  .role-badge,
  .status-badge {
    display: inline-flex;
    align-items: center;
    gap: 4px;
    padding: 5px 8px;
    border-radius: 999px;
    font-size: 10px;
    font-weight: 700;
    text-transform: capitalize;
  }

  .role-badge.patient {
    background: #eff6ff;
    color: #2563eb;
  }

  .role-badge.caregiver {
    background: #f5f3ff;
    color: #7c3aed;
  }

  .role-badge.admin {
    background: #fff7ed;
    color: #c2410c;
  }

  .status-badge.active {
    background: #ecfdf3;
    color: #087443;
  }

  .status-badge.inactive {
    background: #f2f4f7;
    color: #667085;
  }

  .joined-date {
    color: #667085;
    white-space: nowrap;
  }

  .action-buttons {
    display: flex;
    gap: 5px;
  }

  .table-action {
    width: 29px;
    height: 29px;
    display: flex;
    align-items: center;
    justify-content: center;
    border: 1px solid #e1e6ec;
    border-radius: 7px;
    background: #fff;
    cursor: pointer;
  }

  .table-action.view {
    color: #2563eb;
  }

  .table-action.edit {
    color: #7c3aed;
  }

  .table-action.status {
    color: #0f766e;
  }

  .table-action.assign {
    color: #0f9488;
  }

  .table-action.delete {
    color: #d92d20;
  }

  .table-action:hover {
    background: #f8fafc;
  }

  .users-state {
    min-height: 270px;
    display: flex;
    align-items: center;
    justify-content: center;
    flex-direction: column;
    text-align: center;
    color: #98a2b3;
  }

  .users-state h3 {
    margin: 10px 0 5px;
    color: #344054;
    font-size: 15px;
  }

  .users-state p {
    margin: 0;
    font-size: 12px;
  }

  .users-spinner {
    width: 28px;
    height: 28px;
    border: 3px solid #d8eeeb;
    border-top-color: #14b8a6;
    border-radius: 50%;
    animation: users-spin .7s linear infinite;
  }

  @keyframes users-spin {
    to {
      transform: rotate(360deg);
    }
  }

  .users-modal-overlay {
    position: fixed;
    inset: 0;
    z-index: 1000;
    display: flex;
    align-items: center;
    justify-content: center;
    padding: 20px;
    background: rgba(15, 23, 42, .48);
  }

  .users-modal {
    width: min(620px, 100%);
    max-height: 90vh;
    overflow-y: auto;
    padding: 22px;
    border-radius: 16px;
    background: #fff;
    box-shadow: 0 25px 60px rgba(15, 23, 42, .2);
  }

  .assign-modal {
    width: min(480px, 100%);
  }

  .modal-header {
    display: flex;
    align-items: flex-start;
    justify-content: space-between;
    gap: 15px;
    margin-bottom: 20px;
  }

  .modal-header h2 {
    margin: 0;
    color: #172033;
    font-size: 20px;
  }

  .modal-close {
    display: flex;
    align-items: center;
    justify-content: center;
    width: 34px;
    height: 34px;
    border: 1px solid #e1e6ec;
    border-radius: 8px;
    background: #fff;
    color: #667085;
    cursor: pointer;
  }

  .modal-close:hover {
    background: #f8fafc;
  }

  .modal-form-grid {
    display: grid;
    grid-template-columns: repeat(2, minmax(0, 1fr));
    gap: 14px;
  }

  .modal-field {
    margin-bottom: 14px;
  }

  .modal-field label {
    display: block;
    margin-bottom: 7px;
    color: #475467;
    font-size: 12px;
    font-weight: 650;
  }

  .modal-field input,
  .modal-field select {
    width: 100%;
    box-sizing: border-box;
    border: 1px solid #dce2e9;
    border-radius: 9px;
    outline: 0;
    padding: 10px 11px;
    background: #fff;
    color: #172033;
    font-size: 13px;
  }

  .modal-field input:focus,
  .modal-field select:focus {
    border-color: #14b8a6;
    box-shadow: 0 0 0 3px rgba(20, 184, 166, .1);
  }

  .modal-actions {
    display: flex;
    justify-content: flex-end;
    gap: 8px;
    margin-top: 20px;
  }

  .modal-cancel,
  .modal-save {
    display: inline-flex;
    align-items: center;
    gap: 7px;
    border-radius: 8px;
    padding: 10px 13px;
    font-size: 12px;
    font-weight: 650;
    cursor: pointer;
  }

  .modal-cancel {
    border: 1px solid #dce2e9;
    background: #fff;
    color: #475467;
  }

  .modal-save {
    border: 0;
    background: #14b8a6;
    color: #fff;
  }

  .modal-save:disabled {
    opacity: .55;
    cursor: not-allowed;
  }

  .detail-profile {
    display: flex;
    align-items: center;
    gap: 12px;
    margin-bottom: 18px;
    padding: 14px;
    border-radius: 11px;
    background: #f8fafc;
  }

  .detail-avatar,
  .assignment-avatar {
    width: 45px;
    height: 45px;
    min-width: 45px;
    display: flex;
    align-items: center;
    justify-content: center;
    border-radius: 50%;
    background: #e8f8f6;
    color: #0f766e;
    font-weight: 750;
  }

  .detail-profile h3 {
    margin: 0;
    color: #172033;
    font-size: 15px;
  }

  .detail-profile p {
    margin: 4px 0 0;
    color: #98a2b3;
    font-size: 11px;
  }

  .detail-grid {
    display: grid;
    grid-template-columns: repeat(2, minmax(0, 1fr));
    gap: 10px;
    margin-bottom: 18px;
  }

  .detail-item {
    display: flex;
    align-items: center;
    gap: 9px;
    padding: 11px;
    border: 1px solid #edf0f3;
    border-radius: 9px;
  }

  .detail-item-icon {
    width: 32px;
    height: 32px;
    display: flex;
    align-items: center;
    justify-content: center;
    border-radius: 8px;
    background: #eef8f7;
    color: #0f9488;
  }

  .detail-item span {
    display: block;
    color: #98a2b3;
    font-size: 10px;
  }

  .detail-item strong {
    display: block;
    margin-top: 2px;
    color: #344054;
    font-size: 12px;
  }

  .details-section-header {
    display: flex;
    align-items: flex-start;
    justify-content: space-between;
    margin-bottom: 10px;
    color: #0f9488;
  }

  .details-section-header h3 {
    margin: 0;
    color: #172033;
    font-size: 15px;
  }

  .details-section-header p {
    margin: 4px 0 0;
    color: #7b8495;
    font-size: 11px;
  }

  .details-med-list {
    display: flex;
    flex-direction: column;
    gap: 8px;
  }

  .details-med-item {
    display: flex;
    align-items: center;
    gap: 9px;
    padding: 10px;
    border-radius: 8px;
    background: #f8fafc;
    color: #0f9488;
  }

  .details-med-item strong {
    display: block;
    color: #344054;
    font-size: 12px;
  }

  .details-med-item span {
    display: block;
    margin-top: 3px;
    color: #7b8495;
    font-size: 11px;
  }

  .details-empty {
    margin: 0;
    color: #98a2b3;
    font-size: 12px;
  }

  .assignment-patient {
    display: flex;
    align-items: center;
    gap: 11px;
    padding: 12px;
    margin-bottom: 18px;
    border-radius: 10px;
    background: #f8fafc;
  }

  .assignment-patient span {
    display: block;
    color: #98a2b3;
    font-size: 10px;
  }

  .assignment-patient strong {
    display: block;
    margin-top: 3px;
    color: #344054;
    font-size: 13px;
  }

  @media (max-width: 1050px) {
    .users-summary {
      grid-template-columns: repeat(2, minmax(0, 1fr));
    }

    .users-filters {
      grid-template-columns: 1fr 1fr;
    }

    .users-search {
      grid-column: 1 / -1;
    }
  }

  @media (max-width: 700px) {
    .admin-users-page {
      padding: 18px;
    }

    .users-header {
      flex-direction: column;
    }

    .users-header-actions {
      width: 100%;
    }

    .users-refresh-btn,
    .users-add-btn {
      flex: 1;
      justify-content: center;
    }

    .users-summary {
      grid-template-columns: 1fr;
    }

    .users-filters {
      grid-template-columns: 1fr;
    }

    .users-search {
      grid-column: auto;
    }

    .modal-form-grid,
    .detail-grid {
      grid-template-columns: 1fr;
    }
  }

  @media (max-width: 500px) {
    .users-header h1 {
      font-size: 25px;
    }

    .users-header-actions {
      flex-direction: column;
    }

    .users-refresh-btn,
    .users-add-btn {
      width: 100%;
    }
  }
`;

export default AdminUserManagement;