# PhoenixFrame integration architecture

## Product direction

PhoenixFrame is an independent, browser-based animation production companion. It should be useful on its own and should also complement Eagle Animation rather than attempt to replace its animation editor.

The website is hosted as static files on GitHub Pages. Optional local services provide hardware access and advanced processing when a creator needs them.

## Roles

| Component | Responsibility | Where it runs |
| --- | --- | --- |
| PhoenixFrame | Production dashboard, project planning, shot/scene organization, timeline tools, frame library and interchange UI | Browser; static site on GitHub Pages |
| Eagle Animation | Stop-motion animation editing, playback and export | Eagle's supported desktop, mobile or web app |
| Toucan Camera Server | Camera discovery, live view, capture and camera settings through its API | User's local computer or supported device |
| Optional Python companion | Batch image processing, local file operations, rendering helpers and automation | User's local computer |

PhoenixFrame must remain useful when Toucan, Python or Eagle is not installed. Camera and local-processing features should show a clear disconnected/optional state rather than blocking the rest of the studio.

## Integration principles

1. **Prefer documented boundaries.** Integrate through documented HTTP APIs and open interchange formats. Do not copy Eagle Animation or Toucan source code into this repository.
2. **Do not invent compatibility.** Inspect Eagle's real project format, import/export behavior and supported interfaces before implementing project synchronization.
3. **Start with portable files.** The first Eagle bridge milestone should be a documented interchange package for scene/shot metadata and image sequences. Validate it against real Eagle exports before claiming round-trip compatibility.
4. **Keep camera control separate.** PhoenixFrame talks to Toucan's API; Toucan talks to the camera. Do not reimplement camera-vendor SDK support in the browser.
5. **Treat local services as optional.** GitHub Pages cannot run Python or a persistent Toucan server. A local companion process is required for those capabilities.
6. **Protect credentials.** A Toucan token is a local secret. Do not commit it, put it in public project files, or send it to an unrelated remote service. Provide an explicit connect/disconnect flow and explain browser-origin/network requirements.
7. **Test browser constraints.** Validate CORS, HTTPS-to-local-network behavior, mixed-content restrictions, permissions and browser support on Safari, Chrome and Firefox before advertising camera support.
8. **Keep licensing clean.** Eagle Animation and Toucan Camera Server are GPL-3.0 projects, while this repository currently declares MIT. Keep integrations at arm's length through APIs and file formats, do not copy GPL code/assets, preserve attribution for referenced formats, and obtain a licensing review before distributing combined or derivative software. This is a project-planning note, not legal advice.

## Proposed user workflow

1. Open PhoenixFrame from its GitHub Pages URL.
2. Create a production and organize scenes, shots, takes and notes.
3. Optionally connect to a Toucan server on the user's own network.
4. Capture frames through Toucan and organize them in PhoenixFrame.
5. Export a portable interchange package.
6. Open/import the supported image sequence or project data in Eagle Animation, then edit and finish the animation there.
7. Optionally use the Python companion for local batch processing or other file-based tasks.

## Delivery milestones

### Phase 1 — foundation
- Keep the static HTML/CSS/JavaScript app deployable on GitHub Pages.
- Define a versioned PhoenixFrame project manifest.
- Add project save/load and portable export/import.
- Add clear integration status cards and setup documentation.

### Phase 2 — Eagle Animation Bridge
- Inspect Eagle's current documented import/export options and real sample project files.
- Define a minimal interchange schema for project, scene, shot, frame rate, frame ranges, notes and image sequence references.
- Implement export first, then import.
- Test with real Eagle Animation versions and record exact compatibility.
- Do not claim automatic synchronization unless a supported API or reliable file workflow is proven.

### Phase 3 — Toucan camera connection
- Document the supported Toucan server setup and API version.
- Implement manual server URL entry and token entry without saving secrets to exported projects.
- Test connection status, camera list, live view and still capture.
- Resolve CORS, mixed-content, local-network and Safari compatibility before enabling the feature by default.

### Phase 4 — optional Python companion
- Define a small local service API only for capabilities that browsers cannot safely provide.
- Start with local image-sequence processing and export helpers.
- Keep it independently installable and versioned.
- Do not make Python a prerequisite for the browser studio.

### Phase 5 — production integrations
- Evaluate Blender and Godot interchange needs separately.
- Add automated tests and compatibility notes for each supported integration.

## Current implementation status

This document describes the intended architecture and roadmap. It does not mean Eagle synchronization, Toucan camera capture, Python processing, Blender integration or Godot integration is currently implemented. Each feature must be tested before its status changes from planned to working.
