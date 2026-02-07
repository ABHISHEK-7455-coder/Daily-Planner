import React from "react";
import { useEffect, useState, useRef } from "react";
import "./DailyNotes.css";

const getDateKey = (date) =>
    date.toISOString().slice(0, 10);

export default function DailyNotes({ currentDate }) {
    const dayKey = getDateKey(currentDate);
    const [note, setNote] = useState("");
    
    /* 🎯 DRAGGABLE STATE */
    const [position, setPosition] = useState({ x: null, y: null });
    const [isDragging, setIsDragging] = useState(false);
    const [dragOffset, setDragOffset] = useState({ x: 0, y: 0 });
    const noteRef = useRef(null);

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
            const pos = JSON.parse(savedPos);
            setPosition(pos);
        }
    }, []);

    /* 🔹 SAVE NOTE ONLY WHEN USER LEAVES TEXTAREA */
    const saveNote = () => {
        const raw = localStorage.getItem("daily-notes");
        const allNotes = raw ? JSON.parse(raw) : {};

        allNotes[dayKey] = note;

        localStorage.setItem(
            "daily-notes",
            JSON.stringify(allNotes)
        );
    };

    /* 🎯 DRAG HANDLERS */
    const handleMouseDown = (e) => {
        // Don't drag if clicking on textarea
        if (e.target.tagName === 'TEXTAREA') return;
        
        setIsDragging(true);
        
        const rect = noteRef.current.getBoundingClientRect();
        setDragOffset({
            x: e.clientX - rect.left,
            y: e.clientY - rect.top
        });
    };

    const handleMouseMove = (e) => {
        if (!isDragging) return;

        const newX = e.clientX - dragOffset.x;
        const newY = e.clientY - dragOffset.y;

        // Keep within viewport bounds
        const maxX = window.innerWidth - noteRef.current.offsetWidth;
        const maxY = window.innerHeight - noteRef.current.offsetHeight;

        const boundedX = Math.max(0, Math.min(newX, maxX));
        const boundedY = Math.max(0, Math.min(newY, maxY));

        setPosition({ x: boundedX, y: boundedY });
    };

    const handleMouseUp = () => {
        if (isDragging) {
            setIsDragging(false);
            // Save position to localStorage
            localStorage.setItem(
                "daily-notes-position",
                JSON.stringify(position)
            );
        }
    };

    /* 🔹 ATTACH GLOBAL LISTENERS */
    useEffect(() => {
        if (isDragging) {
            document.addEventListener('mousemove', handleMouseMove);
            document.addEventListener('mouseup', handleMouseUp);
            
            return () => {
                document.removeEventListener('mousemove', handleMouseMove);
                document.removeEventListener('mouseup', handleMouseUp);
            };
        }
    }, [isDragging, dragOffset]);

    /* 🎯 INLINE STYLE FOR POSITION */
    const positionStyle = position.x !== null && position.y !== null
        ? {
            position: 'fixed',
            left: `${position.x}px`,
            top: `${position.y}px`,
            right: 'auto',
            bottom: 'auto'
        }
        : {};

    return (
        <aside 
            ref={noteRef}
            className={`daily-journal ${isDragging ? 'dragging' : ''}`}
            style={positionStyle}
            onMouseDown={handleMouseDown}
        >
            <h3>📝 Daily Notes <span className="drag-hint">✋</span></h3>

            <textarea
                value={note}
                placeholder="Write freely about your day..."
                onChange={(e) => setNote(e.target.value)}
                onBlur={saveNote}
            />
        </aside>
    );
}