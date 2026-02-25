// TODAY.JSX — FIXED
// 
// ROOT CAUSE OF TASK NOT APPEARING:
// handleAddTaskForDate compares resolvedDate === dayKey
// But if LLM returns date: "2026-02-24" and dayKey uses toISOString() 
// with timezone offset, they can differ ("2026-02-23" vs "2026-02-24").
//
// Also: the new sync layer calls reReadDayTasks() via BroadcastChannel
// BEFORE the save useEffect runs → reads stale localStorage → overwrites 
// the new task with old data.
//
// FIX 1: Always use direct setTasks() for same-day tasks (never go through localStorage)
// FIX 2: Remove broadcastChange() from handleAddTaskForDate for same-day tasks
//         (ChatBuddy already doesn't broadcast, and Today.jsx shouldn't either
//          until after the save useEffect has persisted the data)
// FIX 3: Robust date comparison using normalized date strings

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
import "./Today.css";
import Header from "../components/Header";

// Always produce YYYY-MM-DD from any date — avoids timezone shift bugs
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

const carryPopupKey = (date) => `carry-popup-shown-${formatKey(date)}`;

function TodayInner() {
  const { date } = useParams();
  const navigate = useNavigate();

  const { tabId, broadcastDateChange, broadcastTaskChange, onSharedDataChanged } = useTabSession();

  const parsedDate = date ? new Date(date) : new Date();
  const [currentDate, setCurrentDate] = useState(parsedDate);
  const dayKey = formatKey(currentDate);

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

  // Re-read tasks from localStorage (only for cross-tab sync events)
  const reReadDayTasks = useCallback((changeType, payload) => {
    const affectedDate = payload?.date || dayKey;
    // Only re-read if the change is for THIS day
    if (affectedDate !== dayKey) return;
    const allDays = JSON.parse(localStorage.getItem("days-data")) || {};
    const dayData = allDays[dayKey];
    if (dayData?.tasks) {
      setTasks(dayData.tasks);
      console.log(`[${tabId}] 🔄 Re-read from localStorage (${changeType})`);
    }
  }, [dayKey, tabId]);

  const { wsStatus, sendWsEvent } = useWebSocketSync({
    tabId,
    currentDate: dayKey,
    onSyncEvent: ({ changeType, payload, fromTabId }) => {
      // Only re-read from OTHER tabs — not our own events
      if (fromTabId !== tabId) {
        console.log(`[${tabId}] 📥 WS sync from ${fromTabId}: ${changeType}`);
        reReadDayTasks(changeType, payload);
      }
    },
  });

  useEffect(() => {
    const unsub = onSharedDataChanged(({ changeType, payload, fromTabId }) => {
      // Only re-read from OTHER tabs — not our own broadcasts
      if (fromTabId !== tabId) {
        reReadDayTasks(changeType, payload);
      }
    });
    return unsub;
  }, [onSharedDataChanged, reReadDayTasks, tabId]);

  // Broadcast to other tabs AFTER localStorage has been written
  // This useEffect runs after tasks state updates AND localStorage save
  const lastBroadcastRef = useRef(null);
  useEffect(() => {
    if (!isLoaded) return;
    // Save to localStorage first
    const allDays = JSON.parse(localStorage.getItem("days-data")) || {};
    allDays[dayKey] = { date: dayKey, tasks, reflection };
    localStorage.setItem("days-data", JSON.stringify(allDays));
    // Then broadcast to other tabs if there's a pending broadcast
    if (lastBroadcastRef.current) {
      const { changeType, payload } = lastBroadcastRef.current;
      lastBroadcastRef.current = null;
      broadcastTaskChange(changeType, payload);
      sendWsEvent(changeType, payload);
    }
  }, [tasks, reflection, dayKey, isLoaded]);

  const getFilteredTasks = (timeOfDay) =>
    tasks.filter((t) => {
      if (t.timeOfDay !== timeOfDay) return false;
      if (taskFilter === "pending")   return !t.completed;
      if (taskFilter === "completed") return  t.completed;
      return true;
    });
      
  useEffect(() => {
    if (!tasks.length) return;
    const shownKey = `first-task-reminder-shown-${dayKey}`;
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
  }, [tasks, currentDate, dayKey]);

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
    const allDays = JSON.parse(localStorage.getItem("days-data")) || {};
    const dayData = allDays[dayKey];
    setTasks(dayData?.tasks || []);
    setReflection(dayData?.reflection || null);
    setIsLoaded(true);
  }, [dayKey]);

  useEffect(() => {
    const todayKey = formatKey(new Date());
    if (dayKey !== todayKey) return;
    if (localStorage.getItem(carryPopupKey(new Date()))) return;
    const allDays = JSON.parse(localStorage.getItem("days-data")) || {};
    const yesterdayKey = formatKey(addDays(new Date(), -1));
    const yesterday = allDays[yesterdayKey];
    if (!yesterday?.tasks) return;
    const pending = yesterday.tasks.filter(t => !t.completed);
    if (!pending.length) return;
    setYesterdayTasks(pending);
    setShowCarryModal(true);
    localStorage.setItem(carryPopupKey(new Date()), "true");
  }, [dayKey]);

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

  // FIXED: handleAddTaskForDate
  // - Uses local date math (not toISOString) for timezone-safe comparison
  // - Directly calls setTasks for same-day (never reads from stale localStorage)
  // - Defers broadcast until AFTER localStorage is saved via lastBroadcastRef
  const handleAddTaskForDate = useCallback((title, timeOfDay, startTime, endTime, targetDate) => {
    // Normalize both dates to YYYY-MM-DD for reliable comparison
    const resolvedDate = targetDate ? formatKey(new Date(targetDate)) : dayKey;

    console.log(`[${tabId}] ➕ Adding task "${title}" to ${resolvedDate} (dayKey: ${dayKey})`);

    if (resolvedDate === dayKey) {
      // Same day — update React state directly (fast, no localStorage read)
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
      // Schedule broadcast for AFTER save useEffect runs
      lastBroadcastRef.current = { changeType: "add_task", payload: { date: resolvedDate, title } };
    } else {
      // Different day — write directly to localStorage
      const allDays = JSON.parse(localStorage.getItem("days-data")) || {};
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
      localStorage.setItem("days-data", JSON.stringify(allDays));
      // Broadcast immediately for other-day tasks (no state update race)
      broadcastTaskChange("add_task", { date: resolvedDate, title });
      sendWsEvent("add_task", { date: resolvedDate, title });
      console.log(`✅ Task "${title}" saved to ${resolvedDate}`);
    }
  }, [dayKey, tabId, broadcastTaskChange, sendWsEvent]);

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
      const allDays = JSON.parse(localStorage.getItem("days-data")) || {};
      const nextDayKey = formatKey(addDays(currentDate, 1));
      const nextDay = allDays[nextDayKey] || { date: nextDayKey, tasks: [] };
      nextDay.tasks.push({ ...task, id: Date.now() + Math.random(), completed: false, snoozed: true });
      allDays[nextDayKey] = nextDay;
      localStorage.setItem("days-data", JSON.stringify(allDays));
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
      const raw = localStorage.getItem("daily-notes");
      const allNotes = raw ? JSON.parse(raw) : {};
      if (mode === "append") {
        const ts = new Date().toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" });
        allNotes[dayKey] = allNotes[dayKey]
          ? `${allNotes[dayKey]}\n\n[${ts}] ${content}`
          : `[${ts}] ${content}`;
      } else {
        allNotes[dayKey] = content;
      }
      localStorage.setItem("daily-notes", JSON.stringify(allNotes));
      window.dispatchEvent(new Event("notes-updated"));
    } catch (e) { console.error("❌ Notes fallback failed:", e); }
  };

  // ChatBuddy passes pre-converted { hour(12h), minute, period, date, label, repeat }
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

        <DailyNotes ref={dailyNotesRef} currentDate={currentDate} />

        {showReflection && <ReflectionModal existing={reflection} onSave={saveReflection} onClose={() => setShowReflection(false)} />}
        {showCarryModal && <PendingCarryOverModal count={yesterdayTasks.length} onAccept={acceptCarryOver} onReject={() => setShowCarryModal(false)} />}
        {showWeekly     && <WeeklySummaryModal onClose={() => setShowWeekly(false)} />}
        {reminderTask   && <FirstTaskReminderOverlay task={reminderTask} onClose={() => setReminderTask(null)} />}
        {loadToast      && <div className="cognitive-toast">{loadToast}</div>}

        <AdvancedBuddy
          currentDate={dayKey}
          tasks={tasks}
          onAddTask={handleAddTaskForDate}
          onCompleteTask={toggleTask}
          onDeleteTask={deleteTask}
          onUpdateNotes={handleUpdateNotes}
          onAddAlarm={handleAddAlarm}
        />

        <AlarmPlanner ref={alarmPlannerRef} />
      </div>
    </>
  );
}

export default function Today() {
  return (
    <TabSyncProvider>
      <TodayInner />
    </TabSyncProvider>
  );
}