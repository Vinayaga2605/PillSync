import React, { useState } from "react";
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

  const handleReset = async (e) => {
    e.preventDefault();

    if (!uid || !token) {
      alert("Invalid or expired reset link.");
      return;
    }

    if (!newPassword.trim() || !confirmPassword.trim()) {
      alert("Please enter both passwords");
      return;
    }

    if (newPassword !== confirmPassword) {
      alert("Passwords do not match");
      return;
    }

    if (newPassword.length < 8) {
      alert("Password must contain at least 8 characters");
      return;
    }

    setLoading(true);

    try {
      await authService.resetPassword(token, newPassword);

      alert("Password changed successfully!");
      navigate("/login");
    } catch (error) {
      console.error("Reset password error:", error);

      alert(
        error?.response?.data?.detail ||
          error?.response?.data?.message ||
          "Password reset failed"
      );
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
        />

        <label>Confirm Password</label>

        <input
          type="password"
          placeholder="Re-enter new password"
          value={confirmPassword}
          onChange={(e) => setConfirmPassword(e.target.value)}
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



