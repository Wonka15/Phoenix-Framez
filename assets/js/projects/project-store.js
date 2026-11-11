/** Project-domain helpers. UI rendering stays in the studio controller. */
import { makeId } from "../core/dom.js";

export function createProject({ name, type, cover = "" }) {
  return {
    id: makeId("project"),
    name: String(name).trim(),
    type: String(type || "Animation"),
    date: new Date().toLocaleDateString(),
    cover
  };
}

/** Resize a cover before storing it; this avoids filling browser quota with originals. */
export async function makeCoverThumbnail(file) {
  if (!file || !file.type.startsWith("image/")) return "";
  const bitmap = await createImageBitmap(file);
  try {
    const scale = Math.min(1, 640 / Math.max(bitmap.width, bitmap.height));
    const canvas = document.createElement("canvas");
    canvas.width = Math.max(1, Math.round(bitmap.width * scale));
    canvas.height = Math.max(1, Math.round(bitmap.height * scale));
    canvas.getContext("2d").drawImage(bitmap, 0, 0, canvas.width, canvas.height);
    return canvas.toDataURL("image/jpeg", 0.78);
  } finally {
    bitmap.close?.();
  }
}
