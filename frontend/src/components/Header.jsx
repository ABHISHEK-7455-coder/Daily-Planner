import { useState } from "react";
import "./Header.css";
import Sidebar from "./Sidebar";
import AlarmPlanner from "./AlarmPlanner";

export default function Header(props) {
    const [openTasks, setOpenTasks] = useState(false);
    const [openAlarm, setOpenAlarm] = useState(false); // ✅ NEW
    const [menuOpen, setMenuOpen] = useState(false);

    const toggleMenu = () => setMenuOpen(prev => !prev);

    const toggleTasks = () => {
        setOpenTasks(prev => !prev);
        setOpenAlarm(false); // ek time par ek hi open rahe
        setMenuOpen(false);
    };

    const toggleAlarm = () => {
        setOpenAlarm(prev => !prev);
        setOpenTasks(false);
        setMenuOpen(false);
    };

    const closeAll = () => {
        setOpenTasks(false);
        setOpenAlarm(false);
    };


    return (
        <header className="home-header">
            <div className="home-topbar">
                <div className="home-logo">
                    <div className="logo-icon">
                        <i className="fa-solid fa-calendar-check"></i>
                    </div>
                    <span className="logo-text">Cozy Space</span>
                </div>

                {/* Hamburger */}
                <button className={`hamburger ${menuOpen ? "active" : ""}`} onClick={toggleMenu}>
                    <span></span>
                    <span></span>
                    <span></span>
                </button>
            </div>

            {/* ✅ DOWNWARD DROPDOWN */}
            <div className={`nav-dropdown ${menuOpen ? "open" : ""}`}>
                <button className="nav-link" onClick={toggleTasks}>
                    <i className="fa-solid fa-crosshairs"></i> TASKS
                </button>

                <button className="nav-link" onClick={toggleAlarm}>
                    <i className="fa-solid fa-clock"></i> ALARM
                </button>

                <button className="nav-link">
                    <i className="fa-solid fa-gear"></i> Settings
                </button>

                <button className="nav-icon">
                    <i className="fa-solid fa-bell"></i>
                </button>

                <div className="nav-avatar">
                    <i className="fa-solid fa-user"></i>
                </div>
            </div>

            {openTasks && <Sidebar {...props} asDropdown onClose={closeAll} />}
            {openAlarm && (
                <div className="alarm-dropdown">
                    <Alarm onClose={closeAll} />
                </div>
            )}
        </header>

    );
}
