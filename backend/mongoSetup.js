// ============================================================
// MONGODB DATABASE SETUP
// Equivalent to your Supabase SQL schema
//
// Run this file ONCE to set up your database:
//   node mongoSetup.js
//
// This creates:
//   1. users collection        (replaces users table)
//   2. refresh_tokens collection (replaces refresh_tokens table)
//   3. days collection         (task data per user per day)
//   4. notes collection        (daily notes per user per day)
//   5. alarms collection       (alarms per user)
//   + All indexes for fast lookups
// ============================================================

import mongoose from "mongoose";
import dotenv from "dotenv";
dotenv.config();

const MONGODB_URI = process.env.MONGODB_URI || "mongodb://localhost:27017/cozyspace";

// ── Connect ───────────────────────────────────────────────────
await mongoose.connect(MONGODB_URI);
console.log("✅ Connected to MongoDB:", MONGODB_URI.split("@")[1] || "localhost");

const db = mongoose.connection.db;

// ============================================================
// 1. USERS COLLECTION
// Equivalent to your Supabase 'users' table
// ============================================================
// MongoDB doesn't use UUIDs by default — it uses ObjectId (_id)
// ObjectId is 12 bytes, unguessable, unique globally — same security benefits as UUID
//
// Fields:
//   _id          → replaces "id UUID DEFAULT gen_random_uuid() PRIMARY KEY"
//   email        → same, UNIQUE index created below
//   password_hash→ same, NEVER store plain passwords
//   name         → same optional field
//   role         → same, enum validated in schema
//   createdAt    → replaces "created_at", auto-set by mongoose timestamps:true
//   updatedAt    → replaces "updated_at", auto-updated by mongoose timestamps:true
//                  (replaces your trigger update_updated_at_column)

const UserSchema = new mongoose.Schema(
  {
    email:         { type: String, required: true, unique: true, lowercase: true, trim: true },
    password_hash: { type: String, required: true },
    name:          { type: String, default: null },
    role:          { type: String, enum: ["user", "admin", "moderator"], default: "user" },
  },
  {
    timestamps: true, // auto createdAt + updatedAt (replaces the SQL trigger)
  }
);

// ── replaces: CREATE INDEX idx_users_email ON users(email) ──
// MongoDB automatically creates a unique index for { unique: true } fields,
// but we declare it explicitly here for clarity
UserSchema.index({ email: 1 }, { unique: true });

// ── replaces: Role CHECK constraint ──────────────────────────
// The enum: [...] in the schema above enforces valid roles at app level
// MongoDB doesn't have DB-level CHECK constraints, but Mongoose validates on save

// ============================================================
// 2. REFRESH TOKENS COLLECTION
// Equivalent to your Supabase 'refresh_tokens' table
// ============================================================
// Fields:
//   _id        → primary key (ObjectId)
//   user_id    → replaces "user_id UUID REFERENCES users(id) ON DELETE CASCADE"
//                MongoDB doesn't enforce foreign keys, but we handle cascade in app code
//   token_hash → same — we store HASH of token, not actual token (security!)
//   expires_at → same — for 7-day session expiry
//   is_revoked → same — false = active, true = logged out
//   createdAt  → replaces "created_at"

const RefreshTokenSchema = new mongoose.Schema(
  {
    user_id:    { type: mongoose.Schema.Types.ObjectId, ref: "User", required: true, index: true },
    token_hash: { type: String, required: true, unique: true },
    expires_at: { type: Date, required: true },
    is_revoked: { type: Boolean, default: false },
  },
  {
    timestamps: { createdAt: true, updatedAt: false }, // only createdAt needed
  }
);

// ── replaces: CREATE INDEX idx_refresh_tokens_user_id ────────
RefreshTokenSchema.index({ user_id: 1 });
// ── replaces: CREATE INDEX idx_refresh_tokens_token_hash ─────
RefreshTokenSchema.index({ token_hash: 1 }, { unique: true });

// AUTO-EXPIRE: MongoDB TTL index automatically deletes expired tokens
// This replaces manual cleanup queries you'd need in Supabase
// Documents where expires_at is in the past are deleted automatically by MongoDB
RefreshTokenSchema.index({ expires_at: 1 }, { expireAfterSeconds: 0 });

// ============================================================
// 3. DAYS COLLECTION
// Stores tasks per user per calendar day
// No equivalent in Supabase schema — this replaces localStorage
// ============================================================
const TaskSchema = new mongoose.Schema(
  {
    id:          { type: Number, required: true },
    title:       { type: String, required: true },
    completed:   { type: Boolean, default: false },
    timeOfDay:   { type: String, enum: ["morning", "afternoon", "evening"], default: "morning" },
    startTime:   { type: String, default: null },
    endTime:     { type: String, default: null },
    status:      { type: String, default: "idle" },
    startedAt:   { type: String, default: null },
    completedAt: { type: String, default: null },
    actualTime:  { type: Number, default: null },
    snoozed:     { type: Boolean, default: false },
  },
  { _id: false } // tasks are embedded, don't need their own _id
);

const DaySchema = new mongoose.Schema(
  {
    user_id:    { type: mongoose.Schema.Types.ObjectId, ref: "User", required: true },
    // For Firebase Auth users (uid is a string like "abc123xyz")
    firebase_uid: { type: String, default: null },
    date:       { type: String, required: true }, // "YYYY-MM-DD"
    tasks:      { type: [TaskSchema], default: [] },
    reflection: { type: mongoose.Schema.Types.Mixed, default: null },
  },
  { timestamps: true }
);

// Compound index: fast lookup for "give me user X's day Y"
// Equivalent to a composite primary key in SQL
DaySchema.index({ user_id: 1, date: 1 }, { unique: true });
// Also index by firebase_uid for Firebase Auth flow
DaySchema.index({ firebase_uid: 1, date: 1 }, { unique: true, sparse: true });

// ============================================================
// 4. NOTES COLLECTION
// Daily notes per user per day (replaces localStorage "daily-notes-{userId}")
// ============================================================
const NoteSchema = new mongoose.Schema(
  {
    user_id:      { type: mongoose.Schema.Types.ObjectId, ref: "User", default: null },
    firebase_uid: { type: String, default: null },
    date:         { type: String, required: true }, // "YYYY-MM-DD"
    content:      { type: String, default: "" },
  },
  { timestamps: true }
);

NoteSchema.index({ user_id: 1, date: 1 }, { unique: true, sparse: true });
NoteSchema.index({ firebase_uid: 1, date: 1 }, { unique: true, sparse: true });

// ============================================================
// 5. ALARMS COLLECTION
// One document per user, stores their alarms array (max 4)
// Replaces localStorage "alarms-{userId}"
// ============================================================
const AlarmSchema = new mongoose.Schema(
  {
    user_id:      { type: mongoose.Schema.Types.ObjectId, ref: "User", default: null },
    firebase_uid: { type: String, default: null, unique: true, sparse: true },
    alarms:       { type: Array, default: [] },
  },
  { timestamps: true }
);

AlarmSchema.index({ user_id: 1 }, { unique: true, sparse: true });
AlarmSchema.index({ firebase_uid: 1 }, { unique: true, sparse: true });

// ============================================================
// REGISTER MODELS
// ============================================================
const User         = mongoose.models.User         || mongoose.model("User",         UserSchema);
const RefreshToken = mongoose.models.RefreshToken || mongoose.model("RefreshToken", RefreshTokenSchema);
const Day          = mongoose.models.Day          || mongoose.model("Day",          DaySchema);
const Note         = mongoose.models.Note         || mongoose.model("Note",         NoteSchema);
const Alarm        = mongoose.models.Alarm        || mongoose.model("Alarm",        AlarmSchema);

// ============================================================
// CREATE ALL INDEXES IN DATABASE
// ============================================================
console.log("\n📦 Creating collections and indexes...\n");

await User.createIndexes();
console.log("✅ users          — indexes created");
console.log("   • email (unique)");

await RefreshToken.createIndexes();
console.log("✅ refresh_tokens — indexes created");
console.log("   • user_id");
console.log("   • token_hash (unique)");
console.log("   • expires_at (TTL — auto-deletes expired tokens!)");

await Day.createIndexes();
console.log("✅ days           — indexes created");
console.log("   • (user_id + date) compound unique");
console.log("   • (firebase_uid + date) compound unique sparse");

await Note.createIndexes();
console.log("✅ notes          — indexes created");
console.log("   • (user_id + date) compound unique sparse");
console.log("   • (firebase_uid + date) compound unique sparse");

await Alarm.createIndexes();
console.log("✅ alarms         — indexes created");
console.log("   • user_id unique sparse");
console.log("   • firebase_uid unique sparse");

// ============================================================
// VERIFY — list all collections
// ============================================================
const collections = await db.listCollections().toArray();
console.log("\n📋 Collections in database:");
collections.forEach(c => console.log("   •", c.name));

console.log("\n🎉 MongoDB setup complete! Your database is ready.\n");
await mongoose.disconnect();