import React from "react";
import { Navigate } from "react-router-dom";
import { useAuth } from "../Context/Authcontext";
// import { useAuth } from "../../context/AuthContext";

export default function ProtectedRoute({ children }) {
  const { user, loading } = useAuth();

  if (loading) {
    return (
      <div style={{
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        minHeight: "100vh",
        background: "#faf9f7",
        fontFamily: "'Quicksand', sans-serif",
        fontSize: "1rem",
        color: "#9b9b9b",
        gap: "10px"
      }}>
        <div className="auth-spinner" />
        Loading...
      </div>
    );
  }

  if (!user) {
    return <Navigate to="/login" replace />;
  }

  return children;
}