import React, { useState, useEffect, useMemo } from "react";
import "./WeeklySummaryModal.css";

/* ---------- helpers ---------- */
const getWeekDates = (baseDate = new Date()) => {
    const start = new Date(baseDate);
    start.setDate(start.getDate() - start.getDay());

    return [...Array(7)].map((_, i) => {
        const d = new Date(start);
        d.setDate(start.getDate() + i);
        return d.toISOString().slice(0, 10);
    });
};

const getWeekKey = (date = new Date()) => {
    const firstDay = new Date(date);
    firstDay.setDate(firstDay.getDate() - firstDay.getDay());

    const year = firstDay.getFullYear();
    const week = Math.ceil(
        (((firstDay - new Date(year, 0, 1)) / 86400000) +
            new Date(year, 0, 1).getDay() + 1) / 7
    );

    return `${year}-W${week}`;
};

export default function WeeklySummaryModal({ onClose }) {
    const [view, setView] = useState("completed");
    const [reflection, setReflection] = useState("");
    const [activeDate, setActiveDate] = useState(null);

    const weekKey = getWeekKey();
    const weekDates = getWeekDates();

    const daysData =
        JSON.parse(localStorage.getItem("days-data")) || {};

    /* 🔹 LOAD WEEKLY REFLECTION */
    useEffect(() => {
        const stored =
            JSON.parse(localStorage.getItem("weekly-reflections")) || {};

        if (stored[weekKey]) {
            setReflection(stored[weekKey].reflection || "");
        }
    }, [weekKey]);

    /* 🔹 SAVE WEEKLY REFLECTION */
    useEffect(() => {
        const all =
            JSON.parse(localStorage.getItem("weekly-reflections")) || {};

        all[weekKey] = {
            reflection,
            updatedAt: new Date().toISOString()
        };

        localStorage.setItem(
            "weekly-reflections",
            JSON.stringify(all)
        );
    }, [reflection, weekKey]);

    const summary = useMemo(() => {
        const completed = {};
        const pending = {};
        const stats = {};

        weekDates.forEach(date => {
            const day = daysData[date];
            if (!day || !day.tasks) return;

            const total = day.tasks.length;
            const done = day.tasks.filter(t => t.completed).length;

            stats[date] = {
                total,
                done,
                percent: total === 0 ? 0 : Math.round((done / total) * 100)
            };

            day.tasks.forEach(task => {
                const bucket = task.completed ? completed : pending;
                if (!bucket[date]) bucket[date] = [];
                bucket[date].push(task);
            });
        });

        return { completed, pending, stats };
    }, [daysData, weekDates]);

    /* 🔹 DEFAULT ACTIVE DAY (ONLY ONCE) */
    useEffect(() => {
        if (activeDate) return;

        const availableDates = Object.keys(summary.stats);
        if (availableDates.length) {
            setActiveDate(availableDates[0]);
        }
    }, [summary, activeDate]);

    const activeData =
        view === "completed"
            ? summary.completed
            : summary.pending;

    const dayTasks = activeDate
        ? activeData[activeDate] || []
        : [];

    return (
        <div className="weekly-overlay">
            <div className="weekly-modal">
                <header className="weekly-header">
                    <h2>Weekly Overview</h2>
                    <button onClick={onClose}>✕</button>
                </header>

                {/* 🔘 TOGGLE (DAY PRESERVED) */}
                <div className="weekly-toggle">
                    <button
                        className={view === "completed" ? "active" : ""}
                        onClick={() => setView("completed")}
                    >
                        Completed
                    </button>
                    <button
                        className={view === "pending" ? "active" : ""}
                        onClick={() => setView("pending")}
                    >
                        Pending
                    </button>
                </div>

                {/* 📊 DAYS (CLICKABLE) */}
                <div className="weekly-stats">
                    {weekDates.map(date => {
                        const stat = summary.stats[date];
                        if (!stat) return null;

                        return (
                            <div
                                key={date}
                                className={`day-stat ${activeDate === date ? "active" : ""}`}
                                onClick={() => setActiveDate(date)}
                            >
                                <span className="day">
                                    {new Date(date).toLocaleDateString("en-US", {
                                        weekday: "short"
                                    })}
                                </span>
                                <span className="percent">
                                    {stat.percent}%
                                </span>
                            </div>
                        );
                    })}
                </div>

                {/* 📋 TASK LIST (SAME DAY, DIFFERENT VIEW) */}
                <div className="weekly-list">
                    {dayTasks.length === 0 ? (
                        <p className="empty">
                            No {view} tasks for this day
                        </p>
                    ) : (
                        <div className="weekly-day">
                            <h4>{new Date(activeDate).toDateString()}</h4>
                            <ul>
                                {dayTasks.map(task => (
                                    <li key={task.id}>
                                        <strong>{task.timeOfDay}</strong>{" "}
                                        {task.title}
                                    </li>
                                ))}
                            </ul>
                        </div>
                    )}
                </div>

                {/* 🧠 WEEKLY REFLECTION */}
                <div className="weekly-reflection">
                    <label>
                        What stopped you this week?
                    </label>
                    <textarea
                        placeholder="Be honest. This is for you only."
                        value={reflection}
                        onChange={e => setReflection(e.target.value)}
                    />
                </div>
            </div>
        </div>
    );
}
