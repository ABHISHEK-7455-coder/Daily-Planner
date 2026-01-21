import TaskItem from "./TaskItem";
import "./TaskSection.css";

export default function TaskSection({
    title,
    tasks,
    onToggle,
    onDelete,
    onEdit,
    onMove,
    onSnooze
}) {
    if (tasks.length === 0) return null;

    const getIcon = (title) => {
        if (title === "Morning") return "☀️";
        if (title === "Afternoon") return "☀️";
        if (title === "Evening") return "🌙";
        return "📝";
    };

    return (
        <div className="task-section">
            <h3 className="task-section-title">
                <span className="task-section-icon">{getIcon(title)}</span>
                <span>{title}</span>
            </h3>

            <div className="task-section-list">
                {tasks.map(task => (
                    <TaskItem
                        key={task.id}
                        task={task}
                        onToggle={onToggle}
                        onDelete={onDelete}
                        onEdit={onEdit}
                        onMove={onMove}
                        onSnooze={onSnooze}
                    />
                ))}
            </div>
        </div>
    );
}