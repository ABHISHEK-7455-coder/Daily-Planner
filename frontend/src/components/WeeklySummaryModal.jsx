import { useState, useMemo } from "react";
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

export default function WeeklySummaryModal({ onClose }) {
    const [view, setView] = useState("completed");
    const [reflection, setReflection] = useState("");

    const daysData = JSON.parse(localStorage.getItem("days-data")) || {};
    const weekDates = getWeekDates();

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
    }, [daysData]);

    const activeData = view === "completed"
        ? summary.completed
        : summary.pending;

    return (
        <div className="weekly-overlay">
            <div className="weekly-modal">
                <header className="weekly-header">
                    <h2>Weekly Overview</h2>
                    <button onClick={onClose}>✕</button>
                </header>

                {/* 🔘 TOGGLE */}
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

                {/* 📊 DAILY STATS */}
                <div className="weekly-stats">
                    {weekDates.map(date => {
                        const stat = summary.stats[date];
                        if (!stat) return null;

                        return (
                            <div key={date} className="day-stat">
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

                {/* 📋 TASK LIST */}
                <div className="weekly-list">
                    {Object.keys(activeData).length === 0 && (
                        <p className="empty">
                            No {view} tasks this week
                        </p>
                    )}

                    {Object.entries(activeData).map(([date, tasks]) => (
                        <div key={date} className="weekly-day">
                            <h4>
                                {new Date(date).toDateString()}
                            </h4>

                            <ul>
                                {tasks.map(task => (
                                    <li key={task.id}>
                                        <span className="time">
                                            {task.timeOfDay}
                                        </span>
                                        {task.title}
                                    </li>
                                ))}
                            </ul>
                        </div>
                    ))}
                </div>

                {/* 🧠 REFLECTION */}
                <div className="weekly-reflection">
                    <label>
                        What stopped you this week?
                    </label>
                    <textarea
                        placeholder="Be honest. This is just for you."
                        value={reflection}
                        onChange={e => setReflection(e.target.value)}
                    />
                </div>
            </div>
        </div>
    );
}
