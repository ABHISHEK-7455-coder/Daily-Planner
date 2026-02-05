import React, { useEffect, useState } from "react";
import { getTaskGuide } from "../utils/aiGuide";
import "./TaskGuideModal.css";

export default function TaskGuideModal({ task, onClose }) {
    const [loading, setLoading] = useState(true);
    const [steps, setSteps] = useState([]);

    useEffect(() => {
        let mounted = true;

        getTaskGuide(task.title).then(text => {
            if (!mounted) return;

            const parsedSteps = text
                .split(/\n+/)
                .map(line => line.trim())
                .filter(Boolean)
                .map((line, index) => {
                    const cleanLine = line.replace(/^(\d+\.|Step\s*\d+:?)\s*/i, "");

                    let title = cleanLine;
                    let description = "";

                    if (cleanLine.includes(":-")) {
                        const parts = cleanLine.split(":-");
                        title = parts[0].trim();
                        description = parts.slice(1).join(":-").trim();
                    } else if (cleanLine.includes(":")) {
                        const parts = cleanLine.split(":");
                        title = parts[0].trim();
                        description = parts.slice(1).join(":").trim();
                    } else {
                        description = cleanLine;
                    }

                    return { title, description };
                })
                .slice(0, 5); // ✅ still only 5 steps

            setSteps(parsedSteps);
            setLoading(false);
        });

        return () => (mounted = false);
    }, [task]);

    const deleteStep = (index) => {
        setSteps(prev => prev.filter((_, i) => i !== index));
    };

    return (
        <div className="task-guide-overlay">
            <div className="task-guide-modal">
                <h2>💡 How to do this</h2>
                <h2 className="task-guide-modal-title">{task.title}</h2>

                {loading ? (
                    <p className="loading">Thinking…</p>
                ) : (
                    <div className="guide-steps">
                        {steps.map((step, index) => (
                            <div key={index} className="guide-step">
                                <div className="guide-step-header">
                                    <strong>Step {index + 1} :- {step.title}</strong>
                                    <button
                                        className="delete-step-btn"
                                        onClick={() => deleteStep(index)}
                                        title="Delete step"
                                    >
                                        ❌
                                    </button>
                                </div>

                                <p className="guide-step-desc">
                                    {step.description}
                                </p>
                            </div>
                        ))}

                        {!steps.length && (
                            <p className="loading">No steps left 👍</p>
                        )}
                    </div>
                )}

                <button className="gotit-btn" onClick={onClose}>Got it</button>
            </div>
        </div>
    );
}
