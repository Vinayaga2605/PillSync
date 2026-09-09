import { useState } from "react";
import { useNavigate, useParams } from "react-router-dom";

import Navbar from "../components/Navbar";
import Field from "../components/Field";
import Button from "../components/Button";
import { register } from "../services/api";

const RegisterPage = () => {
  const { role } = useParams();
  const navigate = useNavigate();

  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");

  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");
  const [loading, setLoading] = useState(false);

  const handleRegister = async () => {
    setError("");
    setSuccess("");

    if (name.trim() === "") {
      setError("Please enter your full name.");
      return;
    }

    if (!email.trim()) {
      setError("Please enter your email address.");
      return;
    }

    if (password.length < 8) {
      setError("Password must be at least 8 characters.");
      return;
    }

    if (password !== confirmPassword) {
      setError("Passwords do not match.");
      return;
    }

    setLoading(true);

    try {
      const res = await register({
        full_name: name,
        email,
        password,
        role,
      });

      setSuccess(res.message || "Registration successful!");
      setTimeout(() => navigate(`/login/${role}`), 1500);
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  const title = role.charAt(0).toUpperCase() + role.slice(1);

  return (
    <>
      <Navbar />

      <div className="login-page">
        <div className="login-card">
          <div className="login-card__head">
            <span className="login-card__badge">🎯</span>
            <h1>{title} Registration</h1>
            <p className="login-card__sub">Create your account in seconds</p>
          </div>

          <Field
            label="Full name"
            name="full_name"
            placeholder="Enter your full name"
            autoComplete="name"
            required
            value={name}
            onChange={(e) => setName(e.target.value)}
          />

          <Field
            label="Email address"
            name="email"
            type="email"
            placeholder="you@example.com"
            autoComplete="email"
            required
            value={email}
            onChange={(e) => setEmail(e.target.value)}
          />

          <Field
            label="Password"
            name="password"
            type="password"
            placeholder="At least 8 characters"
            autoComplete="new-password"
            required
            value={password}
            onChange={(e) => setPassword(e.target.value)}
          />

          <Field
            label="Confirm password"
            name="confirm_password"
            type="password"
            placeholder="Re-enter your password"
            autoComplete="new-password"
            required
            value={confirmPassword}
            onChange={(e) => setConfirmPassword(e.target.value)}
          />

          {error && <p className="error-message">{error}</p>}
          {success && <p className="success-message">{success}</p>}

          <Button
            text={loading ? "Creating account…" : "Register"}
            onClick={handleRegister}
            disabled={loading}
          />

          <p className="register-text">
            Already have an account?
            <span onClick={() => navigate(`/login/${role}`)}>Login</span>
          </p>
        </div>
      </div>
    </>
  );
};

export default RegisterPage;