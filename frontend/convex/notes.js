// convex/notes.js
// Replaces: MongoDB Note routes in server.js
//   GET  /api/notes/:date        → getNote
//   PUT  /api/notes/:date        → saveNote
//   POST /api/notes/:date/append → appendNote

import { query, mutation } from "./_generated/server";
import { v } from "convex/values";
import { getAuthUserId } from "@convex-dev/auth/server";

// ── GET note for a specific day ───────────────────────────────
// Replaces: GET /api/notes/:date
export const getNote = query({
  args: { date: v.string() },
  handler: async (ctx, { date }) => {
    const userId = await getAuthUserId(ctx);
    if (!userId) return { content: "" };

    const doc = await ctx.db
      .query("notes")
      .withIndex("by_user_date", (q) => q.eq("userId", userId).eq("date", date))
      .unique();

    return { content: doc?.content || "" };
  },
});

// ── SAVE (replace) note for a day ────────────────────────────
// Replaces: PUT /api/notes/:date
export const saveNote = mutation({
  args: {
    date:    v.string(),
    content: v.string(),
  },
  handler: async (ctx, { date, content }) => {
    const userId = await getAuthUserId(ctx);
    if (!userId) throw new Error("Not authenticated");

    const existing = await ctx.db
      .query("notes")
      .withIndex("by_user_date", (q) => q.eq("userId", userId).eq("date", date))
      .unique();

    if (existing) {
      await ctx.db.patch(existing._id, { content });
    } else {
      await ctx.db.insert("notes", { userId, date, content });
    }

    return { ok: true };
  },
});

// ── APPEND to a note with timestamp ──────────────────────────
// Replaces: POST /api/notes/:date/append
export const appendNote = mutation({
  args: {
    date:    v.string(),
    content: v.string(),
  },
  handler: async (ctx, { date, content }) => {
    const userId = await getAuthUserId(ctx);
    if (!userId) throw new Error("Not authenticated");

    // Format timestamp like "[9:00 AM] content"
    const time = new Date().toLocaleTimeString("en-US", {
      hour:   "2-digit",
      minute: "2-digit",
    });
    const line = `[${time}] ${content}`;

    const existing = await ctx.db
      .query("notes")
      .withIndex("by_user_date", (q) => q.eq("userId", userId).eq("date", date))
      .unique();

    if (existing) {
      const newContent = existing.content
        ? `${existing.content}\n\n${line}`
        : line;
      await ctx.db.patch(existing._id, { content: newContent });
      return { ok: true, content: newContent };
    } else {
      await ctx.db.insert("notes", { userId, date, content: line });
      return { ok: true, content: line };
    }
  },
});