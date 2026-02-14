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

// ═══════════════════════════════════════════════════════════
// SMART AM/PM DETECTION
// If time is in past, assume user means PM (later today)
// ═══════════════════════════════════════════════════════════
function smartConvertTo12Hour(time24) {
    if (!time24) return { hour: "6", minute: "00", period: "AM" };
    
    const [h, m] = time24.split(':').map(Number);
    const now = new Date();
    const currentHour = now.getHours();
    const currentMinute = now.getMinutes();
    
    let hour = h;
    let period = "AM";
    
    // Convert 24h to 12h
    if (h === 0) {
        hour = 12;
        period = "AM";
    } else if (h === 12) {
        hour = 12;
        period = "PM";
    } else if (h > 12) {
        hour = h - 12;
        period = "PM";
    } else {
        hour = h;
        period = "AM";
        
        // SMART DETECTION: If time already passed today, assume PM
        if (h < 12) {
            const currentTimeInMinutes = currentHour * 60 + currentMinute;
            const alarmTimeInMinutes = h * 60 + m;
            
            // If alarm time is in the past AND it's after 12 PM now, assume user means PM
            if (alarmTimeInMinutes < currentTimeInMinutes && currentHour >= 12) {
                console.log(`⏰ Smart detection: ${h}:${m} already passed, converting to PM`);
                period = "PM";
            }
        }
    }
    
    return {
        hour: String(hour),
        minute: String(m).padStart(2, '0'),
        period
    };
}

function checkAlarm(alarm, now) {
    const [h, m] = alarm.time24.split(":").map(Number);

    if (!alarm.isActive) return false;
    if (alarm.snoozedUntil && Date.now() < alarm.snoozedUntil) return false;
    
    if (alarm.lastTriggered && Date.now() - alarm.lastTriggered < 60000) {
        return false;
    }

    if (now.getHours() !== h || now.getMinutes() !== m) return false;

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
    const [voiceLanguage, setVoiceLanguage] = useState("hi-IN"); // Default Hindi
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
    // VIBRATION SUPPORT
    // ═══════════════════════════════════════════════════════════
    const startVibration = () => {
        if ('vibrate' in navigator) {
            vibrationIntervalRef.current = setInterval(() => {
                navigator.vibrate([500, 200, 500, 200, 500]);
            }, 2000);
        }
    };

    const stopVibration = () => {
        if (vibrationIntervalRef.current) {
            clearInterval(vibrationIntervalRef.current);
            vibrationIntervalRef.current = null;
        }
        if ('vibrate' in navigator) {
            navigator.vibrate(0);
        }
    };

    // ═══════════════════════════════════════════════════════════
    // HINGLISH VOICE SUPPORT - MUCH BETTER!
    // ═══════════════════════════════════════════════════════════
    const speakAlarmMessage = (label, language = "hinglish") => {
        if (!('speechSynthesis' in window)) {
            console.log("Speech not supported");
            return;
        }

        // Stop any ongoing speech
        speechSynthesis.cancel();

        const utterance = new SpeechSynthesisUtterance();
        
        // Create Hinglish message
        let message = "";
        if (language === "hinglish" || language === "hindi") {
            message = `Alarm! ${label || 'Uth jao'}! Alarm baj raha hai!`;
            utterance.lang = 'hi-IN'; // Hindi voice
        } else {
            message = `Alarm! ${label || 'Wake up'}! Your alarm is ringing!`;
            utterance.lang = 'en-IN'; // Indian English
        }
        
        utterance.text = message;
        utterance.volume = 1;
        utterance.rate = 0.9; // Slightly slower for clarity
        utterance.pitch = 1;
        
        // Try to find Hindi voice
        const voices = speechSynthesis.getVoices();
        const hindiVoice = voices.find(voice => 
            voice.lang === 'hi-IN' || 
            voice.lang.startsWith('hi') ||
            voice.name.includes('Hindi')
        );
        
        if (hindiVoice) {
            utterance.voice = hindiVoice;
            console.log("🗣️ Using Hindi voice:", hindiVoice.name);
        } else {
            // Fallback to Indian English
            const indianVoice = voices.find(voice => 
                voice.lang === 'en-IN' || 
                voice.name.includes('Indian')
            );
            if (indianVoice) {
                utterance.voice = indianVoice;
                console.log("🗣️ Using Indian English voice:", indianVoice.name);
            }
        }
        
        let repeatCount = 0;
        const maxRepeats = 3;
        
        utterance.onend = () => {
            repeatCount++;
            if (repeatCount < maxRepeats && activeAlarm) {
                setTimeout(() => {
                    speechSynthesis.speak(utterance);
                }, 1500);
            }
        };
        
        speechSynthesis.speak(utterance);
    };

    // ═══════════════════════════════════════════════════════════
    // EXPOSE METHOD TO PARENT (AI Buddy Integration)
    // ═══════════════════════════════════════════════════════════
    useImperativeHandle(ref, () => ({
        addAlarmFromBuddy: (alarmData) => {
            console.log("⏰ AlarmPlanner received from Buddy:", alarmData);
            
            try {
                // Use SMART conversion for better AM/PM detection
                const { hour, minute, period } = smartConvertTo12Hour(alarmData.time);
                const time24 = to24Hour(hour, minute, period);
                const displayTime = `${hour}:${minute} ${period}`;

                const newAlarm = {
                    id: Date.now(),
                    time24,
                    displayTime,
                    date: alarmData.date || "",
                    label: alarmData.label || "Alarm",
                    repeat: alarmData.repeat || "once",
                    repeatDays: [1, 2, 3, 4, 5],
                    isActive: true,
                    snoozeMinutes: 5,
                    autoStopMinutes: 1,
                    lastTriggered: null,
                    snoozedUntil: null
                };

                dispatch({ type: "ADD", payload: newAlarm });
                console.log("✅ Alarm added:", displayTime, "->", time24);
                
                // Success notification
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
        },
        
        // Set voice language from buddy
        setVoiceLanguage: (lang) => {
            setVoiceLanguage(lang);
            console.log("🗣️ Voice language set to:", lang);
        }
    }), [activeAlarm]);

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
        });
    }

    useEffect(() => {
        if ("Notification" in window && Notification.permission === "default") {
            Notification.requestPermission();
        }
        
        // Load voices
        if ('speechSynthesis' in window) {
            speechSynthesis.getVoices();
            window.speechSynthesis.onvoiceschanged = () => {
                const voices = speechSynthesis.getVoices();
                console.log("📢 Available voices:", voices.map(v => v.name + " (" + v.lang + ")"));
            };
        }
    }, []);

    useEffect(() => {
        try {
            const saved = JSON.parse(localStorage.getItem("alarms")) || [];
            dispatch({ type: "LOAD", payload: saved });
        } catch (error) {
            console.error("Error loading alarms:", error);
        }
    }, []);

    useEffect(() => {
        try {
            localStorage.setItem("alarms", JSON.stringify(alarms));
        } catch (error) {
            console.error("Error saving alarms:", error);
        }
    }, [alarms]);

    // ═══════════════════════════════════════════════════════════
    // ALARM ENGINE
    // ═══════════════════════════════════════════════════════════
    useEffect(() => {
        const interval = setInterval(() => {
            const now = new Date();

            alarms.forEach(alarm => {
                if (checkAlarm(alarm, now)) {
                    console.log("🔔 ALARM TRIGGERED:", alarm.label, alarm.displayTime);
                    
                    dispatch({ type: "TRIGGER", payload: alarm.id });
                    setActiveAlarm(alarm);

                    // Sound
                    if (audioEnabled && audioRef.current) {
                        audioRef.current.currentTime = 0;
                        audioRef.current.loop = true;
                        audioRef.current.play().catch(err => console.error("Play error:", err));
                    }

                    // Vibration
                    startVibration();

                    // Voice (Hinglish!)
                    speakAlarmMessage(alarm.label, voiceLanguage);

                    // Notification
                    if ('Notification' in window && Notification.permission === 'granted') {
                        const notifMessage = voiceLanguage === "hinglish" || voiceLanguage === "hindi"
                            ? `${alarm.label || 'Uth jao'}! Alarm baj raha hai!`
                            : `${alarm.label || 'Wake up'}! Your alarm is ringing!`;
                            
                        new Notification("⏰ ALARM!", {
                            body: notifMessage,
                            icon: "/icon-192x192.png",
                            vibrate: [500, 200, 500, 200, 500],
                            tag: `alarm-${alarm.id}`,
                            requireInteraction: true
                        });
                    }

                    setTimeout(() => {
                        stopAlarm(alarm.id);
                    }, alarm.autoStopMinutes * 60000);
                }
            });
        }, 1000);

        return () => clearInterval(interval);
    }, [alarms, audioEnabled, voiceLanguage]);

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
        setForm({ ...form, label: "", date: "" });
    }

    function snoozeAlarm() {
        if (!activeAlarm) return;
        
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
                    🔊 Sound Enable Karo (Zaruri!)
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
                    placeholder="Date (optional)"
                />

                <input
                    placeholder="Label (Meeting, Wake up, etc.)"
                    value={form.label}
                    onChange={e => setForm({ ...form, label: e.target.value })}
                />

                <select value={form.repeat}
                    onChange={e => setForm({ ...form, repeat: e.target.value })}>
                    <option value="once">Ek baar</option>
                    <option value="daily">Har din</option>
                    <option value="custom">Weekdays</option>
                </select>

                <button onClick={addAlarm}>Alarm Add Karo</button>
            </div>

            <ul className="list">
                {alarms.length === 0 && (
                    <li style={{textAlign: 'center', color: '#999'}}>
                        Koi alarm nahi hai. Add karo ya Buddy se bolo!
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
                        <h1>⏰ UTH JAO!</h1>
                        <p className="time">{activeAlarm.displayTime}</p>
                        {activeAlarm.date && <p className="date">📅 {activeAlarm.date}</p>}
                        <p className="label">{activeAlarm.label}</p>
                        
                        <div className="vibration-indicator">
                            📳 Vibrating... 🔊 Sound... 🗣️ Hinglish Voice...
                        </div>

                        <div className="actions">
                            <button onClick={snoozeAlarm} className="snooze-btn">
                                😴 Snooze (5 min)
                            </button>
                            <button onClick={() => stopAlarm(activeAlarm.id)} className="stop-btn">
                                ⛔ Band Karo
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