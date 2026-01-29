import React from "react";
import "./DayCalendar.css";

const HOURS = Array.from({ length: 24 }, (_, i) => i);

const timeToMinutes = (time) => {
    if (!time) return null;
    const [h, m] = time.split(":").map(Number);
    return h * 60 + m;
};

export default function DayCalendar({
    tasks,
    onToggle,
    onEdit,
    onDelete
}) {
    return (
        <div className="day-calendar">
            {/* TIME COLUMN */}
            <div className="day-calendar-time">
                {HOURS.map(h => (
                    <div key={h} className="day-calendar-hour">
                        {String(h).padStart(2, "0")}:00
                    </div>
                ))}
            </div>

            {/* EVENTS COLUMN */}
            <div className="day-calendar-events">
                {HOURS.map(h => (
                    <div key={h} className="day-calendar-hour-slot" />
                ))}

                {tasks
                    .filter(t => t.startTime && t.endTime)
                    .map(task => {
                        const start = timeToMinutes(task.startTime);
                        const end = timeToMinutes(task.endTime);
                        if (start === null || end === null) return null;

                        const top = start;
                        const height = Math.max(end - start, 30);

                        return (
                            <div
                                key={task.id}
                                className={`calendar-task ${task.completed ? "calendar-task-done" : ""}`}
                                style={{ top, height }}
                                onClick={() => onToggle(task.id)}
                            >
                                <strong>{task.title}</strong>
                                <div className="calendar-task-time">
                                    {task.startTime} – {task.endTime}
                                </div>
                            </div>
                        );
                    })}
            </div>
        </div>
    );
}
