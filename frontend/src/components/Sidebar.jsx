// 📌 Sidebar.jsx — Cozy Desk Style
// Make sure Font Awesome 6 is loaded in index.html:
// <link rel="stylesheet" href="https://cdnjs.cloudflare.com/ajax/libs/font-awesome/6.5.0/css/all.min.css" />

import React, { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import "./Sidebar.css";

const getTimeOfDay = () => {
  const hour = new Date().getHours();
  if (hour < 12) return "Morning";
  if (hour < 17) return "Afternoon";
  return "Evening";
};

export default function Sidebar({
  tasks = [],
  onFilterChange,
  activeFilter,
  onOpenReflection,
  onOpenWeeklySummary,
  asDropdown = false,
  onClose,
}) {
  const [showModal, setShowModal]     = useState(false);
  const [dailyTasks, setDailyTasks]   = useState([]);
  const [hobbies, setHobbies]         = useState([]);
  const [taskInput, setTaskInput]     = useState("");
  const [hobbyInput, setHobbyInput]   = useState("");
  const [time, setTime]               = useState(getTimeOfDay());

  const todayKey  = new Date().toISOString().split("T")[0];
  const navigate  = useNavigate();

  const completed = tasks.filter((t) => t.completed).length;
  const pending   = tasks.filter((t) => !t.completed).length;
  const total     = tasks.length;

  const handleAction = (callback, value) => {
    callback?.(value);
    if (asDropdown) onClose?.();
  };

  /* Auto-open modal once per day */
  useEffect(() => {
    if (!asDropdown) {
      const lastOpened = localStorage.getItem("daily-modal-opened");
      if (lastOpened !== todayKey) {
        setShowModal(true);
        localStorage.setItem("daily-modal-opened", todayKey);
      }
    }
  }, [todayKey, asDropdown]);

  useEffect(() => {
    setDailyTasks(JSON.parse(localStorage.getItem("daily-tasks")) || []);
    setHobbies(JSON.parse(localStorage.getItem("daily-hobbies")) || []);
  }, []);

  /* Close dropdown on outside click */
  useEffect(() => {
    if (!asDropdown) return;
    const handleClickOutside = (e) => {
      if (!e.target.closest(".tasks-dropdown")) onClose?.();
    };
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, [asDropdown, onClose]);

  const save = (t, h) => {
    localStorage.setItem("daily-tasks",   JSON.stringify(t));
    localStorage.setItem("daily-hobbies", JSON.stringify(h));
  };

  const addItem = (type) => {
    const val = type === "task" ? taskInput : hobbyInput;
    if (!val.trim()) return;
    const newItem = { id: Date.now(), text: val, done: false, time };
    if (type === "task") {
      const updated = [...dailyTasks, newItem];
      setDailyTasks(updated); save(updated, hobbies); setTaskInput("");
    } else {
      const updated = [...hobbies, newItem];
      setHobbies(updated); save(dailyTasks, updated); setHobbyInput("");
    }
  };

  const toggleDone = (type, id) => {
    const update = (list) => list.map((i) => i.id === id ? { ...i, done: !i.done } : i);
    if (type === "task") {
      const updated = update(dailyTasks); setDailyTasks(updated); save(updated, hobbies);
    } else {
      const updated = update(hobbies); setHobbies(updated); save(dailyTasks, updated);
    }
  };

  const timePillClass = (t) =>
    `time-pill time-pill-${t.toLowerCase()} ${time === t ? "time-pill-active" : ""}`;

  const renderList = (items, type) =>
    items.map((item) => (
      <div key={item.id} className="modal-list-item">
        <input
          type="checkbox"
          checked={item.done}
          onChange={() => toggleDone(type, item.id)}
        />
        <span className={`modal-list-item-text ${item.done ? "done" : ""}`}>
          {item.text}
        </span>
        <span className="modal-list-item-time">{item.time}</span>
      </div>
    ));

  const navItems = [
    { filter: "all",       icon: "fa-solid fa-list-check",  label: "All Tasks",      badge: total },
    { filter: "pending",   icon: "fa-solid fa-hourglass-half", label: "Pending",     badge: pending },
    { filter: "completed", icon: "fa-solid fa-circle-check", label: "Completed",    badge: completed },
    { action: onOpenReflection,    icon: "fa-solid fa-chart-pie",    label: "Overview" },
    { action: onOpenWeeklySummary, icon: "fa-solid fa-chart-line",   label: "Weekly Summary" },
  ];

  const wrapperClass = asDropdown ? "tasks-dropdown" : "sidebar-container";

  return (
    <>
      <div className={wrapperClass}>
        <div className="sidebar-content">

          {/* ── Logo (hidden in dropdown) ── */}
          {!asDropdown && (
            <div className="sidebar-header">
              <div className="sidebar-logo" onClick={() => navigate("/")} style={{ cursor: "pointer" }}>
                <div className="sidebar-logo-icon">🛋️</div>
                <div className="sidebar-logo-text">
                  <div className="sidebar-logo-title">Cozy Space</div>
                  <div className="sidebar-logo-subtitle">Minimalist Edition</div>
                </div>
              </div>
            </div>
          )}

          {/* ── Nav ── */}
          <div className="sidebar-nav">
            <div className="sidebar-section-label">Menu</div>
            {navItems.map((item, idx) => {
              const isActive = item.filter && activeFilter === item.filter;
              return (
                <button
                  key={idx}
                  className={`sidebar-nav-item ${isActive ? "sidebar-nav-item-active" : ""}`}
                  onClick={() =>
                    item.filter
                      ? handleAction(onFilterChange, item.filter)
                      : handleAction(item.action)
                  }
                >
                  <div className="sidebar-nav-icon">
                    <i className={item.icon} />
                  </div>
                  <span className="sidebar-nav-label">{item.label}</span>
                  {item.badge !== undefined && (
                    <span className="sidebar-nav-badge">{item.badge}</span>
                  )}
                </button>
              );
            })}
          </div>

          <div className="sidebar-divider" />

          {/* ── Daily Notes Card ── */}
          {!asDropdown && (
            <div className="sidebar-notes-card">
              <div className="sidebar-notes-title">
                <i className="fa-solid fa-note-sticky" />
                Daily Notes
              </div>
              <div className="sidebar-notes-subtitle">
                Write freely about your day… or dictate using your AI Buddy!
              </div>
              <button className="sidebar-notes-action" onClick={() => setShowModal(true)}>
                <i className="fa-solid fa-wand-magic-sparkles" />
                Open Daily Tasks
              </button>
            </div>
          )}

          {/* ── Footer ── */}
          {!asDropdown && (
            <div className="sidebar-footer">
              <button className="sidebar-footer-item">
                <i className="fa-solid fa-gear" />
                Settings
              </button>
              <button className="sidebar-footer-item">
                <i className="fa-solid fa-circle-question" />
                Help & Support
              </button>
            </div>
          )}
        </div>
      </div>

      {/* ════════════ MODAL ════════════ */}
      {showModal && (
        <div className="daily-modal-overlay" onClick={(e) => e.target === e.currentTarget && setShowModal(false)}>
          <div className="daily-modal">

            {/* Header */}
            <div className="daily-modal-header">
              <div className="daily-modal-title">
                🌅 Daily Reminder
              </div>
              <button className="daily-modal-close" onClick={() => setShowModal(false)}>
                <i className="fa-solid fa-xmark" />
              </button>
            </div>

            {/* Time Picker */}
            <div className="time-pills">
              {["Morning", "Afternoon", "Evening"].map((t) => (
                <button key={t} className={timePillClass(t)} onClick={() => setTime(t)}>
                  {t === "Morning" ? "🌤️" : t === "Afternoon" ? "☀️" : "🌙"} {t}
                </button>
              ))}
            </div>

            {/* Tasks */}
            <div className="modal-section">
              <div className="modal-section-title">
                <i className="fa-solid fa-list-check" /> Daily Tasks
              </div>
              <div className="modal-input-row">
                <input
                  className="modal-input"
                  value={taskInput}
                  onChange={(e) => setTaskInput(e.target.value)}
                  onKeyDown={(e) => e.key === "Enter" && addItem("task")}
                  placeholder="Add a task…"
                />
                <button className="modal-add-btn" onClick={() => addItem("task")}>
                  <i className="fa-solid fa-plus" /> Add
                </button>
              </div>
              {renderList(dailyTasks, "task")}
            </div>

            {/* Hobbies */}
            <div className="modal-section">
              <div className="modal-section-title">
                <i className="fa-solid fa-seedling" /> Hobbies
              </div>
              <div className="modal-input-row">
                <input
                  className="modal-input"
                  value={hobbyInput}
                  onChange={(e) => setHobbyInput(e.target.value)}
                  onKeyDown={(e) => e.key === "Enter" && addItem("hobby")}
                  placeholder="Add a hobby…"
                />
                <button className="modal-add-btn" onClick={() => addItem("hobby")}>
                  <i className="fa-solid fa-plus" /> Add
                </button>
              </div>
              {renderList(hobbies, "hobby")}
            </div>

          </div>
        </div>
      )}
    </>
  );
}