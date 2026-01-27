import React from "react";
import { useNavigate } from "react-router-dom";
import "./Sidebar.css";

export default function Sidebar({
  tasks = [],   // error-safe
  onScroll,
  onOpenReflection,
  onOpenWeeklySummary
}) {
  //   const navigate = useNavigate();

  const completed = tasks.filter(t => t.completed).length;
  const total = tasks.length;

  return (
    <aside className="sidebar-container">
      {/* 🔹 EXISTING CONTENT (UNCHANGED) */}
      <div className="sidebar-content">
        <div className="sidebar-header">
          <div className="sidebar-logo">
            <div className="sidebar-logo-icon">📅</div>
            <div className="sidebar-logo-text">
              <div className="sidebar-logo-title">Daily Planner</div>
              <div className="sidebar-logo-subtitle">Minimalist Edition</div>
            </div>
          </div>
        </div>

        <nav className="sidebar-nav">
          <button className="sidebar-nav-item sidebar-nav-item-active" onClick={() => onScroll("morning")}>
            <span className="sidebar-nav-icon">📋</span>
            <span className="sidebar-nav-label">All Tasks</span>
            <span className="sidebar-nav-badge">{total}</span>
          </button>
          <button className="sidebar-nav-item" onClick={() => onScroll("afternoon")}>
            <span className="sidebar-nav-icon">⏳</span>
            <span className="sidebar-nav-label">Pending</span>
          </button>
          <button className="sidebar-nav-item" onClick={() => onScroll("evening")}>
            <span className="sidebar-nav-icon">✓</span>
            <span className="sidebar-nav-label">Completed</span>
          </button>
          <button className="sidebar-nav-item" onClick={onOpenReflection}>
            <span className="sidebar-nav-icon">📊</span>
            <span className="sidebar-nav-label">Overview</span>
          </button>
          <button className="sidebar-nav-item" onClick={onOpenWeeklySummary}>
            <span className="sidebar-nav-icon">📊</span>
            <span className="sidebar-nav-label">Weekly Summary</span>
          </button>
        </nav>
        

        {/* <div className="sidebar-projects">
          <div className="sidebar-projects-header">PROJECTS</div>
          <button className="sidebar-project-item sidebar-project-work">
            <span className="sidebar-project-dot"></span>
            <span>Work</span>
          </button>
          <button className="sidebar-project-item sidebar-project-personal">
            <span className="sidebar-project-dot"></span>
            <span>Personal</span>
          </button>
        </div> */}
      </div>

      {/* 🔥 NEW: BOTTOM BUTTON */}
      {/* <div className="sidebar-footer">
        <button className="sidebar-new-list-btn">
          <span className="sidebar-new-list-icon">+</span>
          <span>New List</span>
        </button>
      </div> */}
    </aside>
  );
}