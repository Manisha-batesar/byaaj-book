"use client"

// Re-export the stable default AIExperience implementation.
// `ai-experience-fixed.tsx` contains the full `AIExperience` default export
// used across the app. Older/empty files caused the import to resolve to
// an object instead of a React component which triggered the runtime error
// "Element type is invalid" in `DashboardPage`.

export { default } from "./ai-experience-fixed"

