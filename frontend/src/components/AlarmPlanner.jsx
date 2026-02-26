// AlarmPlanner.jsx — AUTH CHANGE: userId-scoped storage key
// Your original file exactly, with ONE change:
//   OLD: localStorage key = "alarms"
//   NEW: localStorage key = "alarms-{userId}"
// So User A's alarms never fire for User B on the same browser

import React, { useEffect, useReducer, useRef, useState, forwardRef, useImperativeHandle } from "react";
import "./AlarmPlanner.css";

function alarmReducer(state, action) {
    switch (action.type) {
        case "LOAD":    return action.payload;
        case "ADD":     if (state.length >= 4) return state; return [...state, action.payload];
        case "UPDATE":  return state.map(a => a.id === action.payload.id ? { ...a, ...action.payload.data } : a);
        case "TOGGLE":  return state.map(a => a.id === action.payload ? { ...a, isActive: !a.isActive } : a);
        case "SNOOZE":  return state.map(a => a.id === action.payload.id ? { ...a, snoozedUntil: action.payload.until } : a);
        case "TRIGGER": return state.map(a => a.id === action.payload ? { ...a, lastTriggered: Date.now(), snoozedUntil: null } : a);
        case "STOP":    return state.map(a => a.id === action.payload ? { ...a, isActive: false } : a);
        default:        return state;
    }
}

function to24Hour(hour, minute, period) {
    let h = Number(hour);
    if (period === "PM" && h !== 12) h += 12;
    if (period === "AM" && h === 12) h = 0;
    return `${String(h).padStart(2, "0")}:${minute}`;
}

function to12Hour(time24) {
    if (!time24) return { hour: "12", minute: "00", period: "AM" };
    const [h, m] = time24.split(":").map(Number);
    let hour = h % 12 || 12;
    const period = h < 12 ? "AM" : "PM";
    return { hour: String(hour), minute: String(m).padStart(2, "0"), period };
}

function checkAlarm(alarm, now) {
    const [h, m] = alarm.time24.split(":").map(Number);
    if (!alarm.isActive) return false;
    if (alarm.snoozedUntil && Date.now() < alarm.snoozedUntil) return false;
    if (alarm.lastTriggered && Date.now() - alarm.lastTriggered < 60000) return false;
    if (now.getHours() !== h || now.getMinutes() !== m) return false;
    const todayStr = now.toISOString().slice(0, 10);
    if (alarm.repeat === "once") { if (!alarm.date) return false; return alarm.date === todayStr; }
    if (alarm.repeat === "daily") return true;
    if (alarm.repeat === "custom") return alarm.repeatDays.includes(now.getDay());
    return false;
}

// ── AUTH CHANGE: accepts userId prop
const AlarmPlanner = forwardRef(({ userId = "anon" }, ref) => {
    const getTodayDate    = () => new Date().toISOString().split("T")[0];
    const getTomorrowDate = () => { const d = new Date(); d.setDate(d.getDate() + 1); return d.toISOString().split("T")[0]; };

    // ── AUTH CHANGE: alarms key scoped to userId
    const alarmsKey = `alarms-${userId}`;

    const [alarms, dispatch] = useReducer(
        alarmReducer,
        [],
        () => {
            try {
                const saved = localStorage.getItem(alarmsKey);
                return saved ? JSON.parse(saved) : [];
            } catch { return []; }
        }
    );

    const [activeAlarm, setActiveAlarm] = useState(null);
    const [editingId,   setEditingId]   = useState(null);

    const audioRef          = useRef(null);
    const audioUnlockedRef  = useRef(false);

    const [form, setForm] = useState({
        hour: "1", minute: "00", period: "AM",
        date: getTodayDate(), label: "", repeat: "once"
    });

    useImperativeHandle(ref, () => ({
        addAlarmFromBuddy: ({ hour, minute, period, date, label, repeat }) => {
            unlockAudio();
            if (alarms.length >= 4) {
                console.warn("⚠️ AlarmPlanner: max 4 alarms reached");
                return;
            }
            const resolvedDate  = date || getTodayDate();
            const time24        = to24Hour(hour || "1", minute || "00", period || "AM");
            const displayTime   = `${hour || "1"}:${minute || "00"} ${period || "AM"}`;
            dispatch({
                type: "ADD",
                payload: {
                    id: Date.now(), time24, displayTime,
                    date: resolvedDate, label: label || "Alarm",
                    repeat: repeat || "once", repeatDays: [1, 2, 3, 4, 5],
                    isActive: true, snoozeMinutes: 5, autoStopMinutes: 1,
                    lastTriggered: null, snoozedUntil: null, addedByBuddy: true
                }
            });
            console.log(`✅ AlarmPlanner: alarm added → ${displayTime} on ${resolvedDate}`);
        }
    }), [alarms.length]);

    // ── AUTH CHANGE: save to alarmsKey instead of "alarms"
    useEffect(() => {
        localStorage.setItem(alarmsKey, JSON.stringify(alarms));
    }, [alarms, alarmsKey]);

    const unlockAudio = () => {
        if (audioUnlockedRef.current || !audioRef.current) return;
        audioRef.current.volume = 1;
        audioRef.current.play()
            .then(() => { audioRef.current.pause(); audioRef.current.currentTime = 0; audioUnlockedRef.current = true; })
            .catch(() => { });
    };

    useEffect(() => {
        window.addEventListener("click", unlockAudio);
        return () => window.removeEventListener("click", unlockAudio);
    }, []);

    // ── AUTH CHANGE: load from alarmsKey instead of "alarms"
    useEffect(() => {
        const saved = JSON.parse(localStorage.getItem(alarmsKey)) || [];
        dispatch({ type: "LOAD", payload: saved });
    }, [alarmsKey]);

    useEffect(() => {
        const interval = setInterval(() => {
            const now = new Date();
            alarms.forEach(alarm => {
                if (checkAlarm(alarm, now)) {
                    dispatch({ type: "TRIGGER", payload: alarm.id });
                    setActiveAlarm(alarm);
                    if (audioRef.current) {
                        audioRef.current.currentTime = 0;
                        audioRef.current.loop = true;
                        audioRef.current.play().catch(() => { });
                    }
                    setTimeout(() => stopAlarm(alarm.id), alarm.autoStopMinutes * 60000);
                }
            });
        }, 1000);
        return () => clearInterval(interval);
    }, [alarms]);

    function addAlarm() {
        unlockAudio();
        if (!editingId && alarms.length >= 4) { alert("Only 4 alarms allowed"); return; }
        const time24       = to24Hour(form.hour, form.minute, form.period);
        const displayTime  = `${form.hour}:${form.minute} ${form.period}`;
        const payload      = { time24, displayTime, date: form.date || getTodayDate(), label: form.label, repeat: form.repeat };
        if (editingId) {
            dispatch({ type: "UPDATE", payload: { id: editingId, data: payload } });
            setEditingId(null);
        } else {
            dispatch({ type: "ADD", payload: { id: Date.now(), ...payload, repeatDays: [1,2,3,4,5], isActive: true, snoozeMinutes: 5, autoStopMinutes: 1, lastTriggered: null, snoozedUntil: null } });
        }
        setForm({ ...form, label: "" });
    }

    function startEdit(alarm) {
        unlockAudio();
        const { hour, minute, period } = to12Hour(alarm.time24);
        setForm({ hour, minute, period, date: alarm.date || getTodayDate(), label: alarm.label, repeat: alarm.repeat });
        setEditingId(alarm.id);
    }

    function snoozeAlarm() {
        dispatch({ type: "SNOOZE", payload: { id: activeAlarm.id, until: Date.now() + activeAlarm.snoozeMinutes * 60000 } });
        stopAudio();
        setActiveAlarm(null);
    }

    function stopAlarm(id) { stopAudio(); dispatch({ type: "STOP", payload: id }); setActiveAlarm(null); }
    function stopAudio() { if (!audioRef.current) return; audioRef.current.pause(); audioRef.current.currentTime = 0; }

    function getDateLabel(dateStr) {
        if (!dateStr) return "";
        const today    = getTodayDate();
        const tomorrow = getTomorrowDate();
        if (dateStr === today)    return "Today";
        if (dateStr === tomorrow) return "Tomorrow";
        return new Date(dateStr + "T00:00:00").toLocaleDateString(undefined, { month: "short", day: "numeric" });
    }

    return (
        <div className={`planner ${activeAlarm ? "ringing" : ""}`}>
            <h2>Alarm Planner</h2>

            <div className="form">
                <div className="time-row">
                    <select value={form.hour} onChange={e => setForm({ ...form, hour: e.target.value })}>
                        {Array.from({ length: 12 }, (_, i) => i + 1).map(h => <option key={h}>{h}</option>)}
                    </select>
                    <select value={form.minute} onChange={e => setForm({ ...form, minute: e.target.value })}>
                        {Array.from({ length: 60 }, (_, i) => i).map(m => <option key={m}>{String(m).padStart(2, "0")}</option>)}
                    </select>
                    <select value={form.period} onChange={e => setForm({ ...form, period: e.target.value })}>
                        <option>AM</option><option>PM</option>
                    </select>
                </div>

                <input type="date" value={form.date} onChange={e => setForm({ ...form, date: e.target.value })} />
                <input type="text" placeholder="Task / Label" value={form.label} onChange={e => setForm({ ...form, label: e.target.value })} />
                <select value={form.repeat} onChange={e => setForm({ ...form, repeat: e.target.value })}>
                    <option value="once">Once</option>
                    <option value="daily">Daily</option>
                    <option value="custom">Mon–Fri</option>
                </select>
                <button onClick={addAlarm}>{editingId ? "Update Alarm" : "Add Alarm"}</button>
                <p style={{ fontSize: "12px" }}>{alarms.length}/4 alarms used</p>
            </div>

            <ul className="list">
                {alarms.map(a => (
                    <li key={a.id} onClick={() => startEdit(a)} style={{ cursor: "pointer" }}>
                        <span>
                            <strong>{a.displayTime}</strong>
                            {a.date && <span className="alarm-date-label"> · {getDateLabel(a.date)}</span>}
                            {a.label && <> — {a.label}</>}
                            {a.addedByBuddy && <span className="alarm-buddy-tag"> 🤖</span>}
                        </span>
                        <button onClick={(e) => { e.stopPropagation(); dispatch({ type: "TOGGLE", payload: a.id }); }}>
                            {a.isActive ? "ON" : "OFF"}
                        </button>
                    </li>
                ))}
            </ul>

            {activeAlarm && (
                <div className="overlay">
                    <div className="alarm-modal shake">
                        <h1>WAKE UP!</h1>
                        <p className="time">{activeAlarm.displayTime}</p>
                        <p className="label">{activeAlarm.label || "Time to wake up!"}</p>
                        <div className="actions">
                            <button onClick={snoozeAlarm}>Snooze</button>
                            <button onClick={() => stopAlarm(activeAlarm.id)}>Stop</button>
                        </div>
                    </div>
                </div>
            )}

            <audio ref={audioRef} src="/alarm.mp3" preload="auto" />
        </div>
    );
});

AlarmPlanner.displayName = "AlarmPlanner";
export default AlarmPlanner;