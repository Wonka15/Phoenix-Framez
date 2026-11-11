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