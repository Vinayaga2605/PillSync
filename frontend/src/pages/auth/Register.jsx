import React, { useState } from "react";
import { useNavigate } from "react-router-dom";
import "./Register.css";
import authService from "../../services/authService";

function Register() {
  const navigate = useNavigate();

  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  const handleRegister = async (e) => {
    e.preventDefault();

    setError("");

    if (!name || !email || !password) {
      setError("Please fill all fields.");
      return;
    }

    try {
      setLoading(true);

      await authService.register({
        username: email,
        email: email,
        password: password,
        first_name: name,
      });

      alert("Registration Successful");
      navigate("/login");
    } catch (error) {
      console.error("Registration error:", error);

      const data = error?.response?.data;

      setError(
        data?.detail ||
          data?.message ||
          data?.username?.[0] ||
          data?.email?.[0] ||
          data?.password?.[0] ||
          "Registration failed. Please try again."
      );
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="register-container">
      <h1>PillSync</h1>

      <h2>Create Account</h2>

      {error && (
        <div
          className="error-message"
          style={{
            color: "red",
            marginBottom: "12px",
          }}
        >
          {error}
        </div>
      )}

      <form onSubmit={handleRegister}>
        <label>Name</label>

        <input
          type="text"
          placeholder="Enter your name"
          value={name}
          onChange={(e) => setName(e.target.value)}
          required
        />

        <label>Email</label>

        <input
          type="email"
          placeholder="Enter your email"
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          required
        />

        <label>Password</label>

        <input
          type="password"
          placeholder="Create password"
          value={password}
          onChange={(e) => setPassword(e.target.value)}
          required
        />

        <button type="submit" disabled={loading}>
          {loading ? "Registering..." : "Register"}
        </button>
      </form>

      <p>
        Already have an account?

        <span
          onClick={() => navigate("/login")}
          className="login-link"
        >
          Login
        </span>
      </p>
    </div>
  );
}

export default Register;



