import React, { useState, useEffect } from "react";
import "./Sidebar.css";

/* ✅ FIX: define time options */
const TIME_OPTIONS = ["morning", "afternoon", "evening"];

const getTimeOfDay = () => {
    const hour = new Date().getHours();
    if (hour < 12) return "morning";
    if (hour < 17) return "afternoon";
    return "evening";
};

export default function Sidebar({
    tasks = [],
    onFilterChange,
    activeFilter,
    onOpenReflection,
    onOpenWeeklySummary
}) {
    /* ===== EXISTING COUNTS (UNCHANGED) ===== */
    const completed = tasks.filter(t => t.completed).length;
    const pending = tasks.filter(t => !t.completed).length;
    const total = tasks.length;

    /* ===== MODAL STATE ===== */
    const [showModal, setShowModal] = useState(false);
    const [dailyTasks, setDailyTasks] = useState([]);
    const [hobbies, setHobbies] = useState([]);
    const [taskInput, setTaskInput] = useState("");
    const [hobbyInput, setHobbyInput] = useState("");
    const [time, setTime] = useState(getTimeOfDay());

    const todayKey = new Date().toISOString().slice(0, 10);

    /* 🔁 AUTO OPEN ONCE PER DAY */
    useEffect(() => {
        const lastOpened = localStorage.getItem("daily-reminder-opened");
        if (lastOpened !== todayKey) {
            setShowModal(true);
            localStorage.setItem("daily-reminder-opened", todayKey);
        }
    }, [todayKey]);

    /* 🔹 LOAD REMINDERS */
    useEffect(() => {
        setDailyTasks(JSON.parse(localStorage.getItem("daily-reminder-tasks")) || []);
        setHobbies(JSON.parse(localStorage.getItem("daily-reminder-hobbies")) || []);
    }, []);

    /* 💾 SAVE */
    const persist = (tasks, hobbies) => {
        localStorage.setItem("daily-reminder-tasks", JSON.stringify(tasks));
        localStorage.setItem("daily-reminder-hobbies", JSON.stringify(hobbies));
    };

    /* ➕ ADD ITEM (NO planner logic used) */
    const addItem = (type) => {
        const value = type === "task" ? taskInput : hobbyInput;
        if (!value.trim()) return;

        const newItem = {
            id: Date.now(),
            text: value,
            time,
            done: false
        };

        if (type === "task") {
            const updated = [...dailyTasks, newItem];
            setDailyTasks(updated);
            persist(updated, hobbies);
            setTaskInput("");
        } else {
            const updated = [...hobbies, newItem];
            setHobbies(updated);
            persist(dailyTasks, updated);
            setHobbyInput("");
        }
    };

    /* ✅ TOGGLE DONE (NO checkbox) */
    const toggleDone = (type, id) => {
        const update = list =>
            list.map(i => i.id === id ? { ...i, done: !i.done } : i);

        if (type === "task") {
            const updated = update(dailyTasks);
            setDailyTasks(updated);
            persist(updated, hobbies);
        } else {
            const updated = update(hobbies);
            setHobbies(updated);
            persist(dailyTasks, updated);
        }
    };

    /* ❌ REMOVE ITEM */
    const removeItem = (type, id) => {
        if (type === "task") {
            const updated = dailyTasks.filter(i => i.id !== id);
            setDailyTasks(updated);
            persist(updated, hobbies);
        } else {
            const updated = hobbies.filter(i => i.id !== id);
            setHobbies(updated);
            persist(dailyTasks, updated);
        }
    };

    /* 🧱 RENDER LIST (NO CHECKBOX) */
    const renderList = (items, type) =>
        items.map(item => (
            <div key={item.id} className={`daily-item ${item.done ? "done" : ""}`}>
                <span className="daily-text">{item.text}</span>
                <span className="daily-time">{item.time}</span>

                <div className="daily-actions">
                    <button onClick={() => toggleDone(type, item.id)}>
                        {item.done ? "Undo" : "Done"}
                    </button>
                    <button onClick={() => removeItem(type, item.id)}>✕</button>
                </div>
            </div>
        ));

    return (
        <>
            {/* ===== SIDEBAR (UNCHANGED) ===== */}
            <aside className="sidebar-container">
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
                        <button
                            className={`sidebar-nav-item ${activeFilter === "all" ? "sidebar-nav-item-active" : ""}`}
                            onClick={() => onFilterChange("all")}
                        >
                            📋 All Tasks <span>{total}</span>
                        </button>

                        <button
                            className={`sidebar-nav-item ${activeFilter === "pending" ? "sidebar-nav-item-active" : ""}`}
                            onClick={() => onFilterChange("pending")}
                        >
                            ⏳ Pending <span>{pending}</span>
                        </button>

                        <button
                            className={`sidebar-nav-item ${activeFilter === "completed" ? "sidebar-nav-item-active" : ""}`}
                            onClick={() => onFilterChange("completed")}
                        >
                            ✓ Completed <span>{completed}</span>
                        </button>

                        {/* ✅ DAILY REMINDER BUTTON */}
                        <button className="sidebar-nav-item" onClick={() => setShowModal(true)}>
                            🔁 Daily Tasks & Hobbies
                        </button>

                        <button className="sidebar-nav-item" onClick={onOpenReflection}>
                            📊 Overview
                        </button>

                        <button className="sidebar-nav-item" onClick={onOpenWeeklySummary}>
                            📈 Weekly Summary
                        </button>
                    </nav>
                </div>
            </aside>

            {/* ===== MODAL ===== */}
            {showModal && (
                <div className="modal-overlay">
                    <div className="modal-container">
                        <header className="modal-header">
                            <h3>Daily Reminder</h3>
                            <button onClick={() => setShowModal(false)}>✕</button>
                        </header>

                        {/* ⏰ TIME SELECT */}
                        <div className="time-selector">
                            {TIME_OPTIONS.map(t => (
                                <button
                                    key={t}
                                    className={time === t ? "active" : ""}
                                    onClick={() => setTime(t)}
                                >
                                    {t}
                                </button>
                            ))}
                        </div>

                        <section>
                            <h4>Daily Tasks</h4>
                            <div className="input-row">
                                <input
                                    value={taskInput}
                                    onChange={e => setTaskInput(e.target.value)}
                                    placeholder="Add daily task"
                                />
                                <button onClick={() => addItem("task")}>Add</button>
                            </div>
                            {renderList(dailyTasks, "task")}
                        </section>

                        <section>
                            <h4>Hobbies</h4>
                            <div className="input-row">
                                <input
                                    value={hobbyInput}
                                    onChange={e => setHobbyInput(e.target.value)}
                                    placeholder="Add hobby"
                                />
                                <button onClick={() => addItem("hobby")}>Add</button>
                            </div>
                            {renderList(hobbies, "hobby")}
                        </section>
                    </div>
                </div>
            )}
        </>
    );
}
