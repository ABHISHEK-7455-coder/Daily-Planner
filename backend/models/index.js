// models/index.js
// Import this in server.js instead of defining schemas inline
// Usage: import { User, RefreshToken, Day, Note, Alarm } from "./models/index.js"

import mongoose from "mongoose";

// ============================================================
// USER MODEL
// ============================================================
const UserSchema = new mongoose.Schema(
  {
    email:         { type: String, required: true, unique: true, lowercase: true, trim: true },
    password_hash: { type: String, required: true },
    name:          { type: String, default: null },
    role:          { type: String, enum: ["user", "admin", "moderator"], default: "user" },
  },
  { timestamps: true }
);
UserSchema.index({ email: 1 }, { unique: true });

// ============================================================
// REFRESH TOKEN MODEL
// ============================================================
const RefreshTokenSchema = new mongoose.Schema(
  {
    user_id:    { type: mongoose.Schema.Types.ObjectId, ref: "User", required: true },
    token_hash: { type: String, required: true, unique: true },
    expires_at: { type: Date, required: true },
    is_revoked: { type: Boolean, default: false },
  },
  { timestamps: { createdAt: true, updatedAt: false } }
);
RefreshTokenSchema.index({ user_id: 1 });
RefreshTokenSchema.index({ token_hash: 1 }, { unique: true });
RefreshTokenSchema.index({ expires_at: 1 }, { expireAfterSeconds: 0 }); // TTL auto-delete

// ============================================================
// TASK SUB-SCHEMA (embedded inside Day)
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
  { _id: false }
);

// ============================================================
// DAY MODEL  (tasks per user per calendar day)
// ============================================================
const DaySchema = new mongoose.Schema(
  {
    // Use firebase_uid (string) for Firebase Auth users
    firebase_uid: { type: String, required: true },
    date:         { type: String, required: true }, // "YYYY-MM-DD"
    tasks:        { type: [TaskSchema], default: [] },
    reflection:   { type: mongoose.Schema.Types.Mixed, default: null },
  },
  { timestamps: true }
);
DaySchema.index({ firebase_uid: 1, date: 1 }, { unique: true });

// ============================================================
// NOTE MODEL  (daily notes per user per day)
// ============================================================
const NoteSchema = new mongoose.Schema(
  {
    firebase_uid: { type: String, required: true },
    date:         { type: String, required: true }, // "YYYY-MM-DD"
    content:      { type: String, default: "" },
  },
  { timestamps: true }
);
NoteSchema.index({ firebase_uid: 1, date: 1 }, { unique: true });

// ============================================================
// ALARM MODEL  (alarms array per user)
// ============================================================
const AlarmSchema = new mongoose.Schema(
  {
    firebase_uid: { type: String, required: true, unique: true },
    alarms:       { type: Array, default: [] },
  },
  { timestamps: true }
);
AlarmSchema.index({ firebase_uid: 1 }, { unique: true });

// ============================================================
// EXPORT MODELS (safe against model re-registration)
// ============================================================
export const User         = mongoose.models.User         || mongoose.model("User",         UserSchema);
export const RefreshToken = mongoose.models.RefreshToken || mongoose.model("RefreshToken", RefreshTokenSchema);
export const Day          = mongoose.models.Day          || mongoose.model("Day",          DaySchema);
export const Note         = mongoose.models.Note         || mongoose.model("Note",         NoteSchema);
export const Alarm        = mongoose.models.Alarm        || mongoose.model("Alarm",        AlarmSchema);