import React, { useEffect, useState } from "react";
import "./FirstTaskReminderOverlay.css";

export default function FirstTaskReminderOverlay({ task, onClose }) {
    const [timeLeft, setTimeLeft] = useState("");

    useEffect(() => {
        if (!task) return;

        const interval = setInterval(() => {
            const now = new Date();
            const [h, m] = task.startTime.split(":");
            const start = new Date();
            start.setHours(h, m, 0, 0);

            const diffMs = start - now;
            const mins = Math.max(Math.floor(diffMs / 60000), 0);

            setTimeLeft(`${mins} minute${mins !== 1 ? "s" : ""}`);
        }, 1000);

        return () => clearInterval(interval);
    }, [task]);

    if (!task) return null;

    return (
        <div className="first-task-overlay">
            <div className="overlay-content">
                <h1>Today's Task</h1>

                <div className="overlay-task-title">
                    {task.title}
                </div>

                <div className="overlay-meta">
                    <div>Starts at: <strong>{task.startTime}</strong></div>
                    <div><strong>{timeLeft}</strong> until start</div>
                </div>

                <button className="overlay-dismiss-btn" onClick={onClose}>
                    Got it
                </button>
            </div>
        </div>
    );
}
