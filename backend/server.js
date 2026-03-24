// // // server.js — Firebase Auth + MongoDB version
// // // CHANGES vs Supabase version:
// // //   1. Firebase Admin SDK verifies ID tokens (replaces Supabase JWT)
// // //   2. MongoDB stores tasks, notes, alarms (replaces localStorage on frontend)
// // //   3. All existing AI/chat/flow endpoints are UNCHANGED
// // //
// // // INSTALL:
// // //   npm install firebase-admin mongoose ws groq-sdk express cors dotenv web-push

// // import express          from "express";
// // import Groq             from "groq-sdk";
// // import cors             from "cors";
// // import dotenv           from "dotenv";
// // import webPush          from "web-push";
// // import { createServer } from "http";
// // import { WebSocketServer, WebSocket } from "ws";
// // import admin            from "firebase-admin";
// // import mongoose         from "mongoose";

// // dotenv.config();

// // // ══════════════════════════════════════════════════════════════
// // // FIREBASE ADMIN SETUP
// // // ══════════════════════════════════════════════════════════════
// // // How to get serviceAccountKey.json:
// // //   console.firebase.google.com → Project Settings → Service Accounts
// // //   → Generate new private key → save as serviceAccountKey.json in project root

// // import { createRequire } from "module";
// // const require = createRequire(import.meta.url);
// // const serviceAccount = require("./serviceAccountKey.json");

// // admin.initializeApp({
// //   credential: admin.credential.cert(serviceAccount),
// // });

// // // ── Middleware: verify Firebase ID token ──────────────────────
// // async function requireAuth(req, res, next) {
// //   const authHeader = req.headers.authorization || "";
// //   const token = authHeader.startsWith("Bearer ") ? authHeader.slice(7) : null;
// //   if (!token) return res.status(401).json({ error: "No auth token" });
// //   try {
// //     const decoded = await admin.auth().verifyIdToken(token);
// //     req.userId = decoded.uid;   // Firebase UID — stable unique ID per user
// //     next();
// //   } catch (err) {
// //     return res.status(401).json({ error: "Invalid or expired token" });
// //   }
// // }

// // // ══════════════════════════════════════════════════════════════
// // // MONGODB SETUP
// // // ══════════════════════════════════════════════════════════════
// // // .env:  MONGODB_URI=mongodb+srv://user:pass@cluster.mongodb.net/cozyspace

// // mongoose.connect(process.env.MONGODB_URI || "mongodb://localhost:27017/cozyspace")
// //   .then(() => console.log("✅ MongoDB connected"))
// //   .catch(err => console.error("❌ MongoDB connection error:", err));

// // // ── Schemas ───────────────────────────────────────────────────

// // // Individual task shape (embedded in DayDoc)
// // const TaskSchema = new mongoose.Schema({
// //   id:          { type: Number, required: true },
// //   title:       { type: String, required: true },
// //   completed:   { type: Boolean, default: false },
// //   timeOfDay:   { type: String, enum: ["morning", "afternoon", "evening"], default: "morning" },
// //   startTime:   { type: String, default: null },
// //   endTime:     { type: String, default: null },
// //   status:      { type: String, default: "idle" },
// //   startedAt:   { type: String, default: null },
// //   completedAt: { type: String, default: null },
// //   actualTime:  { type: Number, default: null },
// //   snoozed:     { type: Boolean, default: false },
// // }, { _id: false });

// // // One document per user per day
// // const DaySchema = new mongoose.Schema({
// //   userId:     { type: String, required: true, index: true },
// //   date:       { type: String, required: true },           // "YYYY-MM-DD"
// //   tasks:      { type: [TaskSchema], default: [] },
// //   reflection: { type: mongoose.Schema.Types.Mixed, default: null },
// // }, { timestamps: true });
// // DaySchema.index({ userId: 1, date: 1 }, { unique: true });
// // const Day = mongoose.model("Day", DaySchema);

// // // One document per user per day for notes
// // const NoteSchema = new mongoose.Schema({
// //   userId:  { type: String, required: true },
// //   date:    { type: String, required: true },
// //   content: { type: String, default: "" },
// // }, { timestamps: true });
// // NoteSchema.index({ userId: 1, date: 1 }, { unique: true });
// // const Note = mongoose.model("Note", NoteSchema);

// // // One document per user for alarms (array, max 4)
// // const AlarmSchema = new mongoose.Schema({
// //   userId: { type: String, required: true, unique: true },
// //   alarms: { type: Array, default: [] },
// // }, { timestamps: true });
// // const Alarm = mongoose.model("Alarm", AlarmSchema);

// // // ══════════════════════════════════════════════════════════════
// // // EXPRESS + WEBSOCKET
// // // ══════════════════════════════════════════════════════════════
// // const app        = express();
// // const PORT       = process.env.PORT || 3001;
// // const httpServer = createServer(app);
// // const wss        = new WebSocketServer({ server: httpServer });
// // const clients    = new Map();

// // app.use(cors({
// //   origin:  process.env.FRONTEND_URL || "http://localhost:5173" ,
// //   methods: ["GET","POST","PUT","DELETE"],
// //   allowedHeaders: ["Content-Type", "Authorization"],
// // }));
// // app.use(express.json());

// // // ── WebSocket (unchanged from your original) ──────────────────
// // wss.on("connection", (ws) => {
// //   const clientMeta = { tabId: null, date: null, isAlive: true };
// //   clients.set(ws, clientMeta);
// //   ws.on("pong", () => { const m = clients.get(ws); if (m) m.isAlive = true; });
// //   ws.on("message", (raw) => {
// //     let msg; try { msg = JSON.parse(raw.toString()); } catch { return; }
// //     const meta = clients.get(ws); if (!meta) return;
// //     switch (msg.type) {
// //       case "REGISTER":   meta.tabId = msg.tabId; meta.date = msg.date || null; safeSend(ws, { type: "REGISTERED", tabId: msg.tabId, serverTime: Date.now() }); break;
// //       case "DATE_CHANGE": meta.date = msg.date; break;
// //       case "BROADCAST":  fanOut(ws, msg); break;
// //       case "PING":       safeSend(ws, { type: "PONG", serverTime: Date.now() }); break;
// //     }
// //   });
// //   ws.on("close", () => clients.delete(ws));
// //   ws.on("error", () => clients.delete(ws));
// // });

// // function fanOut(senderWs, msg) {
// //   const senderMeta = clients.get(senderWs);
// //   for (const [ws] of clients) {
// //     if (ws === senderWs || ws.readyState !== WebSocket.OPEN) continue;
// //     safeSend(ws, { type: "SYNC_EVENT", changeType: msg.changeType, payload: msg.payload, fromTabId: senderMeta?.tabId, serverTime: Date.now() });
// //   }
// // }
// // function safeSend(ws, data) { if (ws.readyState === WebSocket.OPEN) ws.send(JSON.stringify(data)); }
// // const heartbeat = setInterval(() => {
// //   for (const [ws, meta] of clients) { if (!meta.isAlive) { clients.delete(ws); ws.terminate(); continue; } meta.isAlive = false; ws.ping(); }
// // }, 30_000);
// // wss.on("close", () => clearInterval(heartbeat));

// // // ══════════════════════════════════════════════════════════════
// // // DATA ROUTES — all protected by requireAuth
// // // ══════════════════════════════════════════════════════════════

// // // ── DAYS ──────────────────────────────────────────────────────

// // // GET /api/days — all days for the user
// // app.get("/api/days", requireAuth, async (req, res) => {
// //   try {
// //     const days = await Day.find({ userId: req.userId }).lean();
// //     // Return as object keyed by date (matches your old localStorage shape)
// //     const result = {};
// //     for (const d of days) result[d.date] = { date: d.date, tasks: d.tasks, reflection: d.reflection };
// //     res.json(result);
// //   } catch (e) { res.status(500).json({ error: e.message }); }
// // });

// // // GET /api/days/:date — one day
// // app.get("/api/days/:date", requireAuth, async (req, res) => {
// //   try {
// //     const doc = await Day.findOne({ userId: req.userId, date: req.params.date }).lean();
// //     res.json(doc || { date: req.params.date, tasks: [], reflection: null });
// //   } catch (e) { res.status(500).json({ error: e.message }); }
// // });

// // // PUT /api/days/:date — upsert a day
// // app.put("/api/days/:date", requireAuth, async (req, res) => {
// //   try {
// //     const { tasks, reflection } = req.body;
// //     const doc = await Day.findOneAndUpdate(
// //       { userId: req.userId, date: req.params.date },
// //       { $set: { tasks: tasks || [], reflection: reflection ?? null } },
// //       { upsert: true, new: true }
// //     ).lean();
// //     res.json({ date: doc.date, tasks: doc.tasks, reflection: doc.reflection });
// //   } catch (e) { res.status(500).json({ error: e.message }); }
// // });

// // // ── NOTES ─────────────────────────────────────────────────────

// // // GET /api/notes/:date
// // app.get("/api/notes/:date", requireAuth, async (req, res) => {
// //   try {
// //     const doc = await Note.findOne({ userId: req.userId, date: req.params.date }).lean();
// //     res.json({ content: doc?.content || "" });
// //   } catch (e) { res.status(500).json({ error: e.message }); }
// // });

// // // PUT /api/notes/:date — full replace
// // app.put("/api/notes/:date", requireAuth, async (req, res) => {
// //   try {
// //     await Note.findOneAndUpdate(
// //       { userId: req.userId, date: req.params.date },
// //       { $set: { content: req.body.content || "" } },
// //       { upsert: true }
// //     );
// //     res.json({ ok: true });
// //   } catch (e) { res.status(500).json({ error: e.message }); }
// // });

// // // POST /api/notes/:date/append — append with timestamp
// // app.post("/api/notes/:date/append", requireAuth, async (req, res) => {
// //   try {
// //     const content = req.body.content || "";
// //     const time = new Date().toLocaleTimeString("en-US", { hour: "2-digit", minute: "2-digit" });
// //     const line = `[${time}] ${content}`;
// //     await Note.findOneAndUpdate(
// //       { userId: req.userId, date: req.params.date },
// //       { $set: { content: "" } },           // ensure doc exists
// //       { upsert: true }
// //     );
// //     // Read then append to preserve the existing content
// //     const doc = await Note.findOne({ userId: req.userId, date: req.params.date });
// //     doc.content = doc.content ? `${doc.content}\n\n${line}` : line;
// //     await doc.save();
// //     res.json({ ok: true, content: doc.content });
// //   } catch (e) { res.status(500).json({ error: e.message }); }
// // });

// // // ── ALARMS ────────────────────────────────────────────────────

// // // GET /api/alarms
// // app.get("/api/alarms", requireAuth, async (req, res) => {
// //   try {
// //     const doc = await Alarm.findOne({ userId: req.userId }).lean();
// //     res.json(doc?.alarms || []);
// //   } catch (e) { res.status(500).json({ error: e.message }); }
// // });

// // // PUT /api/alarms — replace entire array
// // app.put("/api/alarms", requireAuth, async (req, res) => {
// //   try {
// //     await Alarm.findOneAndUpdate(
// //       { userId: req.userId },
// //       { $set: { alarms: req.body.alarms || [] } },
// //       { upsert: true }
// //     );
// //     res.json({ ok: true });
// //   } catch (e) { res.status(500).json({ error: e.message }); }
// // });

// // // ══════════════════════════════════════════════════════════════
// // // HEALTH
// // // ══════════════════════════════════════════════════════════════
// // app.get("/api/health", (req, res) => res.json({ status: "ok", wsClients: clients.size }));
// // app.get("/api/ws-stats", (req, res) => {
// //   const tabs = [];
// //   for (const [, meta] of clients) tabs.push({ tabId: meta.tabId, date: meta.date });
// //   res.json({ connected: clients.size, tabs });
// // });

// // // ══════════════════════════════════════════════════════════════
// // // WEB PUSH (unchanged)
// // // ══════════════════════════════════════════════════════════════
// // webPush.setVapidDetails(
// //   "mailto:your-email@example.com",
// //   process.env.VAPID_PUBLIC_KEY,
// //   process.env.VAPID_PRIVATE_KEY
// // );

// // const subscriptions = new Map();
// // app.post("/api/subscribe", requireAuth, async (req, res) => {
// //   try {
// //     const { subscription } = req.body;
// //     if (!subscription) return res.status(400).json({ error: "Required" });
// //     subscriptions.set(req.userId, subscription);
// //     res.json({ success: true });
// //   } catch (e) { res.status(500).json({ error: "Failed" }); }
// // });

// // // ══════════════════════════════════════════════════════════════
// // // AI / CHAT ROUTES (100% unchanged from your original server.js)
// // // ══════════════════════════════════════════════════════════════
// // const groq = new Groq({ apiKey: process.env.GROQ_API_KEY });

// // // ── Multi-model pool with automatic round-robin + fallback ────
// // // If one model is rate-limited (429) or decommissioned (400),
// // // it is skipped automatically and the next model is tried.
// // // Fast models → used for quick nudges, intros, parsing (low latency)
// // // Smart models → used for chat, planning, complex responses (higher quality)

// // const FAST_MODELS = [
// //   "llama-3.1-8b-instant",
// //   "meta-llama/llama-4-scout-17b-16e-instruct",
// //   "gemma2-9b-it",
// //   "llama3-8b-8192",
// // ];

// // const SMART_MODELS = [
// //   "llama-3.3-70b-versatile",
// //   "meta-llama/llama-4-maverick-17b-128e-instruct",
// //   "llama-3.1-70b-versatile",
// //   "llama3-70b-8192",
// // ];

// // // Track which index we are at for each pool
// // let fastIdx  = 0;
// // let smartIdx = 0;

// // // Track models that have recently failed so we skip them
// // const failedModels    = new Map(); // model → timestamp of failure
// // const FAILURE_COOLDOWN = 60_000;  // 60 seconds before retrying a failed model

// // function isModelAvailable(model) {
// //   if (!failedModels.has(model)) return true;
// //   const failedAt = failedModels.get(model);
// //   if (Date.now() - failedAt > FAILURE_COOLDOWN) {
// //     failedModels.delete(model); // cooldown passed, allow retry
// //     return true;
// //   }
// //   return false;
// // }

// // function markModelFailed(model) {
// //   failedModels.set(model, Date.now());
// //   console.warn(`⚠️  Model marked unavailable: ${model}`);
// // }

// // // Get next available model from pool, skipping failed ones
// // function getNextModel(models, idxRef, isSmart) {
// //   const pool = [...models]; // copy so we can iterate safely
// //   for (let attempt = 0; attempt < pool.length; attempt++) {
// //     const idx   = (isSmart ? smartIdx : fastIdx) % pool.length;
// //     const model = pool[idx];
// //     if (isSmart) smartIdx++; else fastIdx++;
// //     if (isModelAvailable(model)) return model;
// //     console.log(`⏭  Skipping unavailable model: ${model}`);
// //   }
// //   // All models failed — return the first one anyway (best effort)
// //   console.error("❌ All models in pool are marked failed! Using first as fallback.");
// //   return models[0];
// // }

// // async function callGroq(messages, tools = null, smart = false, maxTokens = 600) {
// //   const pool  = smart ? SMART_MODELS : FAST_MODELS;
// //   const model = getNextModel(pool, null, smart);

// //   const params = {
// //     model,
// //     messages,
// //     temperature: 0.7,
// //     max_tokens:  maxTokens,
// //   };
// //   if (tools?.length) {
// //     params.tools        = tools;
// //     params.tool_choice  = "auto";
// //   }

// //   console.log(`🤖 Using model: ${model} (${smart ? "smart" : "fast"})`);

// //   try {
// //     return await groq.chat.completions.create(params);

// //   } catch (e) {
// //     const errStr  = JSON.stringify(e.error || e.message || "");
// //     const is429   = e.status === 429;
// //     const is400   = e.status === 400;
// //     const isDead  = is400 && (errStr.includes("decommission") || errStr.includes("deprecated") || errStr.includes("not found"));
// //     const isLimit = is429 || isDead;

// //     if (isLimit) {
// //       // Mark this model as temporarily failed
// //       markModelFailed(model);
// //       console.warn(`🔄 Model ${model} failed (${e.status}), switching to next model...`);

// //       // Try every other model in the pool before giving up
// //       for (let i = 0; i < pool.length - 1; i++) {
// //         const fallback = getNextModel(pool, null, smart);
// //         if (fallback === model) continue; // same model, skip
// //         console.log(`🔁 Fallback attempt with: ${fallback}`);
// //         try {
// //           params.model = fallback;
// //           const result = await groq.chat.completions.create(params);
// //           console.log(`✅ Fallback succeeded with: ${fallback}`);
// //           return result;
// //         } catch (e2) {
// //           const errStr2 = JSON.stringify(e2.error || e2.message || "");
// //           if (e2.status === 429 || (e2.status === 400 && errStr2.includes("decommission"))) {
// //             markModelFailed(fallback);
// //             console.warn(`🔄 Fallback ${fallback} also failed, trying next...`);
// //             continue;
// //           }
// //           throw e2; // non-rate-limit error, bubble up
// //         }
// //       }

// //       // If smart models all failed, fall back to fast models (last resort)
// //       if (smart) {
// //         console.warn("🆘 All smart models failed — falling back to fast model pool");
// //         const lastResort = FAST_MODELS.find(m => isModelAvailable(m)) || FAST_MODELS[0];
// //         params.model = lastResort;
// //         return await groq.chat.completions.create(params);
// //       }
// //     }

// //     throw e; // unknown error, bubble up
// //   }
// // }

// // function getLangRule(language) {
// //   return { hindi: "ONLY Hindi.", english: "ONLY casual English.", hinglish: "Casual Hinglish mix." }[language] || "Casual Hinglish mix.";
// // }

// // function getDateInfo(clientDate) {
// //   const todayStr = clientDate || new Date().toISOString().slice(0, 10);
// //   const [y, m, d] = todayStr.split("-").map(Number);
// //   const tomorrowDate = new Date(y, m - 1, d + 1);
// //   const tomorrowStr = `${tomorrowDate.getFullYear()}-${String(tomorrowDate.getMonth()+1).padStart(2,"0")}-${String(tomorrowDate.getDate()).padStart(2,"0")}`;
// //   return { today: todayStr, tomorrow: tomorrowStr, currentTime: new Date().toLocaleTimeString("en-US", { hour: "2-digit", minute: "2-digit", hour12: false }) };
// // }

// // function cleanTitle(raw) {
// //   if (!raw) return raw;
// //   return raw.replace(/^(add\s+a?\s*task\s*[:-]?\s*|add\s+a?\s*)/i,"").replace(/\s+at\s+\d{1,2}(:\d{2})?\s*(am|pm|AM|PM)?(\s|$)/gi," ").replace(/\s{2,}/g," ").trim();
// // }

// // function buildSystemPrompt(language, taskContext, clientDate) {
// //   const { total, completed, pending, pendingTasks } = taskContext;
// //   const { today, tomorrow, currentTime } = getDateInfo(clientDate);
// //   let taskSnapshot = total === 0 ? "User has NO tasks today yet." : `Tasks: ${completed} done, ${pending} pending.\nPending: ${pendingTasks.map(t => `"${t.title}"${t.startTime ? ` at ${t.startTime}` : ""}`).join(", ")}`;
// //   return `You are a warm, smart AI buddy for daily planning.
// // LANGUAGE: ${getLangRule(language)}
// // ${taskSnapshot}
// // CURRENT TIME: ${currentTime} | TODAY: ${today} | TOMORROW: ${tomorrow}
// // ══════════════════════════════════════════════
// // GOLDEN RULE: IF USER ALREADY GAVE THE INFO — JUST DO IT. NO FOLLOW-UP QUESTIONS.
// // ══════════════════════════════════════════════
// // CRITICAL TITLE RULE: NEVER include "add", time, or date in the title.
// // Examples:
// // ✅ "add a task at 11:40pm i will git push" → add_task(title:"git push", timeOfDay:"evening", startTime:"23:40", date:"${today}")
// // ✅ "add task gym tomorrow 6am" → add_task(title:"gym", timeOfDay:"morning", startTime:"06:00", date:"${tomorrow}")
// // ✅ "set alarm 7am tomorrow" → set_alarm(time:"07:00", date:"${tomorrow}", label:"Alarm", repeat:"once")
// // DATE RULES: Default date="${today}" | "tomorrow"/"kal" → "${tomorrow}"
// // TIME RULES: "9 am"="09:00" | "9 pm"="21:00" | 5am-noon=morning | noon-5pm=afternoon | 5pm+=evening
// // Keep replies SHORT (1-2 sentences). Be warm and encouraging.`.trim();
// // }

// // const TOOLS = [
// //   { type:"function", function:{ name:"set_reminder", description:"Set a reminder.", parameters:{ type:"object", properties:{ time:{type:"string"}, message:{type:"string"}, date:{type:"string"} }, required:["time","message","date"] } } },
// //   { type:"function", function:{ name:"set_alarm",    description:"Set an alarm.",   parameters:{ type:"object", properties:{ time:{type:"string"}, date:{type:"string"}, label:{type:"string"}, repeat:{type:"string", enum:["once","daily","custom"]} }, required:["time","date"] } } },
// //   { type:"function", function:{ name:"update_notes", description:"Update daily notes.", parameters:{ type:"object", properties:{ content:{type:"string"}, mode:{type:"string", enum:["append","replace"]} }, required:["content"] } } },
// //   { type:"function", function:{ name:"add_task",     description:"Add a task. TITLE = ONLY the task name.", parameters:{ type:"object", properties:{ title:{type:"string"}, timeOfDay:{type:"string", enum:["morning","afternoon","evening"]}, startTime:{type:"string"}, endTime:{type:"string"}, date:{type:"string"} }, required:["title","timeOfDay","date"] } } },
// //   { type:"function", function:{ name:"complete_task", description:"Mark a task done.", parameters:{ type:"object", properties:{ taskTitle:{type:"string"} }, required:["taskTitle"] } } },
// //   { type:"function", function:{ name:"delete_task",   description:"Delete a task.",    parameters:{ type:"object", properties:{ taskTitle:{type:"string"} }, required:["taskTitle"] } } },
// // ];

// // // ── /api/advanced-chat ─────────────────────────────────────────
// // app.post("/api/advanced-chat", async (req, res) => {
// //   try {
// //     const { messages, language, taskContext, isVoice, currentDate, voiceMode } = req.body;
// //     if (!messages || !Array.isArray(messages)) return res.status(400).json({ error: "Messages required" });
// //     const { today } = getDateInfo(currentDate);
// //     const lastMsg = messages[messages.length - 1]?.content || "";
// //     if (/notes?\s+mein|daily\s+notes|meri\s+daily/i.test(lastMsg)) {
// //       const content = lastMsg.replace(/(bhai\s+)?add\s+kar\s+(de|do)\s*/gi,"").replace(/notes?\s+mein\s+(add\s+kar\s+do|likh\s+do)\s*/gi,"").trim();
// //       return res.json({ message: language === "english" ? "📝 Added to your notes!" : "📝 Notes mein add ho gaya!", actions: [{ type: "update_notes", params: { content, mode: "append" } }] });
// //     }
// //     let systemPrompt = buildSystemPrompt(language || "hinglish", taskContext, currentDate);
// //     if (isVoice && voiceMode === "notes") systemPrompt += "\n\nVOICE NOTES MODE: ALWAYS call update_notes.";
// //     else if (voiceMode === "tasks")       systemPrompt += "\n\nTASKS MODE: Parse and add/complete/delete tasks.";
// //     const completion = await callGroq([{ role:"system", content:systemPrompt }, ...messages.slice(-20).map(m => ({ role:m.role, content:m.content }))], TOOLS, true, 600);
// //     const response = completion.choices[0];
// //     const actions  = [];
// //     if (response.message.tool_calls) {
// //       for (const toolCall of response.message.tool_calls) {
// //         try {
// //           const params = JSON.parse(toolCall.function.arguments);
// //           const name   = toolCall.function.name;
// //           if (["add_task","set_alarm","set_reminder"].includes(name) && !params.date) params.date = today;
// //           if (name === "set_alarm") { if (!params.label) params.label = "Alarm"; if (!params.repeat) params.repeat = "once"; }
// //           if (name === "add_task" && params.title) params.title = cleanTitle(params.title);
// //           actions.push({ type: name, params });
// //         } catch {}
// //       }
// //     }
// //     res.json({ message: response.message.content || "Done! ✅", actions });
// //   } catch (error) { console.error("Chat error:", error); res.status(500).json({ error: "Something went wrong" }); }
// // });

// // // ── /api/buddy-intro ──────────────────────────────────────────
// // app.post("/api/buddy-intro", async (req, res) => {
// //   try {
// //     const { language, taskContext, currentTime, currentDate } = req.body;
// //     const { total, pending, pendingTasks } = taskContext;
// //     const hour = parseInt((currentTime || "12:00").split(":")[0]);
// //     const greeting = hour < 12 ? "morning" : hour < 17 ? "afternoon" : "evening";
// //     const prompt = `You are a friendly AI buddy. ${getLangRule(language)}\nGood ${greeting}! ${total === 0 ? "No tasks yet." : `${pending} pending: ${pendingTasks.slice(0,2).map(t=>`"${t.title}"`).join(", ")}${pending>2?` and ${pending-2} more`:""}. `}\nWrite ONE warm greeting. Max 20 words. 1 emoji.`;
// //     const c = await callGroq([{ role:"user", content:prompt }], null, false, 80);
// //     res.json({ message: c.choices[0].message.content?.trim() || "Hey! 👋 Ready to make today awesome?", quickActions: [{ label:"➕ Add Task", action:"add_task_flow" }, { label:"⏰ Set Alarm", action:"alarm_flow" }, { label:"🔔 Reminder", action:"reminder_flow" }, { label:"📅 Plan My Day", action:"plan_day_flow" }] });
// //   } catch { res.json({ message:"Hey! 👋 Kya karna hai aaj?", quickActions:[{ label:"➕ Add Task", action:"add_task_flow" }, { label:"⏰ Set Alarm", action:"alarm_flow" }, { label:"🔔 Reminder", action:"reminder_flow" }, { label:"📅 Plan My Day", action:"plan_day_flow" }] }); }
// // });

// // // ── /api/buddy-nudge ─────────────────────────────────────────
// // app.post("/api/buddy-nudge", async (req, res) => {
// //   try {
// //     const { language, taskContext, nudgeIndex } = req.body;
// //     const { pending, pendingTasks } = taskContext;
// //     const nudgeTypes = [
// //       { ctx:`Say hi. ${pending>0?`${pending} tasks pending.`:"No tasks yet."}`, chips:[{label:"➕ Add Task",action:"add_task_flow"},{label:"📅 Plan Day",action:"plan_day_flow"}] },
// //       { ctx:`Encourage tasks. ${pending>0?`Pending: ${pendingTasks.slice(0,2).map(t=>t.title).join(", ")}`:"All done!"}`, chips:[{label:"✅ Mark Done",action:"check_task_flow"},{label:"➕ Add Task",action:"add_task_flow"}] },
// //       { ctx:`Suggest writing notes.`, chips:[{label:"📝 Write Notes",action:"notes_flow"},{label:"💬 Chat",action:"open_chat"}] },
// //       { ctx:`Suggest alarm or reminder.`, chips:[{label:"⏰ Set Alarm",action:"alarm_flow"},{label:"🔔 Reminder",action:"reminder_flow"}] },
// //     ];
// //     const { ctx, chips } = nudgeTypes[nudgeIndex % 4];
// //     const prompt = `Friendly AI buddy. ${getLangRule(language)}\n${ctx}\nWrite ONE nudge (max 12 words). 1 emoji.`;
// //     const c = await callGroq([{ role:"user", content:prompt }], null, false, 50);
// //     res.json({ message: c.choices[0].message.content?.trim() || "Hey! 👋", quickActions: chips });
// //   } catch {
// //     const fallbacks = [
// //       { message:"Hey! 👋 Tap to chat!", quickActions:[{label:"➕ Add Task",action:"add_task_flow"},{label:"📅 Plan Day",action:"plan_day_flow"}] },
// //       { message:"Got tasks? Let me help! 🎯", quickActions:[{label:"✅ Mark Done",action:"check_task_flow"},{label:"➕ Add Task",action:"add_task_flow"}] },
// //       { message:"Write your day in notes 📝", quickActions:[{label:"📝 Write Notes",action:"notes_flow"},{label:"💬 Chat",action:"open_chat"}] },
// //       { message:"Need alarm or reminder? ⏰", quickActions:[{label:"⏰ Set Alarm",action:"alarm_flow"},{label:"🔔 Reminder",action:"reminder_flow"}] },
// //     ];
// //     res.json(fallbacks[(req.body.nudgeIndex || 0) % 4]);
// //   }
// // });

// // // ── /api/flow-step ────────────────────────────────────────────
// // // (Paste your full original flow-step handler here — it is 100% unchanged)
// // // We keep it short here since it's identical to your original server.js flow-step.
// // app.post("/api/flow-step", async (req, res) => {
// //   try {
// //     const { flow, step, userInput, language, taskContext, flowData, currentTime, currentDate } = req.body;
// //     const { today, tomorrow } = getDateInfo(currentDate);
// //     const lang = getLangRule(language);
// //     const isTomorrow    = (text) => /tomorrow|kal\b|next\s+day/i.test(text || "");
// //     const getTargetDate = (text) => isTomorrow(text) ? tomorrow : today;
// //     const formatDateLabel = (date) => date === tomorrow ? (language==="english"?"for tomorrow":"kal ke liye") : date === today ? (language==="english"?"for today":"aaj ke liye") : `for ${date}`;

// //     if (flow === "add_task_flow") {
// //       if (step === "start") {
// //         const parseRes = await callGroq([{ role:"user", content:`${lang}\nUser wants to add task. Message: "${userInput||""}"\nTODAY:${today} TOMORROW:${tomorrow}\nExtract JSON: { "title":"ONLY task name","startTime":null,"endTime":null,"timeOfDay":null,"date":"${today}" }\nExamples: "add task gym 6am" → title:"gym". JSON only.` }], null, false, 150);
// //         let parsed = {};
// //         try { parsed = JSON.parse(parseRes.choices[0].message.content.replace(/```json|```/g,"").trim()); } catch {}
// //         if (!parsed.date) parsed.date = today;
// //         if (parsed.title) parsed.title = cleanTitle(parsed.title);
// //         if (parsed.title && parsed.timeOfDay) return res.json({ message: language==="english"?`✅ Added "${parsed.title}" ${formatDateLabel(parsed.date)}!`:`✅ "${parsed.title}" add ho gaya!`, actions:[{ type:"add_task", params:{title:parsed.title,timeOfDay:parsed.timeOfDay,startTime:parsed.startTime||null,endTime:parsed.endTime||null,date:parsed.date} }], nextStep:"done", quickActions:[{label:"➕ Add Another",action:"add_task_flow"},{label:"✅ Mark Done",action:"check_task_flow"}] });
// //         if (parsed.title) return res.json({ message:language==="english"?`When to do "${parsed.title}"?`:`"${parsed.title}" kab karna hai?`, nextStep:"ask_time", flow:"add_task_flow", flowData:{title:parsed.title,date:parsed.date} });
// //         return res.json({ message:language==="english"?"What task to add? 🤔":"Kya task add karna hai? 🤔", nextStep:"ask_title", flow:"add_task_flow", flowData:{date:getTargetDate(userInput)} });
// //       }
// //       if (step === "ask_title") {
// //         const inherited = flowData.date || today;
// //         const parseRes = await callGroq([{ role:"user", content:`User said: "${userInput}" | TODAY:${today} TOMORROW:${tomorrow} | Inherited:"${inherited}"\nExtract: { "title":"task name only","startTime":null,"endTime":null,"timeOfDay":null,"date":"YYYY-MM-DD" }\nJSON only.` }], null, false, 100);
// //         let parsed = { title:userInput, date:inherited };
// //         try { parsed = { title:userInput, date:inherited, ...JSON.parse(parseRes.choices[0].message.content.replace(/```json|```/g,"").trim()) }; } catch {}
// //         if (!parsed.date) parsed.date = inherited;
// //         if (parsed.title) parsed.title = cleanTitle(parsed.title);
// //         if (parsed.timeOfDay) return res.json({ message:language==="english"?`✅ Added "${parsed.title}"!`:`✅ "${parsed.title}" add ho gaya!`, actions:[{ type:"add_task", params:{title:parsed.title,timeOfDay:parsed.timeOfDay,startTime:parsed.startTime||null,endTime:parsed.endTime||null,date:parsed.date} }], nextStep:"done", quickActions:[{label:"➕ Add Another",action:"add_task_flow"}] });
// //         return res.json({ message:language==="english"?`"${parsed.title}" — morning, afternoon, or evening?`:`"${parsed.title}" — morning, afternoon, ya evening?`, nextStep:"ask_time", flow:"add_task_flow", flowData:{title:parsed.title,date:parsed.date} });
// //       }
// //       if (step === "ask_time") {
// //         const title = flowData.title || "task", taskDate = flowData.date || today;
// //         const parseRes = await callGroq([{ role:"user", content:`User said: "${userInput}" for time of "${title}". Parse: { "timeOfDay":"morning/afternoon/evening","startTime":null,"endTime":null }. JSON only.` }], null, false, 100);
// //         let parsed = { timeOfDay:"morning", startTime:null, endTime:null };
// //         try { parsed = { ...parsed, ...JSON.parse(parseRes.choices[0].message.content.replace(/```json|```/g,"").trim()) }; } catch {}
// //         return res.json({ message:language==="english"?`✅ Added "${title}"!`:`✅ "${title}" add ho gaya!`, actions:[{ type:"add_task", params:{title,timeOfDay:parsed.timeOfDay,startTime:parsed.startTime,endTime:parsed.endTime,date:taskDate} }], nextStep:"done", quickActions:[{label:"➕ Add Another",action:"add_task_flow"}] });
// //       }
// //     }

// //     if (flow === "alarm_flow") {
// //       if (step === "start") {
// //         const parseRes = await callGroq([{ role:"user", content:`User wants alarm: "${userInput||""}"\nTODAY:${today} TOMORROW:${tomorrow}\nExtract: { "time":null,"date":"${today}","label":"Alarm","repeat":"once","ampm_clear":true }\nJSON only.` }], null, false, 150);
// //         let parsed = {};
// //         try { parsed = JSON.parse(parseRes.choices[0].message.content.replace(/```json|```/g,"").trim()); } catch {}
// //         if (!parsed.date) parsed.date = today; if (!parsed.repeat) parsed.repeat = "once";
// //         if (parsed.time && parsed.ampm_clear !== false) return res.json({ message:language==="english"?`⏰ Alarm set for ${parsed.time}!`:`⏰ Alarm set ho gaya!`, actions:[{ type:"set_alarm", params:{time:parsed.time,date:parsed.date,label:parsed.label||"Alarm",repeat:parsed.repeat} }], nextStep:"done", quickActions:[{label:"➕ Add Task",action:"add_task_flow"},{label:"🔔 Reminder",action:"reminder_flow"}] });
// //         if (parsed.time) { const h = parseInt(parsed.time.split(":")[0])%12||12; return res.json({ message:language==="english"?`${h} AM or PM?`:`${h} AM hai ya PM?`, nextStep:"ask_ampm", flow:"alarm_flow", flowData:{time:parsed.time,date:parsed.date,label:parsed.label||"Alarm",repeat:parsed.repeat} }); }
// //         return res.json({ message:language==="english"?"What time for alarm? ⏰":"Konse time ka alarm? ⏰", nextStep:"ask_time", flow:"alarm_flow", flowData:{date:getTargetDate(userInput)} });
// //       }
// //       if (step === "ask_time") {
// //         const inherited = flowData.date || today;
// //         const parseRes = await callGroq([{ role:"user", content:`User said "${userInput}" for alarm. TODAY:${today} Inherited:${inherited}\nParse: { "time":null,"date":"${inherited}","ampm_clear":true }\nJSON only.` }], null, false, 100);
// //         let parsed = { time:null, date:inherited, ampm_clear:true };
// //         try { parsed = { ...parsed, ...JSON.parse(parseRes.choices[0].message.content.replace(/```json|```/g,"").trim()) }; } catch {}
// //         if (!parsed.date) parsed.date = inherited;
// //         if (parsed.time && parsed.ampm_clear !== false) return res.json({ message:language==="english"?`⏰ Alarm set for ${parsed.time}!`:`⏰ Alarm set ho gaya!`, actions:[{ type:"set_alarm", params:{time:parsed.time,date:parsed.date,label:"Alarm",repeat:"once"} }], nextStep:"done", quickActions:[{label:"➕ Add Task",action:"add_task_flow"}] });
// //         if (parsed.time) { const h = parseInt(parsed.time.split(":")[0])%12||12; return res.json({ message:language==="english"?`${h} AM or PM?`:`${h} AM ya PM?`, nextStep:"ask_ampm", flow:"alarm_flow", flowData:{time:parsed.time,date:parsed.date,label:"Alarm",repeat:"once"} }); }
// //         return res.json({ message:"Please give a valid time like 7am or 9:30pm", nextStep:"ask_time", flow:"alarm_flow", flowData:{date:inherited} });
// //       }
// //       if (step === "ask_ampm") {
// //         const isAM = /am|subah|morning/i.test(userInput), isPM = /pm|raat|sham|evening|night/i.test(userInput);
// //         let time = flowData.time || "07:00";
// //         const [h] = time.split(":").map(Number);
// //         if (isPM && h < 12) time = `${String(h+12).padStart(2,"0")}:${time.split(":")[1]}`;
// //         else if (isAM && h === 12) time = `00:${time.split(":")[1]}`;
// //         return res.json({ message:language==="english"?`⏰ Alarm set for ${time}!`:`⏰ Alarm set ho gaya!`, actions:[{ type:"set_alarm", params:{time,date:flowData.date||today,label:flowData.label||"Alarm",repeat:flowData.repeat||"once"} }], nextStep:"done", quickActions:[{label:"➕ Add Task",action:"add_task_flow"}] });
// //       }
// //     }

// //     if (flow === "reminder_flow") {
// //       if (step === "start") {
// //         const parseRes = await callGroq([{ role:"user", content:`Reminder request: "${userInput||""}"\nTODAY:${today} TOMORROW:${tomorrow}\nParse: { "time":null,"message":null,"date":"${today}" }\nJSON only.` }], null, false, 120);
// //         let parsed = {};
// //         try { parsed = JSON.parse(parseRes.choices[0].message.content.replace(/```json|```/g,"").trim()); } catch {}
// //         if (!parsed.date) parsed.date = today;
// //         if (parsed.time && parsed.message) return res.json({ message:language==="english"?`🔔 Reminder set for ${parsed.time}!`:`🔔 Reminder set ho gaya!`, actions:[{ type:"set_reminder", params:{time:parsed.time,message:parsed.message,date:parsed.date} }], nextStep:"done", quickActions:[{label:"⏰ Alarm",action:"alarm_flow"},{label:"➕ Task",action:"add_task_flow"}] });
// //         if (parsed.time) return res.json({ message:language==="english"?"What to remind you about?":"Kya yaad dilana hai?", nextStep:"ask_what", flow:"reminder_flow", flowData:{time:parsed.time,date:parsed.date} });
// //         return res.json({ message:language==="english"?"When to remind you?":"Kab remind karoon?", nextStep:"ask_when", flow:"reminder_flow", flowData:{message:parsed.message,date:getTargetDate(userInput)} });
// //       }
// //       if (step === "ask_when") {
// //         const inherited = flowData.date || today;
// //         const parseRes = await callGroq([{ role:"user", content:`User said "${userInput}" for reminder time. TODAY:${today} Inherited:${inherited}\nParse: { "time":"HH:MM","date":"${inherited}" }\nJSON only.` }], null, false, 80);
// //         let parsed = { time:"09:00", date:inherited };
// //         try { parsed = { ...parsed, ...JSON.parse(parseRes.choices[0].message.content.replace(/```json|```/g,"").trim()) }; } catch {}
// //         return res.json({ message:language==="english"?`🔔 Reminder set for ${parsed.time}!`:`🔔 Reminder set ho gaya!`, actions:[{ type:"set_reminder", params:{time:parsed.time,message:flowData.message||userInput,date:parsed.date||inherited} }], nextStep:"done", quickActions:[{label:"⏰ Alarm",action:"alarm_flow"}] });
// //       }
// //       if (step === "ask_what") return res.json({ message:language==="english"?`🔔 Reminder set!`:`🔔 Reminder set ho gaya!`, actions:[{ type:"set_reminder", params:{time:flowData.time,message:userInput,date:flowData.date||today} }], nextStep:"done", quickActions:[{label:"⏰ Alarm",action:"alarm_flow"}] });
// //     }

// //     if (flow === "check_task_flow") {
// //       const { pending, pendingTasks } = taskContext;
// //       if (step === "start") {
// //         if (pending === 0) return res.json({ message:language==="english"?"🎉 All tasks done!":"🎉 Sab tasks ho gaye!", nextStep:"done", quickActions:[{label:"➕ Add More",action:"add_task_flow"}] });
// //         if (userInput) {
// //           const matched = pendingTasks.find(t => t.title.toLowerCase().includes(userInput.toLowerCase()) || userInput.toLowerCase().includes(t.title.toLowerCase()));
// //           if (matched) return res.json({ message:language==="english"?`🎉 "${matched.title}" done!`:`🎉 "${matched.title}" ho gaya!`, actions:[{type:"complete_task",params:{taskTitle:matched.title}}], nextStep:"done" });
// //         }
// //         const list = pendingTasks.slice(0,5).map((t,i) => `${i+1}. "${t.title}"`).join("\n");
// //         return res.json({ message:language==="english"?`Which task finished?\n${list}`:`Kaun sa complete hua?\n${list}`, nextStep:"pick_task", flow:"check_task_flow", flowData:{} });
// //       }
// //       if (step === "pick_task") {
// //         const matched = pendingTasks.find(t => t.title.toLowerCase().includes(userInput.toLowerCase()));
// //         if (matched) return res.json({ message:language==="english"?`🎉 "${matched.title}" done!`:`🎉 ho gaya!`, actions:[{type:"complete_task",params:{taskTitle:matched.title}}], nextStep:"done" });
// //         return res.json({ message:"Which task? Say name or number.", nextStep:"pick_task", flow:"check_task_flow", flowData:{} });
// //       }
// //     }

// //     if (flow === "plan_day_flow") {
// //       const { total, pending, pendingTasks } = taskContext;
// //       if (step === "start") {
// //         if (total === 0) return res.json({ message:language==="english"?"No tasks yet! What do you want to do today?":"Koi task nahi! Kya karna hai?", nextStep:"done", quickActions:[{label:"➕ Add Task",action:"add_task_flow"}] });
// //         const list = pendingTasks.map(t => `"${t.title}"${t.startTime?` at ${t.startTime}`:""}`).join(", ");
// //         const planRes = await callGroq([{ role:"user", content:`${lang}\nPending: ${list}. Time: ${currentTime}.\nShort plan (max 4 lines). Encouraging.` }], null, true, 200);
// //         return res.json({ message:planRes.choices[0].message.content?.trim(), nextStep:"done", quickActions:[{label:"✅ Mark Done",action:"check_task_flow"},{label:"➕ Add Task",action:"add_task_flow"}] });
// //       }
// //     }

// //     if (flow === "notes_flow") {
// //       if (step === "start") {
// //         if (userInput) return res.json({ message:language==="english"?"📝 Added to notes!":"📝 Notes mein add ho gaya!", actions:[{type:"update_notes",params:{content:userInput,mode:"append"}}], nextStep:"done", quickActions:[{label:"📝 Add More",action:"notes_flow"}] });
// //         return res.json({ message:language==="english"?"What to write? 📝":"Kya likhna hai? 📝", nextStep:"write_note", flow:"notes_flow", flowData:{} });
// //       }
// //       if (step === "write_note") return res.json({ message:"📝 Added!", actions:[{type:"update_notes",params:{content:userInput,mode:"append"}}], nextStep:"done", quickActions:[{label:"📝 Add More",action:"notes_flow"}] });
// //     }

// //     res.json({ message:"Hmm, let me help!", nextStep:"done", quickActions:[{label:"➕ Add Task",action:"add_task_flow"},{label:"⏰ Alarm",action:"alarm_flow"}] });
// //   } catch (error) { console.error("Flow step error:", error); res.status(500).json({ error:"Something went wrong" }); }
// // });

// // // ── Proactive / reminder helpers (unchanged) ──────────────────
// // app.post("/api/proactive-monitor", async (req, res) => {
// //   try {
// //     const { language, taskContext, monitorType } = req.body;
// //     const { total, completed, pending } = taskContext;
// //     if (total === 0) return res.json({ shouldNotify: false });
// //     const msgs = {
// //       morning_kickoff: { hinglish:`Good morning! ${pending} tasks pending.`, english:`Good morning! ${pending} tasks today.`, hindi:`${pending} tasks बाकी हैं।` },
// //       overdue_check:   { hinglish:`${pending} tasks pending hain.`, english:`${pending} tasks still pending.`, hindi:`${pending} tasks बाकी हैं।` },
// //       end_of_day:      { hinglish:`Din khatam! ${completed}/${total} complete.`, english:`Day's ending! ${completed}/${total} done.`, hindi:`दिन खत्म!` },
// //     };
// //     res.json({ shouldNotify:true, message:msgs[monitorType]?.[language]||msgs[monitorType]?.hinglish, quickActions:[{label:"✅ Mark Done",action:"check_task_flow"},{label:"📅 View Plan",action:"plan_day_flow"}] });
// //   } catch { res.json({ shouldNotify:false }); }
// // });

// // app.post("/api/task-reminder", (req, res) => {
// //   const { task, language } = req.body;
// //   const msgs = { hinglish:`⏰ "${task.title}" 10 min mein!`, hindi:`⏰ "${task.title}" 10 मिनट में!`, english:`⏰ "${task.title}" in 10 minutes.` };
// //   res.json({ message: msgs[language] || msgs.hinglish });
// // });
// // app.post("/api/task-checkin", (req, res) => {
// //   const { task, language } = req.body;
// //   const msgs = { hinglish:`🤔 "${task.title}" ho gaya kya?`, hindi:`🤔 "${task.title}" हो गया?`, english:`🤔 Did you finish "${task.title}"?` };
// //   res.json({ message: msgs[language] || msgs.hinglish });
// // });
// // app.post("/api/proactive-checkin", (req, res) => {
// //   const { type, language, taskContext } = req.body;
// //   const { total, completed } = taskContext;
// //   const msgs = { morning:{ hinglish:`Morning! ${total} tasks hain.`, english:`Morning! ${total} tasks.` }, evening:{ hinglish:`Shaam! ${completed}/${total} done.`, english:`Evening! ${completed}/${total} done.` } };
// //   res.json({ message: msgs[type]?.[language] || msgs.morning?.hinglish });
// // });

// // // ══════════════════════════════════════════════════════════════
// // httpServer.listen(PORT, () =>
// //   console.log(`🚀 Server running on port ${PORT} (HTTP + WebSocket + MongoDB)`)
// // );
// // backend/server.js — Convex migration version
// // REMOVED: Firebase Admin SDK, MongoDB, all data routes
// // KEPT:    All AI/Groq endpoints 100% unchanged
// // Auth is now handled by Convex — Express just does AI

// import express          from "express";
// import Groq             from "groq-sdk";
// import cors             from "cors";
// import dotenv           from "dotenv";
// import webPush          from "web-push";
// import { createServer } from "http";
// import { WebSocketServer, WebSocket } from "ws";

// dotenv.config();

// // ══════════════════════════════════════════════════════════════
// // EXPRESS + WEBSOCKET
// // ══════════════════════════════════════════════════════════════
// const app        = express();
// const PORT       = process.env.PORT || 3001;
// const httpServer = createServer(app);
// const wss        = new WebSocketServer({ server: httpServer });
// const clients    = new Map();

// app.use(cors({
//   origin: process.env.FRONTEND_URL || "http://localhost:5173",
//   methods: ["GET", "POST", "PUT", "DELETE"],
//   allowedHeaders: ["Content-Type", "Authorization"],
// }));
// app.use(express.json());

// // ── WebSocket (unchanged) ─────────────────────────────────────
// wss.on("connection", (ws) => {
//   const clientMeta = { tabId: null, date: null, isAlive: true };
//   clients.set(ws, clientMeta);
//   ws.on("pong", () => { const m = clients.get(ws); if (m) m.isAlive = true; });
//   ws.on("message", (raw) => {
//     let msg; try { msg = JSON.parse(raw.toString()); } catch { return; }
//     const meta = clients.get(ws); if (!meta) return;
//     switch (msg.type) {
//       case "REGISTER":    meta.tabId = msg.tabId; meta.date = msg.date || null; safeSend(ws, { type: "REGISTERED", tabId: msg.tabId, serverTime: Date.now() }); break;
//       case "DATE_CHANGE": meta.date = msg.date; break;
//       case "BROADCAST":   fanOut(ws, msg); break;
//       case "PING":        safeSend(ws, { type: "PONG", serverTime: Date.now() }); break;
//     }
//   });
//   ws.on("close", () => clients.delete(ws));
//   ws.on("error", () => clients.delete(ws));
// });

// function fanOut(senderWs, msg) {
//   const senderMeta = clients.get(senderWs);
//   for (const [ws] of clients) {
//     if (ws === senderWs || ws.readyState !== WebSocket.OPEN) continue;
//     safeSend(ws, { type: "SYNC_EVENT", changeType: msg.changeType, payload: msg.payload, fromTabId: senderMeta?.tabId, serverTime: Date.now() });
//   }
// }
// function safeSend(ws, data) { if (ws.readyState === WebSocket.OPEN) ws.send(JSON.stringify(data)); }
// const heartbeat = setInterval(() => {
//   for (const [ws, meta] of clients) {
//     if (!meta.isAlive) { clients.delete(ws); ws.terminate(); continue; }
//     meta.isAlive = false; ws.ping();
//   }
// }, 30_000);
// wss.on("close", () => clearInterval(heartbeat));

// // ══════════════════════════════════════════════════════════════
// // HEALTH
// // ══════════════════════════════════════════════════════════════
// app.get("/api/health",   (req, res) => res.json({ status: "ok", wsClients: clients.size }));
// app.get("/api/ws-stats", (req, res) => {
//   const tabs = [];
//   for (const [, meta] of clients) tabs.push({ tabId: meta.tabId, date: meta.date });
//   res.json({ connected: clients.size, tabs });
// });

// // ══════════════════════════════════════════════════════════════
// // WEB PUSH (unchanged)
// // ══════════════════════════════════════════════════════════════
// webPush.setVapidDetails(
//   "mailto:your-email@example.com",
//   process.env.VAPID_PUBLIC_KEY,
//   process.env.VAPID_PRIVATE_KEY
// );
// const subscriptions = new Map();
// app.post("/api/subscribe", async (req, res) => {
//   try {
//     const { subscription, userId } = req.body;
//     if (!subscription) return res.status(400).json({ error: "Required" });
//     subscriptions.set(userId || "anon", subscription);
//     res.json({ success: true });
//   } catch (e) { res.status(500).json({ error: "Failed" }); }
// });

// // ══════════════════════════════════════════════════════════════
// // AI / GROQ — 100% unchanged from your original
// // ══════════════════════════════════════════════════════════════
// const groq = new Groq({ apiKey: process.env.GROQ_API_KEY });

// const FAST_MODELS = [
//   "llama-3.1-8b-instant",
//   "meta-llama/llama-4-scout-17b-16e-instruct",
//   "gemma2-9b-it",
//   "llama3-8b-8192",
// ];
// const SMART_MODELS = [
//   "llama-3.3-70b-versatile",
//   "meta-llama/llama-4-maverick-17b-128e-instruct",
//   "llama-3.1-70b-versatile",
//   "llama3-70b-8192",
// ];
// let fastIdx = 0, smartIdx = 0;
// const failedModels    = new Map();
// const FAILURE_COOLDOWN = 60_000;

// function isModelAvailable(model) {
//   if (!failedModels.has(model)) return true;
//   if (Date.now() - failedModels.get(model) > FAILURE_COOLDOWN) { failedModels.delete(model); return true; }
//   return false;
// }
// function markModelFailed(model) { failedModels.set(model, Date.now()); console.warn(`⚠️ Model unavailable: ${model}`); }
// function getNextModel(models, isSmart) {
//   for (let i = 0; i < models.length; i++) {
//     const idx = (isSmart ? smartIdx : fastIdx) % models.length;
//     const model = models[idx];
//     if (isSmart) smartIdx++; else fastIdx++;
//     if (isModelAvailable(model)) return model;
//   }
//   return models[0];
// }

// async function callGroq(messages, tools = null, smart = false, maxTokens = 600) {
//   const pool  = smart ? SMART_MODELS : FAST_MODELS;
//   const model = getNextModel(pool, smart);
//   const params = { model, messages, temperature: 0.7, max_tokens: maxTokens };
//   if (tools?.length) { params.tools = tools; params.tool_choice = "auto"; }
//   console.log(`🤖 Using: ${model}`);
//   try {
//     return await groq.chat.completions.create(params);
//   } catch (e) {
//     const errStr = JSON.stringify(e.error || e.message || "");
//     if (e.status === 429 || (e.status === 400 && errStr.includes("decommission"))) {
//       markModelFailed(model);
//       for (let i = 0; i < pool.length - 1; i++) {
//         const fallback = getNextModel(pool, smart);
//         if (fallback === model) continue;
//         try { params.model = fallback; return await groq.chat.completions.create(params); }
//         catch (e2) {
//           if (e2.status === 429 || (e2.status === 400 && JSON.stringify(e2.error||"").includes("decommission"))) { markModelFailed(fallback); continue; }
//           throw e2;
//         }
//       }
//       if (smart) { params.model = FAST_MODELS.find(m => isModelAvailable(m)) || FAST_MODELS[0]; return await groq.chat.completions.create(params); }
//     }
//     throw e;
//   }
// }

// function getLangRule(language) {
//   return { hindi: "ONLY Hindi.", english: "ONLY casual English.", hinglish: "Casual Hinglish mix." }[language] || "Casual Hinglish mix.";
// }
// function getDateInfo(clientDate) {
//   const todayStr = clientDate || new Date().toISOString().slice(0, 10);
//   const [y, m, d] = todayStr.split("-").map(Number);
//   const tomorrowDate = new Date(y, m - 1, d + 1);
//   const tomorrowStr = `${tomorrowDate.getFullYear()}-${String(tomorrowDate.getMonth()+1).padStart(2,"0")}-${String(tomorrowDate.getDate()).padStart(2,"0")}`;
//   return { today: todayStr, tomorrow: tomorrowStr, currentTime: new Date().toLocaleTimeString("en-US", { hour: "2-digit", minute: "2-digit", hour12: false }) };
// }
// function cleanTitle(raw) {
//   if (!raw) return raw;
//   return raw.replace(/^(add\s+a?\s*task\s*[:-]?\s*|add\s+a?\s*)/i,"").replace(/\s+at\s+\d{1,2}(:\d{2})?\s*(am|pm|AM|PM)?(\s|$)/gi," ").replace(/\s{2,}/g," ").trim();
// }
// function buildSystemPrompt(language, taskContext, clientDate) {
//   const { total, completed, pending, pendingTasks } = taskContext;
//   const { today, tomorrow, currentTime } = getDateInfo(clientDate);
//   let taskSnapshot = total === 0 ? "User has NO tasks today yet." : `Tasks: ${completed} done, ${pending} pending.\nPending: ${pendingTasks.map(t => `"${t.title}"${t.startTime ? ` at ${t.startTime}` : ""}`).join(", ")}`;
//   return `You are a warm, smart AI buddy for daily planning.
// LANGUAGE: ${getLangRule(language)}
// ${taskSnapshot}
// CURRENT TIME: ${currentTime} | TODAY: ${today} | TOMORROW: ${tomorrow}
// ══════════════════════════════════════════════
// GOLDEN RULE: IF USER ALREADY GAVE THE INFO — JUST DO IT. NO FOLLOW-UP QUESTIONS.
// ══════════════════════════════════════════════
// CRITICAL TITLE RULE: NEVER include "add", time, or date in the title.
// Examples:
// ✅ "add a task at 11:40pm i will git push" → add_task(title:"git push", timeOfDay:"evening", startTime:"23:40", date:"${today}")
// ✅ "add task gym tomorrow 6am" → add_task(title:"gym", timeOfDay:"morning", startTime:"06:00", date:"${tomorrow}")
// DATE RULES: Default date="${today}" | "tomorrow"/"kal" → "${tomorrow}"
// TIME RULES: "9 am"="09:00" | "9 pm"="21:00" | 5am-noon=morning | noon-5pm=afternoon | 5pm+=evening
// Keep replies SHORT (1-2 sentences). Be warm and encouraging.`.trim();
// }

// const TOOLS = [
//   { type:"function", function:{ name:"set_reminder",  description:"Set a reminder.",     parameters:{ type:"object", properties:{ time:{type:"string"}, message:{type:"string"}, date:{type:"string"} }, required:["time","message","date"] } } },
//   { type:"function", function:{ name:"set_alarm",     description:"Set an alarm.",        parameters:{ type:"object", properties:{ time:{type:"string"}, date:{type:"string"}, label:{type:"string"}, repeat:{type:"string", enum:["once","daily","custom"]} }, required:["time","date"] } } },
//   { type:"function", function:{ name:"update_notes",  description:"Update daily notes.",  parameters:{ type:"object", properties:{ content:{type:"string"}, mode:{type:"string", enum:["append","replace"]} }, required:["content"] } } },
//   { type:"function", function:{ name:"add_task",      description:"Add a task.",          parameters:{ type:"object", properties:{ title:{type:"string"}, timeOfDay:{type:"string", enum:["morning","afternoon","evening"]}, startTime:{type:"string"}, endTime:{type:"string"}, date:{type:"string"} }, required:["title","timeOfDay","date"] } } },
//   { type:"function", function:{ name:"complete_task", description:"Mark a task done.",    parameters:{ type:"object", properties:{ taskTitle:{type:"string"} }, required:["taskTitle"] } } },
//   { type:"function", function:{ name:"delete_task",   description:"Delete a task.",       parameters:{ type:"object", properties:{ taskTitle:{type:"string"} }, required:["taskTitle"] } } },
// ];

// // All AI routes are 100% identical to your original server.js
// // Paste your existing /api/advanced-chat, /api/buddy-intro,
// // /api/buddy-nudge, /api/flow-step, /api/proactive-monitor,
// // /api/task-reminder, /api/task-checkin, /api/proactive-checkin
// // routes here — ZERO changes needed

// app.post("/api/advanced-chat",      async (req, res) => { /* your existing code */ });
// app.post("/api/buddy-intro",        async (req, res) => { /* your existing code */ });
// app.post("/api/buddy-nudge",        async (req, res) => { /* your existing code */ });
// app.post("/api/flow-step",          async (req, res) => { /* your existing code */ });
// app.post("/api/proactive-monitor",  async (req, res) => { /* your existing code */ });
// app.post("/api/task-reminder",      (req, res) => { /* your existing code */ });
// app.post("/api/task-checkin",       (req, res) => { /* your existing code */ });
// app.post("/api/proactive-checkin",  (req, res) => { /* your existing code */ });

// // ══════════════════════════════════════════════════════════════
// httpServer.listen(PORT, () =>
//   console.log(`🚀 Server running on port ${PORT} (HTTP + WebSocket + Groq AI)`)
// );
// server.js — Convex version (AI + WebSocket ONLY)
// ─────────────────────────────────────────────────────────────
// REMOVED: firebase-admin, mongoose, requireAuth middleware,
//          all /api/days /api/notes /api/alarms data routes
// KEPT:    Express, CORS, WebSocket, web-push, all AI/Groq routes
// ─────────────────────────────────────────────────────────────
import express          from "express";
import Groq             from "groq-sdk";
import cors             from "cors";
import dotenv           from "dotenv";
import webPush          from "web-push";
import { createServer } from "http";
import { WebSocketServer, WebSocket } from "ws";

dotenv.config();

const app        = express();
const PORT       = process.env.PORT || 3001;
const httpServer = createServer(app);
const wss        = new WebSocketServer({ server: httpServer });
const clients    = new Map();

app.use(cors({
  origin:  process.env.FRONTEND_URL || "http://localhost:5173"  ,
  methods: ["GET","POST","PUT","DELETE"],
  allowedHeaders: ["Content-Type", "Authorization"],
}));
app.use(express.json());

// ── WebSocket (unchanged from your original) ──────────────────
wss.on("connection", (ws) => {
  const clientMeta = { tabId: null, date: null, isAlive: true };
  clients.set(ws, clientMeta);
  ws.on("pong", () => { const m = clients.get(ws); if (m) m.isAlive = true; });
  ws.on("message", (raw) => {
    let msg; try { msg = JSON.parse(raw.toString()); } catch { return; }
    const meta = clients.get(ws); if (!meta) return;
    switch (msg.type) {
      case "REGISTER":   meta.tabId = msg.tabId; meta.date = msg.date || null; safeSend(ws, { type: "REGISTERED", tabId: msg.tabId, serverTime: Date.now() }); break;
      case "DATE_CHANGE": meta.date = msg.date; break;
      case "BROADCAST":  fanOut(ws, msg); break;
      case "PING":       safeSend(ws, { type: "PONG", serverTime: Date.now() }); break;
    }
  });
  ws.on("close", () => clients.delete(ws));
  ws.on("error", () => clients.delete(ws));
});

function fanOut(senderWs, msg) {
  const senderMeta = clients.get(senderWs);
  for (const [ws] of clients) {
    if (ws === senderWs || ws.readyState !== WebSocket.OPEN) continue;
    safeSend(ws, { type: "SYNC_EVENT", changeType: msg.changeType, payload: msg.payload, fromTabId: senderMeta?.tabId, serverTime: Date.now() });
  }
}
function safeSend(ws, data) { if (ws.readyState === WebSocket.OPEN) ws.send(JSON.stringify(data)); }
const heartbeat = setInterval(() => {
  for (const [ws, meta] of clients) { if (!meta.isAlive) { clients.delete(ws); ws.terminate(); continue; } meta.isAlive = false; ws.ping(); }
}, 30_000);
wss.on("close", () => clearInterval(heartbeat));

// ══════════════════════════════════════════════════════════════
// ══════════════════════════════════════════════════════════════
// HEALTH
// ══════════════════════════════════════════════════════════════
app.get("/api/health", (req, res) => res.json({ status: "ok", wsClients: clients.size }));
app.get("/api/ws-stats", (req, res) => {
  const tabs = [];
  for (const [, meta] of clients) tabs.push({ tabId: meta.tabId, date: meta.date });
  res.json({ connected: clients.size, tabs });
});

// ══════════════════════════════════════════════════════════════
// WEB PUSH (unchanged)
// ══════════════════════════════════════════════════════════════
webPush.setVapidDetails(
  "mailto:your-email@example.com",
  process.env.VAPID_PUBLIC_KEY,
  process.env.VAPID_PRIVATE_KEY
);

const subscriptions = new Map();
app.post("/api/subscribe", async (req, res) => {
  try {
    const { subscription } = req.body;
    if (!subscription) return res.status(400).json({ error: "Required" });
    subscriptions.set(req.userId, subscription);
    res.json({ success: true });
  } catch (e) { res.status(500).json({ error: "Failed" }); }
});

// ══════════════════════════════════════════════════════════════
// AI / CHAT ROUTES (100% unchanged from your original server.js)
// ══════════════════════════════════════════════════════════════
const groq = new Groq({ apiKey: process.env.GROQ_API_KEY });

// ── Multi-model pool with automatic round-robin + fallback ────
// If one model is rate-limited (429) or decommissioned (400),
// it is skipped automatically and the next model is tried.
// Fast models → used for quick nudges, intros, parsing (low latency)
// Smart models → used for chat, planning, complex responses (higher quality)

const FAST_MODELS = [
  "llama-3.1-8b-instant",
  "meta-llama/llama-4-scout-17b-16e-instruct",
  "gemma2-9b-it",
  "llama3-8b-8192",
];

const SMART_MODELS = [
  "llama-3.3-70b-versatile",
  "meta-llama/llama-4-maverick-17b-128e-instruct",
  "llama-3.1-70b-versatile",
  "llama3-70b-8192",
];

// Track which index we are at for each pool
let fastIdx  = 0;
let smartIdx = 0;

// Track models that have recently failed so we skip them
const failedModels    = new Map(); // model → timestamp of failure
const FAILURE_COOLDOWN = 60_000;  // 60 seconds before retrying a failed model

function isModelAvailable(model) {
  if (!failedModels.has(model)) return true;
  const failedAt = failedModels.get(model);
  if (Date.now() - failedAt > FAILURE_COOLDOWN) {
    failedModels.delete(model); // cooldown passed, allow retry
    return true;
  }
  return false;
}

function markModelFailed(model) {
  failedModels.set(model, Date.now());
  console.warn(`⚠️  Model marked unavailable: ${model}`);
}

// Get next available model from pool, skipping failed ones
function getNextModel(models, idxRef, isSmart) {
  const pool = [...models]; // copy so we can iterate safely
  for (let attempt = 0; attempt < pool.length; attempt++) {
    const idx   = (isSmart ? smartIdx : fastIdx) % pool.length;
    const model = pool[idx];
    if (isSmart) smartIdx++; else fastIdx++;
    if (isModelAvailable(model)) return model;
    console.log(`⏭  Skipping unavailable model: ${model}`);
  }
  // All models failed — return the first one anyway (best effort)
  console.error("❌ All models in pool are marked failed! Using first as fallback.");
  return models[0];
}

async function callGroq(messages, tools = null, smart = false, maxTokens = 600) {
  const pool  = smart ? SMART_MODELS : FAST_MODELS;
  const model = getNextModel(pool, null, smart);

  const params = {
    model,
    messages,
    temperature: 0.7,
    max_tokens:  maxTokens,
  };
  if (tools?.length) {
    params.tools        = tools;
    params.tool_choice  = "auto";
  }

  console.log(`🤖 Using model: ${model} (${smart ? "smart" : "fast"})`);

  try {
    return await groq.chat.completions.create(params);

  } catch (e) {
    const errStr  = JSON.stringify(e.error || e.message || "");
    const is429   = e.status === 429;
    const is400   = e.status === 400;
    const isDead  = is400 && (errStr.includes("decommission") || errStr.includes("deprecated") || errStr.includes("not found"));
    const isLimit = is429 || isDead;

    if (isLimit) {
      // Mark this model as temporarily failed
      markModelFailed(model);
      console.warn(`🔄 Model ${model} failed (${e.status}), switching to next model...`);

      // Try every other model in the pool before giving up
      for (let i = 0; i < pool.length - 1; i++) {
        const fallback = getNextModel(pool, null, smart);
        if (fallback === model) continue; // same model, skip
        console.log(`🔁 Fallback attempt with: ${fallback}`);
        try {
          params.model = fallback;
          const result = await groq.chat.completions.create(params);
          console.log(`✅ Fallback succeeded with: ${fallback}`);
          return result;
        } catch (e2) {
          const errStr2 = JSON.stringify(e2.error || e2.message || "");
          if (e2.status === 429 || (e2.status === 400 && errStr2.includes("decommission"))) {
            markModelFailed(fallback);
            console.warn(`🔄 Fallback ${fallback} also failed, trying next...`);
            continue;
          }
          throw e2; // non-rate-limit error, bubble up
        }
      }

      // If smart models all failed, fall back to fast models (last resort)
      if (smart) {
        console.warn("🆘 All smart models failed — falling back to fast model pool");
        const lastResort = FAST_MODELS.find(m => isModelAvailable(m)) || FAST_MODELS[0];
        params.model = lastResort;
        return await groq.chat.completions.create(params);
      }
    }

    throw e; // unknown error, bubble up
  }
}

function getLangRule(language) {
  return { hindi: "ONLY Hindi.", english: "ONLY casual English.", hinglish: "Casual Hinglish mix." }[language] || "Casual Hinglish mix.";
}

function getDateInfo(clientDate) {
  const todayStr = clientDate || new Date().toISOString().slice(0, 10);
  const [y, m, d] = todayStr.split("-").map(Number);
  const tomorrowDate = new Date(y, m - 1, d + 1);
  const tomorrowStr = `${tomorrowDate.getFullYear()}-${String(tomorrowDate.getMonth()+1).padStart(2,"0")}-${String(tomorrowDate.getDate()).padStart(2,"0")}`;
  return { today: todayStr, tomorrow: tomorrowStr, currentTime: new Date().toLocaleTimeString("en-US", { hour: "2-digit", minute: "2-digit", hour12: false }) };
}

function cleanTitle(raw) {
  if (!raw) return raw;
  return raw.replace(/^(add\s+a?\s*task\s*[:-]?\s*|add\s+a?\s*)/i,"").replace(/\s+at\s+\d{1,2}(:\d{2})?\s*(am|pm|AM|PM)?(\s|$)/gi," ").replace(/\s{2,}/g," ").trim();
}

function buildSystemPrompt(language, taskContext, clientDate) {
  const { total, completed, pending, pendingTasks } = taskContext;
  const { today, tomorrow, currentTime } = getDateInfo(clientDate);
  let taskSnapshot = total === 0 ? "User has NO tasks today yet." : `Tasks: ${completed} done, ${pending} pending.\nPending: ${pendingTasks.map(t => `"${t.title}"${t.startTime ? ` at ${t.startTime}` : ""}`).join(", ")}`;
  return `You are a warm, smart AI buddy for daily planning.
LANGUAGE: ${getLangRule(language)}
${taskSnapshot}
CURRENT TIME: ${currentTime} | TODAY: ${today} | TOMORROW: ${tomorrow}
══════════════════════════════════════════════
GOLDEN RULE: IF USER ALREADY GAVE THE INFO — JUST DO IT. NO FOLLOW-UP QUESTIONS.
══════════════════════════════════════════════
CRITICAL TITLE RULE: NEVER include "add", time, or date in the title.
Examples:
✅ "add a task at 11:40pm i will git push" → add_task(title:"git push", timeOfDay:"evening", startTime:"23:40", date:"${today}")
✅ "add task gym tomorrow 6am" → add_task(title:"gym", timeOfDay:"morning", startTime:"06:00", date:"${tomorrow}")
✅ "set alarm 7am tomorrow" → set_alarm(time:"07:00", date:"${tomorrow}", label:"Alarm", repeat:"once")
DATE RULES: Default date="${today}" | "tomorrow"/"kal" → "${tomorrow}"
TIME RULES: "9 am"="09:00" | "9 pm"="21:00" | 5am-noon=morning | noon-5pm=afternoon | 5pm+=evening
Keep replies SHORT (1-2 sentences). Be warm and encouraging.`.trim();
}

const TOOLS = [
  { type:"function", function:{ name:"set_reminder", description:"Set a reminder.", parameters:{ type:"object", properties:{ time:{type:"string"}, message:{type:"string"}, date:{type:"string"} }, required:["time","message","date"] } } },
  { type:"function", function:{ name:"set_alarm",    description:"Set an alarm.",   parameters:{ type:"object", properties:{ time:{type:"string"}, date:{type:"string"}, label:{type:"string"}, repeat:{type:"string", enum:["once","daily","custom"]} }, required:["time","date"] } } },
  { type:"function", function:{ name:"update_notes", description:"Update daily notes.", parameters:{ type:"object", properties:{ content:{type:"string"}, mode:{type:"string", enum:["append","replace"]} }, required:["content"] } } },
  { type:"function", function:{ name:"add_task",     description:"Add a task. TITLE = ONLY the task name.", parameters:{ type:"object", properties:{ title:{type:"string"}, timeOfDay:{type:"string", enum:["morning","afternoon","evening"]}, startTime:{type:"string"}, endTime:{type:"string"}, date:{type:"string"} }, required:["title","timeOfDay","date"] } } },
  { type:"function", function:{ name:"complete_task", description:"Mark a task done.", parameters:{ type:"object", properties:{ taskTitle:{type:"string"} }, required:["taskTitle"] } } },
  { type:"function", function:{ name:"delete_task",   description:"Delete a task.",    parameters:{ type:"object", properties:{ taskTitle:{type:"string"} }, required:["taskTitle"] } } },
];

// ── /api/advanced-chat ─────────────────────────────────────────
app.post("/api/advanced-chat", async (req, res) => {
  try {
    const { messages, language, taskContext, isVoice, currentDate, voiceMode } = req.body;
    if (!messages || !Array.isArray(messages)) return res.status(400).json({ error: "Messages required" });
    const { today } = getDateInfo(currentDate);
    const lastMsg = messages[messages.length - 1]?.content || "";
    if (/notes?\s+mein|daily\s+notes|meri\s+daily/i.test(lastMsg)) {
      const content = lastMsg.replace(/(bhai\s+)?add\s+kar\s+(de|do)\s*/gi,"").replace(/notes?\s+mein\s+(add\s+kar\s+do|likh\s+do)\s*/gi,"").trim();
      return res.json({ message: language === "english" ? "📝 Added to your notes!" : "📝 Notes mein add ho gaya!", actions: [{ type: "update_notes", params: { content, mode: "append" } }] });
    }
    let systemPrompt = buildSystemPrompt(language || "hinglish", taskContext, currentDate);
    if (isVoice && voiceMode === "notes") systemPrompt += "\n\nVOICE NOTES MODE: ALWAYS call update_notes.";
    else if (voiceMode === "tasks")       systemPrompt += "\n\nTASKS MODE: Parse and add/complete/delete tasks.";
    const completion = await callGroq([{ role:"system", content:systemPrompt }, ...messages.slice(-20).map(m => ({ role:m.role, content:m.content }))], TOOLS, true, 600);
    const response = completion.choices[0];
    const actions  = [];
    if (response.message.tool_calls) {
      for (const toolCall of response.message.tool_calls) {
        try {
          const params = JSON.parse(toolCall.function.arguments);
          const name   = toolCall.function.name;
          if (["add_task","set_alarm","set_reminder"].includes(name) && !params.date) params.date = today;
          if (name === "set_alarm") { if (!params.label) params.label = "Alarm"; if (!params.repeat) params.repeat = "once"; }
          if (name === "add_task" && params.title) params.title = cleanTitle(params.title);
          actions.push({ type: name, params });
        } catch {}
      }
    }
    res.json({ message: response.message.content || "Done! ✅", actions });
  } catch (error) { console.error("Chat error:", error); res.status(500).json({ error: "Something went wrong" }); }
});

// ── /api/buddy-intro ──────────────────────────────────────────
app.post("/api/buddy-intro", async (req, res) => {
  try {
    const { language, taskContext, currentTime, currentDate } = req.body;
    const { total, pending, pendingTasks } = taskContext;
    const hour = parseInt((currentTime || "12:00").split(":")[0]);
    const greeting = hour < 12 ? "morning" : hour < 17 ? "afternoon" : "evening";
    const prompt = `You are a friendly AI buddy. ${getLangRule(language)}\nGood ${greeting}! ${total === 0 ? "No tasks yet." : `${pending} pending: ${pendingTasks.slice(0,2).map(t=>`"${t.title}"`).join(", ")}${pending>2?` and ${pending-2} more`:""}. `}\nWrite ONE warm greeting. Max 20 words. 1 emoji.`;
    const c = await callGroq([{ role:"user", content:prompt }], null, false, 80);
    res.json({ message: c.choices[0].message.content?.trim() || "Hey! 👋 Ready to make today awesome?", quickActions: [{ label:"➕ Add Task", action:"add_task_flow" }, { label:"⏰ Set Alarm", action:"alarm_flow" }, { label:"🔔 Reminder", action:"reminder_flow" }, { label:"📅 Plan My Day", action:"plan_day_flow" }] });
  } catch { res.json({ message:"Hey! 👋 Kya karna hai aaj?", quickActions:[{ label:"➕ Add Task", action:"add_task_flow" }, { label:"⏰ Set Alarm", action:"alarm_flow" }, { label:"🔔 Reminder", action:"reminder_flow" }, { label:"📅 Plan My Day", action:"plan_day_flow" }] }); }
});

// ── /api/buddy-nudge ─────────────────────────────────────────
app.post("/api/buddy-nudge", async (req, res) => {
  try {
    const { language, taskContext, nudgeIndex } = req.body;
    const { pending, pendingTasks } = taskContext;
    const nudgeTypes = [
      { ctx:`Say hi. ${pending>0?`${pending} tasks pending.`:"No tasks yet."}`, chips:[{label:"➕ Add Task",action:"add_task_flow"},{label:"📅 Plan Day",action:"plan_day_flow"}] },
      { ctx:`Encourage tasks. ${pending>0?`Pending: ${pendingTasks.slice(0,2).map(t=>t.title).join(", ")}`:"All done!"}`, chips:[{label:"✅ Mark Done",action:"check_task_flow"},{label:"➕ Add Task",action:"add_task_flow"}] },
      { ctx:`Suggest writing notes.`, chips:[{label:"📝 Write Notes",action:"notes_flow"},{label:"💬 Chat",action:"open_chat"}] },
      { ctx:`Suggest alarm or reminder.`, chips:[{label:"⏰ Set Alarm",action:"alarm_flow"},{label:"🔔 Reminder",action:"reminder_flow"}] },
    ];
    const { ctx, chips } = nudgeTypes[nudgeIndex % 4];
    const prompt = `Friendly AI buddy. ${getLangRule(language)}\n${ctx}\nWrite ONE nudge (max 12 words). 1 emoji.`;
    const c = await callGroq([{ role:"user", content:prompt }], null, false, 50);
    res.json({ message: c.choices[0].message.content?.trim() || "Hey! 👋", quickActions: chips });
  } catch {
    const fallbacks = [
      { message:"Hey! 👋 Tap to chat!", quickActions:[{label:"➕ Add Task",action:"add_task_flow"},{label:"📅 Plan Day",action:"plan_day_flow"}] },
      { message:"Got tasks? Let me help! 🎯", quickActions:[{label:"✅ Mark Done",action:"check_task_flow"},{label:"➕ Add Task",action:"add_task_flow"}] },
      { message:"Write your day in notes 📝", quickActions:[{label:"📝 Write Notes",action:"notes_flow"},{label:"💬 Chat",action:"open_chat"}] },
      { message:"Need alarm or reminder? ⏰", quickActions:[{label:"⏰ Set Alarm",action:"alarm_flow"},{label:"🔔 Reminder",action:"reminder_flow"}] },
    ];
    res.json(fallbacks[(req.body.nudgeIndex || 0) % 4]);
  }
});

// ── /api/flow-step ────────────────────────────────────────────
// (Paste your full original flow-step handler here — it is 100% unchanged)
// We keep it short here since it's identical to your original server.js flow-step.
app.post("/api/flow-step", async (req, res) => {
  try {
    const { flow, step, userInput, language, taskContext, flowData, currentTime, currentDate } = req.body;
    const { today, tomorrow } = getDateInfo(currentDate);
    const lang = getLangRule(language);
    const isTomorrow    = (text) => /tomorrow|kal\b|next\s+day/i.test(text || "");
    const getTargetDate = (text) => isTomorrow(text) ? tomorrow : today;
    const formatDateLabel = (date) => date === tomorrow ? (language==="english"?"for tomorrow":"kal ke liye") : date === today ? (language==="english"?"for today":"aaj ke liye") : `for ${date}`;

    if (flow === "add_task_flow") {
      if (step === "start") {
        const parseRes = await callGroq([{ role:"user", content:`${lang}\nUser wants to add task. Message: "${userInput||""}"\nTODAY:${today} TOMORROW:${tomorrow}\nExtract JSON: { "title":"ONLY task name","startTime":null,"endTime":null,"timeOfDay":null,"date":"${today}" }\nExamples: "add task gym 6am" → title:"gym". JSON only.` }], null, false, 150);
        let parsed = {};
        try { parsed = JSON.parse(parseRes.choices[0].message.content.replace(/```json|```/g,"").trim()); } catch {}
        if (!parsed.date) parsed.date = today;
        if (parsed.title) parsed.title = cleanTitle(parsed.title);
        if (parsed.title && parsed.timeOfDay) return res.json({ message: language==="english"?`✅ Added "${parsed.title}" ${formatDateLabel(parsed.date)}!`:`✅ "${parsed.title}" add ho gaya!`, actions:[{ type:"add_task", params:{title:parsed.title,timeOfDay:parsed.timeOfDay,startTime:parsed.startTime||null,endTime:parsed.endTime||null,date:parsed.date} }], nextStep:"done", quickActions:[{label:"➕ Add Another",action:"add_task_flow"},{label:"✅ Mark Done",action:"check_task_flow"}] });
        if (parsed.title) return res.json({ message:language==="english"?`When to do "${parsed.title}"?`:`"${parsed.title}" kab karna hai?`, nextStep:"ask_time", flow:"add_task_flow", flowData:{title:parsed.title,date:parsed.date} });
        return res.json({ message:language==="english"?"What task to add? 🤔":"Kya task add karna hai? 🤔", nextStep:"ask_title", flow:"add_task_flow", flowData:{date:getTargetDate(userInput)} });
      }
      if (step === "ask_title") {
        const inherited = flowData.date || today;
        const parseRes = await callGroq([{ role:"user", content:`User said: "${userInput}" | TODAY:${today} TOMORROW:${tomorrow} | Inherited:"${inherited}"\nExtract: { "title":"task name only","startTime":null,"endTime":null,"timeOfDay":null,"date":"YYYY-MM-DD" }\nJSON only.` }], null, false, 100);
        let parsed = { title:userInput, date:inherited };
        try { parsed = { title:userInput, date:inherited, ...JSON.parse(parseRes.choices[0].message.content.replace(/```json|```/g,"").trim()) }; } catch {}
        if (!parsed.date) parsed.date = inherited;
        if (parsed.title) parsed.title = cleanTitle(parsed.title);
        if (parsed.timeOfDay) return res.json({ message:language==="english"?`✅ Added "${parsed.title}"!`:`✅ "${parsed.title}" add ho gaya!`, actions:[{ type:"add_task", params:{title:parsed.title,timeOfDay:parsed.timeOfDay,startTime:parsed.startTime||null,endTime:parsed.endTime||null,date:parsed.date} }], nextStep:"done", quickActions:[{label:"➕ Add Another",action:"add_task_flow"}] });
        return res.json({ message:language==="english"?`"${parsed.title}" — morning, afternoon, or evening?`:`"${parsed.title}" — morning, afternoon, ya evening?`, nextStep:"ask_time", flow:"add_task_flow", flowData:{title:parsed.title,date:parsed.date} });
      }
      if (step === "ask_time") {
        const title = flowData.title || "task", taskDate = flowData.date || today;
        const parseRes = await callGroq([{ role:"user", content:`User said: "${userInput}" for time of "${title}". Parse: { "timeOfDay":"morning/afternoon/evening","startTime":null,"endTime":null }. JSON only.` }], null, false, 100);
        let parsed = { timeOfDay:"morning", startTime:null, endTime:null };
        try { parsed = { ...parsed, ...JSON.parse(parseRes.choices[0].message.content.replace(/```json|```/g,"").trim()) }; } catch {}
        return res.json({ message:language==="english"?`✅ Added "${title}"!`:`✅ "${title}" add ho gaya!`, actions:[{ type:"add_task", params:{title,timeOfDay:parsed.timeOfDay,startTime:parsed.startTime,endTime:parsed.endTime,date:taskDate} }], nextStep:"done", quickActions:[{label:"➕ Add Another",action:"add_task_flow"}] });
      }
    }

    if (flow === "alarm_flow") {
      if (step === "start") {
        const parseRes = await callGroq([{ role:"user", content:`User wants alarm: "${userInput||""}"\nTODAY:${today} TOMORROW:${tomorrow}\nExtract: { "time":null,"date":"${today}","label":"Alarm","repeat":"once","ampm_clear":true }\nJSON only.` }], null, false, 150);
        let parsed = {};
        try { parsed = JSON.parse(parseRes.choices[0].message.content.replace(/```json|```/g,"").trim()); } catch {}
        if (!parsed.date) parsed.date = today; if (!parsed.repeat) parsed.repeat = "once";
        if (parsed.time && parsed.ampm_clear !== false) return res.json({ message:language==="english"?`⏰ Alarm set for ${parsed.time}!`:`⏰ Alarm set ho gaya!`, actions:[{ type:"set_alarm", params:{time:parsed.time,date:parsed.date,label:parsed.label||"Alarm",repeat:parsed.repeat} }], nextStep:"done", quickActions:[{label:"➕ Add Task",action:"add_task_flow"},{label:"🔔 Reminder",action:"reminder_flow"}] });
        if (parsed.time) { const h = parseInt(parsed.time.split(":")[0])%12||12; return res.json({ message:language==="english"?`${h} AM or PM?`:`${h} AM hai ya PM?`, nextStep:"ask_ampm", flow:"alarm_flow", flowData:{time:parsed.time,date:parsed.date,label:parsed.label||"Alarm",repeat:parsed.repeat} }); }
        return res.json({ message:language==="english"?"What time for alarm? ⏰":"Konse time ka alarm? ⏰", nextStep:"ask_time", flow:"alarm_flow", flowData:{date:getTargetDate(userInput)} });
      }
      if (step === "ask_time") {
        const inherited = flowData.date || today;
        const parseRes = await callGroq([{ role:"user", content:`User said "${userInput}" for alarm. TODAY:${today} Inherited:${inherited}\nParse: { "time":null,"date":"${inherited}","ampm_clear":true }\nJSON only.` }], null, false, 100);
        let parsed = { time:null, date:inherited, ampm_clear:true };
        try { parsed = { ...parsed, ...JSON.parse(parseRes.choices[0].message.content.replace(/```json|```/g,"").trim()) }; } catch {}
        if (!parsed.date) parsed.date = inherited;
        if (parsed.time && parsed.ampm_clear !== false) return res.json({ message:language==="english"?`⏰ Alarm set for ${parsed.time}!`:`⏰ Alarm set ho gaya!`, actions:[{ type:"set_alarm", params:{time:parsed.time,date:parsed.date,label:"Alarm",repeat:"once"} }], nextStep:"done", quickActions:[{label:"➕ Add Task",action:"add_task_flow"}] });
        if (parsed.time) { const h = parseInt(parsed.time.split(":")[0])%12||12; return res.json({ message:language==="english"?`${h} AM or PM?`:`${h} AM ya PM?`, nextStep:"ask_ampm", flow:"alarm_flow", flowData:{time:parsed.time,date:parsed.date,label:"Alarm",repeat:"once"} }); }
        return res.json({ message:"Please give a valid time like 7am or 9:30pm", nextStep:"ask_time", flow:"alarm_flow", flowData:{date:inherited} });
      }
      if (step === "ask_ampm") {
        const isAM = /am|subah|morning/i.test(userInput), isPM = /pm|raat|sham|evening|night/i.test(userInput);
        let time = flowData.time || "07:00";
        const [h] = time.split(":").map(Number);
        if (isPM && h < 12) time = `${String(h+12).padStart(2,"0")}:${time.split(":")[1]}`;
        else if (isAM && h === 12) time = `00:${time.split(":")[1]}`;
        return res.json({ message:language==="english"?`⏰ Alarm set for ${time}!`:`⏰ Alarm set ho gaya!`, actions:[{ type:"set_alarm", params:{time,date:flowData.date||today,label:flowData.label||"Alarm",repeat:flowData.repeat||"once"} }], nextStep:"done", quickActions:[{label:"➕ Add Task",action:"add_task_flow"}] });
      }
    }

    if (flow === "reminder_flow") {
      if (step === "start") {
        const parseRes = await callGroq([{ role:"user", content:`Reminder request: "${userInput||""}"\nTODAY:${today} TOMORROW:${tomorrow}\nParse: { "time":null,"message":null,"date":"${today}" }\nJSON only.` }], null, false, 120);
        let parsed = {};
        try { parsed = JSON.parse(parseRes.choices[0].message.content.replace(/```json|```/g,"").trim()); } catch {}
        if (!parsed.date) parsed.date = today;
        if (parsed.time && parsed.message) return res.json({ message:language==="english"?`🔔 Reminder set for ${parsed.time}!`:`🔔 Reminder set ho gaya!`, actions:[{ type:"set_reminder", params:{time:parsed.time,message:parsed.message,date:parsed.date} }], nextStep:"done", quickActions:[{label:"⏰ Alarm",action:"alarm_flow"},{label:"➕ Task",action:"add_task_flow"}] });
        if (parsed.time) return res.json({ message:language==="english"?"What to remind you about?":"Kya yaad dilana hai?", nextStep:"ask_what", flow:"reminder_flow", flowData:{time:parsed.time,date:parsed.date} });
        return res.json({ message:language==="english"?"When to remind you?":"Kab remind karoon?", nextStep:"ask_when", flow:"reminder_flow", flowData:{message:parsed.message,date:getTargetDate(userInput)} });
      }
      if (step === "ask_when") {
        const inherited = flowData.date || today;
        const parseRes = await callGroq([{ role:"user", content:`User said "${userInput}" for reminder time. TODAY:${today} Inherited:${inherited}\nParse: { "time":"HH:MM","date":"${inherited}" }\nJSON only.` }], null, false, 80);
        let parsed = { time:"09:00", date:inherited };
        try { parsed = { ...parsed, ...JSON.parse(parseRes.choices[0].message.content.replace(/```json|```/g,"").trim()) }; } catch {}
        return res.json({ message:language==="english"?`🔔 Reminder set for ${parsed.time}!`:`🔔 Reminder set ho gaya!`, actions:[{ type:"set_reminder", params:{time:parsed.time,message:flowData.message||userInput,date:parsed.date||inherited} }], nextStep:"done", quickActions:[{label:"⏰ Alarm",action:"alarm_flow"}] });
      }
      if (step === "ask_what") return res.json({ message:language==="english"?`🔔 Reminder set!`:`🔔 Reminder set ho gaya!`, actions:[{ type:"set_reminder", params:{time:flowData.time,message:userInput,date:flowData.date||today} }], nextStep:"done", quickActions:[{label:"⏰ Alarm",action:"alarm_flow"}] });
    }

    if (flow === "check_task_flow") {
      const { pending, pendingTasks } = taskContext;
      if (step === "start") {
        if (pending === 0) return res.json({ message:language==="english"?"🎉 All tasks done!":"🎉 Sab tasks ho gaye!", nextStep:"done", quickActions:[{label:"➕ Add More",action:"add_task_flow"}] });
        if (userInput) {
          const matched = pendingTasks.find(t => t.title.toLowerCase().includes(userInput.toLowerCase()) || userInput.toLowerCase().includes(t.title.toLowerCase()));
          if (matched) return res.json({ message:language==="english"?`🎉 "${matched.title}" done!`:`🎉 "${matched.title}" ho gaya!`, actions:[{type:"complete_task",params:{taskTitle:matched.title}}], nextStep:"done" });
        }
        const list = pendingTasks.slice(0,5).map((t,i) => `${i+1}. "${t.title}"`).join("\n");
        return res.json({ message:language==="english"?`Which task finished?\n${list}`:`Kaun sa complete hua?\n${list}`, nextStep:"pick_task", flow:"check_task_flow", flowData:{} });
      }
      if (step === "pick_task") {
        const matched = pendingTasks.find(t => t.title.toLowerCase().includes(userInput.toLowerCase()));
        if (matched) return res.json({ message:language==="english"?`🎉 "${matched.title}" done!`:`🎉 ho gaya!`, actions:[{type:"complete_task",params:{taskTitle:matched.title}}], nextStep:"done" });
        return res.json({ message:"Which task? Say name or number.", nextStep:"pick_task", flow:"check_task_flow", flowData:{} });
      }
    }

    if (flow === "plan_day_flow") {
      const { total, pending, pendingTasks } = taskContext;
      if (step === "start") {
        if (total === 0) return res.json({ message:language==="english"?"No tasks yet! What do you want to do today?":"Koi task nahi! Kya karna hai?", nextStep:"done", quickActions:[{label:"➕ Add Task",action:"add_task_flow"}] });
        const list = pendingTasks.map(t => `"${t.title}"${t.startTime?` at ${t.startTime}`:""}`).join(", ");
        const planRes = await callGroq([{ role:"user", content:`${lang}\nPending: ${list}. Time: ${currentTime}.\nShort plan (max 4 lines). Encouraging.` }], null, true, 200);
        return res.json({ message:planRes.choices[0].message.content?.trim(), nextStep:"done", quickActions:[{label:"✅ Mark Done",action:"check_task_flow"},{label:"➕ Add Task",action:"add_task_flow"}] });
      }
    }

    if (flow === "notes_flow") {
      if (step === "start") {
        if (userInput) return res.json({ message:language==="english"?"📝 Added to notes!":"📝 Notes mein add ho gaya!", actions:[{type:"update_notes",params:{content:userInput,mode:"append"}}], nextStep:"done", quickActions:[{label:"📝 Add More",action:"notes_flow"}] });
        return res.json({ message:language==="english"?"What to write? 📝":"Kya likhna hai? 📝", nextStep:"write_note", flow:"notes_flow", flowData:{} });
      }
      if (step === "write_note") return res.json({ message:"📝 Added!", actions:[{type:"update_notes",params:{content:userInput,mode:"append"}}], nextStep:"done", quickActions:[{label:"📝 Add More",action:"notes_flow"}] });
    }

    res.json({ message:"Hmm, let me help!", nextStep:"done", quickActions:[{label:"➕ Add Task",action:"add_task_flow"},{label:"⏰ Alarm",action:"alarm_flow"}] });
  } catch (error) { console.error("Flow step error:", error); res.status(500).json({ error:"Something went wrong" }); }
});

// ── Proactive / reminder helpers (unchanged) ──────────────────
app.post("/api/proactive-monitor", async (req, res) => {
  try {
    const { language, taskContext, monitorType } = req.body;
    const { total, completed, pending } = taskContext;
    if (total === 0) return res.json({ shouldNotify: false });
    const msgs = {
      morning_kickoff: { hinglish:`Good morning! ${pending} tasks pending.`, english:`Good morning! ${pending} tasks today.`, hindi:`${pending} tasks बाकी हैं।` },
      overdue_check:   { hinglish:`${pending} tasks pending hain.`, english:`${pending} tasks still pending.`, hindi:`${pending} tasks बाकी हैं।` },
      end_of_day:      { hinglish:`Din khatam! ${completed}/${total} complete.`, english:`Day's ending! ${completed}/${total} done.`, hindi:`दिन खत्म!` },
    };
    res.json({ shouldNotify:true, message:msgs[monitorType]?.[language]||msgs[monitorType]?.hinglish, quickActions:[{label:"✅ Mark Done",action:"check_task_flow"},{label:"📅 View Plan",action:"plan_day_flow"}] });
  } catch { res.json({ shouldNotify:false }); }
});

app.post("/api/task-reminder", (req, res) => {
  const { task, language } = req.body;
  const msgs = { hinglish:`⏰ "${task.title}" 10 min mein!`, hindi:`⏰ "${task.title}" 10 मिनट में!`, english:`⏰ "${task.title}" in 10 minutes.` };
  res.json({ message: msgs[language] || msgs.hinglish });
});
app.post("/api/task-checkin", (req, res) => {
  const { task, language } = req.body;
  const msgs = { hinglish:`🤔 "${task.title}" ho gaya kya?`, hindi:`🤔 "${task.title}" हो गया?`, english:`🤔 Did you finish "${task.title}"?` };
  res.json({ message: msgs[language] || msgs.hinglish });
});
app.post("/api/proactive-checkin", (req, res) => {
  const { type, language, taskContext } = req.body;
  const { total, completed } = taskContext;
  const msgs = { morning:{ hinglish:`Morning! ${total} tasks hain.`, english:`Morning! ${total} tasks.` }, evening:{ hinglish:`Shaam! ${completed}/${total} done.`, english:`Evening! ${completed}/${total} done.` } };
  res.json({ message: msgs[type]?.[language] || msgs.morning?.hinglish });
});

// ══════════════════════════════════════════════════════════════
httpServer.listen(PORT, () =>
  console.log(`🚀 Server running on port ${PORT} (HTTP + WebSocket (AI only — data via Convex))`)
);