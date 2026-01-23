import { useEffect, useState } from "react";
import TaskItem from "./TaskItem";
import "./TaskSection.css";

export default function TaskSection({
    title,
    tasks,
    onToggle,
    onDelete,
    onEdit,
    onMove,
    onSnooze,
    selectedDate // 👈 pass date from Today.jsx (YYYY-MM-DD)
}) {
    if (tasks.length === 0) return null;

    const [pov, setPov] = useState("");

    /* ---------------- ICON ---------------- */
    const getIcon = (title) => {
        if (title === "Morning") return "☀️";
        if (title === "Afternoon") return "🌤️";
        if (title === "Evening") return "🌙";
        return "📝";
    };

    /* ---------------- LOAD POV ---------------- */
    useEffect(() => {
        const stored = JSON.parse(localStorage.getItem("dailyPOV")) || {};
        const dayPOV = stored[selectedDate]?.[title] || "";
        setPov(dayPOV);
    }, [selectedDate, title]);

    /* ---------------- SAVE POV ---------------- */
    const handlePOVChange = (e) => {
        const value = e.target.value;
        setPov(value);

        const stored = JSON.parse(localStorage.getItem("dailyPOV")) || {};

        if (!stored[selectedDate]) {
            stored[selectedDate] = {};
        }

        stored[selectedDate][title] = value;

        localStorage.setItem("dailyPOV", JSON.stringify(stored));
    };

    /* ---------------- COMPLETION CHECK ---------------- */
    const allCompleted = tasks.every(t => t.completed);
    const someCompleted = tasks.some(t => t.completed);

    const povPlaceholder = allCompleted
        ? "How did this part of your day go?"
        : someCompleted
            ? "What helped / what didn’t?"
            : "Why were these tasks hard to start?";

    return (
        <div className="task-section">
            <h3 className="task-section-title">
                <span className="task-section-icon">{getIcon(title)}</span>
                <span>{title}</span>
            </h3>

            <div className="task-section-list">
                {tasks.map(task => (
                    <TaskItem
                        key={task.id}
                        task={task}
                        onToggle={onToggle}
                        onDelete={onDelete}
                        onEdit={onEdit}
                        onMove={onMove}
                        onSnooze={onSnooze}
                    />
                ))}
            </div>

            {/* ---------- POV TEXTAREA ---------- */}
            <div className="section-pov">
                <textarea
                    value={pov}
                    onChange={handlePOVChange}
                    placeholder={povPlaceholder}
                />
            </div>
        </div>
    );
}
