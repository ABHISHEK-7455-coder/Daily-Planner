import React, { useState, useRef, useEffect } from "react";
import TaskGuideModal from "./TaskGuideModal";
// import TimeProgressRing from "./TimeProgressRing";
import "./TaskItem.css";

// format ISO time → 8:50 PM
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
    onStart,
    onEditTime
}) {
    /* ---------------- TITLE EDIT ---------------- */
    const [isEditing, setIsEditing] = useState(false);
    const [text, setText] = useState(task.title);

    /* ---------------- TIME EDIT ---------------- */
    const [isEditingTime, setIsEditingTime] = useState(false);
    const [startTime, setStartTime] = useState(task.startTime || "");
    const [endTime, setEndTime] = useState(task.endTime || "");

    /* 🆕 unified editor ref (title + time together) */
    const editorRef = useRef(null);

    const [showMoveOptions, setShowMoveOptions] = useState(false);
    const [showGuide, setShowGuide] = useState(false);

    const sections = ["morning", "afternoon", "evening"]
        .filter(s => s !== task.timeOfDay);

    /* ---------- OUTSIDE CLICK SAVE (title + time) ---------- */
    useEffect(() => {
        const handleClickOutside = (e) => {
            if (
                (isEditing || isEditingTime) &&
                editorRef.current &&
                !editorRef.current.contains(e.target)
            ) {
                // save title
                if (text !== task.title) {
                    onEdit(task.id, text);
                }

                // save time (if user added/changed anything)
                if (startTime || endTime) {
                    onEditTime(task.id, startTime || null, endTime || null);
                }

                setIsEditing(false);
                setIsEditingTime(false);
            }
        };

        document.addEventListener("mousedown", handleClickOutside);
        return () => document.removeEventListener("mousedown", handleClickOutside);
    }, [isEditing, isEditingTime, text, startTime, endTime, task, onEdit, onEditTime]);

    return (
        <div className={`task-item ${task.completed ? "task-item-completed" : ""}`}>
            {/* LEFT */}
            <div className="task-item-left">
                <input
                    type="checkbox"
                    className="task-item-checkbox"
                    checked={task.completed}
                    onChange={() => onToggle(task.id)}
                />

                <div className="task-item-content" ref={editorRef}>
                    <div className="task-item-title-row">
                        {isEditing ? (
                            <input
                                className="task-item-edit-input"
                                value={text}
                                onChange={(e) => setText(e.target.value)}
                                autoFocus
                            />
                        ) : (
                            <span
                                className="task-item-title"
                                onDoubleClick={() => {
                                    setText(task.title);
                                    setStartTime(task.startTime || "");
                                    setEndTime(task.endTime || "");
                                    setIsEditing(true);

                                    // if task has no time → allow adding immediately
                                    if (!task.startTime) {
                                        setIsEditingTime(true);
                                    }
                                }}
                            >
                                {task.title}
                            </span>
                        )}

                        {task.snoozed && !task.completed && (
                            <span className="task-item-snoozed-badge">
                                Snoozed
                            </span>
                        )}
                    </div>

                    {/* -------- TIME DISPLAY / EDIT -------- */}
                    {(task.startTime || isEditingTime) && (
                        isEditingTime ? (
                            <span className="task-item-time">
                            
                                <input
                                    type="time"
                                    value={startTime}
                                    onChange={(e) => setStartTime(e.target.value)}
                                />
                                {" – "}
                                <input
                                    type="time"
                                    value={endTime}
                                    onChange={(e) => setEndTime(e.target.value)}
                                />
                            </span>
                        ) : (
                            <span
                                className="task-item-time"
                                onDoubleClick={() => {
                                    setStartTime(task.startTime || "");
                                    setEndTime(task.endTime || "");
                                    setIsEditingTime(true);
                                }}
                            >
                                {/* <TimeProgressRing
                                    dateKey={new Date().toISOString().slice(0, 10)}
                                    startTime={task.startTime}
                                    endTime={task.endTime}
                                /> */}
                                {task.startTime}{task.endTime ? ` – ${task.endTime}` : ''}
                            </span>
                        )
                    )}

                    {/* STATUS */}
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
            </div>

            {/* RIGHT ACTIONS */}
            <div className="task-item-actions">
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