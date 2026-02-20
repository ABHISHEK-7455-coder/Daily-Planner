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

// ─── Model rotation (only live models) ─────────────────────
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

app.use(cors({ origin:process.env.FRONTEND_URL || "http://localhost:5173" , methods: ["GET", "POST"], allowedHeaders: ["Content-Type"] }));
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

// ─── SYSTEM PROMPT FOR ADVANCED CHAT ───────────────────────
function buildSystemPrompt(language, taskContext) {
    const { total, completed, pending, pendingTasks, completedTasks } = taskContext;
    const { today, tomorrow, currentTime, year, month, day } = getDateInfo();

    let taskSnapshot = total === 0 ? "User has NO tasks today yet." :
        `Tasks: ${completed} done, ${pending} pending.\nPending: ${pendingTasks.map(t => `"${t.title}"${t.startTime ? ` at ${t.startTime}` : ''}`).join(', ')}`;

    return `You are a warm, smart AI buddy for daily planning. You speak like a helpful friend.

LANGUAGE: ${getLangRule(language)}

${taskSnapshot}
CURRENT TIME: ${currentTime} | TODAY: ${year}-${month}-${day} | TOMORROW: ${tomorrow}

══════════════════════════════════════════════
GOLDEN RULE: IF USER ALREADY GAVE THE INFO — JUST DO IT. NO FOLLOW-UP QUESTIONS.
══════════════════════════════════════════════

Examples of doing it RIGHT:
✅ "add task market 9 to 11 am" → IMMEDIATELY call add_task("market jaana", "morning", "09:00", "11:00")
✅ "set alarm 7am tomorrow" → IMMEDIATELY call set_alarm("07:00", "${tomorrow}", "Alarm", "once")
✅ "market ho gaya" → IMMEDIATELY call complete_task("market")
✅ "remind me in 5 min" → IMMEDIATELY call set_reminder(currentTime+5min, "reminder")
✅ "9 to 11 PM market" → IMMEDIATELY call add_task("market", "evening", "21:00", "23:00")

Only ask a follow-up if critical info is GENUINELY missing:
- "add task" with NO title → ask what task
- "set alarm" with NO time at all → ask what time
- Everything else → JUST DO IT

TIME RULES:
- "9 am" = "09:00" | "9 pm" = "21:00" | "1 am" = "01:00" | "1 pm" = "13:00"
- "9 to 11 am" → startTime "09:00", endTime "11:00", timeOfDay "morning"
- "9 to 11 pm" → startTime "21:00", endTime "23:00", timeOfDay "evening"
- 5am-11:59am = morning | 12pm-4:59pm = afternoon | 5pm-4:59am = evening
- NEVER send null for date on set_alarm — use "" if no date

Keep replies SHORT (1-2 sentences max). Be warm and encouraging.`.trim();
}

// ─── TOOLS DEFINITION ──────────────────────────────────────
const TOOLS = [
    {
        type: "function",
        function: {
            name: "set_reminder",
            description: "Set a reminder notification. Use when user says 'remind me in X min' or 'reminder at X'.",
            parameters: {
                type: "object",
                properties: {
                    time: { type: "string", description: "HH:MM 24-hour. If '5 min', calculate current time + 5 mins." },
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
            description: "Set an alarm. Use for wake-up alarms or future scheduled alerts.",
            parameters: {
                type: "object",
                properties: {
                    time: { type: "string", description: "HH:MM 24h. 1am=01:00, 1pm=13:00, 9pm=21:00" },
                    date: { type: "string", description: "YYYY-MM-DD or empty string ''. NEVER null." },
                    label: { type: "string", description: "What alarm is for" },
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
            description: "Update daily notes. Pass user's EXACT words, never summarize.",
            parameters: {
                type: "object",
                properties: {
                    content: { type: "string", description: "User's exact words unchanged" },
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
            description: "Add a task. Extract ALL info from user message — title, time, timeOfDay.",
            parameters: {
                type: "object",
                properties: {
                    title: { type: "string", description: "Task title" },
                    timeOfDay: { type: "string", enum: ["morning", "afternoon", "evening"], description: "Based on time: 5am-noon=morning, noon-5pm=afternoon, 5pm+=evening" },
                    startTime: { type: "string", description: "HH:MM 24h format if mentioned" },
                    endTime: { type: "string", description: "HH:MM 24h if end time mentioned" }
                },
                required: ["title", "timeOfDay"]
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
                properties: { taskTitle: { type: "string", description: "Match from pending tasks list" } },
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

        // Notes bypass — fast path
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
            systemPrompt += "\n\nVOICE NOTES MODE: ALWAYS call update_notes with user's EXACT words. Never summarize or shorten.";
        } else if (voiceMode === 'tasks') {
            systemPrompt += "\n\nTASKS MODE: Parse and add/complete/delete tasks from user message. Be direct.";
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
                    if (toolCall.function.name === "set_alarm") {
                        if (!params.date) params.date = "";
                        if (!params.label) params.label = "Alarm";
                        if (!params.repeat) params.repeat = "once";
                    }
                    actions.push({ type: toolCall.function.name, params });
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
        const { language, taskContext, currentTime, currentDate } = req.body;
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
        console.error("Buddy intro error:", e);
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
        const hour = parseInt((currentTime || "12:00").split(':')[0]);

        const nudgeTypes = [
            { ctx: `Say hi and offer to help. ${pending > 0 ? `They have ${pending} tasks pending.` : 'No tasks yet.'}`, chips: [{ label: "➕ Add Task", action: "add_task_flow" }, { label: "📅 Plan Day", action: "plan_day_flow" }] },
            { ctx: `Encourage to complete tasks. ${pending > 0 ? `Pending: ${pendingTasks.slice(0,2).map(t=>t.title).join(', ')}` : 'All done!'}`, chips: [{ label: "✅ Mark Done", action: "check_task_flow" }, { label: "➕ Add Task", action: "add_task_flow" }] },
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
// THE KEY FIX: Smart flow that reads user input FIRST and skips questions
// if all needed info is already provided
app.post("/api/flow-step", async (req, res) => {
    try {
        const { flow, step, userInput, language, taskContext, flowData, currentTime, currentDate } = req.body;
        const { today, tomorrow, year, month, day } = getDateInfo();
        const lang = getLangRule(language);

        // ══════════════════════════════════════════════════════
        // ADD TASK FLOW
        // ══════════════════════════════════════════════════════
        if (flow === "add_task_flow") {
            if (step === "start") {
                // If user gave a task name already (e.g. clicked "Add Task" and typed something)
                // OR userInput has task info, parse it immediately
                const parsePrompt = `${lang}
User wants to add a task. Their message: "${userInput || ''}"

Extract task info if present. Reply with JSON only:
{
  "title": "task title or null if not given",
  "startTime": "HH:MM 24h or null",
  "endTime": "HH:MM 24h or null", 
  "timeOfDay": "morning/afternoon/evening or null"
}

Rules:
- "9 to 11 am" → startTime:"09:00", endTime:"11:00", timeOfDay:"morning"
- "9 to 11 pm" → startTime:"21:00", endTime:"23:00", timeOfDay:"evening"  
- "market jaana 9 am" → title:"market jaana", startTime:"09:00", timeOfDay:"morning"
- If NO title given → title: null
- If NO time given → startTime: null, timeOfDay: null (will ask)
Current time: ${currentTime}`;

                const parseRes = await callGroq([{ role: "user", content: parsePrompt }], null, false, 150);
                let parsed = {};
                try {
                    const raw = parseRes.choices[0].message.content || "{}";
                    parsed = JSON.parse(raw.replace(/```json|```/g, "").trim());
                } catch {}

                // If we have ALL info → add task immediately, done
                if (parsed.title && parsed.timeOfDay) {
                    const actions = [{
                        type: "add_task",
                        params: {
                            title: parsed.title,
                            timeOfDay: parsed.timeOfDay,
                            startTime: parsed.startTime || null,
                            endTime: parsed.endTime || null
                        }
                    }];

                    let timeStr = "";
                    if (parsed.startTime && parsed.endTime) timeStr = ` (${parsed.startTime}–${parsed.endTime})`;
                    else if (parsed.startTime) timeStr = ` at ${parsed.startTime}`;

                    const confirm = {
                        hindi: `✅ "${parsed.title}" add ho gaya${timeStr}!`,
                        english: `✅ Added "${parsed.title}"${timeStr}!`,
                        hinglish: `✅ "${parsed.title}" add ho gaya${timeStr}!`
                    };

                    return res.json({
                        message: confirm[language] || confirm.hinglish,
                        actions,
                        nextStep: "done",
                        quickActions: [
                            { label: "➕ Add Another", action: "add_task_flow" },
                            { label: "✅ Mark Done", action: "check_task_flow" },
                            { label: "📅 Plan Day", action: "plan_day_flow" }
                        ]
                    });
                }

                // If we have title but no time — ask for time
                if (parsed.title && !parsed.timeOfDay) {
                    return res.json({
                        message: language === "english"
                            ? `Got it! When do you want to do "${parsed.title}"? Morning, afternoon, evening, or a specific time like 9am?`
                            : `"${parsed.title}" — kab karna hai? Morning, afternoon, ya specific time jaise 9am?`,
                        nextStep: "ask_time",
                        flow: "add_task_flow",
                        flowData: { title: parsed.title }
                    });
                }

                // No title at all — ask for it
                return res.json({
                    message: language === "english"
                        ? "What task do you want to add? 🤔"
                        : language === "hindi"
                        ? "कौन सा task add करना है?"
                        : "Kya task add karna hai? 🤔",
                    nextStep: "ask_title",
                    flow: "add_task_flow",
                    flowData: {}
                });
            }

            if (step === "ask_title") {
                // User just gave the title — now check if time is in it too
                const parsePrompt = `${lang}
User said: "${userInput}"
Extract: task title and optionally a time.
JSON only: { "title": "...", "startTime": "HH:MM or null", "endTime": "HH:MM or null", "timeOfDay": "morning/afternoon/evening or null" }
Rules: "9 to 11 am" → startTime:"09:00" endTime:"11:00" timeOfDay:"morning"
Current time: ${currentTime}`;

                const parseRes = await callGroq([{ role: "user", content: parsePrompt }], null, false, 100);
                let parsed = { title: userInput };
                try {
                    const raw = parseRes.choices[0].message.content || "{}";
                    parsed = { title: userInput, ...JSON.parse(raw.replace(/```json|```/g, "").trim()) };
                } catch {}

                if (parsed.timeOfDay) {
                    // Has time too — add immediately
                    return res.json({
                        message: language === "english" ? `✅ Added "${parsed.title}"!` : `✅ "${parsed.title}" add ho gaya!`,
                        actions: [{ type: "add_task", params: { title: parsed.title, timeOfDay: parsed.timeOfDay, startTime: parsed.startTime || null, endTime: parsed.endTime || null } }],
                        nextStep: "done",
                        quickActions: [{ label: "➕ Add Another", action: "add_task_flow" }, { label: "✅ Mark Done", action: "check_task_flow" }]
                    });
                }

                // No time — ask for it
                return res.json({
                    message: language === "english"
                        ? `"${parsed.title}" — morning, afternoon, evening, or specific time like 3pm?`
                        : `"${parsed.title}" — morning, afternoon, evening, ya specific time jaise 3pm?`,
                    nextStep: "ask_time",
                    flow: "add_task_flow",
                    flowData: { title: parsed.title }
                });
            }

            if (step === "ask_time") {
                const title = flowData.title || "task";
                const timePrompt = `User said: "${userInput}" when asked about time for task "${title}".
Parse to: { "timeOfDay": "morning/afternoon/evening", "startTime": "HH:MM or null", "endTime": "HH:MM or null" }
Rules: morning=5am-noon, afternoon=noon-5pm, evening=5pm+. "9 to 11 am"→09:00,11:00,morning. "9 to 11 pm"→21:00,23:00,evening
JSON only. Current time: ${currentTime}`;

                const parseRes = await callGroq([{ role: "user", content: timePrompt }], null, false, 100);
                let parsed = { timeOfDay: "morning", startTime: null, endTime: null };
                try {
                    const raw = parseRes.choices[0].message.content || "{}";
                    parsed = { ...parsed, ...JSON.parse(raw.replace(/```json|```/g, "").trim()) };
                } catch {}

                let timeStr = "";
                if (parsed.startTime && parsed.endTime) timeStr = ` (${parsed.startTime}–${parsed.endTime})`;
                else if (parsed.startTime) timeStr = ` at ${parsed.startTime}`;

                return res.json({
                    message: language === "english" ? `✅ Added "${title}"${timeStr}!` : `✅ "${title}" add ho gaya${timeStr}!`,
                    actions: [{ type: "add_task", params: { title, timeOfDay: parsed.timeOfDay, startTime: parsed.startTime, endTime: parsed.endTime } }],
                    nextStep: "done",
                    quickActions: [{ label: "➕ Add Another", action: "add_task_flow" }, { label: "✅ Mark Done", action: "check_task_flow" }, { label: "📅 Plan Day", action: "plan_day_flow" }]
                });
            }
        }

        // ══════════════════════════════════════════════════════
        // ALARM FLOW
        // ══════════════════════════════════════════════════════
        if (flow === "alarm_flow") {
            if (step === "start") {
                // Parse what user said for alarm info
                const parsePrompt = `${lang}
User wants to set an alarm. Their message: "${userInput || ''}"
TODAY: ${year}-${month}-${day} | TOMORROW: ${tomorrow}

Extract alarm info. JSON only:
{
  "time": "HH:MM 24h or null",
  "date": "YYYY-MM-DD or empty string",
  "label": "what alarm is for or 'Alarm'",
  "ampm_clear": true/false (is AM/PM clear from context?)
}

Rules:
- "5 am" → time:"05:00", ampm_clear:true
- "5 pm" → time:"17:00", ampm_clear:true  
- "1 am" → time:"01:00"
- "1 pm" → time:"13:00"
- "7" or "7 baje" (no AM/PM) → time:"07:00", ampm_clear:false
- "tomorrow" → date:"${tomorrow}"
- "today" → date:"${year}-${month}-${day}"
- no date mentioned → date:""`;

                const parseRes = await callGroq([{ role: "user", content: parsePrompt }], null, false, 150);
                let parsed = {};
                try {
                    const raw = parseRes.choices[0].message.content || "{}";
                    parsed = JSON.parse(raw.replace(/```json|```/g, "").trim());
                } catch {}

                // Have time and AM/PM is clear → set alarm immediately
                if (parsed.time && parsed.ampm_clear !== false) {
                    return res.json({
                        message: language === "english"
                            ? `⏰ Alarm set for ${parsed.time}${parsed.date ? ' on ' + parsed.date : ''}! "${parsed.label || 'Alarm'}"`
                            : `⏰ Alarm set ho gaya ${parsed.time} pe${parsed.date ? ' ' + parsed.date + ' ko' : ''}! "${parsed.label || 'Alarm'}"`,
                        actions: [{ type: "set_alarm", params: { time: parsed.time, date: parsed.date || "", label: parsed.label || "Alarm", repeat: "once" } }],
                        nextStep: "done",
                        quickActions: [{ label: "➕ Add Task", action: "add_task_flow" }, { label: "🔔 Reminder", action: "reminder_flow" }]
                    });
                }

                // Have time but AM/PM ambiguous → ask
                if (parsed.time) {
                    const hour12 = parseInt(parsed.time.split(':')[0]) % 12 || 12;
                    return res.json({
                        message: language === "english" ? `${hour12} AM or PM?` : `${hour12} baje AM hai ya PM?`,
                        nextStep: "ask_ampm",
                        flow: "alarm_flow",
                        flowData: { time: parsed.time, date: parsed.date || "", label: parsed.label || "Alarm" }
                    });
                }

                // No time at all → ask
                return res.json({
                    message: language === "english"
                        ? "What time should I set the alarm? ⏰"
                        : language === "hindi" ? "किस समय का alarm set करूं? ⏰"
                        : "Konse time ka alarm set karu? ⏰",
                    nextStep: "ask_time",
                    flow: "alarm_flow",
                    flowData: {}
                });
            }

            if (step === "ask_time") {
                const parsePrompt = `User said "${userInput}" for alarm time. TODAY:${year}-${month}-${day} TOMORROW:${tomorrow}
Parse: { "time":"HH:MM 24h", "date":"YYYY-MM-DD or ''", "label":"Alarm", "ampm_clear":true/false }
JSON only.`;
                const parseRes = await callGroq([{ role: "user", content: parsePrompt }], null, false, 100);
                let parsed = { time: null, date: "", label: "Alarm", ampm_clear: true };
                try { parsed = { ...parsed, ...JSON.parse(parseRes.choices[0].message.content.replace(/```json|```/g, "").trim()) }; } catch {}

                if (parsed.time && parsed.ampm_clear !== false) {
                    return res.json({
                        message: language === "english" ? `⏰ Alarm set for ${parsed.time}!` : `⏰ Alarm set ho gaya ${parsed.time} pe!`,
                        actions: [{ type: "set_alarm", params: { time: parsed.time, date: parsed.date || "", label: parsed.label || "Alarm", repeat: "once" } }],
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
                        flowData: { time: parsed.time, date: parsed.date || "", label: parsed.label || "Alarm" }
                    });
                }
                return res.json({ message: "Please give a valid time, like 7am or 9:30pm", nextStep: "ask_time", flow: "alarm_flow", flowData: {} });
            }

            if (step === "ask_ampm") {
                const isAM = /am|subah|morning|सुबह/i.test(userInput);
                const isPM = /pm|raat|sham|evening|shaam|night|दोपहर|शाम/i.test(userInput);
                let time = flowData.time || "07:00";
                const [h] = time.split(':').map(Number);

                if (isPM && h < 12) time = `${String(h + 12).padStart(2, '0')}:${time.split(':')[1]}`;
                else if (isAM && h === 12) time = `00:${time.split(':')[1]}`;

                return res.json({
                    message: language === "english" ? `⏰ Alarm set for ${time}!` : `⏰ Alarm set ho gaya ${time} pe!`,
                    actions: [{ type: "set_alarm", params: { time, date: flowData.date || "", label: flowData.label || "Alarm", repeat: "once" } }],
                    nextStep: "done",
                    quickActions: [{ label: "➕ Add Task", action: "add_task_flow" }, { label: "🔔 Reminder", action: "reminder_flow" }]
                });
            }
        }

        // ══════════════════════════════════════════════════════
        // REMINDER FLOW
        // ══════════════════════════════════════════════════════
        if (flow === "reminder_flow") {
            if (step === "start") {
                const parsePrompt = `User wants reminder. Message: "${userInput || ''}"
Current time: ${currentTime}
Parse: { "time":"HH:MM 24h or null", "message":"what to remind or null" }
"in 5 min" → add 5 mins to ${currentTime}. JSON only.`;
                const parseRes = await callGroq([{ role: "user", content: parsePrompt }], null, false, 100);
                let parsed = {};
                try { parsed = JSON.parse(parseRes.choices[0].message.content.replace(/```json|```/g, "").trim()); } catch {}

                if (parsed.time && parsed.message) {
                    return res.json({
                        message: language === "english" ? `🔔 Reminder set for ${parsed.time}!` : `🔔 Reminder set ho gaya ${parsed.time} pe!`,
                        actions: [{ type: "set_reminder", params: { time: parsed.time, message: parsed.message } }],
                        nextStep: "done",
                        quickActions: [{ label: "⏰ Set Alarm", action: "alarm_flow" }, { label: "➕ Add Task", action: "add_task_flow" }]
                    });
                }

                if (parsed.time) {
                    return res.json({
                        message: language === "english" ? "What should I remind you about?" : "Kya yaad dilana hai?",
                        nextStep: "ask_what",
                        flow: "reminder_flow",
                        flowData: { time: parsed.time }
                    });
                }

                return res.json({
                    message: language === "english" ? "When should I remind you? (e.g. in 10 min, or 3pm)" : "Kab remind karoon? (jaise 10 min mein, ya 3 baje)",
                    nextStep: "ask_when",
                    flow: "reminder_flow",
                    flowData: { message: parsed.message }
                });
            }

            if (step === "ask_when") {
                const parsePrompt = `User said "${userInput}" for reminder time. Current: ${currentTime}
Parse: { "time":"HH:MM 24h" }. "in 5 min" = current+5. JSON only.`;
                const parseRes = await callGroq([{ role: "user", content: parsePrompt }], null, false, 60);
                let time = currentTime;
                try { time = JSON.parse(parseRes.choices[0].message.content.replace(/```json|```/g, "").trim()).time || currentTime; } catch {}

                const reminderMsg = flowData.message || userInput;
                return res.json({
                    message: language === "english" ? `🔔 Reminder set for ${time}!` : `🔔 Reminder set ho gaya ${time} pe!`,
                    actions: [{ type: "set_reminder", params: { time, message: reminderMsg } }],
                    nextStep: "done",
                    quickActions: [{ label: "⏰ Set Alarm", action: "alarm_flow" }, { label: "➕ Add Task", action: "add_task_flow" }]
                });
            }

            if (step === "ask_what") {
                return res.json({
                    message: language === "english" ? `🔔 Reminder set for ${flowData.time}!` : `🔔 Reminder set ho gaya ${flowData.time} pe!`,
                    actions: [{ type: "set_reminder", params: { time: flowData.time, message: userInput } }],
                    nextStep: "done",
                    quickActions: [{ label: "⏰ Set Alarm", action: "alarm_flow" }, { label: "➕ Add Task", action: "add_task_flow" }]
                });
            }
        }

        // ══════════════════════════════════════════════════════
        // CHECK TASK FLOW (mark done)
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

                // If userInput already contains a task name, match it
                if (userInput) {
                    const matchedTask = pendingTasks.find(t =>
                        t.title.toLowerCase().includes(userInput.toLowerCase()) ||
                        userInput.toLowerCase().includes(t.title.toLowerCase())
                    );
                    if (matchedTask) {
                        return res.json({
                            message: language === "english" ? `🎉 "${matchedTask.title}" done! Great work!` : `🎉 "${matchedTask.title}" ho gaya! Shabaash!`,
                            actions: [{ type: "complete_task", params: { taskTitle: matchedTask.title } }],
                            nextStep: "done",
                            quickActions: pending > 1 ? [{ label: "✅ Mark Another Done", action: "check_task_flow" }, { label: "📅 Plan Remaining", action: "plan_day_flow" }] : [{ label: "📅 Plan Day", action: "plan_day_flow" }]
                        });
                    }
                }

                const taskList = pendingTasks.slice(0, 5).map((t, i) => `${i + 1}. "${t.title}"`).join('\n');
                return res.json({
                    message: language === "english"
                        ? `Which task did you finish?\n${taskList}`
                        : `Kaun sa task complete hua?\n${taskList}`,
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
                        message: language === "english" ? `🎉 "${matchedTask.title}" done! Great work!` : `🎉 "${matchedTask.title}" ho gaya! Shabaash!`,
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
                        message: language === "english"
                            ? "No tasks yet! Let's add some first. What do you want to accomplish today?"
                            : "Abhi koi task nahi hai! Pehle kuch add karte hain. Aaj kya karna hai?",
                        nextStep: "done",
                        quickActions: [{ label: "➕ Add Task", action: "add_task_flow" }]
                    });
                }

                const taskList = pendingTasks.map(t => `"${t.title}"${t.startTime ? ` at ${t.startTime}` : ''}`).join(', ');
                const planPrompt = `${lang}
User has these pending tasks: ${taskList}. Current time: ${currentTime}.
Give a SHORT specific plan (max 4 lines): which task to start NOW and in what order.
Be direct and encouraging. No long paragraphs.`;

                const planRes = await callGroq([{ role: "user", content: planPrompt }], null, true, 200);
                const plan = planRes.choices[0].message.content?.trim();

                return res.json({
                    message: plan,
                    nextStep: "done",
                    quickActions: [
                        { label: "✅ Mark Task Done", action: "check_task_flow" },
                        { label: "➕ Add Task", action: "add_task_flow" }
                    ]
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

        // Fallback — route to advanced-chat
        return res.json({
            message: "Hmm, let me help you with that!",
            nextStep: "done",
            quickActions: [
                { label: "➕ Add Task", action: "add_task_flow" },
                { label: "⏰ Set Alarm", action: "alarm_flow" },
                { label: "📅 Plan Day", action: "plan_day_flow" }
            ]
        });

    } catch (error) {
        console.error("Flow step error:", error);
        res.status(500).json({ error: "Something went wrong" });
    }
});

// ─── POST /api/proactive-monitor ───────────────────────────
app.post("/api/proactive-monitor", async (req, res) => {
    try {
        const { language, taskContext, currentTime, monitorType } = req.body;
        const { total, completed, pending, pendingTasks } = taskContext;

        if (total === 0) return res.json({ shouldNotify: false });

        const prompts = {
            morning_kickoff: {
                hinglish: `Good morning! Aaj ${pending} tasks pending hain. ${pendingTasks[0] ? `"${pendingTasks[0].title}" se shuru karo!` : 'Shuru karo!'}`,
                english: `Good morning! You have ${pending} tasks today. Start with "${pendingTasks[0]?.title || 'your first task'}"!`,
                hindi: `सुप्रभात! आज ${pending} tasks बाकी हैं।`
            },
            overdue_check: {
                hinglish: `${pending} tasks abhi bhi pending hain. Koi ek complete kar lo!`,
                english: `You still have ${pending} tasks pending. Can you finish one now?`,
                hindi: `${pending} tasks अभी भी बाकी हैं।`
            },
            end_of_day: {
                hinglish: `Din khatam ho raha hai! ${completed}/${total} tasks complete kiye. Baaki kal ke liye plan karo?`,
                english: `Day's ending! ${completed}/${total} tasks done. Plan the rest for tomorrow?`,
                hindi: `दिन खत्म होने वाला है! ${completed}/${total} tasks पूरे हुए।`
            }
        };

        const msg = prompts[monitorType]?.[language] || prompts[monitorType]?.hinglish;

        res.json({
            shouldNotify: true,
            message: msg,
            quickActions: [
                { label: "✅ Mark Done", action: "check_task_flow" },
                { label: "📅 View Plan", action: "plan_day_flow" }
            ]
        });
    } catch (e) {
        res.json({ shouldNotify: false });
    }
});

// ─── Static endpoints ───────────────────────────────────────
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
        hinglish: `🤔 "${task.title}" ho gaya kya? Agar nahi to main help kar sakta hoon!`,
        hindi: `🤔 "${task.title}" हो गया क्या?`,
        english: `🤔 Did you finish "${task.title}"?`
    };
    res.json({ message: msgs[language] || msgs.hinglish });
});

app.post("/api/proactive-checkin", async (req, res) => {
    const { type, language, taskContext } = req.body;
    const { total, completed, pending } = taskContext;
    const msgs = {
        morning: { hinglish: `Morning! Aaj ${total} tasks hain. Kaunsa pehle?`, english: `Morning! ${total} tasks today. Which one first?`, hindi: `सुप्रभात! ${total} tasks आज।` },
        evening: { hinglish: `Shaam ho gayi! ${completed}/${total} done.`, english: `Evening! ${completed}/${total} done.`, hindi: `शाम हो गयी! ${completed}/${total} पूरे।` }
    };
    res.json({ message: msgs[type]?.[language] || msgs.morning?.hinglish });
});

app.listen(PORT, () => console.log(`🚀 Buddy server running on port ${PORT}`));