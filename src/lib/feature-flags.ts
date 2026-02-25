// V2 Feature Flags
// These gate new v2 functionality so old and new code paths coexist safely.
// Set environment variables to "false" to revert any feature to v1 behavior.
// Once v2 is fully stable, Phase 12 removes this file entirely.

export const featureFlags = {
  /** Visit model, new server actions, visit-based logic */
  v2Visits: process.env.FEATURE_V2_VISITS !== "false",

  /** Sidebar reduction, role-based routing */
  v2Nav: process.env.FEATURE_V2_NAV !== "false",

  /** Dashboard redesign with action items + metrics */
  v2Dashboard: process.env.FEATURE_V2_DASHBOARD !== "false",
} as const;
