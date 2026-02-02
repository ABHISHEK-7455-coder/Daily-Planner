// src/utils/aiGuide.js

export async function getTaskGuide(taskTitle) {
    const response = await fetch("https://api.openai.com/v1/chat/completions", {
        method: "POST",
        headers: {
            "Content-Type": "application/json",
            Authorization: `Bearer ${import.meta.env.VITE_OPENAI_API_KEY}`
        },
        body: JSON.stringify({
            model: "gpt-4o-mini",
            messages: [
                {
                    role: "system",
                    content:
                        "You are a calm productivity coach. Give short, clear, step-by-step guidance."
                },
                {
                    role: "user",
                    content: `How should I do this task step by step: "${taskTitle}"?`
                }
            ]
        })
    });

    const data = await response.json();
    return data.choices?.[0]?.message?.content || "No suggestion available.";
}
