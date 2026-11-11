# PhoenixFrame implementation plan

This document is the source of truth for feature status. A visual control or roadmap card is not considered an implemented feature. Mark an item **Implemented** only after its acceptance checks pass on the supported browsers/devices.

## 1. Studio shell and navigation

- [x] Translucent floating quick-action toolbar for Projects, Timeline, Camera and export.
- [x] Floating navigation dock with Overview, Projects, Timeline and Camera shortcuts.
- [x] Responsive sidebar navigation with a mobile menu.
- [x] Safe-area-aware touch navigation and reduced-motion/reduced-transparency fallbacks.
- [ ] Complete iPad Safari usability pass in portrait and landscape.
- [ ] Keyboard navigation and visible focus audit for every workspace.

Acceptance: all navigation targets work at iPad, tablet, desktop and narrow-phone widths; controls remain reachable without overlapping content.

## 2. Project browser and project files

- [x] Project cards with generated artwork thumbnails.
- [x] Optional user-supplied cover image, resized before browser storage.
- [x] Search and grid/list layouts.
- [x] Project creation and local browser persistence.
- [x] Export a versioned JSON project snapshot.
- [ ] Import and validate a versioned project snapshot.
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
- [ ] True previous/next-frame onion-skin compositing with opacity controls.
- [ ] Exposure, focus, ISO and white-balance controls where the connected camera API supports them.
- [ ] Timelapse / interval capture with pause, stop and error recovery.
- [ ] Toucan Camera Server adapter and tested camera compatibility list.
- [ ] Remote camera trigger / companion-device controls.

Acceptance: test built-in camera and supported external camera devices on iPad Safari and desktop browsers; camera permission denial and disconnect are handled; onion skin displays the actual prior frame.

## 4. Timeline and animation editing

- [x] Frame scrubber and 24 FPS playback preview.
- [x] Add named tracks and timeline markers.
- [x] Drag clips horizontally with pointer input.
- [x] Reorder tracks using drag and drop.
- [x] Persist track and marker state locally.
- [ ] Touch-first track reordering and clip resizing handles.
- [ ] Frame-by-frame capture strip and exposure-sheet view.
- [ ] Undo/redo command history.
- [ ] Copy, paste, cut, insert and duplicate frames.
- [ ] Multi-select and ripple editing.
- [ ] Audio waveform tracks and synchronized playback.
- [ ] Timeline zoom, pan, snapping and frame-range controls.

Acceptance: all edits are frame-accurate, survive reload, are undoable, and work with touch, mouse and keyboard.

## 5. Drawing, compositing and effects

- [ ] Onion-skin animation guides over the actual previous/next captured frames.
- [ ] Drawing tools with layers and non-destructive edits.
- [ ] Text cards and speech bubbles.
- [ ] Rotoscoping over imported video.
- [ ] Object removal / eraser and facial-expression overlays.
- [ ] Frame merge and motion-blur simulation.
- [ ] Green-screen / chroma-key compositing.
- [ ] Filters, fades and transitions.

These are substantial editing features. They should be implemented as independent modules with editable project data, not as one large event handler in the studio shell.

## 6. Sound and finishing

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
