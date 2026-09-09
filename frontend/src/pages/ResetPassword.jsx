import React, { useState } from "react";
import { useNavigate, useSearchParams } from "react-router-dom";
import "./ResetPassword.css";

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

        // Check URL values
        if (!uid || !token) {
            alert("Invalid or expired reset link.");
            return;
        }

        // Check password fields
        if (!newPassword.trim() || !confirmPassword.trim()) {
            alert("Please enter both passwords");
            return;
        }

        // Check password match
        if (newPassword !== confirmPassword) {
            alert("Passwords do not match");
            return;
        }

        // Password length
        if (newPassword.length < 8) {
            alert("Password must contain at least 8 characters");
            return;
        }

        setLoading(true);

        try {
            const response = await fetch(
                "http://127.0.0.1:8000/api/users/reset-password/",
                {
                    method: "POST",
                    headers: {
                        "Content-Type": "application/json",
                    },
                    body: JSON.stringify({
                        uid: uid,
                        token: token,
                        new_password: newPassword,
                        confirm_password: confirmPassword,
                    }),
                }
            );

            const data = await response.json();

            if (response.ok) {
                alert("Password changed successfully!");

                // Go to Login page
                navigate("/");
            } else {
                alert(data.message || data.detail || "Password reset failed");
            }
        } catch (error) {
            console.error("Reset password error:", error);
            alert(
                "Unable to connect to server. Please make sure Django server is running."
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

                <label>
                    New Password
                </label>

                <input
                    type="password"
                    placeholder="Enter new password"
                    value={newPassword}
                    onChange={(e) => setNewPassword(e.target.value)}
                />

                <label>
                    Confirm Password
                </label>

                <input
                    type="password"
                    placeholder="Re-enter new password"
                    value={confirmPassword}
                    onChange={(e) => setConfirmPassword(e.target.value)}
                />

                <button
                    type="submit"
                    disabled={loading}
                >
                    {loading ? "Changing Password..." : "Reset Password"}
                </button>

            </form>

            <p>
                Go back to{" "}
                <span
                    className="login-link"
                    onClick={() => navigate("/")}
                >
                    Login
                </span>
            </p>

        </div>
    );
}

export default ResetPassword;