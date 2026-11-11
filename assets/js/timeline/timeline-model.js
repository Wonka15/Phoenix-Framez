/** Pure timeline model helpers; no DOM or browser dependencies. */
import { makeId } from "../core/dom.js";

export const DEFAULT_TRACKS = [
  { id: "camera", name: "Camera", clips: [{ id: "opening", label: "Opening shot", start: 2, duration: 30, color: "purple" }] },
  { id: "animation", name: "Animation", clips: [{ id: "blocking", label: "Character blocking", start: 18, duration: 38, color: "blue" }] },
  { id: "audio", name: "Audio", clips: [{ id: "scratch-audio", label: "Scratch audio", start: 3, duration: 65, color: "amber" }] }
];

export function normalizeTimeline(value = {}) {
  const tracks = Array.isArray(value.tracks) ? value.tracks : DEFAULT_TRACKS.map(track => structuredClone(track));
  const markers = Array.isArray(value.markers) ? value.markers : [];
  return {
    tracks: tracks.map(track => ({
      id: String(track.id || makeId("track")),
      name: String(track.name || "Untitled track"),
      clips: Array.isArray(track.clips) ? track.clips.map(clip => ({
        id: String(clip.id || makeId("clip")),
        label: String(clip.label || "Untitled clip"),
        start: clampFrame(clip.start),
        duration: Math.max(1, Math.min(120, Number(clip.duration) || 1)),
        color: ["purple", "blue", "amber", "rose"].includes(clip.color) ? clip.color : "blue"
      })) : []
    })),
    markers: markers.map(marker => ({
      id: String(marker.id || makeId("marker")),
      name: String(marker.name || "Marker"),
      frame: clampFrame(marker.frame)
    }))
  };
}

export function clampFrame(value) {
  return Math.max(0, Math.min(120, Math.round(Number(value) || 0)));
}

export function createTrack(name) {
  return { id: makeId("track"), name: String(name).trim(), clips: [] };
}

export function createMarker(name, frame) {
  return { id: makeId("marker"), name: String(name).trim(), frame: clampFrame(frame) };
}

export function moveClip(tracks, trackId, clipId, start) {
  const clip = tracks.find(track => track.id === trackId)?.clips.find(item => item.id === clipId);
  if (!clip) return false;
  clip.start = Math.min(120 - clip.duration, clampFrame(start));
  return true;
}

export function reorderTrack(tracks, sourceId, targetId) {
  const from = tracks.findIndex(track => track.id === sourceId);
  const to = tracks.findIndex(track => track.id === targetId);
  if (from < 0 || to < 0 || from === to) return false;
  const [track] = tracks.splice(from, 1);
  tracks.splice(to, 0, track);
  return true;
}
