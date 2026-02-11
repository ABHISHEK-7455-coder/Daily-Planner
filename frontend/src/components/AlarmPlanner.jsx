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

// 12h → 24h
function to24Hour(hour, minute, period) {
    let h = Number(hour);
    if (period === "PM" && h !== 12) h += 12;
    if (period === "AM" && h === 12) h = 0;
    return `${String(h).padStart(2, "0")}:${minute}`;
}

function checkAlarm(alarm, now) {
    const [h, m] = alarm.time24.split(":").map(Number);

    if (!alarm.isActive) return false;
    if (alarm.snoozedUntil && Date.now() < alarm.snoozedUntil) return false;

    // ⛔ prevent multiple triggers in same minute
    if (alarm.lastTriggered && Date.now() - alarm.lastTriggered < 60000) {
        return false;
    }

    if (now.getHours() !== h || now.getMinutes() !== m) return false;

    if (alarm.repeat === "once") {
        return alarm.date === now.toISOString().slice(0, 10);
    }
    if (alarm.repeat === "daily") return true;
    if (alarm.repeat === "custom") return alarm.repeatDays.includes(now.getDay());

    return false;
}

/* ===================== COMPONENT ===================== */

export default function AlarmPlanner() {
    const [alarms, dispatch] = useReducer(alarmReducer, []);
    const [activeAlarm, setActiveAlarm] = useState(null);
    const [audioEnabled, setAudioEnabled] = useState(false);
    const audioRef = useRef(null);

    const [form, setForm] = useState({
        hour: "1",
        minute: "00",
        period: "AM",
        date: "",
        label: "",
        repeat: "once"
    });

    /* ---------- ENABLE AUDIO (Browser Policy) ---------- */
    function enableSound() {
        audioRef.current.volume = 1;
        audioRef.current.play().then(() => {
            audioRef.current.pause();
            audioRef.current.currentTime = 0;
            setAudioEnabled(true);
        });
    }

    /* ---------- Notifications ---------- */
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

    /* ---------- ALARM ENGINE ---------- */
    useEffect(() => {
        const interval = setInterval(() => {
            const now = new Date();

            alarms.forEach(alarm => {
                if (checkAlarm(alarm, now)) {
                    dispatch({ type: "TRIGGER", payload: alarm.id });
                    setActiveAlarm(alarm);

                    if (audioEnabled && audioRef.current) {
                        audioRef.current.currentTime = 0;
                        audioRef.current.loop = true;
                        audioRef.current.play();
                    }

                    if (Notification.permission === "granted") {
                        new Notification("⏰ Alarm", {
                            body: alarm.label || "Time ho gaya 🔔"
                        });
                    }

                    // ⏱ auto stop after 1 minute
                    setTimeout(() => {
                        stopAlarm(alarm.id);
                    }, alarm.autoStopMinutes * 60000);
                }
            });
        }, 1000);

        return () => clearInterval(interval);
    }, [alarms, audioEnabled]);

    /* ---------- Actions ---------- */

    function addAlarm() {
        const time24 = to24Hour(form.hour, form.minute, form.period);
        const displayTime = `${form.hour}:${form.minute} ${form.period}`;

        dispatch({
            type: "ADD",
            payload: {
                id: Date.now(),
                time24,
                displayTime,
                date: form.date,
                label: form.label,
                repeat: form.repeat,
                repeatDays: [1, 2, 3, 4, 5],
                isActive: true,
                snoozeMinutes: 5,
                autoStopMinutes: 1, // 🔥 1 minute sound
                lastTriggered: null,
                snoozedUntil: null
            }
        });

        setForm({ ...form, label: "" });
    }

    function snoozeAlarm() {
        dispatch({
            type: "SNOOZE",
            payload: {
                id: activeAlarm.id,
                until: Date.now() + activeAlarm.snoozeMinutes * 60000
            }
        });
        stopAudio();
        setActiveAlarm(null);
    }

    function stopAlarm(id) {
        stopAudio();
        dispatch({ type: "STOP", payload: id });
        setActiveAlarm(null);
    }

    function stopAudio() {
        if (!audioRef.current) return;
        audioRef.current.pause();
        audioRef.current.currentTime = 0;
    }

    /* ===================== UI ===================== */

    return (
        <div className={`planner ${activeAlarm ? "ringing" : ""}`}>
            <h2>
                <i className="fas fa-alarm-clock" style={{color: '#6c5ce7'}}></i>
                Alarm Planner
            </h2>

            {!audioEnabled && (
                <button className="enable-sound" onClick={enableSound}>
                    <i className="fas fa-volume-up"></i> Enable Alarm Sound
                </button>
            )}

            <div className="form">
                <div className="time-row">
                    <select value={form.hour}
                        onChange={e => setForm({ ...form, hour: e.target.value })}>
                        {Array.from({ length: 12 }, (_, i) => i + 1).map(h =>
                            <option key={h}>{h}</option>
                        )}
                    </select>

                    <select value={form.minute}
                        onChange={e => setForm({ ...form, minute: e.target.value })}>
                        {Array.from({ length: 60 }, (_, i) => i).map(m =>
                            <option key={m}>{String(m).padStart(2, "0")}</option>
                        )}
                    </select>

                    <select value={form.period}
                        onChange={e => setForm({ ...form, period: e.target.value })}>
                        <option>AM</option>
                        <option>PM</option>
                    </select>
                </div>

                <input type="date"
                    value={form.date}
                    onChange={e => setForm({ ...form, date: e.target.value })} />

                <div className="input-group">
                    <i className="fas fa-tag"></i>
                    <input
                        type="text"
                        placeholder="Task / Label"
                        value={form.label}
                        onChange={e => setForm({ ...form, label: e.target.value })}
                    />
                </div>

                <select value={form.repeat}
                    onChange={e => setForm({ ...form, repeat: e.target.value })}>
                    <option value="once">Once</option>
                    <option value="daily">Daily</option>
                    <option value="custom">Mon–Fri</option>
                </select>

                <button onClick={addAlarm}>
                    <i className="fas fa-plus-circle"></i> Add Alarm
                </button>
            </div>

            <ul className="list">
                {alarms.map(a => (
                    <li key={a.id}>
                        <span>
                            <i className="fas fa-bell" style={{color: a.isActive ? '#6c5ce7' : '#b2bec3'}}></i>
                            <strong>{a.displayTime}</strong> 
                            {a.label && <span style={{color: '#636e72'}}>— {a.label}</span>}
                        </span>
                        <button onClick={() => dispatch({ type: "TOGGLE", payload: a.id })}>
                            {a.isActive ? (
                                <>
                                    <i className="fas fa-toggle-on"></i> ON
                                </>
                            ) : (
                                <>
                                    <i className="fas fa-toggle-off"></i> OFF
                                </>
                            )}
                        </button>
                    </li>
                ))}
            </ul>

            {activeAlarm && (
                <div className="overlay">
                    <div className="alarm-modal shake">
                        <h1>
                            <i className="fas fa-bell-on" style={{marginRight: '12px'}}></i>
                            WAKE UP!
                        </h1>
                        <p className="time">{activeAlarm.displayTime}</p>
                        <p className="label">
                            <i className="fas fa-sticky-note" style={{marginRight: '8px', color: '#6c5ce7'}}></i>
                            {activeAlarm.label || "Time to wake up!"}
                        </p>

                        <div className="actions">
                            <button onClick={snoozeAlarm}>
                                <i className="fas fa-snooze"></i> Snooze
                            </button>
                            <button onClick={() => stopAlarm(activeAlarm.id)}>
                                <i className="fas fa-stop-circle"></i> Stop
                            </button>
                        </div>
                    </div>
                </div>
            )}

            <audio ref={audioRef} src="/alarm.mp3" preload="auto" loop />
        </div>
    );
}