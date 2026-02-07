import React, { useState, useEffect, useMemo } from "react";
import "./WeeklySummaryModal.css";

/* ---------- DATE HELPERS ---------- */
const getWeekDatesByOffset = (offset = 0) => {
    const today = new Date();
    const base = new Date(today);
    base.setDate(base.getDate() + offset * 7);

    const start = new Date(base);
    start.setDate(start.getDate() - start.getDay());

    return [...Array(7)].map((_, i) => {
        const d = new Date(start);
        d.setDate(start.getDate() + i);
        return d.toISOString().slice(0, 10);
    });
};

const getWeekKeyByOffset = (offset = 0) => {
    const base = new Date();
    base.setDate(base.getDate() + offset * 7);
    const year = base.getFullYear();
    const week = Math.ceil(
        (((base - new Date(year, 0, 1)) / 86400000) +
            new Date(year, 0, 1).getDay() + 1) / 7
    );
    return `${year}-W${week}`;
};

/* ---------- MOTIVATION ENGINE ---------- */
const getWeeklyMessage = (current, previous) => {
    if (current.total === 0) {
        return {
            title: "Blank Week 🌱",
            message:
                "Looks like this week was light. That’s okay. Next week, try adding just 1–2 meaningful tasks and build momentum slowly."
        };
    }

    const rate = current.completed / current.total;
    const prevRate = previous ? previous.completed / (previous.total || 1) : 0;

    if (rate === 1) {
        return {
            title: "You showed up fully 💯",
            message:
                "Every planned task got done. That’s rare discipline. Don’t increase load yet — maintain this rhythm next week."
        };
    }

    if (rate >= 0.7) {
        return {
            title: "Strong consistency 👏",
            message:
                "Most tasks are completed. You’re managing your energy well. One small push next week can make this a perfect streak."
        };
    }

    if (rate >= 0.4) {
        return {
            title: "Progress > perfection 💪",
            message:
                "You didn’t quit — and that matters. Try fewer tasks next week, but finish them completely."
        };
    }

    if (prevRate && rate > prevRate) {
        return {
            title: "Still better than old you 🪞",
            message:
                "Completion is low, but it’s improving compared to last week. Keep simplifying — progress is happening."
        };
    }

    return {
        title: "Rough week, not a failure 🌧️",
        message:
            "This week was heavy. Don’t judge yourself. Reset with smaller, realistic tasks — consistency beats intensity."
    };
};

export default function WeeklySummaryModal({ onClose }) {
    const [view, setView] = useState("completed");
    const [weekOffset, setWeekOffset] = useState(0);
    const [activeDate, setActiveDate] = useState(null);

    const daysData =
        JSON.parse(localStorage.getItem("days-data")) || {};

    const weekDates = useMemo(
        () => getWeekDatesByOffset(weekOffset),
        [weekOffset]
    );

    const weekKey = useMemo(
        () => getWeekKeyByOffset(weekOffset),
        [weekOffset]
    );

    const prevWeekDates = getWeekDatesByOffset(weekOffset - 1);

    /* ---------- WEEK STATS (REAL-TIME) ---------- */
    const weekStats = useMemo(() => {
        let total = 0;
        let completed = 0;

        weekDates.forEach(date => {
            const day = daysData[date];
            if (!day?.tasks) return;

            total += day.tasks.length;
            completed += day.tasks.filter(t => t.completed).length;
        });

        return { total, completed };
    }, [daysData, weekDates]);

    const prevWeekStats = useMemo(() => {
        let total = 0;
        let completed = 0;

        prevWeekDates.forEach(date => {
            const day = daysData[date];
            if (!day?.tasks) return;

            total += day.tasks.length;
            completed += day.tasks.filter(t => t.completed).length;
        });

        return { total, completed };
    }, [daysData, prevWeekDates]);

    const motivation = useMemo(
        () => getWeeklyMessage(weekStats, prevWeekStats),
        [weekStats, prevWeekStats]
    );

    /* ---------- DAY-WISE TASKS ---------- */
    const dayBuckets = useMemo(() => {
        const completed = {};
        const pending = {};

        weekDates.forEach(date => {
            const day = daysData[date];
            if (!day?.tasks) return;

            day.tasks.forEach(task => {
                const bucket = task.completed ? completed : pending;
                if (!bucket[date]) bucket[date] = [];
                bucket[date].push(task);
            });
        });

        return { completed, pending };
    }, [daysData, weekDates]);

    useEffect(() => {
        if (!activeDate && weekDates.length) {
            setActiveDate(weekDates[0]);
        }
    }, [weekDates, activeDate]);

    const activeTasks =
        activeDate && dayBuckets[view][activeDate]
            ? dayBuckets[view][activeDate]
            : [];

    return (
        <div className="weekly-overlay" onClick={onClose}>
            <div
                className="weekly-modal"
                onClick={e => e.stopPropagation()}
            >
                {/* ---------- HEADER ---------- */}
                <header className="weekly-header">
                    <button onClick={() => setWeekOffset(w => w - 1)}>←</button>

                    <h2>
                        {weekOffset === 0
                            ? "This Week"
                            : weekOffset === -1
                            ? "Last Week"
                            : `${Math.abs(weekOffset)} Weeks Ago`}
                    </h2>

                    <div className="header-actions">
                        <button
                            disabled={weekOffset === 0}
                            onClick={() => setWeekOffset(w => w + 1)}
                        >
                            →
                        </button>
                        <button className="close-btn" onClick={onClose}>
                            ✕
                        </button>
                    </div>
                </header>

                {/* ---------- YOU VS OLD YOU ---------- */}
                <div className="weekly-motivation">
                    <h3>{motivation.title}</h3>
                    <p>{motivation.message}</p>
                </div>

                {/* ---------- TOGGLE ---------- */}
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

                {/* ---------- DAYS ---------- */}
                <div className="weekly-stats">
                    {weekDates.map(date => (
                        <div
                            key={date}
                            className={`day-stat ${activeDate === date ? "active" : ""}`}
                            onClick={() => setActiveDate(date)}
                        >
                            {new Date(date).toLocaleDateString("en-US", {
                                weekday: "short"
                            })}
                        </div>
                    ))}
                </div>

                {/* ---------- TASK LIST ---------- */}
                <div className="weekly-list">
                    {activeTasks.length === 0 ? (
                        <p className="empty">
                            No {view} tasks for this day
                        </p>
                    ) : (
                        <ul>
                            {activeTasks.map(task => (
                                <li key={task.id}>
                                    <strong>{task.timeOfDay}</strong>{" "}
                                    {task.title}
                                </li>
                            ))}
                        </ul>
                    )}
                </div>
            </div>
        </div>
    );
}
