// // // AlarmPlanner.jsx — MongoDB version
// // // Replaces localStorage "alarms-{userId}" with MongoDB API calls

// // import React, { useEffect, useReducer, useRef, useState, forwardRef, useImperativeHandle } from "react";
// // import "./AlarmPlanner.css";
// // import { loadAlarms, saveAlarms } from "../services/Mongoapi";

// // function alarmReducer(state, action) {
// //   switch (action.type) {
// //     case "LOAD":    return action.payload;
// //     case "ADD":     if (state.length >= 4) return state; return [...state, action.payload];
// //     case "UPDATE":  return state.map(a => a.id === action.payload.id ? { ...a, ...action.payload.data } : a);
// //     case "TOGGLE":  return state.map(a => a.id === action.payload ? { ...a, isActive: !a.isActive } : a);
// //     case "SNOOZE":  return state.map(a => a.id === action.payload.id ? { ...a, snoozedUntil: action.payload.until } : a);
// //     case "TRIGGER": return state.map(a => a.id === action.payload ? { ...a, lastTriggered: Date.now(), snoozedUntil: null } : a);
// //     case "STOP":    return state.map(a => a.id === action.payload ? { ...a, isActive: false } : a);
// //     default:        return state;
// //   }
// // }

// // function to24Hour(hour, minute, period) {
// //   let h = Number(hour);
// //   if (period === "PM" && h !== 12) h += 12;
// //   if (period === "AM" && h === 12) h = 0;
// //   return `${String(h).padStart(2,"0")}:${minute}`;
// // }

// // function to12Hour(time24) {
// //   if (!time24) return { hour: "12", minute: "00", period: "AM" };
// //   const [h, m] = time24.split(":").map(Number);
// //   return { hour: String(h % 12 || 12), minute: String(m).padStart(2,"0"), period: h < 12 ? "AM" : "PM" };
// // }

// // function checkAlarm(alarm, now) {
// //   const [h, m] = alarm.time24.split(":").map(Number);
// //   if (!alarm.isActive) return false;
// //   if (alarm.snoozedUntil && Date.now() < alarm.snoozedUntil) return false;
// //   if (alarm.lastTriggered && Date.now() - alarm.lastTriggered < 60000) return false;
// //   if (now.getHours() !== h || now.getMinutes() !== m) return false;
// //   const todayStr = now.toISOString().slice(0, 10);
// //   if (alarm.repeat === "once")   return alarm.date === todayStr;
// //   if (alarm.repeat === "daily")  return true;
// //   if (alarm.repeat === "custom") return alarm.repeatDays.includes(now.getDay());
// //   return false;
// // }

// // const AlarmPlanner = forwardRef(({ userId = "anon" }, ref) => {
// //   const getTodayDate    = () => new Date().toISOString().split("T")[0];
// //   const getTomorrowDate = () => { const d = new Date(); d.setDate(d.getDate() + 1); return d.toISOString().split("T")[0]; };

// //   const [alarms, dispatch]  = useReducer(alarmReducer, []);
// //   const [activeAlarm, setActiveAlarm] = useState(null);
// //   const [editingId,   setEditingId]   = useState(null);

// //   const audioRef         = useRef(null);
// //   const audioUnlockedRef = useRef(false);
// //   const saveTimer        = useRef(null);

// //   const [form, setForm] = useState({
// //     hour: "1", minute: "00", period: "AM",
// //     date: getTodayDate(), label: "", repeat: "once",
// //   });

// //   // ── Load alarms from MongoDB ──────────────────────────────
// //   useEffect(() => {
// //     loadAlarms().then((data) => {
// //       dispatch({ type: "LOAD", payload: Array.isArray(data) ? data : [] });
// //     });
// //   }, [userId]);

// //   // ── Save alarms to MongoDB (debounced) ────────────────────
// //   useEffect(() => {
// //     if (saveTimer.current) clearTimeout(saveTimer.current);
// //     saveTimer.current = setTimeout(() => saveAlarms(alarms), 800);
// //   }, [alarms]);

// //   useImperativeHandle(ref, () => ({
// //     addAlarmFromBuddy: ({ hour, minute, period, date, label, repeat }) => {
// //       unlockAudio();
// //       if (alarms.length >= 4) { console.warn("Max 4 alarms reached"); return; }
// //       const time24      = to24Hour(hour || "1", minute || "00", period || "AM");
// //       const displayTime = `${hour || "1"}:${minute || "00"} ${period || "AM"}`;
// //       dispatch({
// //         type: "ADD",
// //         payload: {
// //           id: Date.now(), time24, displayTime,
// //           date: date || getTodayDate(), label: label || "Alarm",
// //           repeat: repeat || "once", repeatDays: [1,2,3,4,5],
// //           isActive: true, snoozeMinutes: 5, autoStopMinutes: 1,
// //           lastTriggered: null, snoozedUntil: null, addedByBuddy: true,
// //         },
// //       });
// //     },
// //   }), [alarms.length]);

// //   const unlockAudio = () => {
// //     if (audioUnlockedRef.current || !audioRef.current) return;
// //     audioRef.current.play().then(() => { audioRef.current.pause(); audioRef.current.currentTime = 0; audioUnlockedRef.current = true; }).catch(() => {});
// //   };

// //   useEffect(() => {
// //     window.addEventListener("click", unlockAudio);
// //     return () => window.removeEventListener("click", unlockAudio);
// //   }, []);

// //   useEffect(() => {
// //     const interval = setInterval(() => {
// //       const now = new Date();
// //       alarms.forEach(alarm => {
// //         if (checkAlarm(alarm, now)) {
// //           dispatch({ type: "TRIGGER", payload: alarm.id });
// //           setActiveAlarm(alarm);
// //           if (audioRef.current) { audioRef.current.currentTime = 0; audioRef.current.loop = true; audioRef.current.play().catch(() => {}); }
// //           setTimeout(() => stopAlarm(alarm.id), alarm.autoStopMinutes * 60000);
// //         }
// //       });
// //     }, 1000);
// //     return () => clearInterval(interval);
// //   }, [alarms]);

// //   function addAlarm() {
// //     unlockAudio();
// //     if (!editingId && alarms.length >= 4) { alert("Only 4 alarms allowed"); return; }
// //     const time24      = to24Hour(form.hour, form.minute, form.period);
// //     const displayTime = `${form.hour}:${form.minute} ${form.period}`;
// //     const payload     = { time24, displayTime, date: form.date || getTodayDate(), label: form.label, repeat: form.repeat };
// //     if (editingId) {
// //       dispatch({ type: "UPDATE", payload: { id: editingId, data: payload } });
// //       setEditingId(null);
// //     } else {
// //       dispatch({ type: "ADD", payload: { id: Date.now(), ...payload, repeatDays: [1,2,3,4,5], isActive: true, snoozeMinutes: 5, autoStopMinutes: 1, lastTriggered: null, snoozedUntil: null } });
// //     }
// //     setForm({ ...form, label: "" });
// //   }

// //   function startEdit(alarm) {
// //     unlockAudio();
// //     const { hour, minute, period } = to12Hour(alarm.time24);
// //     setForm({ hour, minute, period, date: alarm.date || getTodayDate(), label: alarm.label, repeat: alarm.repeat });
// //     setEditingId(alarm.id);
// //   }

// //   function snoozeAlarm() { dispatch({ type: "SNOOZE", payload: { id: activeAlarm.id, until: Date.now() + activeAlarm.snoozeMinutes * 60000 } }); stopAudio(); setActiveAlarm(null); }
// //   function stopAlarm(id) { stopAudio(); dispatch({ type: "STOP", payload: id }); setActiveAlarm(null); }
// //   function stopAudio()   { if (!audioRef.current) return; audioRef.current.pause(); audioRef.current.currentTime = 0; }

// //   function getDateLabel(dateStr) {
// //     if (!dateStr) return "";
// //     if (dateStr === getTodayDate())    return "Today";
// //     if (dateStr === getTomorrowDate()) return "Tomorrow";
// //     return new Date(dateStr + "T00:00:00").toLocaleDateString(undefined, { month: "short", day: "numeric" });
// //   }

// //   return (
// //     <div className={`planner ${activeAlarm ? "ringing" : ""}`}>
// //       <h2>Alarm Planner</h2>
// //       <div className="form">
// //         <div className="time-row">
// //           <select value={form.hour}   onChange={e => setForm({ ...form, hour: e.target.value })}>
// //             {Array.from({ length: 12 }, (_,i) => i+1).map(h => <option key={h}>{h}</option>)}
// //           </select>
// //           <select value={form.minute} onChange={e => setForm({ ...form, minute: e.target.value })}>
// //             {Array.from({ length: 60 }, (_,i) => i).map(m => <option key={m}>{String(m).padStart(2,"0")}</option>)}
// //           </select>
// //           <select value={form.period} onChange={e => setForm({ ...form, period: e.target.value })}>
// //             <option>AM</option><option>PM</option>
// //           </select>
// //         </div>
// //         <input type="date"   value={form.date}   onChange={e => setForm({ ...form, date: e.target.value })} />
// //         <input type="text"   value={form.label}  onChange={e => setForm({ ...form, label: e.target.value })} placeholder="Task / Label" />
// //         <select value={form.repeat} onChange={e => setForm({ ...form, repeat: e.target.value })}>
// //           <option value="once">Once</option>
// //           <option value="daily">Daily</option>
// //           <option value="custom">Mon–Fri</option>
// //         </select>
// //         <button onClick={addAlarm}>{editingId ? "Update Alarm" : "Add Alarm"}</button>
// //         <p style={{ fontSize: "12px" }}>{alarms.length}/4 alarms used</p>
// //       </div>

// //       <ul className="list">
// //         {alarms.map(a => (
// //           <li key={a.id} onClick={() => startEdit(a)} style={{ cursor: "pointer" }}>
// //             <span>
// //               <strong>{a.displayTime}</strong>
// //               {a.date && <span className="alarm-date-label"> · {getDateLabel(a.date)}</span>}
// //               {a.label && <> — {a.label}</>}
// //               {a.addedByBuddy && <span className="alarm-buddy-tag"> 🤖</span>}
// //             </span>
// //             <button onClick={(e) => { e.stopPropagation(); dispatch({ type: "TOGGLE", payload: a.id }); }}>
// //               {a.isActive ? "ON" : "OFF"}
// //             </button>
// //           </li>
// //         ))}
// //       </ul>

// //       {activeAlarm && (
// //         <div className="overlay">
// //           <div className="alarm-modal shake">
// //             <h1>WAKE UP!</h1>
// //             <p className="time">{activeAlarm.displayTime}</p>
// //             <p className="label">{activeAlarm.label || "Time to wake up!"}</p>
// //             <div className="actions">
// //               <button onClick={snoozeAlarm}>Snooze</button>
// //               <button onClick={() => stopAlarm(activeAlarm.id)}>Stop</button>
// //             </div>
// //           </div>
// //         </div>
// //       )}
// //       <audio ref={audioRef} src="/alarm.mp3" preload="auto" />
// //     </div>
// //   );
// // });

// // AlarmPlanner.displayName = "AlarmPlanner";
// // export default AlarmPlanner;
// // src/AlarmPlanner.jsx — Convex version
// // CHANGES vs MongoDB version:
// //   - Remove: import { loadAlarms, saveAlarms } from "./mongoApi"
// //   - Add: import { useAlarmsQuery, useConvexAlarms } from "./convexApi"
// //   - All alarm UI, timer, sound logic UNCHANGED

// import React, { useState, useEffect, useRef, useCallback } from "react";
// import { useAlarmsQuery, useConvexAlarms } from "./convexApi";

// export default function AlarmPlanner({ userId }) {
//   // ── CONVEX: Reactive alarms query ────────────────────────
//   // Replaces: useEffect(() => loadAlarms().then(setAlarms))
//   const alarmsData = useAlarmsQuery();
//   const { saveAlarms } = useConvexAlarms();

//   const [alarms, setAlarms]   = useState([]);
//   const saveTimerRef          = useRef(null);

//   // ── Load alarms when Convex data arrives ──────────────────
//   useEffect(() => {
//     if (alarmsData !== undefined) {
//       setAlarms(alarmsData || []);
//     }
//   }, [alarmsData]);

//   // ── Debounced save ────────────────────────────────────────
//   const debouncedSave = useCallback((newAlarms) => {
//     if (saveTimerRef.current) clearTimeout(saveTimerRef.current);
//     saveTimerRef.current = setTimeout(async () => {
//       try {
//         await saveAlarms(newAlarms);
//       } catch (err) {
//         console.error("Alarm save failed:", err);
//       }
//     }, 800);
//   }, [saveAlarms]);

//   // ── Add alarm (called from ChatBuddy onAddAlarm prop) ─────
//   const handleAddAlarm = useCallback((alarmData) => {
//     const newAlarm = {
//       id:       Date.now(),
//       hour:     alarmData.hour,
//       minute:   alarmData.minute,
//       period:   alarmData.period,
//       date:     alarmData.date,
//       label:    alarmData.label    || "Alarm",
//       repeat:   alarmData.repeat   || "once",
//       enabled:  true,
//       snoozed:  false,
//     };
//     setAlarms(prev => {
//       const updated = [...prev, newAlarm].slice(0, 4); // max 4 alarms
//       debouncedSave(updated);
//       return updated;
//     });
//   }, [debouncedSave]);

//   // ── Delete alarm ──────────────────────────────────────────
//   const handleDeleteAlarm = useCallback((alarmId) => {
//     setAlarms(prev => {
//       const updated = prev.filter(a => a.id !== alarmId);
//       debouncedSave(updated);
//       return updated;
//     });
//   }, [debouncedSave]);

//   // ── Toggle alarm on/off ───────────────────────────────────
//   const handleToggleAlarm = useCallback((alarmId) => {
//     setAlarms(prev => {
//       const updated = prev.map(a =>
//         a.id === alarmId ? { ...a, enabled: !a.enabled } : a
//       );
//       debouncedSave(updated);
//       return updated;
//     });
//   }, [debouncedSave]);

//   // ── YOUR EXISTING AlarmPlanner JSX GOES HERE ─────────────
//   return (
//     <div className="alarm-planner">
//       {/* Keep your existing AlarmPlanner JSX — only data hooks changed */}
//       <p style={{ padding: 20, color: "#888", fontSize: 13 }}>
//         📌 Replace this with your existing AlarmPlanner JSX.<br/>
//         Only change the imports at the top.
//       </p>
//     </div>
//   );
// }

// // ════════════════════════════════════════════════════════════════
// // MIGRATION CHECKLIST FOR AlarmPlanner.jsx
// // ════════════════════════════════════════════════════════════════
// //
// // 1. REPLACE imports:
// //    ❌ import { loadAlarms, saveAlarms } from "../mongoApi";
// //    ✅ import { useAlarmsQuery, useConvexAlarms } from "../convexApi";
// //
// // 2. REPLACE data loading:
// //    ❌ useEffect(() => { loadAlarms().then(setAlarms) }, [])
// //    ✅ const alarmsData = useAlarmsQuery();  // reactive!
// //       useEffect(() => { if (alarmsData) setAlarms(alarmsData) }, [alarmsData])
// //
// // 3. REPLACE save:
// //    ❌ await saveAlarms(alarms)
// //    ✅ await saveAlarms(alarms)  // same! just from useConvexAlarms()
// //
// // 4. All alarm trigger/sound/snooze logic unchanged ✅
// AlarmPlanner.jsx — Convex version
// Uses useQuery(api.alarms.getAlarms) + useMutation(api.alarms.saveAlarms)

import React, { useEffect, useReducer, useRef, useState, forwardRef, useImperativeHandle } from "react";
import "./AlarmPlanner.css";
import { useMutation, useQuery } from "convex/react";
import { api } from "../../convex/_generated/api";

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
  return `${String(h).padStart(2,"0")}:${minute}`;
}

function to12Hour(time24) {
  if (!time24) return { hour: "12", minute: "00", period: "AM" };
  const [h, m] = time24.split(":").map(Number);
  return { hour: String(h % 12 || 12), minute: String(m).padStart(2,"0"), period: h < 12 ? "AM" : "PM" };
}

function checkAlarm(alarm, now) {
  const [h, m] = alarm.time24.split(":").map(Number);
  if (!alarm.isActive) return false;
  if (alarm.snoozedUntil && Date.now() < alarm.snoozedUntil) return false;
  if (alarm.lastTriggered && Date.now() - alarm.lastTriggered < 60000) return false;
  if (now.getHours() !== h || now.getMinutes() !== m) return false;
  const todayStr = now.toISOString().slice(0, 10);
  if (alarm.repeat === "once")   return alarm.date === todayStr;
  if (alarm.repeat === "daily")  return true;
  if (alarm.repeat === "custom") return alarm.repeatDays.includes(now.getDay());
  return false;
}

const AlarmPlanner = forwardRef(({ userId = "anon" }, ref) => {
  const getTodayDate    = () => new Date().toISOString().split("T")[0];
  const getTomorrowDate = () => { const d = new Date(); d.setDate(d.getDate() + 1); return d.toISOString().split("T")[0]; };

  const [alarms, dispatch]  = useReducer(alarmReducer, []);
  const [activeAlarm, setActiveAlarm] = useState(null);

  // ── Convex hooks ──────────────────────────────────────────
  const alarmData      = useQuery(api.alarms.getAlarms);
  const saveAlarmsMut  = useMutation(api.alarms.saveAlarms);
  const [editingId,   setEditingId]   = useState(null);

  const audioRef         = useRef(null);
  const audioUnlockedRef = useRef(false);
  const saveTimer        = useRef(null);

  const [form, setForm] = useState({
    hour: "1", minute: "00", period: "AM",
    date: getTodayDate(), label: "", repeat: "once",
  });

  // ── Load alarms from Convex ───────────────────────────────
  useEffect(() => {
    if (alarmData !== undefined) {
      dispatch({ type: "LOAD", payload: Array.isArray(alarmData) ? alarmData : [] });
    }
  }, [alarmData]);

  // ── Save alarms to MongoDB (debounced) ────────────────────
  useEffect(() => {
    if (saveTimer.current) clearTimeout(saveTimer.current);
    saveTimer.current = setTimeout(() => saveAlarmsMut({ alarms }), 800);
  }, [alarms]);

  useImperativeHandle(ref, () => ({
    addAlarmFromBuddy: ({ hour, minute, period, date, label, repeat }) => {
      unlockAudio();
      if (alarms.length >= 4) { console.warn("Max 4 alarms reached"); return; }
      const time24      = to24Hour(hour || "1", minute || "00", period || "AM");
      const displayTime = `${hour || "1"}:${minute || "00"} ${period || "AM"}`;
      dispatch({
        type: "ADD",
        payload: {
          id: Date.now(), time24, displayTime,
          date: date || getTodayDate(), label: label || "Alarm",
          repeat: repeat || "once", repeatDays: [1,2,3,4,5],
          isActive: true, snoozeMinutes: 5, autoStopMinutes: 1,
          lastTriggered: null, snoozedUntil: null, addedByBuddy: true,
        },
      });
    },
  }), [alarms.length]);

  const unlockAudio = () => {
    if (audioUnlockedRef.current || !audioRef.current) return;
    audioRef.current.play().then(() => { audioRef.current.pause(); audioRef.current.currentTime = 0; audioUnlockedRef.current = true; }).catch(() => {});
  };

  useEffect(() => {
    window.addEventListener("click", unlockAudio);
    return () => window.removeEventListener("click", unlockAudio);
  }, []);

  useEffect(() => {
    const interval = setInterval(() => {
      const now = new Date();
      alarms.forEach(alarm => {
        if (checkAlarm(alarm, now)) {
          dispatch({ type: "TRIGGER", payload: alarm.id });
          setActiveAlarm(alarm);
          if (audioRef.current) { audioRef.current.currentTime = 0; audioRef.current.loop = true; audioRef.current.play().catch(() => {}); }
          setTimeout(() => stopAlarm(alarm.id), alarm.autoStopMinutes * 60000);
        }
      });
    }, 1000);
    return () => clearInterval(interval);
  }, [alarms]);

  function addAlarm() {
    unlockAudio();
    if (!editingId && alarms.length >= 4) { alert("Only 4 alarms allowed"); return; }
    const time24      = to24Hour(form.hour, form.minute, form.period);
    const displayTime = `${form.hour}:${form.minute} ${form.period}`;
    const payload     = { time24, displayTime, date: form.date || getTodayDate(), label: form.label, repeat: form.repeat };
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

  function snoozeAlarm() { dispatch({ type: "SNOOZE", payload: { id: activeAlarm.id, until: Date.now() + activeAlarm.snoozeMinutes * 60000 } }); stopAudio(); setActiveAlarm(null); }
  function stopAlarm(id) { stopAudio(); dispatch({ type: "STOP", payload: id }); setActiveAlarm(null); }
  function stopAudio()   { if (!audioRef.current) return; audioRef.current.pause(); audioRef.current.currentTime = 0; }

  function getDateLabel(dateStr) {
    if (!dateStr) return "";
    if (dateStr === getTodayDate())    return "Today";
    if (dateStr === getTomorrowDate()) return "Tomorrow";
    return new Date(dateStr + "T00:00:00").toLocaleDateString(undefined, { month: "short", day: "numeric" });
  }

  return (
    <div className={`planner ${activeAlarm ? "ringing" : ""}`}>
      <h2>Alarm Planner</h2>
      <div className="form">
        <div className="time-row">
          <select value={form.hour}   onChange={e => setForm({ ...form, hour: e.target.value })}>
            {Array.from({ length: 12 }, (_,i) => i+1).map(h => <option key={h}>{h}</option>)}
          </select>
          <select value={form.minute} onChange={e => setForm({ ...form, minute: e.target.value })}>
            {Array.from({ length: 60 }, (_,i) => i).map(m => <option key={m}>{String(m).padStart(2,"0")}</option>)}
          </select>
          <select value={form.period} onChange={e => setForm({ ...form, period: e.target.value })}>
            <option>AM</option><option>PM</option>
          </select>
        </div>
        <input type="date"   value={form.date}   onChange={e => setForm({ ...form, date: e.target.value })} />
        <input type="text"   value={form.label}  onChange={e => setForm({ ...form, label: e.target.value })} placeholder="Task / Label" />
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