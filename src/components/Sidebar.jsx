import { useState } from "react";
import './Sidebar.css'

export default function Sidebar({ tasks, onToggle, onDelete, onScroll }) {
  const [filter, setFilter] = useState("all");

  const headingMap = {
    all: "All Tasks",
    pending: "Pending Tasks",
    completed: "Completed Tasks"
  };

  const filtered = tasks.filter(t => {
    if (filter === "pending") return !t.completed;
    if (filter === "completed") return t.completed;
    return true;
  });

  return (
    <aside style={{ width: 260, padding: 20, borderRight: "1px solid #ccc" }}>
      <h2>Daily Planner</h2>
      <p>Minimalist Edition</p>

      <div className="filter-btns">
        <button onClick={() => setFilter("all")}>All</button>
      <button onClick={() => setFilter("pending")}>Pending</button>
      <button onClick={() => setFilter("completed")}>Completed</button>
      </div>

      <hr style={{color:"lightgray"}} />
      <h4>{headingMap[filter]}</h4>

      {filtered.map(task => (
        <div className="task-item" key={task.id}>
          <div>
            <input
            type="checkbox"
            checked={task.completed}
            onChange={() => onToggle(task.id)}
          />
          <span
            onClick={() => onScroll(task.timeOfDay)}
            style={{
              cursor: "pointer",
              textDecoration: task.completed ? "line-through" : "none"
            }}
          >
            {task.title}
          </span>
          </div>
          <button onClick={() => onDelete(task.id)}>❌</button>
        </div>
      ))}
    </aside>
  );
}
