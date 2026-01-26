import { useState } from "react";
import "./AddTask.css"

export default function AddTask({ onAdd }) {
    const [title, setTitle] = useState("");
    const [time, setTime] = useState("morning");

    const handleAdd = () => {
        if (!title.trim()) return;
        onAdd(title, time);
        setTitle("");
    };

    return (
        <div className="addtask-container">
            <input
                className="addtask-input"
                placeholder="Add a new task for today..."
                value={title}
                onChange={e => setTitle(e.target.value)}
            />
            <select value={time} onChange={e => setTime(e.target.value)}>
                <option value="morning">Morning</option>
                <option value="afternoon">Afternoon</option>
                <option value="evening">Evening</option>
            </select>
            <button className="addtask-submit-btn" onClick={handleAdd}>
                <svg className="addtask-submit-icon" width="20" height="20" viewBox="0 0 20 20" fill="none">
                    <path d="M10 4V16M4 10H16" stroke="currentColor" strokeWidth="2" strokeLinecap="round" />
                </svg>
            </button>
        </div>
    );
}