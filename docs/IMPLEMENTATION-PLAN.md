# PhoenixFrame implementation plan

This document is the source of truth for feature status. A visual control or roadmap card is not considered an implemented feature. Mark an item **Implemented** only after its acceptance checks pass on the supported browsers/devices.

## 1. Studio shell and navigation

- [x] Translucent floating quick-action toolbar for Projects, Timeline, Camera and export.
- [x] Floating navigation dock with Overview, Projects, Timeline and Camera shortcuts.
- [x] Responsive sidebar navigation with a mobile menu.
- [x] Safe-area-aware touch navigation and reduced-motion/reduced-transparency fallbacks.
- [ ] Complete iPad Safari usability pass in portrait and landscape.
- [x] Basic animator keyboard shortcuts: Space playback, arrow-key frame stepping, C capture and Delete selected exposure.
- [ ] Complete keyboard navigation and visible-focus audit for every workspace.

Acceptance: all navigation targets work at iPad, tablet, desktop and narrow-phone widths; controls remain reachable without overlapping content.

## 2. Project browser and project files

- [x] Project cards with generated artwork thumbnails.
- [x] Optional user-supplied cover image, resized before browser storage.
- [x] Search and grid/list layouts.
- [x] Project creation and local browser persistence.
- [x] Export a versioned JSON project snapshot.
- [x] Import and validate a versioned project snapshot.
- [ ] Scene, shot and take hierarchy with stable IDs.
- [ ] Per-project asset folders and thumbnail regeneration.
- [ ] Autosave, recovery and storage quota management.

Acceptance: a project survives reload, cover thumbnails render, exported JSON validates, and a round-trip import restores the same project without losing IDs or media references.

## 3. Camera station and capture

- [x] Dedicated monitor layout with camera settings panel.
- [x] Browser camera permission flow and live video preview on supported secure origins.
- [x] Still capture from browser camera.
- [x] Import still images into a local frame library.
- [x] Local persistence for imported/captured frames.
- [x] Previous-frame still overlay with opacity controls (previous captured/imported still; next-frame ghosting remains future work).
- [x] Live-view / captured-exposure monitor switch.
- [x] Grid, safe-area, aspect-mask composition guides and monitor blackout.
- [ ] Exposure, focus, ISO and white-balance controls where the connected camera API supports them.
- [x] Basic interval capture with configurable seconds and start/stop controls.
- [ ] Scheduled start/end time, precision scheduling and robust capture error recovery.
- [ ] Toucan Camera Server adapter and tested camera compatibility list.
- [ ] Remote camera trigger / companion-device controls.

Acceptance: test built-in camera and supported external camera devices on iPad Safari and desktop browsers; camera permission denial and disconnect are handled; onion skin displays the actual prior frame.

## 4. Timeline and animation editing

- [x] Frame scrubber and playback preview at 12, 15, 24, 25 and 30 FPS.
- [x] Frame-by-frame stepping, looping playback and last-12-frame short play.
- [x] Add named tracks and timeline markers.
- [x] Drag clips horizontally with pointer input.
- [x] Reorder tracks using drag and drop.
- [x] Persist track and marker state locally.
- [ ] Touch-first track reordering and clip resizing handles.
- [x] Frame-by-frame capture strip and clickable exposure-sheet view.
- [x] Previous-exposure onion skin updates as the selected frame changes.
- [ ] Undo/redo command history.
- [x] Copy, paste, insert blank and delete stills in the frame library.
- [ ] Cut, duplicate, and timeline-integrated frame editing.
- [ ] Multi-select and ripple editing.
- [ ] Audio waveform tracks and synchronized playback.
- [ ] Timeline zoom, pan, snapping and frame-range controls.

Acceptance: all edits are frame-accurate, survive reload, are undoable, and work with touch, mouse and keyboard.

## 5. Drawing, compositing and effects

- [x] Previous captured still can be overlaid in the camera monitor with adjustable opacity.
- [ ] Next-frame ghosting and per-frame exposure-sheet onion skin.
- [x] Per-frame non-destructive pen, line, arrow and eraser drawing layers.
- [x] Undo and clear drawing operations for the current exposure.
- [ ] Text cards and speech bubbles.
- [ ] Rotoscoping over imported video.
- [ ] Object removal / eraser and facial-expression overlays.
- [ ] Frame merge and motion-blur simulation.
- [ ] Green-screen / chroma-key compositing.
- [ ] Filters, fades and transitions.

These are substantial editing features. They should be implemented as independent modules with editable project data, not as one large event handler in the studio shell.

## 6. Sound and finishing

- [x] Import and preview a local voiceover/reference audio file.
- [ ] Voiceover and narration recording with explicit microphone permission.
- [ ] Import audio and add sound-effect / music tracks.
- [ ] Waveform display and frame-accurate audio alignment.
- [ ] Audio levels, fades and mixdown.
- [ ] Preview playback with sound synchronization.

## 7. Export, sharing and portability

- [x] Download a versioned JSON production manifest.
- [ ] Import project manifests with schema validation and safe asset handling.
- [ ] Render/export image sequences.
- [ ] GIF export.
- [ ] 1080p and 4K movie export using a supported local renderer or browser pipeline.
- [ ] Share-ready presets for common social formats.
- [ ] AirDrop / Files / iCloud workflows through native platform share and file APIs where supported.
- [ ] Cross-device project transfer and conflict handling.

The static GitHub Pages site cannot itself provide unrestricted local filesystem access or a native 4K render pipeline. Such capabilities require browser-supported APIs or an optional local companion service.

## 8. Learning, privacy and accessibility

- [ ] Built-in step-by-step tutorials and searchable manual.
- [ ] Contextual help for camera, timeline and export operations.
- [x] No advertising or third-party analytics code added by PhoenixFrame.
- [x] Local-first storage for current prototype data.
- [ ] Privacy review and documented data lifecycle.
- [ ] Accessibility review: labels, focus, contrast, reduced motion and screen-reader announcements.

## 9. External application controller

- [ ] Local bridge pairing and health check.
- [ ] Blender adapter: read-only scene and timeline discovery.
- [ ] Bidirectional playhead synchronization.
- [ ] Frame rate/range and marker synchronization with conflict handling.
- [ ] Eagle Animation and Godot adapters after format/API validation.
- [ ] Toucan camera bridge.

No native application integration is complete until it passes the documented acceptance tests in `MASTER-APPLICATION-CONTROLLER.md`.

## Modular code structure

- `assets/js/core/`: shared DOM and local-storage helpers.
- `assets/js/projects/`: project creation and cover-thumbnail processing.
- `assets/js/timeline/`: pure timeline data model and frame-range rules.
- `assets/js/camera/`: camera monitor onion-skin overlay.
- `assets/js/animation/`: still-frame sequence operations.
- `assets/js/audio/`: local audio preview and object-URL lifecycle.
- `assets/js/export/`: versioned archive creation, validation and download.
- `assets/js/app.js`: browser entry point, workspace rendering and event orchestration.
- `tests/`: Node built-in unit tests for data operations.

## Code quality rules

1. Keep HTML semantic and keep behavior out of inline event attributes.
2. Keep CSS grouped by design tokens, shared components, workspace components and responsive/accessibility overrides.
3. Keep JavaScript responsibilities small; move growing features into dedicated modules under `assets/js/`.
4. Add detailed comments for non-obvious logic, data formats, browser limitations and lifecycle cleanup.
5. Use stable IDs for projects, tracks, clips, markers and cues.
6. Escape user-entered text before rendering; validate imported JSON before accepting it.
7. Persist through a versioned storage layer and handle quota errors visibly.
8. Never claim an integration is connected until a real adapter and test pass.
9. Add automated tests for data models and browser interactions before promoting work from `ndev` to `main`.
10. Update this checklist and the README whenever feature status changes.


## Dragonframe-inspired feature mapping

PhoenixFrame implements its own stop-motion workflow informed by the publicly described Dragonframe feature categories. Current working features include browser camera live view, still capture/import, ordered exposures, a selectable exposure sheet, previous-frame onion skin over live view, captured-frame monitor playback, frame stepping, configurable playback FPS, looping, short-play preview, interval capture, composition guides, monitor blackout and a local project archive.

Features requiring hardware-specific APIs or larger dedicated subsystems remain planned: DSLR exposure/focus control, test-shot tray, reference-video chroma key and garbage mattes, vector drawing and motion paths, full X-sheet dialogue phonetics, multitrack waveform editing and time-warp, DMX lighting, motion-control hardware, stereoscopic capture, and final movie/GIF rendering. The generic browser camera API does not expose DSLR manual controls or guarantee precision shutter timing.


## Dragonframe-inspired implementation scope

The official Dragonframe feature overview describes animation tools, cinematography, audio, DMX lighting, motion control, image capture, X-Sheet/project management, stereoscopic 3D, time-lapse and export. PhoenixFrame now implements a stop-motion-first browser workflow for still capture/import, ordered exposures, a clickable exposure sheet, previous-frame onion skin, live/captured monitor switching, frame stepping, selectable playback rates, looping, short-play preview, composition guides, monitor blackout and basic interval capture.

Not implemented yet: direct DSLR manual camera control, camera-specific test shots, vector drawing/motion paths, full rotoscoping and chroma key, full dialogue phoneme X-Sheet, multitrack audio waveform editing/time-warp, DMX lighting, motion-control hardware, stereoscopic capture and rendered movie/GIF export. These require dedicated adapters, richer project data and device/browser testing; they must not be represented as working controls before implementation.


## Animation-tools workspace

The Animation tools view provides non-destructive per-exposure annotation layers. Pen, straight-line, arrow and eraser strokes are stored as normalized vector coordinates, separate from the source photograph. Motion-path points are stored independently and drawn as a dashed guide. Reference stills are resized before being stored as per-frame overlays with adjustable opacity. Difference view uses a blend-mode comparison against the previous exposure. Undo and clear affect only the selected exposure's overlay data.

Animation layer data is persisted locally and included in the version-1 project archive as an optional field so older v1 archives remain importable. The canvas is a visual guide/editor; compositing, rotoscoping and final rendered output remain separate milestones.
