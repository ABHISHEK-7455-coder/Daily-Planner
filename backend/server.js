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
You are a caring, proactive AI buddy helping with time management. Your goal: MAKE SURE ALL TASKS GET COMPLETED.

LANGUAGE: ${lang.rule}
Style: ${lang.tone}

${taskSnapshot}

CURRENT TIME: ${new Date().toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit', hour12: false })} (24-hour)
CURRENT DATE: ${new Date().toLocaleDateString()}
CURRENT DATE: ${currentYear}-${currentMonth}-${currentDay}
TOMORROW: ${tomorrow}

═══════════════════════════════════════════════════════════════
ALARM TOOL - CRITICAL RULES:
═══════════════════════════════════════════════════════════════

Use **set_alarm** for ALL alarm requests:
✅ "alarm set kar do 3 PM"
✅ "11 PM ka alarm"
✅ "set alarm 3:00 PM Mujhe bahar jana hai"
✅ "wake me at 7"

TIME CONVERSION - ALWAYS 24-HOUR FORMAT:
"3 PM" → "15:00"
"3:00 PM" → "15:00"
"11 PM" → "23:00"
"11:00 PM" → "23:00"
"7 AM" → "07:00"
"7:00 AM" → "07:00"

CRITICAL: Always call set_alarm when user mentions "alarm"!

EXAMPLES:

User: "alarm set kar do 3:00 P.M Ka Mujhe bahar jana hai"
→ set_alarm(time="15:00", date="", label="bahar jana hai", repeat="once")

User: "alarm add kar do 11:00 PM Ka"
→ set_alarm(time="23:00", date="", label="Alarm", repeat="once")

User: "23 feb meeting alarm laga do 9 AM"
→ set_alarm(time="09:00", date="${currentYear}-02-23", label="meeting", repeat="once")

═══════════════════════════════════════════════════════════════
TOOL USAGE RULES:
═══════════════════════════════════════════════════════════════

Use **add_task** when:
✅ User says: "add task", "task banao", "X karna hai Y time pe"

Use **complete_task** when:
✅ "ho gaya", "done", "complete ho gaya"

Use **delete_task** when:
✅ "delete karo", "remove karo"

Use **update_notes** when in notes mode:
✅ User dictates thoughts
✅ ALWAYS call the tool - NEVER just respond without calling it

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
            systemPrompt += `\n\n═══════════════════════════════════════════════════════════
VOICE NOTES MODE - MANDATORY TOOL USAGE:
═══════════════════════════════════════════════════════════

⚠️ CRITICAL: You MUST ALWAYS call the update_notes tool! NEVER just respond without calling it!

WRONG: User says something → You respond "Notes mein add ho gaya!" (NO TOOL CALL)
CORRECT: User says something → Call update_notes() → Then respond "Notes mein add ho gaya!"

CONTENT RULES:
1. Call update_notes with user's EXACT words
2. DO NOT summarize or shorten
3. Include EVERYTHING user said

Remove only instruction phrases like "notes mein add kar do"
═══════════════════════════════════════════════════════════`;
        }

        const recentMessages = messages.slice(-20);

        const tools = [
            {
                type: "function",
                function: {
                    name: "set_reminder",
                    description: "Set a timed reminder notification",
                    parameters: {
                        type: "object",
                        properties: {
                            time: { type: "string", description: "Time in HH:MM 24-hour format" },
                            message: { type: "string", description: "What to remind about" }
                        },
                        required: ["time", "message"]
                    }
                }
            },
            {
                type: "function",
                function: {
                    name: "set_alarm",
                    description: "Set an alarm with sound and vibration. ALWAYS use this when user says 'alarm'.",
                    parameters: {
                        type: "object",
                        properties: {
                            time: {
                                type: "string",
                                description: "Time in HH:MM 24-hour format. CRITICAL: Convert AM/PM to 24-hour. 3 PM = 15:00, 11 PM = 23:00"
                            },
                            date: {
                                type: "string",
                                description: "Date in YYYY-MM-DD format. Use empty string if no date mentioned."
                            },
                            label: {
                                type: "string",
                                description: "What the alarm is for. Extract from user's message."
                            },
                            repeat: {
                                type: "string",
                                enum: ["once", "daily", "custom"],
                                description: "Repeat pattern"
                            }
                        },
                        required: ["time"]
                    }
                }
            },
            {
                type: "function",
                function: {
                    name: "update_notes",
                    description: "Update daily notes. Pass user's EXACT words, no summarization.",
                    parameters: {
                        type: "object",
                        properties: {
                            content: { 
                                type: "string",
                                description: "User's EXACT spoken words"
                            },
                            mode: {
                                type: "string",
                                enum: ["append", "replace"]
                            }
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

        // Collect all actions
        const actions = [];
        if (response.message.tool_calls) {
            for (const toolCall of response.message.tool_calls) {
                try {
                    const params = JSON.parse(toolCall.function.arguments);

                    // Clean up null values for set_alarm
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

                    // Validate update_notes content
                    if (toolCall.function.name === "update_notes" && voiceMode === 'notes') {
                        const userMessage = recentMessages[recentMessages.length - 1]?.content || "";
                        const noteContent = params.content || "";
                        
                        const cleanedUserMsg = userMessage
                            .replace(/bhai add kar de/gi, '')
                            .replace(/notes? mein add kar do/gi, '')
                            .replace(/meri daily notes? mein add kar do/gi, '')
                            .replace(/daily notes? mein add kar do/gi, '')
                            .replace(/usko bhi add kar do/gi, '')
                            .trim();
                        
                        const userWordCount = cleanedUserMsg.split(/\s+/).filter(w => w.length > 0).length;
                        const noteWordCount = noteContent.split(/\s+/).filter(w => w.length > 0).length;
                        
                        console.log(`📊 Word count: User=${userWordCount}, Note=${noteWordCount}`);
                        
                        if (noteWordCount < userWordCount * 0.7 && userWordCount > 5) {
                            console.warn(`⚠️ Summarization detected! Using original.`);
                            params.content = cleanedUserMsg;
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
        console.error("Error details:", error.message);
        res.status(500).json({ error: "Something went wrong", details: error.message });
    }
});

// ─── POST /api/task-reminder ────────────────────────────────
app.post("/api/task-reminder", async (req, res) => {
    try {
        const { task, language } = req.body;

        const messages = {
            hinglish: `⏰ "${task.title}" 10 min mein start hone wala hai (${task.startTime} pe). Ready ho jao!`,
            hindi: `⏰ "${task.title}" 10 मिनट में शुरू होगा (${task.startTime} पर)। तैयार हो जाओ!`,
            english: `⏰ "${task.title}" starts in 10 minutes (at ${task.startTime}). Get ready!`
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
            hinglish: `🤔 "${task.title}" ho gaya kya? Agar nahi hua to koi baat nahi - main help kar sakta hoon!`,
            hindi: `🤔 "${task.title}" हो गया क्या? अगर नहीं हुआ तो कोई बात नहीं - मैं मदद कर सकता हूं!`,
            english: `🤔 Did you finish "${task.title}"? If not, no worries - I can help!`
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
                hinglish: `Morning! Aaj ${taskContext.total} tasks hain. Kaunsa pehle karoge?`,
                hindi: `सुप्रभात! आज ${taskContext.total} tasks हैं। कौनसा पहले करोगे?`,
                english: `Good morning! You have ${taskContext.total} tasks today. Which one first?`
            },
            evening: {
                hinglish: `Shaam ho gayi! ${taskContext.completed}/${taskContext.total} done. Bache hue tasks complete karo?`,
                hindi: `शाम हो गयी! ${taskContext.completed}/${taskContext.total} पूरे हुए। बाकी complete करें?`,
                english: `Evening! ${taskContext.completed}/${taskContext.total} done. Ready to finish the rest?`
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
app.get("/", (req, res) => {
  res.send("Daily Planner Backend is running 🚀");
});