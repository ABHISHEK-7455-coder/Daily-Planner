// convex/alarms.js
// Replaces: MongoDB Alarm routes in server.js
//   GET /api/alarms  → getAlarms
//   PUT /api/alarms  → saveAlarms

import { query, mutation } from "./_generated/server";
import { v } from "convex/values";
import { getAuthUserId } from "@convex-dev/auth/server";

// ── GET alarms for logged-in user ─────────────────────────────
// Replaces: GET /api/alarms
export const getAlarms = query({
  args: {},
  handler: async (ctx) => {
    const userId = await getAuthUserId(ctx);
    if (!userId) return [];

    const doc = await ctx.db
      .query("alarms")
      .withIndex("by_user", (q) => q.eq("userId", userId))
      .unique();

    return doc?.alarms || [];
  },
});

// ── SAVE (replace) entire alarms array ───────────────────────
// Replaces: PUT /api/alarms
export const saveAlarms = mutation({
  args: {
    alarms: v.array(v.any()),
  },
  handler: async (ctx, { alarms }) => {
    const userId = await getAuthUserId(ctx);
    if (!userId) throw new Error("Not authenticated");

    const existing = await ctx.db
      .query("alarms")
      .withIndex("by_user", (q) => q.eq("userId", userId))
      .unique();

    if (existing) {
      await ctx.db.patch(existing._id, { alarms });
    } else {
      await ctx.db.insert("alarms", { userId, alarms });
    }

    return { ok: true };
  },
});