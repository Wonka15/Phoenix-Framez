/**
 * Pure helpers for stop-motion playback and exposure navigation.
 * Kept separate from the DOM so frame math can be tested without a browser.
 */
export const SUPPORTED_FPS = [12, 15, 24, 25, 30];

export function normalizeFps(value) {
  const parsed = Number.parseInt(String(value).replace(/[^0-9]/g, ""), 10);
  return SUPPORTED_FPS.includes(parsed) ? parsed : 24;
}

/** Return the next 1-based frame, loop to one, or return null at the end. */
export function nextFrameIndex(current, end, loop = true) {
  if (current < end) return current + 1;
  return loop ? 1 : null;
}

/** Onion skin is the exposure immediately before the selected exposure. */
export function previousFrameSource(frames, selectedIndex) {
  if (!Array.isArray(frames) || selectedIndex <= 0) return "";
  return frames[selectedIndex - 1]?.src || "";
}

export function frameLabel(frame) {
  return "Frame " + String(Math.max(1, Math.round(Number(frame) || 1))).padStart(3, "0");
}
