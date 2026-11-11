# PhoenixFrame Master Application Controller

## Goal

PhoenixFrame is the production hub for a creator's workflow. It coordinates supported third-party applications through small, versioned adapters. It does not replace those applications. Blender is the first adapter target; the design can later support Godot, Eagle Animation and other tools after their interfaces are inspected.

## Deployment boundary

The GitHub Pages website is static HTML, CSS and JavaScript. A browser page cannot reliably launch arbitrary desktop applications, read arbitrary local folders or run Blender's Python API. Native control therefore requires an optional PhoenixFrame Bridge installed and running on the creator's computer. PhoenixFrame remains usable without it.

Architecture: PhoenixFrame browser → authenticated local bridge → application adapter → third-party application.

The bridge must bind to loopback (127.0.0.1) by default, require explicit pairing with a per-install token, use a strict CORS allowlist, expose a small versioned API, and only accept named allowlisted operations. It must not accept arbitrary shell commands, arbitrary executable paths or unrestricted scripts from the website. Destructive operations (overwrite, delete, render over existing output) require confirmation. Secrets and local paths must not be included in exported project files.

## Master project model

PhoenixFrame owns the production manifest: project identity, scenes, shots, takes, frame rate, frame ranges, timing markers, asset references, image sequences, notes and review status. Use stable IDs and a versioned JSON format. Application adapters translate this shared model into target-specific operations; they must not silently replace the canonical production data with application-specific state.

## Adapter contract

Each adapter declares a stable ID, display name, supported application/version range, adapter and protocol versions, capabilities, runtime requirements, formats and known limitations. The UI distinguishes Planned, Available, Connected, Tested and Unsupported. A visible card is not proof of a working connection.

## Blender adapter — first target

Version targets:
- Blender 5.3 stable, released November 10, 2026.
- Blender 5.2 LTS as a production-oriented compatibility target.
- Consider Blender 4.5 LTS separately if there is a practical need; do not assume compatibility.

Use Blender's supported Python API (bpy) through the local adapter. The bridge can launch Blender with a controlled, adapter-owned Python script or communicate with a Blender-side extension. Background mode is suitable for batch validation and rendering; interactive tasks should open the user's Blender UI when requested.

Suggested capability sequence:
1. Detect Blender executable and version.
2. Open a selected .blend project after user confirmation.
3. Read scene names, frame rate, frame start/end and timeline markers.
4. Import or reference a PhoenixFrame image sequence.
5. Create or update timeline markers from PhoenixFrame shot markers.
6. Export a preview render to a user-selected folder.
7. Return job status, logs and output file references.

Start read-only. Add write operations only after mappings and round-trip behavior are tested. Never overwrite a .blend file automatically.

### OpenTimelineIO

Blender 5.3 introduces initial OpenTimelineIO support in the Video Sequencer. Evaluate OTIO for editorial/timeline interchange, but do not assume it covers all Blender animation data, scene structure, camera settings, rigging or arbitrary project state. PhoenixFrame's manifest remains the canonical production record. Publish exactly which fields round-trip.

### Security

Run only reviewed adapter-owned scripts. Use temporary job directories and explicit input/output allowlists. Confirm file opening, writing and expensive renders. Provide cancellation and visible logs. Do not upload .blend files or assets to a remote service unless the user explicitly asks.

## Bidirectional live synchronization

Blender integration is intended to be genuinely two-way for explicitly supported properties. PhoenixFrame is not merely a remote-control panel and Blender is not merely an export target. Either application may originate a supported change, and the other should reflect it in near real time.

### Initial synchronized properties

- Current frame / playhead position (including timeline scrubbing and playback updates).
- Active scene, when a stable scene mapping exists.
- Scene frame rate and frame range (start/end), with explicit conflict handling.
- Timeline markers: create, move, rename and delete, with stable cross-application IDs.
- Connection state, active project identity and supported capability/version information.

### Event transport

Use a persistent local WebSocket connection between the PhoenixFrame browser and the local bridge. The Blender adapter/extension communicates with the same bridge. The bridge validates, normalizes and relays versioned events; it does not become a second source of truth for project content.

Each event should include protocol version, project ID, mapped scene ID, property, value, origin application, client/session ID, monotonically increasing sequence number, timestamp and correlation/causation ID. Validate every payload against a strict schema and reject unknown operations.

### Preventing feedback loops and conflicts

- Every update carries an origin and event ID. A receiver applies remote changes without echoing them back as a new local edit.
- Use sequence numbers and last-applied event IDs to ignore duplicates and stale messages.
- For high-frequency playhead movement, throttle/coalesce outbound updates (for example, send the latest frame at a bounded rate while scrubbing) and always send the final settled frame.
- Use an explicit active-controller/lease for playback transport so two applications do not continuously fight over play/pause state. Playhead following can remain bidirectional when only one side is actively driving it.
- For discrete edits such as marker rename or frame-range changes, use versioned updates and surface a conflict instead of silently overwriting a newer edit.
- If disconnected, queue only safe discrete edits with their base revision; do not queue a long stream of stale playhead events. Reconnect with a state snapshot and reconcile before resuming live sync.
- Provide visible Sync On/Off, source/driver, latency/connection state and a pause-sync control.

### Blender event sources and thread safety

Use Blender's `bpy.app.handlers.frame_change_post` to observe frame changes from timeline scrubbing and playback. Use `bpy.msgbus` for supported RNA property notifications, but do not assume it observes every viewport interaction or animation-system update; Blender documents those limitations. Handlers should enqueue compact events for the bridge and avoid blocking network I/O or performing unsafe Blender data mutations from render-related callbacks. Apply incoming Blender changes on Blender's main thread through a timer/operator or another supported main-thread mechanism. Re-register subscriptions/handlers after file loads and clean them up on extension disable.

### Synchronization scope

Live synchronization of playhead, scene selection, frame range and timeline markers is a realistic first release. It does not mean arbitrary Blender edits—mesh topology, rigging, materials, node graphs, animation curves or modifier stacks—will automatically mirror into PhoenixFrame. Those require separate, explicit adapters and data models. The browser should label unsupported changes clearly.

### First acceptance tests

1. Scrub PhoenixFrame from frame 1 to 100; Blender follows without echo loops.
2. Scrub Blender from frame 100 to 1; PhoenixFrame follows.
3. Start playback in Blender; PhoenixFrame playhead follows at a smooth, throttled update rate.
4. Move a marker in either application; the other updates exactly once.
5. Change scene frame range in either application; the other reflects it or displays a conflict.
6. Disconnect the bridge mid-session; the UI shows offline state, then reconnects and reconciles from a fresh snapshot.
7. Load a different .blend file; old scene mappings and subscriptions are safely replaced.
8. Verify no network call blocks Blender's UI or causes unsafe data mutation during rendering.

## Other application adapters

Future candidates include Eagle Animation, Godot, video editors, image tools and 3D applications. Add an adapter only after inspecting official APIs, scripting interfaces or supported interchange formats. Do not claim control of any arbitrary application; unsupported tools remain manual workflow links.

## Milestones

1. Define and validate the versioned PhoenixFrame manifest.
2. Build local bridge pairing, health check, capability discovery and safe job lifecycle.
3. Implement Blender read-only discovery.
4. Test Blender 5.3 stable and 5.2 LTS on supported operating systems.
5. Add confirmed timeline-marker exchange and image-sequence import.
6. Add preview rendering with status and output reporting.
7. Evaluate OTIO round-trip coverage and publish a compatibility matrix.
8. Add further application adapters one at a time.

## Current implementation status

This is an architecture and implementation plan. The website does not currently launch or control Blender or other desktop applications. The local bridge, Blender adapter, OTIO exchange and listed capabilities remain planned until implemented and tested.