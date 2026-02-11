// import React from "react";
// import { useEffect, useState } from "react";
// import "./DailyNotes.css";

// const getDateKey = (date) =>
//     date.toISOString().slice(0, 10);

// export default function DailyNotes({ currentDate }) {
//     const dayKey = getDateKey(currentDate);
//     const [note, setNote] = useState("");

//     /* 🔹 LOAD ON DATE CHANGE */
//     useEffect(() => {
//         const raw = localStorage.getItem("daily-notes");
//         const allNotes = raw ? JSON.parse(raw) : {};
//         setNote(allNotes[dayKey] || "");
//     }, [dayKey]);

//     /* 🔹 SAVE ONLY WHEN USER LEAVES TEXTAREA */
//     const saveNote = () => {
//         const raw = localStorage.getItem("daily-notes");
//         const allNotes = raw ? JSON.parse(raw) : {};

//         allNotes[dayKey] = note;

//         localStorage.setItem(
//             "daily-notes",
//             JSON.stringify(allNotes)
//         );
//     };

//     return (
//         <aside className="daily-journal">
//             <h3>📝 Daily Notes</h3>

//             <textarea
//                 value={note}
//                 placeholder="Write freely about your day..."
//                 onChange={(e) => setNote(e.target.value)}
//                 onBlur={saveNote}   // 🔥 THIS IS THE FIX
//             />
//         </aside>
//     );
// }
import React from "react";
import { useEffect, useState, useImperativeHandle, forwardRef } from "react";
import "./DailyNotes.css";

const getDateKey = (date) =>
    date.toISOString().slice(0, 10);

const DailyNotes = forwardRef(({ currentDate }, ref) => {
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

    // ═══════════════════════════════════════════════════════════
    // VOICE UPDATE METHOD - Called by Advanced Buddy
    // ═══════════════════════════════════════════════════════════
    const updateFromVoice = (content, mode = 'append') => {
        const raw = localStorage.getItem("daily-notes");
        const allNotes = raw ? JSON.parse(raw) : {};

        if (mode === 'append') {
            const existingNote = allNotes[dayKey] || "";
            const timestamp = new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
            const newNote = existingNote 
                ? `${existingNote}\n\n[${timestamp}] ${content}` 
                : `[${timestamp}] ${content}`;
            allNotes[dayKey] = newNote;
            setNote(newNote);
        } else {
            allNotes[dayKey] = content;
            setNote(content);
        }

        localStorage.setItem("daily-notes", JSON.stringify(allNotes));
    };

    // Expose method to parent via ref
    useImperativeHandle(ref, () => ({
        updateFromVoice
    }));

    return (
        <aside className="daily-journal">
            <h3>📝 Daily Notes</h3>
            <p className="daily-notes-hint">
                ✍️ Type here or 🎤 use voice mode in AI Buddy
            </p>

            <textarea
                value={note}
                placeholder="Write freely about your day... or dictate using your AI Buddy! 🎤"
                onChange={(e) => setNote(e.target.value)}
                onBlur={saveNote}
            />
        </aside>
    );
});

DailyNotes.displayName = 'DailyNotes';

export default DailyNotes;