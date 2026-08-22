/**
 * Every colour in the app. No hex literals anywhere else.
 *
 * Hue = Kind. Intensity = Urgency (always derived from the Deadline, never chosen).
 * These are a tuned starting point, meant to be edited by hand before deploy.
 * Not a theme system: there is no picker, no dark mode, no settings screen.
 *
 * This file is the only source of colour. vite.config.ts imports SURFACE for the PWA
 * manifest and injects it into index.html's theme-color tag at build time, so tuning a
 * value here cannot leave the installed app's chrome stale.
 */

export const CARD = {
  // light = pastel (no Deadline, or > 7 days out)
  // medium = the user's Google Calendar hue (Deadline within 7 days)
  // dark = Deadline today, or Overdue
  work: { light: "#f9d4c8", medium: "#e3683e", dark: "#973e20" },
  // College fights this, as expected: darkening yellow by lightness alone turns it
  // olive. Settled on a saturated amber (hue nudged 42deg -> 38deg, saturation ~92%)
  // which stays recognisably the same hue. Lightness is pinned by contrast rather than
  // taste: white Task text needs 4.5:1, and the first amber tried was 4.45:1 -- close
  // enough to look fine and still fail. This one is 4.84:1. Darkening it further is
  // the documented lever if the Overdue label reads badly (see OVERDUE_RED).
  college: { light: "#faebc2", medium: "#e7ba51", dark: "#9d6607" },
  chore: { light: "#cfe6f7", medium: "#4b99d2", dark: "#275a86" },
} as const;

/** Card text. Light and medium steps take the dark ink; dark steps take the light one. */
export const INK_ON_LIGHT = "#1a1a1a";
export const INK_ON_DARK = "#ffffff";

/**
 * "N dias atrasado". Only ever rendered on a dark step, since Overdue implies dark.
 *
 * Unresolved, and deliberately left visible rather than papered over. Measured against
 * the three dark steps this is 2.72:1 on Work, 1.74:1 on College, 2.85:1 on Chore — so
 * it misses the 4.5:1 normal-text bar on all three, not only College. Bold weight does
 * not earn the 3:1 large-text allowance either; that needs roughly 18.7px bold.
 *
 * No red fixes this. The spec asks for bold red text on a saturated dark card and
 * forbids a red border, and those two requirements collide. The known third option is
 * a compact light pill behind darker red glyphs: still bold, still red, not a border,
 * and its contrast stops depending on the Card colour underneath.
 *
 * Left as spec'd pending the user's eye on a real phone.
 */
export const OVERDUE_RED = "#ff7a68";

/** App chrome. vite.config.ts imports SURFACE for the manifest and the theme-color tag. */
export const SURFACE = "#f5f4f2";
export const TEXT_PRIMARY = "#1a1a1a";
export const TEXT_QUIET = "#8a8783";
export const TOAST_BG = "#2b2a28";
export const TOAST_INK = "#f7f6f4";
export const HAIRLINE = "#e2e0dc";
export const CAPTURE_BG = "#ffffff";
