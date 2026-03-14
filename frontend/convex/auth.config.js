// import { convexAuth } from "@convex-dev/auth/server";

// export default {
//   providers: [
//     // ── Email + Password ──────────────────────────
//     {
//       id: "password",
//       type: "credentials",
//     },
//     // ── Google OAuth ──────────────────────────────
//     {
//       id: "google",
//       type: "oauth",
//       clientId: process.env.AUTH_GOOGLE_ID,
//       clientSecret: process.env.AUTH_GOOGLE_SECRET,
//       domain: process.env.CONVEX_SITE_URL,
//       applicationID: "convex",
//     },
//   ],
// };


export default {
  providers: [
    {
      domain: process.env.CONVEX_SITE_URL,
      applicationID: "convex",
    },
  ],
};