/** Portable project archive helpers and strict schema checks. */
export function buildProjectArchive(state) {
  return {
    format: "phoenixframe-project",
    version: 1,
    exportedAt: new Date().toISOString(),
    projects: state.projects,
    cues: state.cues,
    timeline: { markers: state.markers, tracks: state.tracks },
    frames: state.frames,
    animationEdits: state.animationEdits || {}
  };
}

export function validateProjectArchive(value) {
  if (!value || value.format !== "phoenixframe-project" || value.version !== 1) {
    throw new TypeError("This file is not a supported PhoenixFrame v1 project.");
  }
  if (!Array.isArray(value.projects) || !Array.isArray(value.cues) ||
      !Array.isArray(value.frames) || !value.timeline ||
      !Array.isArray(value.timeline.tracks) || !Array.isArray(value.timeline.markers)) {
    throw new TypeError("The project file is missing required data.");
  }
  // v1 archives created before drawing layers existed remain fully importable.
  if (value.animationEdits !== undefined && (!value.animationEdits || typeof value.animationEdits !== "object" || Array.isArray(value.animationEdits))) {
    throw new TypeError("The animation layer data is invalid.");
  }
  return { ...value, animationEdits: value.animationEdits || {} };
}

export function downloadJson(value, filename) {
  const blob = new Blob([JSON.stringify(value, null, 2)], { type: "application/json" });
  const url = URL.createObjectURL(blob);
  const link = document.createElement("a");
  link.href = url;
  link.download = filename;
  link.click();
  window.setTimeout(() => URL.revokeObjectURL(url), 1000);
}
