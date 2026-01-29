import React from "react";
import "./TimelineDayView.css";

const minutesFromTime = (time) => {
    const [h, m] = time.split(":").map(Number);
    return h * 60 + m;
};

export default function TimelineDayView({
    tasks,
    onToggle,
    onDelete,
    onEdit
}) {
    const timedTasks = tasks.filter(t => t.startTime && t.endTime);
    const allDayTasks = tasks.filter(t => !t.startTime);

    return (
        <div className="timeline-container">
            {/* ALL DAY */}
            {allDayTasks.length > 0 && (
                <div className="timeline-all-day">
                    <h4>All day</h4>
                    {allDayTasks.map(t => (
                        <div key={t.id} className="timeline-task all-day">
                            {t.title}
                        </div>
                    ))}
                </div>
            )}

            {/* HOURS */}
            <div className="timeline-grid">
                {[...Array(24)].map((_, h) => (
                    <div key={h} className="timeline-hour">
                        <span>{String(h).padStart(2, "0")}:00</span>
                    </div>
                ))}

                {/* TASK BLOCKS */}
                {timedTasks.map(task => {
                    const top = minutesFromTime(task.startTime);
                    const height =
                        minutesFromTime(task.endTime) -
                        minutesFromTime(task.startTime);

                    return (
                        <div
                            key={task.id}
                            className="timeline-task"
                            style={{ top, height }}
                        >
                            {task.title}
                        </div>
                    );
                })}
            </div>
        </div>
    );
}
