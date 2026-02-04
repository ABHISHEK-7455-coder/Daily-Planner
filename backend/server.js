
// import express from "express";
// import Groq from "groq-sdk";
// import cors from "cors";
// import dotenv from "dotenv";
// import webPush from "web-push";

// dotenv.config();

// const app = express();
// const PORT = process.env.PORT || 3001;

// // ─── Web Push setup ─────────────────────────────────────────
// webPush.setVapidDetails(
//   'mailto:your-email@example.com',
//   process.env.VAPID_PUBLIC_KEY,
//   process.env.VAPID_PRIVATE_KEY
// );

// // Store subscriptions (in production use a database)
// const subscriptions = new Map();

// // ─── Groq client ────────────────────────────────────────────
// const groq = new Groq({ apiKey: process.env.GROQ_API_KEY });

// // ─── CORS ──────────────────────────────────────────────────
// app.use(cors({
//   origin: process.env.FRONTEND_URL || "http://localhost:5173",
//   methods: ["GET", "POST"],
//   allowedHeaders: ["Content-Type"]
// }));

// app.use(express.json());

// // ─── Health check ──────────────────────────────────────────
// app.get("/api/health", (req, res) => {
//   res.json({ status: "ok" });
// });

// // ─── POST /api/subscribe (Push Notifications) ──────────────
// app.post("/api/subscribe", async (req, res) => {
//   try {
//     const { subscription, userId } = req.body;

//     if (!subscription || !userId) {
//       return res.status(400).json({ error: "Subscription and userId required" });
//     }

//     // Store subscription (in production, save to database)
//     subscriptions.set(userId, subscription);

//     res.json({ success: true, message: "Subscribed successfully" });
//   } catch (error) {
//     console.error("Subscribe error:", error);
//     res.status(500).json({ error: "Failed to subscribe" });
//   }
// });

// // ─── POST /api/send-notification (for testing/manual sends) ─
// app.post("/api/send-notification", async (req, res) => {
//   try {
//     const { userId, title, body } = req.body;

//     const subscription = subscriptions.get(userId);
//     if (!subscription) {
//       return res.status(404).json({ error: "User not subscribed" });
//     }

//     const payload = JSON.stringify({
//       title: title || "Daily Planner Reminder",
//       body: body || "Don't forget to check your tasks!",
//       icon: "/icon-192x192.png"
//     });

//     await webPush.sendNotification(subscription, payload);

//     res.json({ success: true, message: "Notification sent" });
//   } catch (error) {
//     console.error("Send notification error:", error);
//     res.status(500).json({ error: "Failed to send notification" });
//   }
// });

// // ─── Scheduled notifications (runs at specific times) ──────
// // You can use node-cron or similar to schedule these
// // Example times: 8 AM, 9:30 PM, 11:30 PM
// // This is a basic example - in production use a proper job scheduler
// function scheduleNotifications() {
//   // This is just a placeholder - implement with node-cron or similar
//   // Example:
//   // cron.schedule('0 8 * * *', () => sendMorningReminder());
//   // cron.schedule('30 21 * * *', () => sendEveningReminder());
//   // cron.schedule('30 23 * * *', () => sendNightReminder());
//   console.log("📅 Notification scheduler ready (implement with node-cron)");
// }

// scheduleNotifications();

// // ─────────────────────────────────────────────────────────────
// // SYSTEM PROMPT BUILDER
// // This is the REAL fix — we build a detailed, context-rich
// // system prompt every single request so the buddy ALWAYS knows
// // exactly what's happening with the user's tasks.
// // ─────────────────────────────────────────────────────────────
// function buildSystemPrompt(language, taskContext) {
//   const { total, completed, pending, pendingTasks, completedTasks } = taskContext;

//   // ── language style guide ──
//   const langGuide = {
//     hindi: {
//       tone: "Simple, friendly Hindi. Avoid heavy words.",
//       example: "Aaj ka kaam kaisa chal raha hai? 😊",
//       celebrate: "Bahut achha! Task kar diya! 🎉",
//       askProgress: "Batao, kitne tasks ho gaye? Kitne baache hain?",
//       offerHelp: "Chinta mat karo, main tod deta hoon chhote steps mein!",
//       rule: "Sirf Hindi mein jawab do. Kabhi English mat use karo."
//     },
//     english: {
//       tone: "Simple, casual, warm English. Like a supportive friend.",
//       example: "Hey! How's it going today? 😊",
//       celebrate: "Nice work! You finished that! 🎉",
//       askProgress: "So how many tasks did you knock out? How many are left?",
//       offerHelp: "Don't worry, let me break it down into small steps for you!",
//       rule: "Reply ONLY in English. Never mix in Hindi."
//     },
//     hinglish: {
//       tone: "Natural Hindi + English mix. Casual and friendly.",
//       example: "Hey! Aaj ka work kaisa chal raha hai? 😊",
//       celebrate: "Arrey nice! Task kar diya! 🎉",
//       askProgress: "Batao, kitne tasks ho gaye aur kitne baache hain?",
//       offerHelp: "Chinta mat karo, main break kar deta hoon small steps mein!",
//       rule: "Mix Hindi and English naturally. Keep it casual."
//     }
//   };

//   const lang = langGuide[language] || langGuide.english;

//   // ── build live task snapshot ──
//   let taskSnapshot = "";

//   if (total === 0) {
//     taskSnapshot = `The user has NO tasks added for today yet. Gently ask them if they want to plan their day or add some tasks.`;
//   } else {
//     taskSnapshot = `
// TODAY'S TASK SNAPSHOT (use this data — it is LIVE and ACCURATE):
// - Total tasks today: ${total}
// - ✅ Completed: ${completed}
// - ⏳ Pending: ${pending}
// `;
//     if (completedTasks.length > 0) {
//       taskSnapshot += `\nCompleted tasks:\n${completedTasks.map((t, i) => `  ${i + 1}. "${t.title}" (${t.timeOfDay})`).join("\n")}\n`;
//     }
//     if (pendingTasks.length > 0) {
//       taskSnapshot += `\nPending tasks (not done yet):\n${pendingTasks.map((t, i) => `  ${i + 1}. "${t.title}" (${t.timeOfDay})${t.startTime ? ` at ${t.startTime}` : ""}`).join("\n")}\n`;
//     }

//     // progress percentage
//     const pct = total > 0 ? Math.round((completed / total) * 100) : 0;
//     taskSnapshot += `\nProgress: ${pct}% done today.\n`;
//   }

//   // ── the actual system prompt ──
//   return `
// You are a caring, smart buddy for a time management app. Talk like a friend, not a robot.

// LANGUAGE: ${lang.rule}
// Style: ${lang.tone}

// ─────────────────────────────
// LIVE TASK DATA:
// ${taskSnapshot}
// ─────────────────────────────

// CURRENT TIME: ${new Date().toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit', hour12: false })} (24-hour format)
// CURRENT DATE: ${new Date().toLocaleDateString()}

// ═══════════════════════════════════════════════════════════════
// CRITICAL RULES - READ CAREFULLY:
// ═══════════════════════════════════════════════════════════════

// 1. **UNDERSTAND TIME IN USER'S MESSAGE:**
//    - "23:00 pe remind" → startTime should be "23:00"
//    - "5 min mai" → calculate current time + 5 mins, set that as startTime
//    - "kal subah" → tomorrow morning, around "09:00"
//    - Always extract and use time when user mentions it!

// 2. **WHEN TO USE TOOLS (functions):**
//    ✅ USE add_task when:
//       - User says "add task", "remind me", "5 min mai yaad dilana"
//       - Extract time from their message and set startTime
   
//    ✅ USE delete_task when:
//       - User says "delete", "remove", "hat jao", "isse nikal do"
//       - Use the most recent task title they mentioned
   
//    ✅ USE complete_task when:
//       - User says "ho gaya", "done", "kar liya", "finish ho gaya"
   
//    ❌ DON'T use tools when:
//       - User asks "how to do this?" → Give quick advice in TEXT
//       - User asks "upcoming task?" → Tell them in TEXT
//       - User is just chatting

// 3. **WHEN GIVING ADVICE (not using tools):**
//    - Keep it SHORT - max 2-3 sentences
//    - Give ONE practical tip, not a tutorial
//    - Example: "Documentation ke liye: bas main points bullet mein likh lo. 5 min done!"
//    - Don't give numbered steps unless they explicitly ask "give me steps"

// 4. **BE CONTEXTUALLY SMART:**
//    - If it's night (20:00-23:59), don't mention morning tasks
//    - If it's morning (06:00-11:59), don't push evening tasks
//    - Look at what makes sense RIGHT NOW

// 5. **PROACTIVE CHECK-INS:**
//    - When user opens chat, greet AND tell them their status
//    - Example: "Hey! 5 tasks pending hain. 'Write documentation' abhi karna hai. Kaise help karoon? 😊"
//    - Ask follow-ups: "Ho gaya?" or "Kuch problem aayi?"

// 6. **HANDLE MISTAKES GRACEFULLY:**
//    - If user says "no that's wrong" or "delete it", immediately fix
//    - Don't apologize excessively - just fix and move on
//    - Example: "Oops! Hat gaya. Ab kya chahiye?"

// ═══════════════════════════════════════════════════════════════
// EXAMPLES OF CORRECT BEHAVIOR:
// ═══════════════════════════════════════════════════════════════

// User: "23:00 pe git push remind karna"
// You: [USE add_task("git push", "evening", "23:00")]
// Response: "Done! 23:00 pe yaad dila dunga 👍"

// User: "5 min mai remind karna documentation likhna"
// You: [USE add_task("documentation likhna", "evening", "{current_time + 5 mins}")]
// Response: "Theek hai! 5 min baad yaad dila dunga ✅"

// User: "isse delete karo" (after adding wrong task)
// You: [USE delete_task with last mentioned task title]
// Response: "Hat gaya! Ab batao kya karna hai?"

// User: "documentation kaise likhoon jo 5 min mai ho jaye"
// You: [DON'T use any tool - just give advice]
// Response: "Bas main points bullet mein likh lo. Details baad mein add kar lena. Quick ho jayega!"

// User: "upcoming task kya hai"
// You: [DON'T use tool - just tell from task data]
// Response: "Agli task hai 'write documentation' jo evening ki hai. Karna hai?"

// User: "maine yoga kar liya"
// You: [USE complete_task("yoga")]
// Response: "Nice! Ek aur ho gaya! 🎉"

// ═══════════════════════════════════════════════════════════════

// REMEMBER:
// - One action per user message (don't loop!)
// - Extract time from user's words carefully
// - Text advice when they need help, tool call when they need action
// - Be warm, not robotic
// - Short replies (1-3 sentences)
// `.trim();
// }

// // ─── POST /api/chat ─────────────────────────────────────────
// app.post("/api/chat", async (req, res) => {
//   try {
//     const { messages, language, taskContext } = req.body;

//     // ── validate ──
//     if (!messages || !Array.isArray(messages)) {
//       return res.status(400).json({ error: "Messages array is required" });
//     }
//     if (!taskContext) {
//       return res.status(400).json({ error: "taskContext is required" });
//     }

//     const selectedLanguage = language || "english";

//     // ── build the rich system prompt with live task data ──
//     const systemPrompt = buildSystemPrompt(selectedLanguage, taskContext);

//     // ── cap history to last 20 messages to stay within token limits ──
//     const recentMessages = messages.slice(-20);

//     // ── Define tools the buddy can use ──
//     const tools = [
//       {
//         type: "function",
//         function: {
//           name: "add_task",
//           description: "Add a new task to the user's task list. Use when user asks to add a task, set a reminder, or says things like '5 min mai remind krna'.",
//           parameters: {
//             type: "object",
//             properties: {
//               title: {
//                 type: "string",
//                 description: "The task title/description"
//               },
//               timeOfDay: {
//                 type: "string",
//                 enum: ["morning", "afternoon", "evening"],
//                 description: "Which part of the day - use current time to decide if not specified"
//               },
//               startTime: {
//                 type: "string",
//                 description: "Optional start time in HH:MM format (24-hour). Use when user wants a reminder at specific time."
//               }
//             },
//             required: ["title", "timeOfDay"]
//           }
//         }
//       },
//       {
//         type: "function",
//         function: {
//           name: "complete_task",
//           description: "Mark a task as completed. Use when user says they finished a task.",
//           parameters: {
//             type: "object",
//             properties: {
//               taskTitle: {
//                 type: "string",
//                 description: "The title of the task to mark as complete"
//               }
//             },
//             required: ["taskTitle"]
//           }
//         }
//       },
//       {
//         type: "function",
//         function: {
//           name: "delete_task",
//           description: "Delete/remove a task. Use when user says 'delete it', 'remove it', 'hat jao', or similar.",
//           parameters: {
//             type: "object",
//             properties: {
//               taskTitle: {
//                 type: "string",
//                 description: "The title of the task to delete (use the most recently added/mentioned task if unclear)"
//               }
//             },
//             required: ["taskTitle"]
//           }
//         }
//       }
//     ];

//     // ── call Groq with tools ──
//     const completion = await groq.chat.completions.create({
//       model: "llama-3.3-70b-versatile",
//       messages: [
//         { role: "system", content: systemPrompt },
//         ...recentMessages.map(m => ({
//           role: m.role,
//           content: m.content
//         }))
//       ],
//       tools: tools,
//       tool_choice: "auto",
//       temperature: 0.7,
//       max_tokens: 300,
//       top_p: 0.9
//     });

//     const response = completion.choices[0];
    
//     // Check if AI wants to call a function
//     if (response.message.tool_calls && response.message.tool_calls.length > 0) {
//       const toolCall = response.message.tool_calls[0];
//       const functionName = toolCall.function.name;
//       const functionArgs = JSON.parse(toolCall.function.arguments);

//       // Return the function call to the frontend
//       return res.json({
//         type: "function_call",
//         function: functionName,
//         arguments: functionArgs,
//         message: response.message.content || ""
//       });
//     }

//     // Normal text response
//     const reply = response.message.content || "Sorry, I couldn't respond. Try again! 🙏";
//     res.json({ type: "message", message: reply });

//   } catch (error) {
//     console.error("Chat error:", error);
//     res.status(500).json({ error: "Something went wrong on the server" });
//   }
// });

// // ─── START ──────────────────────────────────────────────────
// app.listen(PORT, () => {
//   console.log(`🚀 Buddy server running on port ${PORT}`);
// });
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

// Store subscriptions (in production use a database)
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

    // Store subscription (in production, save to database)
    subscriptions.set(userId, subscription);

    res.json({ success: true, message: "Subscribed successfully" });
  } catch (error) {
    console.error("Subscribe error:", error);
    res.status(500).json({ error: "Failed to subscribe" });
  }
});

// ─── POST /api/send-notification (for testing/manual sends) ─
app.post("/api/send-notification", async (req, res) => {
  try {
    const { userId, title, body } = req.body;

    const subscription = subscriptions.get(userId);
    if (!subscription) {
      return res.status(404).json({ error: "User not subscribed" });
    }

    const payload = JSON.stringify({
      title: title || "Daily Planner Reminder",
      body: body || "Don't forget to check your tasks!",
      icon: "/icon-192x192.png"
    });

    await webPush.sendNotification(subscription, payload);

    res.json({ success: true, message: "Notification sent" });
  } catch (error) {
    console.error("Send notification error:", error);
    res.status(500).json({ error: "Failed to send notification" });
  }
});

// ─── Scheduled notifications (runs at specific times) ──────
// You can use node-cron or similar to schedule these
// Example times: 8 AM, 9:30 PM, 11:30 PM
// This is a basic example - in production use a proper job scheduler
function scheduleNotifications() {
  // This is just a placeholder - implement with node-cron or similar
  // Example:
  // cron.schedule('0 8 * * *', () => sendMorningReminder());
  // cron.schedule('30 21 * * *', () => sendEveningReminder());
  // cron.schedule('30 23 * * *', () => sendNightReminder());
  console.log("📅 Notification scheduler ready (implement with node-cron)");
}

scheduleNotifications();

// ─────────────────────────────────────────────────────────────
// SYSTEM PROMPT BUILDER
// This is the REAL fix — we build a detailed, context-rich
// system prompt every single request so the buddy ALWAYS knows
// exactly what's happening with the user's tasks.
// ─────────────────────────────────────────────────────────────
function buildSystemPrompt(language, taskContext) {
  const { total, completed, pending, pendingTasks, completedTasks } = taskContext;

  // ── language style guide ──
  const langGuide = {
    hindi: {
      tone: "Simple, friendly Hindi. Avoid heavy words.",
      example: "Aaj ka kaam kaisa chal raha hai? 😊",
      celebrate: "Bahut achha! Task kar diya! 🎉",
      askProgress: "Batao, kitne tasks ho gaye? Kitne baache hain?",
      offerHelp: "Chinta mat karo, main tod deta hoon chhote steps mein!",
      rule: "Sirf Hindi mein jawab do. Kabhi English mat use karo."
    },
    english: {
      tone: "Simple, casual, warm English. Like a supportive friend.",
      example: "Hey! How's it going today? 😊",
      celebrate: "Nice work! You finished that! 🎉",
      askProgress: "So how many tasks did you knock out? How many are left?",
      offerHelp: "Don't worry, let me break it down into small steps for you!",
      rule: "Reply ONLY in English. Never mix in Hindi."
    },
    hinglish: {
      tone: "Natural Hindi + English mix. Casual and friendly.",
      example: "Hey! Aaj ka work kaisa chal raha hai? 😊",
      celebrate: "Arrey nice! Task kar diya! 🎉",
      askProgress: "Batao, kitne tasks ho gaye aur kitne baache hain?",
      offerHelp: "Chinta mat karo, main break kar deta hoon small steps mein!",
      rule: "Mix Hindi and English naturally. Keep it casual."
    }
  };

  const lang = langGuide[language] || langGuide.english;

  // ── build live task snapshot ──
  let taskSnapshot = "";

  if (total === 0) {
    taskSnapshot = `The user has NO tasks added for today yet. Gently ask them if they want to plan their day or add some tasks.`;
  } else {
    taskSnapshot = `
TODAY'S TASK SNAPSHOT (use this data — it is LIVE and ACCURATE):
- Total tasks today: ${total}
- ✅ Completed: ${completed}
- ⏳ Pending: ${pending}
`;
    if (completedTasks.length > 0) {
      taskSnapshot += `\nCompleted tasks:\n${completedTasks.map((t, i) => `  ${i + 1}. "${t.title}" (${t.timeOfDay})`).join("\n")}\n`;
    }
    if (pendingTasks.length > 0) {
      taskSnapshot += `\nPending tasks (not done yet):\n${pendingTasks.map((t, i) => `  ${i + 1}. "${t.title}" (${t.timeOfDay})${t.startTime ? ` at ${t.startTime}` : ""}`).join("\n")}\n`;
    }

    // progress percentage
    const pct = total > 0 ? Math.round((completed / total) * 100) : 0;
    taskSnapshot += `\nProgress: ${pct}% done today.\n`;
  }

  // ── the actual system prompt ──
  return `
You are a caring, smart buddy for a time management app. Talk like a friend, not a robot.

LANGUAGE: ${lang.rule}
Style: ${lang.tone}

─────────────────────────────
LIVE TASK DATA:
${taskSnapshot}
─────────────────────────────

CURRENT TIME: ${new Date().toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit', hour12: false })} (24-hour format)
CURRENT DATE: ${new Date().toLocaleDateString()}

═══════════════════════════════════════════════════════════════
CRITICAL RULES - READ CAREFULLY:
═══════════════════════════════════════════════════════════════

1. **UNDERSTAND TIME IN USER'S MESSAGE:**
   - "23:00 pe remind" → startTime should be "23:00"
   - "5 min mai" → calculate current time + 5 mins, set that as startTime
   - "kal subah" → tomorrow morning, around "09:00"
   - Always extract and use time when user mentions it!

2. **WHEN TO USE WHICH TOOL:**
   
   Use **set_reminder** when:
   ✅ User says "remind me in 5 min", "5 min mai yaad dilana", "reminder set karo"
   ✅ User just wants a notification, NOT a task in their list
   ✅ Example: "5 min mai remind karna" → set_reminder (NOT add_task!)
   
   Use **add_task** when:
   ✅ User explicitly says "add task", "task banao", "add karo [task name]"
   ✅ User mentions specific work to do: "23:00 pe git push krna hai"
   ✅ Example: "exploring website for reading task add karo 23:20 pe" → add_task
   
   Use **delete_task** when:
   ✅ "delete it", "remove", "hat jao", "isse nikal do"
   
   Use **complete_task** when:
   ✅ "ho gaya", "done", "kar liya", "finish"
   
   Give **text advice** (no tool) when:
   ✅ "how to do this?", "kaise karu?", "next kya hai?"
   ✅ Just tell them, don't call functions!

3. **WHEN GIVING ADVICE (not using tools):**
   - Keep it SHORT - max 2-3 sentences
   - Give ONE practical tip, not a tutorial
   - Example: "Documentation ke liye: bas main points bullet mein likh lo. 5 min done!"
   - Don't give numbered steps unless they explicitly ask "give me steps"

4. **BE CONTEXTUALLY SMART:**
   - If it's night (20:00-23:59), don't mention morning tasks
   - If it's morning (06:00-11:59), don't push evening tasks
   - Look at what makes sense RIGHT NOW

5. **PROACTIVE CHECK-INS:**
   - When user opens chat, greet AND tell them their status
   - Example: "Hey! 5 tasks pending hain. 'Write documentation' abhi karna hai. Kaise help karoon? 😊"
   - Ask follow-ups: "Ho gaya?" or "Kuch problem aayi?"

6. **HANDLE MISTAKES GRACEFULLY:**
   - If user says "no that's wrong" or "delete it", immediately fix
   - Don't apologize excessively - just fix and move on
   - Example: "Oops! Hat gaya. Ab kya chahiye?"

═══════════════════════════════════════════════════════════════
EXAMPLES OF CORRECT BEHAVIOR:
═══════════════════════════════════════════════════════════════

User: "5 min mai remind karna"
You: [USE set_reminder with time = current_time + 5 min]
Response: "Done! 5 min baad yaad dila dunga 👍"

User: "23:00 pe git push task add karo"
You: [USE add_task("git push", "evening", "23:00")]
Response: "✅ 'git push' task add ho gaya (23:00 pe)"

User: "exploring website for reading add karo around 23:20"
You: [USE add_task("exploring website for reading", "evening", "23:20")]
Response: "✅ Task add ho gaya (23:20 pe)"

User: "task add nhi krna, bas remind krva do"
You: [USE set_reminder, NOT add_task]
Response: "Theek hai! Reminder set ho gaya, yaad dila dunga ✅"

User: "isse delete karo"
You: [USE delete_task with last mentioned task]
Response: "🗑️ Hat gaya!"

User: "next kya krna hai?"
You: [DON'T use tool - just tell from task data]
Response: "Agli task hai 'write documentation' (23:00 pe). Start karein?"

User: "documentation kaise likhoon 5 min mai?"
You: [DON'T use tool - give advice]
Response: "Bas main points likh lo bullet mein. Quick ho jayega!"

User: "maine pushing code kar liya"
You: [USE complete_task("pushing code")]
Response: "✅ Nice! Ek aur ho gaya! 🎉"

═══════════════════════════════════════════════════════════════

REMEMBER:
- One action per user message (don't loop!)
- Extract time from user's words carefully
- Text advice when they need help, tool call when they need action
- Be warm, not robotic
- Short replies (1-3 sentences)
`.trim();
}

// ─── POST /api/chat ─────────────────────────────────────────
app.post("/api/chat", async (req, res) => {
  try {
    const { messages, language, taskContext } = req.body;

    // ── validate ──
    if (!messages || !Array.isArray(messages)) {
      return res.status(400).json({ error: "Messages array is required" });
    }
    if (!taskContext) {
      return res.status(400).json({ error: "taskContext is required" });
    }

    const selectedLanguage = language || "english";

    // ── build the rich system prompt with live task data ──
    const systemPrompt = buildSystemPrompt(selectedLanguage, taskContext);

    // ── cap history to last 20 messages to stay within token limits ──
    const recentMessages = messages.slice(-20);

    // ── Define tools the buddy can use ──
    const tools = [
      {
        type: "function",
        function: {
          name: "set_reminder",
          description: "Set a simple reminder/notification at a specific time. Use when user ONLY wants a reminder popup, NOT a task in their list. Examples: '5 min mai remind karna', 'reminder set karo', 'yaad dilana'.",
          parameters: {
            type: "object",
            properties: {
              time: {
                type: "string",
                description: "Time in HH:MM format (24-hour). Calculate from current time if user says '5 min mai'."
              },
              message: {
                type: "string",
                description: "What to remind about (optional)"
              }
            },
            required: ["time"]
          }
        }
      },
      {
        type: "function",
        function: {
          name: "add_task",
          description: "Add a real task to the user's task list. Use ONLY when user explicitly wants to add a task with a title and time. Examples: 'add task', 'git push krna hai 23:00 pe', 'task add karo'.",
          parameters: {
            type: "object",
            properties: {
              title: {
                type: "string",
                description: "The task title/description"
              },
              timeOfDay: {
                type: "string",
                enum: ["morning", "afternoon", "evening"],
                description: "Which part of day - decide from current time or user's specification"
              },
              startTime: {
                type: "string",
                description: "Start time in HH:MM format (24-hour). Extract from user message."
              },
              endTime: {
                type: "string",
                description: "End time in HH:MM format (optional)"
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
          description: "Mark a task as completed. Use when user says they finished a task.",
          parameters: {
            type: "object",
            properties: {
              taskTitle: {
                type: "string",
                description: "The title of the task to mark as complete"
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
          description: "Delete/remove a task. Use when user says 'delete it', 'remove it', 'hat jao', or similar.",
          parameters: {
            type: "object",
            properties: {
              taskTitle: {
                type: "string",
                description: "The title of the task to delete (use the most recently mentioned task if unclear)"
              }
            },
            required: ["taskTitle"]
          }
        }
      }
    ];

    // ── call Groq with tools ──
    const completion = await groq.chat.completions.create({
      model: "llama-3.3-70b-versatile",
      messages: [
        { role: "system", content: systemPrompt },
        ...recentMessages.map(m => ({
          role: m.role,
          content: m.content
        }))
      ],
      tools: tools,
      tool_choice: "auto",
      temperature: 0.7,
      max_tokens: 300,
      top_p: 0.9
    });

    const response = completion.choices[0];
    
    // Check if AI wants to call a function
    if (response.message.tool_calls && response.message.tool_calls.length > 0) {
      const toolCall = response.message.tool_calls[0];
      const functionName = toolCall.function.name;
      const functionArgs = JSON.parse(toolCall.function.arguments);

      // Return the function call to the frontend
      return res.json({
        type: "function_call",
        function: functionName,
        arguments: functionArgs,
        message: response.message.content || ""
      });
    }

    // Normal text response
    const reply = response.message.content || "Sorry, I couldn't respond. Try again! 🙏";
    res.json({ type: "message", message: reply });

  } catch (error) {
    console.error("Chat error:", error);
    res.status(500).json({ error: "Something went wrong on the server" });
  }
});

// ─── START ──────────────────────────────────────────────────
app.listen(PORT, () => {
  console.log(`🚀 Buddy server running on port ${PORT}`);
});