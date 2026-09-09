import { BrowserRouter, Routes, Route } from "react-router-dom";

import Login from "../pages/Login";
import Register from "../pages/Register";
import Dashboard from "../pages/Dashboard";
import AddMedicine from "../pages/AddMedicine";
import MedicineList from "../pages/MedicineList";
import EditMedicine from "../pages/EditMedicine";
import Profile from "../pages/Profile";
import Analytics from "../pages/Analytics";
import Notifications from "../pages/Notifications";
import ForgotPassword from "../pages/ForgotPassword";
import ResetPassword from "../pages/ResetPassword";
import Logout from "../pages/Logout";
import MedicationManagement from "../pages/MedicationManagement";
import ProtectedRoute from "../components/ProtectedRoute";

function AppRoutes() {
    return (
        <BrowserRouter>

            <Routes>

                {/* Authentication */}

                <Route
                    path="/"
                    element={<Login />}
                />

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


                {/* Dashboard */}

                <Route
                    path="/dashboard"
                    element={<Dashboard />}
                />


                {/* Medicine Management */}

                <Route
                    path="/addmedicine"
                    element={<AddMedicine />}
                />

                <Route
                    path="/medicinelist"
                    element={<MedicineList />}
                />

                <Route
                    path="/editmedicine"
                    element={<EditMedicine />}
                />


                {/* User */}

                <Route
                    path="/profile"
                    element={<Profile />}
                />


                {/* Analytics */}

                <Route
                    path="/analytics"
                    element={<Analytics />}
                />


                {/* Module 8 - Notifications */}

                <Route
                    path="/notifications"
                    element={<Notifications />}
                />


                {/* Logout */}

                <Route
                    path="/logout"
                    element={<Logout />}
                />

                <Route
                    path="/medications"
                    element={
                        <ProtectedRoute>
                            <MedicationManagement />
                        </ProtectedRoute>
                    }
                />

            </Routes>

        </BrowserRouter>
    );
}

export default AppRoutes;