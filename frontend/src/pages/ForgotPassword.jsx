import React, { useState } from "react";
import { useNavigate } from "react-router-dom";
import "./ForgotPassword.css";

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

            const response = await fetch(
                "http://127.0.0.1:8000/api/users/forgot-password/",
                {
                    method: "POST",

                    headers: {
                        "Content-Type": "application/json",
                    },

                    body: JSON.stringify({
                        email: email,
                    }),
                }
            );

            const data = await response.json();

            if (response.ok) {

                setMessage(
                    data.message ||
                    "Password reset link sent to your email."
                );

                setEmail("");

            } else {

                setError(
                    data.error ||
                    data.email ||
                    "Password reset failed."
                );
            }

        } catch (error) {

            console.error("Forgot password error:", error);

            setError(
                "Unable to connect to server. Please make sure Django server is running."
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

                <button
                    type="submit"
                    disabled={loading}
                >

                    {loading
                        ? "Sending..."
                        : "Send Reset Link"
                    }

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