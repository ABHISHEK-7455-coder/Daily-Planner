import React from "react";
import "./DayCalendar.css";

const HOURS = Array.from({ length: 24 }, (_, i) => i);
const PX_PER_MINUTE = 1.2; // each minute = 1.2px → 1 hour = 72px

const timeToMinutes = (time) => {
    if (!time) return null;
    const [h, m] = time.split(":").map(Number);
    return h * 60 + m;
};

const formatTime = (time) => {
    if (!time) return "";
    const [h, m] = time.split(":").map(Number);
    const period = h >= 12 ? "PM" : "AM";
    const hour = h % 12 || 12;
    return `${hour}:${String(m).padStart(2, "0")} ${period}`;
};

const SECTION_COLORS = {
    morning:   { bg: "#fff8e1", border: "#f59e0b", icon: "fa-sun",   color: "#f59e0b" },
    afternoon: { bg: "#e8f5e9", border: "#4caf50", icon: "fa-cloud-sun", color: "#4caf50" },
    evening:   { bg: "#ede7f6", border: "#7c3aed", icon: "fa-moon",  color: "#7c3aed" },
    default:   { bg: "#e3f2fd", border: "#1976d2", icon: "fa-circle-dot", color: "#1976d2" },
};

export default function DayCalendar({ tasks, onToggle }) {
    const timedTasks    = tasks.filter(t => t.startTime && t.endTime);
    const startOnlyTasks = tasks.filter(t => t.startTime && !t.endTime);
    const untimedTasks  = tasks.filter(t => !t.startTime);

    const totalGridHeight = 24 * 60 * PX_PER_MINUTE; // 1728px

    return (
        <div className="day-calendar">

            {/* ── UNSCHEDULED TASKS ──────────────────────────────────── */}
            {untimedTasks.length > 0 && (
                <div className="dc-unscheduled">
                    <div className="dc-section-title">
                        <i className="fas fa-list-check" style={{ color: "#6c5ce7" }}></i>
                        All Tasks
                    </div>
                    <div className="dc-chip-list">
                        {untimedTasks.map(task => {
                            const c = SECTION_COLORS[task.timeOfDay] || SECTION_COLORS.default;
                            return (
                                <div
                                    key={task.id}
                                    className={`dc-chip ${task.completed ? "dc-chip-done" : ""}`}
                                    style={{ borderLeft: `4px solid ${c.border}`, background: c.bg }}
                                    onClick={() => onToggle(task.id)}
                                >
                                    <i
                                        className={`fas ${task.completed ? "fa-circle-check" : "fa-circle"}`}
                                        style={{ color: task.completed ? "#4caf50" : "#bbb", fontSize: 16 }}
                                    ></i>
                                    <span className="dc-chip-title">{task.title}</span>
                                    <span className="dc-chip-right">
                                        {task.timeOfDay && (
                                            <span className="dc-chip-badge" style={{ background: c.border }}>
                                                <i className={`fas ${c.icon}`}></i> {task.timeOfDay}
                                            </span>
                                        )}
                                        {task.status === "running" && (
                                            <span className="dc-chip-live">
                                                <i className="fas fa-circle-play"></i> Live
                                            </span>
                                        )}
                                    </span>
                                </div>
                            );
                        })}
                    </div>
                </div>
            )}

            {/* ── TIMED GRID ─────────────────────────────────────────── */}
            {(timedTasks.length > 0 || startOnlyTasks.length > 0) && (
                <div className="dc-grid-wrapper">
                    <div className="dc-section-title" style={{ padding: "12px 16px 4px" }}>
                        <i className="fas fa-clock" style={{ color: "#6c5ce7" }}></i>
                        Schedule
                    </div>

                    <div className="dc-grid" style={{ height: totalGridHeight }}>

                        {/* HOUR LINES + LABELS */}
                        {HOURS.map(h => (
                            <div
                                key={h}
                                className="dc-hour-row"
                                style={{ top: h * 60 * PX_PER_MINUTE }}
                            >
                                <span className="dc-hour-label">
                                    {String(h).padStart(2, "0")}:00
                                </span>
                                <div className="dc-hour-line" />
                            </div>
                        ))}

                        {/* FULL TIMED BLOCKS */}
                        {timedTasks.map(task => {
                            const start = timeToMinutes(task.startTime);
                            const end   = timeToMinutes(task.endTime);
                            if (start === null || end === null) return null;

                            const top    = start * PX_PER_MINUTE;
                            const height = Math.max((end - start) * PX_PER_MINUTE, 36);
                            const c = SECTION_COLORS[task.timeOfDay] || SECTION_COLORS.default;

                            return (
                                <div
                                    key={task.id}
                                    className={`dc-event ${task.completed ? "dc-event-done" : ""}`}
                                    style={{
                                        top,
                                        height,
                                        background: c.bg,
                                        borderLeft: `4px solid ${c.border}`,
                                    }}
                                    onClick={() => onToggle(task.id)}
                                >
                                    <div className="dc-event-inner">
                                        <i
                                            className={`fas ${task.completed ? "fa-circle-check" : c.icon}`}
                                            style={{ color: c.border, flexShrink: 0 }}
                                        ></i>
                                        <div className="dc-event-body">
                                            <span className="dc-event-title">{task.title}</span>
                                            <span className="dc-event-time">
                                                <i className="fas fa-clock" style={{ fontSize: 10 }}></i>
                                                {formatTime(task.startTime)} – {formatTime(task.endTime)}
                                            </span>
                                        </div>
                                        {task.status === "running" && (
                                            <span className="dc-event-live">
                                                <i className="fas fa-circle-play"></i>
                                            </span>
                                        )}
                                    </div>
                                </div>
                            );
                        })}

                        {/* START-ONLY PINS */}
                        {startOnlyTasks.map(task => {
                            const start = timeToMinutes(task.startTime);
                            if (start === null) return null;

                            const top = start * PX_PER_MINUTE;
                            const c   = SECTION_COLORS[task.timeOfDay] || SECTION_COLORS.default;

                            return (
                                <div
                                    key={task.id}
                                    className={`dc-event dc-event-pin ${task.completed ? "dc-event-done" : ""}`}
                                    style={{
                                        top,
                                        height: 34,
                                        background: c.bg,
                                        borderLeft: `4px solid ${c.border}`,
                                    }}
                                    onClick={() => onToggle(task.id)}
                                >
                                    <div className="dc-event-inner">
                                        <i
                                            className="fas fa-map-pin"
                                            style={{ color: c.border, flexShrink: 0 }}
                                        ></i>
                                        <div className="dc-event-body">
                                            <span className="dc-event-title">{task.title}</span>
                                             {/* <span className="dc-event-time">
                                                <i className="fas fa-clock" style={{ fontSize: 10 }}></i>
                                                {formatTime(task.startTime)}
                                            </span> */}
                                        </div>
                                    </div>
                                </div>
                            );
                        })}
                    </div>
                </div>
            )}

            {tasks.length === 0 && (
                <div className="dc-empty">
                    <i className="fas fa-calendar-plus" style={{ fontSize: 32, color: "#c0b4f5" }}></i>
                    <p>No tasks yet. Add some above!</p>
                </div>
            )}
        </div>
    );
}