import React from "react";
import { useEffect, useState } from "react";
import "./ProgressBar.css";

const QUOTES = {
    low: [
        "It's okay to start small ",
        "No rush, just begin",
        "One step is enough today"
    ],
    mid: [
        "Nice momentum ",
        "You're doing well, keep going",
        "Progress looks good today"
    ],
    high: [
        "Amazing work today ",
        "You crushed your tasks ",
        "That's a productive day!"
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
        <div className="progress-container">
            <div className="progress-header">
                <div className="progress-info">
                    {/* <h3 className="progress-title">Daily Goal</h3> */}
                    <p className="progress-subtitle">
                        {completed} of {total} tasks completed
                    </p>
                </div>
                <div className="progress-percentage">{percentage}%</div>
            </div>

            <div className="progress-bar-wrapper">
                <div className="progress-bar-track">
                    <div
                        className="progress-bar-fill"
                        style={{ width: `${percentage}%` }}
                    />
                </div>
            </div>

            {/* 🔥 SMART MOTIVATIONAL QUOTE */}
            {/* <p className="progress-quote">"{quote}"</p> */}
        </div>
    );
}