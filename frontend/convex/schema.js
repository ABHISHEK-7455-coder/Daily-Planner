import { defineSchema, defineTable } from "convex/server";
import { v } from "convex/values";
import { authTables } from "@convex-dev/auth/server";

const taskFields = {
  id:          v.number(),
  title:       v.string(),
  completed:   v.boolean(),
  timeOfDay:   v.union(v.literal("morning"), v.literal("afternoon"), v.literal("evening")),
  startTime:   v.union(v.string(), v.null()),
  endTime:     v.union(v.string(), v.null()),
  status:      v.string(),
  startedAt:   v.union(v.string(), v.null()),
  completedAt: v.union(v.string(), v.null()),
  actualTime:  v.union(v.number(), v.null()),
  snoozed:     v.boolean(),
};

export default defineSchema({
  ...authTables,

  days: defineTable({
    userId:     v.string(),
    date:       v.string(),
    tasks:      v.array(v.object(taskFields)),
    reflection: v.optional(v.any()),
  }).index("by_user_date", ["userId", "date"]),

  notes: defineTable({
    userId:  v.string(),
    date:    v.string(),
    content: v.string(),
  }).index("by_user_date", ["userId", "date"]),

  alarms: defineTable({
    userId: v.string(),
    alarms: v.array(v.any()),
  }).index("by_user", ["userId"]),
});