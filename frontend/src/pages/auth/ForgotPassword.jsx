import React, { useState } from "react";
import { Link } from "react-router-dom";
import authService from "../../services/authService";

const ForgotPassword = () => {
  const [email, setEmail] = useState("");
  const [submitted, setSubmitted] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  const handleSubmit = async (e) => {
    e.preventDefault();

    setError("");
    setLoading(true);

    try {
      await authService.forgotPassword(email);

      setSubmitted(true);
    } catch (err) {
      console.error("Forgot password failed:", err);

      setError(
        err.response?.data?.detail ||
        err.response?.data?.message ||
        "Something went wrong. Please try again."
      );
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
            <div className="auth-brand-name">
              PillSync
            </div>

            <div className="auth-brand-tagline">
              Medication management made simple
            </div>
          </div>
        </div>

        <h1 className="auth-title">
          Forgot your password?
        </h1>

        <p className="auth-subtitle">
          Enter your email and we'll send you a
          link to reset your password.
        </p>

        {error && (
          <div className="auth-error" role="alert">
            {error}
          </div>
        )}

        {submitted ? (
          <div className="auth-success">
            <strong>Check your inbox</strong>

            <br />

            If an account exists for{" "}
            <strong>{email}</strong>, a reset
            link has been sent.
          </div>
        ) : (
          <form
            onSubmit={handleSubmit}
            className="auth-form"
          >
            <label className="auth-label">
              Email Address

              <input
                type="email"
                value={email}
                onChange={(e) =>
                  setEmail(e.target.value)
                }
                required
                autoComplete="email"
                placeholder="you@example.com"
                disabled={loading}
              />
            </label>

            <button
              type="submit"
              className="auth-btn"
              disabled={loading}
            >
              {loading
                ? "Sending..."
                : "Send Reset Link"}
            </button>
          </form>
        )}

        <p className="auth-footer">
          Remembered your password?{" "}
          <Link to="/login">
            Back to login
          </Link>
        </p>

      </div>
    </div>
  );
};

export default ForgotPassword;
