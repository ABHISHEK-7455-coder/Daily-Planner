import { useState } from "react";
import "./Header.css";
import Sidebar from "./Sidebar";
import AlarmPlanner from "./AlarmPlanner";
import { useNavigate } from "react-router-dom";

export default function Header(props) {
    const [openTasks, setOpenTasks] = useState(false);
    const [openAlarm, setOpenAlarm] = useState(false); // ✅ NEW
    
const navigate = useNavigate()
    const toggleTasks = () => {
        setOpenTasks(prev => !prev);
        setOpenAlarm(false); // ek time par ek hi open rahe
        setMenuOpen(false);
    };

    const toggleAlarm = () => {
        setOpenAlarm(prev => !prev);
        setOpenTasks(false);
    };

    const closeAll = () => {
        setOpenTasks(false);
        setOpenAlarm(false);
    };


    return (
        <header className="home-header">
            <div className="home-logo" onClick={()=>navigate("/")}>
                <div className="logo-icon">
                    <i className="fa-solid fa-calendar-check"></i>
                </div>
                <span className="logo-text">Cozy Space</span>
            </div>

            <nav className="home-nav">
                <button className="header-nav-link" onClick={toggleTasks}>
                    <i className="fa-solid fa-crosshairs"></i> TASKS
                </button>

                <button className="header-nav-link" onClick={toggleAlarm}>
                    <i className="fa-solid fa-clock"></i> ALARM
                </button>


                {/* <button className="header-nav-link">
                    <i className="fa-solid fa-gear"></i> Settings
                </button>

                <button className="nav-icon">
                    <i className="fa-solid fa-bell"></i>
                </button>

                <div className="nav-avatar">
                    <i className="fa-solid fa-user"></i>
                </div> */}
            </nav>

            {openTasks && (
                <Sidebar
                    {...props}
                    asDropdown={true}
                    onClose={closeAll}

                />
            )}
            {openAlarm && (
                <div className="alarm-dropdown">
                    <AlarmPlanner onClose={closeAll} />        
                </div>
            )}
        </header>
    );
}