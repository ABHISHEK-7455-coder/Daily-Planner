// convex/days.js
// Replaces: MongoDB Day routes in server.js
//   GET  /api/days          → getAllDays
//   GET  /api/days/:date    → getDay
//   PUT  /api/days/:date    → saveDay

import { query, mutation } from "./_generated/server";
import { v } from "convex/values";
import { getAuthUserId } from "@convex-dev/auth/server";

// ── GET all days for the logged-in user ───────────────────────
// Returns object keyed by date: { "2025-01-15": { tasks, reflection } }
// Replaces: GET /api/days
export const getAllDays = query({
  args: {},
  handler: async (ctx) => {
    const userId = await getAuthUserId(ctx);
    if (!userId) return {};

    const days = await ctx.db
      .query("days")
      .withIndex("by_user_date", (q) => q.eq("userId", userId))
      .collect();

    // Return as object keyed by date (same shape as old localStorage)
    const result = {};
    for (const d of days) {
      result[d.date] = {
        date:       d.date,
        tasks:      d.tasks,
        reflection: d.reflection ?? null,
      };
    }
    return result;
  },
});

// ── GET a single day ──────────────────────────────────────────
// Replaces: GET /api/days/:date
export const getDay = query({
  args: { date: v.string() },
  handler: async (ctx, { date }) => {
    const userId = await getAuthUserId(ctx);
    if (!userId) return { date, tasks: [], reflection: null };

    const doc = await ctx.db
      .query("days")
      .withIndex("by_user_date", (q) => q.eq("userId", userId).eq("date", date))
      .unique();

    return doc
      ? { date: doc.date, tasks: doc.tasks, reflection: doc.reflection ?? null }
      : { date, tasks: [], reflection: null };
  },
});

// ── SAVE (upsert) a day ───────────────────────────────────────
// Replaces: PUT /api/days/:date
export const saveDay = mutation({
  args: {
    date:       v.string(),
    tasks:      v.array(v.any()),
    reflection: v.optional(v.any()),
  },
  handler: async (ctx, { date, tasks, reflection }) => {
    const userId = await getAuthUserId(ctx);
    if (!userId) throw new Error("Not authenticated");

    const existing = await ctx.db
      .query("days")
      .withIndex("by_user_date", (q) => q.eq("userId", userId).eq("date", date))
      .unique();

    if (existing) {
      // Update existing document
      await ctx.db.patch(existing._id, {
        tasks,
        reflection: reflection ?? null,
      });
    } else {
      // Create new document
      await ctx.db.insert("days", {
        userId,
        date,
        tasks,
        reflection: reflection ?? null,
      });
    }

    return { ok: true, date, tasks };
  },
});