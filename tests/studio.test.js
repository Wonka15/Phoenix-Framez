import test from "node:test";
import assert from "node:assert/strict";
import { normalizeTimeline, createTrack, createMarker, moveClip, reorderTrack } from "../assets/js/timeline/timeline-model.js";
import { createFrameSequence } from "../assets/js/animation/frame-sequence.js";
import { normalizeFps, nextFrameIndex, previousFrameSource, frameLabel } from "../assets/js/animation/stop-motion.js";
import { buildProjectArchive, validateProjectArchive } from "../assets/js/export/project-archive.js";

test("timeline normalizes invalid frame positions and missing track data", () => {
  const timeline = normalizeTimeline({ tracks: [{ id: "a", name: "Camera", clips: [{ id: "c", start: 999, duration: 20 }] }], markers: [{ name: "Cut", frame: -8 }] });
  assert.equal(timeline.tracks[0].clips[0].start, 100);
  assert.equal(timeline.markers[0].frame, 0);
  assert.equal(timeline.tracks[0].clips[0].color, "blue");
});

test("timeline supports adding, moving and reordering tracks", () => {
  const tracks = [createTrack("Camera"), createTrack("Animation")];
  tracks[0].clips.push({ id: "clip-1", label: "Shot", start: 2, duration: 20, color: "purple" });
  assert.equal(moveClip(tracks, tracks[0].id, "clip-1", 40), true);
  assert.equal(tracks[0].clips[0].start, 40);
  assert.equal(reorderTrack(tracks, tracks[0].id, tracks[1].id), true);
  assert.equal(tracks[1].name, "Camera");
  assert.equal(createMarker("Cut", 12).frame, 12);
});

test("frame sequence supports copy, paste, blank insert and delete", () => {
  const sequence = createFrameSequence([{ id: "one", src: "data:image/jpeg;base64,AA==" }]);
  assert.equal(sequence.copy(0), true);
  assert.equal(sequence.paste(1), true);
  assert.equal(sequence.frames.length, 2);
  sequence.insertBlank(1);
  assert.equal(sequence.frames[1].blank, true);
  assert.equal(sequence.remove(1), true);
  assert.equal(sequence.frames.length, 2);
});

test("project archive validates v1 data and rejects unknown formats", () => {
  const archive = buildProjectArchive({ projects: [], cues: [], frames: [], markers: [], tracks: [] });
  assert.equal(validateProjectArchive(archive).version, 1);
  assert.throws(() => validateProjectArchive({ format: "other", version: 1 }), /not a supported/);
});

test("stop-motion transport respects supported frame rates and sequence boundaries", () => {
  assert.equal(normalizeFps("25 FPS"), 25);
  assert.equal(normalizeFps(999), 24);
  assert.equal(nextFrameIndex(4, 5, false), 5);
  assert.equal(nextFrameIndex(5, 5, false), null);
  assert.equal(nextFrameIndex(5, 5, true), 1);
  assert.equal(frameLabel(7), "Frame 007");
});

test("onion skin uses the previous captured exposure, never the selected one", () => {
  const frames = [{src:"one"}, {src:"two"}, {src:"three"}];
  assert.equal(previousFrameSource(frames, 2), "two");
  assert.equal(previousFrameSource(frames, 0), "");
});
