import express from "express";
import Groq from "groq-sdk";
import cors from "cors";
import dotenv from "dotenv";
import webPush from "web-push";

dotenv.config();

const app = express();
const PORT = process.env.PORT || 3001;

webPush.setVapidDetails(
    'mailto:your-email@example.com',
    process.env.VAPID_PUBLIC_KEY,
    process.env.VAPID_PRIVATE_KEY
);

const subscriptions = new Map();
const groq = new Groq({ apiKey: process.env.GROQ_API_KEY });

// ─── Model rotation ─────────────────────────────────────────
const FAST_MODELS = ["llama-3.1-8b-instant", "meta-llama/llama-4-scout-17b-16e-instruct"];
const SMART_MODELS = ["llama-3.3-70b-versatile", "meta-llama/llama-4-maverick-17b-128e-instruct"];
let fastIdx = 0, smartIdx = 0;

async function callGroq(messages, tools = null, smart = false, maxTokens = 600) {
    const models = smart ? SMART_MODELS : FAST_MODELS;
    const idx = smart ? smartIdx++ : fastIdx++;
    const model = models[idx % models.length];
    const params = { model, messages, temperature: 0.7, max_tokens: maxTokens };
    if (tools?.length) { params.tools = tools; params.tool_choice = "auto"; }
    try {
        return await groq.chat.completions.create(params);
    } catch (e) {
        if (e.status === 429 || (e.status === 400 && JSON.stringify(e.error || "").includes("decommission"))) {
            const fallback = smart ? FAST_MODELS[0] : SMART_MODELS[0];
            console.warn(`⚠️ Fallback to ${fallback}`);
            params.model = fallback;
            return await groq.chat.completions.create(params);
        }
        throw e;
    }
}

app.use(cors({ origin: "http://localhost:5173" || process.env.FRONTEND_URL, methods: ["GET", "POST"], allowedHeaders: ["Content-Type"] }));
app.use(express.json());

app.get("/api/health", (req, res) => res.json({ status: "ok" }));

app.post("/api/subscribe", async (req, res) => {
    try {
        const { subscription, userId } = req.body;
        if (!subscription || !userId) return res.status(400).json({ error: "Required" });
        subscriptions.set(userId, subscription);
        res.json({ success: true });
    } catch (e) { res.status(500).json({ error: "Failed" }); }
});

// ─── LANGUAGE GUIDE ────────────────────────────────────────
function getLangRule(language) {
    return {
        hindi: "ONLY Hindi. Never English.",
        english: "ONLY casual English. Never Hindi.",
        hinglish: "Casual Hinglish mix. Natural Hindi+English."
    }[language] || "Casual Hinglish mix.";
}

// ─── DATE/TIME HELPERS ─────────────────────────────────────
function getDateInfo() {
    const now = new Date();
    const tomorrow = new Date(now); tomorrow.setDate(tomorrow.getDate() + 1);
    return {
        today: now.toISOString().slice(0, 10),
        tomorrow: tomorrow.toISOString().slice(0, 10),
        currentTime: now.toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit', hour12: false }),
        year: now.getFullYear(),
        month: String(now.getMonth() + 1).padStart(2, '0'),
        day: String(now.getDate()).padStart(2, '0')
    };
}

// ─── SYSTEM PROMPT ──────────────────────────────────────────
function buildSystemPrompt(language, taskContext) {
    const { total, completed, pending, pendingTasks } = taskContext;
    const { today, tomorrow, currentTime } = getDateInfo();

    let taskSnapshot = total === 0 ? "User has NO tasks today yet." :
        `Tasks: ${completed} done, ${pending} pending.\nPending: ${pendingTasks.map(t => `"${t.title}"${t.startTime ? ` at ${t.startTime}` : ''}`).join(', ')}`;

    return `You are a warm, smart AI buddy for daily planning. You speak like a helpful friend.

LANGUAGE: ${getLangRule(language)}

${taskSnapshot}
CURRENT TIME: ${currentTime} | TODAY: ${today} | TOMORROW: ${tomorrow}

══════════════════════════════════════════════
GOLDEN RULE: IF USER ALREADY GAVE THE INFO — JUST DO IT. NO FOLLOW-UP QUESTIONS.
══════════════════════════════════════════════

Examples:
✅ "add task market 9 to 11 am" → add_task("market", "morning", "09:00", "11:00", date:"${today}")
✅ "add task gym tomorrow 6am" → add_task("gym", "morning", "06:00", null, date:"${tomorrow}")
✅ "kal gym karna hai 6am" → add_task("gym", "morning", "06:00", null, date:"${tomorrow}")
✅ "set alarm 7am tomorrow" → set_alarm("07:00", "${tomorrow}", "Alarm", "once")
✅ "remind me tomorrow 9am to call doctor" → set_reminder("09:00", "call doctor", date:"${tomorrow}")
✅ "remind me in 5 min" → set_reminder(currentTime+5min, "reminder", date:"${today}")
✅ "set reminder 25 feb 3pm meeting" → set_reminder("15:00", "meeting", date:"2026-02-25")
✅ "market ho gaya" → complete_task("market")

DATE RULES (apply to ALL tools):
- Default date is ALWAYS today: "${today}"
- "tomorrow" / "kal" / "next day" → date: "${tomorrow}"
- "today" / "aaj" → date: "${today}"
- Specific dates like "25 feb", "march 5" → convert to YYYY-MM-DD
- NEVER omit the date field

TIME RULES:
- "9 am"="09:00" | "9 pm"="21:00" | "1 am"="01:00" | "1 pm"="13:00"
- "9 to 11 am" → startTime "09:00", endTime "11:00"
- 5am-noon=morning | noon-5pm=afternoon | 5pm+=evening

Keep replies SHORT (1-2 sentences). Be warm and encouraging.`.trim();
}

// ─── TOOLS ──────────────────────────────────────────────────
const TOOLS = [
    {
        type: "function",
        function: {
            name: "set_reminder",
            description: "Set a reminder. Supports future dates — today, tomorrow, or any specific date. Use when user says 'remind me at X', 'remind me tomorrow at Y', 'reminder on March 5 at Z'.",
            parameters: {
                type: "object",
                properties: {
                    time: { type: "string", description: "HH:MM 24h. If 'in 5 min', calculate current time + 5 mins." },
                    message: { type: "string", description: "What to remind about" },
                    date: { type: "string", description: "YYYY-MM-DD. REQUIRED. Default=today. 'tomorrow'/'kal'→tomorrow's date. Specific dates like '25 feb'→'2026-02-25'." }
                },
                required: ["time", "message", "date"]
            }
        }
    },
    {
        type: "function",
        function: {
            name: "set_alarm",
            description: "Set an alarm. Supports today, tomorrow, or any future date.",
            parameters: {
                type: "object",
                properties: {
                    time: { type: "string", description: "HH:MM 24h" },
                    date: { type: "string", description: "YYYY-MM-DD. REQUIRED. Default=today. 'tomorrow'/'kal'→tomorrow. NEVER empty string." },
                    label: { type: "string", description: "What alarm is for" },
                    repeat: { type: "string", enum: ["once", "daily", "custom"] }
                },
                required: ["time", "date"]
            }
        }
    },
    {
        type: "function",
        function: {
            name: "update_notes",
            description: "Update daily notes.",
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
            description: "Add a task. CRITICAL: if user says 'tomorrow'/'kal', set date to tomorrow's date.",
            parameters: {
                type: "object",
                properties: {
                    title: { type: "string" },
                    timeOfDay: { type: "string", enum: ["morning", "afternoon", "evening"] },
                    startTime: { type: "string", description: "HH:MM 24h or null" },
                    endTime: { type: "string", description: "HH:MM 24h or null" },
                    date: { type: "string", description: "YYYY-MM-DD. REQUIRED. Default=today. 'tomorrow'/'kal'→tomorrow's date." }
                },
                required: ["title", "timeOfDay", "date"]
            }
        }
    },
    {
        type: "function",
        function: {
            name: "complete_task",
            description: "Mark a task as done.",
            parameters: {
                type: "object",
                properties: { taskTitle: { type: "string" } },
                required: ["taskTitle"]
            }
        }
    },
    {
        type: "function",
        function: {
            name: "delete_task",
            description: "Delete a task.",
            parameters: {
                type: "object",
                properties: { taskTitle: { type: "string" } },
                required: ["taskTitle"]
            }
        }
    }
];

// ─── POST /api/advanced-chat ────────────────────────────────
app.post("/api/advanced-chat", async (req, res) => {
    try {
        const { messages, language, taskContext, isVoice, currentDate, voiceMode } = req.body;
        if (!messages || !Array.isArray(messages)) return res.status(400).json({ error: "Messages required" });
        if (!taskContext) return res.status(400).json({ error: "taskContext required" });

        const { today } = getDateInfo();

        // Notes bypass
        const lastMsg = messages[messages.length - 1]?.content || "";
        if (/notes?\s+mein|daily\s+notes|meri\s+daily|mere\s+daily|diary\s+mein/i.test(lastMsg)) {
            const content = lastMsg
                .replace(/(bhai\s+)?add\s+kar\s+(de|do)\s*/gi, '')
                .replace(/notes?\s+mein\s+(add\s+kar\s+do|likh\s+do)\s*/gi, '')
                .replace(/(meri|mere)\s+daily\s+notes?\s+mein\s+(add\s+kar\s+do|likh\s+do)\s*/gi, '')
                .trim();
            return res.json({
                message: language === "english" ? "📝 Added to your notes!" : "📝 Notes mein add ho gaya!",
                actions: [{ type: "update_notes", params: { content, mode: "append" } }]
            });
        }

        let systemPrompt = buildSystemPrompt(language || "hinglish", taskContext);
        if (isVoice && voiceMode === 'notes') {
            systemPrompt += "\n\nVOICE NOTES MODE: ALWAYS call update_notes with user's EXACT words.";
        } else if (voiceMode === 'tasks') {
            systemPrompt += "\n\nTASKS MODE: Parse and add/complete/delete tasks. Be direct.";
        }

        const completion = await callGroq(
            [{ role: "system", content: systemPrompt }, ...messages.slice(-20).map(m => ({ role: m.role, content: m.content }))],
            TOOLS, true, 600
        );

        const response = completion.choices[0];
        const actions = [];

        if (response.message.tool_calls) {
            for (const toolCall of response.message.tool_calls) {
                try {
                    const params = JSON.parse(toolCall.function.arguments);
                    const name = toolCall.function.name;

                    // Ensure date always has a value
                    if (["add_task", "set_alarm", "set_reminder"].includes(name)) {
                        if (!params.date) params.date = today;
                    }
                    if (name === "set_alarm") {
                        if (!params.label) params.label = "Alarm";
                        if (!params.repeat) params.repeat = "once";
                    }

                    actions.push({ type: name, params });
                } catch (e) { console.error("Parse error:", e); }
            }
        }

        res.json({ message: response.message.content || "Done! ✅", actions });

    } catch (error) {
        console.error("Chat error:", error);
        res.status(500).json({ error: "Something went wrong" });
    }
});

// ─── POST /api/buddy-intro ──────────────────────────────────
app.post("/api/buddy-intro", async (req, res) => {
    try {
        const { language, taskContext, currentTime } = req.body;
        const { total, pending, pendingTasks } = taskContext;
        const hour = parseInt((currentTime || "12:00").split(':')[0]);
        const greeting = hour < 12 ? "morning" : hour < 17 ? "afternoon" : "evening";

        const prompt = `You are a friendly AI buddy. ${getLangRule(language)}
Good ${greeting}! ${total === 0 ? "User has no tasks yet today." : `User has ${pending} pending tasks: ${pendingTasks.slice(0, 2).map(t => `"${t.title}"`).join(', ')}${pending > 2 ? ` and ${pending - 2} more` : ''}.`}
Write ONE warm friendly greeting sentence. Max 20 words. Use 1 emoji. Be encouraging.`;

        const c = await callGroq([{ role: "user", content: prompt }], null, false, 80);
        const message = c.choices[0].message.content?.trim() || "Hey! 👋 Ready to make today awesome?";

        res.json({
            message,
            quickActions: [
                { label: "➕ Add Task", action: "add_task_flow" },
                { label: "⏰ Set Alarm", action: "alarm_flow" },
                { label: "🔔 Reminder", action: "reminder_flow" },
                { label: "📅 Plan My Day", action: "plan_day_flow" }
            ]
        });
    } catch (e) {
        res.json({
            message: "Hey! 👋 Kya karna hai aaj?",
            quickActions: [
                { label: "➕ Add Task", action: "add_task_flow" },
                { label: "⏰ Set Alarm", action: "alarm_flow" },
                { label: "🔔 Reminder", action: "reminder_flow" },
                { label: "📅 Plan My Day", action: "plan_day_flow" }
            ]
        });
    }
});

// ─── POST /api/buddy-nudge ─────────────────────────────────
app.post("/api/buddy-nudge", async (req, res) => {
    try {
        const { language, taskContext, currentTime, nudgeIndex } = req.body;
        const { pending, pendingTasks } = taskContext;

        const nudgeTypes = [
            { ctx: `Say hi and offer to help. ${pending > 0 ? `They have ${pending} tasks pending.` : 'No tasks yet.'}`, chips: [{ label: "➕ Add Task", action: "add_task_flow" }, { label: "📅 Plan Day", action: "plan_day_flow" }] },
            { ctx: `Encourage to complete tasks. ${pending > 0 ? `Pending: ${pendingTasks.slice(0, 2).map(t => t.title).join(', ')}` : 'All done!'}`, chips: [{ label: "✅ Mark Done", action: "check_task_flow" }, { label: "➕ Add Task", action: "add_task_flow" }] },
            { ctx: `Suggest writing notes about their day.`, chips: [{ label: "📝 Write Notes", action: "notes_flow" }, { label: "💬 Chat", action: "open_chat" }] },
            { ctx: `Suggest setting an alarm or reminder.`, chips: [{ label: "⏰ Set Alarm", action: "alarm_flow" }, { label: "🔔 Reminder", action: "reminder_flow" }] }
        ];

        const { ctx, chips } = nudgeTypes[nudgeIndex % 4];
        const prompt = `You are a friendly AI buddy widget. ${getLangRule(language)}
${ctx}
Write ONE short nudge message (max 12 words). Friendly tone. Use 1 emoji.`;

        const c = await callGroq([{ role: "user", content: prompt }], null, false, 50);
        const message = c.choices[0].message.content?.trim() || "Hey! Tap me to chat 👋";

        res.json({ message, quickActions: chips });
    } catch (e) {
        const fallbacks = [
            { message: "Hey! 👋 I'm your buddy. Tap to chat!", quickActions: [{ label: "➕ Add Task", action: "add_task_flow" }, { label: "📅 Plan Day", action: "plan_day_flow" }] },
            { message: "Got tasks to finish? Let me help! 🎯", quickActions: [{ label: "✅ Mark Done", action: "check_task_flow" }, { label: "➕ Add Task", action: "add_task_flow" }] },
            { message: "How was your day? Write in notes 📝", quickActions: [{ label: "📝 Write Notes", action: "notes_flow" }, { label: "💬 Chat", action: "open_chat" }] },
            { message: "Need an alarm or reminder? I can help! ⏰", quickActions: [{ label: "⏰ Set Alarm", action: "alarm_flow" }, { label: "🔔 Reminder", action: "reminder_flow" }] }
        ];
        res.json(fallbacks[(req.body.nudgeIndex || 0) % 4]);
    }
});

// ─── POST /api/flow-step ────────────────────────────────────
app.post("/api/flow-step", async (req, res) => {
    try {
        const { flow, step, userInput, language, taskContext, flowData, currentTime, currentDate } = req.body;
        const { today, tomorrow } = getDateInfo();
        const lang = getLangRule(language);

        // ── Shared date helpers ──────────────────────────────
        const isTomorrow = (text) => /tomorrow|kal\b|next\s+day|agle\s+din/i.test(text || "");
        const getTargetDate = (text) => isTomorrow(text) ? tomorrow : today;

        const formatDateLabel = (date) => {
            if (date === tomorrow) return language === "english" ? "for tomorrow" : "kal ke liye";
            if (date === today) return language === "english" ? "for today" : "aaj ke liye";
            // Specific date e.g. 2026-02-25 → "Feb 25"
            return `for ${new Date(date + "T00:00:00").toLocaleDateString(undefined, { month: "short", day: "numeric" })}`;
        };

        // ── Parse date from natural language ────────────────
        // Extracts YYYY-MM-DD from free text, supports: today, tomorrow, "25 feb", "march 5", etc.
        async function parseDateFromText(text) {
            const prompt = `Extract the date from: "${text}"
TODAY: ${today} | TOMORROW: ${tomorrow}
Reply ONLY with a JSON: { "date": "YYYY-MM-DD" }
Rules:
- "today"/"aaj" → "${today}"
- "tomorrow"/"kal" → "${tomorrow}"  
- "25 feb"/"feb 25" → "2026-02-25"
- "march 5" → "2026-03-05"
- No date mentioned → "${today}"`;
            try {
                const r = await callGroq([{ role: "user", content: prompt }], null, false, 50);
                const raw = r.choices[0].message.content || "{}";
                const parsed = JSON.parse(raw.replace(/```json|```/g, "").trim());
                return parsed.date || today;
            } catch { return today; }
        }

        // ══════════════════════════════════════════════════════
        // ADD TASK FLOW
        // ══════════════════════════════════════════════════════
        if (flow === "add_task_flow") {
            if (step === "start") {
                const parsePrompt = `${lang}
User wants to add a task. Their message: "${userInput || ''}"
TODAY: ${today} | TOMORROW: ${tomorrow}
Extract task info. Reply with JSON only:
{
  "title": "task title or null",
  "startTime": "HH:MM 24h or null",
  "endTime": "HH:MM 24h or null",
  "timeOfDay": "morning/afternoon/evening or null",
  "date": "YYYY-MM-DD — ${today} default, ${tomorrow} if tomorrow/kal, specific dates as YYYY-MM-DD"
}
Rules: "9 to 11 am"→09:00,11:00,morning | "9 to 11 pm"→21:00,23:00,evening
Current time: ${currentTime}`;

                const parseRes = await callGroq([{ role: "user", content: parsePrompt }], null, false, 150);
                let parsed = {};
                try { parsed = JSON.parse(parseRes.choices[0].message.content.replace(/```json|```/g, "").trim()); } catch {}
                if (!parsed.date) parsed.date = today;

                if (parsed.title && parsed.timeOfDay) {
                    return res.json({
                        message: language === "english"
                            ? `✅ Added "${parsed.title}" ${formatDateLabel(parsed.date)}${parsed.startTime ? ` at ${parsed.startTime}` : ''}!`
                            : `✅ "${parsed.title}" ${formatDateLabel(parsed.date)} add ho gaya${parsed.startTime ? ` at ${parsed.startTime}` : ''}!`,
                        actions: [{ type: "add_task", params: { title: parsed.title, timeOfDay: parsed.timeOfDay, startTime: parsed.startTime || null, endTime: parsed.endTime || null, date: parsed.date } }],
                        nextStep: "done",
                        quickActions: [{ label: "➕ Add Another", action: "add_task_flow" }, { label: "✅ Mark Done", action: "check_task_flow" }, { label: "📅 Plan Day", action: "plan_day_flow" }]
                    });
                }

                if (parsed.title) {
                    return res.json({
                        message: language === "english"
                            ? `Got it! When do you want to do "${parsed.title}" ${formatDateLabel(parsed.date)}? Morning, afternoon, evening, or a specific time?`
                            : `"${parsed.title}" — kab karna hai ${formatDateLabel(parsed.date)}? Morning, afternoon, evening, ya specific time?`,
                        nextStep: "ask_time",
                        flow: "add_task_flow",
                        flowData: { title: parsed.title, date: parsed.date }
                    });
                }

                return res.json({
                    message: language === "english"
                        ? `What task do you want to add${isTomorrow(userInput) ? ' for tomorrow' : ''}? 🤔`
                        : `${isTomorrow(userInput) ? 'Kal ke liye ' : ''}kya task add karna hai? 🤔`,
                    nextStep: "ask_title",
                    flow: "add_task_flow",
                    flowData: { date: getTargetDate(userInput) }
                });
            }

            if (step === "ask_title") {
                const inheritedDate = flowData.date || today;
                const parsePrompt = `${lang}
User said: "${userInput}" | TODAY: ${today} | TOMORROW: ${tomorrow} | Inherited date: "${inheritedDate}"
Extract: { "title": "...", "startTime": "HH:MM or null", "endTime": "HH:MM or null", "timeOfDay": "morning/afternoon/evening or null", "date": "YYYY-MM-DD" }
JSON only. Current time: ${currentTime}`;

                const parseRes = await callGroq([{ role: "user", content: parsePrompt }], null, false, 100);
                let parsed = { title: userInput, date: inheritedDate };
                try { parsed = { title: userInput, date: inheritedDate, ...JSON.parse(parseRes.choices[0].message.content.replace(/```json|```/g, "").trim()) }; } catch {}
                if (!parsed.date) parsed.date = inheritedDate;

                if (parsed.timeOfDay) {
                    return res.json({
                        message: language === "english"
                            ? `✅ Added "${parsed.title}" ${formatDateLabel(parsed.date)}!`
                            : `✅ "${parsed.title}" ${formatDateLabel(parsed.date)} add ho gaya!`,
                        actions: [{ type: "add_task", params: { title: parsed.title, timeOfDay: parsed.timeOfDay, startTime: parsed.startTime || null, endTime: parsed.endTime || null, date: parsed.date } }],
                        nextStep: "done",
                        quickActions: [{ label: "➕ Add Another", action: "add_task_flow" }, { label: "✅ Mark Done", action: "check_task_flow" }]
                    });
                }

                return res.json({
                    message: language === "english"
                        ? `"${parsed.title}" — morning, afternoon, evening, or specific time?`
                        : `"${parsed.title}" — morning, afternoon, evening, ya specific time?`,
                    nextStep: "ask_time",
                    flow: "add_task_flow",
                    flowData: { title: parsed.title, date: parsed.date }
                });
            }

            if (step === "ask_time") {
                const title = flowData.title || "task";
                const taskDate = flowData.date || today;
                const timePrompt = `User said: "${userInput}" for time of "${title}".
Parse: { "timeOfDay": "morning/afternoon/evening", "startTime": "HH:MM or null", "endTime": "HH:MM or null" }
morning=5am-noon, afternoon=noon-5pm, evening=5pm+. JSON only. Current: ${currentTime}`;

                const parseRes = await callGroq([{ role: "user", content: timePrompt }], null, false, 100);
                let parsed = { timeOfDay: "morning", startTime: null, endTime: null };
                try { parsed = { ...parsed, ...JSON.parse(parseRes.choices[0].message.content.replace(/```json|```/g, "").trim()) }; } catch {}

                const timeStr = parsed.startTime
                    ? (parsed.endTime ? ` (${parsed.startTime}–${parsed.endTime})` : ` at ${parsed.startTime}`)
                    : "";

                return res.json({
                    message: language === "english"
                        ? `✅ Added "${title}" ${formatDateLabel(taskDate)}${timeStr}!`
                        : `✅ "${title}" ${formatDateLabel(taskDate)} add ho gaya${timeStr}!`,
                    actions: [{ type: "add_task", params: { title, timeOfDay: parsed.timeOfDay, startTime: parsed.startTime, endTime: parsed.endTime, date: taskDate } }],
                    nextStep: "done",
                    quickActions: [{ label: "➕ Add Another", action: "add_task_flow" }, { label: "✅ Mark Done", action: "check_task_flow" }, { label: "📅 Plan Day", action: "plan_day_flow" }]
                });
            }
        }

        // ══════════════════════════════════════════════════════
        // ALARM FLOW — now fully date-aware
        // ══════════════════════════════════════════════════════
        if (flow === "alarm_flow") {
            if (step === "start") {
                const parsePrompt = `${lang}
User wants to set an alarm. Message: "${userInput || ''}"
TODAY: ${today} | TOMORROW: ${tomorrow}

Extract alarm info. JSON only:
{
  "time": "HH:MM 24h or null",
  "date": "YYYY-MM-DD — ${today} default, ${tomorrow} if tomorrow/kal, specific date as YYYY-MM-DD",
  "label": "what alarm is for or 'Alarm'",
  "repeat": "once/daily/custom",
  "ampm_clear": true/false
}
Rules:
- "5 am"→time:"05:00", ampm_clear:true | "5 pm"→"17:00", ampm_clear:true
- "7" or "7 baje" (no AM/PM)→time:"07:00", ampm_clear:false
- "tomorrow"/"kal"→date:"${tomorrow}" | "today"/"aaj"→date:"${today}"
- "25 feb"→date:"2026-02-25" | "march 5"→date:"2026-03-05"
- no date mentioned → date:"${today}"`;

                const parseRes = await callGroq([{ role: "user", content: parsePrompt }], null, false, 150);
                let parsed = {};
                try { parsed = JSON.parse(parseRes.choices[0].message.content.replace(/```json|```/g, "").trim()); } catch {}
                if (!parsed.date) parsed.date = today;
                if (!parsed.repeat) parsed.repeat = "once";

                if (parsed.time && parsed.ampm_clear !== false) {
                    return res.json({
                        message: language === "english"
                            ? `⏰ Alarm set for ${parsed.time} ${formatDateLabel(parsed.date)}! "${parsed.label || 'Alarm'}"`
                            : `⏰ Alarm set ho gaya ${parsed.time} — ${formatDateLabel(parsed.date)}! "${parsed.label || 'Alarm'}"`,
                        actions: [{ type: "set_alarm", params: { time: parsed.time, date: parsed.date, label: parsed.label || "Alarm", repeat: parsed.repeat } }],
                        nextStep: "done",
                        quickActions: [{ label: "➕ Add Task", action: "add_task_flow" }, { label: "🔔 Reminder", action: "reminder_flow" }]
                    });
                }

                if (parsed.time) {
                    const hour12 = parseInt(parsed.time.split(':')[0]) % 12 || 12;
                    return res.json({
                        message: language === "english" ? `${hour12} AM or PM?` : `${hour12} baje AM hai ya PM?`,
                        nextStep: "ask_ampm",
                        flow: "alarm_flow",
                        flowData: { time: parsed.time, date: parsed.date, label: parsed.label || "Alarm", repeat: parsed.repeat }
                    });
                }

                return res.json({
                    message: language === "english" ? "What time should I set the alarm? ⏰" : "Konse time ka alarm set karu? ⏰",
                    nextStep: "ask_time",
                    flow: "alarm_flow",
                    flowData: { date: getTargetDate(userInput) }
                });
            }

            if (step === "ask_time") {
                const inheritedDate = flowData.date || today;
                const parsePrompt = `User said "${userInput}" for alarm time. TODAY:${today} TOMORROW:${tomorrow} Inherited date:${inheritedDate}
Parse: { "time":"HH:MM 24h or null", "date":"YYYY-MM-DD", "label":"Alarm", "ampm_clear":true/false }
If user mentions a date here, override inherited date. JSON only.`;
                const parseRes = await callGroq([{ role: "user", content: parsePrompt }], null, false, 100);
                let parsed = { time: null, date: inheritedDate, label: "Alarm", ampm_clear: true };
                try { parsed = { ...parsed, ...JSON.parse(parseRes.choices[0].message.content.replace(/```json|```/g, "").trim()) }; } catch {}
                if (!parsed.date) parsed.date = inheritedDate;

                if (parsed.time && parsed.ampm_clear !== false) {
                    return res.json({
                        message: language === "english"
                            ? `⏰ Alarm set for ${parsed.time} ${formatDateLabel(parsed.date)}!`
                            : `⏰ Alarm set ho gaya ${parsed.time} — ${formatDateLabel(parsed.date)}!`,
                        actions: [{ type: "set_alarm", params: { time: parsed.time, date: parsed.date, label: parsed.label || "Alarm", repeat: "once" } }],
                        nextStep: "done",
                        quickActions: [{ label: "➕ Add Task", action: "add_task_flow" }, { label: "🔔 Reminder", action: "reminder_flow" }]
                    });
                }

                if (parsed.time) {
                    const hour12 = parseInt(parsed.time.split(':')[0]) % 12 || 12;
                    return res.json({
                        message: language === "english" ? `${hour12} AM or PM?` : `${hour12} AM hai ya PM?`,
                        nextStep: "ask_ampm",
                        flow: "alarm_flow",
                        flowData: { time: parsed.time, date: parsed.date, label: parsed.label || "Alarm", repeat: "once" }
                    });
                }

                return res.json({ message: "Please give a valid time, like 7am or 9:30pm", nextStep: "ask_time", flow: "alarm_flow", flowData: { date: inheritedDate } });
            }

            if (step === "ask_ampm") {
                const isAM = /am|subah|morning|सुबह/i.test(userInput);
                const isPM = /pm|raat|sham|evening|shaam|night|दोपहर|शाम/i.test(userInput);
                let time = flowData.time || "07:00";
                const [h] = time.split(':').map(Number);
                if (isPM && h < 12) time = `${String(h + 12).padStart(2, '0')}:${time.split(':')[1]}`;
                else if (isAM && h === 12) time = `00:${time.split(':')[1]}`;

                const alarmDate = flowData.date || today;
                return res.json({
                    message: language === "english"
                        ? `⏰ Alarm set for ${time} ${formatDateLabel(alarmDate)}!`
                        : `⏰ Alarm set ho gaya ${time} — ${formatDateLabel(alarmDate)}!`,
                    actions: [{ type: "set_alarm", params: { time, date: alarmDate, label: flowData.label || "Alarm", repeat: flowData.repeat || "once" } }],
                    nextStep: "done",
                    quickActions: [{ label: "➕ Add Task", action: "add_task_flow" }, { label: "🔔 Reminder", action: "reminder_flow" }]
                });
            }
        }

        // ══════════════════════════════════════════════════════
        // REMINDER FLOW — now fully date-aware
        // ══════════════════════════════════════════════════════
        if (flow === "reminder_flow") {
            if (step === "start") {
                const parsePrompt = `User wants a reminder. Message: "${userInput || ''}"
Current time: ${currentTime} | TODAY: ${today} | TOMORROW: ${tomorrow}

Parse: {
  "time": "HH:MM 24h or null — 'in 5 min' = current+5",
  "message": "what to remind about or null",
  "date": "YYYY-MM-DD — ${today} default, ${tomorrow} if tomorrow/kal, specific dates as YYYY-MM-DD"
}
Examples:
- "remind me in 5 min to call mom" → time: current+5, message: "call mom", date: "${today}"
- "remind me tomorrow 9am meeting" → time: "09:00", message: "meeting", date: "${tomorrow}"
- "reminder 25 feb 3pm doctor" → time: "15:00", message: "doctor", date: "2026-02-25"
JSON only.`;

                const parseRes = await callGroq([{ role: "user", content: parsePrompt }], null, false, 120);
                let parsed = {};
                try { parsed = JSON.parse(parseRes.choices[0].message.content.replace(/```json|```/g, "").trim()); } catch {}
                if (!parsed.date) parsed.date = today;

                if (parsed.time && parsed.message) {
                    return res.json({
                        message: language === "english"
                            ? `🔔 Reminder set for ${parsed.time} ${formatDateLabel(parsed.date)}!`
                            : `🔔 Reminder set ho gaya ${parsed.time} — ${formatDateLabel(parsed.date)}!`,
                        actions: [{ type: "set_reminder", params: { time: parsed.time, message: parsed.message, date: parsed.date } }],
                        nextStep: "done",
                        quickActions: [{ label: "⏰ Set Alarm", action: "alarm_flow" }, { label: "➕ Add Task", action: "add_task_flow" }]
                    });
                }

                if (parsed.time) {
                    return res.json({
                        message: language === "english" ? "What should I remind you about?" : "Kya yaad dilana hai?",
                        nextStep: "ask_what",
                        flow: "reminder_flow",
                        flowData: { time: parsed.time, date: parsed.date }
                    });
                }

                // Have message but no time — ask when
                const detectedDate = getTargetDate(userInput);
                return res.json({
                    message: language === "english"
                        ? `When should I remind you${detectedDate === tomorrow ? ' tomorrow' : ''}? (e.g. 10am, in 30 min)`
                        : `Kab remind karoon${detectedDate === tomorrow ? ' kal' : ''}? (jaise 10 baje, ya 30 min mein)`,
                    nextStep: "ask_when",
                    flow: "reminder_flow",
                    flowData: { message: parsed.message, date: detectedDate }
                });
            }

            if (step === "ask_when") {
                const inheritedDate = flowData.date || today;
                const parsePrompt = `User said "${userInput}" for reminder time. Current: ${currentTime} | TODAY: ${today} | TOMORROW: ${tomorrow} | Inherited date: ${inheritedDate}
Parse: { "time": "HH:MM 24h", "date": "YYYY-MM-DD" }
"in 5 min" = current time + 5 mins. If user mentions a date here, override inherited. JSON only.`;
                const parseRes = await callGroq([{ role: "user", content: parsePrompt }], null, false, 80);
                let parsed = { time: currentTime, date: inheritedDate };
                try { parsed = { ...parsed, ...JSON.parse(parseRes.choices[0].message.content.replace(/```json|```/g, "").trim()) }; } catch {}
                if (!parsed.date) parsed.date = inheritedDate;

                const reminderMsg = flowData.message || userInput;
                return res.json({
                    message: language === "english"
                        ? `🔔 Reminder set for ${parsed.time} ${formatDateLabel(parsed.date)}!`
                        : `🔔 Reminder set ho gaya ${parsed.time} — ${formatDateLabel(parsed.date)}!`,
                    actions: [{ type: "set_reminder", params: { time: parsed.time, message: reminderMsg, date: parsed.date } }],
                    nextStep: "done",
                    quickActions: [{ label: "⏰ Set Alarm", action: "alarm_flow" }, { label: "➕ Add Task", action: "add_task_flow" }]
                });
            }

            if (step === "ask_what") {
                const reminderDate = flowData.date || today;
                return res.json({
                    message: language === "english"
                        ? `🔔 Reminder set for ${flowData.time} ${formatDateLabel(reminderDate)}!`
                        : `🔔 Reminder set ho gaya ${flowData.time} — ${formatDateLabel(reminderDate)}!`,
                    actions: [{ type: "set_reminder", params: { time: flowData.time, message: userInput, date: reminderDate } }],
                    nextStep: "done",
                    quickActions: [{ label: "⏰ Set Alarm", action: "alarm_flow" }, { label: "➕ Add Task", action: "add_task_flow" }]
                });
            }
        }

        // ══════════════════════════════════════════════════════
        // CHECK TASK FLOW
        // ══════════════════════════════════════════════════════
        if (flow === "check_task_flow") {
            const { pending, pendingTasks } = taskContext;

            if (step === "start") {
                if (pending === 0) {
                    return res.json({
                        message: language === "english" ? "🎉 All tasks done! Amazing work today!" : "🎉 Sab tasks ho gaye! Kamaal kiya aaj!",
                        nextStep: "done",
                        quickActions: [{ label: "➕ Add More Tasks", action: "add_task_flow" }]
                    });
                }
                if (userInput) {
                    const matchedTask = pendingTasks.find(t =>
                        t.title.toLowerCase().includes(userInput.toLowerCase()) ||
                        userInput.toLowerCase().includes(t.title.toLowerCase())
                    );
                    if (matchedTask) {
                        return res.json({
                            message: language === "english" ? `🎉 "${matchedTask.title}" done!` : `🎉 "${matchedTask.title}" ho gaya! Shabaash!`,
                            actions: [{ type: "complete_task", params: { taskTitle: matchedTask.title } }],
                            nextStep: "done",
                            quickActions: pending > 1 ? [{ label: "✅ Mark Another Done", action: "check_task_flow" }] : [{ label: "📅 Plan Day", action: "plan_day_flow" }]
                        });
                    }
                }
                const taskList = pendingTasks.slice(0, 5).map((t, i) => `${i + 1}. "${t.title}"`).join('\n');
                return res.json({
                    message: language === "english" ? `Which task did you finish?\n${taskList}` : `Kaun sa task complete hua?\n${taskList}`,
                    nextStep: "pick_task",
                    flow: "check_task_flow",
                    flowData: {}
                });
            }

            if (step === "pick_task") {
                const matchedTask = pendingTasks.find(t =>
                    t.title.toLowerCase().includes(userInput.toLowerCase()) ||
                    userInput.toLowerCase().includes(t.title.toLowerCase()) ||
                    userInput === String(pendingTasks.indexOf(t) + 1)
                );
                if (matchedTask) {
                    return res.json({
                        message: language === "english" ? `🎉 "${matchedTask.title}" done!` : `🎉 "${matchedTask.title}" ho gaya!`,
                        actions: [{ type: "complete_task", params: { taskTitle: matchedTask.title } }],
                        nextStep: "done",
                        quickActions: taskContext.pending > 1 ? [{ label: "✅ Mark Another Done", action: "check_task_flow" }] : [{ label: "📅 Plan Day", action: "plan_day_flow" }]
                    });
                }
                return res.json({
                    message: language === "english" ? "Which task? Say the name or number." : "Kaun sa task? Naam ya number batao.",
                    nextStep: "pick_task",
                    flow: "check_task_flow",
                    flowData: {}
                });
            }
        }

        // ══════════════════════════════════════════════════════
        // PLAN DAY FLOW
        // ══════════════════════════════════════════════════════
        if (flow === "plan_day_flow") {
            const { total, pending, pendingTasks } = taskContext;
            if (step === "start") {
                if (total === 0) {
                    return res.json({
                        message: language === "english" ? "No tasks yet! What do you want to accomplish today?" : "Abhi koi task nahi hai! Aaj kya karna hai?",
                        nextStep: "done",
                        quickActions: [{ label: "➕ Add Task", action: "add_task_flow" }]
                    });
                }
                const taskList = pendingTasks.map(t => `"${t.title}"${t.startTime ? ` at ${t.startTime}` : ''}`).join(', ');
                const planRes = await callGroq([{
                    role: "user",
                    content: `${lang}\nPending tasks: ${taskList}. Current time: ${currentTime}.\nShort plan (max 4 lines): which to start NOW and order. Direct and encouraging.`
                }], null, true, 200);
                return res.json({
                    message: planRes.choices[0].message.content?.trim(),
                    nextStep: "done",
                    quickActions: [{ label: "✅ Mark Task Done", action: "check_task_flow" }, { label: "➕ Add Task", action: "add_task_flow" }]
                });
            }
        }

        // ══════════════════════════════════════════════════════
        // NOTES FLOW
        // ══════════════════════════════════════════════════════
        if (flow === "notes_flow") {
            if (step === "start") {
                if (userInput) {
                    return res.json({
                        message: language === "english" ? "📝 Added to your notes!" : "📝 Notes mein add ho gaya!",
                        actions: [{ type: "update_notes", params: { content: userInput, mode: "append" } }],
                        nextStep: "done",
                        quickActions: [{ label: "📝 Add More", action: "notes_flow" }, { label: "➕ Add Task", action: "add_task_flow" }]
                    });
                }
                return res.json({
                    message: language === "english" ? "What do you want to write in notes? 📝" : "Notes mein kya likhna hai? 📝",
                    nextStep: "write_note",
                    flow: "notes_flow",
                    flowData: {}
                });
            }
            if (step === "write_note") {
                return res.json({
                    message: language === "english" ? "📝 Added to your notes!" : "📝 Notes mein add ho gaya!",
                    actions: [{ type: "update_notes", params: { content: userInput, mode: "append" } }],
                    nextStep: "done",
                    quickActions: [{ label: "📝 Add More", action: "notes_flow" }, { label: "➕ Add Task", action: "add_task_flow" }]
                });
            }
        }

        return res.json({
            message: "Hmm, let me help you!",
            nextStep: "done",
            quickActions: [{ label: "➕ Add Task", action: "add_task_flow" }, { label: "⏰ Set Alarm", action: "alarm_flow" }, { label: "📅 Plan Day", action: "plan_day_flow" }]
        });

    } catch (error) {
        console.error("Flow step error:", error);
        res.status(500).json({ error: "Something went wrong" });
    }
});

// ─── Proactive monitor ────────────────────────────────────
app.post("/api/proactive-monitor", async (req, res) => {
    try {
        const { language, taskContext, currentTime, monitorType } = req.body;
        const { total, completed, pending, pendingTasks } = taskContext;
        if (total === 0) return res.json({ shouldNotify: false });

        const prompts = {
            morning_kickoff: {
                hinglish: `Good morning! Aaj ${pending} tasks pending hain. ${pendingTasks[0] ? `"${pendingTasks[0].title}" se shuru karo!` : 'Shuru karo!'}`,
                english: `Good morning! ${pending} tasks today. Start with "${pendingTasks[0]?.title || 'your first task'}"!`,
                hindi: `सुप्रभात! आज ${pending} tasks बाकी हैं।`
            },
            overdue_check: {
                hinglish: `${pending} tasks abhi bhi pending hain. Koi ek complete kar lo!`,
                english: `${pending} tasks still pending. Can you finish one now?`,
                hindi: `${pending} tasks अभी भी बाकी हैं।`
            },
            end_of_day: {
                hinglish: `Din khatam! ${completed}/${total} complete kiye. Baaki kal ke liye plan karo?`,
                english: `Day's ending! ${completed}/${total} done. Plan the rest for tomorrow?`,
                hindi: `दिन खत्म! ${completed}/${total} पूरे हुए।`
            }
        };

        res.json({
            shouldNotify: true,
            message: prompts[monitorType]?.[language] || prompts[monitorType]?.hinglish,
            quickActions: [{ label: "✅ Mark Done", action: "check_task_flow" }, { label: "📅 View Plan", action: "plan_day_flow" }]
        });
    } catch (e) { res.json({ shouldNotify: false }); }
});

// ─── Static endpoints ─────────────────────────────────────
app.post("/api/task-reminder", async (req, res) => {
    const { task, language } = req.body;
    const msgs = {
        hinglish: `⏰ "${task.title}" 10 min mein start hone wala hai. Ready ho jao!`,
        hindi: `⏰ "${task.title}" 10 मिनट में शुरू होगा। तैयार हो जाओ!`,
        english: `⏰ "${task.title}" starts in 10 minutes. Get ready!`
    };
    res.json({ message: msgs[language] || msgs.hinglish });
});

app.post("/api/task-checkin", async (req, res) => {
    const { task, language } = req.body;
    const msgs = {
        hinglish: `🤔 "${task.title}" ho gaya kya?`,
        hindi: `🤔 "${task.title}" हो गया क्या?`,
        english: `🤔 Did you finish "${task.title}"?`
    };
    res.json({ message: msgs[language] || msgs.hinglish });
});

app.post("/api/proactive-checkin", async (req, res) => {
    const { type, language, taskContext } = req.body;
    const { total, completed } = taskContext;
    const msgs = {
        morning: { hinglish: `Morning! Aaj ${total} tasks hain. Kaunsa pehle?`, english: `Morning! ${total} tasks today. Which one first?`, hindi: `सुप्रभात! ${total} tasks आज।` },
        evening: { hinglish: `Shaam ho gayi! ${completed}/${total} done.`, english: `Evening! ${completed}/${total} done.`, hindi: `शाम हो गयी! ${completed}/${total} पूरे।` }
    };
    res.json({ message: msgs[type]?.[language] || msgs.morning?.hinglish });
});

app.listen(PORT, () => console.log(`🚀 Buddy server running on port ${PORT}`));