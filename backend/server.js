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

// ─── Multi-model rotation ── only live Groq models (Feb 2026) ──
// fast  = lightweight, for JSON parsing / confirmations
// smart = capable,    for planning / reasoning / conversations
const FAST_MODELS = [
    "llama-3.1-8b-instant",
    "meta-llama/llama-4-scout-17b-16e-instruct"
];
const SMART_MODELS = [
    "llama-3.3-70b-versatile",
    "meta-llama/llama-4-maverick-17b-128e-instruct"
];

let fastIdx = 0;
let smartIdx = 0;

function getNextModel(priority = "balanced") {
    if (priority === "fast") {
        const m = FAST_MODELS[fastIdx % FAST_MODELS.length];
        fastIdx++;
        return m;
    }
    const m = SMART_MODELS[smartIdx % SMART_MODELS.length];
    smartIdx++;
    return m;
}

async function callGroq(messages, tools = null, temperature = 0.7, maxTokens = 800, priority = "balanced") {
    const model = getNextModel(priority);
    console.log(`🤖 Using model: ${model}`);
    const params = { model, messages, temperature, max_tokens: maxTokens };
    if (tools && tools.length > 0) { params.tools = tools; params.tool_choice = "auto"; }

    try {
        return await groq.chat.completions.create(params);
    } catch (error) {
        const isDecomm = error.status === 400 &&
            JSON.stringify(error.error || "").includes("decommissioned");
        if (error.status === 429 || isDecomm) {
            const fallback = priority === "fast"
                ? SMART_MODELS[smartIdx % SMART_MODELS.length]
                : FAST_MODELS[fastIdx % FAST_MODELS.length];
            console.warn(`⚠️  ${error.status} on ${model} → fallback: ${fallback}`);
            params.model = fallback;
            // Remove tools if the error was a bad-request (model might not support them)
            if (isDecomm && params.tools) delete params.tools;
            return await groq.chat.completions.create(params);
        }
        throw error;
    }
}

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

// ─── POST /api/subscribe ───────────────────────────────────
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

// ─── POST /api/buddy-intro ─────────────────────────────────
// Called when user opens the chat buddy for the first time each session
app.post("/api/buddy-intro", async (req, res) => {
    try {
        const { language, taskContext, currentTime, currentDate } = req.body;
        const { total, completed, pending, pendingTasks } = taskContext;

        const hour = new Date().getHours();
        let timeGreeting = "Hey";
        if (hour < 12) timeGreeting = "Good morning";
        else if (hour < 17) timeGreeting = "Good afternoon";
        else timeGreeting = "Good evening";

        const langMap = {
            hindi: "Respond ONLY in simple, warm Hindi. No English.",
            english: "Respond ONLY in casual, friendly English.",
            hinglish: "Respond in natural Hinglish - mix Hindi and English casually like friends talk."
        };

        const systemPrompt = `You are a warm, proactive AI buddy - like a caring friend who helps with time management.
Language rule: ${langMap[language] || langMap.hinglish}

You are greeting the user for this session. Be warm, personal, and helpful.
Current time: ${currentTime}
Today's date: ${currentDate}

Task summary:
- Total tasks today: ${total}
- Completed: ${completed}
- Pending: ${pending}
${pendingTasks.length > 0 ? `- Pending tasks: ${pendingTasks.map(t => `"${t.title}"${t.startTime ? ` at ${t.startTime}` : ''}`).join(', ')}` : ''}

Your job: Give a SHORT, warm greeting that:
1. Greets based on time of day
2. Quickly mentions task status (if any tasks exist)
3. Asks ONE simple question to guide them - like "Want me to help plan your day?" or "Shall we start with your first task?"
4. Keep it under 3 sentences. Be personal. Don't list features.

If no tasks exist, ask if they want to add some tasks for today.
If all done, celebrate and ask if they want to add more or set reminders.`;

        const completion = await callGroq([
            { role: "system", content: systemPrompt },
            { role: "user", content: "greeting" }
        ], null, 0.8, 200, "fast");

        const message = completion.choices[0].message.content;

        // Also decide what quick action buttons to show
        let quickActions = [];
        if (total === 0) {
            quickActions = [
                { label: "Add Tasks", action: "add_task_flow" },
                { label: "Set Alarm", action: "alarm_flow" },
                { label: "Set Reminder", action: "reminder_flow" }
            ];
        } else if (pending > 0) {
            quickActions = [
                { label: "Plan My Day", action: "plan_day_flow" },
                { label: "Add Task", action: "add_task_flow" },
                { label: "Set Alarm", action: "alarm_flow" }
            ];
        } else {
            quickActions = [
                { label: "Add More Tasks", action: "add_task_flow" },
                { label: "Set Reminder", action: "reminder_flow" },
                { label: "Daily Notes", action: "notes_flow" }
            ];
        }

        res.json({ message, quickActions });
    } catch (error) {
        console.error("Buddy intro error:", error);
        res.status(500).json({ error: "Failed to generate intro" });
    }
});

// ─── POST /api/flow-step ───────────────────────────────────
// Handles conversational flow steps (add task, alarm, reminder guided flows)
app.post("/api/flow-step", async (req, res) => {
    try {
        const { flow, step, userInput, language, taskContext, flowData, currentTime, currentDate } = req.body;

        const langMap = {
            hindi: "Respond ONLY in simple Hindi.",
            english: "Respond ONLY in casual English.",
            hinglish: "Respond in Hinglish - casual mix of Hindi and English."
        };
        const langRule = langMap[language] || langMap.hinglish;

        let responseData = {};

        if (flow === "add_task_flow") {
            responseData = await handleAddTaskFlow(step, userInput, flowData, langRule, taskContext, currentTime);
        } else if (flow === "alarm_flow") {
            responseData = await handleAlarmFlow(step, userInput, flowData, langRule, currentDate, currentTime);
        } else if (flow === "reminder_flow") {
            responseData = await handleReminderFlow(step, userInput, flowData, langRule, currentTime);
        } else if (flow === "plan_day_flow") {
            responseData = await handlePlanDayFlow(step, userInput, flowData, langRule, taskContext, currentTime);
        } else if (flow === "notes_flow") {
            responseData = await handleNotesFlow(step, userInput, flowData, langRule);
        } else if (flow === "check_task_flow") {
            responseData = await handleCheckTaskFlow(step, userInput, flowData, langRule, taskContext);
        }

        res.json(responseData);
    } catch (error) {
        console.error("Flow step error:", error);
        res.status(500).json({ error: "Failed to process flow step" });
    }
});

// ═══════════════════════════════════════════════════════════════
// GUIDED CONVERSATIONAL FLOWS
// Each flow is a state machine:
//   "start"  → AI asks the first question
//   step X   → user answered, AI processes + asks next question
//   "done"   → flow complete, action executed
//
// The frontend keeps track of (flow, step, flowData) and passes
// them back with every user message so context is never lost.
// ═══════════════════════════════════════════════════════════════

// ─── ADD TASK FLOW ─────────────────────────────────────────
// step sequence: start → get_title → get_time → done
async function handleAddTaskFlow(step, userInput, flowData, langRule, taskContext, currentTime) {

    // STEP 1: AI asks "what task?"
    if (step === "start") {
        const hasExisting = taskContext.pendingTasks?.length > 0;
        const prompt = `You are a friendly AI task buddy. ${langRule}
The user wants to add a task. Ask them: "What task do you want to add?"
${hasExisting ? `Their existing pending tasks are: ${taskContext.pendingTasks.map(t=>t.title).join(', ')} — you can suggest something complementary.` : 'They have no tasks yet today.'}
Keep it short, warm, 1 sentence. Use emoji.`;
        const c = await callGroq([{role:"system",content:prompt},{role:"user",content:"start"}], null, 0.7, 80, "fast");
        return {
            message: c.choices[0].message.content,
            nextStep: "get_title",
            flow: "add_task_flow",
            flowData: {}
        };
    }

    // STEP 2: Got the title. Ask "what time / which part of day?"
    if (step === "get_title") {
        const title = userInput.trim();
        const prompt = `You are a friendly AI task buddy. ${langRule}
The user wants to add task: "${title}"
Current time is ${currentTime}.

Ask them WHEN they want to do it. Give clear options:
- Ask: morning (before 12), afternoon (12-5pm), or evening (after 5pm)?
- OR a specific time like "3pm", "9:30 AM"?
Keep it to 1-2 sentences. Be friendly. Use emoji.
Example: "When do you want to do it? Morning, afternoon, evening? Or a specific time like 3pm? ⏰"`;
        const c = await callGroq([{role:"system",content:prompt},{role:"user",content:title}], null, 0.7, 100, "fast");
        return {
            message: c.choices[0].message.content,
            nextStep: "get_time",
            flow: "add_task_flow",
            flowData: { title }
        };
    }

    // STEP 3: Got the time. Parse it, create the task, confirm.
    if (step === "get_time") {
        const title = flowData?.title || "New Task";
        const parsePrompt = `Parse the time info from: "${userInput}"
Current time: ${currentTime}

Rules:
- timeOfDay: "morning" if before 12:00, "afternoon" if 12:00-16:59, "evening" if 17:00+
  If user says "morning" → "morning", "afternoon" → "afternoon", "evening"/"night" → "evening"
- startTime: HH:MM 24h format if a specific time is given, else null
  "9am" → "09:00", "3pm" → "15:00", "9:30" → "09:30", "no specific time" → null
- endTime: HH:MM 24h if range given (e.g. "3-4pm" → startTime "15:00" endTime "16:00"), else null

Respond ONLY with valid JSON, nothing else:
{"timeOfDay":"morning","startTime":null,"endTime":null}`;

        const parseC = await callGroq([{role:"user",content:parsePrompt}], null, 0.1, 80, "fast");
        let parsed = { timeOfDay: "morning", startTime: null, endTime: null };
        try {
            parsed = JSON.parse(parseC.choices[0].message.content.replace(/```json|```/g,"").trim());
        } catch(e) { console.warn("Time parse failed, using morning default"); }

        const timeLabel = parsed.startTime
            ? (parsed.endTime ? `${parsed.startTime}–${parsed.endTime}` : `${parsed.startTime}`)
            : parsed.timeOfDay;

        const confirmPrompt = `You are an enthusiastic AI buddy. ${langRule}
Task "${title}" scheduled for ${timeLabel} — just added! ✅
Celebrate in 1 sentence. Then ask: "Want to add another task, set an alarm, or all good?" 
Use emoji. Keep it short.`;
        const confirmC = await callGroq([{role:"system",content:confirmPrompt},{role:"user",content:"confirm"}], null, 0.8, 100, "fast");

        return {
            message: confirmC.choices[0].message.content,
            nextStep: "done",
            flow: null,
            flowData: {},
            actions: [{
                type: "add_task",
                params: { title, timeOfDay: parsed.timeOfDay, startTime: parsed.startTime, endTime: parsed.endTime }
            }],
            quickActions: [
                { label: "➕ Add Another", action: "add_task_flow" },
                { label: "⏰ Set Alarm", action: "alarm_flow" },
                { label: "📅 Plan My Day", action: "plan_day_flow" },
                { label: "✅ All Good", action: "dismiss" }
            ]
        };
    }
    return { message: "Done!", flow: null };
}

// ─── ALARM FLOW ────────────────────────────────────────────
// step sequence: start → get_label → get_time → get_ampm (if needed) → get_date → done
async function handleAlarmFlow(step, userInput, flowData, langRule, currentDate, currentTime) {

    // STEP 1: Ask what the alarm is for
    if (step === "start") {
        const prompt = `You are a friendly AI buddy. ${langRule}
Ask the user: what is the alarm for? (e.g. wake up, meeting, medicine, workout, etc.)
1 sentence, use ⏰ emoji.`;
        const c = await callGroq([{role:"system",content:prompt},{role:"user",content:"start"}], null, 0.7, 80, "fast");
        return {
            message: c.choices[0].message.content,
            nextStep: "get_label",
            flow: "alarm_flow",
            flowData: {}
        };
    }

    // STEP 2: Got label. Ask what TIME (hour + minute)
    if (step === "get_label") {
        const label = userInput.trim();
        const prompt = `You are a friendly AI buddy. ${langRule}
The alarm is for: "${label}"
Ask what time they want it. Make sure to ask about hour AND minutes.
Example: "What time? Like 6:30, 7:00, 9:15...?" 
1 sentence, casual, use ⏰.`;
        const c = await callGroq([{role:"system",content:prompt},{role:"user",content:label}], null, 0.7, 80, "fast");
        return {
            message: c.choices[0].message.content,
            nextStep: "get_time",
            flow: "alarm_flow",
            flowData: { label }
        };
    }

    // STEP 3: Got the time digits. Check if AM/PM is clear, else ask.
    if (step === "get_time") {
        const label = flowData?.label || "Alarm";
        const rawTime = userInput.trim();

        // Try to parse time from input
        const parsePrompt = `Parse time from: "${rawTime}"
Extract hour (0-23) and minute (0-59) in 24h format.
If the input clearly states AM/PM (e.g. "6am", "7 PM", "14:30") → convert to 24h.
If it's ambiguous (e.g. "6", "6:30", "630") → set ambiguous: true.
Respond ONLY with JSON: {"hour":6,"minute":0,"ambiguous":true,"time24":"06:00"}`;

        const parseC = await callGroq([{role:"user",content:parsePrompt}], null, 0.1, 60, "fast");
        let parsed = { hour: 8, minute: 0, ambiguous: true, time24: "08:00" };
        try { parsed = JSON.parse(parseC.choices[0].message.content.replace(/```json|```/g,"").trim()); } catch(e) {}

        // If ambiguous, ask AM or PM
        if (parsed.ambiguous && parsed.hour <= 12) {
            const askPrompt = `You are a friendly AI buddy. ${langRule}
The user said the alarm time is "${rawTime}" but it's unclear if that's AM or PM.
Ask them: "Is that AM or PM?" — 1 short sentence with emoji.`;
            const c = await callGroq([{role:"system",content:askPrompt},{role:"user",content:rawTime}], null, 0.7, 60, "fast");
            return {
                message: c.choices[0].message.content,
                nextStep: "get_ampm",
                flow: "alarm_flow",
                flowData: { ...flowData, rawTime, parsedHour: parsed.hour, parsedMinute: parsed.minute }
            };
        }

        // Time is clear — ask date
        return await askAlarmDate({ ...flowData, time24: parsed.time24, label }, langRule, currentDate);
    }

    // STEP 3b: Got AM/PM clarification
    if (step === "get_ampm") {
        const isAM = /am|morning|subah/i.test(userInput);
        const isPM = /pm|evening|afternoon|shaam|raat|night/i.test(userInput);
        let hour = flowData?.parsedHour || 8;
        const minute = flowData?.parsedMinute || 0;

        if (isPM && hour < 12) hour += 12;
        else if (isAM && hour === 12) hour = 0;

        const time24 = `${String(hour).padStart(2,"0")}:${String(minute).padStart(2,"0")}`;
        return await askAlarmDate({ ...flowData, time24 }, langRule, currentDate);
    }

    // STEP 4: Got date info — finalize
    if (step === "get_date") {
        const currentYear = new Date().getFullYear();
        const tomorrowDate = new Date();
        tomorrowDate.setDate(tomorrowDate.getDate() + 1);
        const tomorrow = tomorrowDate.toISOString().slice(0, 10);

        const parsePrompt = `Parse date from: "${userInput}"
Today: ${currentDate}, Tomorrow: ${tomorrow}, Year: ${currentYear}
If "today" → "${currentDate}", if "tomorrow" → "${tomorrow}"
If "no"/"just today"/"only once"/"abhi" → ""  (empty = no specific date)
If a date like "feb 25", "25th", "march 5" → "${currentYear}-MM-DD format"
Respond ONLY with JSON: {"date":""}`;

        const parseC = await callGroq([{role:"user",content:parsePrompt}], null, 0.1, 40, "fast");
        let parsed = { date: "" };
        try { parsed = JSON.parse(parseC.choices[0].message.content.replace(/```json|```/g,"").trim()); } catch(e) {}

        const label = flowData?.label || "Alarm";
        const time24 = flowData?.time24 || "08:00";
        const dateStr = parsed.date || "";

        // Check if repeat needed
        const needsRepeat = /daily|roz|har din|everyday|repeat/i.test(userInput);
        const repeat = needsRepeat ? "daily" : "once";

        const confirmPrompt = `You are an enthusiastic AI buddy. ${langRule}
Alarm "${label}" set for ${time24}${dateStr ? " on " + dateStr : ""}${repeat === "daily" ? " (daily)" : ""}! ⏰✅
Confirm in 1 excited sentence. Then ask if they want to add a task or set a reminder too.`;
        const c = await callGroq([{role:"system",content:confirmPrompt},{role:"user",content:"confirm"}], null, 0.8, 100, "fast");

        return {
            message: c.choices[0].message.content,
            nextStep: "done",
            flow: null,
            flowData: {},
            actions: [{ type: "set_alarm", params: { time: time24, date: dateStr, label, repeat } }],
            quickActions: [
                { label: "➕ Add Task", action: "add_task_flow" },
                { label: "🔔 Set Reminder", action: "reminder_flow" },
                { label: "📅 Plan Day", action: "plan_day_flow" },
                { label: "✅ All Good", action: "dismiss" }
            ]
        };
    }
    return { message: "Alarm flow done!", flow: null };
}

// Helper: ask about alarm date
async function askAlarmDate(flowData, langRule, currentDate) {
    const prompt = `You are a friendly AI buddy. ${langRule}
Alarm time is set: ${flowData.time24} for "${flowData.label}".
Now ask: Is this for today, tomorrow, or a specific date? Or no date (just the time)?
1 sentence, casual, use emoji.
Example: "Should I set it for today, tomorrow, or a specific date? 📅"`;
    const c = await callGroq([{role:"system",content:prompt},{role:"user",content:"ask date"}], null, 0.7, 80, "fast");
    return {
        message: c.choices[0].message.content,
        nextStep: "get_date",
        flow: "alarm_flow",
        flowData
    };
}

// ─── REMINDER FLOW ─────────────────────────────────────────
// step sequence: start → get_what → get_when → done
async function handleReminderFlow(step, userInput, flowData, langRule, currentTime) {

    if (step === "start") {
        const prompt = `You are a friendly AI buddy. ${langRule}
Ask the user: what do you want to be reminded about?
1 sentence, casual. Example: "What should I remind you about? 🔔"`;
        const c = await callGroq([{role:"system",content:prompt},{role:"user",content:"start"}], null, 0.7, 60, "fast");
        return { message: c.choices[0].message.content, nextStep: "get_what", flow: "reminder_flow", flowData: {} };
    }

    if (step === "get_what") {
        const what = userInput.trim();
        const prompt = `You are a friendly AI buddy. ${langRule}
The user wants a reminder for: "${what}"
Ask WHEN: in how many minutes, or at what specific time?
Give examples: "In 5 mins? 30 mins? Or a specific time like 3pm? ⏰"
1-2 sentences.`;
        const c = await callGroq([{role:"system",content:prompt},{role:"user",content:what}], null, 0.7, 80, "fast");
        return { message: c.choices[0].message.content, nextStep: "get_when", flow: "reminder_flow", flowData: { what } };
    }

    if (step === "get_when") {
        const what = flowData?.what || userInput;
        const [ch, cm] = currentTime.split(':').map(Number);
        const nowMins = ch * 60 + cm;

        const parsePrompt = `Parse reminder timing from: "${userInput}"
Current time: ${currentTime} (${nowMins} mins from midnight)

- If "X min" or "X minutes" → minutesFromNow: X
- If specific time like "3pm", "15:30", "9am" → specificTime: "HH:MM" (24h)
- If both unclear → minutesFromNow: 10

Calculate finalTime:
- If specificTime given → finalTime = specificTime
- Else → finalTime = (${nowMins} + minutesFromNow) mod 1440, format as HH:MM

Respond ONLY with JSON:
{"minutesFromNow":null,"specificTime":null,"finalTime":"14:30"}`;

        const parseC = await callGroq([{role:"user",content:parsePrompt}], null, 0.1, 80, "fast");
        let parsed = { finalTime: currentTime, minutesFromNow: 10 };
        try { parsed = JSON.parse(parseC.choices[0].message.content.replace(/```json|```/g,"").trim()); } catch(e) {}

        // If finalTime came out wrong, recalculate
        if (!parsed.finalTime || parsed.finalTime === currentTime) {
            const mins = nowMins + (parsed.minutesFromNow || 10);
            const h = Math.floor(mins / 60) % 24;
            const m = mins % 60;
            parsed.finalTime = `${String(h).padStart(2,"0")}:${String(m).padStart(2,"0")}`;
        }

        const confirmPrompt = `You are a friendly AI buddy. ${langRule}
Reminder set for "${what}" at ${parsed.finalTime}. ✅🔔
Confirm in 1 sentence. Ask if they want to do anything else.`;
        const c = await callGroq([{role:"system",content:confirmPrompt},{role:"user",content:"confirm"}], null, 0.8, 80, "fast");

        return {
            message: c.choices[0].message.content,
            nextStep: "done",
            flow: null,
            flowData: {},
            actions: [{ type: "set_reminder", params: { time: parsed.finalTime, message: what } }],
            quickActions: [
                { label: "➕ Add Task", action: "add_task_flow" },
                { label: "⏰ Set Alarm", action: "alarm_flow" },
                { label: "✅ All Good", action: "dismiss" }
            ]
        };
    }
    return { message: "Reminder set!", flow: null };
}

// ─── PLAN DAY FLOW ─────────────────────────────────────────
async function handlePlanDayFlow(step, userInput, flowData, langRule, taskContext, currentTime) {
    const { total, completed, pending, pendingTasks } = taskContext;

    if (step === "start") {
        if (total === 0) {
            return {
                message: language_msg(langRule, "No tasks yet! Want to add some tasks first?", "Abhi koi task nahi! Pehle kuch tasks add karein?"),
                nextStep: "done",
                flow: null,
                quickActions: [
                    { label: "➕ Add Tasks", action: "add_task_flow" },
                    { label: "⏰ Set Alarm", action: "alarm_flow" }
                ]
            };
        }

        const hour = parseInt(currentTime.split(':')[0]);
        const remaining = pendingTasks
            .sort((a,b) => (a.startTime||"99:99").localeCompare(b.startTime||"99:99"))
            .map((t,i) => `${i+1}. "${t.title}"${t.startTime ? " at "+t.startTime : ""}`)
            .join("\n");

        const prompt = `You are an energetic, motivating AI coach. ${langRule}
Current time: ${currentTime}. Tasks done today: ${completed}/${total}.

Pending tasks (in order):
${remaining}

Give a SPECIFIC, actionable day plan:
- Which task to start RIGHT NOW (pick the most urgent based on time or importance)
- Brief order for the others
- End with an encouraging line

Max 4 sentences. Be like a hype coach, not a robot. Use emoji. 
DO NOT just list the tasks — give a real strategy!`;

        const c = await callGroq([{role:"system",content:prompt},{role:"user",content:"plan my day"}], null, 0.85, 300, "balanced");
        return {
            message: c.choices[0].message.content,
            nextStep: "user_response",
            flow: "plan_day_flow",
            flowData: { pendingTasks, currentTime },
            quickActions: [
                { label: "🚀 Let's Start!", action: "dismiss" },
                { label: "✅ Mark Done", action: "check_task_flow" },
                { label: "➕ Add Task", action: "add_task_flow" }
            ]
        };
    }

    if (step === "user_response") {
        const prompt = `You are a supportive AI buddy. ${langRule}
The user responded to the day plan: "${userInput}"
Pending tasks: ${taskContext.pendingTasks?.map(t=>t.title).join(", ") || "none"}

If they seem ready → encourage them to start the first task now.
If hesitant/blocked → break down the FIRST pending task into 3 micro-steps.
Max 3 sentences. Use emoji.`;

        const c = await callGroq([{role:"system",content:prompt},{role:"user",content:userInput}], null, 0.8, 200, "fast");
        return {
            message: c.choices[0].message.content,
            nextStep: "done",
            flow: null,
            quickActions: [
                { label: "✅ Mark Task Done", action: "check_task_flow" },
                { label: "➕ Add Task", action: "add_task_flow" }
            ]
        };
    }
    return { message: "Plan ready!", flow: null };
}

// Helper: language-aware message
function language_msg(langRule, eng, hinglish) {
    if (/ONLY in English/i.test(langRule)) return eng;
    return hinglish;
}

// ─── NOTES FLOW ────────────────────────────────────────────
async function handleNotesFlow(step, userInput, flowData, langRule) {
    if (step === "start") {
        const prompt = `You are a friendly AI buddy. ${langRule}
Ask: "What do you want to write in your daily notes? 📝"
1 sentence only.`;
        const c = await callGroq([{role:"system",content:prompt},{role:"user",content:"start"}], null, 0.7, 60, "fast");
        return { message: c.choices[0].message.content, nextStep: "get_note", flow: "notes_flow", flowData: {} };
    }

    if (step === "get_note") {
        const prompt = `You are a friendly AI buddy. ${langRule}
Note saved! ✅📝 Confirm in 1 short sentence and ask if they want to add more or do something else.`;
        const c = await callGroq([{role:"system",content:prompt},{role:"user",content:userInput}], null, 0.7, 80, "fast");
        return {
            message: c.choices[0].message.content,
            nextStep: "done",
            flow: null,
            actions: [{ type: "update_notes", params: { content: userInput, mode: "append" } }],
            quickActions: [
                { label: "📝 Add More", action: "notes_flow" },
                { label: "➕ Add Task", action: "add_task_flow" },
                { label: "✅ Done", action: "dismiss" }
            ]
        };
    }
    return { message: "Note saved!", flow: null };
}

// ─── CHECK TASK FLOW ───────────────────────────────────────
async function handleCheckTaskFlow(step, userInput, flowData, langRule, taskContext) {
    const pending = taskContext.pendingTasks || [];

    if (step === "start") {
        if (pending.length === 0) {
            return {
                message: "🎉 All tasks done! Amazing work today!",
                nextStep: "done",
                flow: null,
                quickActions: [
                    { label: "➕ Add More", action: "add_task_flow" },
                    { label: "📝 Write Notes", action: "notes_flow" }
                ]
            };
        }

        const taskList = pending.map((t,i) => `${i+1}. "${t.title}"${t.startTime?" at "+t.startTime:""}`).join("\n");
        const prompt = `You are an encouraging AI buddy. ${langRule}
Pending tasks:
${taskList}

Ask which one got done! Be specific — name the first task as a suggestion.
Example: "Which task got done? Was it \"${pending[0]?.title}\"? ✅"
1-2 sentences, use emoji.`;

        const c = await callGroq([{role:"system",content:prompt},{role:"user",content:"check"}], null, 0.7, 100, "fast");
        return {
            message: c.choices[0].message.content,
            nextStep: "get_completed_task",
            flow: "check_task_flow",
            flowData: { pendingTasks: pending }
        };
    }

    if (step === "get_completed_task") {
        const pendingList = flowData?.pendingTasks || pending;

        // Smart match
        const matchPrompt = `Task list: ${JSON.stringify(pendingList.map(t=>t.title))}
User said: "${userInput}"
Which task title best matches? Reply ONLY with the exact title from the list.
If none match at all, reply: NONE`;

        const matchC = await callGroq([{role:"user",content:matchPrompt}], null, 0.1, 40, "fast");
        const matchedRaw = matchC.choices[0].message.content.trim().replace(/^"|"$/g,"");

        const matchedTask = pendingList.find(t =>
            t.title.toLowerCase() === matchedRaw.toLowerCase() ||
            t.title.toLowerCase().includes(matchedRaw.toLowerCase()) ||
            matchedRaw.toLowerCase().includes(t.title.toLowerCase())
        );

        if (!matchedTask || matchedRaw === "NONE") {
            const taskNames = pendingList.map(t=>`"${t.title}"`).join(", ");
            return {
                message: `Hmm, I couldn't find that. Pending: ${taskNames}. Which one? 🤔`,
                nextStep: "get_completed_task",
                flow: "check_task_flow",
                flowData
            };
        }

        const remaining = pendingList.length - 1;
        const celebratePrompt = `You are an enthusiastic AI buddy. ${langRule}
"${matchedTask.title}" is DONE! 🎉
Celebrate big in 1-2 sentences! ${remaining > 0 ? `${remaining} tasks still pending — ask if they want to mark another.` : "All tasks complete! Celebrate hugely!"}`;

        const c = await callGroq([{role:"system",content:celebratePrompt},{role:"user",content:"celebrate"}], null, 0.9, 120, "fast");

        return {
            message: c.choices[0].message.content,
            nextStep: "done",
            flow: null,
            actions: [{ type: "complete_task", params: { taskTitle: matchedTask.title } }],
            quickActions: remaining > 0
                ? [{ label: "✅ Mark Another", action: "check_task_flow" }, { label: "➕ Add Task", action: "add_task_flow" }]
                : [{ label: "➕ Add More Tasks", action: "add_task_flow" }, { label: "📝 Write Notes", action: "notes_flow" }]
        };
    }
    return { message: "Done!", flow: null };
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

        // 🎯 NOTES BYPASS
        const lastUserMessage = messages[messages.length - 1]?.content || "";
        const isNotesRequest = /notes?\s+mein|daily\s+notes|meri\s+daily|mere\s+daily|diary\s+mein/i.test(lastUserMessage);

        if (isNotesRequest) {
            console.log("🎯 NOTES DETECTED - BYPASSING AI");
            let content = lastUserMessage
                .replace(/^\s*(bhai\s+)?add\s+kar\s+(de|do)\s*/gi, '')
                .replace(/^\s*notes?\s+mein\s+(add\s+kar\s+do|likh\s+do)\s*/gi, '')
                .replace(/^\s*(meri|mere)\s+daily\s+notes?\s+mein\s+(add\s+kar\s+do|likh\s+do)\s*/gi, '')
                .replace(/^\s*daily\s+notes?\s+mein\s+(add\s+kar\s+do|likh\s+do)\s*/gi, '')
                .replace(/^\s*diary\s+mein\s+add\s+kar\s+do\s*/gi, '')
                .replace(/\s*-?\s*notes?\s+mein\s+(add\s+kar\s+do|likh\s+do)\s*$/gi, '')
                .replace(/\s*-?\s*(meri|mere)\s+daily\s+notes?\s+mein\s+(add\s+kar\s+do|likh\s+do)\s*$/gi, '')
                .replace(/\s*-?\s*daily\s+notes?\s+mein\s+(add\s+kar\s+do|likh\s+do)\s*$/gi, '')
                .trim();

            return res.json({
                type: "actions",
                message: language === "hindi" ? "📝 नोट्स में add हो गया!" : language === "english" ? "📝 Added to your notes!" : "📝 Notes mein add ho gaya!",
                actions: [{ type: "update_notes", params: { content: content, mode: "append" } }]
            });
        }

        const { total, completed, pending, pendingTasks, completedTasks } = taskContext;
        const currentTime = new Date().toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit', hour12: false });
        const currentYear = new Date().getFullYear();
        const currentMonth = String(new Date().getMonth() + 1).padStart(2, '0');
        const currentDay = String(new Date().getDate()).padStart(2, '0');
        const tomorrowDate = new Date();
        tomorrowDate.setDate(tomorrowDate.getDate() + 1);
        const tomorrow = tomorrowDate.toISOString().slice(0, 10);

        const langGuide = {
            hindi: { tone: "Simple, friendly Hindi.", rule: "Sirf Hindi mein jawab do." },
            english: { tone: "Casual, warm English.", rule: "Reply ONLY in English." },
            hinglish: { tone: "Natural Hindi + English mix.", rule: "Mix Hindi and English naturally." }
        };
        const lang = langGuide[language] || langGuide.hinglish;

        let taskSnapshot = total === 0 ? `The user has NO tasks added for today yet.` :
            `TODAY: Total=${total} | Done=${completed} | Pending=${pending}
Pending: ${pendingTasks.map(t => `"${t.title}"${t.startTime ? ` at ${t.startTime}` : ''}`).join(', ')}`;

        const systemPrompt = `You are a caring, proactive AI buddy for time management. Make sure ALL TASKS GET COMPLETED.

LANGUAGE: ${lang.rule}
Style: ${lang.tone}

${taskSnapshot}

CURRENT TIME: ${currentTime}
TODAY: ${currentYear}-${currentMonth}-${currentDay}
TOMORROW: ${tomorrow}

TOOL USAGE:
- set_alarm: for alarms/wake-up calls
- set_reminder: for quick reminders ("remind me in X mins")
- add_task: for adding tasks to the list
- complete_task: when user says done/ho gaya
- delete_task: for removing tasks
- update_notes: for adding to daily notes

CRITICAL: When user says yes/confirm to add task, alarm, or reminder - ALWAYS call the appropriate tool.
Keep replies SHORT (1-2 sentences). Be motivating!`.trim();

        let finalSystemPrompt = systemPrompt;
        if (isVoice && voiceMode === 'notes') {
            finalSystemPrompt += `\n\nVOICE NOTES MODE: ALWAYS call update_notes with user's EXACT words. Never summarize.`;
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
                            time: { type: "string", description: "Time HH:MM 24-hour" },
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
                    description: "Set an alarm",
                    parameters: {
                        type: "object",
                        properties: {
                            time: { type: "string", description: "HH:MM 24-hour" },
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
                    description: "Update daily notes with user's EXACT words",
                    parameters: {
                        type: "object",
                        properties: {
                            content: { type: "string", description: "User's exact words, no changes" },
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
                    description: "Add task to list",
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
                        properties: { taskTitle: { type: "string" } },
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
                        properties: { taskTitle: { type: "string" } },
                        required: ["taskTitle"]
                    }
                }
            }
        ];

        const completion = await callGroq(
            [
                { role: "system", content: finalSystemPrompt },
                ...recentMessages.map(m => ({ role: m.role, content: m.content }))
            ],
            tools,
            0.7,
            1000,
            "balanced"
        );

        const response = completion.choices[0];
        const actions = [];

        if (response.message.tool_calls) {
            for (const toolCall of response.message.tool_calls) {
                try {
                    const params = JSON.parse(toolCall.function.arguments);

                    if (toolCall.function.name === "set_alarm") {
                        if (params.date === null || params.date === undefined) params.date = "";
                        if (!params.label) params.label = "Alarm";
                        if (!params.repeat) params.repeat = "once";
                    }

                    if (toolCall.function.name === "update_notes" && voiceMode === 'notes') {
                        const userMessage = recentMessages[recentMessages.length - 1]?.content || "";
                        const cleanedUserMsg = userMessage
                            .replace(/bhai add kar de/gi, '')
                            .replace(/notes? mein add kar do/gi, '')
                            .replace(/meri daily notes? mein add kar do/gi, '')
                            .replace(/daily notes? mein add kar do/gi, '')
                            .trim();

                        const userWordCount = cleanedUserMsg.split(/\s+/).length;
                        const noteWordCount = (params.content || "").split(/\s+/).length;

                        if (noteWordCount < userWordCount * 0.7) {
                            params.content = cleanedUserMsg;
                        }
                    }

                    actions.push({ type: toolCall.function.name, params });
                } catch (parseError) {
                    console.error("Parse error:", parseError);
                }
            }
        }

        const reply = response.message.content || (actions.length > 0 ? "Done!" : "Hmm...");

        res.json({
            type: actions.length > 0 ? "actions" : "message",
            message: reply,
            actions
        });

    } catch (error) {
        console.error("Advanced chat error:", error);
        res.status(500).json({ error: "Something went wrong" });
    }
});

// ─── POST /api/buddy-nudge ─────────────────────────────────
// Returns a rotating set of context-aware nudge cards shown
// as speech-bubble popups on the floating blob when chat is closed.
app.post("/api/buddy-nudge", async (req, res) => {
    try {
        const { language, taskContext, currentTime, nudgeIndex } = req.body;
        const { total, completed, pending, pendingTasks } = taskContext;
        const hour = parseInt((currentTime || "12:00").split(':')[0]);

        const langMap = {
            hindi: "Respond ONLY in simple Hindi (2 sentences max).",
            english: "Respond ONLY in casual English (2 sentences max).",
            hinglish: "Respond in casual Hinglish — mix Hindi+English (2 sentences max)."
        };
        const langRule = langMap[language] || langMap.hinglish;

        // Rotate through 4 nudge types based on index
        const idx = (nudgeIndex || 0) % 4;
        const timeStr = hour < 12 ? "morning" : hour < 17 ? "afternoon" : "evening";

        let systemPrompt = "";
        let quickActions = [];

        if (idx === 0) {
            // Introduce yourself + task status
            systemPrompt = `You are a cute, warm AI buddy widget. ${langRule}
Introduce yourself briefly and mention task status.
${total === 0 ? "User has no tasks yet today." : `User has ${pending} pending tasks, ${completed} done.`}
Example tone: "Hey, I'm your buddy! 👋 You have ${pending} tasks today — want to plan them?"
Be SHORT (1-2 sentences), warm, friendly. Use 1 emoji.`;
            quickActions = [
                { label: "📅 Plan My Day", action: "plan_day_flow" },
                { label: "➕ Add Task", action: "add_task_flow" }
            ];
        } else if (idx === 1) {
            // Task nudge
            systemPrompt = `You are a cute AI buddy. ${langRule}
${pending > 0
    ? `User has ${pending} pending task(s): ${pendingTasks.slice(0,2).map(t=>t.title).join(', ')}.
       Nudge them to get started. Be casual, warm. 1-2 sentences.`
    : `User completed all ${completed} tasks! Celebrate briefly and suggest adding tomorrow's tasks.`}
Use 1 emoji. Be SHORT.`;
            quickActions = pending > 0
                ? [{ label: "✅ Mark Done", action: "check_task_flow" }, { label: "➕ Add Task", action: "add_task_flow" }]
                : [{ label: "➕ Add Tasks", action: "add_task_flow" }, { label: "📝 Write Notes", action: "notes_flow" }];
        } else if (idx === 2) {
            // How was your day / notes nudge
            systemPrompt = `You are a caring AI buddy. ${langRule}
It's ${timeStr}. Ask the user how their day is going and suggest writing thoughts in daily notes.
Be warm, conversational. 1-2 sentences. 1 emoji.`;
            quickActions = [
                { label: "📝 Add to Notes", action: "notes_flow" },
                { label: "💬 Chat with me", action: "open_chat" }
            ];
        } else {
            // Reminder / alarm nudge
            systemPrompt = `You are a helpful AI buddy. ${langRule}
It's ${timeStr}. Suggest setting a reminder or alarm for something important.
Be helpful, casual. 1-2 sentences. 1 emoji.`;
            quickActions = [
                { label: "⏰ Set Alarm", action: "alarm_flow" },
                { label: "🔔 Set Reminder", action: "reminder_flow" }
            ];
        }

        const completion = await callGroq(
            [{ role: "system", content: systemPrompt }, { role: "user", content: "generate" }],
            null, 0.85, 80, "fast"
        );

        res.json({
            message: completion.choices[0].message.content,
            quickActions,
            nudgeIndex: (idx + 1) % 4
        });
    } catch (error) {
        console.error("Buddy nudge error:", error);
        // Fallback nudges (static) if AI fails
        const fallbacks = [
            { message: "Hey! 👋 I'm your AI buddy — tap to chat!", quickActions: [{ label: "➕ Add Task", action: "add_task_flow" }, { label: "📅 Plan Day", action: "plan_day_flow" }] },
            { message: "Got tasks pending? I can help you plan! 🎯", quickActions: [{ label: "✅ Mark Done", action: "check_task_flow" }, { label: "➕ Add Task", action: "add_task_flow" }] },
            { message: "How's your day going? 💬 Write it in notes!", quickActions: [{ label: "📝 Notes", action: "notes_flow" }, { label: "💬 Chat", action: "open_chat" }] },
            { message: "Want an alarm or reminder? I've got you! ⏰", quickActions: [{ label: "⏰ Alarm", action: "alarm_flow" }, { label: "🔔 Reminder", action: "reminder_flow" }] }
        ];
        const fb = fallbacks[(req.body.nudgeIndex || 0) % 4];
        res.json({ ...fb, nudgeIndex: ((req.body.nudgeIndex || 0) + 1) % 4 });
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