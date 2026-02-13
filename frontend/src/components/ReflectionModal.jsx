import React, { useState } from "react";
import "./ReflectionModal.css";

export default function ReflectionModal({ existing, onSave, onClose }) {
  const [mood, setMood] = useState(existing?.mood || "😊");
  const [energy, setEnergy] = useState(existing?.energy || 6);
  const [note, setNote] = useState(existing?.note || "");

  const handleSave = () => {
    onSave({
      mood,
      energy,
      note,
      createdAt: Date.now()
    });
  };

  return (
    <div className="reflection-backdrop">
      <div className="reflection-modal">
        <h2>Done for today ✨</h2>

        {/* Mood */}
        <div className="field">
          <label>How was your day?</label>
          <div className="mood-row">
            {["😞", "😐", "😊", "😄", "🔥"].map(m => (
              <button
                key={m}
                className={mood === m ? "active" : ""}
                onClick={() => setMood(m)}
              >
                {m}
              </button>
            ))}
          </div>
        </div>

        {/* Energy */}
        <div className="field">
          <label>Energy level</label>
          <input
            type="range"
            min="1"
            max="100"
            value={energy}
            onChange={(e) => setEnergy(Number(e.target.value))}
          />
          <div className="energy-labels">
            <span>Low</span>
            <span>High</span>
          </div>
        </div>

        {/* Notes */}
        <div className="field">
          <label>Reflection note</label>
          <textarea
            placeholder="What went well? What could be better?"
            value={note}
            onChange={(e) => setNote(e.target.value)}
          />
        </div>

        {/* Actions */}
        <div className="actions">
          <button className="cancel" onClick={onClose}>
            Cancel
          </button>
          <button className="save" onClick={handleSave}>
            Save Reflection
          </button>
        </div>
      </div>
    </div>
  );
}
