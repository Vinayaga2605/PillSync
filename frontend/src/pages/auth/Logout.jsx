import React from "react";
import { useNavigate } from "react-router-dom";
import "./Logout.css";
import authService from "../../services/authService";

function Logout() {
  const navigate = useNavigate();

  const handleLogin = () => {
    authService.logout();
    navigate("/login");
  };

  return (
    <div className="logout-container">
      <h1>PillSync</h1>

      <h2>You have been logged out</h2>

      <p>
        Thank you for using PillSync Medicine Reminder System
      </p>

      <button onClick={handleLogin}>
        Back to Login
      </button>
    </div>
  );
}

export default Logout;



