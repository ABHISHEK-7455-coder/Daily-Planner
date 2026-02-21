import React, { useEffect, useState } from "react";
import TaskItem from "./TaskItem";
import "./TaskSection.css";

export default function TaskSection({
    title,
    tasks,
    bucketKey,
    onToggle,
    onDelete,
    onEdit,
    onMove,
    onSnooze,
    onStart,
    onEditTime,   // ✅ ADD
    selectedDate
}) {
    if (!selectedDate) return null;

    const [pov, setPov] = useState("");

    /* ---------- ICON BASED ON BUCKET (Reliable) ---------- */
    const getIcon = () => {
        if (bucketKey === "morning") return "☀️";
        if (bucketKey === "afternoon") return "🌤️";
        if (bucketKey === "evening") return "🌙";
        return "";
    };

    /* Remove emoji if already included in title */
    const cleanTitle = title.replace(/^[^\w]+/, "");

    /* ---------- LOAD POV (PER DAY + SECTION) ---------- */
    useEffect(() => {
        const stored = JSON.parse(localStorage.getItem("dailyPOV")) || {};
        const value = stored?.[selectedDate]?.[bucketKey] || "";
        setPov(value);
    }, [selectedDate, bucketKey]);

    /* ---------- SAVE POV ---------- */
    useEffect(() => {
        if (!selectedDate) return;

        const stored = JSON.parse(localStorage.getItem("dailyPOV")) || {};

        if (!stored[selectedDate]) {
            stored[selectedDate] = {};
        }

        stored[selectedDate][bucketKey] = pov;

        localStorage.setItem("dailyPOV", JSON.stringify(stored));
    }, [pov, selectedDate, bucketKey]);

    /* ---------- PLACEHOLDER LOGIC ---------- */
    const allCompleted = tasks.length && tasks.every(t => t.completed);
    const someCompleted = tasks.some(t => t.completed);

    const povPlaceholder = allCompleted
        ? "How did this part of your day go?"
        : someCompleted
            ? "What helped / what didn’t?"
            : "Why were these tasks hard to start?";

    /* ---------- DRAG EVENTS ---------- */
    const handleDrop = (e) => {
        e.preventDefault();
        e.currentTarget.classList.remove("drag-over");

        const taskId = e.dataTransfer.getData("taskId");
        if (!taskId) return;

        onMove(Number(taskId), bucketKey);
    };

    return (
        <div
            className="task-section"
            onDragOver={(e) => e.preventDefault()}
            onDragEnter={(e) => e.currentTarget.classList.add("drag-over")}
            onDragLeave={(e) => e.currentTarget.classList.remove("drag-over")}
            onDrop={handleDrop}
        >
            <h3 className="task-section-title">
                <span className="task-section-icon">{getIcon()}</span>
                <span>{cleanTitle}</span>
            </h3>

            <div className="task-section-list">
                {tasks.map(task => (
                    <div
                        key={task.id}
                        className="draggable-wrapper"
                        draggable
                        onDragStart={(e) => {
                            e.dataTransfer.setData("taskId", task.id);
                        }}
                    >
                        <TaskItem
                            task={task}
                            onToggle={onToggle}
                            onDelete={onDelete}
                            onEdit={onEdit}
                            onMove={onMove}
                            onSnooze={onSnooze}
                            onStart={onStart}
                            onEditTime={onEditTime}   // ✅ ADD
                        />
                    </div>
                ))}
            </div>

            {/* ---------- POV TEXTAREA ---------- */}
            <div className="section-pov">
                {tasks && <textarea
                    value={pov}
                    onChange={(e) => setPov(e.target.value)}
                    placeholder={povPlaceholder}
                />}
            </div>
        </div>
    );
}