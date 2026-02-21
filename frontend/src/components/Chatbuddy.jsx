// ─────────────────────────────────────────────────────────────
// CHANGE FROM ORIGINAL:
//
// handleAction — case "add_task":
//   Now passes action.params.date as the 5th argument to onAddTask.
//   onAddTask signature: (title, timeOfDay, startTime, endTime, date)
//   Today.jsx's handleAddTaskForDate handles routing to correct day.
//
// Everything else is identical to the original ChatBuddy.jsx.
// ─────────────────────────────────────────────────────────────

import React, { useState, useEffect, useRef, useCallback } from "react";
import "./ChatBuddy.css";

const API_URL =  "http://localhost:3001" || import.meta.env.VITE_BACKEND_URL ;

export default function AdvancedBuddy({
  currentDate,
  tasks,
  onAddTask,
  onCompleteTask,
  onDeleteTask,
  onUpdateNotes,
  onAddAlarm
}) {
  const [isOpen, setIsOpen] = useState(false);
  const [messages, setMessages] = useState([]);
  const [inputText, setInputText] = useState("");
  const [inputMode, setInputMode] = useState("text");
  const [voiceMode, setVoiceMode] = useState("chat");
  const [isListening, setIsListening] = useState(false);
  const [isProcessing, setIsProcessing] = useState(false);
  const [language, setLanguage] = useState(
    localStorage.getItem("buddy-language") || "hinglish"
  );
  const [showProactivePopup, setShowProactivePopup] = useState(false);
  const [proactiveMessage, setProactiveMessage] = useState("");
  const [proactiveActions, setProactiveActions] = useState([]);
  const [taskReminders, setTaskReminders] = useState(new Set());
  const [taskCheckIns, setTaskCheckIns] = useState(new Set());
  const [hasGreeted, setHasGreeted] = useState(false);

  // ─── Nudge Bubble State ───────────────────────────────────
  const [nudgeBubble, setNudgeBubble] = useState(null);
  const [showNudge, setShowNudge] = useState(false);
  const [nudgeIndex, setNudgeIndex] = useState(0);
  const [blobMood, setBlobMood] = useState("idle");
  const nudgeTimerRef = useRef(null);

  // ─── Conversational Flow State ────────────────────────────
  const [activeFlow, setActiveFlowState] = useState(null);
  const [flowStep, setFlowStepState] = useState(null);
  const [flowData, setFlowDataState] = useState({});
  const [quickActions, setQuickActions] = useState([]);

  const activeFlowRef = useRef(null);
  const flowStepRef = useRef(null);
  const flowDataRef = useRef({});

  const setActiveFlow = (v) => { activeFlowRef.current = v; setActiveFlowState(v); };
  const setFlowStep  = (v) => { flowStepRef.current  = v; setFlowStepState(v); };
  const setFlowData  = (v) => { flowDataRef.current  = v; setFlowDataState(v); };

  const messagesEndRef = useRef(null);
  const recognitionRef = useRef(null);
  const interimTranscriptRef = useRef("");
  const reminderIntervalRef = useRef(null);
  const checkInIntervalRef = useRef(null);
  const monitorIntervalRef = useRef(null);

  // ─── Auto-scroll ──────────────────────────────────────────
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages]);

  useEffect(() => {
    localStorage.setItem("buddy-language", language);
  }, [language]);

  // ─── Greet user when chat opens ──────────────────────────
  useEffect(() => {
    if (isOpen && !hasGreeted && messages.length === 0) {
      fetchBuddyIntro();
      setHasGreeted(true);
    }
  }, [isOpen]);

  // Reset greeting when date changes
  useEffect(() => {
    setHasGreeted(false);
    setMessages([]);
    setActiveFlow(null);
    setFlowStep(null);
    setFlowData({});
    setQuickActions([]);
  }, [currentDate]);

  // ─── Proactive monitoring ─────────────────────────────────
  useEffect(() => {
    if (monitorIntervalRef.current) clearInterval(monitorIntervalRef.current);
    monitorIntervalRef.current = setInterval(() => {
      runProactiveMonitor();
    }, 5 * 60 * 1000);
    return () => clearInterval(monitorIntervalRef.current);
  }, [tasks, language]);

  // ─── Nudge bubble cycling ─────────────────────────────────
  const nudgeIdxRef = useRef(0);
  const nudgeLoadingRef = useRef(false);

  useEffect(() => {
    if (nudgeTimerRef.current) clearInterval(nudgeTimerRef.current);

    if (isOpen) {
      setShowNudge(false);
      return;
    }

    nudgeIdxRef.current = 0;
    fetchNudge(0);

    nudgeTimerRef.current = setInterval(() => {
      nudgeIdxRef.current = (nudgeIdxRef.current + 1) % 4;
      fetchNudge(nudgeIdxRef.current);
    }, 10000);

    return () => clearInterval(nudgeTimerRef.current);
  }, [isOpen, tasks.length, language]);

  const FALLBACK_NUDGES = [
    { message: "Hey! 👋 I'm your buddy. Tap me to chat!", quickActions: [{ label: "➕ Add Task", action: "add_task_flow" }, { label: "📅 Plan Day", action: "plan_day_flow" }] },
    { message: "Got tasks to finish? Let me help you plan! 🎯", quickActions: [{ label: "✅ Mark Done", action: "check_task_flow" }, { label: "➕ Add Task", action: "add_task_flow" }] },
    { message: "How was your day so far? Write it in notes 📝", quickActions: [{ label: "📝 Write Notes", action: "notes_flow" }, { label: "💬 Chat", action: "open_chat" }] },
    { message: "Want to set a reminder or alarm? I can help! ⏰", quickActions: [{ label: "⏰ Set Alarm", action: "alarm_flow" }, { label: "🔔 Reminder", action: "reminder_flow" }] }
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
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ language, taskContext: getTaskContext(), currentTime, nudgeIndex: idx })
      });
      if (res.ok) {
        const data = await res.json();
        if (nudgeIdxRef.current === idx) {
          setNudgeBubble({ message: data.message, quickActions: data.quickActions });
        }
      }
    } catch (_) {
      // fallback already showing
    } finally {
      nudgeLoadingRef.current = false;
    }
  };

  // ─── Task monitoring ──────────────────────────────────────
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

  // ─── Speech Recognition ───────────────────────────────────
  useEffect(() => {
    if (!('webkitSpeechRecognition' in window) && !('SpeechRecognition' in window)) return;

    const SpeechRecognition = window.SpeechRecognition || window.webkitSpeechRecognition;
    const recognition = new SpeechRecognition();
    recognition.continuous = true;
    recognition.interimResults = true;
    recognition.lang = language === "hindi" ? "hi-IN" : "en-IN";

    recognition.onstart = () => {
      setIsListening(true);
      interimTranscriptRef.current = "";
    };

    recognition.onresult = (event) => {
      let interimTranscript = "";
      let finalTranscript = "";
      for (let i = event.resultIndex; i < event.results.length; i++) {
        const transcript = event.results[i][0].transcript;
        if (event.results[i].isFinal) finalTranscript += transcript;
        else interimTranscript += transcript;
      }
      if (interimTranscript) {
        interimTranscriptRef.current = interimTranscript;
        setMessages(prev => {
          const filtered = prev.filter(m => !m.interim);
          return [...filtered, { role: "user", content: interimTranscript, interim: true, timestamp: new Date() }];
        });
      }
      if (finalTranscript) {
        setMessages(prev => prev.filter(m => !m.interim));
        handleSendMessage(finalTranscript);
        interimTranscriptRef.current = "";
      }
    };

    recognition.onerror = () => setIsListening(false);
    recognition.onend = () => {
      setIsListening(false);
      setMessages(prev => prev.filter(m => !m.interim));
    };

    recognitionRef.current = recognition;
    return () => recognitionRef.current?.stop();
  }, [language]);

  // ─── FETCH BUDDY INTRO ────────────────────────────────────
  const fetchBuddyIntro = async () => {
    setIsProcessing(true);
    try {
      const now = new Date();
      const currentTime = now.toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit', hour12: false });

      const response = await fetch(`${API_URL}/api/buddy-intro`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ language, taskContext: getTaskContext(), currentTime, currentDate })
      });

      const data = await response.json();

      setMessages([{
        role: "assistant",
        content: data.message,
        timestamp: new Date(),
        isIntro: true
      }]);

      if (data.quickActions) setQuickActions(data.quickActions);
    } catch (error) {
      console.error("Buddy intro error:", error);
      setMessages([{
        role: "assistant",
        content: language === "english"
          ? "Hey! I'm your AI buddy 👋 Tasks, alarms, reminders - I handle it all! What do you need?"
          : language === "hindi"
          ? "नमस्ते! मैं आपका AI buddy हूं 👋 Tasks, alarms, reminders - सब manage करता हूं! क्या करें?"
          : "Hey! Main aapka AI buddy hoon 👋 Tasks add karo, alarm lagao, reminder set karo - sab handle karta hoon! Kya karna hai?",
        timestamp: new Date(),
        isIntro: true
      }]);
      setQuickActions([
        { label: "➕ Add Task", action: "add_task_flow" },
        { label: "⏰ Set Alarm", action: "alarm_flow" },
        { label: "🔔 Reminder", action: "reminder_flow" },
        { label: "📅 Plan My Day", action: "plan_day_flow" }
      ]);
    } finally {
      setIsProcessing(false);
    }
  };

  // ─── HANDLE QUICK ACTION ──────────────────────────────────
  const handleQuickAction = async (action) => {
    if (action === "dismiss") {
      setQuickActions([]);
      return;
    }

    setActiveFlow(action);
    setFlowStep("start");
    setFlowData({});
    setQuickActions([]);

    await executeFlowStep(action, "start", null, {});
  };

  // ─── EXECUTE FLOW STEP ────────────────────────────────────
  const executeFlowStep = async (flow, step, userInput, currentFlowData) => {
    setIsProcessing(true);
    try {
      const now = new Date();
      const currentTime = now.toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit', hour12: false });

      const response = await fetch(`${API_URL}/api/flow-step`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          flow,
          step,
          userInput,
          language,
          taskContext: getTaskContext(),
          flowData: currentFlowData,
          currentTime,
          currentDate
        })
      });

      const data = await response.json();

      if (data.message) {
        setMessages(prev => [...prev, {
          role: "assistant",
          content: data.message,
          timestamp: new Date(),
          isFlow: true
        }]);
      }

      if (data.actions && data.actions.length > 0) {
        for (const action of data.actions) {
          await handleAction(action);
        }
      }

      if (data.flow && data.nextStep && data.nextStep !== "done") {
        const merged = { ...flowDataRef.current, ...(data.flowData || {}) };
        setActiveFlow(data.flow);
        setFlowStep(data.nextStep);
        setFlowData(merged);
      } else {
        setActiveFlow(null);
        setFlowStep(null);
        setFlowData({});
      }

      if (data.quickActions) {
        setQuickActions(data.quickActions);
      } else {
        setQuickActions([]);
      }

    } catch (error) {
      console.error("Flow step error:", error);
      setMessages(prev => [...prev, {
        role: "assistant",
        content: "Sorry, something went wrong. Try again!",
        timestamp: new Date()
      }]);
      setActiveFlow(null);
      setFlowStep(null);
    } finally {
      setIsProcessing(false);
    }
  };

  // ─── PROACTIVE MONITOR ────────────────────────────────────
  const runProactiveMonitor = async () => {
    if (isOpen) return;

    const now = new Date();
    const hour = now.getHours();
    const currentTime = now.toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit', hour12: false });
    const taskCtx = getTaskContext();

    if (taskCtx.total === 0) return;

    let monitorType = null;
    if (hour === 8 || hour === 9) monitorType = "morning_kickoff";
    else if (taskCtx.pending > 0) monitorType = "overdue_check";
    else if (hour >= 20 && hour <= 22) monitorType = "end_of_day";

    if (!monitorType) return;

    const monitorKey = `monitor-${monitorType}-${currentDate}-${hour}`;
    if (localStorage.getItem(monitorKey)) return;

    try {
      const response = await fetch(`${API_URL}/api/proactive-monitor`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ language, taskContext: taskCtx, currentTime, monitorType })
      });

      const data = await response.json();

      if (data.shouldNotify && data.message) {
        localStorage.setItem(monitorKey, Date.now().toString());
        setProactiveMessage(data.message);
        setProactiveActions(data.quickActions?.map(qa => ({
          label: qa.label,
          type: qa.action === "check_task_flow" ? "primary" : "secondary",
          action: () => {
            setShowProactivePopup(false);
            setIsOpen(true);
            handleQuickAction(qa.action);
          }
        })) || []);
        setShowProactivePopup(true);
      }
    } catch (error) {
      console.error("Proactive monitor error:", error);
    }
  };

  // ─── TASK REMINDERS ───────────────────────────────────────
  const checkTaskReminders = async () => {
    const now = new Date();
    const currentTime = now.getHours() * 60 + now.getMinutes();

    for (const task of tasks) {
      if (!task.startTime || task.completed) continue;
      const [hours, minutes] = task.startTime.split(':').map(Number);
      const taskStartTime = hours * 60 + minutes;
      const timeDiff = taskStartTime - currentTime;
      const reminderKey = `reminder-${task.id}-${currentDate}`;
      if (timeDiff === 10 && !taskReminders.has(reminderKey)) {
        setTaskReminders(prev => new Set(prev).add(reminderKey));
        await sendTaskReminder(task);
      }
    }
  };

  const checkTaskCompletions = async () => {
    const now = new Date();
    const currentTime = now.getHours() * 60 + now.getMinutes();
    for (const task of tasks) {
      if (!task.startTime || task.completed) continue;
      const [hours, minutes] = task.startTime.split(':').map(Number);
      const taskStartTime = hours * 60 + minutes;
      const timePassed = currentTime - taskStartTime;
      const checkInKey = `checkin-${task.id}-${currentDate}`;
      if (timePassed === 30 && !task.completed && !taskCheckIns.has(checkInKey)) {
        setTaskCheckIns(prev => new Set(prev).add(checkInKey));
        await sendTaskCheckIn(task);
      }
    }
  };

  const sendTaskReminder = async (task) => {
    try {
      await fetch(`${API_URL}/api/task-reminder`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ task, language, currentDate })
      });

      const messages = {
        hindi: `⏰ "${task.title}" 10 मिनट में शुरू होने वाला है। तैयार हो जाओ!`,
        english: `⏰ "${task.title}" starts in 10 minutes. Get ready!`,
        hinglish: `⏰ "${task.title}" 10 min mein start hone wala hai. Ready ho jao!`
      };

      setProactiveMessage(messages[language] || messages.hinglish);
      setProactiveActions([
        {
          label: language === "hindi" ? "शुरू करता हूं 💪" : language === "english" ? "Let's Go 💪" : "Chalo Shuru! 💪",
          type: "primary",
          action: () => {
            setShowProactivePopup(false);
            setIsOpen(true);
            setMessages(prev => [...prev, {
              role: "assistant",
              content: language === "english" ? `Great! Ready for "${task.title}"? You've got this! 💪` : `Badhiya! "${task.title}" ke liye ready ho? All the best! 💪`,
              timestamp: new Date()
            }]);
          }
        },
        {
          label: language === "english" ? "Remind Later" : "Baad Mein",
          type: "secondary",
          action: () => setShowProactivePopup(false)
        }
      ]);
      setShowProactivePopup(true);
    } catch (error) {
      console.error("Task reminder error:", error);
    }
  };

  const sendTaskCheckIn = async (task) => {
    try {
      const checkInMessages = {
        hindi: `🤔 "${task.title}" हो गया क्या?`,
        english: `🤔 Did you finish "${task.title}"?`,
        hinglish: `🤔 "${task.title}" ho gaya kya?`
      };

      setProactiveMessage(checkInMessages[language] || checkInMessages.hinglish);
      setProactiveActions([
        {
          label: language === "english" ? "Done! ✅" : "Ho Gaya! ✅",
          type: "primary",
          action: () => {
            onCompleteTask(task.id);
            setShowProactivePopup(false);
            setIsOpen(true);
            setMessages(prev => [...prev, {
              role: "assistant",
              content: language === "english" ? `🎉 Awesome! "${task.title}" done!` : `🎉 Shabaash! "${task.title}" complete ho gaya!`,
              timestamp: new Date()
            }]);
            setQuickActions([
              { label: "Mark Another Done", action: "check_task_flow" },
              { label: "Add Task", action: "add_task_flow" }
            ]);
          }
        },
        {
          label: language === "english" ? "Need Help 🤔" : "Help Chahiye 🤔",
          type: "secondary",
          action: () => {
            setShowProactivePopup(false);
            setIsOpen(true);
            setMessages(prev => [...prev, {
              role: "assistant",
              content: language === "english"
                ? `No problem! What's blocking you on "${task.title}"? Let's break it down.`
                : `Koi baat nahi! "${task.title}" mein kya problem aa rahi hai? Main help karta hoon!`,
              timestamp: new Date()
            }]);
          }
        }
      ]);
      setShowProactivePopup(true);
    } catch (error) {
      console.error("Task check-in error:", error);
    }
  };

  // ─── GET TASK CONTEXT ─────────────────────────────────────
  const getTaskContext = () => {
    const total = tasks.length;
    const completed = tasks.filter(t => t.completed).length;
    const pending = total - completed;
    return {
      total,
      completed,
      pending,
      pendingTasks: tasks.filter(t => !t.completed),
      completedTasks: tasks.filter(t => t.completed)
    };
  };

  // ─── MAIN MESSAGE HANDLER ─────────────────────────────────
  const handleSendMessage = async (text) => {
    if (!text.trim()) return;

    const userMessage = { role: "user", content: text, timestamp: new Date() };
    setMessages(prev => [...prev, userMessage]);
    setInputText("");
    setQuickActions([]);

    if (activeFlowRef.current && flowStepRef.current) {
      await executeFlowStep(activeFlowRef.current, flowStepRef.current, text, flowDataRef.current);
      return;
    }

    setIsProcessing(true);
    try {
      const response = await fetch(`${API_URL}/api/advanced-chat`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          messages: [...messages, userMessage],
          language,
          taskContext: getTaskContext(),
          isVoice: inputMode === "voice",
          currentDate,
          voiceMode
        })
      });

      const data = await response.json();

      if (data.actions && data.actions.length > 0) {
        for (const action of data.actions) {
          await handleAction(action);
        }
      }

      setMessages(prev => [...prev, {
        role: "assistant",
        content: data.message,
        timestamp: new Date()
      }]);

      const ctx = getTaskContext();
      if (ctx.pending > 0) {
        setQuickActions([
          { label: "✅ Mark Done", action: "check_task_flow" },
          { label: "➕ Add Task", action: "add_task_flow" }
        ]);
      }

    } catch (error) {
      console.error("Chat error:", error);
      setMessages(prev => [...prev, {
        role: "assistant",
        content: "Sorry, something went wrong. Please try again.",
        timestamp: new Date()
      }]);
    } finally {
      setIsProcessing(false);
    }
  };

  // ─── ACTION HANDLER ───────────────────────────────────────
  const handleAction = async (action) => {
    console.log("🎯 Handling action:", action);

    switch (action.type) {
      case "set_alarm":
        if (onAddAlarm) onAddAlarm(action.params);
        break;

      case "set_reminder":
        await scheduleReminder(action.params.time, action.params.message);
        break;

      // ── 🆕 KEY CHANGE: pass `date` as 5th argument ──────────
      case "add_task":
        onAddTask(
          action.params.title,
          action.params.timeOfDay,
          action.params.startTime || null,
          action.params.endTime || null,
          action.params.date || null   // ← NEW: date field for tomorrow support
        );
        break;

      case "complete_task": {
        let taskToComplete = tasks.find(t =>
          t.title.toLowerCase() === action.params.taskTitle?.toLowerCase()
        ) || tasks.find(t =>
          t.title.toLowerCase().includes(action.params.taskTitle?.toLowerCase())
        ) || tasks.find(t =>
          action.params.taskTitle?.toLowerCase().includes(t.title.toLowerCase())
        );

        if (taskToComplete) onCompleteTask(taskToComplete.id);
        break;
      }

      case "delete_task": {
        let taskToDelete = tasks.find(t =>
          t.title.toLowerCase() === action.params.taskTitle?.toLowerCase()
        ) || tasks.find(t =>
          t.title.toLowerCase().includes(action.params.taskTitle?.toLowerCase())
        ) || tasks.find(t =>
          action.params.taskTitle?.toLowerCase().includes(t.title.toLowerCase())
        );

        if (!taskToDelete) {
          const searchWords = action.params.taskTitle?.toLowerCase().split(' ') || [];
          taskToDelete = tasks.find(t => {
            const taskWords = t.title.toLowerCase().split(' ');
            return searchWords.some(sw => taskWords.some(tw => tw.includes(sw) || sw.includes(tw)));
          });
        }

        if (taskToDelete) onDeleteTask(taskToDelete.id);
        break;
      }

      case "update_notes":
        if (onUpdateNotes) {
          onUpdateNotes(action.params.content, action.params.mode || 'append');
        }
        break;

      default:
        console.warn("Unknown action:", action.type);
    }
  };

  // ─── REMINDER SCHEDULER ───────────────────────────────────
  const scheduleReminder = async (time, message) => {
    const [hours, minutes] = time.split(':').map(Number);
    const now = new Date();
    const reminderTime = new Date();
    reminderTime.setHours(hours, minutes, 0, 0);
    if (reminderTime <= now) reminderTime.setDate(reminderTime.getDate() + 1);

    const delay = reminderTime.getTime() - now.getTime();

    if ('Notification' in window && Notification.permission === 'default') {
      await Notification.requestPermission();
    }

    const reminders = JSON.parse(localStorage.getItem('pending-reminders') || '[]');
    const reminder = { id: Date.now(), time, message: message || `Reminder at ${time}`, scheduledFor: reminderTime.toISOString() };
    reminders.push(reminder);
    localStorage.setItem('pending-reminders', JSON.stringify(reminders));

    setTimeout(async () => {
      if ('serviceWorker' in navigator && Notification.permission === 'granted') {
        try {
          const registration = await navigator.serviceWorker.ready;
          await registration.showNotification('AI Buddy Reminder ⏰', {
            body: message,
            icon: '/icon-192x192.png',
            vibrate: [200, 100, 200],
            tag: 'buddy-reminder-' + Date.now(),
            requireInteraction: true,
            actions: [{ action: 'open', title: 'Open App 📱' }, { action: 'dismiss', title: 'Got it ✓' }]
          });
        } catch (e) {
          new Notification('AI Buddy ⏰', { body: message });
        }
      }
      const updated = JSON.parse(localStorage.getItem('pending-reminders') || '[]');
      localStorage.setItem('pending-reminders', JSON.stringify(updated.filter(r => r.id !== reminder.id)));
    }, delay);
  };

  // ─── VOICE INPUT ──────────────────────────────────────────
  const toggleVoiceInput = () => {
    if (isListening) recognitionRef.current?.stop();
    else recognitionRef.current?.start();
  };

  const handleTextSubmit = (e) => {
    e.preventDefault();
    if (inputText.trim()) handleSendMessage(inputText);
  };

  // ─── FLOW STATUS LABEL ────────────────────────────────────
  const getFlowStatusLabel = () => {
    if (!activeFlow) return null;
    const labels = {
      add_task_flow: { icon: "➕", text: language === "english" ? "Adding task..." : "Task add ho raha hai..." },
      alarm_flow: { icon: "⏰", text: language === "english" ? "Setting alarm..." : "Alarm set ho raha hai..." },
      reminder_flow: { icon: "🔔", text: language === "english" ? "Setting reminder..." : "Reminder set ho raha hai..." },
      plan_day_flow: { icon: "📅", text: language === "english" ? "Planning your day..." : "Din plan ho raha hai..." },
      notes_flow: { icon: "📝", text: language === "english" ? "Writing notes..." : "Notes likh rahe hain..." },
      check_task_flow: { icon: "✅", text: language === "english" ? "Marking task done..." : "Task complete kar rahe hain..." }
    };
    return labels[activeFlow] || null;
  };

  const taskCtx = getTaskContext();

  // ─── RENDER ───────────────────────────────────────────────
  return (
    <>
      {/* Proactive popup */}
      {showProactivePopup && (
        <div className="proactive-popup-overlay">
          <div className="proactive-popup">
            <button className="popup-close" onClick={() => setShowProactivePopup(false)}>×</button>
            <div className="popup-icon-container">
              <div className="popup-icon"><i className="fas fa-heart"></i></div>
            </div>
            <p className="popup-message">{proactiveMessage}</p>
            <div className="popup-actions">
              {proactiveActions.length > 0 ? (
                proactiveActions.map((action, idx) => (
                  <button key={idx} className={`popup-action-btn ${action.type}`} onClick={action.action}>
                    {action.label}
                  </button>
                ))
              ) : (
                <>
                  <button className="popup-action-btn primary" onClick={() => { setShowProactivePopup(false); setIsOpen(true); }}>
                    <i className="fas fa-comment-dots"></i> {language === "english" ? "Open Chat" : "Chat Kholo"}
                  </button>
                  <button className="popup-action-btn secondary" onClick={() => setShowProactivePopup(false)}>
                    {language === "english" ? "Later" : "Baad Mein"}
                  </button>
                </>
              )}
            </div>
          </div>
        </div>
      )}

      {/* Floating blob + speech bubble */}
      <div className="buddy-float-zone">

        {!isOpen && showNudge && nudgeBubble && (
          <div className="buddy-speech-bubble" key={nudgeIndex}>
            <div className="bubble-sparkle">✦</div>
            <p className="bubble-text">{nudgeBubble.message}</p>
            <div className="bubble-chips">
              {nudgeBubble.quickActions?.map((qa, i) => (
                <button
                  key={i}
                  className="bubble-chip"
                  onClick={() => {
                    setShowNudge(false);
                    if (qa.action === "open_chat") {
                      setIsOpen(true);
                    } else {
                      setIsOpen(true);
                      setTimeout(() => handleQuickAction(qa.action), 200);
                    }
                  }}
                >
                  {qa.label}
                </button>
              ))}
            </div>
            <div className="bubble-dots">
              {[0,1,2,3].map(i => (
                <div key={i} className={`bubble-dot ${nudgeIdxRef.current === i ? 'active' : ''}`} />
              ))}
            </div>
            <div className="bubble-tail" />
          </div>
        )}

        <button
          className={`buddy-blob ${isListening ? 'listening' : ''} ${blobMood} ${isOpen ? 'open' : ''}`}
          onClick={() => {
            setIsOpen(!isOpen);
            setShowNudge(false);
          }}
          aria-label="Toggle AI Buddy"
        >
          <div className="blob-face">
            {isListening ? (
              <div className="blob-sound-waves">
                <span/><span/><span/>
              </div>
            ) : isOpen ? (
              <span className="blob-eye-x">✕</span>
            ) : (
              <>
                <span className="blob-eyes">
                  <span className="blob-eye" />
                  <span className="blob-eye" />
                </span>
                <span className="blob-smile" />
              </>
            )}
          </div>
        </button>
      </div>

      {/* Chat Window */}
      {isOpen && (
        <div className="advanced-buddy-window">
          <div className="buddy-header">
            <div className="buddy-info">
              <div className="buddy-avatar-small"><i className="fas fa-smile-beam"></i></div>
              <div>
                <h4>AI Buddy</h4>
                <p className="buddy-status">
                  <i className="fas fa-circle" style={{ fontSize: '8px', marginRight: '4px', color: '#55efc4' }}></i>
                  {taskCtx.total > 0
                    ? `${taskCtx.completed}/${taskCtx.total} done today`
                    : language === "english" ? "Here to help" : "Madad ke liye yahan"}
                </p>
              </div>
            </div>
            <button className="close-btn" onClick={() => setIsOpen(false)}>×</button>
          </div>

          {/* Language tabs */}
          <div className="voice-mode-tabs">
            {["hindi", "english", "hinglish"].map(lang => (
              <button key={lang} className={language === lang ? "active" : ""} onClick={() => setLanguage(lang)}>
                {lang === "hindi" ? "🇮🇳 हिंदी" : lang === "english" ? "🌐 EN" : "🎭 Mix"}
              </button>
            ))}
          </div>

          <div className="voice-mode-tabs" style={{ borderTop: '1px solid var(--buddy-border)' }}>
            {["chat", "tasks", "notes"].map(mode => (
              <button key={mode} className={voiceMode === mode ? "active" : ""} onClick={() => setVoiceMode(mode)}>
                {mode === "chat" && <><i className="fas fa-comment-dots"></i> {language === "hindi" ? "चैट" : "Chat"}</>}
                {mode === "tasks" && <><i className="fas fa-check-circle"></i> {language === "hindi" ? "टास्क" : "Tasks"}</>}
                {mode === "notes" && <><i className="fas fa-sticky-note"></i> {language === "hindi" ? "नोट्स" : "Notes"}</>}
              </button>
            ))}
          </div>

          {/* Active Flow Indicator */}
          {activeFlow && getFlowStatusLabel() && (
            <div className="flow-indicator">
              <span className="flow-icon">{getFlowStatusLabel().icon}</span>
              <span className="flow-text">{getFlowStatusLabel().text}</span>
              <button className="flow-cancel" onClick={() => {
                setActiveFlow(null);
                setFlowStep(null);
                setFlowData({});
                activeFlowRef.current = null;
                flowStepRef.current = null;
                flowDataRef.current = {};
                setQuickActions([
                  { label: "➕ Add Task", action: "add_task_flow" },
                  { label: "⏰ Set Alarm", action: "alarm_flow" },
                  { label: "📅 Plan Day", action: "plan_day_flow" }
                ]);
              }}>
                ✕ Cancel
              </button>
            </div>
          )}

          {/* Messages */}
          <div className="buddy-messages">
            {messages.length === 0 && !isProcessing && (
              <div className="message assistant">
                <div className="message-content">
                  <i className="fas fa-sparkles" style={{ marginRight: '6px', color: '#fdcb6e' }}></i>
                  {language === "english" ? "Hey! Opening your buddy... 👋" : language === "hindi" ? "नमस्ते! लोड हो रहा है... 👋" : "Hey! Load ho raha hai... 👋"}
                </div>
              </div>
            )}

            {messages.map((msg, idx) => (
              <div key={idx} className={`message ${msg.role} ${msg.interim ? 'interim' : ''} ${msg.isIntro ? 'intro-message' : ''}`}>
                <div className="message-content">
                  {msg.interim && <span className="voice-badge"><i className="fas fa-microphone"></i> listening...</span>}
                  {msg.content}
                </div>
                <div className="message-time">
                  {msg.timestamp?.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                </div>
              </div>
            ))}

            {isProcessing && (
              <div className="message assistant">
                <div className="message-content">
                  <span className="typing-indicator">●●●</span>
                </div>
              </div>
            )}

            <div ref={messagesEndRef} />
          </div>

          {/* Quick Actions */}
          {quickActions.length > 0 && !isProcessing && (
            <div className="quick-actions-bar">
              {quickActions.map((qa, idx) => (
                <button
                  key={idx}
                  className={`quick-action-btn ${qa.action === 'dismiss' ? 'dismiss' : ''}`}
                  onClick={() => handleQuickAction(qa.action)}
                >
                  {qa.label}
                </button>
              ))}
            </div>
          )}

          {/* Input Area */}
          <div className="buddy-input-area">
            {voiceMode !== "chat" && (
              <div className="voice-mode-hint">
                <strong>
                  <i className={voiceMode === "notes" ? "fas fa-sticky-note" : "fas fa-tasks"} style={{ marginRight: '6px' }}></i>
                  {voiceMode === "notes"
                    ? (language === "english" ? "Writing to Daily Notes" : "Daily Notes mein likh rahe hain")
                    : (language === "english" ? "Managing Tasks" : "Tasks manage kar rahe hain")}
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
                  onChange={(e) => setInputText(e.target.value)}
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
                <button className={`voice-btn ${isListening ? 'active' : ''}`} onClick={toggleVoiceInput} disabled={isProcessing}>
                  {isListening ? (
                    <><div className="pulse-ring"></div><i className="fas fa-stop-circle"></i> {language === "english" ? "Stop" : "Band Karo"}</>
                  ) : (
                    <><i className="fas fa-microphone"></i> {language === "english" ? "Start Speaking" : "Bolna Shuru Karo"}</>
                  )}
                </button>
                <form className="text-input-form" onSubmit={handleTextSubmit}>
                  <input
                    type="text"
                    value={inputText}
                    onChange={(e) => setInputText(e.target.value)}
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