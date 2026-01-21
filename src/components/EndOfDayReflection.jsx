import { useState } from "react";

export default function EndOfDayReflection({
    total,
    completed,
    onClose,
    onMoveUnfinished
}) {
    const [mood, setMood] = useState("");
    const [wentWell, setWentWell] = useState("");
    const [feltHard, setFeltHard] = useState("");

    const closingMessage = () => {
        if (mood === "good") return "You did great today 🌟 Rest well.";
        if (mood === "okay") return "You showed up today. That matters 💚";
        if (mood === "tired") return "Rest is productive too 🌙";
        return "Thanks for taking a moment to reflect 🙏";
    };

    const handleFinish = () => {
        const reflection = {
            date: new Date().toDateString(),
            mood,
            wentWell,
            feltHard,
            completed,
            total
        };

        const stored =
            JSON.parse(localStorage.getItem("daily-reflections")) || [];

        localStorage.setItem(
            "daily-reflections",
            JSON.stringify([...stored, reflection])
        );

        onClose();
    };

    return (
        <div style={overlay}>
            <div style={modal}>
                <h2>End of Day Reflection</h2>

                <p style={{ marginBottom: 12 }}>
                    You completed <b>{completed}</b> of <b>{total}</b> tasks today 👏
                </p>

                {/* Mood */}
                <div>
                    <p>How do you feel?</p>
                    <div style={{ display: "flex", gap: 8 }}>
                        <button onClick={() => setMood("good")}>😄 Good</button>
                        <button onClick={() => setMood("okay")}>😐 Okay</button>
                        <button onClick={() => setMood("tired")}>😴 Tired</button>
                    </div>
                </div>

                {/* Reflection inputs */}
                <div style={{ marginTop: 12 }}>
                    <input
                        placeholder="What went well today? (optional)"
                        value={wentWell}
                        onChange={(e) => setWentWell(e.target.value)}
                        style={input}
                    />
                    <input
                        placeholder="What felt difficult? (optional)"
                        value={feltHard}
                        onChange={(e) => setFeltHard(e.target.value)}
                        style={input}
                    />
                </div>

                <p style={{ marginTop: 12, fontStyle: "italic" }}>
                    {closingMessage()}
                </p>

                {/* Actions */}
                <div style={{ marginTop: 16, display: "flex", gap: 8 }}>
                    <button onClick={onMoveUnfinished}>
                        Move unfinished to tomorrow
                    </button>
                    <button onClick={handleFinish}>Close day</button>
                </div>
            </div>
        </div>
    );
}

/* 🔹 Simple styles */
const overlay = {
    position: "fixed",
    inset: 0,
    background: "rgba(0,0,0,0.4)",
    display: "flex",
    justifyContent: "center",
    alignItems: "center",
    zIndex: 1000
};

const modal = {
    background: "#fff",
    padding: 20,
    borderRadius: 8,
    width: 400
};

const input = {
    width: "100%",
    padding: 8,
    marginTop: 6
};
