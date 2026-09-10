import React, { useState } from "react";
import { useNavigate } from "react-router-dom";
import "./ForgotPassword.css";
import authService from "../../services/authService";

function ForgotPassword() {
  const [email, setEmail] = useState("");
  const [message, setMessage] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  const navigate = useNavigate();

  const handleReset = async (e) => {
    e.preventDefault();

    setMessage("");
    setError("");

    if (!email) {
      setError("Please enter your email");
      return;
    }

    setLoading(true);

    try {
      const response = await authService.forgotPassword(email);

      setMessage(
        response?.message ||
          "Password reset link sent to your email."
      );

      setEmail("");
    } catch (error) {
      console.error("Forgot password error:", error);

      const data = error?.response?.data;

      setError(
        data?.detail ||
          data?.message ||
          data?.email?.[0] ||
          "Password reset failed."
      );
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="forgot-container">
      <h1>PillSync</h1>

      <h2>Forgot Password</h2>

      <p>
        Enter your registered email to reset your password
      </p>

      <form onSubmit={handleReset}>
        <input
          type="email"
          placeholder="Enter your email"
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          required
        />

        <button type="submit" disabled={loading}>
          {loading ? "Sending..." : "Send Reset Link"}
        </button>
      </form>

      {message && (
        <p className="success-message">
          {message}
        </p>
      )}

      {error && (
        <p className="error-message">
          {error}
        </p>
      )}

      <p>
        Remember your password?{" "}
        <span
          className="back-login"
          onClick={() => navigate("/login")}
        >
          Login
        </span>
      </p>
    </div>
  );
}

export default ForgotPassword;



