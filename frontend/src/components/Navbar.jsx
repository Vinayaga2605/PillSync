import React from "react";
import { useNavigate } from "react-router-dom";
import { logout } from "../services/authService";

function Navbar() {
    const navigate = useNavigate();

    const handleLogout = () => {
        logout();
        localStorage.removeItem("accessToken");
        localStorage.removeItem("refreshToken");
        navigate("/login");
    };

    return (
        <nav
            style={{
                backgroundColor: "#ffffff",
                padding: "15px 25px",
                display: "flex",
                justifyContent: "space-between",
                alignItems: "center",
                borderBottom: "1px solid #ddd",
            }}
        >
            <h2
                style={{
                    margin: 0,
                    cursor: "pointer",
                }}
                onClick={() => navigate("/dashboard")}
            >
                💊 PillSync
            </h2>

            <div
                style={{
                    display: "flex",
                    gap: "10px",
                    alignItems: "center",
                }}
            >
                <button onClick={() => navigate("/dashboard")}>
                    Dashboard
                </button>

                <button onClick={() => navigate("/medicinelist")}>
                    Medicines
                </button>

                <button onClick={() => navigate("/analytics")}>
                    Analytics
                </button>

                <button onClick={() => navigate("/notifications")}>
                    🔔 Notifications
                </button>

                <button onClick={() => navigate("/profile")}>
                    Profile
                </button>

                <button
                    onClick={handleLogout}
                    style={{
                        backgroundColor: "red",
                        color: "white",
                        border: "none",
                        padding: "8px 14px",
                        borderRadius: "5px",
                        cursor: "pointer",
                    }}
                >
                    Logout
                </button>
            </div>
        </nav>
    );
}

export default Navbar;