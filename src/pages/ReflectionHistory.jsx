import { loadAllDays } from "../utils/storage";
import { formatDate } from "../utils/date";
import "./ReflectionHistory.css";

export default function ReflectionHistory() {
    const allDays = loadAllDays();

    const daysWithReflections = Object.values(allDays)
        .filter(d => d.reflection)
        .sort((a, b) => new Date(b.date) - new Date(a.date));

    return (
        <div className="history-container">
            <h1>Reflection History 📖</h1>

            {daysWithReflections.length === 0 && (
                <p>No reflections yet. Start finishing your days ✨</p>
            )}

            {daysWithReflections.map(day => (
                <div key={day.date} className="history-card">
                    <h3>{formatDate(day.date)}</h3>

                    <p>
                        <strong>Mood:</strong> {day.reflection.mood}
                    </p>

                    <p>
                        <strong>Energy:</strong> {day.reflection.energy}/5
                    </p>

                    {day.reflection.note && (
                        <p className="note">
                            “{day.reflection.note}”
                        </p>
                    )}

                    <div className="task-summary">
                        ✅ {day.tasks.filter(t => t.completed).length} / {day.tasks.length} tasks completed
                    </div>
                </div>
            ))}
        </div>
    );
}
