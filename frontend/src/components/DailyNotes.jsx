// // DailyNotes.jsx — MongoDB version
// // Replaces localStorage "daily-notes-{userId}" with MongoDB API calls

// import React, {
//   useEffect, useState, useImperativeHandle, forwardRef, useRef
// } from "react";
// import "./DailyNotes.css";
// import { loadNote, saveNote, appendNote } from "../services/Mongoapi";

// const getDateKey = (date) => date.toISOString().slice(0, 10);

// const DailyNotes = forwardRef(({ currentDate, userId = "anon" }, ref) => {
//   const dayKey      = getDateKey(currentDate);
//   const [note, setNote]   = useState("");
//   const [isOpen, setIsOpen] = useState(false);
//   const [saving, setSaving] = useState(false);

//   const [btnPos,   setBtnPos]   = useState(null);
//   const [panelPos, setPanelPos] = useState(null);
//   const textareaRef = useRef(null);
//   const saveTimer   = useRef(null);
//   const dragRef     = useRef({ dragging: false });

//   const startDrag = (e, setPosition) => {
//     e.preventDefault();
//     const rect = e.currentTarget.getBoundingClientRect();
//     dragRef.current = {
//       dragging: true,
//       offsetX: e.clientX - rect.left,
//       offsetY: e.clientY - rect.top,
//       width: rect.width,
//       height: rect.height,
//     };
//     const onMove = (ev) => {
//       if (!dragRef.current.dragging) return;
//       let newX = Math.max(0, Math.min(ev.clientX - dragRef.current.offsetX, window.innerWidth  - dragRef.current.width));
//       let newY = Math.max(0, Math.min(ev.clientY - dragRef.current.offsetY, window.innerHeight - dragRef.current.height));
//       setPosition({ x: newX, y: newY });
//     };
//     const onUp = () => { dragRef.current.dragging = false; document.removeEventListener("mousemove", onMove); document.removeEventListener("mouseup", onUp); };
//     document.addEventListener("mousemove", onMove);
//     document.addEventListener("mouseup", onUp);
//   };

//   // ── Load note from MongoDB ────────────────────────────────
//   useEffect(() => {
//     loadNote(dayKey).then(setNote);
//   }, [dayKey]);

//   // ── Listen for voice-triggered note updates ───────────────
//   useEffect(() => {
//     const handler = () => loadNote(dayKey).then(setNote);
//     window.addEventListener("notes-updated", handler);
//     return () => window.removeEventListener("notes-updated", handler);
//   }, [dayKey]);

//   // ── Debounced save on text change ─────────────────────────
//   const handleChange = (e) => {
//     const val = e.target.value;
//     setNote(val);
//     if (saveTimer.current) clearTimeout(saveTimer.current);
//     saveTimer.current = setTimeout(async () => {
//       setSaving(true);
//       await saveNote(dayKey, val);
//       setSaving(false);
//     }, 1000);
//   };

//   // ── Exposed to parent (voice / buddy) ─────────────────────
//   const updateFromVoice = async (content, mode = "append") => {
//     if (mode === "append") {
//       const time = new Date().toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" });
//       const updated = note ? `${note}\n\n[${time}] ${content}` : `[${time}] ${content}`;
//       setNote(updated);
//       await appendNote(dayKey, content);
//       setTimeout(() => {
//         if (textareaRef.current) textareaRef.current.scrollTop = textareaRef.current.scrollHeight;
//       }, 100);
//     } else {
//       setNote(content);
//       await saveNote(dayKey, content);
//     }
//   };

//   useImperativeHandle(ref, () => ({ updateFromVoice }));

//   const styleFromPos = (pos, fallback) => pos ? { position: "fixed", left: pos.x, top: pos.y } : fallback;

//   return (
//     <>
//       <button
//         className="daily-notes-fab"
//         style={styleFromPos(btnPos, { bottom: 24, right: 24 })}
//         onMouseDown={(e) => startDrag(e, setBtnPos)}
//         onClick={() => setIsOpen((p) => !p)}
//       >
//         📝
//       </button>

//       {isOpen && (
//         <aside
//           className="daily-journal"
//           style={styleFromPos(panelPos, { bottom: 90, right: 24 })}
//           onMouseDown={(e) => { if (e.target.tagName === "TEXTAREA") return; startDrag(e, setPanelPos); }}
//         >
//           <div className="notes-header">
//             <h3>Daily Notes {saving && <span style={{ fontSize: 11, color: "#aaa" }}>saving…</span>}</h3>
//             <button className="close-btn" onClick={() => setIsOpen(false)}>✕</button>
//           </div>
//           <textarea
//             ref={textareaRef}
//             value={note}
//             onChange={handleChange}
//             placeholder="Write freely... or dictate 🎤"
//           />
//         </aside>
//       )}
//     </>
//   );
// });

// DailyNotes.displayName = "DailyNotes";
// export default DailyNotes;
// src/DailyNotes.jsx — Convex version
// CHANGES vs MongoDB version:
//   - Remove: import { loadNote, saveNote, appendNote } from "./mongoApi"
//   - Add: import { useNoteQuery, useConvexNotes } from "./convexApi"
//   - Data is reactive — no manual fetch needed
//   - All note UI logic UNCHANGED

// DailyNotes.jsx — Convex version
// ONLY CHANGE: import Mongoapi → convexApi
// Replaces localStorage "daily-notes-{userId}" with MongoDB API calls

import React, {
  useEffect, useState, useImperativeHandle, forwardRef, useRef
} from "react";
import "./DailyNotes.css";
import { loadNote, saveNote, appendNote } from "../services/convexApi";

const getDateKey = (date) => date.toISOString().slice(0, 10);

const DailyNotes = forwardRef(({ currentDate, userId = "anon" }, ref) => {
  const dayKey      = getDateKey(currentDate);
  const [note, setNote]   = useState("");
  const [isOpen, setIsOpen] = useState(false);
  const [saving, setSaving] = useState(false);

  const [btnPos,   setBtnPos]   = useState(null);
  const [panelPos, setPanelPos] = useState(null);
  const textareaRef = useRef(null);
  const saveTimer   = useRef(null);
  const dragRef     = useRef({ dragging: false });

  const startDrag = (e, setPosition) => {
    e.preventDefault();
    const rect = e.currentTarget.getBoundingClientRect();
    dragRef.current = {
      dragging: true,
      offsetX: e.clientX - rect.left,
      offsetY: e.clientY - rect.top,
      width: rect.width,
      height: rect.height,
    };
    const onMove = (ev) => {
      if (!dragRef.current.dragging) return;
      let newX = Math.max(0, Math.min(ev.clientX - dragRef.current.offsetX, window.innerWidth  - dragRef.current.width));
      let newY = Math.max(0, Math.min(ev.clientY - dragRef.current.offsetY, window.innerHeight - dragRef.current.height));
      setPosition({ x: newX, y: newY });
    };
    const onUp = () => { dragRef.current.dragging = false; document.removeEventListener("mousemove", onMove); document.removeEventListener("mouseup", onUp); };
    document.addEventListener("mousemove", onMove);
    document.addEventListener("mouseup", onUp);
  };

  // ── Load note from MongoDB ────────────────────────────────
  useEffect(() => {
    loadNote(dayKey).then(setNote);
  }, [dayKey]);

  // ── Listen for voice-triggered note updates ───────────────
  useEffect(() => {
    const handler = () => loadNote(dayKey).then(setNote);
    window.addEventListener("notes-updated", handler);
    return () => window.removeEventListener("notes-updated", handler);
  }, [dayKey]);

  // ── Debounced save on text change ─────────────────────────
  const handleChange = (e) => {
    const val = e.target.value;
    setNote(val);
    if (saveTimer.current) clearTimeout(saveTimer.current);
    saveTimer.current = setTimeout(async () => {
      setSaving(true);
      await saveNote(dayKey, val);
      setSaving(false);
    }, 1000);
  };

  // ── Exposed to parent (voice / buddy) ─────────────────────
  const updateFromVoice = async (content, mode = "append") => {
    if (mode === "append") {
      const time = new Date().toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" });
      const updated = note ? `${note}\n\n[${time}] ${content}` : `[${time}] ${content}`;
      setNote(updated);
      await appendNote(dayKey, content);
      setTimeout(() => {
        if (textareaRef.current) textareaRef.current.scrollTop = textareaRef.current.scrollHeight;
      }, 100);
    } else {
      setNote(content);
      await saveNote(dayKey, content);
    }
  };

  useImperativeHandle(ref, () => ({ updateFromVoice }));

  const styleFromPos = (pos, fallback) => pos ? { position: "fixed", left: pos.x, top: pos.y } : fallback;

  return (
    <>
      <button
        className="daily-notes-fab"
        style={styleFromPos(btnPos, { bottom: 24, right: 24 })}
        onMouseDown={(e) => startDrag(e, setBtnPos)}
        onClick={() => setIsOpen((p) => !p)}
      >
        📝
      </button>

      {isOpen && (
        <aside
          className="daily-journal"
          style={styleFromPos(panelPos, { bottom: 90, right: 24 })}
          onMouseDown={(e) => { if (e.target.tagName === "TEXTAREA") return; startDrag(e, setPanelPos); }}
        >
          <div className="notes-header">
            <h3>Daily Notes {saving && <span style={{ fontSize: 11, color: "#aaa" }}>saving…</span>}</h3>
            <button className="close-btn" onClick={() => setIsOpen(false)}>✕</button>
          </div>
          <textarea
            ref={textareaRef}
            value={note}
            onChange={handleChange}
            placeholder="Write freely... or dictate 🎤"
          />
        </aside>
      )}
    </>
  );
});

DailyNotes.displayName = "DailyNotes";
export default DailyNotes;