// import React, { useState, useEffect, useRef } from "react";
// import { useParams, useNavigate } from "react-router-dom";

// import Sidebar from "../components/Sidebar";
// import AddTask from "../components/AddTask";
// import TaskSection from "../components/TaskSection";
// import ProgressBar from "../components/ProgressBar";
// import ReflectionModal from "../components/ReflectionModal";
// import PendingCarryOverModal from "../components/PendingCarryOverModal";
// import WeeklySummaryModal from "../components/WeeklySummaryModal";
// import DailyNotes from "../components/DailyNotes";
// import PushNotifications from "../components/PushNotifications";
// import DayCalendar from "../components/DayCalendar";
// import FirstTaskReminderOverlay from "../components/FirstTaskReminderOverlay";
// // import ChatBuddy from "../components/ChatBuddy";

// import "./Today.css";
// import AdvancedBuddy from "../components/Chatbuddy";
// import AlarmPlanner from "../components/AlarmPlanner";

// /* 📅 DATE HELPERS */
// const formatKey = (date) => date.toISOString().slice(0, 10);
// const addDays = (date, days) => {
//     const d = new Date(date);
//     d.setDate(d.getDate() + days);
//     return d;
// };

// const carryPopupKey = (date) =>
//     `carry-popup-shown-${formatKey(date)}`;

// export default function Today() {
//     const { date } = useParams();
//     const navigate = useNavigate();

//     const parsedDate = date ? new Date(date) : new Date();
//     const [currentDate, setCurrentDate] = useState(parsedDate);
//     const dayKey = formatKey(currentDate);

//     const [tasks, setTasks] = useState([]);
//     const [reflection, setReflection] = useState(null);

//     const [timeView, setTimeView] = useState(
//         localStorage.getItem("time-view") || "sections"
//     );

//     const [showReflection, setShowReflection] = useState(false);
//     const [showCarryModal, setShowCarryModal] = useState(false);
//     const [yesterdayTasks, setYesterdayTasks] = useState([]);
//     const [showWeekly, setShowWeekly] = useState(false);
//     const [isLoaded, setIsLoaded] = useState(false);
//     const [viewMode, setViewMode] = useState("planner");
//     const [taskFilter, setTaskFilter] = useState("all");
//     const [reminderTask, setReminderTask] = useState(null);
//     const dailyNotesRef = useRef(null);
//     const morningRef = useRef(null);
//     const afternoonRef = useRef(null);
//     const eveningRef = useRef(null);

//     /* 🔹 FILTER LOGIC */
//     const getFilteredTasks = (timeOfDay) =>
//         tasks.filter(t => {
//             if (t.timeOfDay !== timeOfDay) return false;
//             if (taskFilter === "pending") return !t.completed;
//             if (taskFilter === "completed") return t.completed;
//             return true;
//         });

//     useEffect(() => {
//         if (!tasks.length) return;

//         const todayKey = formatKey(currentDate);
//         const shownKey = `first-task-reminder-shown-${todayKey}`;

//         if (localStorage.getItem(shownKey)) return;

//         const timedTasks = tasks
//             .filter(t => t.startTime)
//             .sort((a, b) => a.startTime.localeCompare(b.startTime));

//         if (!timedTasks.length) return;

//         const firstTask = timedTasks[0];

//         const [h, m] = firstTask.startTime.split(":");
//         const start = new Date(currentDate);
//         start.setHours(h, m, 0, 0);

//         const reminderTime = new Date(start.getTime() - 30 * 60000);
//         const now = new Date();

//         if (now >= reminderTime && now < start) {
//             setReminderTask(firstTask);
//             localStorage.setItem(shownKey, "true");
//         }
//     }, [tasks, currentDate]);

//     /* 🔄 SYNC URL */
//     useEffect(() => {
//         if (!date) return;
//         setCurrentDate(new Date(date));
//     }, [date]);

//     /* 🔹 LOAD DAY DATA */
//     useEffect(() => {
//         setIsLoaded(false);

//         const allDays = JSON.parse(localStorage.getItem("days-data")) || {};
//         const dayData = allDays[dayKey];

//         setTasks(dayData?.tasks || []);
//         setReflection(dayData?.reflection || null);

//         setIsLoaded(true);
//     }, [dayKey]);

//     /* 🔹 SAVE DAY DATA */
//     useEffect(() => {
//         if (!isLoaded) return;

//         const allDays = JSON.parse(localStorage.getItem("days-data")) || {};
//         allDays[dayKey] = { date: dayKey, tasks, reflection };

//         localStorage.setItem("days-data", JSON.stringify(allDays));
//     }, [tasks, reflection, dayKey, isLoaded]);

//     useEffect(() => {
//         localStorage.setItem("time-view", timeView);
//     }, [timeView]);

//     /* 🔹 CARRY OVER CHECK */
//     useEffect(() => {
//         const todayKey = formatKey(new Date());
//         if (dayKey !== todayKey) return;

//         if (localStorage.getItem(carryPopupKey(new Date()))) return;

//         const allDays = JSON.parse(localStorage.getItem("days-data")) || {};
//         const yesterdayKey = formatKey(addDays(new Date(), -1));
//         const yesterday = allDays[yesterdayKey];

//         if (!yesterday?.tasks) return;

//         const pending = yesterday.tasks.filter(t => !t.completed);
//         if (!pending.length) return;

//         setYesterdayTasks(pending);
//         setShowCarryModal(true);

//         localStorage.setItem(carryPopupKey(new Date()), "true");
//     }, [dayKey]);

//     /* 🔹 TASK ACTIONS */
//     const addTask = (title, timeOfDay, startTime = null, endTime = null) => {
//         setTasks(prev => [{
//             id: Date.now(),
//             title,
//             completed: false,
//             timeOfDay,
//             startTime,
//             endTime
//         }, ...prev]);
//     };

//     const toggleTask = (id) => {
//         setTasks(prev =>
//             prev.map(t => t.id === id ? { ...t, completed: !t.completed } : t)
//         );
//     };

//     const deleteTask = (id) => {
//         setTasks(prev => prev.filter(t => t.id !== id));
//     };

//     const editTask = (id, text) => {
//         setTasks(prev =>
//             prev.map(t => t.id === id ? { ...t, title: text } : t)
//         );
//     };

//     /* ✅ MOVE → bottom of selected section */
//     const moveTask = (id, newTimeOfDay) => {
//         setTasks(prev => {
//             const task = prev.find(t => t.id === id);
//             if (!task) return prev;

//             const remaining = prev.filter(t => t.id !== id);

//             return [
//                 ...remaining,
//                 { ...task, timeOfDay: newTimeOfDay }
//             ];
//         });
//     };

//     /* ✅ SNOOZE → next day, same bucket */
//     const snoozeTask = (id) => {
//         setTasks(prev => {
//             const task = prev.find(t => t.id === id);
//             if (!task) return prev;

//             const allDays = JSON.parse(localStorage.getItem("days-data")) || {};
//             const nextDayKey = formatKey(addDays(currentDate, 1));

//             const nextDay = allDays[nextDayKey] || { date: nextDayKey, tasks: [] };

//             nextDay.tasks.push({
//                 ...task,
//                 id: Date.now() + Math.random(),
//                 completed: false
//             });

//             allDays[nextDayKey] = nextDay;
//             localStorage.setItem("days-data", JSON.stringify(allDays));

//             return prev.filter(t => t.id !== id);
//         });
//     };

//     const goToDay = (days) => {
//         navigate(`/day/${formatKey(addDays(currentDate, days))}`);
//     };

//     const saveReflection = (data) => {
//         setReflection(data);
//         setShowReflection(false);
//     };

//     const acceptCarryOver = () => {
//         setTasks(prev => [
//             ...yesterdayTasks.map(t => ({
//                 ...t,
//                 id: Date.now() + Math.random(),
//                 completed: false
//             })),
//             ...prev
//         ]);
//         setShowCarryModal(false);
//     };
//     const handleUpdateNotes = async (content, mode = 'append') => {
//     if (dailyNotesRef.current) {
//       dailyNotesRef.current.updateFromVoice(content, mode);
//     }
//   };

//     return (
//         <div className="today-container">
//             <PushNotifications />

//             <Sidebar
//                 tasks={tasks}
//                 activeFilter={taskFilter}
//                 onFilterChange={setTaskFilter}
//                 onOpenReflection={() => setShowReflection(true)}
//                 onOpenWeeklySummary={() => setShowWeekly(true)}
//             />

//             <main className="today-main">
//                 <div className="today-header">
//                     <h2>Tasks</h2>

//                     <div className="today-date-navigation">
//                         <button onClick={() => goToDay(-1)}>⬅</button>
//                         <span>{currentDate.toDateString()}</span>
//                         <button onClick={() => goToDay(1)}>➡</button>
//                     </div>

//                     <div className="today-view-toggle">
//                         <button onClick={() => setViewMode("planner")}>Planner</button>
//                         <button onClick={() => setViewMode("calendar")}>Calendar</button>
//                     </div>
//                 </div>

//                 <ProgressBar
//                     total={tasks.length}
//                     completed={tasks.filter(t => t.completed).length}
//                 />

//                 <AddTask onAdd={addTask} />

//                 {viewMode === "planner" ? (
//                     <>
//                         <div ref={morningRef}>
//                             <TaskSection
//                                 title="Morning"
//                                 tasks={getFilteredTasks("morning")}
//                                 onToggle={toggleTask}
//                                 onDelete={deleteTask}
//                                 onEdit={editTask}
//                                 onMove={moveTask}
//                                 onSnooze={snoozeTask}
//                                 selectedDate={dayKey}
//                             />
//                         </div>

//                         <div ref={afternoonRef}>
//                             <TaskSection
//                                 title="Afternoon"
//                                 tasks={getFilteredTasks("afternoon")}
//                                 onToggle={toggleTask}
//                                 onDelete={deleteTask}
//                                 onEdit={editTask}
//                                 onMove={moveTask}
//                                 onSnooze={snoozeTask}
//                                 selectedDate={dayKey}
//                             />
//                         </div>

//                         <div ref={eveningRef}>
//                             <TaskSection
//                                 title="Evening"
//                                 tasks={getFilteredTasks("evening")}
//                                 onToggle={toggleTask}
//                                 onDelete={deleteTask}
//                                 onEdit={editTask}
//                                 onMove={moveTask}
//                                 onSnooze={snoozeTask}
//                                 selectedDate={dayKey}
//                             />
//                         </div>
//                     </>
//                 ) : (
//                     <DayCalendar
//                         tasks={tasks}
//                         onToggle={toggleTask}
//                         onEdit={editTask}
//                         onDelete={deleteTask}
//                     />
//                 )}
//             </main>

//             {showReflection && (
//                 <ReflectionModal
//                     existing={reflection}
//                     onSave={saveReflection}
//                     onClose={() => setShowReflection(false)}
//                 />
//             )}

//             {showCarryModal && (
//                 <PendingCarryOverModal
//                     count={yesterdayTasks.length}
//                     onAccept={acceptCarryOver}
//                     onReject={() => setShowCarryModal(false)}
//                 />
//             )}

//             {showWeekly && (
//                 <WeeklySummaryModal onClose={() => setShowWeekly(false)} />
//             )}

//             {/* <DailyNotes currentDate={currentDate} /> */}
//              <DailyNotes 
//         currentDate={currentDate} 
//         ref={dailyNotesRef}
//       />
      

//             {reminderTask && (
//                 <FirstTaskReminderOverlay
//                     task={reminderTask}
//                     onClose={() => setReminderTask(null)}
//                 />
//             )}
//      <AdvancedBuddy
//         currentDate={dayKey}
//         tasks={tasks}
//         onAddTask={addTask}
//         onCompleteTask={toggleTask}
//         onDeleteTask={deleteTask}
//         onUpdateNotes={handleUpdateNotes}
//       />
//        <AlarmPlanner />

//         </div>
//     );
// }
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
import AdvancedBuddy from "../components/Chatbuddy";
import AlarmPlanner from "../components/AlarmPlanner";

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

// Helper to convert 24h to 12h format for AlarmPlanner
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
    
    const dailyNotesRef = useRef(null);
    const alarmPlannerRef = useRef(null); // NEW: Reference to AlarmPlanner
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

    useEffect(() => {
        if (!tasks.length) return;

        const todayKey = formatKey(currentDate);
        const shownKey = `first-task-reminder-shown-${todayKey}`;

        if (localStorage.getItem(shownKey)) return;

        const timedTasks = tasks
            .filter(t => t.startTime)
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

    // ═══════════════════════════════════════════════════════════
    // ALARM INTEGRATION - Called by AI Buddy
    // ═══════════════════════════════════════════════════════════
    const handleAddAlarm = (alarmParams) => {
        console.log("📢 Today.jsx received alarm request:", alarmParams);
        
        // Convert to AlarmPlanner format
        const { hour, minute, period } = to12Hour(alarmParams.time);
        
        const alarmData = {
            hour,
            minute,
            period,
            date: alarmParams.date || "",
            label: alarmParams.label || "Alarm",
            repeat: alarmParams.repeat || "once"
        };
        
        console.log("🔄 Converted alarm data:", alarmData);
        
        // Add alarm to AlarmPlanner via ref
        if (alarmPlannerRef.current && alarmPlannerRef.current.addAlarmFromBuddy) {
            alarmPlannerRef.current.addAlarmFromBuddy(alarmData);
            console.log("✅ Alarm added to AlarmPlanner");
        } else {
            console.error("⚠️ AlarmPlanner ref not available");
        }
    };

    const handleUpdateNotes = async (content, mode = 'append') => {
        if (dailyNotesRef.current) {
            dailyNotesRef.current.updateFromVoice(content, mode);
        }
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

            <DailyNotes 
                currentDate={currentDate} 
                ref={dailyNotesRef}
            />

            {reminderTask && (
                <FirstTaskReminderOverlay
                    task={reminderTask}
                    onClose={() => setReminderTask(null)}
                />
            )}

            {/* AI Buddy with Alarm Support */}
            <AdvancedBuddy
                currentDate={dayKey}
                tasks={tasks}
                onAddTask={addTask}
                onCompleteTask={toggleTask}
                onDeleteTask={deleteTask}
                onUpdateNotes={handleUpdateNotes}
                onAddAlarm={handleAddAlarm} // NEW: Alarm callback
            />

            {/* Alarm Planner with Ref */}
            <AlarmPlanner ref={alarmPlannerRef} />
        </div>
    );
}