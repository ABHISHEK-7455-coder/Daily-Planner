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
//    - "12:10 am" → "00:10" (convert to 24-hour)
//    - "12:10 se 12:30" → startTime "00:10", endTime "00:30"
//    - Always extract and use time when user mentions it!

// **HANDLING MULTIPLE TASKS:**
// If user asks for multiple tasks in ONE message (example: "3 task add karo - first X at Y time, second Z at A time, third B at C time"), you must:
// 1. Call add_task ONCE for the FIRST task only
// 2. In your text response, tell user: "Pehla add ho gaya! Baki 2 batao separately"
// 3. Wait for user to confirm or give next task
// 4. NEVER try to add all tasks in one response - this causes loops!

// 2. **WHEN TO USE WHICH TOOL:**

//    Use **set_reminder** when:
//    ✅ User says "remind me in 5 min", "5 min mai yaad dilana", "reminder set karo"
//    ✅ User just wants a notification, NOT a task in their list
//    ✅ Example: "5 min mai remind karna" → set_reminder (NOT add_task!)

//    Use **add_task** when:
//    ✅ User explicitly says "add task", "task banao", "add karo [task name]"
//    ✅ User mentions specific work to do: "23:00 pe git push krna hai"
//    ✅ Example: "exploring website for reading task add karo 23:20 pe" → add_task

//    Use **delete_task** when:
//    ✅ "delete it", "remove", "hat jao", "isse nikal do"

//    Use **complete_task** when:
//    ✅ "ho gaya", "done", "kar liya", "finish"

//    Give **text advice** (no tool) when:
//    ✅ "how to do this?", "kaise karu?", "next kya hai?"
//    ✅ Just tell them, don't call functions!

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

// User: "5 min mai remind karna"
// You: [USE set_reminder with time = current_time + 5 min]
// Response: "Done! 5 min baad yaad dila dunga 👍"

// User: "23:00 pe git push task add karo"
// You: [USE add_task("git push", "evening", "23:00")]
// Response: "✅ 'git push' task add ho gaya (23:00 pe)"

// User: "3 task add karo: first 12:10 pe work status, second 12:10-12:30 features add, third 12:30 pe update"
// You: [USE add_task("work status", "evening", "00:10")]
// Response: "✅ 'work status' add ho gaya (00:10 pe)! Baki 2 tasks bhi add karoon? Ek ek karke batao"

// User: "haan next wala"
// You: [USE add_task("features add", "evening", "00:10", "00:30")]
// Response: "✅ 'features add' add ho gaya (00:10 - 00:30)! Ek aur baaki hai"

// User: "haan last wala"
// You: [USE add_task("update", "evening", "00:30")]
// Response: "✅ 'update' add ho gaya (00:30 pe)! Sab done! 🎉"

// User: "exploring website for reading add karo around 23:20"
// You: [USE add_task("exploring website for reading", "evening", "23:20")]
// Response: "✅ Task add ho gaya (23:20 pe)"

// User: "task add nhi krna, bas remind krva do"
// You: [USE set_reminder, NOT add_task]
// Response: "Theek hai! Reminder set ho gaya, yaad dila dunga ✅"

// User: "isse delete karo"
// You: [USE delete_task with last mentioned task]
// Response: "🗑️ Hat gaya!"

// User: "next kya krna hai?"
// You: [DON'T use tool - just tell from task data]
// Response: "Agli task hai 'write documentation' (23:00 pe). Start karein?"

// User: "documentation kaise likhoon 5 min mai?"
// You: [DON'T use tool - give advice]
// Response: "Bas main points likh lo bullet mein. Quick ho jayega!"

// User: "maine pushing code kar liya"
// You: [USE complete_task("pushing code")]
// Response: "✅ Nice! Ek aur ho gaya! 🎉"

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
//           name: "set_reminder",
//           description: "Set a simple reminder/notification at a specific time. Use when user ONLY wants a reminder popup, NOT a task in their list. Examples: '5 min mai remind karna', 'reminder set karo', 'yaad dilana'.",
//           parameters: {
//             type: "object",
//             properties: {
//               time: {
//                 type: "string",
//                 description: "Time in HH:MM format (24-hour). Calculate from current time if user says '5 min mai'."
//               },
//               message: {
//                 type: "string",
//                 description: "What to remind about (optional)"
//               }
//             },
//             required: ["time"]
//           }
//         }
//       },
//       {
//         type: "function",
//         function: {
//           name: "add_task",
//           description: "Add a real task to the user's task list. Use ONLY when user explicitly wants to add a task with a title and time. Examples: 'add task', 'git push krna hai 23:00 pe', 'task add karo'.",
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
//                 description: "Which part of day - decide from current time or user's specification"
//               },
//               startTime: {
//                 type: "string",
//                 description: "Start time in HH:MM format (24-hour). Extract from user message."
//               },
//               endTime: {
//                 type: "string",
//                 description: "End time in HH:MM format (optional)"
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
//                 description: "The title of the task to delete (use the most recently mentioned task if unclear)"
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

// // ═══════════════════════════════════════════════════════════
// // ADVANCED ENDPOINTS FOR PROACTIVE BUDDY
// // ═══════════════════════════════════════════════════════════

// // ─── POST /api/proactive-checkin ────────────────────────────
// app.post("/api/proactive-checkin", async (req, res) => {
//   try {
//     const { type, language, taskContext, currentDate } = req.body;

//     const prompts = {
//       morning: {
//         hindi: `तुम एक दोस्त हो जो सुबह प्यार से पूछता है। User के ${taskContext.total} tasks हैं, ${taskContext.pending} अभी बाकी हैं। एक छोटा, warm message लिखो (max 2 sentences) जो user को motivate करे कि आज का दिन शुरू करें। Different style में लिखो हर बार - कभी enthusiastic, कभी gentle।`,
//         english: `You're a caring friend checking in on a morning. User has ${taskContext.total} tasks, ${taskContext.pending} still pending. Write a SHORT, warm morning message (max 2 sentences) that motivates them to start their day. Vary your style - sometimes enthusiastic, sometimes gentle.`,
//         hinglish: `Tum ek buddy ho jo morning mein check kar raha hai. User ke ${taskContext.total} tasks hain, ${taskContext.pending} pending hain. Ek short, caring message likh (max 2 sentences) jo unhe motivate kare. Har baar different style - kabhi energetic, kabhi soft.`
//       },
//       midday: {
//         hinglish: `Lunch time hai! User ke ${taskContext.completed}/${taskContext.total} tasks done hain. Ek quick, friendly check-in message likh (2 sentences) jo unhe appreciate kare ya gentle nudge de. Har baar unique bano.`
//       },
//       afternoon: {
//         hinglish: `Afternoon ho gayi, ${taskContext.pending} tasks bache hain. Ek motivational message likh jo user ko energize kare final push ke liye. Be creative, vary your approach each time.`
//       },
//       evening: {
//         hinglish: `Evening reflection time. User ne ${taskContext.completed}/${taskContext.total} tasks complete kiye. Ek thoughtful message likh jo celebrate kare achievements aur gently reflect kare kya improve kar sakte hain kal. Compassionate aur varied rahna.`
//       },
//       night: {
//         hinglish: `Raat ho gayi. User ka day ${taskContext.completed}/${taskContext.total} tasks ke saath khatam ho raha hai. Ek calming, appreciative good night message likh jo unhe rest karne ke liye encourage kare. Har baar different tone - kabhi proud, kabhi soothing.`
//       }
//     };

//     const selectedLang = language || "hinglish";
//     const prompt = prompts[type]?.[selectedLang] || prompts[type]?.hinglish || prompts.morning.hinglish;

//     const completion = await groq.chat.completions.create({
//       model: "llama-3.3-70b-versatile",
//       messages: [
//         { role: "system", content: `${prompt}\n\nIMPORTANT: Write a UNIQUE message each time. Never repeat same patterns. Be genuinely caring like a real person.` },
//         { role: "user", content: `Current time: ${new Date().toLocaleTimeString()}. Generate check-in message.` }
//       ],
//       temperature: 0.9, // Higher for more variety
//       max_tokens: 150
//     });

//     const message = completion.choices[0].message.content;

//     res.json({ 
//       message,
//       actions: type === 'morning' ? [
//         { label: language === 'hindi' ? 'चलो शुरू करें!' : 'Let\'s Start!', action: 'start' }
//       ] : []
//     });

//   } catch (error) {
//     console.error("Proactive check-in error:", error);
//     res.status(500).json({ error: "Failed to generate check-in" });
//   }
// });

// // ─── POST /api/task-reminder ────────────────────────────────
// app.post("/api/task-reminder", async (req, res) => {
//   try {
//     const { task, language, currentDate } = req.body;

//     const prompts = {
//       hinglish: `Task "${task.title}" 10 minutes mein start hone wala hai (${task.startTime} pe). Ek short, friendly reminder message likh (1-2 sentences) jo user ko gently remind kare. Har baar different style use karo - kabhi playful, kabhi professional, kabhi motivational. Be creative!`,
//       hindi: `"${task.title}" task 10 मिनट में शुरू होगा। एक छोटा, दोस्ताना reminder लिखो। हर बार अलग style में - कभी मज़ेदार, कभी प्रेरणादायक।`,
//       english: `Task "${task.title}" starts in 10 minutes (at ${task.startTime}). Write a brief, friendly reminder (1-2 sentences). Vary your style each time - sometimes playful, sometimes professional, sometimes motivational. Be creative!`
//     };

//     const selectedLang = language || "hinglish";
//     const prompt = prompts[selectedLang] || prompts.hinglish;

//     const completion = await groq.chat.completions.create({
//       model: "llama-3.3-70b-versatile",
//       messages: [
//         { role: "system", content: `${prompt}\n\nVary your approach EVERY time. Never sound robotic.` },
//         { role: "user", content: "Generate reminder message." }
//       ],
//       temperature: 0.9,
//       max_tokens: 100
//     });

//     res.json({ message: completion.choices[0].message.content });

//   } catch (error) {
//     console.error("Task reminder error:", error);
//     res.status(500).json({ error: "Failed to generate reminder" });
//   }
// });

// // ─── POST /api/task-checkin ─────────────────────────────────
// app.post("/api/task-checkin", async (req, res) => {
//   try {
//     const { task, language, currentDate } = req.body;

//     const prompts = {
//       hinglish: `User ne "${task.title}" task shuru kiya tha par abhi complete nahi kiya. 30 minutes ho gaye hain. Ek caring check-in message likh (1-2 sentences) jo puchhe ki kya ho gaya ya koi problem aayi. Har baar different way mein pucho - kabhi concerned, kabhi curious, kabhi supportive.`,
//       hindi: `"${task.title}" अभी पूरा नहीं हुआ। एक सहानुभूतिपूर्ण message लिखो जो पूछे क्या हुआ। हर बार अलग तरीके से।`,
//       english: `User started "${task.title}" but hasn't completed it after 30 mins. Write a caring check-in (1-2 sentences) asking if everything's okay or if they need help. Vary your approach - sometimes concerned, sometimes curious, sometimes supportive.`
//     };

//     const selectedLang = language || "hinglish";
//     const prompt = prompts[selectedLang] || prompts.hinglish;

//     const completion = await groq.chat.completions.create({
//       model: "llama-3.3-70b-versatile",
//       messages: [
//         { role: "system", content: `${prompt}\n\nBe genuinely caring. Never repetitive.` },
//         { role: "user", content: "Generate check-in message." }
//       ],
//       temperature: 0.9,
//       max_tokens: 100
//     });

//     res.json({ message: completion.choices[0].message.content });

//   } catch (error) {
//     console.error("Task check-in error:", error);
//     res.status(500).json({ error: "Failed to generate check-in" });
//   }
// });

// // ─── POST /api/random-motivation ────────────────────────────
// app.post("/api/random-motivation", async (req, res) => {
//   try {
//     const { language, taskContext, currentDate } = req.body;

//     const motivationTypes = [
//       "achievement_celebration",
//       "progress_encouragement",
//       "work_life_balance_reminder",
//       "stress_relief_tip",
//       "productivity_hack",
//       "mindfulness_moment",
//       "gratitude_prompt",
//       "future_vision_reminder"
//     ];

//     const randomType = motivationTypes[Math.floor(Math.random() * motivationTypes.length)];

//     const prompts = {
//       hinglish: `Type: ${randomType}. User ke ${taskContext.completed}/${taskContext.total} tasks done hain. Ek surprise motivational message likh (2-3 sentences) jo user ko energize kare. Context: ${randomType}. Har baar COMPLETELY different message - kabhi inspiring quote style, kabhi practical tip, kabhi emotional support, kabhi funny observation. Be creative and unpredictable!`
//     };

//     const completion = await groq.chat.completions.create({
//       model: "llama-3.3-70b-versatile",
//       messages: [
//         { role: "system", content: `${prompts.hinglish}\n\nBe HIGHLY creative. Think like a real supportive friend who knows when to surprise you with the right words.` },
//         { role: "user", content: "Generate unique motivation message." }
//       ],
//       temperature: 1.0, // Maximum creativity
//       max_tokens: 150
//     });

//     res.json({ message: completion.choices[0].message.content });

//   } catch (error) {
//     console.error("Random motivation error:", error);
//     res.status(500).json({ error: "Failed to generate motivation" });
//   }
// });

// // ─── POST /api/advanced-chat ────────────────────────────────
// app.post("/api/advanced-chat", async (req, res) => {
//   try {
//     const { messages, language, taskContext, isVoice, currentDate, voiceMode } = req.body;

//     if (!messages || !Array.isArray(messages)) {
//       return res.status(400).json({ error: "Messages array is required" });
//     }

//     const selectedLanguage = language || "hinglish";

//     // Enhanced system prompt for voice mode
//     let systemPrompt = buildSystemPrompt(selectedLanguage, taskContext);

//     if (isVoice && voiceMode === 'notes') {
//       systemPrompt += `\n\nVOICE NOTES MODE: User is dictating their daily notes. Just acknowledge briefly and confirm you've noted it. Don't over-explain. Be concise like: "Got it!" or "Noted!"`;
//     } else if (isVoice && voiceMode === 'tasks') {
//       systemPrompt += `\n\nVOICE TASKS MODE: User is speaking tasks. Parse what they say and add tasks automatically. Be brief in confirmation like: "Added!" or "Task created!"`;
//     }

//     const recentMessages = messages.slice(-20);

//     const tools = [
//       {
//         type: "function",
//         function: {
//           name: "update_notes",
//           description: "Update daily notes when user dictates content in voice notes mode. Append new content to existing notes.",
//           parameters: {
//             type: "object",
//             properties: {
//               content: {
//                 type: "string",
//                 description: "The text content to add to daily notes"
//               },
//               mode: {
//                 type: "string",
//                 enum: ["append", "replace"],
//                 description: "How to update notes - append adds to existing, replace overwrites"
//               }
//             },
//             required: ["content"]
//           }
//         }
//       },
//       {
//         type: "function",
//         function: {
//           name: "add_task",
//           description: "Add a task from voice or text input",
//           parameters: {
//             type: "object",
//             properties: {
//               title: { type: "string", description: "Task title" },
//               timeOfDay: { type: "string", enum: ["morning", "afternoon", "evening"] },
//               startTime: { type: "string", description: "Start time HH:MM" },
//               endTime: { type: "string", description: "End time HH:MM (optional)" }
//             },
//             required: ["title", "timeOfDay"]
//           }
//         }
//       },
//       {
//         type: "function",
//         function: {
//           name: "complete_task",
//           description: "Mark task as done",
//           parameters: {
//             type: "object",
//             properties: {
//               taskTitle: { type: "string" }
//             },
//             required: ["taskTitle"]
//           }
//         }
//       },
//       {
//         type: "function",
//         function: {
//           name: "delete_task",
//           description: "Delete a task",
//           parameters: {
//             type: "object",
//             properties: {
//               taskTitle: { type: "string" }
//             },
//             required: ["taskTitle"]
//           }
//         }
//       }
//     ];

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
//       temperature: 0.8,
//       max_tokens: 300
//     });

//     const response = completion.choices[0];

//     // Collect all actions
//     const actions = [];
//     if (response.message.tool_calls) {
//       for (const toolCall of response.message.tool_calls) {
//         actions.push({
//           type: toolCall.function.name,
//           params: JSON.parse(toolCall.function.arguments)
//         });
//       }
//     }

//     const reply = response.message.content || (actions.length > 0 ? "Done!" : "Hmm...");

//     res.json({
//       type: actions.length > 0 ? "actions" : "message",
//       message: reply,
//       actions: actions
//     });

//   } catch (error) {
//     console.error("Advanced chat error:", error);
//     res.status(500).json({ error: "Something went wrong" });
//   }
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