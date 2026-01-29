import React, {useState, useEffect} from "react";
import "./Sidebar.css";

const getTimeOfDay = () => {
  const hour = new Date().getHours();
  if (hour < 12) return "morning";
  if (hour < 17) return "afternoon";
  return "evening";
};

export default function Sidebar({
  tasks = [],
<<<<<<< HEAD:frontend/src/components/Sidebar.jsx
  onScroll,
  onOpenReflection,
  onOpenWeeklySummary
}) {
=======
  onFilterChange,
  activeFilter,
  onOpenReflection,
  onOpenWeeklySummary
}) {
const [showModal, setShowModal] = useState(false);
  const [dailyTasks, setDailyTasks] = useState([]);
  const [hobbies, setHobbies] = useState([]);
  const [taskInput, setTaskInput] = useState("");
  const [hobbyInput, setHobbyInput] = useState("");
  const [time, setTime] = useState("morning");

  const todayKey = new Date().toISOString().split("T")[0];
  const activeTime = getTimeOfDay();


>>>>>>> 5ee1b07379d13b954cb13addaaf749b7b94d1171:src/components/Sidebar.jsx
  const completed = tasks.filter(t => t.completed).length;
  const pending = tasks.filter(t => !t.completed).length;
  const total = tasks.length;

    /* 🔁 AUTO OPEN ONCE PER DAY */
  useEffect(() => {
    const lastOpened = localStorage.getItem("daily-modal-opened");
    if (lastOpened !== todayKey) {
      setShowModal(true);
      localStorage.setItem("daily-modal-opened", todayKey);
    }
  }, [todayKey]);

  /* 🔹 LOAD */
  useEffect(() => {
    setDailyTasks(JSON.parse(localStorage.getItem("daily-tasks")) || []);
    setHobbies(JSON.parse(localStorage.getItem("daily-hobbies")) || []);
  }, []);

  /* 💾 SAVE */
  const save = (tasks, hobbies) => {
    localStorage.setItem("daily-tasks", JSON.stringify(tasks));
    localStorage.setItem("daily-hobbies", JSON.stringify(hobbies));
  };

  const addItem = (type) => {
    if (!(type === "task" ? taskInput : hobbyInput).trim()) return;

    const newItem = {
      id: Date.now(),
      text: type === "task" ? taskInput : hobbyInput,
      done: false,
      time
    };

    if (type === "task") {
      const updated = [...dailyTasks, newItem];
      setDailyTasks(updated);
      save(updated, hobbies);
      setTaskInput("");
    } else {
      const updated = [...hobbies, newItem];
      setHobbies(updated);
      save(dailyTasks, updated);
      setHobbyInput("");
    }
  };

  const toggleDone = (type, id) => {
    const update = (list) =>
      list.map(i => i.id === id ? { ...i, done: !i.done } : i);

    if (type === "task") {
      const updated = update(dailyTasks);
      setDailyTasks(updated);
      save(updated, hobbies);
    } else {
      const updated = update(hobbies);
      setHobbies(updated);
      save(dailyTasks, updated);
    }
  };

  const renderList = (items, type) =>
    items.map(item => (
      <div
        key={item.id}
        className={`daily-item ${item.done ? "done" : ""} ${
          item.time === activeTime ? "active-time" : ""
        }`}
      >
        <input
          type="checkbox"
          checked={item.done}
          onChange={() => toggleDone(type, item.id)}
        />
        <span>{item.text}</span>
        <small>{item.time}</small>
      </div>
    ));

  return (
    <>
    <aside className="sidebar-container">
      <div className="sidebar-content">
        <div className="sidebar-header">
          <div className="sidebar-logo">
            <div className="sidebar-logo-icon">📅</div>
            <div className="sidebar-logo-text">
              <div className="sidebar-logo-title">Daily Planner</div>
              <div className="sidebar-logo-subtitle">Minimalist Edition</div>
            </div>
          </div>
        </div>

        <nav className="sidebar-nav">
          <button
            className={`sidebar-nav-item ${activeFilter === "all" ? "sidebar-nav-item-active" : ""}`}
            onClick={() => onFilterChange("all")}
          >
            <span className="sidebar-nav-icon">📋</span>
            <span className="sidebar-nav-label">All Tasks</span>
            <span className="sidebar-nav-badge">{total}</span>
          </button>

          <button
            className={`sidebar-nav-item ${activeFilter === "pending" ? "sidebar-nav-item-active" : ""}`}
            onClick={() => onFilterChange("pending")}
          >
            <span className="sidebar-nav-icon">⏳</span>
            <span className="sidebar-nav-label">Pending</span>
            <span className="sidebar-nav-badge">{pending}</span>
          </button>
<<<<<<< HEAD:frontend/src/components/Sidebar.jsx
          <button className="sidebar-nav-item" onClick={() => onScroll("evening")}>
            <span className="sidebar-nav-icon">✔</span>
=======

          <button
            className={`sidebar-nav-item ${activeFilter === "completed" ? "sidebar-nav-item-active" : ""}`}
            onClick={() => onFilterChange("completed")}
          >
            <span className="sidebar-nav-icon">✓</span>
>>>>>>> 5ee1b07379d13b954cb13addaaf749b7b94d1171:src/components/Sidebar.jsx
            <span className="sidebar-nav-label">Completed</span>
            <span className="sidebar-nav-badge">{completed}</span>
          </button>

          <button
            className="sidebar-nav-item"
            onClick={() => setShowModal(true)}
          >
            <span className="sidebar-nav-icon">🔁</span>
            <span className="sidebar-nav-label">Daily Tasks & Hobbies</span>
          </button>

          <button className="sidebar-nav-item" onClick={onOpenReflection}>
            <span className="sidebar-nav-icon">📊</span>
            <span className="sidebar-nav-label">Overview</span>
          </button>

          <button className="sidebar-nav-item" onClick={onOpenWeeklySummary}>
            <span className="sidebar-nav-icon">📈</span>
            <span className="sidebar-nav-label">Weekly Summary</span>
          </button>
        </nav>
      </div>
    </aside>

    {/* ================= MODAL ================= */ }
      {showModal && (
        <div className="modal-overlay">
          <div className="modal-container">
            <header className="modal-header">
              <h3>🌅 Daily Reminder</h3>
              <button onClick={() => setShowModal(false)}>✕</button>
            </header>

            {/* ⏰ TIME SELECT */}
            <div className="time-selector">
              {["Morning", "Afternoon", "Evening"].map(t => (
                <button
                  key={t}
                  className={time === t ? "active" : ""}
                  onClick={() => setTime(t)}
                >
                  {t}
                </button>
              ))}
            </div>

            {/* 📋 TASKS */}
            <section>
              <h4>Daily Tasks</h4>
              <div className="input-row">
                <input
                  value={taskInput}
                  onChange={e => setTaskInput(e.target.value)}
                  placeholder="Add task"
                />
                <button onClick={() => addItem("task")}>Add</button>
              </div>
              {renderList(dailyTasks, "task")}
            </section>

            {/* 🧠 HOBBIES */}
            <section>
              <h4>Hobbies</h4>
              <div className="input-row">
                <input
                  value={hobbyInput}
                  onChange={e => setHobbyInput(e.target.value)}
                  placeholder="Add hobby"
                />
                <button onClick={() => addItem("hobby")}>Add</button>
              </div>
              {renderList(hobbies, "hobby")}
            </section>
          </div>
        </div>
      )}
    </>
  );
}
