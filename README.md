# PhoenixFrame 1.0 — Animation Production Studio

PhoenixFrame is an independent, browser-based production companion for stop-motion and other frame-based animation workflows. It is designed to complement Eagle Animation while remaining useful as a standalone studio.

## Product direction

- **PhoenixFrame:** production planning, scenes, shots, takes, timing, frame organization and interchange.
- **Eagle Animation:** animation editing, playback and finishing.
- **Toucan Camera Server:** optional camera connection through its local API.
- **Master Application Controller:** coordinates supported desktop tools through optional, secure local adapters; Blender is the first target.
- **Python companion:** optional local image processing and production automation.

The PhoenixFrame website is intended to run as static HTML, CSS and JavaScript on GitHub Pages. Toucan and Python are separate optional local services; GitHub Pages does not run those services.

## Current status

**Alpha 0.1 — initial web interface**

- Responsive studio dashboard
- Browser-session project creation
- Timeline planning prototype with add-track and marker controls
- Lip-sync cue sheet with add/remove controls
- Integration roadmap for Eagle Animation, Toucan, Blender, Godot and optional Python tools

The current interface is a prototype. Project persistence, portable project files, camera capture and external application integrations are not yet implemented.

## Development branches

- `main` — stable releases
- `ndev` — active development

## Run locally

This is a static website. Open `index.html` in a browser, or serve the repository folder with any static HTTP server.

## GitHub Pages

The workflow in `.github/workflows/pages.yml` deploys the site when changes are pushed to `ndev`. In repository Settings → Pages, set the build and deployment source to **GitHub Actions** if it is not already selected.

## Roadmap

1. Define and implement a versioned PhoenixFrame project manifest.
2. Add project save/load and portable export/import.
3. Inspect Eagle Animation's real project and interchange formats; build a tested file-based bridge.
4. Connect to Toucan Camera Server through its documented API, subject to browser security and network compatibility.
5. Add an optional Python companion for local image processing and production automation.
6. Evaluate Blender and Godot integrations.
7. Add automated tests and publish compatibility notes.

## Master Application Controller

PhoenixFrame is intended to act as the production hub for supported third-party applications, with bidirectional live synchronization for supported properties. For example, scrubbing in PhoenixFrame can move Blender's playhead, and scrubbing in Blender can update PhoenixFrame. The GitHub Pages site cannot directly control native desktop applications; this requires an optional local bridge running on the creator's computer. The bridge will use paired, allowlisted adapters rather than arbitrary shell or script execution. Blender is the first planned adapter. See [Master Application Controller](docs/MASTER-APPLICATION-CONTROLLER.md) for the design, security boundaries, Blender version targets and implementation milestones.

## Integration and licensing boundaries

PhoenixFrame should integrate with Eagle Animation and Toucan through documented APIs and portable file formats. This repository must not copy their source code or assets. Eagle Animation and Toucan Camera Server are GPL-3.0 projects, while this repository currently declares MIT; review licensing before distributing combined or derivative software. See [the integration architecture](docs/INTEGRATION-ARCHITECTURE.md).

## Important

Eagle Animation, Toucan, Python, Blender and Godot integrations are planned, not currently working features. No automatic synchronization, camera control or benchmark is claimed until implemented and tested.

## License

See [LICENSE](LICENSE).

## Studio interface status

The current `ndev` interface includes a touch-friendly floating tool dock, visual project browser with locally saved project cards, a prototype timeline with playhead and draggable clips, a camera-station layout, and responsive iPad/mobile navigation.

The camera station can request a browser camera feed over a secure context and capture stills where browser permissions and hardware allow. Toucan Camera Server is not connected yet. The timeline and project library are front-end prototypes; bidirectional Blender control still requires the separate local bridge and Blender adapter described in the integration documents. Do not treat roadmap integrations as active connections.


## Code organization and implementation discipline

The alpha keeps browser code dependency-free and separates responsibilities by clearly marked sections in `assets/js/app.js`: DOM/storage helpers, application state, navigation, project browser, timeline, lip-sync, camera station, portable export, event wiring and startup. Styles are grouped in `assets/css/style.css`; semantic workspace structure lives in `index.html`; architecture and delivery checklists live in `docs/`.

New features should be implemented behind small functions with stable data IDs, safe text rendering, explicit storage behavior, keyboard/touch support and tests before being labelled complete. The project is being built in milestones; roadmap items must remain visibly marked as planned until their acceptance checks pass.


## Development and build checks

PhoenixFrame uses native browser ES modules and has no runtime package dependencies. Install Node.js 22, then run `npm run check` to syntax-check every JavaScript module, run the unit tests, verify duplicate HTML IDs, and validate local module import paths. GitHub Actions runs the same checks on pushes to `ndev` and `main` and on pull requests to `main`.

The studio is organized by feature under `assets/js/`: `core`, `projects`, `timeline`, `camera`, `animation`, `audio`, and `export`. `assets/js/app.js` remains the UI composition entry point. See `docs/IMPLEMENTATION-PLAN.md` for the full status and remaining acceptance tests.


## Static build

Run `npm run build` to run all quality checks and create the deployable GitHub Pages site in `dist/`. The build copies the HTML and native ES modules without a bundler or runtime dependencies. GitHub Pages deploys the generated `dist/` directory from the `ndev` branch workflow.
