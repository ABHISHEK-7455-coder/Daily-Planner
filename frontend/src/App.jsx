
// import React from "react";
// import { Routes, Route, Navigate } from "react-router-dom";
// // import { AuthProvider } from "./context/AuthContext";
// import ProtectedRoute from "./components/ProtectedRoute";
// import Today from "./pages/Today";
// import Home from "./pages/Home";
// import Login from "./pages/Login";
// import { AuthProvider } from "./Context/Authcontext";

// export default function App() {
//   return (
//     <AuthProvider>
//       <Routes>
//         {/* Public route */}
//         <Route path="/login" element={<Login />} />

//         {/* Protected routes */}
//         <Route
//           path="/"
//           element={
//             <ProtectedRoute>
//               <Home />
//             </ProtectedRoute>
//           }
//         />
//         <Route
//           path="/day/:date"
//           element={
//             <ProtectedRoute>
//               <Today />
//             </ProtectedRoute>
//           }
//         />

//         {/* Fallback */}
//         <Route path="*" element={<Navigate to="/" replace />} />
//       </Routes>
//     </AuthProvider>
//   );
// }
// App.jsx — Convex version
// ONLY CHANGE: wrap <AuthProvider> inside <ConvexAuthProvider>
// which is now in main.jsx (your vite entry point)
// So AuthProvider no longer needs to do anything special —
// this file is ACTUALLY UNCHANGED from your current App.jsx.
// I'm including it only to confirm zero changes needed.

import React from "react";
import { Routes, Route, Navigate } from "react-router-dom";
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