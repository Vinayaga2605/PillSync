import React from "react";
import { BrowserRouter, Routes, Route, Navigate } from "react-router-dom";

// Module 1
import Login from "./pages/Login";
import Register from "./pages/Register";
import ForgotPassword from "./pages/ForgotPassword";
import ResetPassword from "./pages/ResetPassword";
import Logout from "./pages/Logout";
import Dashboard from "./pages/Dashboard";

// Module 8
import Notifications from "./pages/Notifications";

function App() {
    return (
        <BrowserRouter>
            <Routes>

                {/* Default */}
                <Route
                    path="/"
                    element={<Navigate to="/login" replace />}
                />

                {/* Module 1 */}
                <Route
                    path="/login"
                    element={<Login />}
                />

                <Route
                    path="/register"
                    element={<Register />}
                />

                <Route
                    path="/forgot-password"
                    element={<ForgotPassword />}
                />

                <Route
                    path="/reset-password"
                    element={<ResetPassword />}
                />

                <Route
                    path="/logout"
                    element={<Logout />}
                />

                {/* Dashboard */}
                <Route
                    path="/dashboard"
                    element={<Dashboard />}
                />

                {/* Module 8 */}
                <Route
                    path="/notifications"
                    element={<Notifications />}
                />

                {/* Unknown page */}
                <Route
                    path="*"
                    element={<Navigate to="/login" replace />}
                />

            </Routes>
        </BrowserRouter>
    );
}

export default App;