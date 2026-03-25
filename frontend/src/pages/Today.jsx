

import React, { useState, useEffect, useRef, useCallback } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { useMutation, useQuery, useConvex } from "convex/react";
import { api } from "../../convex/_generated/api";

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
  const convex       = useConvex();   // ← for imperative calls to other dates
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

  // ── Convex mutations ───────────────────────────────────────
  const saveDayMutation = useMutation(api.days.saveDay);

  // ── Load day data from Convex ──────────────────────────────
  const dayData = useQuery(api.days.getDay, { date: dayKey });

  useEffect(() => {
    if (dayData === undefined) return; // still loading
    setTasks(dayData?.tasks || []);
    setReflection(dayData?.reflection || null);
    setIsLoaded(true);
  }, [dayData]);

  // ── Debounced save to Convex ───────────────────────────────
  const scheduleSave = useCallback((newTasks, newReflection) => {
    if (saveTimerRef.current) clearTimeout(saveTimerRef.current);
    saveTimerRef.current = setTimeout(() => {
      saveDayMutation({ date: dayKey, tasks: newTasks, reflection: newReflection ?? null })
        .catch(e => console.error("saveDay failed:", e));
    }, 800);
  }, [dayKey, saveDayMutation]);

  // ── Helper to load another day imperatively ────────────────
  const loadOtherDay = useCallback(async (key) => {
    try {
      return await convex.query(api.days.getDay, { date: key });
    } catch (e) {
      console.error("loadOtherDay failed:", e);
      return { date: key, tasks: [], reflection: null };
    }
  }, [convex]);

  // ── Helper to save another day imperatively ────────────────
  const saveOtherDay = useCallback(async (key, { tasks, reflection }) => {
    try {
      await convex.mutation(api.days.saveDay, { date: key, tasks: tasks || [], reflection: reflection ?? null });
    } catch (e) {
      console.error("saveOtherDay failed:", e);
    }
  }, [convex]);

  // ── Reload when another tab broadcasts a change ───────────
  const reReadDayTasks = useCallback(async (changeType, payload) => {
    const affectedDate = payload?.date || dayKey;
    if (affectedDate !== dayKey) return;
    // useQuery will auto-refresh — just log it
    console.log(`[${tabId}] 🔄 Convex will auto-sync (${changeType})`);
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

  // ── Carry-over from yesterday ──────────────────────────────
  useEffect(() => {
    const todayKey = formatKey(new Date());
    if (dayKey !== todayKey) return;
    if (localStorage.getItem(carryPopupKey(new Date(), userId))) return;

    const yesterdayKey = formatKey(addDays(new Date(), -1));
    loadOtherDay(yesterdayKey).then((yesterday) => {
      if (!yesterday?.tasks) return;
      const pending = yesterday.tasks.filter(t => !t.completed);
      if (!pending.length) return;
      setYesterdayTasks(pending);
      setShowCarryModal(true);
      localStorage.setItem(carryPopupKey(new Date(), userId), "true");
    });
  }, [dayKey, userId, loadOtherDay]);

  // ── Task mutations ─────────────────────────────────────────
  const addTask = useCallback((title, timeOfDay, startTime = null, endTime = null) => {
    setTasks(prev => [{
      id: Date.now(), title, completed: false, timeOfDay,
      startTime, endTime, status: "idle",
      startedAt: null, completedAt: null, actualTime: null, snoozed: false,
    }, ...prev]);
  }, []);

  // Sanitize timeOfDay — AI sometimes returns "11 p.m." or "night" instead of schema values
  const sanitizeTimeOfDay = (t) => {
    if (!t) return "morning";
    const s = String(t).toLowerCase().replace(/\./g, "");
    if (s === "morning" || s === "afternoon" || s === "evening") return s;
    if (/even|night|raat|shaam/.test(s)) return "evening";
    if (/pm|p m/.test(s)) {
      const hourMatch = s.match(/(\d{1,2})\s*[:\s]?\s*(?:\d{2}\s*)?(?:pm|p m)/);
      if (hourMatch) { const h = parseInt(hourMatch[1]); return (h >= 5 && h !== 12) ? "evening" : "afternoon"; }
      return "evening";
    }
    if (/am|a m|morn|subah/.test(s)) return "morning";
    if (/after|noon|dopahar/.test(s)) return "afternoon";
    const numMatch = s.match(/\b(\d{1,2})\b/);
    if (numMatch) {
      const h = parseInt(numMatch[1]);
      if (h >= 5 && h <= 11) return "morning";
      if (h >= 12 && h <= 16) return "afternoon";
      return "evening";
    }
    return "morning";
  };

  const cleanTaskTitle = (title) => {
    if (!title) return title;
    return title
      .replace(/\s+at\s+\d{1,2}(:\d{2})?\s*(am|pm|a\.m\.|p\.m\.)?/gi, "")
      .replace(/\b\d{1,2}:\d{2}\s*(am|pm)?\b/gi, "")
      .replace(/\s{2,}/g, " ")
      .trim();
  };

  const handleAddTaskForDate = useCallback(async (title, timeOfDay, startTime, endTime, targetDate) => {
    const resolvedDate = targetDate ? formatKey(new Date(targetDate)) : dayKey;
    const safeTimeOfDay = sanitizeTimeOfDay(timeOfDay);

    if (resolvedDate === dayKey) {
      const newTask = {
        id: Date.now(), title, completed: false,
        timeOfDay: safeTimeOfDay,
        startTime: startTime || null, endTime: endTime || null,
        status: "idle", startedAt: null, completedAt: null, actualTime: null, snoozed: false,
      };
      const cleanedTitle = cleanTaskTitle(title);
      const finalTask = { ...newTask, title: cleanedTitle };
      setTasks(prev => [finalTask, ...prev]);
      lastBroadcastRef.current = { changeType: "add_task", payload: { date: resolvedDate, title: cleanedTitle } };
    } else {
      const dayData = await loadOtherDay(resolvedDate);
      const newTask = {
        id: Date.now() + Math.random(), title, completed: false,
        timeOfDay: safeTimeOfDay,
        startTime: startTime || null, endTime: endTime || null,
        status: "idle", startedAt: null, completedAt: null, actualTime: null, snoozed: false,
      };
      const updatedTasks = [newTask, ...(dayData?.tasks || [])];
      await saveOtherDay(resolvedDate, { tasks: updatedTasks, reflection: dayData?.reflection || null });
      broadcastTaskChange("add_task", { date: resolvedDate, title });
      sendWsEvent("add_task", { date: resolvedDate, title });
    }
  }, [dayKey, broadcastTaskChange, sendWsEvent, loadOtherDay, saveOtherDay]);

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
    const nextDayData = await loadOtherDay(nextDayKey);
    const snoozedTask = { ...task, id: Date.now() + Math.random(), completed: false, snoozed: true };
    const updatedTasks = [snoozedTask, ...(nextDayData?.tasks || [])];
    await saveOtherDay(nextDayKey, { tasks: updatedTasks, reflection: nextDayData?.reflection || null });
    setTasks(prev => prev.filter(t => t.id !== id));
  }, [tasks, currentDate, loadOtherDay, saveOtherDay]);

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
    // Fallback: call Convex directly
    try {
      if (mode === "append") {
        await convex.mutation(api.notes.appendNote, { date: dayKey, content });
      } else {
        await convex.mutation(api.notes.saveNote, { date: dayKey, content });
      }
      window.dispatchEvent(new Event("notes-updated"));
    } catch (e) {
      console.error("handleUpdateNotes failed:", e);
    }
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