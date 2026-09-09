import { useEffect, useState } from "react";
import DashboardLayout from "../components/DashboardLayout";
import Field from "../components/Field";
import Button from "../components/Button";
import { fetchMyAccount, updateMyAccount } from "../services/api";
import { getMenu } from "../utils/menus";
import { useAuth } from "../context/AuthContext";

const ProfilePage = () => {
  const { user, refreshAccount } = useAuth();
  const role = user?.role || "patient";

  const [name, setName] = useState(user?.full_name || "");
  const [email, setEmail] = useState(user?.email || "");
  const [phone, setPhone] = useState(user?.phone || "");
  const [dob, setDob] = useState("");
  const [gender, setGender] = useState("");
  const [bloodGroup, setBloodGroup] = useState("");
  const [emergencyContact, setEmergencyContact] = useState("");

  const [success, setSuccess] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    fetchMyAccount()
      .then((data) => {
        setName(data.full_name || "");
        setEmail(data.email || "");
        setPhone(data.phone || "");
        if (data.profile) {
          setDob(data.profile.dob || "");
          setGender(data.profile.gender || "");
          setBloodGroup(data.profile.blood_group || "");
          setEmergencyContact(data.profile.emergency_contact || "");
        }
      })
      .catch((e) => setError(e.message))
      .finally(() => setLoading(false));
  }, []);

  const saveProfile = async () => {
    setError("");
    setSuccess("");

    if (!name.trim()) {
      setError("Full name is required.");
      return;
    }

    setSaving(true);

    try {
      const payload = { full_name: name.trim(), phone: phone.trim() || null };

      if (role === "patient") {
        payload.dob = dob || null;
        payload.gender = gender || null;
        payload.blood_group = bloodGroup || null;
        payload.emergency_contact = emergencyContact || null;
      }

      await updateMyAccount(payload);
      await refreshAccount();
      setSuccess("Profile saved and synchronized successfully.");
      setTimeout(() => setSuccess(""), 3500);
    } catch (e) {
      setError(e.message);
    } finally {
      setSaving(false);
    }
  };

  return (
    <DashboardLayout
      role={role.charAt(0).toUpperCase() + role.slice(1)}
      title="My Synchronized Profile"
      subtitle="Keep your personal details and contact preferences updated across accounts."
      menu={getMenu(role)}
    >
      <section className="panel glass-card" style={{ padding: 28 }}>
        <div className="panel__head" style={{ marginBottom: 20 }}>
          <h2 className="panel__title gradient-text">Personal & Medical Details</h2>
        </div>

        {loading ? (
          <p className="empty" style={{ color: "var(--text-muted)", padding: 20 }}>Loading profile details…</p>
        ) : (
          <div className="form-grid" style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(240px, 1fr))", gap: 20 }}>
            <Field
              label="Full Name"
              name="name"
              placeholder="Enter your full name"
              autoComplete="name"
              required
              value={name}
              onChange={(e) => setName(e.target.value)}
            />

            <Field
              label="Email Address"
              name="email"
              type="email"
              placeholder="you@example.com"
              autoComplete="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
            />

            <Field
              label="Phone Number"
              name="phone"
              type="tel"
              placeholder="03xx-xxxxxxx"
              autoComplete="tel"
              value={phone}
              onChange={(e) => setPhone(e.target.value)}
            />

            {role === "patient" && (
              <>
                <Field
                  label="Date of Birth"
                  name="dob"
                  type="date"
                  value={dob}
                  onChange={(e) => setDob(e.target.value)}
                />

                <Field
                  label="Gender"
                  name="gender"
                  placeholder="Select gender"
                  options={["Male", "Female", "Other"]}
                  value={gender}
                  onChange={(e) => setGender(e.target.value)}
                />

                <Field
                  label="Blood Group"
                  name="blood_group"
                  placeholder="Select blood group"
                  options={[
                    "A+", "A-", "B+", "B-",
                    "AB+", "AB-", "O+", "O-",
                  ]}
                  value={bloodGroup}
                  onChange={(e) => setBloodGroup(e.target.value)}
                />

                <Field
                  label="Emergency Contact"
                  name="emergency_contact"
                  type="tel"
                  placeholder="03xx-xxxxxxx"
                  autoComplete="tel"
                  value={emergencyContact}
                  onChange={(e) => setEmergencyContact(e.target.value)}
                />
              </>
            )}
          </div>
        )}

        {error && <p className="error-message" style={{ color: "var(--danger)", marginTop: 16 }}>{error}</p>}
        {success && <p className="success-message" style={{ color: "var(--success)", marginTop: 16, fontWeight: 600 }}>{success}</p>}

        {!loading && (
          <div style={{ marginTop: 24 }}>
            <Button
              text={saving ? "Syncing changes…" : "Save Profile"}
              onClick={saveProfile}
              disabled={saving}
            />
          </div>
        )}
      </section>
    </DashboardLayout>
  );
};

export default ProfilePage;