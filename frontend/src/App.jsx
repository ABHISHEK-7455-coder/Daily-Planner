// import React from "react";
// import { Routes, Route, Navigate } from "react-router-dom";
// import Today from "./pages/Today";
// import Home from './pages/Home';

// export default function App() {
//   const today = new Date().toISOString().slice(0, 10);

//   return (
//     <Routes>
//       <Route path="/" element={<Home />} />
//     <Route path="/day/:date" element={<Today />} />
//       {/* <Route path="/" element={<Navigate to={`/day/${today}`} />} />
//       <Route path="/day/:date" element={<Today />} /> */}
//     </Routes>
//   );
// }
import React from "react";
import { Routes, Route, Navigate } from "react-router-dom";
// import { AuthProvider } from "./context/AuthContext";
import ProtectedRoute from "./components/ProtectedRoute";
import Today from "./pages/Today";
import Home from "./pages/Home";
import Login from "./pages/Login";
import { AuthProvider } from "./Context/Authcontext";

export default function App() {
  return (
    <AuthProvider>
      <Routes>
        {/* Public route */}
        <Route path="/login" element={<Login />} />

        {/* Protected routes */}
        <Route
          path="/"
          element={
            <ProtectedRoute>
              <Home />
            </ProtectedRoute>
          }
        />
        <Route
          path="/day/:date"
          element={
            <ProtectedRoute>
              <Today />
            </ProtectedRoute>
          }
        />

        {/* Fallback */}
        <Route path="*" element={<Navigate to="/" replace />} />
      </Routes>
    </AuthProvider>
  );
}