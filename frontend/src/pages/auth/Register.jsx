import React, { useState, useContext } from "react";
import { useNavigate, Link } from "react-router-dom";
import { AuthContext } from "../../context/AuthContext";
import authService from "../../services/authService";

const Register = () => {
  const { setUser } = useContext(AuthContext);
  const navigate = useNavigate();

  const [form, setForm] = useState({
    username: "",
    email: "",
    password: "",
    role: "patient",
    phone_number: "",
  });

  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  const handleChange = (e) => {
    const { name, value } = e.target;

    setForm((prev) => ({
      ...prev,
      [name]: value,
    }));
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError("");

    if (form.password.length < 6) {
      setError("Password must be at least 6 characters.");
      return;
    }

    setLoading(true);

    try {
      const data = await authService.register(form);

      setUser(data.user);

      if (data.user?.role === "caregiver") {
        navigate("/caregiver-dashboard");
      } else {
        navigate("/patient-dashboard");
      }
    } catch (err) {
      console.error("Registration failed:", err);

      const detail =
        err.response?.data?.username?.[0] ||
        err.response?.data?.email?.[0] ||
        err.response?.data?.password?.[0] ||
        err.response?.data?.phone_number?.[0] ||
        err.response?.data?.detail ||
        "Registration failed. Please check your details.";

      setError(detail);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="auth-page">
      <div className="auth-card">

        <div className="auth-brand">
          <div className="auth-brand-icon">
            <span>💊</span>
          </div>

          <div>
            <div className="auth-brand-name">PillSync</div>
            <div className="auth-brand-tagline">
              Medication management made simple
            </div>
          </div>
        </div>

        <h1 className="auth-title">
          Create your account
        </h1>

        <p className="auth-subtitle">
          Start managing your medications with PillSync
        </p>

        {error && (
          <div className="auth-error" role="alert">
            {error}
          </div>
        )}

        <form
          onSubmit={handleSubmit}
          className="auth-form"
        >

          <label className="auth-label">
            Username

            <input
              type="text"
              name="username"
              value={form.username}
              onChange={handleChange}
              required
              autoComplete="username"
              placeholder="Choose a username"
              disabled={loading}
            />
          </label>

          <label className="auth-label">
            Email

            <input
              type="email"
              name="email"
              value={form.email}
              onChange={handleChange}
              autoComplete="email"
              placeholder="you@example.com"
              disabled={loading}
            />
          </label>

          <label className="auth-label">
            Password

            <input
              type="password"
              name="password"
              value={form.password}
              onChange={handleChange}
              required
              minLength={6}
              autoComplete="new-password"
              placeholder="At least 6 characters"
              disabled={loading}
            />
          </label>

          <label className="auth-label">
            Phone Number

            <input
              type="tel"
              name="phone_number"
              value={form.phone_number}
              onChange={handleChange}
              autoComplete="tel"
              placeholder="Optional"
              disabled={loading}
            />
          </label>

          <label className="auth-label">
            I am a

            <select
              name="role"
              value={form.role}
              onChange={handleChange}
              disabled={loading}
            >
              <option value="patient">
                Patient
              </option>

              <option value="caregiver">
                Caregiver
              </option>
            </select>
          </label>

          <button
            type="submit"
            className="auth-btn"
            disabled={loading}
          >
            {loading
              ? "Creating account..."
              : "Create Account"}
          </button>
        </form>

        <p className="auth-footer">
          Already have an account?{" "}
          <Link to="/login">
            Log in
          </Link>
        </p>

      </div>
    </div>
  );
};

export default Register;
