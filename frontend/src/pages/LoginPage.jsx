import { useState } from "react";
import { useNavigate, useParams } from "react-router-dom";
import Navbar from "../components/Navbar";
import Field from "../components/Field";
import Button from "../components/Button";
import { useAuth } from "../context/AuthContext";

const LoginPage = () => {
  const { role } = useParams();
  const navigate = useNavigate();
  const { loginUser } = useAuth();

  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  const handleLogin = async () => {
    setError("");

    if (!email.trim()) {
      setError("Please enter your email address.");
      return;
    }

    if (password.length < 8) {
      setError("Password must be at least 8 characters.");
      return;
    }

    setLoading(true);

    try {
      const data = await loginUser({ email, password, role });
      navigate(`/dashboard/${data.role}`);
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  const title = (role || "User").charAt(0).toUpperCase() + (role || "user").slice(1);

  return (
    <>
      <Navbar />

      <div className="login-page" style={{ display: "grid", placeItems: "center", minHeight: "85vh", padding: 20 }}>
        <div className="login-card glass-card" style={{ width: "100%", maxWidth: 440, padding: 36 }}>
          <div className="login-card__head" style={{ textAlign: "center", marginBottom: 28 }}>
            <span className="login-card__badge" style={{ fontSize: 36, display: "inline-block", marginBottom: 12 }}>🔐</span>
            <h1 className="gradient-text" style={{ fontSize: "1.8rem", marginBottom: 8 }}>{title} Sign In</h1>
            <p className="login-card__sub" style={{ color: "var(--text-sub)", fontSize: "0.92rem" }}>
              Access your synchronized {role} account dashboard
            </p>
          </div>

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

          <div style={{ marginTop: 16 }}>
            <Field
              label="Password"
              name="password"
              type="password"
              placeholder="Enter your password"
              autoComplete="current-password"
              required
              value={password}
              onChange={(e) => setPassword(e.target.value)}
            />
          </div>

          {error && <p className="error-message" style={{ color: "var(--danger)", marginTop: 12, fontSize: "0.88rem" }}>{error}</p>}

          <div style={{ marginTop: 24 }}>
            <Button
              text={loading ? "Authenticating & Syncing…" : "Sign In"}
              onClick={handleLogin}
              disabled={loading}
            />
          </div>

          <p className="register-text" style={{ textAlign: "center", marginTop: 20, color: "var(--text-sub)", fontSize: "0.9rem" }}>
            Don't have an account?{" "}
            <span
              onClick={() => navigate(`/register/${role}`)}
              style={{ color: "var(--primary-light)", cursor: "pointer", fontWeight: 600 }}
            >
              Register here
            </span>
          </p>
        </div>
      </div>
    </>
  );
};

export default LoginPage;