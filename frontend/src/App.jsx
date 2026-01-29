import React from "react";
import { Routes, Route, Navigate } from "react-router-dom";
import Today from "./pages/Today";

export default function App() {
  const today = new Date().toISOString().slice(0, 10);

  return (
    <Routes>
      <Route path="/" element={<Navigate to={`/day/${today}`} />} />
      <Route path="/day/:date" element={<Today />} />
    </Routes>
  );
}
