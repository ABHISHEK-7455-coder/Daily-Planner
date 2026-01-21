import { useState } from "react";

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
        <div
            style={{
                padding: 10,
                marginBottom: 8,
                borderRadius: 6,
                background: "#f9fafb",
                display: "flex",
                justifyContent: "space-between",
                alignItems: "center"
            }}
        >
            {/* LEFT */}
            <div>
                <input
                    type="checkbox"
                    checked={task.completed}
                    onChange={() => onToggle(task.id)}
                />

                {isEditing ? (
                    <input
                        value={text}
                        onChange={(e) => setText(e.target.value)}
                        onBlur={() => {
                            onEdit(task.id, text);
                            setIsEditing(false);
                        }}
                        autoFocus
                        style={{ marginLeft: 8 }}
                    />
                ) : (
                    <span
                        onDoubleClick={() => setIsEditing(true)}
                        style={{
                            marginLeft: 8,
                            textDecoration: task.completed ? "line-through" : "none",
                            cursor: "pointer"
                        }}
                    >
                        {task.title}
                    </span>
                )}
            </div>

            {/* RIGHT ACTIONS */}
            <div style={{ display: "flex", gap: 6 }}>
                {/* 🔹 Move buttons */}
                {sections.map(sec => (
                    <button
                        key={sec}
                        onClick={() => onMove(task.id, sec)}
                        style={{ fontSize: 11 }}
                    >
                        → {sec}
                    </button>
                ))}

                {/* 🔹 Snooze */}
                <button onClick={() => onSnooze(task.id)}>
                    Snooze
                </button>

                {/* 🔹 Delete */}
                <button onClick={() => onDelete(task.id)}>✕</button>
            </div>
        </div>
    );
}
