import React from "react";
import { useNavigate } from "react-router-dom";
import "./Dashboard.css";

function Dashboard() {
    const navigate = useNavigate();

    return (
        <div className="dashboard-container">

            {/* Navbar */}
            <nav className="navbar">

                <div className="logo">
                    💊 PillSync
                </div>

                <div className="nav-right">

                    <span className="profile">
                        Welcome, User
                    </span>

                    <button
                        className="logout-btn"
                        onClick={() => navigate("/logout")}
                    >
                        Logout
                    </button>

                </div>

            </nav>


            {/* Welcome Section */}
            <div className="welcome-section">

                <h1>
                    Welcome to PillSync Dashboard
                </h1>

                <p>
                    Smart Medicine Reminder & Health Tracking System
                </p>

            </div>


            {/* Dashboard Cards */}
            <div className="dashboard-cards">


                {/* Add Medicine */}
                <div className="dashboard-card">

                    <div className="icon">
                        💊
                    </div>

                    <h3>
                        Add Medicine
                    </h3>

                    <p>
                        Add new medicines and schedule reminders.
                    </p>

                    <button
                        onClick={() => navigate("/addmedicine")}
                    >
                        Add Medicine
                    </button>

                </div>


                {/* My Medicines */}
                <div className="dashboard-card">

                    <div className="icon">
                        📋
                    </div>

                    <h3>
                        My Medicines
                    </h3>

                    <p>
                        View and manage your medicine list.
                    </p>

                    <button
                        onClick={() => navigate("/medicinelist")}
                    >
                        View Medicines
                    </button>

                </div>


                

                {/* Notifications */}
                <div className="dashboard-card">

                    <div className="icon">
                        🔔
                    </div>

                    <h3>
                        Notifications
                    </h3>

                    <p>
                        View medicine reminders, refill alerts
                        and missed dose notifications.
                    </p>

                    <button
                        onClick={() => navigate("/notifications")}
                    >
                        Open Notifications
                    </button>

                </div>


            </div>


            {/* Health Summary */}
            <div className="summary-box">

                <h2>
                    Today's Summary
                </h2>

                <div className="summary-items">

                    <div>
                        <h3>3</h3>
                        <p>Total Medicines</p>
                    </div>

                    <div>
                        <h3>2</h3>
                        <p>Upcoming Doses</p>
                    </div>

                    <div>
                        <h3>1</h3>
                        <p>Completed</p>
                    </div>

                </div>

            </div>


        </div>
    );
}

export default Dashboard;