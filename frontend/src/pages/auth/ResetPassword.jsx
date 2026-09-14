import React, { useEffect, useState } from "react";
import { useNavigate, useSearchParams } from "react-router-dom";
import "./ResetPassword.css";
import authService from "../../services/authService";

function ResetPassword() {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();

  const uid = searchParams.get("uid");
  const token = searchParams.get("token");

  const [newPassword, setNewPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (!uid || !token) {
      console.warn("Reset page opened without uid/token.");
    }
  }, [uid, token]);

  const handleReset = async (e) => {
    e.preventDefault();

    if (!uid || !token) {
      alert("Invalid or expired reset link.");
      return;
    }

    if (!newPassword.trim() || !confirmPassword.trim()) {
      alert("Please enter both passwords.");
      return;
    }

    if (newPassword !== confirmPassword) {
      alert("Passwords do not match.");
      return;
    }

    if (newPassword.length < 8) {
      alert("Password must contain at least 8 characters.");
      return;
    }

    setLoading(true);

    try {
      const response = await authService.resetPassword(
        uid,
        token,
        newPassword,
        confirmPassword
      );

      alert(
        response?.message ||
          "Password reset successfully. You can now log in."
      );

      navigate("/login", { replace: true });
    } catch (error) {
      console.error("Reset password error:", error);

      const errorData = error?.response?.data;

      let message =
        errorData?.error ||
        errorData?.detail ||
        errorData?.message ||
        "Password reset failed.";

      if (typeof errorData === "object" && !message) {
        message = Object.values(errorData).flat().join(" ");
      }

      alert(message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="reset-container">
      <h1>PillSync</h1>

      <h2>Reset Password</h2>

      <p className="reset-info">
        Enter your new password below.
      </p>

      <form onSubmit={handleReset}>
        <label>New Password</label>

        <input
          type="password"
          placeholder="Enter new password"
          value={newPassword}
          onChange={(e) => setNewPassword(e.target.value)}
          disabled={loading}
        />

        <label>Confirm Password</label>

        <input
          type="password"
          placeholder="Re-enter new password"
          value={confirmPassword}
          onChange={(e) => setConfirmPassword(e.target.value)}
          disabled={loading}
        />

        <button type="submit" disabled={loading}>
          {loading ? "Changing Password..." : "Reset Password"}
        </button>
      </form>

      <p>
        Go back to{" "}
        <span
          className="login-link"
          onClick={() => navigate("/login")}
        >
          Login
        </span>
      </p>
    </div>
  );
}

export default ResetPassword;