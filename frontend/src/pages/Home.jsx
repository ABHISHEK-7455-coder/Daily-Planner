import React, { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import "./Home.css";
import Header from "../components/Header";

export default function Home() {
    const navigate = useNavigate();
    const [userName, setUserName] = useState("");
    const [selectedMood, setSelectedMood] = useState(null);
    const [currentTime, setCurrentTime] = useState(new Date());

    useEffect(() => {
        const saved = localStorage.getItem("user-name");
        if (saved) {
            setUserName(saved);
        } else {
            const name = prompt("What's your name?");
            if (name) {
                localStorage.setItem("user-name", name);
                setUserName(name);
            } else {
                setUserName("Friend");
            }
        }

        const interval = setInterval(() => setCurrentTime(new Date()), 60000);
        return () => clearInterval(interval);
    }, []);

    const getGreeting = () => {
        const hour = currentTime.getHours();
        if (hour < 12) return "Good Morning";
        if (hour < 17) return "Good Afternoon";
        return "Good Evening";
    };

    const handleStart = () => {
        if (selectedMood) {
            const today = new Date().toISOString().split("T")[0];
            localStorage.setItem(`mood-${today}`, selectedMood);
        }
        const todayKey = new Date().toISOString().split("T")[0];
        navigate(`/day/${todayKey}`);
    };

    const moods = [
        { icon: "fa-solid fa-face-grin-stars", label: "Excited", color: "#f59e0b" },
        { icon: "fa-solid fa-face-smile", label: "Happy", color: "#10b981" },
        { icon: "fa-solid fa-face-meh", label: "Neutral", color: "#6b7280" },
        { icon: "fa-solid fa-face-grin-hearts", label: "Motivated", color: "#ec4899" },
        { icon: "fa-solid fa-bullseye", label: "Focused", color: "#8b5cf6" }
    ];

    return (
        <div className="home-container">
            <Header
                tasks={tasks}
                onFilterChange={handleFilterChange}
                activeFilter={activeFilter}
                onOpenReflection={openReflection}
                onOpenWeeklySummary={openWeeklySummary}
            />


            <main className="home-main">
                <div className="greeting-section">
                    <h1 className="greeting-title">{getGreeting()}, {userName}</h1>
                    <p className="greeting-subtitle">It's a beautiful day for small steps.</p>
                </div>

                <div className="content-grid">
                    <div className="ai-buddy-card">
                        <div className="buddy-icon">
                            <i className="fa-solid fa-robot"></i>
                        </div>
                        <h3 className="buddy-title">AI Buddy</h3>
                        <p className="buddy-text">
                            I've suggested a light task for you based on your mood. Ready to try?
                        </p>
                        <button className="buddy-button">
                            VIEW SUGGESTION <i className="fa-solid fa-arrow-right"></i>
                        </button>
                    </div>

                    <div className="time-card morning-card">
                        <div className="time-card-image">
                            <div className="gradient-bg morning-gradient">
                                <div className="landscape-hills">
                                    <div className="hill hill-1"></div>
                                    <div className="hill hill-2"></div>
                                    <div className="hill hill-3"></div>
                                </div>
                                <div className="sun-icon">
                                    <i className="fa-solid fa-sun"></i>
                                </div>
                            </div>
                        </div>
                        <div className="time-card-content">
                            <div className="time-icon morning-icon">
                                <i className="fa-solid fa-mug-hot"></i>
                            </div>
                            <div>
                                <h3 className="time-card-title">Morning</h3>
                                <p className="time-card-subtitle">Focus & Energy</p>
                            </div>
                        </div>
                    </div>

                    <div className="time-card afternoon-card">
                        <div className="time-card-image">
                            <div className="gradient-bg afternoon-gradient">
                                <div className="desk-scene">
                                    <div className="desk-icon">
                                        <i className="fa-solid fa-laptop"></i>
                                    </div>
                                    <div className="lamp-icon">
                                        <i className="fa-solid fa-lightbulb"></i>
                                    </div>
                                </div>
                            </div>
                        </div>
                        <div className="time-card-content">
                            <div className="time-icon afternoon-icon">
                                <i className="fa-solid fa-briefcase"></i>
                            </div>
                            <div>
                                <h3 className="time-card-title">Afternoon</h3>
                                <p className="time-card-subtitle">Flow State</p>
                            </div>
                        </div>
                    </div>

                    <div className="time-card night-card">
                        <div className="time-card-image">
                            <div className="gradient-bg night-gradient">
                                <div className="night-sky">
                                    <div className="moon-icon">
                                        <i className="fa-solid fa-moon"></i>
                                    </div>
                                    <div className="star star-1"><i className="fa-solid fa-star"></i></div>
                                    <div className="star star-2"><i className="fa-solid fa-star"></i></div>
                                    <div className="star star-3"><i className="fa-solid fa-star"></i></div>
                                    <div className="night-horizon"></div>
                                </div>
                            </div>
                        </div>
                        <div className="time-card-content">
                            <div className="time-icon night-icon">
                                <i className="fa-solid fa-cloud-moon"></i>
                            </div>
                            <div>
                                <h3 className="time-card-title">Night</h3>
                                <p className="time-card-subtitle">Wind Down</p>
                            </div>
                        </div>
                    </div>
                </div>

                <button className="start-button" onClick={handleStart}>
                    <i className="fa-solid fa-rocket"></i> Just Start
                </button>

                <div className="mood-section">
                    <p className="mood-question">
                        <i className="fa-solid fa-heart-pulse"></i> How are you feeling?
                    </p>
                    <div className="mood-options">
                        {moods.map((mood, index) => (
                            <button
                                key={index}
                                className={`mood-emoji ${selectedMood === mood.label ? "selected" : ""}`}
                                onClick={() => setSelectedMood(mood.label)}
                                title={mood.label}
                                style={{ "--mood-color": mood.color }}
                            >
                                <i className={mood.icon}></i>
                            </button>
                        ))}
                    </div>
                </div>
            </main>
        </div>
    );
}