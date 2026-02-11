// import React, { useEffect, useReducer, useRef, useState, forwardRef, useImperativeHandle } from "react";
// import "./AlarmPlanner.css";

// /* ===================== REDUCER ===================== */
// function alarmReducer(state, action) {
//     switch (action.type) {
//         case "LOAD":
//             return action.payload;
//         case "ADD":
//             return [...state, action.payload];
//         case "TOGGLE":
//             return state.map(a =>
//                 a.id === action.payload ? { ...a, isActive: !a.isActive } : a
//             );
//         case "SNOOZE":
//             return state.map(a =>
//                 a.id === action.payload.id
//                     ? { ...a, snoozedUntil: action.payload.until }
//                     : a
//             );
//         case "TRIGGER":
//             return state.map(a =>
//                 a.id === action.payload
//                     ? { ...a, lastTriggered: Date.now(), snoozedUntil: null }
//                     : a
//             );
//         case "STOP":
//             return state.map(a =>
//                 a.id === action.payload ? { ...a, isActive: false } : a
//             );
//         default:
//             return state;
//     }
// }

// /* ===================== UTILS ===================== */
// function to24Hour(hour, minute, period) {
//     let h = Number(hour);
//     if (period === "PM" && h !== 12) h += 12;
//     if (period === "AM" && h === 12) h = 0;
//     return `${String(h).padStart(2, "0")}:${minute}`;
// }

// function checkAlarm(alarm, now) {
//     const [h, m] = alarm.time24.split(":").map(Number);

//     if (!alarm.isActive) return false;
//     if (alarm.snoozedUntil && Date.now() < alarm.snoozedUntil) return false;
//     if (alarm.lastTriggered && Date.now() - alarm.lastTriggered < 60000) return false;
//     if (now.getHours() !== h || now.getMinutes() !== m) return false;

//     if (alarm.repeat === "once") {
//         if (!alarm.date) return true; // No date = rings today/daily
//         return alarm.date === now.toISOString().slice(0, 10);
//     }
//     if (alarm.repeat === "daily") return true;
//     if (alarm.repeat === "custom") return alarm.repeatDays.includes(now.getDay());

//     return false;
// }

// /* ===================== COMPONENT ===================== */
// const AlarmPlanner = forwardRef((props, ref) => {
//     const [alarms, dispatch] = useReducer(alarmReducer, []);
//     const [activeAlarm, setActiveAlarm] = useState(null);
//     const [audioEnabled, setAudioEnabled] = useState(false);
//     const audioRef = useRef(null);

//     const [form, setForm] = useState({
//         hour: "6",
//         minute: "00",
//         period: "AM",
//         date: "",
//         label: "",
//         repeat: "once"
//     });

//     // Expose method to parent
//     useImperativeHandle(ref, () => ({
//         addAlarmFromBuddy: (alarmData) => {
//             console.log("⏰ AlarmPlanner received:", alarmData);
            
//             try {
//                 const time24 = to24Hour(alarmData.hour, alarmData.minute, alarmData.period);
//                 const displayTime = `${alarmData.hour}:${alarmData.minute} ${alarmData.period}`;

//                 const newAlarm = {
//                     id: Date.now(),
//                     time24,
//                     displayTime,
//                     date: alarmData.date || "",
//                     label: alarmData.label || "Alarm",
//                     repeat: alarmData.repeat || "once",
//                     repeatDays: [1, 2, 3, 4, 5],
//                     isActive: true,
//                     snoozeMinutes: 5,
//                     autoStopMinutes: 1,
//                     lastTriggered: null,
//                     snoozedUntil: null
//                 };

//                 dispatch({ type: "ADD", payload: newAlarm });
//                 console.log("✅ Alarm added successfully");
                
//                 return true;
//             } catch (error) {
//                 console.error("❌ Error adding alarm:", error);
//                 return false;
//             }
//         }
//     }), []);

//     function enableSound() {
//         if (!audioRef.current) return;
//         audioRef.current.volume = 1;
//         audioRef.current.play().then(() => {
//             audioRef.current.pause();
//             audioRef.current.currentTime = 0;
//             setAudioEnabled(true);
//         }).catch(err => console.error("Audio enable error:", err));
//     }

//     useEffect(() => {
//         if ("Notification" in window) {
//             Notification.requestPermission();
//         }
//     }, []);

//     useEffect(() => {
//         const saved = JSON.parse(localStorage.getItem("alarms")) || [];
//         dispatch({ type: "LOAD", payload: saved });
//     }, []);

//     useEffect(() => {
//         localStorage.setItem("alarms", JSON.stringify(alarms));
//     }, [alarms]);

//     useEffect(() => {
//         const interval = setInterval(() => {
//             const now = new Date();

//             alarms.forEach(alarm => {
//                 if (checkAlarm(alarm, now)) {
//                     dispatch({ type: "TRIGGER", payload: alarm.id });
//                     setActiveAlarm(alarm);

//                     if (audioEnabled && audioRef.current) {
//                         audioRef.current.currentTime = 0;
//                         audioRef.current.loop = true;
//                         audioRef.current.play().catch(err => console.error("Play error:", err));
//                     }

//                     if ('Notification' in window && Notification.permission === 'granted') {
//                         new Notification("⏰ ALARM!", {
//                             body: alarm.label || "Wake up!",
//                             icon: "/icon-192x192.png"
//                         });
//                     }

//                     setTimeout(() => {
//                         stopAlarm(alarm.id);
//                     }, alarm.autoStopMinutes * 60000);
//                 }
//             });
//         }, 1000);

//         return () => clearInterval(interval);
//     }, [alarms, audioEnabled]);

//     function addAlarm() {
//         const time24 = to24Hour(form.hour, form.minute, form.period);
//         const displayTime = `${form.hour}:${form.minute} ${form.period}`;

//         dispatch({
//             type: "ADD",
//             payload: {
//                 id: Date.now(),
//                 time24,
//                 displayTime,
//                 date: form.date,
//                 label: form.label,
//                 repeat: form.repeat,
//                 repeatDays: [1, 2, 3, 4, 5],
//                 isActive: true,
//                 snoozeMinutes: 5,
//                 autoStopMinutes: 1,
//                 lastTriggered: null,
//                 snoozedUntil: null
//             }
//         });

//         setForm({ ...form, label: "", date: "" });
//     }

//     function snoozeAlarm() {
//         if (!activeAlarm) return;
//         dispatch({
//             type: "SNOOZE",
//             payload: {
//                 id: activeAlarm.id,
//                 until: Date.now() + activeAlarm.snoozeMinutes * 60000
//             }
//         });
//         stopAudio();
//         setActiveAlarm(null);
//     }

//     function stopAlarm(id) {
//         stopAudio();
//         dispatch({ type: "STOP", payload: id });
//         setActiveAlarm(null);
//     }

//     function stopAudio() {
//         if (!audioRef.current) return;
//         audioRef.current.pause();
//         audioRef.current.currentTime = 0;
//     }

//     return (
//         <div className={`planner ${activeAlarm ? "ringing" : ""}`}>
//             <h2>⏰ Alarm Planner</h2>

//             {!audioEnabled && (
//                 <button className="enable-sound" onClick={enableSound}>
//                     🔊 Enable Alarm Sound
//                 </button>
//             )}

//             <div className="form">
//                 <div className="time-row">
//                     <select value={form.hour}
//                         onChange={e => setForm({ ...form, hour: e.target.value })}>
//                         {Array.from({ length: 12 }, (_, i) => i + 1).map(h =>
//                             <option key={h}>{h}</option>
//                         )}
//                     </select>

//                     <select value={form.minute}
//                         onChange={e => setForm({ ...form, minute: e.target.value })}>
//                         {Array.from({ length: 60 }, (_, i) => i).map(m =>
//                             <option key={m}>{String(m).padStart(2, "0")}</option>
//                         )}
//                     </select>

//                     <select value={form.period}
//                         onChange={e => setForm({ ...form, period: e.target.value })}>
//                         <option>AM</option>
//                         <option>PM</option>
//                     </select>
//                 </div>

//                 <input type="date"
//                     value={form.date}
//                     onChange={e => setForm({ ...form, date: e.target.value })} 
//                     placeholder="Optional date"
//                 />

//                 <input
//                     placeholder="Label (optional)"
//                     value={form.label}
//                     onChange={e => setForm({ ...form, label: e.target.value })}
//                 />

//                 <select value={form.repeat}
//                     onChange={e => setForm({ ...form, repeat: e.target.value })}>
//                     <option value="once">Once</option>
//                     <option value="daily">Daily</option>
//                     <option value="custom">Mon–Fri</option>
//                 </select>

//                 <button onClick={addAlarm}>Add Alarm</button>
//             </div>

//             <ul className="list">
//                 {alarms.map(a => (
//                     <li key={a.id}>
//                         <span>
//                             <strong>{a.displayTime}</strong>
//                             {a.date && <span className="alarm-date"> ({a.date})</span>}
//                             {a.label && <span> — {a.label}</span>}
//                         </span>
//                         <button 
//                             onClick={() => dispatch({ type: "TOGGLE", payload: a.id })}
//                             className={a.isActive ? "active" : "inactive"}
//                         >
//                             {a.isActive ? "ON" : "OFF"}
//                         </button>
//                     </li>
//                 ))}
//             </ul>

//             {activeAlarm && (
//                 <div className="overlay">
//                     <div className="alarm-modal shake">
//                         <h1>⏰ WAKE UP!</h1>
//                         <p className="time">{activeAlarm.displayTime}</p>
//                         {activeAlarm.date && <p className="date">{activeAlarm.date}</p>}
//                         <p className="label">{activeAlarm.label}</p>

//                         <div className="actions">
//                             <button onClick={snoozeAlarm}>😴 Snooze</button>
//                             <button onClick={() => stopAlarm(activeAlarm.id)}>⛔ Stop</button>
//                         </div>
//                     </div>
//                 </div>
//             )}

//             <audio ref={audioRef} src="/alarm.mp3" preload="auto" />
//         </div>
//     );
// });

// AlarmPlanner.displayName = "AlarmPlanner";

// export default AlarmPlanner;
import React, { useEffect, useReducer, useRef, useState, forwardRef, useImperativeHandle } from "react";
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
    
    // Prevent multiple triggers in same minute
    if (alarm.lastTriggered && Date.now() - alarm.lastTriggered < 60000) {
        return false;
    }

    if (now.getHours() !== h || now.getMinutes() !== m) return false;

    // Check date/repeat
    if (alarm.repeat === "once") {
        if (!alarm.date) return true;
        return alarm.date === now.toISOString().slice(0, 10);
    }
    if (alarm.repeat === "daily") return true;
    if (alarm.repeat === "custom") return alarm.repeatDays.includes(now.getDay());

    return false;
}

/* ===================== COMPONENT ===================== */
const AlarmPlanner = forwardRef((props, ref) => {
    const [alarms, dispatch] = useReducer(alarmReducer, []);
    const [activeAlarm, setActiveAlarm] = useState(null);
    const [audioEnabled, setAudioEnabled] = useState(false);
    const audioRef = useRef(null);
    const vibrationIntervalRef = useRef(null);

    const [form, setForm] = useState({
        hour: "6",
        minute: "00",
        period: "AM",
        date: "",
        label: "",
        repeat: "once"
    });

    // ═══════════════════════════════════════════════════════════
    // VIBRATION + VOICE SUPPORT
    // ═══════════════════════════════════════════════════════════
    const startVibration = () => {
        if ('vibrate' in navigator) {
            // Continuous vibration pattern
            vibrationIntervalRef.current = setInterval(() => {
                navigator.vibrate([500, 200, 500, 200, 500]); // Long-short-long pattern
            }, 2000); // Repeat every 2 seconds
        }
    };

    const stopVibration = () => {
        if (vibrationIntervalRef.current) {
            clearInterval(vibrationIntervalRef.current);
            vibrationIntervalRef.current = null;
        }
        if ('vibrate' in navigator) {
            navigator.vibrate(0); // Stop vibration
        }
    };

    const speakAlarmMessage = (label) => {
        if ('speechSynthesis' in window) {
            const utterance = new SpeechSynthesisUtterance();
            utterance.text = `Alarm! ${label || 'Wake up'}!`;
            utterance.lang = 'en-US';
            utterance.volume = 1;
            utterance.rate = 1;
            utterance.pitch = 1;
            
            // Repeat the announcement 3 times
            utterance.onend = () => {
                setTimeout(() => {
                    if (activeAlarm) { // Only repeat if alarm is still active
                        speechSynthesis.speak(utterance);
                    }
                }, 2000);
            };
            
            speechSynthesis.speak(utterance);
        }
    };

    // ═══════════════════════════════════════════════════════════
    // EXPOSE METHOD TO PARENT (AI Buddy Integration)
    // ═══════════════════════════════════════════════════════════
    useImperativeHandle(ref, () => ({
        addAlarmFromBuddy: (alarmData) => {
            console.log("⏰ AlarmPlanner received:", alarmData);
            
            try {
                const time24 = to24Hour(alarmData.hour, alarmData.minute, alarmData.period);
                const displayTime = `${alarmData.hour}:${alarmData.minute} ${alarmData.period}`;

                const newAlarm = {
                    id: Date.now(),
                    time24,
                    displayTime,
                    date: alarmData.date || "",
                    label: alarmData.label || "Alarm",
                    repeat: alarmData.repeat || "once",
                    repeatDays: [1, 2, 3, 4, 5], // Mon-Fri
                    isActive: true,
                    snoozeMinutes: 5,
                    autoStopMinutes: 1,
                    lastTriggered: null,
                    snoozedUntil: null
                };

                dispatch({ type: "ADD", payload: newAlarm });
                console.log("✅ Alarm added successfully:", newAlarm);
                
                // Show success notification
                if ('Notification' in window && Notification.permission === 'granted') {
                    new Notification("⏰ Alarm Set!", {
                        body: `${alarmData.label || 'Alarm'} at ${displayTime}${alarmData.date ? ` on ${alarmData.date}` : ''}`,
                        icon: "/icon-192x192.png",
                        vibrate: [200, 100, 200]
                    });
                }
                
                return true;
            } catch (error) {
                console.error("❌ Error adding alarm:", error);
                return false;
            }
        }
    }), []);

    function enableSound() {
        if (!audioRef.current) return;
        audioRef.current.volume = 1;
        audioRef.current.play().then(() => {
            audioRef.current.pause();
            audioRef.current.currentTime = 0;
            setAudioEnabled(true);
            console.log("✅ Sound enabled");
        }).catch(err => {
            console.error("Audio enable error:", err);
            alert("Please allow sound for alarms to work!");
        });
    }

    // Request notification permission on mount
    useEffect(() => {
        if ("Notification" in window && Notification.permission === "default") {
            Notification.requestPermission().then(permission => {
                console.log("Notification permission:", permission);
            });
        }
    }, []);

    // Load alarms from localStorage
    useEffect(() => {
        try {
            const saved = JSON.parse(localStorage.getItem("alarms")) || [];
            dispatch({ type: "LOAD", payload: saved });
            console.log("📋 Loaded alarms:", saved.length);
        } catch (error) {
            console.error("Error loading alarms:", error);
        }
    }, []);

    // Save alarms to localStorage
    useEffect(() => {
        try {
            localStorage.setItem("alarms", JSON.stringify(alarms));
        } catch (error) {
            console.error("Error saving alarms:", error);
        }
    }, [alarms]);

    // ═══════════════════════════════════════════════════════════
    // ALARM ENGINE - Checks every second
    // ═══════════════════════════════════════════════════════════
    useEffect(() => {
        const interval = setInterval(() => {
            const now = new Date();

            alarms.forEach(alarm => {
                if (checkAlarm(alarm, now)) {
                    console.log("🔔 ALARM TRIGGERED:", alarm.label, alarm.displayTime);
                    
                    dispatch({ type: "TRIGGER", payload: alarm.id });
                    setActiveAlarm(alarm);

                    // 🔊 Play sound
                    if (audioEnabled && audioRef.current) {
                        audioRef.current.currentTime = 0;
                        audioRef.current.loop = true;
                        audioRef.current.play().catch(err => console.error("Play error:", err));
                    }

                    // 📳 Start vibration
                    startVibration();

                    // 🗣️ Speak alarm message
                    speakAlarmMessage(alarm.label);

                    // 🔔 Send notification
                    if ('Notification' in window && Notification.permission === 'granted') {
                        new Notification("⏰ ALARM!", {
                            body: alarm.label || "Wake up!",
                            icon: "/icon-192x192.png",
                            badge: "/icon-192x192.png",
                            vibrate: [500, 200, 500, 200, 500, 200, 500],
                            tag: `alarm-${alarm.id}`,
                            requireInteraction: true
                        });
                    }

                    // Auto-stop after configured time
                    setTimeout(() => {
                        console.log("⏱️ Auto-stopping alarm");
                        stopAlarm(alarm.id);
                    }, alarm.autoStopMinutes * 60000);
                }
            });
        }, 1000); // Check every second

        return () => clearInterval(interval);
    }, [alarms, audioEnabled]);

    // Cleanup on unmount
    useEffect(() => {
        return () => {
            stopVibration();
            if ('speechSynthesis' in window) {
                speechSynthesis.cancel();
            }
        };
    }, []);

    function addAlarm() {
        const time24 = to24Hour(form.hour, form.minute, form.period);
        const displayTime = `${form.hour}:${form.minute} ${form.period}`;

        const newAlarm = {
            id: Date.now(),
            time24,
            displayTime,
            date: form.date,
            label: form.label,
            repeat: form.repeat,
            repeatDays: [1, 2, 3, 4, 5],
            isActive: true,
            snoozeMinutes: 5,
            autoStopMinutes: 1,
            lastTriggered: null,
            snoozedUntil: null
        };

        dispatch({ type: "ADD", payload: newAlarm });
        console.log("➕ Alarm added manually:", newAlarm);
        
        setForm({ ...form, label: "", date: "" });
    }

    function snoozeAlarm() {
        if (!activeAlarm) return;
        
        console.log("😴 Snoozing alarm for 5 minutes");
        
        dispatch({
            type: "SNOOZE",
            payload: {
                id: activeAlarm.id,
                until: Date.now() + activeAlarm.snoozeMinutes * 60000
            }
        });
        
        stopAudio();
        stopVibration();
        
        if ('speechSynthesis' in window) {
            speechSynthesis.cancel();
        }
        
        setActiveAlarm(null);
    }

    function stopAlarm(id) {
        console.log("⛔ Stopping alarm");
        
        stopAudio();
        stopVibration();
        
        if ('speechSynthesis' in window) {
            speechSynthesis.cancel();
        }
        
        dispatch({ type: "STOP", payload: id });
        setActiveAlarm(null);
    }

    function stopAudio() {
        if (!audioRef.current) return;
        audioRef.current.pause();
        audioRef.current.currentTime = 0;
    }

    return (
        <div className={`planner ${activeAlarm ? "ringing" : ""}`}>
            <h2>⏰ Alarm Planner</h2>

            {!audioEnabled && (
                <button className="enable-sound" onClick={enableSound}>
                    🔊 Enable Alarm Sound (Required!)
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

                <input 
                    type="date"
                    value={form.date}
                    onChange={e => setForm({ ...form, date: e.target.value })} 
                    placeholder="Optional: Specific date"
                />

                <input
                    placeholder="Label (e.g., Wake up, Meeting)"
                    value={form.label}
                    onChange={e => setForm({ ...form, label: e.target.value })}
                />

                <select value={form.repeat}
                    onChange={e => setForm({ ...form, repeat: e.target.value })}>
                    <option value="once">Once</option>
                    <option value="daily">Daily</option>
                    <option value="custom">Mon–Fri</option>
                </select>

                <button onClick={addAlarm}>Add Alarm</button>
            </div>

            <ul className="list">
                {alarms.length === 0 && (
                    <li style={{textAlign: 'center', color: '#999'}}>
                        No alarms set. Add one above or ask AI Buddy!
                    </li>
                )}
                {alarms.map(a => (
                    <li key={a.id}>
                        <span>
                            <strong>{a.displayTime}</strong>
                            {a.date && <span className="alarm-date"> 📅 {a.date}</span>}
                            {a.label && <span> — {a.label}</span>}
                            {a.repeat !== 'once' && <span className="repeat-badge"> 🔁 {a.repeat}</span>}
                        </span>
                        <button 
                            onClick={() => dispatch({ type: "TOGGLE", payload: a.id })}
                            className={a.isActive ? "active" : "inactive"}
                        >
                            {a.isActive ? "ON" : "OFF"}
                        </button>
                    </li>
                ))}
            </ul>

            {activeAlarm && (
                <div className="overlay">
                    <div className="alarm-modal shake">
                        <h1>⏰ WAKE UP!</h1>
                        <p className="time">{activeAlarm.displayTime}</p>
                        {activeAlarm.date && <p className="date">📅 {activeAlarm.date}</p>}
                        <p className="label">{activeAlarm.label}</p>
                        
                        <div className="vibration-indicator">
                            📳 Vibrating... 🔊 Sound... 🗣️ Voice...
                        </div>

                        <div className="actions">
                            <button onClick={snoozeAlarm} className="snooze-btn">
                                😴 Snooze (5 min)
                            </button>
                            <button onClick={() => stopAlarm(activeAlarm.id)} className="stop-btn">
                                ⛔ Stop Alarm
                            </button>
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