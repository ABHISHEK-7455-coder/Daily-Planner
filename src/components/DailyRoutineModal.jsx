import React, { useState, useEffect } from "react";
// import "./DailyRoutineModal.css";

export default function DailyRoutineModal({ onClose }) {
  const todayKey = new Date().toISOString().slice(0, 10);

  const [items, setItems] = useState([]);
  const [title, setTitle] = useState("");
  const [type, setType] = useState("task");
  const [time, setTime] = useState("");

  useEffect(() => {
    const stored = JSON.parse(localStorage.getItem("daily-routine")) || {};
    setItems(stored.items || []);
  }, []);

  const save = (newItems) => {
    localStorage.setItem(
      "daily-routine",
      JSON.stringify({ items: newItems, lastShownDate: todayKey })
    );
    setItems(newItems);
  };

  const addItem = () => {
    if (!title.trim()) return;
    save([
      ...items,
      { id: Date.now(), title, type, time, done: false }
    ]);
    setTitle("");
    setTime("");
  };

  return (
    <div className="modal-overlay">
      <div className="modal">
        <h3>Daily Tasks & Hobbies</h3>

        {items.map(i => (
          <div key={i.id} className="routine-item">
            <input
              type="checkbox"
              checked={i.done}
              onChange={() =>
                save(items.map(x =>
                  x.id === i.id ? { ...x, done: !x.done } : x
                ))
              }
            />
            <span>{i.title}</span>
            {i.time && <small>{i.time}</small>}
            <button onClick={() => save(items.filter(x => x.id !== i.id))}>✕</button>
          </div>
        ))}

        <div className="routine-add">
          <input
            placeholder="Add daily task / hobby"
            value={title}
            onChange={e => setTitle(e.target.value)}
          />
          <select value={type} onChange={e => setType(e.target.value)}>
            <option value="task">Task</option>
            <option value="hobby">Hobby</option>
          </select>
          <select value={time} onChange={e => setTime(e.target.value)}>
            <option value="">Any time</option>
            <option value="morning">Morning</option>
            <option value="afternoon">Afternoon</option>
          </select>
          <button onClick={addItem}>Add</button>
        </div>

        <button className="modal-close" onClick={onClose}>Close</button>
      </div>
    </div>
  );
}
