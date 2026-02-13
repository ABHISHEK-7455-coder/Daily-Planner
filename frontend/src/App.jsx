import React from "react";
import { Routes, Route } from "react-router-dom";
import Today from "./pages/Today";
import Home from "./pages/Home";
import Header from "./components/Header";

export default function App() {
  // const today = new Date().toISOString().slice(0, 10);

  return (
    <>
      <Routes>
        <Route path="/" element={<Home />} />
        <Route path="/day/:date" element={
          <>
            {/* <Header /> */}
            <Today />
          </>
        } />
      </Routes>
    </>
  );
}
