// import { useState } from "react";
// import "./Header.css";
// import Sidebar from "./Sidebar";
// import AlarmPlanner from "./AlarmPlanner";
// import { useNavigate } from "react-router-dom";

// export default function Header(props) {
//     const [openTasks, setOpenTasks] = useState(false);
//     const [openAlarm, setOpenAlarm] = useState(false); // ✅ NEW
    
// const navigate = useNavigate()
//     const toggleTasks = () => {
//         setOpenTasks(prev => !prev);
//         setOpenAlarm(false); // ek time par ek hi open rahe
//         setMenuOpen(false);
//     };

//     const toggleAlarm = () => {
//         setOpenAlarm(prev => !prev);
//         setOpenTasks(false);
//     };

//     const closeAll = () => {
//         setOpenTasks(false);
//         setOpenAlarm(false);
//     };


//     return (
//         <header className="home-header">
//             <div className="home-logo" onClick={()=>navigate("/")}>
//                 <div className="logo-icon">
//                     <i className="fa-solid fa-calendar-check"></i>
//                 </div>
//                 <span className="logo-text">Cozy Space</span>
//             </div>

//             <nav className="home-nav">
//                 <button className="header-nav-link" onClick={toggleTasks}>
//                     <i className="fa-solid fa-crosshairs"></i> TASKS
//                 </button>

//                 <button className="header-nav-link" onClick={toggleAlarm}>
//                     <i className="fa-solid fa-clock"></i> ALARM
//                 </button>


//                 {/* <button className="header-nav-link">
//                     <i className="fa-solid fa-gear"></i> Settings
//                 </button>

//                 <button className="nav-icon">
//                     <i className="fa-solid fa-bell"></i>
//                 </button>

//                 <div className="nav-avatar">
//                     <i className="fa-solid fa-user"></i>
//                 </div> */}
//             </nav>

//             {openTasks && (
//                 <Sidebar
//                     {...props}
//                     asDropdown={true}
//                     onClose={closeAll}

//                 />
//             )}
//             {openAlarm && (
//                 <div className="alarm-dropdown">
//                     <AlarmPlanner onClose={closeAll} />        
//                 </div>
//             )}
//         </header>
//     );
// }
import { useState, useRef, useEffect } from "react";
import "./Header.css";
import Sidebar from "./Sidebar";
import AlarmPlanner from "./AlarmPlanner";
import { useNavigate } from "react-router-dom";
import { useAuth } from "../Context/Authcontext";
// import { useAuth } from "../../Context/Authcontext";

// ── Helper: generate a consistent pastel color from a string ──
function avatarColor(str = "") {
  const palette = [
    ["#ffc9d4", "#a0404a"],
    ["#d4e7ff", "#2a5fa0"],
    ["#e4d4ff", "#6b35c7"],
    ["#d4ffd9", "#257a3e"],
    ["#fff4d4", "#9a6c00"],
    ["#ffd9c9", "#b34a1a"],
  ];
  let hash = 0;
  for (let i = 0; i < str.length; i++) hash += str.charCodeAt(i);
  return palette[hash % palette.length];
}

// ── Get initials from name or email ──────────────────────────
function getInitials(user) {
  const name = user?.user_metadata?.full_name || "";
  if (name) {
    const parts = name.trim().split(" ");
    return parts.length >= 2
      ? (parts[0][0] + parts[parts.length - 1][0]).toUpperCase()
      : parts[0][0].toUpperCase();
  }
  return (user?.email?.[0] || "?").toUpperCase();
}

function getDisplayName(user) {
  return user?.user_metadata?.full_name?.split(" ")[0] ||
    user?.email?.split("@")[0] ||
    "You";
}

export default function Header(props) {
  const [openTasks, setOpenTasks] = useState(false);
  const [openAlarm, setOpenAlarm] = useState(false);
  const [openUserMenu, setOpenUserMenu] = useState(false);

  const navigate = useNavigate();
  const { user, signOut } = useAuth();

  const userMenuRef = useRef(null);

  // Close user menu on outside click
  useEffect(() => {
    if (!openUserMenu) return;
    const handler = (e) => {
      if (userMenuRef.current && !userMenuRef.current.contains(e.target)) {
        setOpenUserMenu(false);
      }
    };
    document.addEventListener("mousedown", handler);
    return () => document.removeEventListener("mousedown", handler);
  }, [openUserMenu]);

  const toggleTasks = () => {
    setOpenTasks(prev => !prev);
    setOpenAlarm(false);
    setOpenUserMenu(false);
  };

  const toggleAlarm = () => {
    setOpenAlarm(prev => !prev);
    setOpenTasks(false);
    setOpenUserMenu(false);
  };

  const closeAll = () => {
    setOpenTasks(false);
    setOpenAlarm(false);
  };

  const handleSignOut = async () => {
    setOpenUserMenu(false);
    await signOut();
    navigate("/login");
  };

  // Avatar data
  const initials = user ? getInitials(user) : "?";
  const displayName = user ? getDisplayName(user) : "";
  const avatarEmail = user?.email || "";
  const [bgColor, textColor] = avatarColor(avatarEmail);
  const avatarImg = user?.user_metadata?.avatar_url;

  return (
    <header className="home-header">
      {/* Logo */}
      <div className="home-logo" onClick={() => navigate("/")}>
        <div className="logo-icon">
          <i className="fa-solid fa-calendar-check" />
        </div>
        <span className="logo-text">Cozy Space</span>
      </div>

      <nav className="home-nav">
        <button className="header-nav-link" onClick={toggleTasks}>
          <i className="fa-solid fa-crosshairs" /> TASKS
        </button>

        <button className="header-nav-link" onClick={toggleAlarm}>
          <i className="fa-solid fa-clock" /> ALARM
        </button>

        {/* ── User Avatar ── */}
        {user && (
          <div className="header-avatar-wrap" ref={userMenuRef}>
            <button
              className="header-avatar-btn"
              onClick={() => setOpenUserMenu(p => !p)}
              title={displayName}
            >
              {avatarImg ? (
                <img src={avatarImg} alt={initials} className="header-avatar-img" />
              ) : (
                <span
                  className="header-avatar-initials"
                  style={{ background: bgColor, color: textColor }}
                >
                  {initials}
                </span>
              )}
              <span className="header-avatar-dot" />
            </button>

            {/* ── Dropdown ── */}
            {openUserMenu && (
              <div className="header-user-menu">
                {/* Profile row */}
                <div className="user-menu-profile">
                  {avatarImg ? (
                    <img src={avatarImg} alt={initials} className="user-menu-avatar-lg" />
                  ) : (
                    <span
                      className="user-menu-avatar-lg"
                      style={{ background: bgColor, color: textColor }}
                    >
                      {initials}
                    </span>
                  )}
                  <div>
                    <div className="user-menu-name">{displayName}</div>
                    <div className="user-menu-email">{avatarEmail}</div>
                  </div>
                </div>

                <div className="user-menu-divider" />

                <button
                  className="user-menu-item"
                  onClick={() => { setOpenUserMenu(false); navigate("/"); }}
                >
                  <i className="fa-solid fa-house" /> Home
                </button>

                <button
                  className="user-menu-item"
                  onClick={() => {
                    setOpenUserMenu(false);
                    navigate(`/day/${new Date().toISOString().slice(0, 10)}`);
                  }}
                >
                  <i className="fa-solid fa-calendar-day" /> Today
                </button>

                <div className="user-menu-divider" />

                <button
                  className="user-menu-item user-menu-signout"
                  onClick={handleSignOut}
                >
                  <i className="fa-solid fa-right-from-bracket" /> Sign out
                </button>
              </div>
            )}
          </div>
        )}

        {/* Show login button if not logged in */}
        {!user && (
          <button
            className="header-nav-link header-login-btn"
            onClick={() => navigate("/login")}
          >
            <i className="fa-solid fa-right-to-bracket" /> Login
          </button>
        )}
      </nav>

      {/* Dropdowns */}
      {openTasks && (
        <Sidebar {...props} asDropdown={true} onClose={closeAll} />
      )}
      {openAlarm && (
        <div className="alarm-dropdown">
          <AlarmPlanner onClose={closeAll} />
        </div>
      )}
    </header>
  );
}