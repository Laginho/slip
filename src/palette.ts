/**
 * Every colour in the app. No hex literals anywhere else.
 *
 * Hue = Kind. Intensity = Urgency (always derived from the Deadline, never chosen).
 * These are a tuned starting point, meant to be edited by hand before deploy.
 * Not a theme system: there is no picker, no dark mode, no settings screen.
 *
 * MANIFEST_THEME below is duplicated in index.html and vite.config.ts, because a
 * meta tag and a build-time manifest cannot import a module. Change all three together.
 */

export const CARD = {
  // light = pastel (no Deadline, or > 7 days out)
  // medium = the user's Google Calendar hue (Deadline within 7 days)
  // dark = Deadline today, or Overdue
  work: { light: "#f9d4c8", medium: "#e3683e", dark: "#973e20" },
  // College fights this, as expected: darkening yellow by lightness alone turns it
  // olive. Settled on a saturated amber (hue nudged 42deg -> 34deg, saturation pushed
  // to ~88%) which stays recognisably the same hue and is dark enough for white text.
  college: { light: "#faebc2", medium: "#e7ba51", dark: "#ad670b" },
  chore: { light: "#cfe6f7", medium: "#4b99d2", dark: "#275a86" },
} as const;

/** Card text. Light and medium steps take the dark ink; dark steps take the light one. */
export const INK_ON_LIGHT = "#1a1a1a";
export const INK_ON_DARK = "#ffffff";

/**
 * "N dias atrasado". Only ever rendered on a dark step, since Overdue implies dark.
 * Light red, because two of the three dark steps are genuinely dark.
 * Known weak spot: against College dark (amber) this is only ~1.7:1 — red and amber
 * sit too close in luminance for any red to fix. Bold weight is carrying it. If it
 * reads badly on the phone, darkening College dark further is the lever.
 */
export const OVERDUE_RED = "#ff7a68";

/** App chrome. */
export const SURFACE = "#f5f4f2";
export const MANIFEST_THEME = SURFACE;
export const TEXT_PRIMARY = "#1a1a1a";
export const TEXT_QUIET = "#8a8783";
export const HAIRLINE = "#e2e0dc";
export const CAPTURE_BG = "#ffffff";
