import React, { useContext } from "react";
import { Navigate } from "react-router-dom";
import { AuthContext } from "../../context/AuthContext";

const ProtectedRoute = ({ children, allowedRoles }) => {
  const { user, loading } = useContext(AuthContext);

  if (loading) {
    return (
      <div className="dashboard-loading">
        <div className="spinner" />
        <p>Loading...</p>
      </div>
    );
  }

  if (!user) {
    return <Navigate to="/login" replace />;
  }

  const role = user.role?.toLowerCase();

  if (allowedRoles && !allowedRoles.includes(role)) {
    if (role === "patient") {
      return <Navigate to="/patient-dashboard" replace />;
    }

    if (role === "caregiver") {
      return <Navigate to="/caregiver-dashboard" replace />;
    }

    if (role === "admin") {
      return <Navigate to="/admin-panel" replace />;
    }

    return <Navigate to="/login" replace />;
  }

  return children;
};

export default ProtectedRoute;
