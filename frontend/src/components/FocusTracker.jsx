import React, { useEffect, useRef, useState } from "react";

export default function FocusTracker({ tasks = [], activeTaskId }) {

    /* ================================
       TOTAL APP TIME
    ================================== */

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

    /* ================================
       LAST 1 HOUR COMPLETED TASKS
    ================================== */

    const oneHourAgo = Date.now() - 60 * 60 * 1000;

    const completedLastHour = tasks.filter(
        t =>
            t.completed &&
            t.completedAt &&
            new Date(t.completedAt).getTime() > oneHourAgo
    ).length;

    const activeTasksCount = tasks.filter(
        t => !t.completed
    ).length;

    /* ================================
       CURRENT ACTIVE TASK (NEW)
       → Yeh wahi task hai jisme user ne Start dabaya
    ================================== */

    const activeTask = tasks.find(t => t.id === activeTaskId);

    /* ================================
       30 MIN BREAK ALERT
    ================================== */

    useEffect(() => {
        if (!activeTaskId) return;

        const timer = setTimeout(() => {
            alert("⏰ 30 minutes ho gaye! 5 min break le lo.");
        }, 30 * 60 * 1000);

        return () => clearTimeout(timer);
    }, [activeTaskId]);

    /* ================================
       IDLE DETECTION
    ================================== */

    const [isIdle, setIsIdle] = useState(false);
    const lastActivityRef = useRef(Date.now());

    useEffect(() => {
        const updateActivity = () => {
            lastActivityRef.current = Date.now();
            setIsIdle(false);
        };

        window.addEventListener("mousemove", updateActivity);
        window.addEventListener("keydown", updateActivity);
        window.addEventListener("click", updateActivity);

        const idleCheck = setInterval(() => {
            const diff = Date.now() - lastActivityRef.current;
            if (diff > 2 * 60 * 1000) {
                setIsIdle(true);
            }
        }, 10000);

        return () => {
            window.removeEventListener("mousemove", updateActivity);
            window.removeEventListener("keydown", updateActivity);
            window.removeEventListener("click", updateActivity);
            clearInterval(idleCheck);
        };
    }, []);

    /* ================================
       BEHAVIOR TRACKING ENGINE
    ================================== */

    const [usageType, setUsageType] = useState("neutral");

    const registerAction = (type) => {
        const now = Date.now();
        const log = JSON.parse(localStorage.getItem("activity-log") || "[]");

        log.push({ type, time: now });

        localStorage.setItem("activity-log", JSON.stringify(log));
    };

    useEffect(() => {
        const handler = (e) => registerAction(e.detail);
        window.addEventListener("planner-action", handler);

        return () => {
            window.removeEventListener("planner-action", handler);
        };
    }, []);

    useEffect(() => {
        const interval = setInterval(() => {
            const log = JSON.parse(localStorage.getItem("activity-log") || "[]");
            const last10Min = Date.now() - 10 * 60 * 1000;

            const recent = log.filter(l => l.time > last10Min);

            const productive = recent.filter(l =>
                ["task-complete", "task-edit", "focus-start"].includes(l.type)
            ).length;

            const passive = recent.filter(l =>
                ["navigation"].includes(l.type)
            ).length;

            if (productive >= 2) setUsageType("productive");
            else if (passive > 5) setUsageType("drifting");
            else if (isIdle) setUsageType("wasting");
            else setUsageType("neutral");

        }, 15000);

        return () => clearInterval(interval);
    }, [isIdle]);

    /* ================================
       ENERGY CURVE LEARNING ENGINE
    ================================== */

    const learnEnergyPattern = () => {
        if (usageType !== "productive") return;

        const hour = new Date().getHours();
        const curve = JSON.parse(localStorage.getItem("energy-curve") || "{}");

        if (hour >= 6 && hour < 12) curve.morning = (curve.morning || 0) + 1;
        else if (hour >= 12 && hour < 17) curve.afternoon = (curve.afternoon || 0) + 1;
        else if (hour >= 17 && hour < 22) curve.evening = (curve.evening || 0) + 1;
        else curve.night = (curve.night || 0) + 1;

        localStorage.setItem("energy-curve", JSON.stringify(curve));
    };

    useEffect(() => {
        const interval = setInterval(learnEnergyPattern, 60000);
        return () => clearInterval(interval);
    }, [usageType]);

    /* ================================
       READ ENERGY CURVE
    ================================== */

    const [currentEnergy, setCurrentEnergy] = useState("learning");
    const [energySuggestion, setEnergySuggestion] = useState("");

    useEffect(() => {
        const interval = setInterval(() => {
            const curve = JSON.parse(localStorage.getItem("energy-curve") || "{}");
            const hour = new Date().getHours();

            let label = "neutral";

            if (curve.morning && hour >= 6 && hour < 12) label = "morning";
            else if (curve.afternoon && hour >= 12 && hour < 17) label = "afternoon";
            else if (curve.evening && hour >= 17 && hour < 22) label = "evening";
            else if (curve.night) label = "night";

            setCurrentEnergy(label);

            const suggestions = {
                morning: "🚀 Best time for deep work",
                afternoon: "⚖️ Do light execution tasks",
                evening: "🧠 Plan & reflect",
                night: "🌙 Wrap up, avoid heavy thinking",
                neutral: "⏳ Learning your rhythm...",
                learning: "📊 Observing behaviour..."
            };

            setEnergySuggestion(suggestions[label] || "");
        }, 10000);

        return () => clearInterval(interval);
    }, []);

    /* ================================
       EXPORT INSIGHTS
    ================================== */

    useEffect(() => {
        const payload = {
            sessionTime: totalSeconds,
            usageType,
            isIdle,
            activeTasksCount,
            completedLastHour,
            energyState: currentEnergy,
            activeTask: activeTask ? activeTask.title : null
        };

        localStorage.setItem("focus-insight", JSON.stringify(payload));
    }, [totalSeconds, usageType, isIdle, activeTasksCount, completedLastHour, currentEnergy, activeTask]);

    const formatTime = sec => {
        const h = Math.floor(sec / 3600);
        const m = Math.floor((sec % 3600) / 60);
        return `${h}h ${m}m`;
    };

    /* ================================
       UI
    ================================== */

    return (
        <div style={{ padding: 20 }}>
            <h3>📊 Productivity Insights</h3>

            <p>⏱ App Time: <b>{formatTime(totalSeconds)}</b></p>
            <p>✅ Completed (Last 1h): <b>{completedLastHour}</b></p>
            <p>
                📌 Active Tasks: <b>{activeTasksCount}</b>

                {activeTask && (
                    <>
                        {" "} | 🔥 Working On:
                        <b style={{ marginLeft: 6 }}>
                            {activeTask.title}
                        </b>
                    </>
                )}
            </p>


            {/* 🔥 ACTIVE TASK NAME (NEW) */}
            {activeTask && (
                <div style={{
                    marginTop: 10,
                    padding: "10px 14px",
                    background: "#fff3cd",
                    border: "1px solid #ffeeba",
                    borderRadius: 6
                }}>
                    🔥 Currently Working On:
                    <b style={{ marginLeft: 6 }}>{activeTask.title}</b>
                </div>
            )}

            <p>🧠 Usage State: <b>{usageType}</b></p>

            {isIdle && (
                <p style={{ color: "red" }}>
                    ⚠️ You seem idle
                </p>
            )}

            <div style={{
                marginTop: 30,
                padding: 15,
                border: "1px dashed #888",
                borderRadius: 8,
                background: "#fafafa"
            }}>
                <h4>⚙️ Insight Panel</h4>

                <p>🕒 Energy Level: <b>{currentEnergy}</b></p>
                <p>💡 Suggestion: <b>{energySuggestion}</b></p>
            </div>
        </div>
    );
}
