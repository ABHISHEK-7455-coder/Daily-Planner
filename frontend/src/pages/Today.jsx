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

import "./Today.css";

/* 📅 DATE HELPERS */
const formatKey = (date) => date.toISOString().slice(0, 10);
const addDays = (date, days) => {
  const d = new Date(date);
  d.setDate(d.getDate() + days);
  return d;
};

const carryPopupKey = (date) =>
  `carry-popup-shown-${formatKey(date)}`;

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

  const prevLoadRef = useRef("calm");

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
        setLoadToast("🔥 This day looks heavy. It’s okay to stop adding.");
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
      },
      ...prev,
    ]);
  };

  const toggleTask = (id) => {
    setTasks((prev) =>
      prev.map((t) =>
        t.id === id ? { ...t, completed: !t.completed } : t
      )
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

  return (
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
          <h2>Tasks</h2>

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

      {/* ✅ DAY LEVEL FEATURES */}
      <DailyNotes currentDate={currentDate} />

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
    </div>
  );
}
