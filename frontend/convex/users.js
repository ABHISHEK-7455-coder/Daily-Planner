// convex/users.js
// Provides getMe query used by AuthContext.jsx
// Returns current logged-in user's profile

import { query } from "./_generated/server";
import { getAuthUserId } from "@convex-dev/auth/server";

// ── Get current user's profile ────────────────────────────────
// Used in AuthContext: const convexUser = useQuery(api.users.getMe)
export const getMe = query({
  args: {},
  handler: async (ctx) => {
    const userId = await getAuthUserId(ctx);
    if (!userId) return null;

    const user = await ctx.db.get(userId);
    return user ?? null;
  },
});