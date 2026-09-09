import React, { useState } from "react";
import {
  useNavigate,
  useSearchParams,
  Link,
} from "react-router-dom";
import authService from "../../services/authService";

const ResetPassword = () => {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();

  const token = searchParams.get("token") || "";

  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] =
    useState("");

  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);
  const [success, setSuccess] = useState(false);

  const handleSubmit = async (e) => {
    e.preventDefault();

    setError("");

    if (password.length < 6) {
      setError(
        "Password must be at least 6 characters."
      );
      return;
    }

    if (password !== confirmPassword) {
      setError("Passwords do not match.");
      return;
    }

    setLoading(true);

    try {
      await authService.resetPassword(
        token,
        password
      );

      setSuccess(true);

      setTimeout(() => {
        navigate("/login");
      }, 2000);
    } catch (err) {
      console.error(
        "Reset password failed:",
        err
      );

      setError(
        err.response?.data?.detail ||
        err.response?.data?.message ||
        "Unable to reset password. The link may have expired."
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
          Reset your password
        </h1>

        <p className="auth-subtitle">
          Choose a new password for your account.
        </p>

        {error && (
          <div className="auth-error" role="alert">
            {error}
          </div>
        )}

        {success ? (
          <div className="auth-success">
            <strong>Password reset successful!</strong>

            <br />

            Redirecting you to the login page...
          </div>
        ) : (
          <form
            onSubmit={handleSubmit}
            className="auth-form"
          >

            <label className="auth-label">
              New Password

              <input
                type="password"
                value={password}
                onChange={(e) =>
                  setPassword(e.target.value)
                }
                required
                minLength={6}
                autoComplete="new-password"
                placeholder="At least 6 characters"
                disabled={loading}
              />
            </label>

            <label className="auth-label">
              Confirm Password

              <input
                type="password"
                value={confirmPassword}
                onChange={(e) =>
                  setConfirmPassword(
                    e.target.value
                  )
                }
                required
                autoComplete="new-password"
                placeholder="Re-enter your password"
                disabled={loading}
              />
            </label>

            <button
              type="submit"
              className="auth-btn"
              disabled={loading}
            >
              {loading
                ? "Resetting..."
                : "Reset Password"}
            </button>

          </form>
        )}

        <p className="auth-footer">
          <Link to="/login">
            Back to login
          </Link>
        </p>

      </div>
    </div>
  );
};

export default ResetPassword;
