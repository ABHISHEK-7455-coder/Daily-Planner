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

    /* ---------- STEP 1: WEEK BEHAVIOR SNAPSHOT ---------- */
    const behaviorSnapshot = useMemo(() => {
        let totalTasks = 0;
        let completedTasks = 0;
        let activeDays = 0;
        let morning = 0;
        let evening = 0;

        weekDates.forEach(date => {
            const day = daysData[date];
            if (!day?.tasks || day.tasks.length === 0) return;

            activeDays += 1;
            totalTasks += day.tasks.length;

            day.tasks.forEach(task => {
                if (task.completed) completedTasks += 1;

                if (task.timeOfDay === "morning") morning += 1;
                if (task.timeOfDay === "evening") evening += 1;
            });
        });

        const skippedDays = 7 - activeDays;
        const dominantTime =
            morning > evening ? "morning" :
                evening > morning ? "evening" :
                    null;

        const overloadDetected =
            totalTasks > activeDays * 4 && completedTasks / (totalTasks || 1) < 0.5;

        return {
            weekKey,
            totalTasks,
            completedTasks,
            activeDays,
            skippedDays,
            dominantTime,
            overloadDetected,
            updatedAt: new Date().toISOString()
        };
    }, [daysData, weekDates, weekKey]);

    /* ---------- SAVE SNAPSHOT (REAL-TIME) ---------- */
    useEffect(() => {
        const history =
            JSON.parse(localStorage.getItem("user-week-history")) || {};

        history[weekKey] = behaviorSnapshot;

        localStorage.setItem(
            "user-week-history",
            JSON.stringify(history)
        );
    }, [behaviorSnapshot, weekKey]);

    /* ---------- DAY TASK BUCKETS ---------- */
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

                {/* ---------- STEP 1: SNAPSHOT PREVIEW (DEBUG / TRANSPARENT) ---------- */}
                <div className="weekly-snapshot">
                    <p>
                        Tasks: {behaviorSnapshot.completedTasks} /{" "}
                        {behaviorSnapshot.totalTasks}
                    </p>
                    <p>Active days: {behaviorSnapshot.activeDays}</p>
                    {behaviorSnapshot.overloadDetected && (
                        <p className="warning">
                            Week looks overloaded
                        </p>
                    )}
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
