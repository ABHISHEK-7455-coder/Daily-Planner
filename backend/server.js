
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

═══════════════════════════════════════════════════════════════
CRITICAL TIME EXTRACTION RULES:
═══════════════════════════════════════════════════════════════

ALWAYS extract time when user mentions it:
- "23:00 pe task add karo" → startTime: "23:00"
- "12:10 am pe" → startTime: "00:10" (convert AM/PM to 24-hour!)
- "5 min mai" → calculate current time + 5 mins → startTime
- "subah 9 baje" → startTime: "09:00"
- "shaam 6 baje" → startTime: "18:00"
- "12:10 se 12:30 tak" → startTime: "00:10", endTime: "00:30"

DETERMINING timeOfDay:
- 05:00 - 11:59 → "morning"
- 12:00 - 16:59 → "afternoon"  
- 17:00 - 04:59 → "evening"

═══════════════════════════════════════════════════════════════
TOOL USAGE RULES:
═══════════════════════════════════════════════════════════════

Use **add_task** when:
✅ User says: "add task", "task banao", "X karna hai Y time pe"
✅ ALWAYS include startTime if user mentions ANY time
✅ Extract title, time, and timeOfDay correctly

Use **complete_task** when:
✅ "ho gaya", "done", "complete ho gaya", "kar liya"
✅ Match task by searching in task list - use EXACT title from pending tasks

Use **delete_task** when:
✅ "delete karo", "hat jao", "remove karo"
✅ Match task by searching in task list - use EXACT title from tasks

Use **update_notes** when in notes mode:
✅ User dictates thoughts
✅ Add timestamp and content

═══════════════════════════════════════════════════════════════
TASK COMPLETION MOTIVATION:
═══════════════════════════════════════════════════════════════

When checking on tasks:
- Don't just ask "ho gaya?" - be specific: "Writing documentation ho gaya?"
- If user says no, immediately offer help:
  "Koi problem aa rahi hai? Main steps de sakta hoon!"
- Break big tasks into micro-steps
- Celebrate every completion enthusiastically

═══════════════════════════════════════════════════════════════
EXAMPLES:
═══════════════════════════════════════════════════════════════

User: "git push task add karo 23:00 pe"
You: [Call add_task("git push", "evening", "23:00", null)]
Response: "✅ Git push task add ho gaya (23:00 pe)!"

User: "12:10 am se 12:30 am tak code review"
You: [Call add_task("code review", "evening", "00:10", "00:30")]
Response: "✅ Code review add ho gaya (00:10 - 00:30)!"

User: "documentation task delete karo"
You: [Call delete_task("documentation")]
Response: "🗑️ Documentation task delete ho gaya!"

User: "writing done ho gaya"
You: [Call complete_task("writing")]
Response: "🎉 Awesome! Writing complete! Agli task ready ho?"

User: "documentation ka task nahi ho raha"
You: "Koi baat nahi! Yeh karo:
1. Pehle main points list karo (2 min)
2. Har point ko 1-2 sentences mein expand karo (5 min)
3. Review karo (1 min)

Start small - pehla step kar lo!"

REMEMBER:
- Extract time EVERY time user mentions it
- Be motivating and proactive
- Help complete tasks, don't just track them
- Short, actionable responses
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

        // Add mode-specific instructions
        if (isVoice && voiceMode === 'notes') {
            systemPrompt += `\n\nVOICE NOTES MODE: User is dictating. Call update_notes tool. Be brief: "Got it!" or "Noted!"`;
        } else if (isVoice && voiceMode === 'tasks') {
            systemPrompt += `\n\nVOICE TASKS MODE: Parse tasks from speech. Call add_task. Brief confirmations only.`;
        }

        const recentMessages = messages.slice(-20);

        const tools = [
            {
                type: "function",
                function: {
                    name: "update_notes",
                    description: "Update daily notes. Use in notes mode when user dictates content.",
                    parameters: {
                        type: "object",
                        properties: {
                            content: { type: "string", description: "Text to add to notes" },
                            mode: {
                                type: "string",
                                enum: ["append", "replace"],
                                description: "append=add to existing, replace=overwrite"
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
                    description: "Add task. CRITICAL: Extract startTime from user message if ANY time mentioned.",
                    parameters: {
                        type: "object",
                        properties: {
                            title: {
                                type: "string",
                                description: "Task title/description"
                            },
                            timeOfDay: {
                                type: "string",
                                enum: ["morning", "afternoon", "evening"],
                                description: "morning (5am-12pm), afternoon (12pm-5pm), evening (5pm-5am)"
                            },
                            startTime: {
                                type: "string",
                                description: "HH:MM format (24-hour). MUST extract if user mentions time. Examples: '23:00', '00:10', '09:00'"
                            },
                            endTime: {
                                type: "string",
                                description: "HH:MM format (24-hour). Optional end time."
                            }
                        },
                        required: ["title", "timeOfDay"]
                    }
                }
            },
            {
                type: "function",
                function: {
                    name: "complete_task",
                    description: "Mark task done. Use EXACT task title from pending tasks list.",
                    parameters: {
                        type: "object",
                        properties: {
                            taskTitle: {
                                type: "string",
                                description: "EXACT task title from the pending tasks list shown above"
                            }
                        },
                        required: ["taskTitle"]
                    }
                }
            },
            {
                type: "function",
                function: {
                    name: "delete_task",
                    description: "Delete task. Use EXACT task title from tasks list.",
                    parameters: {
                        type: "object",
                        properties: {
                            taskTitle: {
                                type: "string",
                                description: "EXACT task title from the tasks list shown above"
                            }
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
            max_tokens: 300
        });

        const response = completion.choices[0];

        // Collect all actions
        const actions = [];
        if (response.message.tool_calls) {
            for (const toolCall of response.message.tool_calls) {
                const params = JSON.parse(toolCall.function.arguments);

                // Log for debugging
                console.log(`AI called: ${toolCall.function.name}`, params);

                actions.push({
                    type: toolCall.function.name,
                    params: params
                });
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
        res.status(500).json({ error: "Something went wrong" });
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