import React, {
    useEffect,
    useState,
    useImperativeHandle,
    forwardRef,
    useRef
} from "react";
import "./DailyNotes.css";

const getDateKey = (date) => date.toISOString().slice(0, 10);

const DailyNotes = forwardRef(({ currentDate }, ref) => {
    const dayKey = getDateKey(currentDate);

    const [note, setNote] = useState("");
    const [isOpen, setIsOpen] = useState(false);

    /* ---------- POSITIONS ---------- */
    const [btnPos, setBtnPos] = useState(null);
    const [panelPos, setPanelPos] = useState(null);

    const textareaRef = useRef(null);

    /* ---------- DRAG ENGINE (FIXED SMOOTH) ---------- */
    const dragRef = useRef({
        dragging: false,
        offsetX: 0,
        offsetY: 0,
        width: 0,
        height: 0,
    });

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

            let newX = ev.clientX - dragRef.current.offsetX;
            let newY = ev.clientY - dragRef.current.offsetY;

            /* keep inside viewport */
            const maxX = window.innerWidth - dragRef.current.width;
            const maxY = window.innerHeight - dragRef.current.height;

            newX = Math.max(0, Math.min(newX, maxX));
            newY = Math.max(0, Math.min(newY, maxY));

            setPosition({ x: newX, y: newY });
        };

        const onUp = () => {
            dragRef.current.dragging = false;
            document.removeEventListener("mousemove", onMove);
            document.removeEventListener("mouseup", onUp);
        };

        document.addEventListener("mousemove", onMove);
        document.addEventListener("mouseup", onUp);
    };

    /* ---------- LOAD NOTE ---------- */
    useEffect(() => {
        const raw = localStorage.getItem("daily-notes");
        const allNotes = raw ? JSON.parse(raw) : {};
        setNote(allNotes[dayKey] || "");
    }, [dayKey]);

    /* ---------- SAVE NOTE ---------- */
    const saveNote = () => {
        const raw = localStorage.getItem("daily-notes");
        const allNotes = raw ? JSON.parse(raw) : {};
        allNotes[dayKey] = note;
        localStorage.setItem("daily-notes", JSON.stringify(allNotes));
    };

    /* ---------- VOICE SUPPORT ---------- */
    const updateFromVoice = (content, mode = "append") => {
        const raw = localStorage.getItem("daily-notes");
        const allNotes = raw ? JSON.parse(raw) : {};

        if (mode === "append") {
            const existing = allNotes[dayKey] || "";
            const time = new Date().toLocaleTimeString([], {
                hour: "2-digit",
                minute: "2-digit"
            });

            const updated = existing
                ? `${existing}\n\n[${time}] ${content}`
                : `[${time}] ${content}`;

            allNotes[dayKey] = updated;
            setNote(updated);

            setTimeout(() => {
                if (textareaRef.current) {
                    textareaRef.current.scrollTop =
                        textareaRef.current.scrollHeight;
                }
            }, 100);
        } else {
            allNotes[dayKey] = content;
            setNote(content);
        }

        localStorage.setItem("daily-notes", JSON.stringify(allNotes));
    };

    useImperativeHandle(ref, () => ({
        updateFromVoice
    }));

    /* ---------- STYLE HELPER ---------- */
    const styleFromPos = (pos, fallback) =>
        pos
            ? { position: "fixed", left: pos.x, top: pos.y }
            : fallback;

    return (
        <>
            {/* 🔘 FLOATING BUTTON */}
            <button
                className="daily-notes-fab"
                style={styleFromPos(btnPos, { bottom: 24, right: 24 })}
                onMouseDown={(e) => startDrag(e, setBtnPos)}
                onClick={() => setIsOpen((p) => !p)}
            >
                📝
            </button>

            {/* 📒 PANEL */}
            {isOpen && (
                <aside
                    className="daily-journal"
                    style={styleFromPos(panelPos, { bottom: 90, right: 24 })}
                    onMouseDown={(e) => {
                        if (e.target.tagName === "TEXTAREA") return;
                        startDrag(e, setPanelPos);
                    }}
                >
                    <div className="notes-header">
                        <h3>Daily Notes</h3>
                        <button
                            className="close-btn"
                            onClick={() => setIsOpen(false)}
                        >
                            ✕
                        </button>
                    </div>

                    <textarea
                        ref={textareaRef}
                        value={note}
                        onChange={(e) => setNote(e.target.value)}
                        onBlur={saveNote}
                        placeholder="Write freely... or dictate 🎤"
                    />
                </aside>
            )}
        </>
    );
});

DailyNotes.displayName = "DailyNotes";
export default DailyNotes;