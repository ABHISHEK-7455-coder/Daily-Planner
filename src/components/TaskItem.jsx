import { useState } from "react";
import "./TaskItem.css";

export default function TaskItem({
    task,
    onToggle,
    onDelete,
    onEdit,
    onMove,
    onSnooze
}) {
    const [isEditing, setIsEditing] = useState(false);
    const [text, setText] = useState(task.title);

    const sections = ["morning", "afternoon", "evening"]
        .filter(s => s !== task.timeOfDay);

    return (
        <div className={`task-item ${task.completed ? 'task-item-completed' : ''}`}>
            {/* LEFT */}
            <div className="task-item-left">
                <input
                    type="checkbox"
                    className="task-item-checkbox"
                    checked={task.completed}
                    onChange={() => onToggle(task.id)}
                />

                {isEditing ? (
                    <input
                        className="task-item-edit-input"
                        value={text}
                        onChange={(e) => setText(e.target.value)}
                        onBlur={() => {
                            onEdit(task.id, text);
                            setIsEditing(false);
                        }}
                        autoFocus
                    />
                ) : (
                    <div className="task-item-content">
                        <span
                            className="task-item-title"
                            onDoubleClick={() => setIsEditing(true)}
                        >
                            {task.title}
                        </span>
                        {task.time && (
                            <span className="task-item-time">{task.time}</span>
                        )}
                    </div>
                )}
            </div>

            {/* RIGHT ACTIONS */}
            <div className="task-item-actions">
                {/* 🔹 Delete */}
                <button className="task-item-delete-btn" onClick={() => onDelete(task.id)}>
                    <svg width="16" height="16" viewBox="0 0 16 16" fill="none">
                        <path d="M12 4L4 12M4 4L12 12" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round"/>
                    </svg>
                </button>
            </div>
        </div>
    );
}