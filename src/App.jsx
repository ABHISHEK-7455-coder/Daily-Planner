import { useState } from "react";
import Homepage from "./pages/Homepage";
import Today from "./pages/Today";

export default function App() {
  const [currentPage, setCurrentPage] = useState("homepage");

  if (currentPage === "today") {
    return <Today />;
  }

  return <Homepage onNavigateToToday={() => setCurrentPage("today")} />;
}