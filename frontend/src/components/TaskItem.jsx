import React from "react";
import { useState } from "react";
import TaskGuideModal from "./TaskGuideModal";
import "./TaskItem.css";

// 🆕 format ISO time → 8:50 PM
const formatClockTime = (iso) => {
    if (!iso) return "";
    const d = new Date(iso);
    return d.toLocaleTimeString([], {
        hour: "2-digit",
        minute: "2-digit"
    });
};

export default function TaskItem({
    task,
    onToggle,
    onDelete,
    onEdit,
    onMove,
    onSnooze,
    onStart            // 🆕 NEW PROP
}) {
    const [isEditing, setIsEditing] = useState(false);
    const [text, setText] = useState(task.title);
    const [showMoveOptions, setShowMoveOptions] = useState(false);
    const [showGuide, setShowGuide] = useState(false);

    const sections = ["morning", "afternoon", "evening"]
        .filter(s => s !== task.timeOfDay);

    return (
        <div className={`task-item ${task.completed ? "task-item-completed" : ""}`}>
            {/* LEFT */}
            <div className="task-item-left">
                <div className="task-item-left-title">
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
                            <div className="task-item-title-row">
                                <span
                                    className="task-item-title"
                                    onDoubleClick={() => setIsEditing(true)}
                                >
                                    {task.title}
                                </span>

                                {task.snoozed && !task.completed && (
                                    <span className="task-item-snoozed-badge">
                                        Snoozed
                                    </span>
                                )}
                            </div>

                            {task.startTime && task.endTime && (
                                <span className="task-item-time">
                                    {task.startTime} – {task.endTime}
                                </span>
                            )}

                            {/* 🆕 TRACKING STATUS */}
                            {task.status === "running" && (
                                <span className="task-item-live">⏱ In Progress</span>
                            )}

                            {task.status === "done" && task.actualTime !== null && (
                                <span className="task-item-live">
                                    ✅ Completed in {task.actualTime} min
                                    {task.startedAt && task.completedAt && (
                                        <> ({formatClockTime(task.startedAt)} – {formatClockTime(task.completedAt)})</>
                                    )}
                                </span>
                            )}
                        </div>
                    )}
                </div>
            </div>

            {/* RIGHT ACTIONS */}
            <div className="task-item-actions">

                {/* 🆕 START BUTTON */}
                {!task.completed && task.status !== "running" && (
                    <button
                        className="task-item-start-btn"
                        onClick={() => onStart(task.id)}
                        title="Start Task"
                    >
                        ▶ Start
                    </button>
                )}

                <button
                    className="task-item-ai-btn"
                    title="How to do this?"
                    onClick={() => setShowGuide(true)}
                >
                    💡
                </button>

                <button
                    className="task-item-snooze-btn"
                    onClick={() => onSnooze(task.id)}
                    title="Snooze (move to tomorrow)"
                >
                    💤
                </button>

                <div className="task-item-move">
                    <button
                        className="task-item-move-btn"
                        onClick={() => setShowMoveOptions(prev => !prev)}
                    >
                        ↔️
                    </button>

                    {showMoveOptions && (
                        <div className="task-item-move-options">
                            {sections.map(sec => (
                                <button
                                    key={sec}
                                    onClick={() => {
                                        onMove(task.id, sec);
                                        setShowMoveOptions(false);
                                    }}
                                >
                                    {sec}
                                </button>
                            ))}
                        </div>
                    )}
                </div>

                <button
                    className="task-item-delete-btn"
                    onClick={() => onDelete(task.id)}
                >
                    ✕
                </button>
            </div>

            {showGuide && (
                <TaskGuideModal
                    task={task}
                    onClose={() => setShowGuide(false)}
                />
            )}
        </div>
    );
}
