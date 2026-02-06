import React from "react";
import { Routes, Route, Navigate } from "react-router-dom";
import Today from "./pages/Today";
import Home from './pages/Home';

export default function App() {
  const today = new Date().toISOString().slice(0, 10);

  return (
    <Routes>
      <Route path="/" element={<Home />} />
      <Route path="/day/:date" element={<Today />} />
      {/* <Route path="/" element={<Navigate to={`/day/${today}`} />} />
      <Route path="/day/:date" element={<Today />} /> */}
    </Routes>
  );
}