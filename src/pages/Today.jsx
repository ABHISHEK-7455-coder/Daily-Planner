import { useState, useEffect, useRef } from "react";
import Sidebar from "../components/Sidebar";
import AddTask from "../components/AddTask";
import TaskSection from "../components/TaskSection";
import ProgressBar from "../components/ProgressBar";
import ReflectionModal from "../components/ReflectionModal";
import "./Today.css";

/* 🔹 DATE HELPERS */
const formatKey = (date) => date.toISOString().slice(0, 10);
const addDays = (date, days) => {
    const d = new Date(date);
    d.setDate(d.getDate() + days);
    return d;
};

export default function Today() {
    const [currentDate, setCurrentDate] = useState(new Date());
    const dayKey = formatKey(currentDate);

    const [tasks, setTasks] = useState([]);
    const [reflection, setReflection] = useState(null);
    const [showReflection, setShowReflection] = useState(false);

    /* 🔥 IMPORTANT FLAG */
    const [isHydrated, setIsHydrated] = useState(false);

    const morningRef = useRef(null);
    const afternoonRef = useRef(null);
    const eveningRef = useRef(null);

    /* 🔹 LOAD DAY DATA (ON DATE CHANGE) */
    useEffect(() => {
        const allDays = JSON.parse(localStorage.getItem("days-data")) || {};
        const dayData = allDays[dayKey];

        setTasks(dayData?.tasks || []);
        setReflection(dayData?.reflection || null);

        setIsHydrated(true); // ✅ allow saving AFTER load
    }, [dayKey]);

    /* 🔹 SAVE DAY DATA (SAFE) */
    useEffect(() => {
        if (!isHydrated) return; // ❗ prevent overwrite

        const allDays = JSON.parse(localStorage.getItem("days-data")) || {};

        allDays[dayKey] = {
            date: dayKey,
            tasks,
            reflection
        };

        localStorage.setItem("days-data", JSON.stringify(allDays));
    }, [tasks, reflection, dayKey, isHydrated]);

    /* 🔹 TASK ACTIONS */
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
            if (!drag || !drop) return prev;
            if (drag.timeOfDay !== drop.timeOfDay) return prev;

            const section = prev.filter(
                t => t.timeOfDay === drag.timeOfDay && t.id !== dragId
            );
            const others = prev.filter(
                t => t.timeOfDay !== drag.timeOfDay
            );

            const idx = section.findIndex(t => t.id === dropId);
            section.splice(idx, 0, drag);

            return [...others, ...section];
        });
    };

    /* 🔹 SIDEBAR SCROLL */
    const scrollToSection = (time) => {
        const map = {
            morning: morningRef,
            afternoon: afternoonRef,
            evening: eveningRef
        };
        map[time]?.current?.scrollIntoView({ behavior: "smooth" });
    };

    /* 🔹 SAVE REFLECTION */
    const saveReflection = (data) => {
        setReflection(data);
        setShowReflection(false);
    };

    const totalTasks = tasks.length;
    const completedTasks = tasks.filter(t => t.completed).length;

    return (
        <div className="today-container">
            <Sidebar
                tasks={tasks}
                onScroll={scrollToSection}
                onOpenReflection={() => setShowReflection(true)}
            />

            <main className="today-main">
                <div className="today-header">
                    <div className="today-title-section">
                        <h2 className="today-title">Today's Tasks</h2>
                        <p className="today-date">{currentDate.toDateString()}</p>
                    </div>

                    <div className="today-date-navigation">
                        <button
                            className="today-nav-btn"
                            onClick={() => setCurrentDate(d => addDays(d, -1))}
                        >
                            ⬅
                        </button>

                        <span className="today-current-date">
                            {currentDate.toLocaleDateString("en-US", {
                                month: "short",
                                day: "numeric"
                            })}
                        </span>

                        <button
                            className="today-nav-btn"
                            onClick={() => setCurrentDate(d => addDays(d, 1))}
                        >
                            ➡
                        </button>
                    </div>
                </div>

                <ProgressBar total={totalTasks} completed={completedTasks} />
                <AddTask onAdd={addTask} />

                <div ref={morningRef} className="today-section-wrapper">
                    <TaskSection
                        title="Morning"
                        tasks={tasks.filter(t => t.timeOfDay === "morning")}
                        onToggle={toggleTask}
                        onDelete={deleteTask}
                        onEdit={editTask}
                        onReorder={reorderTasks}
                    />
                </div>

                <div ref={afternoonRef} className="today-section-wrapper">
                    <TaskSection
                        title="Afternoon"
                        tasks={tasks.filter(t => t.timeOfDay === "afternoon")}
                        onToggle={toggleTask}
                        onDelete={deleteTask}
                        onEdit={editTask}
                        onReorder={reorderTasks}
                    />
                </div>

                <div ref={eveningRef} className="today-section-wrapper">
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
        </div>
    );
}
