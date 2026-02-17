// src/utils/aiGuide.js

export async function getTaskGuide(taskTitle) {
    try {
        const response = await fetch("https://api.groq.com/openai/v1/chat/completions", {
            method: "POST",
            headers: {
                "Content-Type": "application/json",
                Authorization: `Bearer ${import.meta.env.GROQ_API_KEY}`
            },
            body: JSON.stringify({
                model: import.meta.env.GROQ_MODEL || "gpt-4o-mini",
                messages: [
                    {
                        role: "system",
                        content:
                            "You are a calm productivity coach. Give short, practical, step-by-step guidance."
                    },
                    {
                        role: "user",
                        content: `Break this task into clear steps: "${taskTitle}"`
                    }
                ],
                temperature: 0.6
            })
        });

        if (!response.ok) {
            throw new Error("AI request failed");
        }

        const data = await response.json();

        return (
            data?.choices?.[0]?.message?.content ||
            "No suggestion available."
        );
    } catch (error) {
        console.error("AI Guide Error:", error);
        return "Unable to generate guidance right now.";
    }
}
