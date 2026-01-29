import React, { useState } from "react";
import "./AddTask.css";

export default function AddTask({ onAdd }) {
    const [title, setTitle] = useState("");
    const [timeOfDay, setTimeOfDay] = useState("morning");

    /* 🔥 NEW */
    const [useTime, setUseTime] = useState(false);
    const [startTime, setStartTime] = useState("");
    const [endTime, setEndTime] = useState("");

    const handleAdd = () => {
        if (!title.trim()) return;

        onAdd(
            title,
            timeOfDay,
            useTime ? startTime : null,
            useTime ? endTime : null
        );

        setTitle("");
        setStartTime("");
        setEndTime("");
        setUseTime(false);
    };

    return (
        <div className="addtask-container">
            <input
                className="addtask-input"
                placeholder="Add a new task for today..."
                value={title}
                onChange={e => setTitle(e.target.value)}
            />

            <select value={timeOfDay} onChange={e => setTimeOfDay(e.target.value)}>
                <option value="morning">Morning</option>
                <option value="afternoon">Afternoon</option>
                <option value="evening">Evening</option>
            </select>

            {/* 🔹 TIME TOGGLE */}
            <label className="addtask-time-toggle">
                <input
                    type="checkbox"
                    checked={useTime}
                    onChange={(e) => setUseTime(e.target.checked)}
                />
                Add time
            </label>

            {/* 🔹 TIME INPUTS */}
            {useTime && (
                <div className="addtask-time-range">
                    <input
                        type="time"
                        value={startTime}
                        onChange={(e) => setStartTime(e.target.value)}
                    />
                    <span>–</span>
                    <input
                        type="time"
                        value={endTime}
                        onChange={(e) => setEndTime(e.target.value)}
                    />
                </div>
            )}

            <button className="addtask-submit-btn" onClick={handleAdd}>
                <svg
                    className="addtask-submit-icon"
                    width="20"
                    height="20"
                    viewBox="0 0 20 20"
                    fill="none"
                >
                    <path
                        d="M10 4V16M4 10H16"
                        stroke="currentColor"
                        strokeWidth="2"
                        strokeLinecap="round"
                    />
                </svg>
            </button>
        </div>
    );
}
