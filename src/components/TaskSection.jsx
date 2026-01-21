import TaskItem from "./TaskItem";

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

    return (
        <div style={{ marginBottom: 30 }}>
            <h2>{title}</h2>

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
    );
}
