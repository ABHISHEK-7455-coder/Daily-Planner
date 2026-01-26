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

    /* 🔥 NEW POV PROPS */
    povText = "",
    onSavePov
}) {
    const [localPov, setLocalPov] = useState(povText);

    /* 🔁 Sync POV when date/day changes */
    useEffect(() => {
        setLocalPov(povText || "");
    }, [povText]);

    if (tasks.length === 0) return null;

    const getIcon = (title) => {
        if (title === "Morning") return "☀️";
        if (title === "Afternoon") return "🌤️";
        if (title === "Evening") return "🌙";
        return "📝";
    };

    const sectionKey = title.toLowerCase();

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

            {/* ✍️ POV TEXTAREA */}
            <div className="task-section-pov">
                <label className="pov-label">
                    Your thoughts about {title.toLowerCase()}
                </label>

                <textarea
                    className="pov-textarea"
                    placeholder={`How did ${title.toLowerCase()} go?`}
                    value={localPov}
                    onChange={(e) => setLocalPov(e.target.value)}
                    onBlur={() => onSavePov(sectionKey, localPov)}
                />
            </div>
        </div>
    );
}
