import React, { useState, useContext } from "react";
import { useNavigate, Link } from "react-router-dom";
import { AuthContext } from "../../context/AuthContext";
import { Pill, Lock, User, AlertCircle, Loader2, Eye, EyeOff } from "lucide-react";
import ThemeToggle from "../../components/common/ThemeToggle";

const Login = () => {
const auth = useContext(AuthContext);
const navigate = useNavigate();

const [username, setUsername] = useState("");
const [password, setPassword] = useState("");
const [showPassword, setShowPassword] = useState(false);
const [error, setError] = useState("");
const [loading, setLoading] = useState(false);

const handleSubmit = async (e) => {
e.preventDefault();
setError("");


if (!username.trim() || !password) {
  setError("Please enter both username and password.");
  return;
}

if (!auth || typeof auth.login !== "function") {
  setError("Authentication is not configured correctly.");
  return;
}

setLoading(true);

try {
  const data = await auth.login(username.trim(), password);

  console.log("Login response:", data);

  const role = data?.user?.role?.toLowerCase();

  if (role === "caregiver") {
    navigate("/caregiver-dashboard", { replace: true });
  } else if (role === "admin") {
    navigate("/admin-panel", { replace: true });
  } else {
    navigate("/patient-dashboard", { replace: true });
  }
} catch (err) {
  console.error("Login failed:", err);

  const message =
    err.response?.data?.detail ||
    err.response?.data?.message ||
    err.response?.data?.error ||
    err.message ||
    "Invalid username or password.";

  setError(message);
} finally {
  setLoading(false);
}


};

return ( <div className="login-page">
{/* Theme Toggle */} <div className="login-theme-toggle"> <ThemeToggle /> </div>


  {/* Left Side */}
  <div className="login-left">
    <div className="login-brand">
      <div className="login-brand-icon">
        <Pill />
      </div>

      <span>PillSync</span>
    </div>

    <div className="login-hero">
      <span className="login-badge">
        Medication Management
      </span>

      <h1>
        Stay on top of your
        <span> health.</span>
      </h1>

      <p>
        Manage your medications, prescriptions and reminders
        effortlessly â€” all in one secure place.
      </p>

      <div className="login-features">
        <div>
          <div className="feature-icon">?</div>
          <div>
            <strong>Smart medication tracking</strong>
            <span>Never miss an important dose.</span>
          </div>
        </div>

        <div>
          <div className="feature-icon">?</div>
          <div>
            <strong>Personalized reminders</strong>
            <span>Stay consistent with your schedule.</span>
          </div>
        </div>

        <div>
          <div className="feature-icon">?</div>
          <div>
            <strong>Secure health management</strong>
            <span>Your information stays protected.</span>
          </div>
        </div>
      </div>
    </div>

    <div className="login-left-footer">
      (c) {new Date().getFullYear()} PillSync
    </div>
  </div>

  {/* Right Side */}
  <div className="login-right">
    <div className="login-card">

      <div className="mobile-brand">
        <div className="login-brand-icon">
          <Pill />
        </div>
        <span>PillSync</span>
      </div>

      <div className="login-header">
        <h2>Welcome back</h2>
        <p>
          Sign in to continue to your PillSync account
        </p>
      </div>

      {error && (
        <div className="login-error" role="alert">
          <AlertCircle />
          <span>{error}</span>
        </div>
      )}

      <form onSubmit={handleSubmit} className="login-form">

        {/* Username */}
        <div className="login-field">
          <label htmlFor="username">
            Username
          </label>

          <div className="login-input-wrapper">
            <User />

            <input
              id="username"
              type="text"
              autoComplete="username"
              value={username}
              onChange={(e) => setUsername(e.target.value)}
              placeholder="Enter your username"
              required
            />
          </div>
        </div>

        {/* Password */}
        <div className="login-field">
          <div className="login-label-row">
            <label htmlFor="password">
              Password
            </label>

            <Link to="/forgot-password">
              Forgot password?
            </Link>
          </div>

          <div className="login-input-wrapper">
            <Lock />

            <input
              id="password"
              type={showPassword ? "text" : "password"}
              autoComplete="current-password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              placeholder="Enter your password"
              required
            />

            <button
              type="button"
              className="password-toggle"
              onClick={() =>
                setShowPassword((prev) => !prev)
              }
              aria-label={
                showPassword
                  ? "Hide password"
                  : "Show password"
              }
            >
              {showPassword ? (
                <EyeOff />
              ) : (
                <Eye />
              )}
            </button>
          </div>
        </div>

        {/* Login Button */}
        <button
          type="submit"
          className="login-submit"
          disabled={loading}
        >
          {loading ? (
            <>
              <Loader2 className="spin" />
              Signing in...
            </>
          ) : (
            "Sign in"
          )}
        </button>
      </form>

      <div className="login-divider">
        <span>New to PillSync?</span>
      </div>

      <Link
        to="/register"
        className="login-register"
      >
        Create an account
      </Link>

      <p className="login-security">
        Your data is protected with secure authentication.
      </p>
    </div>
  </div>
</div>

);
};

export default Login;




