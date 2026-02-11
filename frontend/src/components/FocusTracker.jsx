import React, { useEffect, useRef, useState } from "react";

export default function FocusTracker({ tasks = [], activeTaskId }) {

    /* TOTAL APP TIME */
    const appStartRef = useRef(Date.now());
    const [totalSeconds, setTotalSeconds] = useState(0);

    useEffect(() => {
        const interval = setInterval(() => {
            setTotalSeconds(
                Math.floor((Date.now() - appStartRef.current) / 1000)
            );
        }, 1000);
        return () => clearInterval(interval);
    }, []);

    /* LAST 1 HOUR COMPLETED TASKS */
    const oneHourAgo = Date.now() - 60 * 60 * 1000;

    const completedLastHour = tasks.filter(
        t =>
            t.completed &&
            t.completedAt &&
            t.completedAt > oneHourAgo
    ).length;

    const activeTasksCount = tasks.filter(
        t => !t.completed
    ).length;

    /* 30 MIN BREAK ALERT */
    useEffect(() => {
        if (!activeTaskId) return;

        const timer = setTimeout(() => {
            alert("⏰ 30 minutes ho gaye! 5 min break le lo.");
        }, 30 * 60 * 1000);

        return () => clearTimeout(timer);
    }, [activeTaskId]);

    const formatTime = sec => {
        const h = Math.floor(sec / 3600);
        const m = Math.floor((sec % 3600) / 60);
        return `${h}h ${m}m`;
    };

    return (
        <div style={{ padding: 20 }}>
            <h3>📊 Productivity Insights</h3>

            <p>⏱ App Time: <b>{formatTime(totalSeconds)}</b></p>

            <p>✅ Completed (Last 1h): <b>{completedLastHour}</b></p>

            <p>📌 Active Tasks: <b>{activeTasksCount}</b></p>

            {activeTaskId && (
                <p style={{ color: "orange" }}>
                    🔥 You are working on a task
                </p>
            )}
        </div>
    );
}
