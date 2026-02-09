import React, { useEffect, useReducer, useRef, useState } from "react";
import "./AlarmPlanner.css";

/* ===================== REDUCER ===================== */

function alarmReducer(state, action) {
    switch (action.type) {
        case "LOAD":
            return action.payload;

        case "ADD":
            return [...state, action.payload];

        case "TOGGLE":
            return state.map(a =>
                a.id === action.payload ? { ...a, isActive: !a.isActive } : a
            );

        case "SNOOZE":
            return state.map(a =>
                a.id === action.payload.id
                    ? { ...a, snoozedUntil: action.payload.until }
                    : a
            );

        case "TRIGGER":
            return state.map(a =>
                a.id === action.payload
                    ? { ...a, lastTriggered: Date.now(), snoozedUntil: null }
                    : a
            );

        case "STOP":
            return state.map(a =>
                a.id === action.payload ? { ...a, isActive: false } : a
            );

        default:
            return state;
    }
}

/* ===================== UTILS ===================== */

function checkAlarm(alarm, now) {
    const [h, m] = alarm.time.split(":").map(Number);

    if (!alarm.isActive) return false;
    if (alarm.snoozedUntil && Date.now() < alarm.snoozedUntil) return false;
    if (now.getHours() !== h || now.getMinutes() !== m) return false;

    if (alarm.repeat === "once") {
        return (
            alarm.date === now.toISOString().slice(0, 10) &&
            !alarm.lastTriggered
        );
    }

    if (alarm.repeat === "daily") return true;

    if (alarm.repeat === "custom") {
        return alarm.repeatDays.includes(now.getDay());
    }

    return false;
}

/* ===================== COMPONENT ===================== */

export default function AlarmPlanner() {
    const [alarms, dispatch] = useReducer(alarmReducer, []);
    const [activeAlarm, setActiveAlarm] = useState(null);
    const audioRef = useRef(null);

    const [form, setForm] = useState({
        time: "",
        date: "",
        label: "",
        repeat: "once"
    });

    /* ---------- Notification Permission ---------- */
    useEffect(() => {
        if ("Notification" in window) {
            Notification.requestPermission();
        }
    }, []);

    /* ---------- Load & Persist ---------- */
    useEffect(() => {
        const saved = JSON.parse(localStorage.getItem("alarms")) || [];
        dispatch({ type: "LOAD", payload: saved });
    }, []);

    useEffect(() => {
        localStorage.setItem("alarms", JSON.stringify(alarms));
    }, [alarms]);

    /* ---------- Alarm Engine ---------- */
    useEffect(() => {
        const interval = setInterval(() => {
            const now = new Date();

            alarms.forEach(alarm => {
                if (checkAlarm(alarm, now)) {
                    dispatch({ type: "TRIGGER", payload: alarm.id });
                    setActiveAlarm(alarm);

                    audioRef.current.currentTime = 0;
                    audioRef.current.play();

                    if (Notification.permission === "granted") {
                        new Notification("⏰ Alarm Ringing!", {
                            body: alarm.label || "Time ho gaya 🚀"
                        });
                    }

                    setTimeout(() => {
                        stopAlarm(alarm.id);
                    }, alarm.autoStopMinutes * 60000);
                }
            });
        }, 1000);

        return () => clearInterval(interval);
    }, [alarms]);

    /* ---------- Actions ---------- */

    function addAlarm() {
        if (!form.time) return;

        dispatch({
            type: "ADD",
            payload: {
                id: Date.now(),
                ...form,
                repeatDays: [1, 2, 3, 4, 5],
                isActive: true,
                snoozeMinutes: 5,
                autoStopMinutes: 1,
                lastTriggered: null,
                snoozedUntil: null
            }
        });

        setForm({ time: "", date: "", label: "", repeat: "once" });
    }

    function snoozeAlarm() {
        dispatch({
            type: "SNOOZE",
            payload: {
                id: activeAlarm.id,
                until: Date.now() + activeAlarm.snoozeMinutes * 60000
            }
        });
        audioRef.current.pause();
        setActiveAlarm(null);
    }

    function stopAlarm(id) {
        audioRef.current.pause();
        audioRef.current.currentTime = 0;
        dispatch({ type: "STOP", payload: id });
        setActiveAlarm(null);
    }

    /* ===================== UI ===================== */

    return (
        <div className="planner">
            <h2>⏰ Alarm Planner</h2>

            <div className="form">
                <input
                    type="time"
                    value={form.time}
                    onChange={e => setForm({ ...form, time: e.target.value })}
                />
                <input
                    type="date"
                    value={form.date}
                    onChange={e => setForm({ ...form, date: e.target.value })}
                />
                <input
                    placeholder="Label"
                    value={form.label}
                    onChange={e => setForm({ ...form, label: e.target.value })}
                />
                <select
                    value={form.repeat}
                    onChange={e => setForm({ ...form, repeat: e.target.value })}
                >
                    <option value="once">Once</option>
                    <option value="daily">Daily</option>
                    <option value="custom">Mon–Fri</option>
                </select>
                <button onClick={addAlarm}>Add Alarm</button>
            </div>

            <ul className="list">
                {alarms.map(alarm => (
                    <li key={alarm.id}>
                        <span>
                            <strong>{alarm.time}</strong> — {alarm.label}
                        </span>
                        <button onClick={() => dispatch({ type: "TOGGLE", payload: alarm.id })}>
                            {alarm.isActive ? "ON" : "OFF"}
                        </button>
                    </li>
                ))}
            </ul>

            {/* 🔔 ALARM MODAL */}
            {activeAlarm && (
                <div className="overlay">
                    <div className="alarm-modal">
                        <h1>⏰ Alarm!</h1>
                        <p className="time">{activeAlarm.time}</p>
                        <p className="label">{activeAlarm.label}</p>

                        <div className="actions">
                            <button onClick={snoozeAlarm}>😴 Snooze</button>
                            <button onClick={() => stopAlarm(activeAlarm.id)}>⛔ Stop</button>
                        </div>
                    </div>
                </div>
            )}

            <audio ref={audioRef} src="frontend/src/components/WhatsApp Audio 2025-08-13 at 23.57.58_8222b80f.mp3" loop />
        </div>
    );
}
