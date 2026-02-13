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

REMINDER vs TASK - CRITICAL DISTINCTION:

Use **set_reminder** when:
✅ "remind me in 5 min" 
✅ "5 min mai yaad dilana"
✅ "reminder set karo 10:30 pe"
✅ User wants a NOTIFICATION only

Use **add_task** when:
✅ "add task X"
✅ "X karna hai Y time pe" (I need to do X at Y time)
✅ User wants to ADD TO TASK LIST

NEVER confuse these two!
═══════════════════════════════════════════════════════════════
ALARM TOOL USAGE - CRITICAL RULES:
═══════════════════════════════════════════════════════════════

Use set_alarm for:
- "set alarm 5 AM" 
- "23 feb meeting alarm"
- "wake me up at 7"
- "daily alarm 6:30 am"

PARAMETER RULES:
1. time: ALWAYS required, HH:MM 24-hour format
2. date: If mentioned → "YYYY-MM-DD", if NOT mentioned → "" (empty string, NOT null!)
3. label: Extract from user's words, or use "Alarm"
4. repeat: "once" (default), "daily", or "custom"

TIME CONVERSION:
"5 AM" → "05:00"
"5:30 PM" → "17:30"  
"11 PM" → "23:00"
"midnight" → "00:00"
"noon" → "12:00"

DATE CONVERSION:
"23 feb" → "${currentYear}-02-23"
"february 18" → "${currentYear}-02-18"
"tomorrow" → "${tomorrow}"
"today" → "${currentYear}-${currentMonth}-${currentDay}"
NO DATE MENTIONED → "" (empty string)

EXAMPLES:

User: "set alarm for 5 AM"
→ set_alarm(time="05:00", date="", label="Alarm", repeat="once")

User: "23 feb meeting alarm laga do"
→ set_alarm(time="09:00", date="${currentYear}-02-23", label="meeting", repeat="once")

User: "18 february friend birthday 8 baje"
→ set_alarm(time="08:00", date="${currentYear}-02-18", label="friend birthday", repeat="once")

User: "wake me up at 7:30 tomorrow"
→ set_alarm(time="07:30", date="${tomorrow}", label="wake up", repeat="once")

User: "daily 6 am alarm"
→ set_alarm(time="06:00", date="", label="daily alarm", repeat="daily")

User: "9:35 pe alarm set karo"
→ set_alarm(time="09:35", date="", label="Alarm", repeat="once")

CRITICAL: NEVER send null! Always use empty string "" if no date.

Keep replies SHORT (1-2 sentences).
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

        if (isVoice && voiceMode === 'notes') {
            systemPrompt += `\n\n═══════════════════════════════════════════════════════════
VOICE NOTES MODE - MANDATORY TOOL USAGE:
═══════════════════════════════════════════════════════════

⚠️ CRITICAL: You MUST ALWAYS call the update_notes tool! NEVER just respond without calling it!

WRONG BEHAVIOR (DO NOT DO THIS):
User: "notes mein add kar do - xyz"
You: "📝 Notes mein add ho gaya!" ← NO! Missing tool call!

CORRECT BEHAVIOR (ALWAYS DO THIS):
User: "notes mein add kar do - xyz"
You: [Call update_notes tool with content="xyz"]
Then respond: "📝 Notes mein add ho gaya!"

═══════════════════════════════════════════════════════════

CONTENT RULES:
1. Call update_notes with user's EXACT words
2. DO NOT summarize, shorten, or change ANYTHING
3. DO NOT translate - keep it in the SAME language user spoke
4. Include EVERYTHING user said, even if it's 100+ words long
5. After calling the tool, respond: "📝 Notes mein add ho gaya!"

REMOVE ONLY THESE INSTRUCTION PHRASES:
- "bhai add kar de"
- "notes mein add kar do" 
- "meri daily notes mein add kar do"
- "daily notes mein add kar do"
- "usko bhi add kar do"
- "add this to notes"

Keep EVERYTHING ELSE word-for-word!

═══════════════════════════════════════════════════════════
EXAMPLES:
═══════════════════════════════════════════════════════════

User: "Bahar Gaye FIR khana khaya FIR Kuchh kam karo FIR so gai"
❌ WRONG: Just respond "Notes mein add ho gaya!"
✅ CORRECT: Call update_notes("Bahar Gaye FIR khana khaya FIR Kuchh kam karo FIR so gai")

User: "Main Bahar Gai college Gai Thi college se pet Ghar I Ghar aane ke bad Maine Kuchh khana vana khaya FIR Meri class Thi use attend kara usmein projects ka notes vagaira Banaya"
❌ WRONG: Summarize to "College gai, khana khaya, class attend kari"
✅ CORRECT: Call update_notes with FULL TEXT above (all 40+ words)

User: "aur FIR main Apna Kam karne ke bad Kuchh Soch rahi thi sochne ke bad FIR Maine tas complete kara gift Pushkar Mein so gai"
✅ CORRECT: Call update_notes with exact text

═══════════════════════════════════════════════════════════

REMEMBER: ALWAYS call the tool! Don't just say "added" without actually adding!
═══════════════════════════════════════════════════════════`;
        } else if (isVoice && voiceMode === 'tasks') {
            systemPrompt += `\n\nVOICE TASKS MODE: Parse tasks from speech. Call add_task. Brief confirmations only.`;
        }

        const recentMessages = messages.slice(-20);

        const tools = [
            {
  type: "function",
  function: {
    name: "set_reminder",
    description: "Set a timed reminder notification (NOT a task!). Use when user says 'remind me in X min', 'X min mai yaad dilana', 'reminder set karo'. This triggers a notification, not a task.",
    parameters: {
      type: "object",
      properties: {
        time: { 
          type: "string", 
          description: "Time in HH:MM format (24-hour). If user says '5 min mai' calculate: current time + 5 mins. If user says '2 min baad' calculate: current time + 2 mins."
        },
        message: { 
          type: "string", 
          description: "What to remind about. Extract from user's message. Example: 'remind me to call friend' → message='call friend'"
        }
      },
      required: ["time", "message"]
    }
  }
},
            {
                type: "function",
                function: {
                    name: "set_alarm",
                    description: "Set an alarm with sound and vibration",
                    parameters: {
                        type: "object",
                        properties: {
                            time: {
                                type: "string",
                                description: "Time in HH:MM 24-hour format"
                            },
                            date: {
                                type: "string",
                                description: "Date in YYYY-MM-DD format. Use empty string if no date."
                            },
                            label: {
                                type: "string",
                                description: "What the alarm is for"
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
                    description: "Update daily notes. CRITICAL: You MUST pass the user's EXACT words in the content parameter. DO NOT summarize, shorten, translate, or change ANY words. If user says 50 words, content parameter MUST have all 50 words. If you summarize or shorten, the notes will be WRONG and INCOMPLETE.",
                    parameters: {
                        type: "object",
                        properties: {
                            content: { 
                                type: "string",
                                description: "User's EXACT spoken words with NO changes, NO summarization, NO translation. Must be word-for-word identical to what user said (excluding only instruction phrases like 'add kar do'). If user spoke 100 words, this parameter MUST contain all 100 words in the exact same language and order."
                            },
                            mode: {
                                type: "string",
                                enum: ["append", "replace"],
                                description: "append = add to end of existing notes (default), replace = overwrite all notes"
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
                            timeOfDay: {
                                type: "string",
                                enum: ["morning", "afternoon", "evening"]
                            },
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
            max_tokens: 1000  // Increased for long notes
        });

        const response = completion.choices[0];

        // Collect all actions
        const actions = [];
        if (response.message.tool_calls) {
            for (const toolCall of response.message.tool_calls) {
                try {
                    const params = JSON.parse(toolCall.function.arguments);

                    // 🎯 CRITICAL FIX: Clean up null values for set_alarm
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

                    // 🎯 NEW: Validate update_notes content isn't summarized
                    if (toolCall.function.name === "update_notes" && voiceMode === 'notes') {
                        const userMessage = recentMessages[recentMessages.length - 1]?.content || "";
                        const noteContent = params.content || "";
                        
                        // Remove common instruction phrases from user message
                        const cleanedUserMsg = userMessage
                            .replace(/bhai add kar de/gi, '')
                            .replace(/notes? mein add kar do/gi, '')
                            .replace(/meri daily notes? mein add kar do/gi, '')
                            .replace(/daily notes? mein add kar do/gi, '')
                            .replace(/usko bhi add kar do/gi, '')
                            .replace(/add (this|that|it) to notes?/gi, '')
                            .trim();
                        
                        // Check if content is significantly shorter (more than 30% shorter = likely summarized)
                        const userWordCount = cleanedUserMsg.split(/\s+/).length;
                        const noteWordCount = noteContent.split(/\s+/).length;
                        
                        console.log(`📊 Word count check: User=${userWordCount}, Note=${noteWordCount}`);
                        
                        if (noteWordCount < userWordCount * 0.7) {
                            console.warn(`⚠️ POSSIBLE SUMMARIZATION DETECTED! Using user's original words instead.`);
                            // Use the cleaned user message instead
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
app.get("/", (req, res) => {
  res.send("Daily Planner Backend is running 🚀");
});