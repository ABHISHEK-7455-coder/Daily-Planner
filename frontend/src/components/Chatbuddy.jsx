// ChatBuddy.jsx — AUTH CHANGE: one line only
// The ONLY difference from your working doc 1:
//   OLD: useSessionSafeChat(tabId)
//   NEW: useSessionSafeChat(tabId, userId)   ← userId from props
// This scopes chat history to "chat-messages-{userId}-{tabId}"
// so User A and User B NEVER share chat history on same browser

import React, { useState, useEffect, useRef, useCallback } from "react";
import "./ChatBuddy.css";
import {
  useTabSession,
  useSessionSafeChat,
  useSessionSafeFlow,
  useOutOfSyncDetector,
} from "./Usetabsession";

const API_URL = import.meta.env.VITE_BACKEND_URL || "http://localhost:3001" ;

export default function AdvancedBuddy({
  currentDate,
  tasks,
  userId,        // ── AUTH CHANGE: new prop (passed from Today.jsx)
  onAddTask,
  onCompleteTask,
  onDeleteTask,
  onUpdateNotes,
  onAddAlarm,
}) {
  const {
    tabId,
    broadcastDateChange,
    onSharedDataChanged,
    scheduleReminder,
    checkPendingReminders,
  } = useTabSession();

  // ── AUTH CHANGE: pass userId so chat key = "chat-messages-{userId}-{tabId}"
  // Everything else in this file is identical to your working version
  const { messages, setMessages, clearMessages } = useSessionSafeChat(tabId, userId || "anon");

  const messagesRef = useRef(messages);
  const setMessagesWithRef = useCallback((updater) => {
    setMessages((prev) => {
      const next = typeof updater === "function" ? updater(prev) : updater;
      messagesRef.current = next;
      return next;
    });
  }, [setMessages]);

  const clearMessagesWithRef = useCallback(() => {
    messagesRef.current = [];
    clearMessages();
  }, [clearMessages]);

  const {
    activeFlow, setActiveFlow, activeFlowRef,
    flowStep, setFlowStep, flowStepRef,
    flowData, setFlowData, flowDataRef,
    resetFlow,
  } = useSessionSafeFlow();

  const { isOutOfSync, resetSync } = useOutOfSyncDetector(messages, activeFlow, flowStep);

  const [isOpen, setIsOpen] = useState(false);
  const [inputText, setInputText] = useState("");
  const [inputMode, setInputMode] = useState("text");
  const [voiceMode, setVoiceMode] = useState("chat");
  const [isListening, setIsListening] = useState(false);
  const [isProcessing, setIsProcessing] = useState(false);
  const [language, setLanguage] = useState(localStorage.getItem("buddy-language") || "hinglish");
  const [showProactivePopup, setShowProactivePopup] = useState(false);
  const [proactiveMessage, setProactiveMessage] = useState("");
  const [proactiveActions, setProactiveActions] = useState([]);
  const [taskReminders, setTaskReminders] = useState(new Set());
  const [taskCheckIns, setTaskCheckIns] = useState(new Set());
  const [hasGreeted, setHasGreeted] = useState(false);
  const [nudgeBubble, setNudgeBubble] = useState(null);
  const [showNudge, setShowNudge] = useState(false);
  const [blobMood, setBlobMood] = useState("idle");
  const [quickActions, setQuickActions] = useState([]);

  const messagesEndRef = useRef(null);
  const recognitionRef = useRef(null);
  const interimTranscriptRef = useRef("");
  const reminderIntervalRef = useRef(null);
  const checkInIntervalRef = useRef(null);
  const monitorIntervalRef = useRef(null);
  const nudgeTimerRef = useRef(null);
  const nudgeIdxRef = useRef(0);
  const nudgeLoadingRef = useRef(false);

  useEffect(() => { broadcastDateChange(currentDate); }, [currentDate, broadcastDateChange]);

  useEffect(() => {
    const unsub = onSharedDataChanged(({ changeType }) => {
      console.log(`[${tabId}] 📡 Another tab changed: ${changeType}`);
    });
    return unsub;
  }, [onSharedDataChanged, tabId]);

  useEffect(() => { messagesEndRef.current?.scrollIntoView({ behavior: "smooth" }); }, [messages]);
  useEffect(() => { localStorage.setItem("buddy-language", language); }, [language]);

  useEffect(() => {
    if (isOpen && !hasGreeted && messages.length === 0) {
      fetchBuddyIntro();
      setHasGreeted(true);
    }
  }, [isOpen]);

  useEffect(() => {
    setHasGreeted(false);
    clearMessagesWithRef();
    resetFlow();
    setQuickActions([]);
  }, [currentDate]);

  useEffect(() => {
    checkPendingReminders();
    const iv = setInterval(checkPendingReminders, 60000);
    return () => clearInterval(iv);
  }, [checkPendingReminders]);

  useEffect(() => {
    if (monitorIntervalRef.current) clearInterval(monitorIntervalRef.current);
    monitorIntervalRef.current = setInterval(() => runProactiveMonitor(), 5 * 60 * 1000);
    return () => clearInterval(monitorIntervalRef.current);
  }, [tasks, language]);

  useEffect(() => {
    if (nudgeTimerRef.current) clearInterval(nudgeTimerRef.current);
    if (isOpen) { setShowNudge(false); return; }
    nudgeIdxRef.current = 0;
    fetchNudge(0);
    nudgeTimerRef.current = setInterval(() => {
      nudgeIdxRef.current = (nudgeIdxRef.current + 1) % 4;
      fetchNudge(nudgeIdxRef.current);
    }, 10000);
    return () => clearInterval(nudgeTimerRef.current);
  }, [isOpen, tasks.length, language]);

  useEffect(() => {
    if (reminderIntervalRef.current) clearInterval(reminderIntervalRef.current);
    if (checkInIntervalRef.current) clearInterval(checkInIntervalRef.current);
    reminderIntervalRef.current = setInterval(() => checkTaskReminders(), 60000);
    checkInIntervalRef.current = setInterval(() => checkTaskCompletions(), 60000);
    checkTaskReminders();
    checkTaskCompletions();
    return () => {
      clearInterval(reminderIntervalRef.current);
      clearInterval(checkInIntervalRef.current);
    };
  }, [tasks, currentDate, language]);

  useEffect(() => {
    if (!("webkitSpeechRecognition" in window) && !("SpeechRecognition" in window)) return;
    const SpeechRecognition = window.SpeechRecognition || window.webkitSpeechRecognition;
    const recognition = new SpeechRecognition();
    recognition.continuous = true;
    recognition.interimResults = true;
    recognition.lang = language === "hindi" ? "hi-IN" : "en-IN";
    recognition.onstart = () => { setIsListening(true); interimTranscriptRef.current = ""; };
    recognition.onresult = (event) => {
      let interim = "", final = "";
      for (let i = event.resultIndex; i < event.results.length; i++) {
        const t = event.results[i][0].transcript;
        if (event.results[i].isFinal) final += t; else interim += t;
      }
      if (interim) {
        interimTranscriptRef.current = interim;
        setMessagesWithRef(prev => [...prev.filter(m => !m.interim), { role: "user", content: interim, interim: true, timestamp: new Date() }]);
      }
      if (final) {
        setMessagesWithRef(prev => prev.filter(m => !m.interim));
        handleSendMessage(final);
        interimTranscriptRef.current = "";
      }
    };
    recognition.onerror = () => setIsListening(false);
    recognition.onend = () => {
      setIsListening(false);
      setMessagesWithRef(prev => prev.filter(m => !m.interim));
    };
    recognitionRef.current = recognition;
    return () => recognitionRef.current?.stop();
  }, [language]);

  const getTaskContext = () => {
    const total = tasks.length;
    const completed = tasks.filter(t => t.completed).length;
    const pending = total - completed;
    return {
      total, completed, pending,
      pendingTasks: tasks.filter(t => !t.completed),
      completedTasks: tasks.filter(t => t.completed),
    };
  };

  const FALLBACK_NUDGES = [
    { message: "Hey! 👋 I'm your buddy. Tap me to chat!", quickActions: [{ label: "➕ Add Task", action: "add_task_flow" }, { label: "📅 Plan Day", action: "plan_day_flow" }] },
    { message: "Got tasks to finish? Let me help! 🎯", quickActions: [{ label: "✅ Mark Done", action: "check_task_flow" }, { label: "➕ Add Task", action: "add_task_flow" }] },
    { message: "How was your day so far? Write it in notes 📝", quickActions: [{ label: "📝 Write Notes", action: "notes_flow" }, { label: "💬 Chat", action: "open_chat" }] },
    { message: "Want to set a reminder or alarm? I can help! ⏰", quickActions: [{ label: "⏰ Set Alarm", action: "alarm_flow" }, { label: "🔔 Reminder", action: "reminder_flow" }] },
  ];

  const fetchNudge = async (idx) => {
    if (nudgeLoadingRef.current) return;
    nudgeLoadingRef.current = true;
    setShowNudge(false);
    setTimeout(() => {
      setNudgeBubble(FALLBACK_NUDGES[idx % 4]);
      setBlobMood("happy");
      setShowNudge(true);
      setTimeout(() => setBlobMood("idle"), 800);
    }, 150);
    try {
      const now = new Date();
      const currentTime = now.toLocaleTimeString("en-US", { hour: "2-digit", minute: "2-digit", hour12: false });
      const res = await fetch(`${API_URL}/api/buddy-nudge`, {
        method: "POST", headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ language, taskContext: getTaskContext(), currentTime, nudgeIndex: idx }),
      });
      if (res.ok) {
        const data = await res.json();
        if (nudgeIdxRef.current === idx) setNudgeBubble({ message: data.message, quickActions: data.quickActions });
      }
    } catch (_) {}
    finally { nudgeLoadingRef.current = false; }
  };

  const fetchBuddyIntro = async () => {
    setIsProcessing(true);
    try {
      const now = new Date();
      const currentTime = now.toLocaleTimeString("en-US", { hour: "2-digit", minute: "2-digit", hour12: false });
      const response = await fetch(`${API_URL}/api/buddy-intro`, {
        method: "POST", headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ language, taskContext: getTaskContext(), currentTime, currentDate }),
      });
      const data = await response.json();
      setMessagesWithRef([{ role: "assistant", content: data.message, timestamp: new Date(), isIntro: true }]);
      if (data.quickActions) setQuickActions(data.quickActions);
    } catch {
      setMessagesWithRef([{
        role: "assistant",
        content: language === "english" ? "Hey! I'm your AI buddy 👋" : "Hey! Main aapka AI buddy hoon 👋",
        timestamp: new Date(), isIntro: true,
      }]);
      setQuickActions([
        { label: "➕ Add Task", action: "add_task_flow" },
        { label: "⏰ Set Alarm", action: "alarm_flow" },
        { label: "🔔 Reminder", action: "reminder_flow" },
        { label: "📅 Plan My Day", action: "plan_day_flow" },
      ]);
    } finally { setIsProcessing(false); }
  };

  const handleQuickAction = async (action) => {
    if (action === "dismiss") { setQuickActions([]); return; }
    setActiveFlow(action);
    setFlowStep("start");
    setFlowData({});
    setQuickActions([]);
    await executeFlowStep(action, "start", null, {});
  };

  const executeFlowStep = async (flow, step, userInput, currentFlowData) => {
    setIsProcessing(true);
    try {
      const now = new Date();
      const currentTime = now.toLocaleTimeString("en-US", { hour: "2-digit", minute: "2-digit", hour12: false });
      const response = await fetch(`${API_URL}/api/flow-step`, {
        method: "POST", headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ flow, step, userInput, language, taskContext: getTaskContext(), flowData: currentFlowData, currentTime, currentDate }),
      });
      const data = await response.json();
      if (data.message) setMessagesWithRef(prev => [...prev, { role: "assistant", content: data.message, timestamp: new Date(), isFlow: true }]);
      if (data.actions?.length) for (const action of data.actions) await handleAction(action);
      if (data.flow && data.nextStep && data.nextStep !== "done") {
        const merged = { ...flowDataRef.current, ...(data.flowData || {}) };
        setActiveFlow(data.flow); setFlowStep(data.nextStep); setFlowData(merged);
      } else { resetFlow(); }
      setQuickActions(data.quickActions || []);
    } catch {
      setMessagesWithRef(prev => [...prev, { role: "assistant", content: "Sorry, something went wrong. Try again!", timestamp: new Date() }]);
      resetFlow();
    } finally { setIsProcessing(false); }
  };

  const runProactiveMonitor = async () => {
    if (isOpen) return;
    const now = new Date();
    const hour = now.getHours();
    const currentTime = now.toLocaleTimeString("en-US", { hour: "2-digit", minute: "2-digit", hour12: false });
    const taskCtx = getTaskContext();
    if (taskCtx.total === 0) return;
    let monitorType = null;
    if (hour === 8 || hour === 9) monitorType = "morning_kickoff";
    else if (taskCtx.pending > 0) monitorType = "overdue_check";
    else if (hour >= 20 && hour <= 22) monitorType = "end_of_day";
    if (!monitorType) return;
    const monitorKey = `monitor-${monitorType}-${currentDate}-${hour}-${tabId}`;
    if (localStorage.getItem(monitorKey)) return;
    try {
      const response = await fetch(`${API_URL}/api/proactive-monitor`, {
        method: "POST", headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ language, taskContext: taskCtx, currentTime, monitorType }),
      });
      const data = await response.json();
      if (data.shouldNotify && data.message) {
        localStorage.setItem(monitorKey, Date.now().toString());
        setProactiveMessage(data.message);
        setProactiveActions(data.quickActions?.map(qa => ({
          label: qa.label,
          type: qa.action === "check_task_flow" ? "primary" : "secondary",
          action: () => { setShowProactivePopup(false); setIsOpen(true); handleQuickAction(qa.action); },
        })) || []);
        setShowProactivePopup(true);
      }
    } catch (e) { console.error("Proactive monitor error:", e); }
  };

  const checkTaskReminders = async () => {
    const now = new Date();
    const currentTime = now.getHours() * 60 + now.getMinutes();
    for (const task of tasks) {
      if (!task.startTime || task.completed) continue;
      const [h, m] = task.startTime.split(":").map(Number);
      const timeDiff = (h * 60 + m) - currentTime;
      const key = `reminder-${task.id}-${currentDate}-${tabId}`;
      if (timeDiff === 10 && !taskReminders.has(key)) {
        setTaskReminders(prev => new Set(prev).add(key));
        await sendTaskReminder(task);
      }
    }
  };

  const checkTaskCompletions = async () => {
    const now = new Date();
    const currentTime = now.getHours() * 60 + now.getMinutes();
    for (const task of tasks) {
      if (!task.startTime || task.completed) continue;
      const [h, m] = task.startTime.split(":").map(Number);
      const timePassed = currentTime - (h * 60 + m);
      const key = `checkin-${task.id}-${currentDate}-${tabId}`;
      if (timePassed === 30 && !taskCheckIns.has(key)) {
        setTaskCheckIns(prev => new Set(prev).add(key));
        await sendTaskCheckIn(task);
      }
    }
  };

  const sendTaskReminder = async (task) => {
    const msgs = {
      hindi: `⏰ "${task.title}" 10 मिनट में शुरू होने वाला है।`,
      english: `⏰ "${task.title}" starts in 10 minutes.`,
      hinglish: `⏰ "${task.title}" 10 min mein start hone wala hai!`,
    };
    setProactiveMessage(msgs[language] || msgs.hinglish);
    setProactiveActions([
      { label: language === "english" ? "Let's Go 💪" : "Chalo! 💪", type: "primary", action: () => { setShowProactivePopup(false); setIsOpen(true); } },
      { label: language === "english" ? "Remind Later" : "Baad Mein", type: "secondary", action: () => setShowProactivePopup(false) },
    ]);
    setShowProactivePopup(true);
  };

  const sendTaskCheckIn = async (task) => {
    const msgs = {
      hindi: `🤔 "${task.title}" हो गया क्या?`,
      english: `🤔 Did you finish "${task.title}"?`,
      hinglish: `🤔 "${task.title}" ho gaya kya?`,
    };
    setProactiveMessage(msgs[language] || msgs.hinglish);
    setProactiveActions([
      {
        label: language === "english" ? "Done! ✅" : "Ho Gaya! ✅", type: "primary",
        action: () => {
          onCompleteTask(task.id);
          setShowProactivePopup(false);
          setIsOpen(true);
          setMessagesWithRef(prev => [...prev, {
            role: "assistant",
            content: language === "english" ? `🎉 "${task.title}" done!` : `🎉 "${task.title}" ho gaya!`,
            timestamp: new Date(),
          }]);
        },
      },
      { label: language === "english" ? "Need Help 🤔" : "Help Chahiye 🤔", type: "secondary", action: () => { setShowProactivePopup(false); setIsOpen(true); } },
    ]);
    setShowProactivePopup(true);
  };

  const handleSendMessage = async (text) => {
    if (!text.trim()) return;

    if (isOutOfSync) {
      setMessagesWithRef(prev => [...prev, {
        role: "assistant",
        content: "⚠️ This session appears out of sync. Please refresh and resend your last message.",
        timestamp: new Date(), isError: true,
      }]);
      return;
    }

    const userMessage = { role: "user", content: text, timestamp: new Date() };
    const currentMessages = messagesRef.current.filter(m => !m.interim);
    setMessagesWithRef(prev => [...prev.filter(m => !m.interim), userMessage]);
    setInputText("");
    setQuickActions([]);

    if (activeFlowRef.current && flowStepRef.current) {
      await executeFlowStep(activeFlowRef.current, flowStepRef.current, text, flowDataRef.current);
      return;
    }

    setIsProcessing(true);
    try {
      const response = await fetch(`${API_URL}/api/advanced-chat`, {
        method: "POST", headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          messages: [...currentMessages, userMessage],
          language,
          taskContext: getTaskContext(),
          isVoice: inputMode === "voice",
          currentDate,
          voiceMode,
          tabId,
        }),
      });
      const data = await response.json();
      if (data.actions?.length) for (const action of data.actions) await handleAction(action);
      setMessagesWithRef(prev => [...prev, { role: "assistant", content: data.message, timestamp: new Date() }]);
      const ctx = getTaskContext();
      if (ctx.pending > 0) setQuickActions([{ label: "✅ Mark Done", action: "check_task_flow" }, { label: "➕ Add Task", action: "add_task_flow" }]);
    } catch {
      setMessagesWithRef(prev => [...prev, { role: "assistant", content: "Sorry, something went wrong.", timestamp: new Date() }]);
    } finally { setIsProcessing(false); }
  };

  const handleAction = async (action) => {
    console.log(`[${tabId}] 🎯 Action:`, action);

    switch (action.type) {

      case "set_alarm":
        if (onAddAlarm) {
          const [hRaw, mRaw] = (action.params.time || "07:00").split(":").map(Number);
          const period = hRaw < 12 ? "AM" : "PM";
          const hour12 = hRaw % 12 || 12;
          onAddAlarm({
            hour: String(hour12),
            minute: String(mRaw).padStart(2, "0"),
            period,
            date: action.params.date || new Date().toISOString().slice(0, 10),
            label: action.params.label || "Alarm",
            repeat: action.params.repeat || "once",
          });
        }
        break;

      case "set_reminder":
        await scheduleReminder(action.params.time, action.params.message, action.params.date);
        break;

      case "add_task": {
        const title = action.params.title?.trim();
        if (!title) {
          console.warn(`[${tabId}] ⚠️ add_task skipped — empty title`, action.params);
          break;
        }
        onAddTask(
          title,
          action.params.timeOfDay || "morning",
          action.params.startTime || null,
          action.params.endTime || null,
          action.params.date || null
        );
        break;
      }

      case "complete_task": {
        const taskToComplete = tasks.find(t =>
          t.title.toLowerCase() === action.params.taskTitle?.toLowerCase() ||
          t.title.toLowerCase().includes(action.params.taskTitle?.toLowerCase() || "") ||
          (action.params.taskTitle?.toLowerCase() || "").includes(t.title.toLowerCase())
        );
        if (taskToComplete) onCompleteTask(taskToComplete.id);
        break;
      }

      case "delete_task": {
        let taskToDelete = tasks.find(t =>
          t.title.toLowerCase() === action.params.taskTitle?.toLowerCase() ||
          t.title.toLowerCase().includes(action.params.taskTitle?.toLowerCase() || "") ||
          (action.params.taskTitle?.toLowerCase() || "").includes(t.title.toLowerCase())
        );
        if (!taskToDelete) {
          const words = action.params.taskTitle?.toLowerCase().split(" ") || [];
          taskToDelete = tasks.find(t => words.some(w => w.length > 2 && t.title.toLowerCase().includes(w)));
        }
        if (taskToDelete) onDeleteTask(taskToDelete.id);
        break;
      }

      case "update_notes":
        if (onUpdateNotes) onUpdateNotes(action.params.content, action.params.mode || "append");
        break;

      default:
        console.warn(`[${tabId}] Unknown action:`, action.type);
    }
  };

  const toggleVoiceInput = () => {
    if (isListening) recognitionRef.current?.stop();
    else recognitionRef.current?.start();
  };

  const handleTextSubmit = (e) => {
    e.preventDefault();
    if (inputText.trim()) handleSendMessage(inputText);
  };

  const getFlowStatusLabel = () => {
    if (!activeFlow) return null;
    const labels = {
      add_task_flow:   { icon: "➕", text: language === "english" ? "Adding task..."        : "Task add ho raha hai..."        },
      alarm_flow:      { icon: "⏰", text: language === "english" ? "Setting alarm..."      : "Alarm set ho raha hai..."       },
      reminder_flow:   { icon: "🔔", text: language === "english" ? "Setting reminder..."   : "Reminder set ho raha hai..."    },
      plan_day_flow:   { icon: "📅", text: language === "english" ? "Planning your day..."  : "Din plan ho raha hai..."        },
      notes_flow:      { icon: "📝", text: language === "english" ? "Writing notes..."      : "Notes likh rahe hain..."        },
      check_task_flow: { icon: "✅", text: language === "english" ? "Marking task done..."  : "Task complete kar rahe hain..." },
    };
    return labels[activeFlow] || null;
  };

  const taskCtx = getTaskContext();

  return (
    <>
      {showProactivePopup && (
        <div className="proactive-popup-overlay">
          <div className="proactive-popup">
            <button className="popup-close" onClick={() => setShowProactivePopup(false)}>×</button>
            <div className="popup-icon-container"><div className="popup-icon"><i className="fas fa-heart"></i></div></div>
            <p className="popup-message">{proactiveMessage}</p>
            <div className="popup-actions">
              {proactiveActions.length > 0
                ? proactiveActions.map((action, idx) => (
                    <button key={idx} className={`popup-action-btn ${action.type}`} onClick={action.action}>{action.label}</button>
                  ))
                : <>
                    <button className="popup-action-btn primary" onClick={() => { setShowProactivePopup(false); setIsOpen(true); }}>
                      <i className="fas fa-comment-dots"></i> {language === "english" ? "Open Chat" : "Chat Kholo"}
                    </button>
                    <button className="popup-action-btn secondary" onClick={() => setShowProactivePopup(false)}>
                      {language === "english" ? "Later" : "Baad Mein"}
                    </button>
                  </>
              }
            </div>
          </div>
        </div>
      )}

      <div className="buddy-float-zone">
        {!isOpen && showNudge && nudgeBubble && (
          <div className="buddy-speech-bubble">
            <div className="bubble-sparkle">✦</div>
            <p className="bubble-text">{nudgeBubble.message}</p>
            <div className="bubble-chips">
              {nudgeBubble.quickActions?.map((qa, i) => (
                <button key={i} className="bubble-chip" onClick={() => {
                  setShowNudge(false);
                  if (qa.action === "open_chat") { setIsOpen(true); }
                  else { setIsOpen(true); setTimeout(() => handleQuickAction(qa.action), 200); }
                }}>{qa.label}</button>
              ))}
            </div>
            <div className="bubble-dots">
              {[0,1,2,3].map(i => <div key={i} className={`bubble-dot ${nudgeIdxRef.current === i ? "active" : ""}`} />)}
            </div>
            <div className="bubble-tail" />
          </div>
        )}

        <button
          className={`buddy-blob ${isListening ? "listening" : ""} ${blobMood} ${isOpen ? "open" : ""}`}
          onClick={() => { setIsOpen(!isOpen); setShowNudge(false); }}
          aria-label="Toggle AI Buddy"
        >
          <div className="blob-face">
            {isListening
              ? <div className="blob-sound-waves"><span /><span /><span /></div>
              : isOpen
                ? <span className="blob-eye-x">✕</span>
                : <><span className="blob-eyes"><span className="blob-eye" /><span className="blob-eye" /></span><span className="blob-smile" /></>
            }
          </div>
        </button>
      </div>

      {isOpen && (
        <div className="advanced-buddy-window">
          <div className="buddy-header">
            <div className="buddy-info">
              <div className="buddy-avatar-small"><i className="fas fa-smile-beam"></i></div>
              <div>
                <h4>AI Buddy</h4>
                <p className="buddy-status">
                  <i className="fas fa-circle" style={{ fontSize: "8px", marginRight: "4px", color: "#55efc4" }}></i>
                  {taskCtx.total > 0 ? `${taskCtx.completed}/${taskCtx.total} done today` : language === "english" ? "Here to help" : "Madad ke liye yahan"}
                </p>
              </div>
            </div>
            <button className="close-btn" onClick={() => setIsOpen(false)}>×</button>
          </div>

          {isOutOfSync && (
            <div className="sync-error-banner" style={{
              background: "#ff7675", color: "#fff", padding: "8px 14px", fontSize: "13px",
              display: "flex", justifyContent: "space-between", alignItems: "center",
            }}>
              <span>⚠️ Session out of sync. Please refresh.</span>
              <button onClick={resetSync} style={{ background: "none", border: "1px solid #fff", color: "#fff", borderRadius: "4px", padding: "2px 8px", cursor: "pointer" }}>
                Dismiss
              </button>
            </div>
          )}

          <div className="voice-mode-tabs">
            {["hindi", "english", "hinglish"].map(lang => (
              <button key={lang} className={language === lang ? "active" : ""} onClick={() => setLanguage(lang)}>
                {lang === "hindi" ? "🇮🇳 हिंदी" : lang === "english" ? "🌐 EN" : "🎭 Mix"}
              </button>
            ))}
          </div>

          <div className="voice-mode-tabs" style={{ borderTop: "1px solid var(--buddy-border)" }}>
            {["chat", "tasks", "notes"].map(mode => (
              <button key={mode} className={voiceMode === mode ? "active" : ""} onClick={() => setVoiceMode(mode)}>
                {mode === "chat"  && <><i className="fas fa-comment-dots"></i> {language === "hindi" ? "चैट"   : "Chat"}</>}
                {mode === "tasks" && <><i className="fas fa-check-circle"></i> {language === "hindi" ? "टास्क" : "Tasks"}</>}
                {mode === "notes" && <><i className="fas fa-sticky-note"></i>  {language === "hindi" ? "नोट्स" : "Notes"}</>}
              </button>
            ))}
          </div>

          {activeFlow && getFlowStatusLabel() && (
            <div className="flow-indicator">
              <span className="flow-icon">{getFlowStatusLabel().icon}</span>
              <span className="flow-text">{getFlowStatusLabel().text}</span>
              <button className="flow-cancel" onClick={() => {
                resetFlow();
                setQuickActions([
                  { label: "➕ Add Task", action: "add_task_flow" },
                  { label: "⏰ Set Alarm", action: "alarm_flow" },
                  { label: "📅 Plan Day", action: "plan_day_flow" },
                ]);
              }}>✕ Cancel</button>
            </div>
          )}

          <div className="buddy-messages">
            {messages.length === 0 && !isProcessing && (
              <div className="message assistant">
                <div className="message-content">
                  <i className="fas fa-sparkles" style={{ marginRight: "6px", color: "#fdcb6e" }}></i>
                  {language === "english" ? "Hey! Opening your buddy... 👋" : language === "hindi" ? "नमस्ते! लोड हो रहा है... 👋" : "Hey! Load ho raha hai... 👋"}
                </div>
              </div>
            )}
            {messages.map((msg, idx) => (
              <div key={idx} className={`message ${msg.role} ${msg.interim ? "interim" : ""} ${msg.isIntro ? "intro-message" : ""} ${msg.isError ? "error-message" : ""}`}>
                <div className="message-content">
                  {msg.interim && <span className="voice-badge"><i className="fas fa-microphone"></i> listening...</span>}
                  {msg.content}
                </div>
                <div className="message-time">{msg.timestamp?.toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })}</div>
              </div>
            ))}
            {isProcessing && (
              <div className="message assistant">
                <div className="message-content"><span className="typing-indicator">●●●</span></div>
              </div>
            )}
            <div ref={messagesEndRef} />
          </div>

          {quickActions.length > 0 && !isProcessing && (
            <div className="quick-actions-bar">
              {quickActions.map((qa, idx) => (
                <button key={idx} className={`quick-action-btn ${qa.action === "dismiss" ? "dismiss" : ""}`} onClick={() => handleQuickAction(qa.action)}>
                  {qa.label}
                </button>
              ))}
            </div>
          )}

          <div className="buddy-input-area">
            {voiceMode !== "chat" && (
              <div className="voice-mode-hint">
                <strong>
                  <i className={voiceMode === "notes" ? "fas fa-sticky-note" : "fas fa-tasks"} style={{ marginRight: "6px" }}></i>
                  {voiceMode === "notes"
                    ? (language === "english" ? "Writing to Daily Notes" : "Daily Notes mein likh rahe hain")
                    : (language === "english" ? "Managing Tasks"         : "Tasks manage kar rahe hain")}
                </strong>
              </div>
            )}
            <div className="input-mode-toggle">
              <button className={inputMode === "text" ? "active" : ""} onClick={() => { setInputMode("text"); if (isListening) recognitionRef.current?.stop(); }}>
                <i className="fas fa-keyboard"></i> {language === "hindi" ? "टाइप" : "Type"}
              </button>
              <button className={inputMode === "voice" ? "active" : ""} onClick={() => setInputMode("voice")}>
                <i className="fas fa-microphone"></i> {language === "hindi" ? "बोलें" : "Voice"}
              </button>
            </div>

            {inputMode === "text" && (
              <form className="text-input-form" onSubmit={handleTextSubmit}>
                <input
                  type="text"
                  value={inputText}
                  onChange={e => setInputText(e.target.value)}
                  placeholder={
                    activeFlow
                      ? (language === "english" ? "Type your answer..." : "Apna jawab type karo...")
                      : (language === "english" ? "Ask me anything..." : language === "hindi" ? "यहां टाइप करें..." : "Yahan type karo...")
                  }
                  disabled={isProcessing}
                />
                <button type="submit" disabled={isProcessing || !inputText.trim()}>
                  <i className="fas fa-paper-plane"></i>
                </button>
              </form>
            )}

            {inputMode === "voice" && (
              <div className="voice-input-control">
                <button className={`voice-btn ${isListening ? "active" : ""}`} onClick={toggleVoiceInput} disabled={isProcessing}>
                  {isListening
                    ? <><div className="pulse-ring"></div><i className="fas fa-stop-circle"></i> {language === "english" ? "Stop" : "Band Karo"}</>
                    : <><i className="fas fa-microphone"></i> {language === "english" ? "Start Speaking" : "Bolna Shuru Karo"}</>}
                </button>
                <form className="text-input-form" onSubmit={handleTextSubmit}>
                  <input
                    type="text"
                    value={inputText}
                    onChange={e => setInputText(e.target.value)}
                    placeholder={language === "english" ? "Or type here..." : "Ya yahan type karo..."}
                    disabled={isProcessing}
                  />
                  <button type="submit" disabled={isProcessing || !inputText.trim()}>
                    <i className="fas fa-paper-plane"></i>
                  </button>
                </form>
              </div>
            )}
          </div>
        </div>
      )}
    </>
  );
}