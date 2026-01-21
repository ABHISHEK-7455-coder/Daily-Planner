import { useState, useEffect, useRef } from "react";
import Sidebar from "../components/Sidebar";
import AddTask from "../components/AddTask";
import TaskSection from "../components/TaskSection";
import ProgressBar from "../components/ProgressBar";
import EndOfDayReflection from "../components/EndOfDayReflection";

const STORAGE_KEY = "daily-planner-tasks";

export default function Today() {
    /* 🔹 Persisted state (FIXED) */
    const [tasks, setTasks] = useState(() => {
        try {
            const stored = localStorage.getItem(STORAGE_KEY);
            return stored ? JSON.parse(stored) : [];
        } catch {
            return [];
        }
    });

    /* 🔥 Micro-celebration message */
    const [feedback, setFeedback] = useState("");
    const [showReflection, setShowReflection] = useState(false);

    const morningRef = useRef(null);
    const afternoonRef = useRef(null);
    const eveningRef = useRef(null);

    /* 🔹 Save to localStorage */
    useEffect(() => {
        localStorage.setItem(STORAGE_KEY, JSON.stringify(tasks));
    }, [tasks]);

    /* 🔹 Auto clear feedback */
    const autoClearFeedback = () => {
        setTimeout(() => setFeedback(""), 3000);
    };

    /* 🔹 Add task */
    const addTask = (title, timeOfDay) => {
        const newTask = {
            id: Date.now(),
            title,
            completed: false,
            timeOfDay
        };
        setTasks(prev => [newTask, ...prev]);
    };

    /* 🔹 Toggle task + celebration */
    const toggleTask = (id) => {
        setTasks(prev =>
            prev.map(t => {
                if (t.id === id && !t.completed) {
                    setFeedback("Nice! Task completed ✅");
                    autoClearFeedback();
                    return { ...t, completed: true };
                }
                return t.id === id ? { ...t, completed: !t.completed } : t;
            })
        );
    };

    /* 🔹 Delete */
    const deleteTask = (id) => {
        setTasks(prev => prev.filter(t => t.id !== id));
    };

    /* 🔹 Edit */
    const editTask = (id, text) => {
        setTasks(prev =>
            prev.map(t =>
                t.id === id ? { ...t, title: text } : t
            )
        );
    };

    /* 🔥 Section completion detection */
    useEffect(() => {
        const sections = ["morning", "afternoon", "evening"];

        sections.forEach(section => {
            const sectionTasks = tasks.filter(t => t.timeOfDay === section);
            if (
                sectionTasks.length > 0 &&
                sectionTasks.every(t => t.completed)
            ) {
                const labels = {
                    morning: " Morning",
                    afternoon: " Afternoon",
                    evening: " Evening"
                };
                setFeedback(` ${labels[section]} tasks done!`);
                autoClearFeedback();
            }
        });
    }, [tasks]);

    /* 🔹 Scroll from sidebar */
    const scrollToSection = (time) => {
        const map = {
            morning: morningRef,
            afternoon: afternoonRef,
            evening: eveningRef
        };
        map[time]?.current?.scrollIntoView({ behavior: "smooth" });
    };

    /* 🔹 Progress */
    const totalTasks = tasks.length;
    const completedTasks = tasks.filter(t => t.completed).length;

    /* 🔹 Move task to another section */
    const moveTask = (id, newTime) => {
        setTasks(prev =>
            prev.map(t =>
                t.id === id
                    ? { ...t, timeOfDay: newTime, completed: false }
                    : t
            )
        );

        setFeedback(`Moved to ${newTime} ⏰`);
        autoClearFeedback();
    };

    /* 🔹 Snooze task (soft reset) */
    const snoozeTask = (id) => {
        setTasks(prev =>
            prev.map(t =>
                t.id === id
                    ? { ...t, completed: false }
                    : t
            )
        );

        setFeedback("Task snoozed. You can do it later 🙂");
        autoClearFeedback();
    };

    const moveUnfinishedToTomorrow = () => {
        setTasks(prev =>
            prev.map(t =>
                t.completed
                    ? t
                    : { ...t, completed: false }
            )
        );
        setShowReflection(false);
    };

    /* 🔹 Date formatting (clean) */
    const todayDate = new Date().toLocaleDateString("en-IN", {
        weekday: "short",
        day: "numeric",
        month: "short",
        year: "numeric"
    });

    return (
        <div style={{ display: "flex", minHeight: "100vh" }}>
            <Sidebar
                tasks={tasks}
                onToggle={toggleTask}
                onDelete={deleteTask}
                onScroll={scrollToSection}
            />

            <main style={{ flex: 1, padding: 20 }}>
                <h1>Today's Tasks</h1>
                <p>{todayDate}</p>
                {/* 🔥 MICRO-CELEBRATION MESSAGE */}
                {feedback && (
                    <div style={{
                        background: "#ecfdf5",
                        color: "#065f46",
                        padding: "8px 12px",
                        borderRadius: 6,
                        marginBottom: 12
                    }}>
                        {feedback}
                    </div>
                )}

                <ProgressBar
                    total={totalTasks}
                    completed={completedTasks}
                />

                <AddTask onAdd={addTask} />

                <div ref={morningRef}>
                    <TaskSection
                        title="Morning"
                        tasks={tasks.filter(t => t.timeOfDay === "morning")}
                        onToggle={toggleTask}
                        onDelete={deleteTask}
                        onEdit={editTask}
                        onMove={moveTask}
                        onSnooze={snoozeTask}
                    />
                </div>

                <div ref={afternoonRef}>
                    <TaskSection
                        title="Afternoon"
                        tasks={tasks.filter(t => t.timeOfDay === "afternoon")}
                        onToggle={toggleTask}
                        onDelete={deleteTask}
                        onEdit={editTask}
                        onMove={moveTask}
                        onSnooze={snoozeTask}
                    />
                </div>

                <div ref={eveningRef}>
                    <TaskSection
                        title="Evening"
                        tasks={tasks.filter(t => t.timeOfDay === "evening")}
                        onToggle={toggleTask}
                        onDelete={deleteTask}
                        onEdit={editTask}
                        onMove={moveTask}
                        onSnooze={snoozeTask}
                    />
                </div>
                <button
                    style={{ marginBottom: 16 }}
                    onClick={() => setShowReflection(true)}
                >
                    Done for today
                </button>

                {showReflection && (
                    <EndOfDayReflection
                        total={totalTasks}
                        completed={completedTasks}
                        onClose={() => setShowReflection(false)}
                        onMoveUnfinished={moveUnfinishedToTomorrow}
                    />
                )}

            </main>
        </div>
    );
}
