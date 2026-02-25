// V2 Feature Flags
// These gate new v2 functionality so old and new code paths coexist safely.
// Set environment variables to "true" to enable each feature.
// Once v2 is fully stable, Phase 12 removes this file entirely.

export const featureFlags = {
  /** Visit model, new server actions, visit-based logic */
  v2Visits: process.env.FEATURE_V2_VISITS === "true",

  /** Sidebar reduction, role-based routing */
  v2Nav: process.env.FEATURE_V2_NAV === "true",

  /** Dashboard redesign with action items + metrics */
  v2Dashboard: process.env.FEATURE_V2_DASHBOARD === "true",
} as const;
