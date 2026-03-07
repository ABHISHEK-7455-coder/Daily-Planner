// Today.jsx — Firebase Auth + MongoDB Data version
// Key changes vs Supabase version:
//   - useAuth() now comes from Firebase AuthContext (same API)
//   - All localStorage task reads/writes → MongoDB via mongoApi.js
//   - localStorage still used for UI state (carry popup shown, first-task-reminder, mood)

import React, { useState, useEffect, useRef, useCallback } from "react";
import { useParams, useNavigate } from "react-router-dom";

import AddTask                    from "../components/AddTask";
import TaskSection                from "../components/TaskSection";
import ProgressBar                from "../components/ProgressBar";
import ReflectionModal            from "../components/ReflectionModal";
import PendingCarryOverModal      from "../components/PendingCarryOverModal";
import WeeklySummaryModal         from "../components/WeeklySummaryModal";
import DailyNotes                 from "../components/DailyNotes";
import PushNotifications          from "../components/PushNotifications";
import DayCalendar                from "../components/DayCalendar";
import FirstTaskReminderOverlay   from "../components/FirstTaskReminderOverlay";
import AlarmPlanner               from "../components/AlarmPlanner";
import AdvancedBuddy              from "../components/Chatbuddy";
import { TabSyncProvider, useTabSession } from "../components/Usetabsession";
import { useWebSocketSync, WsStatusBadge } from "../components/Usewebsocketsync";
import { useAuth }                from "../Context/Authcontext";
import { loadDay, saveDay }       from "../services/Mongoapi";
import "./Today.css";
import Header from "../components/Header";

const formatKey = (date) => {
  const d = new Date(date);
  return `${d.getFullYear()}-${String(d.getMonth()+1).padStart(2,"0")}-${String(d.getDate()).padStart(2,"0")}`;
};

const addDays = (date, days) => {
  const d = new Date(date);
  d.setDate(d.getDate() + days);
  return d;
};

const carryPopupKey = (date, userId) => `carry-popup-shown-${userId}-${formatKey(date)}`;

// ─────────────────────────────────────────────────────────────
function TodayInner({ userId }) {
  const { date }     = useParams();
  const navigate     = useNavigate();
  const { tabId, broadcastDateChange, broadcastTaskChange, onSharedDataChanged } = useTabSession();

  const parsedDate   = date ? new Date(date) : new Date();
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
  const saveTimerRef    = useRef(null);

  // ── Load day data from MongoDB ─────────────────────────────
  const loadDayData = useCallback(async (key) => {
    setIsLoaded(false);
    const dayData = await loadDay(key);
    setTasks(dayData?.tasks || []);
    setReflection(dayData?.reflection || null);
    setIsLoaded(true);
  }, []);

  // ── Debounced save to MongoDB ──────────────────────────────
  const scheduleSave = useCallback((newTasks, newReflection) => {
    if (saveTimerRef.current) clearTimeout(saveTimerRef.current);
    saveTimerRef.current = setTimeout(() => {
      saveDay(dayKey, { tasks: newTasks, reflection: newReflection });
    }, 800);
  }, [dayKey]);

  // ── Reload when another tab broadcasts a change ───────────
  const reReadDayTasks = useCallback(async (changeType, payload) => {
    const affectedDate = payload?.date || dayKey;
    if (affectedDate !== dayKey) return;
    const dayData = await loadDay(dayKey);
    if (dayData?.tasks) {
      setTasks(dayData.tasks);
      console.log(`[${tabId}] 🔄 Re-read from MongoDB (${changeType})`);
    }
  }, [dayKey, tabId]);

  const { wsStatus, sendWsEvent } = useWebSocketSync({
    tabId,
    currentDate: dayKey,
    onSyncEvent: ({ changeType, payload, fromTabId }) => {
      if (fromTabId !== tabId) reReadDayTasks(changeType, payload);
    },
  });

  useEffect(() => {
    const unsub = onSharedDataChanged(({ changeType, payload, tabId: fromTabId }) => {
      if (fromTabId !== tabId) reReadDayTasks(changeType, payload);
    });
    return unsub;
  }, [onSharedDataChanged, reReadDayTasks, tabId]);

  // ── Save whenever tasks/reflection change ─────────────────
  const lastBroadcastRef = useRef(null);
  useEffect(() => {
    if (!isLoaded) return;
    scheduleSave(tasks, reflection);
    if (lastBroadcastRef.current) {
      const { changeType, payload } = lastBroadcastRef.current;
      lastBroadcastRef.current = null;
      broadcastTaskChange(changeType, payload);
      sendWsEvent(changeType, payload);
    }
  }, [tasks, reflection, isLoaded]);

  const getFilteredTasks = (timeOfDay) =>
    tasks.filter((t) => {
      if (t.timeOfDay !== timeOfDay) return false;
      if (taskFilter === "pending")   return !t.completed;
      if (taskFilter === "completed") return  t.completed;
      return true;
    });

  // ── First-task reminder ────────────────────────────────────
  useEffect(() => {
    if (!tasks.length) return;
    const shownKey = `first-task-reminder-shown-${userId}-${dayKey}`;
    if (localStorage.getItem(shownKey)) return;
    const timedTasks = tasks.filter(t => t.startTime).sort((a,b) => a.startTime.localeCompare(b.startTime));
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

  // ── Cognitive load toast ───────────────────────────────────
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

  // ── Load on date change ────────────────────────────────────
  useEffect(() => {
    if (date) setCurrentDate(new Date(date));
  }, [date]);

  useEffect(() => {
    loadDayData(dayKey);
  }, [dayKey, loadDayData]);

  // ── Carry-over from yesterday (reads from MongoDB) ─────────
  useEffect(() => {
    const todayKey = formatKey(new Date());
    if (dayKey !== todayKey) return;
    if (localStorage.getItem(carryPopupKey(new Date(), userId))) return;

    const yesterdayKey = formatKey(addDays(new Date(), -1));
    loadDay(yesterdayKey).then((yesterday) => {
      if (!yesterday?.tasks) return;
      const pending = yesterday.tasks.filter(t => !t.completed);
      if (!pending.length) return;
      setYesterdayTasks(pending);
      setShowCarryModal(true);
      localStorage.setItem(carryPopupKey(new Date(), userId), "true");
    });
  }, [dayKey, userId]);

  // ── Task mutations ─────────────────────────────────────────
  const addTask = useCallback((title, timeOfDay, startTime = null, endTime = null) => {
    setTasks(prev => [{
      id: Date.now(), title, completed: false, timeOfDay,
      startTime, endTime, status: "idle",
      startedAt: null, completedAt: null, actualTime: null,
    }, ...prev]);
  }, []);

  const handleAddTaskForDate = useCallback(async (title, timeOfDay, startTime, endTime, targetDate) => {
    const resolvedDate = targetDate ? formatKey(new Date(targetDate)) : dayKey;

    if (resolvedDate === dayKey) {
      const newTask = {
        id: Date.now(), title, completed: false,
        timeOfDay: timeOfDay || "morning",
        startTime: startTime || null, endTime: endTime || null,
        status: "idle", startedAt: null, completedAt: null, actualTime: null,
      };
      setTasks(prev => [newTask, ...prev]);
      lastBroadcastRef.current = { changeType: "add_task", payload: { date: resolvedDate, title } };
    } else {
      // Add to a different day in MongoDB
      const dayData = await loadDay(resolvedDate);
      const newTask = {
        id: Date.now() + Math.random(), title, completed: false,
        timeOfDay: timeOfDay || "morning",
        startTime: startTime || null, endTime: endTime || null,
        status: "idle", startedAt: null, completedAt: null, actualTime: null,
      };
      const updatedTasks = [newTask, ...(dayData?.tasks || [])];
      await saveDay(resolvedDate, { tasks: updatedTasks, reflection: dayData?.reflection || null });
      broadcastTaskChange("add_task", { date: resolvedDate, title });
      sendWsEvent("add_task", { date: resolvedDate, title });
    }
  }, [dayKey, broadcastTaskChange, sendWsEvent]);

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

  const snoozeTask = useCallback(async (id) => {
    const task = tasks.find(t => t.id === id);
    if (!task) return;
    const nextDayKey = formatKey(addDays(currentDate, 1));
    const nextDayData = await loadDay(nextDayKey);
    const snoozedTask = { ...task, id: Date.now() + Math.random(), completed: false, snoozed: true };
    const updatedTasks = [snoozedTask, ...(nextDayData?.tasks || [])];
    await saveDay(nextDayKey, { tasks: updatedTasks, reflection: nextDayData?.reflection || null });
    setTasks(prev => prev.filter(t => t.id !== id));
  }, [tasks, currentDate]);

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
    if (load < 5)  return "calm";
    if (load < 10) return "busy";
    return "overloaded";
  };

  const handleUpdateNotes = async (content, mode = "append") => {
    if (dailyNotesRef.current?.updateFromVoice) {
      try { dailyNotesRef.current.updateFromVoice(content, mode); return; } catch {}
    }
    // Fallback: call MongoDB notes API directly
    const { appendNote, saveNote } = await import("../services/Mongoapi");
    if (mode === "append") {
      await appendNote(dayKey, content);
    } else {
      await saveNote(dayKey, content);
    }
    window.dispatchEvent(new Event("notes-updated"));
  };

  const handleAddAlarm = (alarmParams) => {
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

        <DailyNotes ref={dailyNotesRef} currentDate={currentDate} userId={userId} />

        {showReflection && <ReflectionModal existing={reflection} onSave={saveReflection} onClose={() => setShowReflection(false)} />}
        {showCarryModal && <PendingCarryOverModal count={yesterdayTasks.length} onAccept={acceptCarryOver} onReject={() => setShowCarryModal(false)} />}
        {showWeekly     && <WeeklySummaryModal onClose={() => setShowWeekly(false)} />}
        {reminderTask   && <FirstTaskReminderOverlay task={reminderTask} onClose={() => setReminderTask(null)} />}
        {loadToast      && <div className="cognitive-toast">{loadToast}</div>}

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

        <AlarmPlanner ref={alarmPlannerRef} userId={userId} />
      </div>
    </>
  );
}

export default function Today() {
  const { user }  = useAuth();
  const userId    = user?.id || "anon";

  return (
    <TabSyncProvider userId={userId}>
      <TodayInner userId={userId} />
    </TabSyncProvider>
  );
}