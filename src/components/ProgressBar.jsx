import { useEffect, useState } from "react";
import "./ProgressBar.css";

const QUOTES = {
    low: [
        "It’s okay to start small ",
        "No rush, just begin",
        "One step is enough today"
    ],
    mid: [
        "Nice momentum ",
        "You’re doing well, keep going",
        "Progress looks good today"
    ],
    high: [
        "Amazing work today ",
        "You crushed your tasks ",
        "That’s a productive day!"
    ]
};

const random = (arr) =>
    arr[Math.floor(Math.random() * arr.length)];

export default function ProgressBar({ total, completed }) {
    const percentage =
        total === 0 ? 0 : Math.round((completed / total) * 100);

    const [quote, setQuote] = useState("");

    useEffect(() => {
        if (percentage < 30) setQuote(random(QUOTES.low));
        else if (percentage < 70) setQuote(random(QUOTES.mid));
        else setQuote(random(QUOTES.high));
    }, [percentage]);

    return (
        <div style={{ marginBottom: 20 }}>
            <p className="progress-title">
                {completed} of {total} tasks completed
            </p>

            {/* 🔥 SMART MOTIVATIONAL QUOTE */}
            <p className="progress-quote">{quote}</p>

            <div style={{ display: "flex", justifyContent: "space-between" }}>
                <span>Progress</span>
                <p>{percentage}%</p>
            </div>

            <div
                style={{
                    height: 8,
                    background: "#e5e7eb",
                    borderRadius: 10,
                    overflow: "hidden",
                    marginTop: 6
                }}
            >
                <div
                    style={{
                        width: `${percentage}%`,
                        height: "100%",
                        background: "#22c55e",
                        transition: "width 0.3s ease"
                    }}
                />
            </div>
        </div>
    );
}
