/** Shared DOM helpers. Keep selectors and safe text handling consistent. */
export const $ = (selector, root = document) => root.querySelector(selector);
export const $$ = (selector, root = document) => [...root.querySelectorAll(selector)];

/** Escape user-controlled strings before inserting them into HTML templates. */
export function escapeHTML(value) {
  return String(value).replace(/[&<>"']/g, character => ({
    "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;"
  })[character]);
}

/** Generate stable-enough client IDs; IDs are persisted with project data. */
export function makeId(prefix = "item") {
  return prefix + "-" + Date.now().toString(36) + "-" + Math.random().toString(36).slice(2, 7);
}
