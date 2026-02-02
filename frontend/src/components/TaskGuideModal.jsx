import React, { useEffect, useState } from "react";
import { getTaskGuide } from "../utils/aiGuide";
import "./TaskGuideModal.css";

export default function TaskGuideModal({ task, onClose }) {
    const [loading, setLoading] = useState(true);
    const [guide, setGuide] = useState("");

    useEffect(() => {
        let mounted = true;

        getTaskGuide(task.title).then(text => {
            if (mounted) {
                setGuide(text);
                setLoading(false);
            }
        });

        return () => (mounted = false);
    }, [task]);

    return (
        <div className="task-guide-overlay">
            <div className="task-guide-modal">
                <h2>💡 How to do this</h2>

                <h4>{task.title}</h4>

                {loading ? (
                    <p className="loading">Thinking…</p>
                ) : (
                    <pre className="guide-text">{guide}</pre>
                )}

                <button onClick={onClose}>Close</button>
            </div>
        </div>
    );
}
