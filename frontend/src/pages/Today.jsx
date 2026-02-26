// Today.jsx — AUTH CHANGES ONLY
// Based exactly on the working Today_fixed.jsx (doc 9)
// Changes marked with ── AUTH CHANGE ──
// Everything else is byte-for-byte identical

import React, { useState, useEffect, useRef, useCallback } from "react";
import { useParams, useNavigate } from "react-router-dom";

import AddTask from "../components/AddTask";
import TaskSection from "../components/TaskSection";
import ProgressBar from "../components/ProgressBar";
import ReflectionModal from "../components/ReflectionModal";
import PendingCarryOverModal from "../components/PendingCarryOverModal";
import WeeklySummaryModal from "../components/WeeklySummaryModal";
import DailyNotes from "../components/DailyNotes";
import PushNotifications from "../components/PushNotifications";
import DayCalendar from "../components/DayCalendar";
import FirstTaskReminderOverlay from "../components/FirstTaskReminderOverlay";
import AlarmPlanner from "../components/AlarmPlanner";
import AdvancedBuddy from "../components/Chatbuddy";
import { TabSyncProvider, useTabSession } from "../components/Usetabsession";
import { useWebSocketSync, WsStatusBadge } from "../components/Usewebsocketsync";
import { useAuth } from "../Context/Authcontext"; // ── AUTH CHANGE: import useAuth
import "./Today.css";
import Header from "../components/Header";

const formatKey = (date) => {
  const d = new Date(date);
  const year = d.getFullYear();
  const month = String(d.getMonth() + 1).padStart(2, "0");
  const day = String(d.getDate()).padStart(2, "0");
  return `${year}-${month}-${day}`;
};

const addDays = (date, days) => {
  const d = new Date(date);
  d.setDate(d.getDate() + days);
  return d;
};

// ── AUTH CHANGE: carryPopupKey now includes userId so users don't share popup state
const carryPopupKey = (date, userId) => `carry-popup-shown-${userId}-${formatKey(date)}`;

// ── AUTH CHANGE: TodayInner receives userId prop
function TodayInner({ userId }) {
  const { date } = useParams();
  const navigate = useNavigate();

  const { tabId, broadcastDateChange, broadcastTaskChange, onSharedDataChanged } = useTabSession();

  const parsedDate = date ? new Date(date) : new Date();
  const [currentDate, setCurrentDate] = useState(parsedDate);
  const dayKey = formatKey(currentDate);

  // ── AUTH CHANGE: tasks stored under user-scoped key
  // "days-data" → "days-data-{userId}"
  // User A and User B on same browser NEVER share task data
  const tasksStorageKey = `days-data-${userId}`;

  const [tasks,          setTasks]          = useState([]);
  const [reflection,     setReflection]     = useState(null);
  const [showReflection, setShowReflection] = useState(false);
  const [showCarryModal, setShowCarryModal] = useState(false);
  const [yesterdayTasks, setYesterdayTasks] = useState([]);
  const [showWeekly,     setShowWeekly]     = useState(false);
  const [isLoaded,       setIsLoaded]       = useState(false);
  const [viewMode,       setViewMode]       = useState("planner");
  const [taskFilter,     setTaskFilter]     = useState("all");
  const [reminderTask,   setReminderTask]   = useState(null);
  const [cognitiveState, setCognitiveState] = useState("calm");
  const [loadToast,      setLoadToast]      = useState(null);

  const dailyNotesRef   = useRef(null);
  const alarmPlannerRef = useRef(null);
  const prevLoadRef     = useRef("calm");

  const reReadDayTasks = useCallback((changeType, payload) => {
    const affectedDate = payload?.date || dayKey;
    if (affectedDate !== dayKey) return;
    // ── AUTH CHANGE: read from user-scoped key
    const allDays = JSON.parse(localStorage.getItem(tasksStorageKey)) || {};
    const dayData = allDays[dayKey];
    if (dayData?.tasks) {
      setTasks(dayData.tasks);
      console.log(`[${tabId}] 🔄 Re-read from localStorage (${changeType})`);
    }
  }, [dayKey, tabId, tasksStorageKey]);

  const { wsStatus, sendWsEvent } = useWebSocketSync({
    tabId,
    currentDate: dayKey,
    onSyncEvent: ({ changeType, payload, fromTabId }) => {
      if (fromTabId !== tabId) {
        console.log(`[${tabId}] 📥 WS sync from ${fromTabId}: ${changeType}`);
        reReadDayTasks(changeType, payload);
      }
    },
  });

  useEffect(() => {
    const unsub = onSharedDataChanged(({ changeType, payload, tabId: fromTabId }) => {
      if (fromTabId !== tabId) {
        reReadDayTasks(changeType, payload);
      }
    });
    return unsub;
  }, [onSharedDataChanged, reReadDayTasks, tabId]);

  const lastBroadcastRef = useRef(null);
  useEffect(() => {
    if (!isLoaded) return;
    // ── AUTH CHANGE: save to user-scoped key
    const allDays = JSON.parse(localStorage.getItem(tasksStorageKey)) || {};
    allDays[dayKey] = { date: dayKey, tasks, reflection };
    localStorage.setItem(tasksStorageKey, JSON.stringify(allDays));
    if (lastBroadcastRef.current) {
      const { changeType, payload } = lastBroadcastRef.current;
      lastBroadcastRef.current = null;
      broadcastTaskChange(changeType, payload);
      sendWsEvent(changeType, payload);
    }
  }, [tasks, reflection, dayKey, isLoaded, tasksStorageKey]);

  const getFilteredTasks = (timeOfDay) =>
    tasks.filter((t) => {
      if (t.timeOfDay !== timeOfDay) return false;
      if (taskFilter === "pending")   return !t.completed;
      if (taskFilter === "completed") return  t.completed;
      return true;
    });

  useEffect(() => {
    if (!tasks.length) return;
    // ── AUTH CHANGE: reminder-shown key includes userId
    const shownKey = `first-task-reminder-shown-${userId}-${dayKey}`;
    if (localStorage.getItem(shownKey)) return;
    const timedTasks = tasks.filter(t => t.startTime).sort((a, b) => a.startTime.localeCompare(b.startTime));
    if (!timedTasks.length) return;
    const firstTask = timedTasks[0];
    const [h, m] = firstTask.startTime.split(":");
    const start = new Date(currentDate);
    start.setHours(Number(h), Number(m), 0, 0);
    const reminderTime = new Date(start.getTime() - 30 * 60000);
    const now = new Date();
    if (now >= reminderTime && now < start) {
      setReminderTask(firstTask);
      localStorage.setItem(shownKey, "true");
    }
  }, [tasks, currentDate, dayKey, userId]);

  useEffect(() => {
    const newState = calculateCognitiveLoad(tasks);
    const prevState = prevLoadRef.current;
    if (newState !== prevState) {
      if (newState === "busy")       setLoadToast("⚡ Your day is getting busy. Prioritize wisely.");
      if (newState === "overloaded") setLoadToast("🔥 This day looks heavy. It's okay to stop adding.");
      if (prevState === "overloaded" && newState === "busy") setLoadToast("🌿 Feeling lighter now. Good job clearing space.");
      prevLoadRef.current = newState;
      setTimeout(() => setLoadToast(null), 3500);
    }
    setCognitiveState(newState);
  }, [tasks]);

  useEffect(() => {
    if (date) setCurrentDate(new Date(date));
  }, [date]);

  useEffect(() => {
    setIsLoaded(false);
    // ── AUTH CHANGE: load from user-scoped key
    const allDays = JSON.parse(localStorage.getItem(tasksStorageKey)) || {};
    const dayData = allDays[dayKey];
    setTasks(dayData?.tasks || []);
    setReflection(dayData?.reflection || null);
    setIsLoaded(true);
  }, [dayKey, tasksStorageKey]);

  useEffect(() => {
    const todayKey = formatKey(new Date());
    if (dayKey !== todayKey) return;
    // ── AUTH CHANGE: carry popup key includes userId
    if (localStorage.getItem(carryPopupKey(new Date(), userId))) return;
    const allDays = JSON.parse(localStorage.getItem(tasksStorageKey)) || {};
    const yesterdayKey = formatKey(addDays(new Date(), -1));
    const yesterday = allDays[yesterdayKey];
    if (!yesterday?.tasks) return;
    const pending = yesterday.tasks.filter(t => !t.completed);
    if (!pending.length) return;
    setYesterdayTasks(pending);
    setShowCarryModal(true);
    localStorage.setItem(carryPopupKey(new Date(), userId), "true");
  }, [dayKey, userId, tasksStorageKey]);

  const addTask = useCallback((title, timeOfDay, startTime = null, endTime = null) => {
    setTasks(prev => [{
      id: Date.now(),
      title,
      completed: false,
      timeOfDay,
      startTime,
      endTime,
      status: "idle",
      startedAt: null,
      completedAt: null,
      actualTime: null,
    }, ...prev]);
  }, []);

  const handleAddTaskForDate = useCallback((title, timeOfDay, startTime, endTime, targetDate) => {
    const resolvedDate = targetDate ? formatKey(new Date(targetDate)) : dayKey;
    console.log(`[${tabId}] ➕ Adding task "${title}" to ${resolvedDate} (dayKey: ${dayKey})`);

    if (resolvedDate === dayKey) {
      const newTask = {
        id: Date.now(),
        title,
        completed: false,
        timeOfDay: timeOfDay || "morning",
        startTime: startTime || null,
        endTime: endTime || null,
        status: "idle",
        startedAt: null,
        completedAt: null,
        actualTime: null,
      };
      setTasks(prev => [newTask, ...prev]);
      lastBroadcastRef.current = { changeType: "add_task", payload: { date: resolvedDate, title } };
    } else {
      // ── AUTH CHANGE: write to user-scoped key for different-day tasks
      const allDays = JSON.parse(localStorage.getItem(tasksStorageKey)) || {};
      const targetDayData = allDays[resolvedDate] || { date: resolvedDate, tasks: [], reflection: null };
      const newTask = {
        id: Date.now() + Math.random(),
        title,
        completed: false,
        timeOfDay: timeOfDay || "morning",
        startTime: startTime || null,
        endTime: endTime || null,
        status: "idle",
        startedAt: null,
        completedAt: null,
        actualTime: null,
      };
      targetDayData.tasks = [newTask, ...(targetDayData.tasks || [])];
      allDays[resolvedDate] = targetDayData;
      localStorage.setItem(tasksStorageKey, JSON.stringify(allDays));
      broadcastTaskChange("add_task", { date: resolvedDate, title });
      sendWsEvent("add_task", { date: resolvedDate, title });
      console.log(`✅ Task "${title}" saved to ${resolvedDate}`);
    }
  }, [dayKey, tabId, tasksStorageKey, broadcastTaskChange, sendWsEvent]);

  const startTask = (id) =>
    setTasks(prev => prev.map(t =>
      t.id === id ? { ...t, status: "running", startedAt: new Date().toISOString() } : t
    ));

  const toggleTask = useCallback((id) => {
    setTasks(prev => prev.map(t => {
      if (t.id !== id) return t;
      if (!t.completed) {
        const now = new Date();
        const actualMinutes = t.startedAt ? Math.floor((now - new Date(t.startedAt)) / 60000) : null;
        return { ...t, completed: true, status: "done", completedAt: now.toISOString(), actualTime: actualMinutes };
      }
      return { ...t, completed: false, status: "idle", startedAt: null, completedAt: null, actualTime: null };
    }));
    lastBroadcastRef.current = { changeType: "complete_task", payload: { date: dayKey, id } };
  }, [dayKey]);

  const deleteTask = useCallback((id) => {
    setTasks(prev => prev.filter(t => t.id !== id));
    lastBroadcastRef.current = { changeType: "delete_task", payload: { date: dayKey, id } };
  }, [dayKey]);

  const editTask     = (id, text) => setTasks(prev => prev.map(t => t.id === id ? { ...t, title: text } : t));
  const editTaskTime = (id, startTime, endTime) => setTasks(prev => prev.map(t => t.id === id ? { ...t, startTime, endTime } : t));
  const moveTask     = (id, newTimeOfDay) => setTasks(prev => {
    const task = prev.find(t => t.id === id);
    if (!task) return prev;
    return [...prev.filter(t => t.id !== id), { ...task, timeOfDay: newTimeOfDay }];
  });

  const snoozeTask = (id) => {
    setTasks(prev => {
      const task = prev.find(t => t.id === id);
      if (!task) return prev;
      // ── AUTH CHANGE: snooze reads/writes user-scoped key
      const allDays = JSON.parse(localStorage.getItem(tasksStorageKey)) || {};
      const nextDayKey = formatKey(addDays(currentDate, 1));
      const nextDay = allDays[nextDayKey] || { date: nextDayKey, tasks: [] };
      nextDay.tasks.push({ ...task, id: Date.now() + Math.random(), completed: false, snoozed: true });
      allDays[nextDayKey] = nextDay;
      localStorage.setItem(tasksStorageKey, JSON.stringify(allDays));
      return prev.filter(t => t.id !== id);
    });
  };

  const goToDay = (days) => navigate(`/day/${formatKey(addDays(currentDate, days))}`);
  const saveReflection = (data) => { setReflection(data); setShowReflection(false); };

  const acceptCarryOver = () => {
    setTasks(prev => [
      ...yesterdayTasks.map(t => ({ ...t, id: Date.now() + Math.random(), completed: false })),
      ...prev,
    ]);
    setShowCarryModal(false);
  };

  const calculateCognitiveLoad = (tasks) => {
    let load = 0;
    tasks.forEach(task => {
      if (task.completed) return;
      load += 1;
      if (task.startTime) load += 1.5;
      if (task.startTime && task.endTime) load += 1;
      if (task.snoozed) load += 0.5;
    });
    if (load < 5) return "calm";
    if (load < 10) return "busy";
    return "overloaded";
  };

  const handleUpdateNotes = (content, mode = "append") => {
    if (dailyNotesRef.current?.updateFromVoice) {
      try { dailyNotesRef.current.updateFromVoice(content, mode); return; } catch {}
    }
    try {
      // ── AUTH CHANGE: notes stored under user-scoped key
      const notesKey = `daily-notes-${userId}`;
      const raw = localStorage.getItem(notesKey);
      const allNotes = raw ? JSON.parse(raw) : {};
      if (mode === "append") {
        const ts = new Date().toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" });
        allNotes[dayKey] = allNotes[dayKey]
          ? `${allNotes[dayKey]}\n\n[${ts}] ${content}`
          : `[${ts}] ${content}`;
      } else {
        allNotes[dayKey] = content;
      }
      localStorage.setItem(notesKey, JSON.stringify(allNotes));
      window.dispatchEvent(new Event("notes-updated"));
    } catch (e) { console.error("❌ Notes fallback failed:", e); }
  };

  const handleAddAlarm = (alarmParams) => {
    console.log("⏰ Today.jsx: Adding alarm", alarmParams);
    if (alarmPlannerRef.current?.addAlarmFromBuddy) {
      alarmPlannerRef.current.addAlarmFromBuddy({
        hour:   alarmParams.hour,
        minute: alarmParams.minute,
        period: alarmParams.period,
        date:   alarmParams.date || "",
        label:  alarmParams.label || "Alarm",
        repeat: alarmParams.repeat || "once",
      });
    }
  };

  return (
    <>
      <Header
        tasks={tasks}
        activeFilter={taskFilter}
        onFilterChange={setTaskFilter}
        onOpenReflection={() => setShowReflection(true)}
        onOpenWeeklySummary={() => setShowWeekly(true)}
        extra={<WsStatusBadge status={wsStatus} />}
      />

      <div className="today-container">
        <PushNotifications />

        <main className="today-main">
          <div className={`today-header cognitive-${cognitiveState}`}>
            <div className="today-date-navigation">
              <button onClick={() => goToDay(-1)}>⬅</button>
              <span>{currentDate.toDateString()}</span>
              <button onClick={() => goToDay(1)}>➡</button>
            </div>
            <div className="today-view-toggle">
              <button onClick={() => setViewMode("planner")}>Planner</button>
              <button onClick={() => setViewMode("calendar")}>Calendar</button>
            </div>
          </div>

          <ProgressBar total={tasks.length} completed={tasks.filter(t => t.completed).length} />
          <AddTask onAdd={addTask} />

          {viewMode === "planner" ? (
            <div className="bucket-columns">
              {["morning", "afternoon", "evening"].map(bucket => (
                <TaskSection
                  key={bucket}
                  title={bucket === "morning" ? "☀️ Morning" : bucket === "afternoon" ? "🌤 Afternoon" : "🌙 Evening"}
                  bucketKey={bucket}
                  tasks={getFilteredTasks(bucket)}
                  onToggle={toggleTask}
                  onDelete={deleteTask}
                  onEdit={editTask}
                  onMove={moveTask}
                  onSnooze={snoozeTask}
                  onStart={startTask}
                  onEditTime={editTaskTime}
                  selectedDate={dayKey}
                />
              ))}
            </div>
          ) : (
            <DayCalendar tasks={tasks} onToggle={toggleTask} onEdit={editTask} onDelete={deleteTask} />
          )}
        </main>

        {/* ── AUTH CHANGE: pass userId to DailyNotes so it uses "daily-notes-{userId}" key */}
        <DailyNotes ref={dailyNotesRef} currentDate={currentDate} userId={userId} />

        {showReflection && <ReflectionModal existing={reflection} onSave={saveReflection} onClose={() => setShowReflection(false)} />}
        {showCarryModal && <PendingCarryOverModal count={yesterdayTasks.length} onAccept={acceptCarryOver} onReject={() => setShowCarryModal(false)} />}
        {showWeekly     && <WeeklySummaryModal onClose={() => setShowWeekly(false)} />}
        {reminderTask   && <FirstTaskReminderOverlay task={reminderTask} onClose={() => setReminderTask(null)} />}
        {loadToast      && <div className="cognitive-toast">{loadToast}</div>}

        {/* ── AUTH CHANGE: pass userId to ChatBuddy */}
        <AdvancedBuddy
          currentDate={dayKey}
          tasks={tasks}
          userId={userId}
          onAddTask={handleAddTaskForDate}
          onCompleteTask={toggleTask}
          onDeleteTask={deleteTask}
          onUpdateNotes={handleUpdateNotes}
          onAddAlarm={handleAddAlarm}
        />

        {/* ── AUTH CHANGE: pass userId to AlarmPlanner so it uses "alarms-{userId}" key */}
        <AlarmPlanner ref={alarmPlannerRef} userId={userId} />
      </div>
    </>
  );
}

// ── AUTH CHANGE: outer wrapper reads userId from Supabase, passes to both
// TabSyncProvider and TodayInner
export default function Today() {
  const { user } = useAuth();           // Supabase user from your AuthContext
  const userId = user?.id || "anon";   // Supabase user.id is a stable UUID

  return (
    // TabSyncProvider gets userId → scopes BroadcastChannel + sessionStorage keys
    <TabSyncProvider userId={userId}>
      <TodayInner userId={userId} />
    </TabSyncProvider>
  );
}