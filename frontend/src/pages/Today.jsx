import { useState, useEffect, useRef } from "react";
import Sidebar from "../components/Sidebar";
import AddTask from "../components/AddTask";
import TaskSection from "../components/TaskSection";
import ProgressBar from "../components/ProgressBar";
import ReflectionModal from "../components/ReflectionModal";
import PendingCarryOverModal from "../components/PendingCarryOverModal";
import WeeklySummaryModal from "../components/WeeklySummaryModal";
import DailyNotes from "../components/DailyNotes";
import PushNotifications from "../components/PushNotifications";

import "./Today.css";


/* 📹 DATE HELPERS */
const formatKey = (date) => date.toISOString().slice(0, 10);
const addDays = (date, days) => {
    const d = new Date(date);
    d.setDate(d.getDate() + days);
    return d;
};

/* 📹 DAILY POPUP FLAG */
const carryPopupKey = (date) =>
    `carry-popup-shown-${formatKey(date)}`;

export default function Today() {
    const [currentDate, setCurrentDate] = useState(new Date());
    const dayKey = formatKey(currentDate);

    const [tasks, setTasks] = useState([]);
    const [reflection, setReflection] = useState(null);
    const [showReflection, setShowReflection] = useState(false);

    const [showCarryModal, setShowCarryModal] = useState(false);
    const [yesterdayTasks, setYesterdayTasks] = useState([]);

    const [showWeekly, setShowWeekly] = useState(false);

    /* 🔥 IMPORTANT: LOAD GUARD */
    const [isLoaded, setIsLoaded] = useState(false);

    const morningRef = useRef(null);
    const afternoonRef = useRef(null);
    const eveningRef = useRef(null);

    /* 📹 LOAD DAY DATA (SAFE) */
    useEffect(() => {
        setIsLoaded(false);

        const allDays = JSON.parse(localStorage.getItem("days-data")) || {};
        const dayData = allDays[dayKey];

        setTasks(dayData?.tasks || []);
        setReflection(dayData?.reflection || null);

        setIsLoaded(true); // ✅ allow saving after load
    }, [dayKey]);

    /* 📹 SAVE DAY DATA (PROTECTED) */
    useEffect(() => {
        if (!isLoaded) return; // ⛔ prevent overwrite

        const allDays = JSON.parse(localStorage.getItem("days-data")) || {};

        allDays[dayKey] = {
            date: dayKey,
            tasks,
            reflection
        };

        localStorage.setItem("days-data", JSON.stringify(allDays));
    }, [tasks, reflection, dayKey, isLoaded]);

    /* ✅ CARRY-OVER CHECK (ONCE PER DAY ONLY) */
    useEffect(() => {
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
    }, []);

    /* 📹 TASK ACTIONS */
    const addTask = (title, timeOfDay) => {
        setTasks(prev => [
            { id: Date.now(), title, completed: false, timeOfDay },
            ...prev
        ]);
    };

    const toggleTask = (id) => {
        setTasks(prev =>
            prev.map(t =>
                t.id === id ? { ...t, completed: !t.completed } : t
            )
        );
    };

    const deleteTask = (id) => {
        setTasks(prev => prev.filter(t => t.id !== id));
    };

    const editTask = (id, text) => {
        setTasks(prev =>
            prev.map(t =>
                t.id === id ? { ...t, title: text } : t
            )
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

    /* 📹 SIDEBAR SCROLL */
    const scrollToSection = (time) => {
        const map = { morning: morningRef, afternoon: afternoonRef, evening: eveningRef };
        map[time]?.current?.scrollIntoView({ behavior: "smooth" });
    };

    /* 📹 REFLECTION */
    const saveReflection = (data) => {
        setReflection(data);
        setShowReflection(false);
    };

    /* 📋 CARRY-OVER ACCEPT */
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
            {/* 🔔 Push Notifications - minimal banner that shows once */}
            <PushNotifications />

            <Sidebar
                tasks={tasks}
                onScroll={scrollToSection}
                onOpenReflection={() => setShowReflection(true)}
                onOpenWeeklySummary={() => setShowWeekly(true)}
            />

            <main className="today-main">
                <div className="today-header">
                    <h2>Today's Tasks</h2>
                    <div className="today-date-navigation">
                        <button onClick={() => setCurrentDate(d => addDays(d, -1))}>⬅</button>
                        <span>{currentDate.toDateString()}</span>
                        <button onClick={() => setCurrentDate(d => addDays(d, 1))}>➡</button>
                    </div>
                </div>

                <ProgressBar
                    total={tasks.length}
                    completed={tasks.filter(t => t.completed).length}
                />

                <AddTask onAdd={addTask} />

                <div ref={morningRef}>
                    <TaskSection
                        title="Morning"
                        tasks={tasks.filter(t => t.timeOfDay === "morning")}
                        onToggle={toggleTask}
                        onDelete={deleteTask}
                        onEdit={editTask}
                        onReorder={reorderTasks}
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
                    />
                </div>
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