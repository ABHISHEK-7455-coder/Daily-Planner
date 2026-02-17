import React, { useState, useEffect, useRef } from "react";
import { useParams, useNavigate } from "react-router-dom";

import Sidebar from "../components/Sidebar";
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

import "./Today.css";
import Header from "../components/Header";

/* 📅 DATE HELPERS */
const formatKey = (date) => date.toISOString().slice(0, 10);
const addDays = (date, days) => {
  const d = new Date(date);
  d.setDate(d.getDate() + days);
  return d;
};

const carryPopupKey = (date) =>
  `carry-popup-shown-${formatKey(date)}`;

// 🎯 Helper to convert 24h to 12h format for AlarmPlanner
function to12Hour(time24) {
  if (!time24) return { hour: "6", minute: "00", period: "AM" };
  
  const [h, m] = time24.split(':').map(Number);
  let hour = h;
  let period = "AM";
  
  if (h === 0) {
    hour = 12;
    period = "AM";
  } else if (h === 12) {
    hour = 12;
    period = "PM";
  } else if (h > 12) {
    hour = h - 12;
    period = "PM";
  }
  
  return {
    hour: String(hour),
    minute: String(m).padStart(2, '0'),
    period
  };
}

export default function Today() {
  const { date } = useParams();
  const navigate = useNavigate();

  const parsedDate = date ? new Date(date) : new Date();
  const [currentDate, setCurrentDate] = useState(parsedDate);
  const dayKey = formatKey(currentDate);

  const [tasks, setTasks] = useState([]);
  const [reflection, setReflection] = useState(null);

  const [timeView, setTimeView] = useState(
    localStorage.getItem("time-view") || "sections"
  );

  const [showReflection, setShowReflection] = useState(false);
  const [showCarryModal, setShowCarryModal] = useState(false);
  const [yesterdayTasks, setYesterdayTasks] = useState([]);
  const [showWeekly, setShowWeekly] = useState(false);
  const [isLoaded, setIsLoaded] = useState(false);
  const [viewMode, setViewMode] = useState("planner");
  const [taskFilter, setTaskFilter] = useState("all");
  const [reminderTask, setReminderTask] = useState(null);
  const [cognitiveState, setCognitiveState] = useState("calm");
  const [loadToast, setLoadToast] = useState(null);

  /* 🆕 BUCKET STATE */
  const [activeBucket, setActiveBucket] = useState("morning");

  // 🎯 CRITICAL: Add refs for integrations
  const dailyNotesRef = useRef(null);
  const alarmPlannerRef = useRef(null);
  const prevLoadRef = useRef("calm");

  // 🎯 DEBUG: Log when refs are set
  useEffect(() => {
    console.log("🔍 Today.jsx: DailyNotes ref:", dailyNotesRef.current);
    console.log("🔍 Today.jsx: AlarmPlanner ref:", alarmPlannerRef.current);
  }, [dailyNotesRef.current, alarmPlannerRef.current]);

  /* 🔹 FILTER LOGIC */
  const getFilteredTasks = (timeOfDay) =>
    tasks.filter((t) => {
      if (t.timeOfDay !== timeOfDay) return false;
      if (taskFilter === "pending") return !t.completed;
      if (taskFilter === "completed") return t.completed;
      return true;
    });

  /* 🔔 FIRST TASK REMINDER */
  useEffect(() => {
    if (!tasks.length) return;

    const todayKey = formatKey(currentDate);
    const shownKey = `first-task-reminder-shown-${todayKey}`;
    if (localStorage.getItem(shownKey)) return;

    const timedTasks = tasks
      .filter((t) => t.startTime)
      .sort((a, b) => a.startTime.localeCompare(b.startTime));

    if (!timedTasks.length) return;

    const firstTask = timedTasks[0];
    const [h, m] = firstTask.startTime.split(":");

    const start = new Date(currentDate);
    start.setHours(h, m, 0, 0);

    const reminderTime = new Date(start.getTime() - 30 * 60000);
    const now = new Date();

    if (now >= reminderTime && now < start) {
      setReminderTask(firstTask);
      localStorage.setItem(shownKey, "true");
    }
  }, [tasks, currentDate]);

  /* 🧠 COGNITIVE LOAD */
  useEffect(() => {
    const newState = calculateCognitiveLoad(tasks);
    const prevState = prevLoadRef.current;

    if (newState !== prevState) {
      if (newState === "busy") {
        setLoadToast("⚡ Your day is getting busy. Prioritize wisely.");
      }
      if (newState === "overloaded") {
        setLoadToast("🔥 This day looks heavy. It's okay to stop adding.");
      }
      if (prevState === "overloaded" && newState === "busy") {
        setLoadToast("🌿 Feeling lighter now. Good job clearing space.");
      }

      prevLoadRef.current = newState;
      setTimeout(() => setLoadToast(null), 3500);
    }

    setCognitiveState(newState);
  }, [tasks]);

  /* 🔄 SYNC URL */
  useEffect(() => {
    if (!date) return;
    setCurrentDate(new Date(date));
  }, [date]);

  /* 🔹 LOAD DAY DATA */
  useEffect(() => {
    setIsLoaded(false);
    const allDays = JSON.parse(localStorage.getItem("days-data")) || {};
    const dayData = allDays[dayKey];

    setTasks(dayData?.tasks || []);
    setReflection(dayData?.reflection || null);
    setIsLoaded(true);
  }, [dayKey]);

  /* 🔹 SAVE DAY DATA */
  useEffect(() => {
    if (!isLoaded) return;

    const allDays = JSON.parse(localStorage.getItem("days-data")) || {};
    allDays[dayKey] = { date: dayKey, tasks, reflection };
    localStorage.setItem("days-data", JSON.stringify(allDays));
  }, [tasks, reflection, dayKey, isLoaded]);

  /* 🔹 CARRY OVER */
  useEffect(() => {
    const todayKey = formatKey(new Date());
    if (dayKey !== todayKey) return;
    if (localStorage.getItem(carryPopupKey(new Date()))) return;

    const allDays = JSON.parse(localStorage.getItem("days-data")) || {};
    const yesterdayKey = formatKey(addDays(new Date(), -1));
    const yesterday = allDays[yesterdayKey];

    if (!yesterday?.tasks) return;

    const pending = yesterday.tasks.filter((t) => !t.completed);
    if (!pending.length) return;

    setYesterdayTasks(pending);
    setShowCarryModal(true);
    localStorage.setItem(carryPopupKey(new Date()), "true");
  }, [dayKey]);

  /* 🔹 TASK ACTIONS */
  const addTask = (title, timeOfDay, startTime = null, endTime = null) => {
    setTasks((prev) => [
      {
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
      },
      ...prev,
    ]);
  };

  const startTask = (id) => {
    setTasks((prev) =>
      prev.map((t) =>
        t.id === id
          ? {
            ...t,
            status: "running",
            startedAt: new Date().toISOString(),
          }
          : t
      )
    );
  };

  const toggleTask = (id) => {
    setTasks((prev) =>
      prev.map((t) => {
        if (t.id !== id) return t;

        if (!t.completed) {
          const now = new Date();
          let actualMinutes = null;

          if (t.startedAt) {
            const start = new Date(t.startedAt);
            actualMinutes = Math.floor((now - start) / 60000);
          }

          return {
            ...t,
            completed: true,
            status: "done",
            completedAt: now.toISOString(),
            actualTime: actualMinutes,
          };
        }

        return {
          ...t,
          completed: false,
          status: "idle",
          startedAt: null,
          completedAt: null,
          actualTime: null,
        };
      })
    );
  };

  const deleteTask = (id) => {
    setTasks((prev) => prev.filter((t) => t.id !== id));
  };

  const editTask = (id, text) => {
    setTasks((prev) =>
      prev.map((t) => (t.id === id ? { ...t, title: text } : t))
    );
  };

  const moveTask = (id, newTimeOfDay) => {
    setTasks((prev) => {
      const task = prev.find((t) => t.id === id);
      if (!task) return prev;
      return [...prev.filter((t) => t.id !== id), { ...task, timeOfDay: newTimeOfDay }];
    });
  };

  const snoozeTask = (id) => {
    setTasks((prev) => {
      const task = prev.find((t) => t.id === id);
      if (!task) return prev;

      const allDays = JSON.parse(localStorage.getItem("days-data")) || {};
      const nextDayKey = formatKey(addDays(currentDate, 1));
      const nextDay = allDays[nextDayKey] || { date: nextDayKey, tasks: [] };

      nextDay.tasks.push({
        ...task,
        id: Date.now() + Math.random(),
        completed: false,
        snoozed: true,
      });

      allDays[nextDayKey] = nextDay;
      localStorage.setItem("days-data", JSON.stringify(allDays));

      return prev.filter((t) => t.id !== id);
    });
  };

  const goToDay = (days) => {
    navigate(`/day/${formatKey(addDays(currentDate, days))}`);
  };

  const saveReflection = (data) => {
    setReflection(data);
    setShowReflection(false);
  };

  const acceptCarryOver = () => {
    setTasks((prev) => [
      ...yesterdayTasks.map((t) => ({
        ...t,
        id: Date.now() + Math.random(),
        completed: false,
      })),
      ...prev,
    ]);
    setShowCarryModal(false);
  };

  const calculateCognitiveLoad = (tasks) => {
    let load = 0;
    tasks.forEach((task) => {
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
// 🎯 BULLETPROOF: Handle notes update from buddy
const handleUpdateNotes = (content, mode = 'append') => {
  console.log("═════════════════════════════════════════");
  console.log("📝 Today.jsx: handleUpdateNotes called");
  console.log("📝 Content:", content);
  console.log("📝 Content length:", content.length);
  console.log("📝 Mode:", mode);
  console.log("📝 Current dayKey:", dayKey);
  console.log("📝 dailyNotesRef:", dailyNotesRef);
  console.log("📝 dailyNotesRef.current:", dailyNotesRef.current);
  console.log("📝 dailyNotesRef.current.updateFromVoice:", dailyNotesRef.current?.updateFromVoice);
  console.log("═════════════════════════════════════════");
  
  // METHOD 1: Use ref (preferred)
  if (dailyNotesRef.current && dailyNotesRef.current.updateFromVoice) {
    console.log("✅ METHOD 1: Calling updateFromVoice on ref");
    try {
      dailyNotesRef.current.updateFromVoice(content, mode);
      console.log("✅ Notes updated successfully via ref");
      return; // Success!
    } catch (error) {
      console.error("❌ Error updating notes via ref:", error);
      console.log("⚠️ Falling back to METHOD 2");
    }
  } else {
    console.error("❌ Ref not available, using METHOD 2");
  }
  
  // METHOD 2: Direct localStorage update + event dispatch (fallback)
  console.log("🔄 METHOD 2: Direct localStorage update");
  try {
    const raw = localStorage.getItem("daily-notes");
    const allNotes = raw ? JSON.parse(raw) : {};
    
    if (mode === 'append') {
      const existingNote = allNotes[dayKey] || "";
      const timestamp = new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
      const newNote = existingNote
        ? `${existingNote}\n\n[${timestamp}] ${content}`
        : `[${timestamp}] ${content}`;
      allNotes[dayKey] = newNote;
      console.log("📝 New note length:", newNote.length);
    } else {
      allNotes[dayKey] = content;
    }
    
    localStorage.setItem("daily-notes", JSON.stringify(allNotes));
    console.log("✅ Saved to localStorage");
    
    // Trigger custom event to force DailyNotes to reload
    window.dispatchEvent(new Event('notes-updated'));
    console.log("📢 Dispatched notes-updated event");
    
    // Also update trigger key for storage event
    localStorage.setItem('daily-notes-update-trigger', Date.now().toString());
    console.log("🔔 Updated trigger key");
    
  } catch (error) {
    console.error("❌ METHOD 2 failed:", error);
    console.error("⚠️ NOTHING WORKED - Please refresh the page");
  }
};

  // 🎯 FIXED: Handle alarm from buddy
  const handleAddAlarm = (alarmParams) => {
    console.log("⏰ Today.jsx: Adding alarm", alarmParams);
    
    // Convert 24-hour time to 12-hour for AlarmPlanner
    const { hour, minute, period } = to12Hour(alarmParams.time);
    
    const alarmData = {
      hour,
      minute,
      period,
      date: alarmParams.date || "",
      label: alarmParams.label || "Alarm",
      repeat: alarmParams.repeat || "once"
    };
    
    if (alarmPlannerRef.current && alarmPlannerRef.current.addAlarmFromBuddy) {
      alarmPlannerRef.current.addAlarmFromBuddy(alarmData);
      console.log("✅ Alarm added via ref");
    } else {
      console.error("❌ AlarmPlanner ref not available");
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
            />
  
    <div className="today-container">
       
      <PushNotifications />

      <Sidebar
        tasks={tasks}
        activeFilter={taskFilter}
        onFilterChange={setTaskFilter}
        onOpenReflection={() => setShowReflection(true)}
        onOpenWeeklySummary={() => setShowWeekly(true)}
      />

      <main className="today-main">
        <div className={`today-header cognitive-${cognitiveState}`}>
          {/* <h2>Tasks</h2> */}

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

        <ProgressBar
          total={tasks.length}
          completed={tasks.filter((t) => t.completed).length}
        />

        <AddTask onAdd={addTask} />

        {viewMode === "planner" ? (
          <div className="bucket-layout">
            <div className="bucket-sidebar">
              {["morning", "afternoon", "evening"].map((bucket) => (
                <button
                  key={bucket}
                  className={`bucket-btn ${activeBucket === bucket ? "active" : ""}`}
                  onClick={() => setActiveBucket(bucket)}
                >
                  {bucket === "morning" && "☀️ Morning"}
                  {bucket === "afternoon" && "🌤 Afternoon"}
                  {bucket === "evening" && "🌙 Evening"}
                </button>
              ))}
            </div>

            <div className="bucket-content">
              <TaskSection
                title={activeBucket.charAt(0).toUpperCase() + activeBucket.slice(1)}
                tasks={getFilteredTasks(activeBucket)}
                onToggle={toggleTask}
                onDelete={deleteTask}
                onEdit={editTask}
                onMove={moveTask}
                onSnooze={snoozeTask}
                onStart={startTask}
                selectedDate={dayKey}
              />
            </div>
          </div>
        ) : (
          <DayCalendar
            tasks={tasks}
            onToggle={toggleTask}
            onEdit={editTask}
            onDelete={deleteTask}
          />
        )}
      </main>

      {/* 🎯 FIXED: Add ref to DailyNotes */}
      <DailyNotes ref={dailyNotesRef} currentDate={currentDate} />

      {showReflection && (
        <ReflectionModal
          existing={reflection}
          onSave={saveReflection}
          onClose={() => setShowReflection(false)}
        />
      )}

      {showCarryModal && (
        <PendingCarryOverModal
          count={yesterdayTasks.length}
          onAccept={acceptCarryOver}
          onReject={() => setShowCarryModal(false)}
        />
      )}

      {showWeekly && (
        <WeeklySummaryModal onClose={() => setShowWeekly(false)} />
      )}

      {reminderTask && (
        <FirstTaskReminderOverlay
          task={reminderTask}
          onClose={() => setReminderTask(null)}
        />
      )}

      {loadToast && <div className="cognitive-toast">{loadToast}</div>}

      {/* 🎯 FIXED: Pass handlers to AdvancedBuddy */}
      <AdvancedBuddy
        currentDate={dayKey}
        tasks={tasks}
        onAddTask={addTask}
        onCompleteTask={toggleTask}
        onDeleteTask={deleteTask}
        onUpdateNotes={handleUpdateNotes}
        onAddAlarm={handleAddAlarm}
      />

      {/* 🎯 FIXED: Add ref to AlarmPlanner */}
      <AlarmPlanner ref={alarmPlannerRef} />
    </div>
    
  </>
  );
}