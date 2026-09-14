import React, {
  useContext,
  useEffect,
  useState,
} from "react";

import {
  User,
  Mail,
  Phone,
  Calendar,
  Shield,
  Lock,
  Edit3,
  Save,
  X,
  CheckCircle,
  AlertCircle,
  Loader2,
} from "lucide-react";

import { AuthContext } from "../../context/AuthContext";
import { useTheme } from "../../context/ThemeContext";
import api from "../../services/api";

const Profile = () => {
  const { user, updateUser } =
    useContext(AuthContext);

  const { resolvedTheme } =
    useTheme();

  const [profile, setProfile] =
    useState({
      username: "",
      email: "",
      phone_number: "",
      date_of_birth: "",
      role: "",
    });

  const [form, setForm] =
    useState({
      email: "",
      phone_number: "",
      date_of_birth: "",
    });

  const [editing, setEditing] =
    useState(false);

  const [loading, setLoading] =
    useState(true);

  const [saving, setSaving] =
    useState(false);

  const [message, setMessage] =
    useState("");

  const [error, setError] =
    useState("");

  const loadProfile = async () => {
    try {
      setLoading(true);
      setError("");

      const response =
        await api.get("/auth/me/");

      const data =
        response.data || {};

      const currentProfile = {
        username:
          data.username ||
          user?.username ||
          "",
        email:
          data.email ||
          user?.email ||
          "",
        phone_number:
          data.phone_number ||
          user?.phone_number ||
          "",
        date_of_birth:
          data.date_of_birth || "",
        role:
          data.role ||
          user?.role ||
          "patient",
      };

      setProfile(
        currentProfile
      );

      setForm({
        email:
          currentProfile.email,
        phone_number:
          currentProfile.phone_number,
        date_of_birth:
          currentProfile.date_of_birth,
      });

      updateUser(
        currentProfile
      );
    } catch (err) {
      console.error(
        "Failed to load profile:",
        err
      );

      const fallback = {
        username:
          user?.username || "",
        email:
          user?.email || "",
        phone_number:
          user?.phone_number || "",
        date_of_birth:
          user?.date_of_birth || "",
        role:
          user?.role ||
          "patient",
      };

      setProfile(
        fallback
      );

      setForm({
        email:
          fallback.email,
        phone_number:
          fallback.phone_number,
        date_of_birth:
          fallback.date_of_birth,
      });

      setError(
        err.response?.data
          ?.detail ||
          err.response?.data
            ?.error ||
          "Unable to load your profile."
      );
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadProfile();
  }, []);

  const handleChange = (
    event
  ) => {
    const {
      name,
      value,
    } = event.target;

    setForm(
      (previous) => ({
        ...previous,
        [name]: value,
      })
    );

    setMessage("");
    setError("");
  };

  const handleCancel = () => {
    setForm({
      email: profile.email,
      phone_number:
        profile.phone_number,
      date_of_birth:
        profile.date_of_birth,
    });

    setEditing(false);
    setMessage("");
    setError("");
  };

  const handleSave = async (
    event
  ) => {
    event.preventDefault();

    try {
      setSaving(true);
      setMessage("");
      setError("");

      const response =
        await api.patch(
          "/auth/me/",
          {
            email:
              form.email.trim(),
            phone_number:
              form.phone_number.trim(),
            date_of_birth:
              form.date_of_birth ||
              null,
          }
        );

      const updated =
        response.data || {};

      const updatedProfile = {
        username:
          updated.username ||
          profile.username,
        email:
          updated.email ??
          form.email,
        phone_number:
          updated.phone_number ??
          form.phone_number,
        date_of_birth:
          updated.date_of_birth ??
          form.date_of_birth,
        role:
          updated.role ||
          profile.role,
      };

      setProfile(
        updatedProfile
      );

      setForm({
        email:
          updatedProfile.email,
        phone_number:
          updatedProfile.phone_number,
        date_of_birth:
          updatedProfile.date_of_birth,
      });

      updateUser(
        updatedProfile
      );

      const storedUser =
        localStorage.getItem(
          "user"
        );

      if (storedUser) {
        try {
          const parsed =
            JSON.parse(
              storedUser
            );

          localStorage.setItem(
            "user",
            JSON.stringify({
              ...parsed,
              ...updatedProfile,
            })
          );
        } catch {
          // Ignore invalid local storage data.
        }
      }

      setEditing(false);

      setMessage(
        "Profile updated successfully."
      );
    } catch (err) {
      console.error(
        "Failed to update profile:",
        err
      );

      setError(
        err.response?.data
          ?.detail ||
          err.response?.data
            ?.error ||
          "Unable to update profile."
      );
    } finally {
      setSaving(false);
    }
  };

  const displayName =
    profile.username ||
    "User";

  const initials =
    displayName
      .charAt(0)
      .toUpperCase();

  const role =
    profile.role?.toLowerCase() ||
    "patient";

  if (loading) {
    return (
      <div className="ps-profile-page">
        <style>
          {`
            .ps-profile-page {
              min-height: calc(100vh - 68px);
              padding: 28px;
              background: var(--color-bg);
              color: var(--color-text);
              box-sizing: border-box;
            }

            .ps-profile-loading {
              max-width: 1180px;
              margin: 0 auto;
              display: flex;
              align-items: center;
              gap: 8px;
              color: var(--color-text-muted);
              font-size: 14px;
            }

            .ps-profile-spinner {
              animation: psProfileSpin 1s linear infinite;
            }

            @keyframes psProfileSpin {
              from {
                transform: rotate(0deg);
              }

              to {
                transform: rotate(360deg);
              }
            }
          `}
        </style>

        <div className="ps-profile-loading">
          <Loader2
            size={18}
            className="ps-profile-spinner"
          />
          Loading profile...
        </div>
      </div>
    );
  }

  return (
    <div className="ps-profile-page">
      <style>
        {`
          .ps-profile-page {
            min-height: calc(100vh - 68px);
            padding: 28px;
            background: var(--color-bg);
            color: var(--color-text);
            box-sizing: border-box;
            transition:
              background-color 0.25s ease,
              color 0.25s ease;
          }

          .ps-profile-container {
            max-width: 1180px;
            margin: 0 auto;
          }

          .ps-profile-heading {
            margin-bottom: 24px;
          }

          .ps-profile-heading h1 {
            margin: 0;
            color: var(--color-text);
            font-size: 27px;
            font-weight: 800;
            letter-spacing: -0.02em;
          }

          .ps-profile-heading p {
            margin: 6px 0 0;
            color: var(--color-text-muted);
            font-size: 13px;
          }

          .ps-profile-layout {
            display: grid;
            grid-template-columns: 300px minmax(0, 1fr);
            gap: 20px;
            align-items: start;
          }

          .ps-profile-card {
            background: var(--color-surface);
            border: 1px solid var(--color-border);
            border-radius: 14px;
            box-shadow: var(--shadow-soft);
            transition:
              background-color 0.25s ease,
              border-color 0.25s ease;
          }

          .ps-profile-summary {
            padding: 28px 22px;
            text-align: center;
          }

          .ps-profile-avatar {
            width: 78px;
            height: 78px;
            margin: 0 auto 15px;
            border-radius: 50%;
            background: var(--color-primary-light);
            color: var(--color-primary);
            display: flex;
            align-items: center;
            justify-content: center;
            font-size: 28px;
            font-weight: 800;
          }

          .ps-profile-summary h2 {
            margin: 0;
            color: var(--color-text);
            font-size: 19px;
            font-weight: 800;
          }

          .ps-profile-summary-role {
            margin-top: 5px;
            color: var(--color-text-muted);
            font-size: 12px;
            text-transform: capitalize;
          }

          .ps-profile-status {
            display: inline-flex;
            align-items: center;
            gap: 5px;
            margin-top: 14px;
            padding: 5px 10px;
            border-radius: 999px;
            background: var(--color-success-bg);
            color: var(--color-success);
            font-size: 11px;
            font-weight: 700;
          }

          .ps-profile-card-header {
            display: flex;
            align-items: center;
            justify-content: space-between;
            gap: 15px;
            padding: 18px 20px;
            border-bottom: 1px solid var(--color-border);
          }

          .ps-profile-card-title {
            display: flex;
            align-items: center;
            gap: 9px;
          }

          .ps-profile-card-title-icon {
            width: 31px;
            height: 31px;
            border-radius: 8px;
            background: var(--color-primary-light);
            color: var(--color-primary);
            display: flex;
            align-items: center;
            justify-content: center;
          }

          .ps-profile-card-title h3 {
            margin: 0;
            color: var(--color-text);
            font-size: 14px;
            font-weight: 750;
          }

          .ps-profile-card-body {
            padding: 20px;
          }

          .ps-profile-field-grid {
            display: grid;
            grid-template-columns: 1fr 1fr;
            gap: 18px;
          }

          .ps-profile-field {
            min-width: 0;
          }

          .ps-profile-field.full {
            grid-column: span 2;
          }

          .ps-profile-field-label {
            display: flex;
            align-items: center;
            gap: 7px;
            margin-bottom: 7px;
            color: var(--color-text-muted);
            font-size: 11px;
            font-weight: 650;
          }

          .ps-profile-field-value {
            min-height: 42px;
            display: flex;
            align-items: center;
            padding: 0 12px;
            border: 1px solid var(--color-border);
            border-radius: 9px;
            background: var(--color-surface-alt);
            color: var(--color-text);
            font-size: 13px;
            box-sizing: border-box;
          }

          .ps-profile-field input {
            width: 100%;
            height: 42px;
            padding: 0 12px;
            border: 1px solid var(--color-border-strong);
            border-radius: 9px;
            outline: none;
            background: var(--color-surface);
            color: var(--color-text);
            font-size: 13px;
            box-sizing: border-box;
          }

          .ps-profile-field input:focus {
            border-color: var(--color-primary);
            box-shadow: var(--shadow-focus);
          }

          .ps-profile-actions {
            display: flex;
            align-items: center;
            gap: 8px;
          }

          .ps-profile-edit-btn,
          .ps-profile-save-btn,
          .ps-profile-cancel-btn {
            display: inline-flex;
            align-items: center;
            justify-content: center;
            gap: 6px;
            min-height: 34px;
            padding: 7px 11px;
            border-radius: 8px;
            font-size: 12px;
            font-weight: 700;
            cursor: pointer;
          }

          .ps-profile-edit-btn {
            border: 1px solid var(--color-border);
            background: var(--color-surface);
            color: var(--color-text-muted);
          }

          .ps-profile-edit-btn:hover {
            background: var(--color-surface-alt);
            color: var(--color-text);
          }

          .ps-profile-save-btn {
            border: 1px solid var(--color-primary);
            background: var(--color-primary);
            color: #ffffff;
          }

          .ps-profile-save-btn:hover {
            background: var(--color-primary-dark);
          }

          .ps-profile-save-btn:disabled {
            opacity: 0.65;
            cursor: not-allowed;
          }

          .ps-profile-cancel-btn {
            border: 1px solid var(--color-border);
            background: var(--color-surface);
            color: var(--color-text-muted);
          }

          .ps-profile-cancel-btn:hover {
            background: var(--color-surface-alt);
          }

          .ps-profile-message,
          .ps-profile-error {
            display: flex;
            align-items: center;
            gap: 7px;
            margin-bottom: 18px;
            padding: 10px 12px;
            border-radius: 8px;
            font-size: 12px;
            font-weight: 600;
          }

          .ps-profile-message {
            background: var(--color-success-bg);
            color: var(--color-success);
          }

          .ps-profile-error {
            background: var(--color-danger-bg);
            color: var(--color-danger);
          }

          .ps-security-note {
            display: flex;
            align-items: flex-start;
            margin-top: 20px;
            padding: 13px;
            border-radius: 9px;
            background: var(--color-surface-alt);
            color: var(--color-text-muted);
            font-size: 11px;
            line-height: 1.5;
          }

          .ps-security-note svg {
            flex-shrink: 0;
            margin-top: 1px;
            margin-right: 6px;
          }

          .ps-profile-date-input {
            color-scheme: ${
              resolvedTheme === "dark"
                ? "dark"
                : "light"
            };
          }

          @media (max-width: 800px) {
            .ps-profile-page {
              padding: 18px;
            }

            .ps-profile-layout {
              grid-template-columns: 1fr;
            }

            .ps-profile-field-grid {
              grid-template-columns: 1fr;
            }

            .ps-profile-field.full {
              grid-column: span 1;
            }

            .ps-profile-card-header {
              align-items: flex-start;
              flex-direction: column;
            }

            .ps-profile-actions {
              width: 100%;
            }
          }
        `}
      </style>

      <div className="ps-profile-container">
        <div className="ps-profile-heading">
          <h1>Profile</h1>

          <p>
            Manage your personal information
            and account details.
          </p>
        </div>

        {error && (
          <div className="ps-profile-error">
            <AlertCircle size={15} />
            <span>{error}</span>
          </div>
        )}

        {message && (
          <div className="ps-profile-message">
            <CheckCircle size={15} />
            <span>{message}</span>
          </div>
        )}

        <div className="ps-profile-layout">
          <div className="ps-profile-card">
            <div className="ps-profile-summary">
              <div className="ps-profile-avatar">
                {initials}
              </div>

              <h2>
                {displayName}
              </h2>

              <div className="ps-profile-summary-role">
                {role}
              </div>

              <div className="ps-profile-status">
                <CheckCircle size={13} />
                <span>Active Account</span>
              </div>
            </div>
          </div>

          <div className="ps-profile-card">
            <div className="ps-profile-card-header">
              <div className="ps-profile-card-title">
                <div className="ps-profile-card-title-icon">
                  <User size={16} />
                </div>

                <h3>
                  Personal Information
                </h3>
              </div>

              {!editing ? (
                <button
                  className="ps-profile-edit-btn"
                  onClick={() => {
                    setEditing(true);
                    setMessage("");
                    setError("");
                  }}
                  type="button"
                >
                  <Edit3 size={14} />
                  <span>Edit Profile</span>
                </button>
              ) : (
                <div className="ps-profile-actions">
                  <button
                    className="ps-profile-cancel-btn"
                    onClick={handleCancel}
                    type="button"
                  >
                    <X size={14} />
                    <span>Cancel</span>
                  </button>

                  <button
                    className="ps-profile-save-btn"
                    onClick={handleSave}
                    disabled={saving}
                    type="button"
                  >
                    <Save size={14} />

                    <span>
                      {saving
                        ? "Saving..."
                        : "Save"}
                    </span>
                  </button>
                </div>
              )}
            </div>

            <form
              className="ps-profile-card-body"
              onSubmit={handleSave}
            >
              <div className="ps-profile-field-grid">
                <div className="ps-profile-field">
                  <div className="ps-profile-field-label">
                    <User size={13} />
                    <span>Username</span>
                  </div>

                  <div className="ps-profile-field-value">
                    {profile.username ||
                      "Not provided"}
                  </div>
                </div>

                <div className="ps-profile-field">
                  <div className="ps-profile-field-label">
                    <Shield size={13} />
                    <span>Role</span>
                  </div>

                  <div className="ps-profile-field-value">
                    <span
                      style={{
                        textTransform:
                          "capitalize",
                      }}
                    >
                      {profile.role ||
                        "Patient"}
                    </span>
                  </div>
                </div>

                <div className="ps-profile-field">
                  <div className="ps-profile-field-label">
                    <Mail size={13} />
                    <span>Email</span>
                  </div>

                  {editing ? (
                    <input
                      name="email"
                      type="email"
                      value={form.email}
                      onChange={
                        handleChange
                      }
                    />
                  ) : (
                    <div className="ps-profile-field-value">
                      {profile.email ||
                        "Not provided"}
                    </div>
                  )}
                </div>

                <div className="ps-profile-field">
                  <div className="ps-profile-field-label">
                    <Phone size={13} />
                    <span>Phone Number</span>
                  </div>

                  {editing ? (
                    <input
                      name="phone_number"
                      type="tel"
                      value={
                        form.phone_number
                      }
                      onChange={
                        handleChange
                      }
                    />
                  ) : (
                    <div className="ps-profile-field-value">
                      {profile.phone_number ||
                        "Not provided"}
                    </div>
                  )}
                </div>

                <div className="ps-profile-field full">
                  <div className="ps-profile-field-label">
                    <Calendar size={13} />
                    <span>Date of Birth</span>
                  </div>

                  {editing ? (
                    <input
                      name="date_of_birth"
                      type="date"
                      className="ps-profile-date-input"
                      value={
                        form.date_of_birth ||
                        ""
                      }
                      onChange={
                        handleChange
                      }
                    />
                  ) : (
                    <div className="ps-profile-field-value">
                      {profile.date_of_birth ||
                        "Not provided"}
                    </div>
                  )}
                </div>
              </div>

              <div className="ps-security-note">
                <Lock size={13} />

                <span>
                  Your profile information is
                  securely managed through PillSync.
                </span>
              </div>
            </form>
          </div>
        </div>
      </div>
    </div>
  );
};

export default Profile;
