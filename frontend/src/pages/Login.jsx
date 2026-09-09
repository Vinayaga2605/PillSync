import React, { useState } from "react";
import { useNavigate } from "react-router-dom";
import axios from "axios";
import "./Login.css";

function Login() {
    const navigate = useNavigate();

    const [loginInput, setLoginInput] = useState("");
    const [password, setPassword] = useState("");
    const [error, setError] = useState("");
    const [loading, setLoading] = useState(false);

    const handleLogin = async (e) => {
        e.preventDefault();

        setError("");
        setLoading(true);

        try {
            const response = await axios.post(
                "http://127.0.0.1:8000/api/users/login/",
                {
                    login: loginInput,
                    password: password,
                }
            );

            console.log("Login response:", response.data);

            localStorage.setItem(
                "accessToken",
                response.data.access
            );

            localStorage.setItem(
                "refreshToken",
                response.data.refresh
            );

            localStorage.setItem(
                "username",
                response.data.username
            );

            localStorage.setItem(
                "email",
                response.data.email
            );

            navigate("/dashboard");

        } catch (error) {

            console.log("Login error:", error);

            if (error.response) {
                setError(
                    error.response.data.message ||
                    error.response.data.error ||
                    error.response.data.detail ||
                    "Invalid username/email or password."
                );
            } else {
                setError(
                    "Unable to connect to the server."
                );
            }

        } finally {
            setLoading(false);
        }
    };

    return (
        <div className="login-container">

            <div className="login-card">

                <h1>💊 PillSync</h1>

                <h2>Login</h2>

                {error && (
                    <div className="error-message">
                        {error}
                    </div>
                )}

                <form onSubmit={handleLogin}>

                    <div className="form-group">

                        <label>
                            Email or Username
                        </label>

                        <input
                            type="text"
                            placeholder="Enter email or username"
                            value={loginInput}
                            onChange={(e) =>
                                setLoginInput(e.target.value)
                            }
                            required
                        />

                    </div>

                    <div className="form-group">

                        <label>
                            Password
                        </label>

                        <input
                            type="password"
                            placeholder="Enter password"
                            value={password}
                            onChange={(e) =>
                                setPassword(e.target.value)
                            }
                            required
                        />

                    </div>

                    <button
                        type="submit"
                        disabled={loading}
                    >
                        {loading
                            ? "Logging in..."
                            : "Login"
                        }
                    </button>

                </form>

                <p>
                    Don't have an account?{" "}

                    <span
                        onClick={() =>
                            navigate("/register")
                        }
                        style={{
                            cursor: "pointer",
                            color: "blue"
                        }}
                    >
                        Register
                    </span>
                </p>

                <p>
                    <span
                        onClick={() =>
                            navigate("/forgot-password")
                        }
                        style={{
                            cursor: "pointer",
                            color: "blue"
                        }}
                    >
                        Forgot Password?
                    </span>
                </p>

            </div>

        </div>
    );
}

export default Login;