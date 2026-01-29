import React from "react";
import { useEffect, useState } from "react";
import "./DailyNotes.css";

const getDateKey = (date) =>
    date.toISOString().slice(0, 10);

export default function DailyNotes({ currentDate }) {
    const dayKey = getDateKey(currentDate);
    const [note, setNote] = useState("");

    /* 🔹 LOAD ON DATE CHANGE */
    useEffect(() => {
        const raw = localStorage.getItem("daily-notes");
        const allNotes = raw ? JSON.parse(raw) : {};
        setNote(allNotes[dayKey] || "");
    }, [dayKey]);

    /* 🔹 SAVE ONLY WHEN USER LEAVES TEXTAREA */
    const saveNote = () => {
        const raw = localStorage.getItem("daily-notes");
        const allNotes = raw ? JSON.parse(raw) : {};

        allNotes[dayKey] = note;

        localStorage.setItem(
            "daily-notes",
            JSON.stringify(allNotes)
        );
    };

    return (
        <aside className="daily-journal">
            <h3>📝 Daily Notes</h3>

            <textarea
                value={note}
                placeholder="Write freely about your day..."
                onChange={(e) => setNote(e.target.value)}
                onBlur={saveNote}   // 🔥 THIS IS THE FIX
            />
        </aside>
    );
}
