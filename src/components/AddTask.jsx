import { useState } from "react";
import "./AddTask.css"

export default function AddTask({ onAdd }) {
  const [title, setTitle] = useState("");
  const [time, setTime] = useState("morning");

  const handleAdd = () => {
    if (!title.trim()) return;
    onAdd(title, time);
    setTitle("");
  };

  return (
    <div className="addTask-container" style={{ marginBottom: 20 }}>
      <input
        placeholder="New task..."
        value={title}
        onChange={e => setTitle(e.target.value)}
      />

      <select value={time} onChange={e => setTime(e.target.value)}>
        <option value="morning">Morning</option>
        <option value="afternoon">Afternoon</option>
        <option value="evening">Evening</option>
      </select>

      <button onClick={handleAdd}>Add</button>
    </div>
  );
}
