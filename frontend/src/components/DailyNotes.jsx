import React from "react";
import { useEffect, useState, useImperativeHandle, forwardRef, useRef } from "react";
import "./DailyNotes.css";

const getDateKey = (date) => date.toISOString().slice(0, 10);

const DailyNotes = forwardRef(({ currentDate }, ref) => {
    const dayKey = getDateKey(currentDate);
    const [note, setNote] = useState("");

    /* 🎯 DRAGGABLE STATE */
    const [position, setPosition] = useState({ x: null, y: null });
    const [isDragging, setIsDragging] = useState(false);
    const [dragOffset, setDragOffset] = useState({ x: 0, y: 0 });
    const noteRef = useRef(null);
    const textareaRef = useRef(null);

    /* 🔹 LOAD NOTE ON DATE CHANGE */
    useEffect(() => {
        const raw = localStorage.getItem("daily-notes");
        const allNotes = raw ? JSON.parse(raw) : {};
        setNote(allNotes[dayKey] || "");
    }, [dayKey]);

    /* 🔹 LOAD POSITION FROM LOCALSTORAGE */
    useEffect(() => {
        const savedPos = localStorage.getItem("daily-notes-position");
        if (savedPos) {
            try {
                const pos = JSON.parse(savedPos);
                setPosition(pos);
            } catch (e) {
                console.error("Failed to parse position:", e);
            }
        }
    }, []);

    /* 🔹 SAVE NOTE ONLY WHEN USER LEAVES TEXTAREA */
    const saveNote = () => {
        const raw = localStorage.getItem("daily-notes");
        const allNotes = raw ? JSON.parse(raw) : {};
        allNotes[dayKey] = note;
        localStorage.setItem("daily-notes", JSON.stringify(allNotes));
    };

    // ═══════════════════════════════════════════════════════════
    // VOICE UPDATE METHOD - Called by Advanced Buddy
    // ═══════════════════════════════════════════════════════════
    const updateFromVoice = (content, mode = 'append') => {
        console.log("🎤 DailyNotes: updateFromVoice called");
        console.log("🎤 Content:", content);

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
            
            // 🎯 AUTO-SCROLL TO BOTTOM
            setTimeout(() => {
                if (textareaRef.current) {
                    textareaRef.current.scrollTop = textareaRef.current.scrollHeight;
                    console.log("✅ Scrolled to bottom");
                }
            }, 100);
        } else {
            allNotes[dayKey] = content;
            setNote(content);
        }

        localStorage.setItem("daily-notes", JSON.stringify(allNotes));
        console.log("✅ Note updated and saved");
    };

    /* 🎯 DRAG HANDLERS */
    const handleMouseDown = (e) => {
        if (e.target.tagName === 'TEXTAREA') {
            return;
        }
        setIsDragging(true);
        const rect = noteRef.current.getBoundingClientRect();
        setDragOffset({
            x: e.clientX - rect.left,
            y: e.clientY - rect.top
        });
        e.preventDefault();
    };

    const handleMouseMove = (e) => {
        if (!isDragging || !noteRef.current) return;
        const newX = e.clientX - dragOffset.x;
        const newY = e.clientY - dragOffset.y;
        const maxX = window.innerWidth - noteRef.current.offsetWidth;
        const maxY = window.innerHeight - noteRef.current.offsetHeight;
        const boundedX = Math.max(0, Math.min(newX, maxX));
        const boundedY = Math.max(0, Math.min(newY, maxY));
        setPosition({ x: boundedX, y: boundedY });
    };

    const handleMouseUp = () => {
        if (isDragging) {
            setIsDragging(false);
            if (position.x !== null && position.y !== null) {
                localStorage.setItem("daily-notes-position", JSON.stringify(position));
            }
        }
    };

    useEffect(() => {
        if (isDragging) {
            document.addEventListener('mousemove', handleMouseMove);
            document.addEventListener('mouseup', handleMouseUp);
            return () => {
                document.removeEventListener('mousemove', handleMouseMove);
                document.removeEventListener('mouseup', handleMouseUp);
            };
        }
    }, [isDragging, dragOffset, position]);

    const positionStyle = position.x !== null && position.y !== null
        ? {
            position: 'fixed',
            left: `${position.x}px`,
            top: `${position.y}px`,
            right: 'auto',
            bottom: 'auto'
        }
        : {};

    // Expose method to parent via ref
    useImperativeHandle(ref, () => ({
        updateFromVoice
    }));

    return (
        <aside
            ref={noteRef}
            className={`daily-journal ${isDragging ? 'dragging' : ''}`}
            style={positionStyle}
            onMouseDown={handleMouseDown}
        >
            <h3>📝 Daily Notes <span className="drag-hint">✋</span></h3>

            <textarea
                ref={textareaRef}
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