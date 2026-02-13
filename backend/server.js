import express from "express";
import Groq from "groq-sdk";
import cors from "cors";
import dotenv from "dotenv";
import webPush from "web-push";

dotenv.config();

const app = express();
const PORT = process.env.PORT || 3001;

// ─── Web Push setup ─────────────────────────────────────────
webPush.setVapidDetails(
    'mailto:your-email@example.com',
    process.env.VAPID_PUBLIC_KEY,
    process.env.VAPID_PRIVATE_KEY
);

const subscriptions = new Map();

// ─── Groq client ────────────────────────────────────────────
const groq = new Groq({ apiKey: process.env.GROQ_API_KEY });

// ─── CORS ──────────────────────────────────────────────────
app.use(cors({
    origin: process.env.FRONTEND_URL || "http://localhost:5173",
    methods: ["GET", "POST"],
    allowedHeaders: ["Content-Type"]
}));

app.use(express.json());

// ─── Health check ──────────────────────────────────────────
app.get("/", (req, res) => {
  res.send("Daily Planner Backend is running 🚀");
});

app.get("/api/health", (req, res) => {
    res.json({ status: "ok" });
});

// ─── POST /api/subscribe (Push Notifications) ──────────────
app.post("/api/subscribe", async (req, res) => {
    try {
        const { subscription, userId } = req.body;
        if (!subscription || !userId) {
            return res.status(400).json({ error: "Subscription and userId required" });
        }
        subscriptions.set(userId, subscription);
        res.json({ success: true, message: "Subscribed successfully" });
    } catch (error) {
        console.error("Subscribe error:", error);
        res.status(500).json({ error: "Failed to subscribe" });
    }
});

// ─── SYSTEM PROMPT BUILDER ─────────────────────────────────
function buildSystemPrompt(language, taskContext) {
    const { total, completed, pending, pendingTasks, completedTasks } = taskContext;
    const currentDate = new Date();
    const currentYear = currentDate.getFullYear();
    const currentMonth = String(currentDate.getMonth() + 1).padStart(2, '0');
    const currentDay = String(currentDate.getDate()).padStart(2, '0');
    const tomorrowDate = new Date(currentDate);
    tomorrowDate.setDate(tomorrowDate.getDate() + 1);
    const tomorrow = tomorrowDate.toISOString().slice(0, 10);
    
    const langGuide = {
        hindi: {
            tone: "Simple, friendly Hindi. Avoid heavy words.",
            rule: "Sirf Hindi mein jawab do. Kabhi English mat use karo."
        },
        english: {
            tone: "Simple, casual, warm English. Like a supportive friend.",
            rule: "Reply ONLY in English. Never mix in Hindi."
        },
        hinglish: {
            tone: "Natural Hindi + English mix. Casual and friendly.",
            rule: "Mix Hindi and English naturally. Keep it casual."
        }
    };

    const lang = langGuide[language] || langGuide.english;

    let taskSnapshot = "";
    if (total === 0) {
        taskSnapshot = `The user has NO tasks added for today yet.`;
    } else {
        taskSnapshot = `
TODAY'S TASK SNAPSHOT:
- Total: ${total} | Completed: ${completed} | Pending: ${pending}
`;
        if (completedTasks.length > 0) {
            taskSnapshot += `\nCompleted tasks:\n${completedTasks.map((t, i) => `  ${i + 1}. "${t.title}" (${t.timeOfDay})${t.startTime ? ` at ${t.startTime}` : ''}`).join("\n")}`;
        }
        if (pendingTasks.length > 0) {
            taskSnapshot += `\nPending tasks:\n${pendingTasks.map((t, i) => `  ${i + 1}. "${t.title}" (${t.timeOfDay})${t.startTime ? ` at ${t.startTime}` : ''}`).join("\n")}`;
        }
    }

    return `
You are a caring, proactive AI buddy helping with time management.

LANGUAGE: ${lang.rule}
Style: ${lang.tone}

${taskSnapshot}

CURRENT TIME: ${new Date().toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit', hour12: false })} (24-hour)
CURRENT DATE: ${currentYear}-${currentMonth}-${currentDay}
TOMORROW: ${tomorrow}

═══════════════════════════════════════════════════════════════
ALARM - ALWAYS USE THIS:
═══════════════════════════════════════════════════════════════

When user says "alarm":
✅ ALWAYS call set_alarm tool
✅ Convert AM/PM to 24-hour: 3 PM = 15:00, 11 PM = 23:00

Examples:
"alarm 3 PM" → set_alarm(time="15:00", date="", label="Alarm")
"11 PM alarm" → set_alarm(time="23:00", date="", label="Alarm")

═══════════════════════════════════════════════════════════════
NOTES - EXACT WORDS:
═══════════════════════════════════════════════════════════════

When in notes mode:
1. ALWAYS call update_notes - never skip it
2. Use user's EXACT words (don't summarize)
3. Remove only: "notes mein add kar do", "daily notes mein add kar do"

Keep replies SHORT (1-2 sentences).
`.trim();
}

// ─── POST /api/advanced-chat ────────────────────────────────
app.post("/api/advanced-chat", async (req, res) => {
    try {
        const { messages, language, taskContext, isVoice, currentDate, voiceMode } = req.body;

        if (!messages || !Array.isArray(messages)) {
            return res.status(400).json({ error: "Messages array is required" });
        }
        if (!taskContext) {
            return res.status(400).json({ error: "taskContext is required" });
        }

        const selectedLanguage = language || "hinglish";
        let systemPrompt = buildSystemPrompt(selectedLanguage, taskContext);

        if (isVoice && voiceMode === 'notes') {
            systemPrompt += `\n\nNOTES MODE: Call update_notes with user's EXACT words. Don't summarize!`;
        }

        const recentMessages = messages.slice(-20);

        const tools = [
            {
                type: "function",
                function: {
                    name: "set_reminder",
                    description: "Set reminder notification",
                    parameters: {
                        type: "object",
                        properties: {
                            time: { type: "string" },
                            message: { type: "string" }
                        },
                        required: ["time", "message"]
                    }
                }
            },
            {
                type: "function",
                function: {
                    name: "set_alarm",
                    description: "Set alarm. ALWAYS use when user says 'alarm'.",
                    parameters: {
                        type: "object",
                        properties: {
                            time: { type: "string", description: "HH:MM 24-hour format" },
                            date: { type: "string", description: "YYYY-MM-DD or empty string" },
                            label: { type: "string" },
                            repeat: { type: "string", enum: ["once", "daily", "custom"] }
                        },
                        required: ["time"]
                    }
                }
            },
            {
                type: "function",
                function: {
                    name: "update_notes",
                    description: "Update notes with EXACT words",
                    parameters: {
                        type: "object",
                        properties: {
                            content: { type: "string" },
                            mode: { type: "string", enum: ["append", "replace"] }
                        },
                        required: ["content"]
                    }
                }
            },
            {
                type: "function",
                function: {
                    name: "add_task",
                    description: "Add task",
                    parameters: {
                        type: "object",
                        properties: {
                            title: { type: "string" },
                            timeOfDay: { type: "string", enum: ["morning", "afternoon", "evening"] },
                            startTime: { type: "string" },
                            endTime: { type: "string" }
                        },
                        required: ["title", "timeOfDay"]
                    }
                }
            },
            {
                type: "function",
                function: {
                    name: "complete_task",
                    description: "Mark task done",
                    parameters: {
                        type: "object",
                        properties: {
                            taskTitle: { type: "string" }
                        },
                        required: ["taskTitle"]
                    }
                }
            },
            {
                type: "function",
                function: {
                    name: "delete_task",
                    description: "Delete task",
                    parameters: {
                        type: "object",
                        properties: {
                            taskTitle: { type: "string" }
                        },
                        required: ["taskTitle"]
                    }
                }
            }
        ];

        const completion = await groq.chat.completions.create({
            model: "llama-3.3-70b-versatile",
            messages: [
                { role: "system", content: systemPrompt },
                ...recentMessages.map(m => ({ role: m.role, content: m.content }))
            ],
            tools: tools,
            tool_choice: "auto",
            temperature: 0.7,
            max_tokens: 1000
        });

        const response = completion.choices[0];

        // Collect actions
        const actions = [];
        if (response.message.tool_calls) {
            for (const toolCall of response.message.tool_calls) {
                try {
                    const params = JSON.parse(toolCall.function.arguments);

                    // Clean up set_alarm params
                    if (toolCall.function.name === "set_alarm") {
                        if (params.date === null || params.date === undefined) {
                            params.date = "";
                        }
                        if (!params.label) {
                            params.label = "Alarm";
                        }
                        if (!params.repeat) {
                            params.repeat = "once";
                        }
                    }

                    console.log(`✅ Tool: ${toolCall.function.name}`, params);

                    actions.push({
                        type: toolCall.function.name,
                        params: params
                    });
                } catch (parseError) {
                    console.error("Parse error:", parseError);
                }
            }
        }

        const reply = response.message.content || (actions.length > 0 ? "Done!" : "Hmm...");

        res.json({
            type: actions.length > 0 ? "actions" : "message",
            message: reply,
            actions: actions
        });

    } catch (error) {
        console.error("Advanced chat error:", error);
        console.error("Error stack:", error.stack);
        res.status(500).json({ error: "Server error", details: error.message });
    }
});

// ─── POST /api/task-reminder ────────────────────────────────
app.post("/api/task-reminder", async (req, res) => {
    try {
        const { task, language } = req.body;

        const messages = {
            hinglish: `⏰ "${task.title}" 10 min mein start hone wala hai. Ready ho jao!`,
            hindi: `⏰ "${task.title}" 10 मिनट में शुरू होगा। तैयार हो जाओ!`,
            english: `⏰ "${task.title}" starts in 10 minutes. Get ready!`
        };

        res.json({ message: messages[language] || messages.hinglish });
    } catch (error) {
        console.error("Task reminder error:", error);
        res.status(500).json({ error: "Failed to generate reminder" });
    }
});

// ─── POST /api/task-checkin ─────────────────────────────────
app.post("/api/task-checkin", async (req, res) => {
    try {
        const { task, language } = req.body;

        const messages = {
            hinglish: `🤔 "${task.title}" ho gaya kya?`,
            hindi: `🤔 "${task.title}" हो गया क्या?`,
            english: `🤔 Did you finish "${task.title}"?`
        };

        res.json({ message: messages[language] || messages.hinglish });
    } catch (error) {
        console.error("Task check-in error:", error);
        res.status(500).json({ error: "Failed to generate check-in" });
    }
});

// ─── POST /api/proactive-checkin ────────────────────────────
app.post("/api/proactive-checkin", async (req, res) => {
    try {
        const { type, language, taskContext } = req.body;

        const prompts = {
            morning: {
                hinglish: `Morning! Aaj ${taskContext.total} tasks hain.`,
                hindi: `सुप्रभात! आज ${taskContext.total} tasks हैं।`,
                english: `Good morning! You have ${taskContext.total} tasks today.`
            },
            evening: {
                hinglish: `Shaam ho gayi! ${taskContext.completed}/${taskContext.total} done.`,
                hindi: `शाम हो गयी! ${taskContext.completed}/${taskContext.total} पूरे हुए।`,
                english: `Evening! ${taskContext.completed}/${taskContext.total} done.`
            }
        };

        const selectedLang = language || "hinglish";
        const message = prompts[type]?.[selectedLang] || prompts.morning.hinglish;

        res.json({ message });
    } catch (error) {
        console.error("Proactive check-in error:", error);
        res.status(500).json({ error: "Failed to generate check-in" });
    }
});

// ─── START ──────────────────────────────────────────────────
app.listen(PORT, () => {
    console.log(`🚀 Buddy server running on port ${PORT}`);
});