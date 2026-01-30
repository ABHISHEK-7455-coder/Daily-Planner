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

    const morningRef = useRef(null);
    const afternoonRef = useRef(null);
    const eveningRef = useRef(null);

    /* 🔹 FILTER LOGIC */
    const getFilteredTasks = (timeOfDay) =>
        tasks.filter(t => {
            if (t.timeOfDay !== timeOfDay) return false;
            if (taskFilter === "pending") return !t.completed;
            if (taskFilter === "completed") return t.completed;
            return true;
        });

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

    useEffect(() => {
        localStorage.setItem("time-view", timeView);
    }, [timeView]);

    /* 🔹 CARRY OVER CHECK */
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

    /* 🔹 TASK ACTIONS */
    const addTask = (title, timeOfDay, startTime = null, endTime = null) => {
        setTasks(prev => [{
            id: Date.now(),
            title,
            completed: false,
            timeOfDay,
            startTime,
            endTime
        }, ...prev]);
    };

    const toggleTask = (id) => {
        setTasks(prev =>
            prev.map(t => t.id === id ? { ...t, completed: !t.completed } : t)
        );
    };

    const deleteTask = (id) => {
        setTasks(prev => prev.filter(t => t.id !== id));
    };

    const editTask = (id, text) => {
        setTasks(prev =>
            prev.map(t => t.id === id ? { ...t, title: text } : t)
        );
    };

    /* ✅ MOVE → bottom of selected section */
    const moveTask = (id, newTimeOfDay) => {
        setTasks(prev => {
            const task = prev.find(t => t.id === id);
            if (!task) return prev;

            const remaining = prev.filter(t => t.id !== id);

            return [
                ...remaining,
                { ...task, timeOfDay: newTimeOfDay }
            ];
        });
    };

    /* ✅ SNOOZE → next day, same bucket */
    const snoozeTask = (id) => {
        setTasks(prev => {
            const task = prev.find(t => t.id === id);
            if (!task) return prev;

            const allDays = JSON.parse(localStorage.getItem("days-data")) || {};
            const nextDayKey = formatKey(addDays(currentDate, 1));

            const nextDay = allDays[nextDayKey] || { date: nextDayKey, tasks: [] };

            nextDay.tasks.push({
                ...task,
                id: Date.now() + Math.random(),
                completed: false
            });

            allDays[nextDayKey] = nextDay;
            localStorage.setItem("days-data", JSON.stringify(allDays));

            return prev.filter(t => t.id !== id);
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
        setTasks(prev => [
            ...yesterdayTasks.map(t => ({
                ...t,
                id: Date.now() + Math.random(),
                completed: false
            })),
            ...prev
        ]);
        setShowCarryModal(false);
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
                <div className="today-header">
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
                    completed={tasks.filter(t => t.completed).length}
                />

                <AddTask onAdd={addTask} />

                {viewMode === "planner" ? (
                    <>
                        <div ref={morningRef}>
                            <TaskSection
                                title="Morning"
                                tasks={getFilteredTasks("morning")}
                                onToggle={toggleTask}
                                onDelete={deleteTask}
                                onEdit={editTask}
                                onMove={moveTask}
                                onSnooze={snoozeTask}
                                selectedDate={dayKey}
                            />
                        </div>

                        <div ref={afternoonRef}>
                            <TaskSection
                                title="Afternoon"
                                tasks={getFilteredTasks("afternoon")}
                                onToggle={toggleTask}
                                onDelete={deleteTask}
                                onEdit={editTask}
                                onMove={moveTask}
                                onSnooze={snoozeTask}
                                selectedDate={dayKey}
                            />
                        </div>

                        <div ref={eveningRef}>
                            <TaskSection
                                title="Evening"
                                tasks={getFilteredTasks("evening")}
                                onToggle={toggleTask}
                                onDelete={deleteTask}
                                onEdit={editTask}
                                onMove={moveTask}
                                onSnooze={snoozeTask}
                                selectedDate={dayKey}
                            />
                        </div>
                    </>
                ) : (
                    <DayCalendar
                        tasks={tasks}
                        onToggle={toggleTask}
                        onEdit={editTask}
                        onDelete={deleteTask}
                    />
                )}
            </main>

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

            <DailyNotes currentDate={currentDate} />
        </div>
    );
}
