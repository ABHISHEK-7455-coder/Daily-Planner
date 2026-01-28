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
import GentleNotifications from "../components/GentleNotifications";
import DayCalendar from "../components/DayCalendar";

import "./Today.css";

/* 🔹 DATE HELPERS */
const formatKey = (date) => date.toISOString().slice(0, 10);
const addDays = (date, days) => {
    const d = new Date(date);
    d.setDate(d.getDate() + days);
    return d;
};

/* 🔹 DAILY POPUP FLAG */
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

    /* 🔹 TIME VIEW MODE */
    const [timeView, setTimeView] = useState(
        localStorage.getItem("time-view") || "sections"
    );

    const [showReflection, setShowReflection] = useState(false);
    const [showCarryModal, setShowCarryModal] = useState(false);
    const [yesterdayTasks, setYesterdayTasks] = useState([]);
    const [showWeekly, setShowWeekly] = useState(false);
    const [isLoaded, setIsLoaded] = useState(false);
    const [viewMode, setViewMode] = useState("planner"); // planner | calendar

    const morningRef = useRef(null);
    const afternoonRef = useRef(null);
    const eveningRef = useRef(null);

    /* 🔄 SYNC URL → STATE */
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

    /* 🔹 SAVE TIME VIEW */
    useEffect(() => {
        localStorage.setItem("time-view", timeView);
    }, [timeView]);

    /* ✅ CARRY-OVER CHECK */
    useEffect(() => {
        const todayKey = formatKey(new Date());
        if (dayKey !== todayKey) return;

        const popupShown = localStorage.getItem(carryPopupKey(new Date()));
        if (popupShown) return;

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
        setTasks(prev => [
            {
                id: Date.now(),
                title,
                completed: false,
                timeOfDay,
                startTime,
                endTime
            },
            ...prev
        ]);
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

    const reorderTasks = (dragId, dropId) => {
        setTasks(prev => {
            const drag = prev.find(t => t.id === dragId);
            const drop = prev.find(t => t.id === dropId);
            if (!drag || !drop || drag.timeOfDay !== drop.timeOfDay) return prev;

            const section = prev.filter(
                t => t.timeOfDay === drag.timeOfDay && t.id !== dragId
            );
            const others = prev.filter(t => t.timeOfDay !== drag.timeOfDay);

            const idx = section.findIndex(t => t.id === dropId);
            section.splice(idx, 0, drag);

            return [...others, ...section];
        });
    };

    /* 🔹 SORT FOR 24-HOUR VIEW */
    const timelineTasks = [...tasks].sort((a, b) => {
        if (!a.startTime) return 1;
        if (!b.startTime) return -1;
        return a.startTime.localeCompare(b.startTime);
    });

    /* 🔹 DATE NAVIGATION */
    const goToDay = (days) => {
        const next = addDays(currentDate, days);
        navigate(`/day/${formatKey(next)}`);
    };

    /* 🔹 SCROLL */
    const scrollToSection = (time) => {
        const map = { morning: morningRef, afternoon: afternoonRef, evening: eveningRef };
        map[time]?.current?.scrollIntoView({ behavior: "smooth" });
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
            <GentleNotifications tasks={tasks} />

            <Sidebar
                tasks={tasks}
                onScroll={scrollToSection}
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
                                tasks={tasks.filter(t => t.timeOfDay === "morning")}
                                onToggle={toggleTask}
                                onDelete={deleteTask}
                                onEdit={editTask}
                                onReorder={reorderTasks}
                                selectedDate={dayKey}
                            />
                        </div>

                        <div ref={afternoonRef}>
                            <TaskSection
                                title="Afternoon"
                                tasks={tasks.filter(t => t.timeOfDay === "afternoon")}
                                onToggle={toggleTask}
                                onDelete={deleteTask}
                                onEdit={editTask}
                                onReorder={reorderTasks}
                                selectedDate={dayKey}
                            />
                        </div>

                        <div ref={eveningRef}>
                            <TaskSection
                                title="Evening"
                                tasks={tasks.filter(t => t.timeOfDay === "evening")}
                                onToggle={toggleTask}
                                onDelete={deleteTask}
                                onEdit={editTask}
                                onReorder={reorderTasks}
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

                {timeView === "timeline" && (
                    <TaskSection
                        title="Day Timeline"
                        tasks={timelineTasks}
                        onToggle={toggleTask}
                        onDelete={deleteTask}
                        onEdit={editTask}
                        selectedDate={dayKey}
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
